import { describe, it, expect } from "vitest";
import { feriasPeriodos, feriasParcelas, feriasStatusEnum } from "@/lib/db/schema";

describe("ferias schema", () => {
  it("exports both tables and the status enum from the barrel", () => {
    expect(feriasPeriodos).toBeDefined();
    expect(feriasParcelas).toBeDefined();
    expect(feriasStatusEnum.enumValues).toEqual([
      "programada", "homologada", "em_fruicao", "concluida", "cancelada",
    ]);
  });
});
