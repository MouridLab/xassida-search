import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, requireStaff } from "@/lib/admin-auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioBucket, minioClient } from "@/lib/minio";

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
      .select(
        "id,khassida_id,language,edition_kind,title,translator,publisher,publication_year,page_count,source_name,file_name,file_size,validation_status,object_key,created_at,khassidas(title,slug)",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    const items = (data || []).map((edition) => {
      const item = { ...edition };
      delete item.object_key;
      return item;
    });
    return NextResponse.json({ items });
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Utilisez le workflow d’upload direct présigné." },
    { status: 410 },
  );
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireStaff(request, true);
    const body = z
      .object({ id: z.string().uuid(), validation_status: z.enum(["verified", "disabled"]) })
      .parse(await request.json());
    const { data, error } = await auth.db.rpc("review_edition", {
      p_edition_id: body.id,
      p_status: body.validation_status,
      p_actor_id: auth.user.id,
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
