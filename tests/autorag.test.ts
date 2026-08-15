import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { chunkIdFromAutoRagSource } from "../lib/autorag";

describe("AutoRAG source mapping", () => {
  it("extracts the stable chunk id from an indexed markdown source", () => {
    expect(
      chunkIdFromAutoRagSource(
        "/data/workspace/.autorag/parsed/123e4567-e89b-42d3-a456-426614174000.md",
      ),
    ).toBe("123e4567-e89b-42d3-a456-426614174000");
  });

  it("ignores a source without a valid chunk id", () => {
    expect(chunkIdFromAutoRagSource("/data/corpus/readme.md")).toBeNull();
    expect(chunkIdFromAutoRagSource()).toBeNull();
  });

  it("routes RAG requests through AutoRAG without the OpenAI SDK", () => {
    const route = readFileSync("app/api/ask/route.ts", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

    expect(route).toContain("askAutoRag");
    expect(route).not.toContain('from "openai"');
    expect(packageJson.dependencies.openai).toBeUndefined();
  });
});
