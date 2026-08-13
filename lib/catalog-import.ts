import { createHash } from "node:crypto";

export type ImportResource = {
  url: string;
  language: string;
  editionKind: "original" | "translation" | "transcription";
  title?: string;
  translator?: string;
  publisher?: string;
  sourceName: string;
};

export type ImportWork = {
  slug: string;
  title: string;
  aliases?: string[];
  themes?: string[];
  description?: string;
  resources: ImportResource[];
};

export function assertAllowedImportUrl(value: string, allowedHosts: Set<string>) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLocaleLowerCase("en"))) {
    throw new Error(`Source non autorisée: ${url.hostname}`);
  }
  return url;
}

export function assertPdf(bytes: Uint8Array, contentType: string | null) {
  if (bytes.length < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("La ressource téléchargée n’est pas un PDF valide");
  }
  if (contentType && !contentType.toLocaleLowerCase("en").includes("pdf")) {
    throw new Error(`Type de contenu inattendu: ${contentType}`);
  }
}

export function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function importObjectKey(workId: string, digest: string, fileName: string) {
  const safeName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase("en");
  return `khassidas/${workId}/editions/${digest.slice(0, 16)}-${safeName || "source.pdf"}`;
}

export function worksMissingReadableMedia(workIds: string[], readableWorkIds: Iterable<string>) {
  const readable = new Set(readableWorkIds);
  return workIds.filter((id) => !readable.has(id));
}
