import { describe, it, expect } from "vitest";
import { sigaImportStaging, sigaImportDecisaoEnum } from "@/lib/db/schema";

describe("siga import staging schema", () => {
  it("exports the table and decisao enum", () => {
    expect(sigaImportStaging).toBeDefined();
    expect(sigaImportDecisaoEnum.enumValues).toEqual(["nova", "ja_importada", "atualizada"]);
  });
});
