import { describe, it, expect } from "vitest";
import { diarias, diariaStatusEnum } from "@/lib/db/schema";

describe("diarias schema", () => {
  it("exports the table and status enum from the barrel", () => {
    expect(diarias).toBeDefined();
    expect(diariaStatusEnum.enumValues).toEqual([
      "a_requerer", "requerida", "autorizada", "paga", "cancelada",
    ]);
  });
});
