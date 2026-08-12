import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const base = "https://files.xassaid.com/files/";
const sources = [
  { slug:"masaalikul-jinaan", pdf:"Masalikul-Jinaan-ar.pdf", french:"Masaalikul Jinaan-fr.pdf" },
  { slug:"tazawwudush-shubban", pdf:"Tazawudush Shubbaan.pdf", french:"Tazawwudou-sh-subban-fr.pdf" },
  { slug:"jazbul-qulub", pdf:"Jazboul Khouloub.pdf" },
  { slug:"matlaboul-fawzayni", pdf:"Matlaboul-fawzayni.pdf", french:"Matlaboul fawzayni-fr.pdf" },
  { slug:"safinatul-aman", pdf:"Safinatoul-amane.pdf" },
] as const;

const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error("Variables Supabase manquantes dans .env.local");
const db=createClient(url,key,{auth:{persistSession:false}});
const temp=join(process.cwd(),".tmp","xassaid-import");
const execFileAsync=promisify(execFile);
await mkdir(temp,{recursive:true});

function sourceUrl(file:string){return new URL(encodeURIComponent(file).replace(/%2F/g,"/"),base).toString()}
async function download(file:string){const target=join(temp,basename(file).replace(/[^a-zA-Z0-9.-]/g,"-"));const response=await fetch(sourceUrl(file));if(!response.ok)throw new Error(`${file}: HTTP ${response.status}`);await writeFile(target,Buffer.from(await response.arrayBuffer()));return target}
async function extractPages(file:string){const output=`${file}.txt`;await execFileAsync("pdftotext",["-layout",file,output]);const text=await readFile(output,"utf8");return text.split("\f").map(page=>page.replace(/\r/g,"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim())}

let imported=0;
for(const source of sources){
  const {data:work,error:workError}=await db.from("khassidas").select("id,title").eq("slug",source.slug).single();
  if(workError||!work){console.warn(`Ignoré: ${source.slug} absent de Supabase`);continue}
  const pdfUrl=sourceUrl(source.pdf);
  const {error:updateError}=await db.from("khassidas").update({pdf_url:pdfUrl,source_name:"Xassaid.com — catalogue public"}).eq("id",work.id);
  if(updateError)throw updateError;
  if(!("french" in source)){console.log(`${work.title}: PDF lié`);continue}
  const frenchUrl=sourceUrl(source.french);
  const file=await download(source.french);
  const pages=await extractPages(file);
  await db.from("khassida_chunks").delete().eq("khassida_id",work.id).eq("source_pdf_url",frenchUrl).neq("validation_status","verified");
  const rows=pages.flatMap((page,pageIndex)=>page.length<30?[]:split(page,5500).map(part=>({khassida_id:work.id,french_translation:part,page_number:pageIndex+1,source_pdf_url:frenchUrl,validation_status:"review"})));
  for(let index=0;index<rows.length;index+=100){const {error}=await db.from("khassida_chunks").insert(rows.slice(index,index+100));if(error)throw error}
  imported+=rows.length;console.log(`${work.title}: ${rows.length} passages extraits de ${pages.length} pages`);
}
await rm(temp,{recursive:true,force:true});
console.log(`Import terminé: ${imported} passages placés en validation.`);

function split(value:string,max:number){const parts:string[]=[];let rest=value;while(rest.length>max){let cut=rest.lastIndexOf("\n",max);if(cut<max*.6)cut=max;parts.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim()}if(rest)parts.push(rest);return parts}
