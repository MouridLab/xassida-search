import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, requireStaff } from "@/lib/admin-auth";
import { hasAdminAccess } from "@/lib/authorization";
import { deleteMedia } from "@/lib/minio";
const optionalCount = z.union([z.number().int().positive(), z.null()]).optional();
const schema = z.object({
  title: z.string().trim().min(2),
  arabic_title: z.string().nullable().optional(),
  aliases: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  page_count: optionalCount,
  verse_count: optionalCount,
});
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
export async function GET(req: Request) {
  try {
    const { db, profile } = await requireStaff(req);
    const [{ data, error }, { data: media }] = await Promise.all([
      db.from("khassidas").select("*").order("updated_at", { ascending: false }),
      db
        .from("media_assets")
        .select("id,khassida_id,kind")
        .eq("kind", "cover")
        .eq("is_primary", true),
    ]);
    if (error) throw error;
    const items = (data || []).map((work) => {
      const cover = media?.find((item) => item.khassida_id === work.id);
      return { ...work, cover_url: cover ? `/api/media/${cover.id}` : null };
    });
    return NextResponse.json({ items, role: profile.role });
  } catch (e) {
    const x = authError(e);
    return NextResponse.json({ error: x.message }, { status: x.status });
  }
}
export async function POST(req: Request) {
  try {
    const { db, user } = await requireStaff(req);
    const parsed = schema.parse(await req.json());
    const { data, error } = await db
      .from("khassidas")
      .insert({
        ...parsed,
        slug: `${slugify(parsed.title)}-${crypto.randomUUID().slice(0, 6)}`,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) throw error;
    await db.from("audit_log").insert({
      actor_id: user.id,
      entity_type: "khassida",
      entity_id: data.id,
      action: "create",
      new_data: data,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const x = authError(e);
    return NextResponse.json({ error: x.message }, { status: x.status });
  }
}
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = z.string().uuid().parse(body.id);
    const publish = z.boolean().optional().parse(body.is_verified);
    const auth = await requireStaff(req, publish !== undefined);
    const parsed = schema.partial().parse(body);
    const changes = {
      ...parsed,
      ...(publish === undefined
        ? {}
        : { is_verified: publish, validated_by: publish ? auth.user.id : null }),
    };
    const { data, error } = await auth.db
      .from("khassidas")
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auth.db.from("audit_log").insert({
      actor_id: auth.user.id,
      entity_type: "khassida",
      entity_id: id,
      action: publish === undefined ? "update" : publish ? "publish" : "unpublish",
      new_data: data,
    });
    return NextResponse.json(data);
  } catch (e) {
    const x = authError(e);
    return NextResponse.json({ error: x.message }, { status: x.status });
  }
}

const deleteSchema = z.object({
  id: z.string().uuid(),
  confirmation: z.string().trim().min(2),
});

export async function DELETE(req: Request) {
  try {
    const auth = await requireStaff(req);
    if (!hasAdminAccess(auth.profile.role)) throw new Error("FORBIDDEN");
    const parsed = deleteSchema.parse(await req.json());
    const { data, error } = await auth.db.rpc("delete_khassida", {
      p_khassida_id: parsed.id,
      p_actor_id: auth.user.id,
      p_confirmation: parsed.confirmation,
    });
    if (error) throw error;

    const objectKeys = Array.isArray(data?.object_keys)
      ? data.object_keys.filter((key: unknown): key is string => typeof key === "string")
      : [];
    const cleanup = await Promise.allSettled(objectKeys.map((key: string) => deleteMedia(key)));
    const cleanupPending = cleanup.filter((result) => result.status === "rejected").length;
    if (cleanupPending)
      console.error("MinIO cleanup incomplete after khassida deletion", {
        khassidaId: parsed.id,
        cleanupPending,
      });

    return NextResponse.json({ deleted: true, cleanup_pending: cleanupPending });
  } catch (e) {
    const x = authError(e);
    return NextResponse.json({ error: x.message }, { status: x.status });
  }
}
