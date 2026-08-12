import { NextResponse } from "next/server";
import { signedMediaUrl } from "@/lib/minio";
import { publicServerClient } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await publicServerClient()
    .from("library_items")
    .select("media_object_key")
    .eq("id", id)
    .eq("is_verified", true)
    .single();
  if (error || !data) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  if (!data.media_object_key)
    return NextResponse.json({ error: "Fichier MinIO manquant" }, { status: 404 });
  return NextResponse.redirect(await signedMediaUrl(data.media_object_key, 900));
}
