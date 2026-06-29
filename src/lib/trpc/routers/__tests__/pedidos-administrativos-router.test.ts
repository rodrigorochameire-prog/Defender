import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("pedidos administrativos router — contract", () => {
  const src = read("pedidos-administrativos.ts");
  it("scopes reads with getVidaFuncionalScope", () => { expect(src).toContain("getVidaFuncionalScope"); });
  it("filters soft-deleted", () => { expect(src).toMatch(/isNull\([^)]*deletedAt\)/); });
  it("guards titular + NOT_FOUND", () => { expect(src).toContain("FORBIDDEN"); expect(src).toContain("NOT_FOUND"); });
  it("gates estado via podeTransicionar", () => { expect(src).toContain("podeTransicionar"); });
  it("wraps writes in a transaction", () => { expect(src).toContain("db.transaction"); });
  it("criar uses the persist helper", () => { expect(src).toContain("criarPedidoComEvento"); });
  it("soft-deletes the event on cancelado", () => { expect(src).toContain("cancelado"); });
  it("does NOT reference afastamentos", () => { expect(src).not.toContain("afastamentos"); });
  it("is registered", () => { const i = read("index.ts"); expect(i).toContain("pedidosAdministrativosRouter"); expect(i).toMatch(/pedidosAdministrativos:\s*pedidosAdministrativosRouter/); });
});
