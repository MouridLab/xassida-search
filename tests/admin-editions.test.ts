import { describe, expect, it } from "vitest";
import { sortAdminEditions } from "../lib/admin-editions";

describe("admin PDF ordering", () => {
  it("sorts editions by work, edition and language from A to Z", () => {
    const editions = [
      { id: "3", title: "Wolof", language: "wo", khassidas: { title: "Zikr" } },
      { id: "2", title: "Traduction", language: "fr", khassidas: { title: "Assīru" } },
      { id: "1", title: "Arabe", language: "ar", khassidas: { title: "Assiru" } },
    ];

    expect(sortAdminEditions(editions).map((edition) => edition.id)).toEqual(["1", "2", "3"]);
    expect(editions.map((edition) => edition.id)).toEqual(["3", "2", "1"]);
  });
});
