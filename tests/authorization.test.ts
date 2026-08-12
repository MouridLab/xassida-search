import { describe, expect, it } from "vitest";
import { hasStaffAccess, hasValidationAccess } from "../lib/authorization";

describe("staff authorization matrix", () => {
  it.each([null, undefined, "pending", "user", ""])("rejects non-staff role %s", (role) => {
    expect(hasStaffAccess(role)).toBe(false);
    expect(hasValidationAccess(role)).toBe(false);
  });

  it("allows editors to edit but not validate", () => {
    expect(hasStaffAccess("editor")).toBe(true);
    expect(hasValidationAccess("editor")).toBe(false);
  });

  it.each(["validator", "admin"])("allows %s to edit and validate", (role) => {
    expect(hasStaffAccess(role)).toBe(true);
    expect(hasValidationAccess(role)).toBe(true);
  });
});
