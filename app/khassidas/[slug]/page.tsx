import { notFound } from "next/navigation";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import { ReaderView } from "@/components/ReaderView";
export default async function WorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!isConfigured) notFound();
  const { slug } = await params;
  const { tab } = await searchParams;
  const db = publicServerClient();
  const { data: k } = await db
    .from("khassidas")
    .select("*")
    .eq("slug", slug)
    .eq("is_verified", true)
    .single();
  if (!k) notFound();
  const [{ data: chunks }, { data: related }, { data: media }] = await Promise.all([
    db
      .from("khassida_chunks")
      .select("*")
      .eq("khassida_id", k.id)
      .eq("validation_status", "verified")
      .order("page_number")
      .limit(150),
    db
      .from("khassidas")
      .select("slug,title,arabic_title")
      .eq("is_verified", true)
      .neq("id", k.id)
      .limit(3),
    db
      .from("media_assets")
      .select("id,kind,provider,external_url")
      .eq("khassida_id", k.id)
      .eq("is_primary", true),
  ]);
  const mediaUrl = (kind: "pdf" | "audio" | "cover", fallback: string | null) => {
    const item = media?.find((candidate) => candidate.kind === kind);
    if (!item) return fallback;
    return item.provider === "external" ? item.external_url : `/api/media/${item.id}`;
  };
  const resolved = {
    ...k,
    pdf_url: mediaUrl("pdf", k.pdf_url),
    audio_url: mediaUrl("audio", k.audio_url),
    cover_url: mediaUrl("cover", null),
  };
  return (
    <ReaderView work={resolved} chunks={chunks || []} related={related || []} initialTab={tab} />
  );
}
