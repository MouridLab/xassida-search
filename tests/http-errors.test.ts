import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { authError } from "../lib/admin-auth";

vi.mock("../lib/supabase", () => ({ adminClient: vi.fn() }));

describe("admin HTTP error model", () => {
  it("maps authentication and authorization without leaking sentinels", () => {
    expect(authError(new Error("UNAUTHORIZED"))).toEqual({
      message: "Authentification requise.",
      status: 401,
    });
    expect(authError(new Error("FORBIDDEN"))).toEqual({ message: "Accès interdit.", status: 403 });
  });

  it("maps validation and conflicts", () => {
    const validation = z.string().min(3).safeParse("x");
    if (validation.success) throw new Error("invalid test setup");
    expect(authError(validation.error).status).toBe(400);
    expect(authError({ code: "23505", message: "duplicate details" }).status).toBe(409);
  });

  it("hides infrastructure details", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(authError(new Error("password database.internal.example"))).toEqual({
      message: "Une erreur interne est survenue.",
      status: 500,
    });
  });
});
