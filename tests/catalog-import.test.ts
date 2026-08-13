import { describe, expect, it } from "vitest";
import {
  assertAllowedImportUrl,
  assertPdf,
  importObjectKey,
  sha256,
  worksMissingReadableMedia,
} from "../lib/catalog-import";

describe("controlled khassida imports", () => {
  const hosts = new Set(["files.xassaid.com"]);

  it("accepts only HTTPS sources on the explicit allowlist", () => {
    expect(assertAllowedImportUrl("https://files.xassaid.com/files/work.pdf", hosts).hostname).toBe(
      "files.xassaid.com",
    );
    expect(() => assertAllowedImportUrl("http://files.xassaid.com/work.pdf", hosts)).toThrow();
    expect(() => assertAllowedImportUrl("https://example.org/work.pdf", hosts)).toThrow();
  });

  it("rejects responses that are not PDF files", () => {
    expect(() => assertPdf(new TextEncoder().encode("<html>"), "text/html")).toThrow();
    expect(() => assertPdf(new TextEncoder().encode("%PDF-1.7"), "application/pdf")).not.toThrow();
  });

  it("builds stable content-addressed MinIO keys", () => {
    const digest = sha256(new TextEncoder().encode("%PDF-1.7 test"));
    expect(importObjectKey("work-id", digest, "Édition française.pdf")).toBe(
      `khassidas/work-id/editions/${digest.slice(0, 16)}-edition-francaise.pdf`,
    );
  });

  it("plans only reversible unpublishing for works without readable media", () => {
    expect(worksMissingReadableMedia(["one", "two", "three"], ["one", "three"])).toEqual(["two"]);
  });
});
