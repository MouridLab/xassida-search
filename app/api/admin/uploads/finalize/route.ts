import { NextResponse } from "next/server";
import { z } from "zod";
import { authError, requireStaff } from "@/lib/admin-auth";
import { deleteMedia, headMedia, readMediaPrefix } from "@/lib/minio";

const input = z.object({ upload_id: z.string().uuid() }).strict();

export async function POST(request: Request) {
  let objectKey: string | undefined;
  let compensateObject = false;
  try {
    const body = input.parse(await request.json());
    const auth = await requireStaff(request);
    const { data: upload, error } = await auth.db
      .from("pending_uploads")
      .select("*")
      .eq("id", body.upload_id)
      .eq("actor_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!upload) return NextResponse.json({ error: "Upload introuvable." }, { status: 404 });
    if (upload.status === "completed") return NextResponse.json({ id: upload.entity_id });
    if (upload.status !== "pending" || Date.parse(upload.expires_at) < Date.now())
      return NextResponse.json({ error: "Autorisation expirée." }, { status: 410 });
    const verifiedObjectKey = String(upload.object_key);
    objectKey = verifiedObjectKey;
    const head = await headMedia(verifiedObjectKey);
    const actualType = (head.ContentType || "").split(";")[0].trim();
    if (head.ContentLength !== Number(upload.expected_size) || actualType !== upload.content_type)
      compensateObject = true;
    if (compensateObject) throw new Error("UPLOAD_MISMATCH");
    const prefix = await readMediaPrefix(verifiedObjectKey, 16);
    if (!validSignature(upload.content_type, prefix)) {
      compensateObject = true;
      throw new Error("UPLOAD_MISMATCH");
    }
    const procedure =
      upload.kind === "edition" ? "finalize_edition_upload" : "finalize_media_upload";
    const { data, error: finalizeError } = await auth.db.rpc(procedure, {
      p_upload_id: upload.id,
      p_actor_id: auth.user.id,
    });
    if (finalizeError) {
      const { data: state, error: stateError } = await auth.db
        .from("pending_uploads")
        .select("status,entity_id")
        .eq("id", upload.id)
        .single();
      if (state?.status === "completed") return NextResponse.json({ id: state.entity_id });
      // Never delete on an ambiguous network outcome: the SQL transaction may
      // have committed even though neither response reached this process.
      compensateObject = !stateError && state?.status === "pending";
      throw finalizeError;
    }
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    if (objectKey && compensateObject) await deleteMedia(objectKey).catch(() => undefined);
    if (error instanceof Error && error.message === "UPLOAD_MISMATCH")
      return NextResponse.json(
        { error: "Le fichier reçu ne correspond pas à l’upload autorisé." },
        { status: 422 },
      );
    const response = authError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}

function validSignature(contentType: string, bytes: Buffer) {
  if (contentType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (contentType === "image/png")
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/webp")
    return (
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
    );
  if (contentType === "audio/mpeg")
    return (
      bytes.subarray(0, 3).toString() === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    );
  if (contentType === "audio/mp4") return bytes.subarray(4, 8).toString() === "ftyp";
  if (["audio/wav", "audio/x-wav"].includes(contentType))
    return (
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WAVE"
    );
  if (contentType === "audio/ogg") return bytes.subarray(0, 4).toString() === "OggS";
  if (contentType === "audio/webm")
    return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}
