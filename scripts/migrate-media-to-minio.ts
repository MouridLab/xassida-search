import {createClient} from "@supabase/supabase-js";
import {minioBucket,putMedia,safeObjectName} from "../lib/minio";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error("Configuration Supabase manquante");
const db=createClient(url,key,{auth:{persistSession:false}});
const {data:works,error}=await db.from("khassidas").select("id,slug,title,pdf_url,audio_url").or("pdf_url.not.is.null,audio_url.not.is.null");
if(error)throw error;

for(const work of works||[]){
  for(const kind of ["pdf","audio"] as const){
    const source=kind==='pdf'?work.pdf_url:work.audio_url;if(!source)continue;
    await db.from("media_assets").update({is_primary:false}).eq("khassida_id",work.id).eq("kind",kind);
    if(/youtu\.be|youtube\.com/.test(source)){
      const {error:insertError}=await db.from("media_assets").insert({khassida_id:work.id,kind,provider:"external",external_url:source,mime_type:"text/html",file_name:"YouTube",source_url:source,is_primary:true});if(insertError)throw insertError;console.log(`${work.title}: audio YouTube référencé`);continue;
    }
    const response=await fetch(source);if(!response.ok)throw new Error(`${work.title}: HTTP ${response.status}`);
    const mime=response.headers.get("content-type")?.split(";")[0]||(kind==='pdf'?"application/pdf":"audio/mpeg");
    const name=safeObjectName(decodeURIComponent(new URL(source).pathname.split("/").pop()||`${work.slug}.${kind==='pdf'?'pdf':'mp3'}`));
    const objectKey=`khassidas/${work.id}/${kind}/${name}`;const bytes=Buffer.from(await response.arrayBuffer());
    await putMedia(objectKey,bytes,mime);
    const {error:insertError}=await db.from("media_assets").insert({khassida_id:work.id,kind,provider:"minio",bucket:minioBucket,object_key:objectKey,mime_type:mime,file_name:name,file_size:bytes.length,source_url:source,is_primary:true});if(insertError)throw insertError;
    console.log(`${work.title}: ${kind} transféré (${Math.round(bytes.length/1024)} Ko)`);
  }
}
console.log("Migration MinIO terminée.");
