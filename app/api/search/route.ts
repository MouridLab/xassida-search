import { NextRequest, NextResponse } from "next/server";
import { isConfigured, publicServerClient } from "@/lib/supabase";
import {
  mapUnifiedSearchRow,
  unifiedSearchParamsSchema,
  type UnifiedSearchRpcRow,
} from "@/lib/unified-search";

export async function GET(request: NextRequest) {
  if (!isConfigured) {
    return NextResponse.json(
      { results: [], error: "Configurez Supabase pour accéder au corpus." },
      { status: 503 },
    );
  }

  if (request.nextUrl.searchParams.get("scope") === "featured") return featuredWorks();

  const parsed = unifiedSearchParamsSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") || "",
    page: request.nextUrl.searchParams.get("page") || undefined,
    limit: request.nextUrl.searchParams.get("limit") || undefined,
    type: request.nextUrl.searchParams.get("type") || undefined,
    theme: request.nextUrl.searchParams.get("theme") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { results: [], error: "Paramètres de recherche invalides." },
      { status: 400 },
    );
  }

  const { q, page, limit, type, theme } = parsed.data;
  const { data, error } = await publicServerClient().rpc("unified_public_search", {
    query_text: q,
    result_type_filter: type === "all" ? null : type,
    theme_filter: theme || null,
    result_limit: limit,
    result_offset: (page - 1) * limit,
  });
  if (error) {
    return NextResponse.json(
      { results: [], error: "Recherche temporairement indisponible." },
      { status: 500 },
    );
  }
  const rows = (data || []) as UnifiedSearchRpcRow[];
  const total = Number(rows[0]?.total_count || 0);
  return NextResponse.json({
    query: q,
    results: rows.map(mapUnifiedSearchRow),
    pagination: {
      page,
      limit,
      total,
      nextPage: page * limit < total ? page + 1 : null,
    },
  });
}

async function featuredWorks() {
  const db = publicServerClient();
  const [{ data: works, error }, { data: media }] = await Promise.all([
    db
      .from("khassidas")
      .select("*")
      .eq("is_verified", true)
      .order("updated_at", { ascending: false })
      .limit(9),
    db
      .from("media_assets")
      .select("id,khassida_id,kind,provider,external_url")
      .eq("is_primary", true),
  ]);
  if (error)
    return NextResponse.json(
      { results: [], error: "Catalogue temporairement indisponible." },
      { status: 500 },
    );
  return NextResponse.json({
    results: (works || []).map((khassida) => {
      const cover = media?.find(
        (item) => item.khassida_id === khassida.id && item.kind === "cover",
      );
      return {
        kind: "khassida",
        khassida: {
          ...khassida,
          cover_url: cover
            ? cover.provider === "external"
              ? cover.external_url
              : `/api/media/${cover.id}`
            : null,
        },
      };
    }),
  });
}
