import { notFound } from "next/navigation";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import { ReaderView } from "@/components/ReaderView";
import { normalizeSearch } from "@/lib/normalize";
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
  const [{ data: chunks }, { data: related }, { data: media }, { data: relatedCovers }, { data: editions }] = await Promise.all([
    db
      .from("khassida_chunks")
      .select("*")
      .eq("khassida_id", k.id)
      .eq("validation_status", "verified")
      .order("page_number")
      .limit(150),
    db
      .from("khassidas")
      .select("id,slug,title,arabic_title,aliases,themes,description,updated_at")
      .eq("is_verified", true)
      .neq("id", k.id)
      .limit(100),
    db
      .from("media_assets")
      .select("id,kind,provider,external_url")
      .eq("khassida_id", k.id)
      .eq("is_primary", true),
    db
      .from("media_assets")
      .select("id,khassida_id,provider,external_url,khassidas!inner(is_verified)")
      .eq("kind", "cover")
      .eq("is_primary", true)
      .eq("khassidas.is_verified", true),
    db
      .from("khassida_editions")
      .select("id,khassida_id,language,edition_kind,title,translator,publisher,publication_year,page_count,source_name,file_name,validation_status")
      .eq("khassida_id", k.id)
      .eq("validation_status", "verified")
      .order("language"),
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
  const currentTerms = searchableTerms(k);
  const rankedCandidates = (related || [])
    .map((item) => {
      const sharedThemes = item.themes.filter((theme: string) =>
        k.themes.some((current: string) => normalizeSearch(current) === normalizeSearch(theme)),
      );
      const itemTerms = searchableTerms(item);
      const sharedTerms = [...itemTerms].filter((term) => currentTerms.has(term));
      return { ...item, sharedThemes, relevance: sharedThemes.length * 10 + sharedTerms.length };
    })
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  const relevantRelated = rankedCandidates.filter((item) => item.sharedThemes.length > 0);
  const hasRelevantRelated = relevantRelated.length > 0;
  const rankedRelated = (hasRelevantRelated ? relevantRelated : rankedCandidates).slice(0, 3);
  const resolvedRelated = rankedRelated.map((item) => {
    const cover = relatedCovers?.find((candidate) => candidate.khassida_id === item.id);
    return {
      slug: item.slug,
      title: item.title,
      arabic_title: item.arabic_title,
      cover_url: cover
        ? cover.provider === "external"
          ? cover.external_url
          : `/api/media/${cover.id}`
        : null,
      shared_themes: item.sharedThemes,
      relevance: item.relevance,
    };
  });
  const resolvedEditions = (editions || []).map((edition) => ({
    ...edition,
    url: `/api/edition-media/${edition.id}`,
  }));
  return (
    <ReaderView work={resolved} chunks={chunks || []} editions={resolvedEditions} related={resolvedRelated} relatedMode={hasRelevantRelated ? "related" : "discover"} initialTab={tab} />
  );
}

function searchableTerms(work: { title: string; arabic_title: string | null; aliases: string[]; themes: string[]; description: string | null }) {
  const stopWords = new Set(["avec", "dans", "pour", "cette", "oeuvre", "khassaida", "cheikh", "ahmadou", "bamba"]);
  return new Set(
    normalizeSearch([work.title, work.arabic_title, ...work.aliases, ...work.themes, work.description].filter(Boolean).join(" "))
      .split(" ")
      .filter((term) => term.length >= 4 && !stopWords.has(term)),
  );
}
