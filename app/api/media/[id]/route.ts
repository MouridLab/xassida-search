import { NextResponse } from "next/server";
import { publicServerClient } from "@/lib/supabase";
import { signedMediaUrl } from "@/lib/minio";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = publicServerClient();
  const { data, error } = await db
    .from("media_assets")
    .select("provider,object_key,external_url,kind,mime_type")
    .eq("id", id)
    .single();
  if (error || !data)
    return NextResponse.json({ error: "Média introuvable" }, { status: 404 });
  if (data.provider === "external") return NextResponse.redirect(data.external_url);
  if (!data.object_key)
    return NextResponse.json({ error: "Objet MinIO manquant" }, { status: 404 });

  const url = await signedMediaUrl(data.object_key, 900);
  if (data.kind !== "cover") return NextResponse.redirect(url);

  const source = await fetch(url);
  if (!source.ok || !source.body)
    return NextResponse.json({ error: "Couverture indisponible" }, { status: 502 });
  return new Response(source.body, {
    headers: {
      "content-type": data.mime_type || "image/jpeg",
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
