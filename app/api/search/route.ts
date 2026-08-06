import { NextRequest, NextResponse } from "next/server";
import { publicServerClient, isConfigured } from "@/lib/supabase";
import { normalizeSearch } from "@/lib/normalize";

export async function GET(req:NextRequest){
  if(!isConfigured)return NextResponse.json({results:[],error:"Configurez Supabase pour accéder au corpus."},{status:503});
  const q=(req.nextUrl.searchParams.get("q")||"").trim().slice(0,200);
  const db=publicServerClient();
  const [{data:catalog,error:catalogError},{data:chunks},{data:media}]=await Promise.all([
    db.from("khassidas").select("*").eq("is_verified",true).order("title").limit(200),
    db.from("khassida_chunks").select("khassida_id,verse_end,page_number").eq("validation_status","verified").limit(5000),
    db.from("media_assets").select("khassida_id,kind").eq("kind","audio"),
  ]);
  if(catalogError)return NextResponse.json({error:catalogError.message},{status:500});
  const stats=new Map<string,{verses:number;pages:number;hasAudio:boolean}>();
  for(const chunk of chunks||[]){const current=stats.get(chunk.khassida_id)||{verses:0,pages:0,hasAudio:false};current.verses=Math.max(current.verses,chunk.verse_end||0);current.pages=Math.max(current.pages,chunk.page_number||0);stats.set(chunk.khassida_id,current)}
  for(const item of media||[]){const current=stats.get(item.khassida_id)||{verses:0,pages:0,hasAudio:false};current.hasAudio=true;stats.set(item.khassida_id,current)}
  if(!q)return NextResponse.json({results:(catalog||[]).map(k=>({kind:"khassida",khassida:k,stats:stats.get(k.id)}))});

  const normalized=normalizeSearch(q);
  const titleResults=(catalog||[]).filter(work=>[work.title,work.arabic_title,...work.aliases,...work.themes].filter(Boolean).some(value=>normalizeSearch(String(value)).includes(normalized))).map(k=>({kind:"khassida",khassida:k,stats:stats.get(k.id)}));
  const {data,error}=await db.rpc("hybrid_search",{query_text:normalized,query_embedding:null,match_count:20});
  if(error)return NextResponse.json({error:error.message},{status:500});
  const ids=[...new Set((data||[]).map((chunk:{khassida_id:string})=>chunk.khassida_id))];
  const map=new Map((catalog||[]).filter(work=>ids.includes(work.id)).map(work=>[work.id,work]));
  const chunkResults=(data||[]).filter((chunk:{khassida_id:string})=>map.has(chunk.khassida_id)).map((chunk:{khassida_id:string;score:number})=>({kind:"chunk",chunk,score:chunk.score,khassida:map.get(chunk.khassida_id)}));
  const chunkWorkIds=new Set(chunkResults.map((result:{khassida:{id:string}})=>result.khassida.id));
  return NextResponse.json({results:[...titleResults.filter(result=>!chunkWorkIds.has(result.khassida.id)),...chunkResults]});
}
