import { describe, it, expect } from "vitest";
import { pedidosAdministrativos, pedidoEstadoEnum } from "@/lib/db/schema";

describe("pedidos administrativos schema", () => {
  it("exports the table and estado enum", () => {
    expect(pedidosAdministrativos).toBeDefined();
    expect(pedidoEstadoEnum.enumValues).toEqual(["solicitado","em_analise","deferido","indeferido","cancelado"]);
  });
});
