import { z } from "zod";

export const uploadKinds = ["pdf", "audio", "cover", "edition"] as const;
export const uploadRequest = z
  .object({
    khassida_id: z.string().uuid(),
    kind: z.enum(uploadKinds),
    filename: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Invalid filename"),
    content_type: z.string().trim().min(3).max(100),
    size: z.number().int().positive(),
    edition: z
      .object({
        language: z.string().min(2).max(12),
        edition_kind: z.enum(["original", "translation", "transcription"]),
        title: z.string().max(180).optional(),
        translator: z.string().max(180).optional(),
        publisher: z.string().max(180).optional(),
        source_name: z.string().max(240).optional(),
        publication_year: z.number().int().min(1800).max(2200).optional(),
        page_count: z.number().int().positive().optional(),
        validation_status: z.enum(["review", "verified"]).default("review"),
      })
      .optional(),
  })
  .strict();

export function validateUpload(
  kind: (typeof uploadKinds)[number],
  contentType: string,
  size: number,
) {
  const allowed =
    kind === "pdf" || kind === "edition"
      ? contentType === "application/pdf"
      : kind === "cover"
        ? ["image/png", "image/jpeg", "image/webp"].includes(contentType)
        : [
            "audio/mpeg",
            "audio/mp4",
            "audio/ogg",
            "audio/wav",
            "audio/x-wav",
            "audio/webm",
          ].includes(contentType);
  const limit = kind === "audio" ? 150e6 : kind === "cover" ? 10e6 : 60e6;
  return { allowed: allowed && size <= limit, limit };
}

export function uploadObjectKey(id: string, khassidaId: string, kind: string, filename: string) {
  const extension = (filename.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] || "").toLowerCase();
  return `pending/${khassidaId}/${kind}/${id}${extension}`;
}
