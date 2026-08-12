import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { uploadObjectKey, uploadRequest, validateUpload } from "../lib/upload-policy";

describe("P1 production contracts", () => {
  it("rejects arbitrary upload keys and enforces media policy", () => {
    const input = {
      khassida_id: crypto.randomUUID(),
      kind: "pdf",
      filename: "../../secret.pdf",
      content_type: "application/pdf",
      size: 20,
      object_key: "chosen/by/client",
    };
    expect(uploadRequest.safeParse(input).success).toBe(false);
    expect(validateUpload("pdf", "application/pdf", 60e6).allowed).toBe(true);
    expect(validateUpload("pdf", "text/html", 10).allowed).toBe(false);
    expect(validateUpload("cover", "image/png", 10e6 + 1).allowed).toBe(false);
    expect(uploadObjectKey("upload-id", input.khassida_id, "pdf", input.filename)).toBe(
      `pending/${input.khassida_id}/pdf/upload-id.pdf`,
    );
  });

  it("removes HTTP file buffering", () => {
    const legacy =
      readFileSync("app/api/admin/upload/route.ts", "utf8") +
      readFileSync("app/api/admin/editions/route.ts", "utf8");
    expect(legacy).not.toContain("arrayBuffer(");
    expect(legacy).not.toContain("putMedia(");
  });

  it("does not compensate an ambiguous successful finalize", () => {
    const route = readFileSync("app/api/admin/uploads/finalize/route.ts", "utf8");
    expect(route).toContain('compensateObject = !stateError && state?.status === "pending"');
    expect(route).toContain("objectKey && compensateObject");
  });

  it("keeps edition mutation and audit in the same SQL transaction", () => {
    const sql = readFileSync(
      "supabase/migrations/012_presigned_uploads_and_edition_audit.sql",
      "utf8",
    );
    expect(sql).toContain("function public.finalize_edition_upload");
    expect(sql).toContain("function public.review_edition");
    expect(sql).toContain("insert into public.audit_log");
    expect(sql).toContain("grant execute on function public.review_edition");
  });

  it("uses an atomic shared limiter reserved to service_role", () => {
    const sql012 = readFileSync(
      "supabase/migrations/012_presigned_uploads_and_edition_audit.sql",
      "utf8",
    );
    const sql013 = readFileSync(
      "supabase/migrations/013_harden_pending_uploads_and_rate_limits.sql",
      "utf8",
    );
    expect(sql012).toContain("on conflict(key,window_start) do update");
    expect(sql013).toContain("api_rate_limits_updated_at_idx");
    expect(sql013).toContain("delete from public.api_rate_limits");
    expect(sql013).toContain("grant execute on function public.consume_rate_limit");
    expect(sql012).not.toContain(
      "grant execute on function public.consume_rate_limit(text,integer,integer) to anon",
    );
  });
});
