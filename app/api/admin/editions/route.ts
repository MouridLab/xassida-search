import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, requireStaff } from "@/lib/admin-auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioBucket, minioClient, putMedia, safeObjectName } from "@/lib/minio";

const metadata = z.object({
  khassida_id: z.string().uuid(),
  language: z.string().trim().min(2).max(12),
  edition_kind: z.enum(["original", "translation", "transcription"]),
  title: z.string().trim().max(180).optional(),
  translator: z.string().trim().max(180).optional(),
  publisher: z.string().trim().max(180).optional(),
  source_name: z.string().trim().max(240).optional(),
  publication_year: z.coerce.number().int().min(1800).max(2200).optional(),
  page_count: z.coerce.number().int().positive().optional(),
  validation_status: z.enum(["review", "verified"]).default("review"),
});

export async function GET(request: Request) {
  try {
    const auth = await requireStaff(request);
    const editionId = new URL(request.url).searchParams.get("id");
    if (editionId) {
      const id = z.string().uuid().parse(editionId);
      const { data: edition, error: editionError } = await auth.db
        .from("khassida_editions")
        .select("object_key,file_name,mime_type")
        .eq("id", id)
        .single();
      if (editionError || !edition) {
        return NextResponse.json({ error: "Cette édition est introuvable." }, { status: 404 });
      }
      const object = await minioClient().send(
        new GetObjectCommand({ Bucket: minioBucket, Key: edition.object_key }),
      );
      if (!object.Body) {
        return NextResponse.json({ error: "Le PDF est absent du stockage." }, { status: 404 });
      }
      return new Response(object.Body.transformToWebStream(), {
        headers: {
          "content-type": edition.mime_type || "application/pdf",
          "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(edition.file_name)}`,
          "cache-control": "private, no-store",
        },
      });
    }
    const { data, error } = await auth.db
      .from("khassida_editions")
      .select("id,khassida_id,language,edition_kind,title,translator,publisher,publication_year,page_count,source_name,file_name,file_size,validation_status,object_key,created_at,khassidas(title,slug)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const items = (data || []).map(({ object_key: _objectKey, ...edition }) => edition);
    return NextResponse.json({ items });
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 60e6)
      return NextResponse.json({ error: "PDF invalide ou supérieur à 60 Mo." }, { status: 400 });
    const raw = Object.fromEntries(
      [...form.entries()].filter(([key]) => key !== "file" && form.get(key) !== ""),
    );
    const parsed = metadata.parse(raw);
    const auth = await requireStaff(request, parsed.validation_status === "verified");
    const objectKey = `khassidas/${parsed.khassida_id}/editions/${parsed.language}/${crypto.randomUUID()}-${safeObjectName(file.name)}`;
    await putMedia(objectKey, Buffer.from(await file.arrayBuffer()), file.type);
    const { data, error } = await auth.db
      .from("khassida_editions")
      .insert({
        ...parsed,
        title: parsed.title || null,
        translator: parsed.translator || null,
        publisher: parsed.publisher || null,
        source_name: parsed.source_name || null,
        publication_year: parsed.publication_year || null,
        page_count: parsed.page_count || null,
        bucket: minioBucket,
        object_key: objectKey,
        mime_type: file.type,
        file_name: file.name,
        file_size: file.size,
        created_by: auth.user.id,
        validated_by: parsed.validation_status === "verified" ? auth.user.id : null,
      })
      .select()
      .single();
    if (error) throw error;
    await auth.db.from("audit_log").insert({
      actor_id: auth.user.id,
      entity_type: "khassida_edition",
      entity_id: data.id,
      action: "create",
      new_data: data,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireStaff(request, true);
    const body = z
      .object({ id: z.string().uuid(), validation_status: z.enum(["verified", "disabled"]) })
      .parse(await request.json());
    const { data, error } = await auth.db
      .from("khassida_editions")
      .update({
        validation_status: body.validation_status,
        validated_by: body.validation_status === "verified" ? auth.user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();
    if (error) throw error;
    await auth.db.from("audit_log").insert({
      actor_id: auth.user.id,
      entity_type: "khassida_edition",
      entity_id: body.id,
      action: body.validation_status === "verified" ? "validate" : "reject",
      new_data: data,
    });
    return NextResponse.json(data);
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
