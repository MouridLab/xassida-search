import { NextResponse } from "next/server";
import { signedMediaUrl } from "@/lib/minio";
import { publicServerClient } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await publicServerClient()
    .from("khassida_editions")
    .select("object_key")
    .eq("id", id)
    .eq("validation_status", "verified")
    .single();
  if (error || !data) return NextResponse.json({ error: "Édition introuvable" }, { status: 404 });
  return NextResponse.redirect(await signedMediaUrl(data.object_key, 900));
}
