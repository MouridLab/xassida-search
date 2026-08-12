import { describe, expect, it, vi } from "vitest";
import { withObjectCompensation } from "../lib/storage-workflow";

describe("MinIO compensation workflow", () => {
  it("keeps the object when persistence succeeds", async () => {
    const remove = vi.fn();
    await expect(
      withObjectCompensation("new.pdf", async () => ({ id: "media" }), remove),
    ).resolves.toEqual({ id: "media" });
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes the new object and preserves the original error when SQL fails", async () => {
    const failure = new Error("sql failed");
    const remove = vi.fn().mockResolvedValue(undefined);
    await expect(
      withObjectCompensation(
        "new.pdf",
        async () => {
          throw failure;
        },
        remove,
      ),
    ).rejects.toBe(failure);
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("new.pdf");
  });

  it("does not hide SQL failure when compensation also fails", async () => {
    const failure = new Error("sql failed");
    const remove = vi.fn().mockRejectedValue(new Error("minio failed"));
    await expect(
      withObjectCompensation(
        "new.pdf",
        async () => {
          throw failure;
        },
        remove,
      ),
    ).rejects.toBe(failure);
  });
});
