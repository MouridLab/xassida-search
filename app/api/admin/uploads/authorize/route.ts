import { NextResponse } from "next/server";
import { authError, requireStaff } from "@/lib/admin-auth";
import { minioBucket, signedUploadUrl } from "@/lib/minio";
import { uploadObjectKey, uploadRequest, validateUpload } from "@/lib/upload-policy";

export async function POST(request: Request) {
  try {
    const body = uploadRequest.parse(await request.json());
    if (body.kind === "edition" && !body.edition)
      return NextResponse.json({ error: "Métadonnées d’édition requises." }, { status: 400 });
    const auth = await requireStaff(request, body.edition?.validation_status === "verified");
    const policy = validateUpload(body.kind, body.content_type, body.size);
    if (!policy.allowed)
      return NextResponse.json(
        { error: `Format invalide ou fichier supérieur à ${Math.round(policy.limit / 1e6)} Mo.` },
        { status: 400 },
      );
    const { data: resource } = await auth.db
      .from("khassidas")
      .select("id")
      .eq("id", body.khassida_id)
      .maybeSingle();
    if (!resource) return NextResponse.json({ error: "Khassaïde introuvable." }, { status: 404 });
    const uploadId = crypto.randomUUID();
    const objectKey = uploadObjectKey(uploadId, body.khassida_id, body.kind, body.filename);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { error } = await auth.db.from("pending_uploads").insert({
      id: uploadId,
      actor_id: auth.user.id,
      khassida_id: body.khassida_id,
      kind: body.kind,
      bucket: minioBucket,
      object_key: objectKey,
      file_name: body.filename,
      content_type: body.content_type,
      expected_size: body.size,
      metadata: body.edition || {},
      expires_at: expiresAt,
    });
    if (error) throw error;
    try {
      const uploadUrl = await signedUploadUrl(objectKey, body.content_type, 300);
      return NextResponse.json(
        {
          upload_id: uploadId,
          upload_url: uploadUrl,
          expires_at: expiresAt,
          required_headers: { "content-type": body.content_type },
        },
        { status: 201 },
      );
    } catch (error) {
      await auth.db.from("pending_uploads").update({ status: "failed" }).eq("id", uploadId);
      throw error;
    }
  } catch (error) {
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
