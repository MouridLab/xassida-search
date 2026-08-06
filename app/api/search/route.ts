import { NextRequest, NextResponse } from "next/server";
import { publicServerClient, isConfigured } from "@/lib/supabase";
import { normalizeSearch } from "@/lib/normalize";

export async function GET(req:NextRequest){
  if(!isConfigured)return NextResponse.json({results:[],error:"Configurez Supabase pour accéder au corpus."},{status:503});
  const q=(req.nextUrl.searchParams.get("q")||"").trim().slice(0,200);
  const db=publicServerClient();
  const {data:catalog,error:catalogError}=await db.from("khassidas").select("*").eq("is_verified",true).order("title").limit(200);
  if(catalogError)return NextResponse.json({error:catalogError.message},{status:500});
  if(!q)return NextResponse.json({results:(catalog||[]).map(k=>({kind:"khassida",khassida:k}))});

  const normalized=normalizeSearch(q);
  const titleResults=(catalog||[]).filter(work=>[work.title,work.arabic_title,...work.aliases,...work.themes].filter(Boolean).some(value=>normalizeSearch(String(value)).includes(normalized))).map(k=>({kind:"khassida",khassida:k}));
  const {data,error}=await db.rpc("hybrid_search",{query_text:normalized,query_embedding:null,match_count:20});
  if(error)return NextResponse.json({error:error.message},{status:500});
  const ids=[...new Set((data||[]).map((chunk:{khassida_id:string})=>chunk.khassida_id))];
  const map=new Map((catalog||[]).filter(work=>ids.includes(work.id)).map(work=>[work.id,work]));
  const chunkResults=(data||[]).filter((chunk:{khassida_id:string})=>map.has(chunk.khassida_id)).map((chunk:{khassida_id:string;score:number})=>({kind:"chunk",chunk,score:chunk.score,khassida:map.get(chunk.khassida_id)}));
  const chunkWorkIds=new Set(chunkResults.map((result:{khassida:{id:string}})=>result.khassida.id));
  return NextResponse.json({results:[...titleResults.filter(result=>!chunkWorkIds.has(result.khassida.id)),...chunkResults]});
}
