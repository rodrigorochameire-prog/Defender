import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { lugares, participacoesLugar, lugaresAccessLog } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);
const mkCtx = (user: any) => ({
  user,
  requestId: "test-" + Math.random(),
  selectedDefensorScopeId: null,
});

async function makeUser() {
  const [u] = await db
    .insert(users)
    .values({
      name: "Test Lugares",
      email: `lugares-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

describe("lugares.create + getById", { timeout: 30000 }, () => {
  it("cria + busca lugar com normalização", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.lugares.create({
        logradouro: "Rua das Palmeiras",
        numero: "123",
        bairro: "Centro",
        cidade: "Camaçari",
        uf: "BA",
        fonte: "manual",
      });
      expect(created.id).toBeGreaterThan(0);
      const got = await caller.lugares.getById({ id: created.id });
      expect(got?.logradouro).toBe("Rua das Palmeiras");
      expect(got?.enderecoNormalizado).toContain("rua das palmeiras");
      expect(got?.enderecoNormalizado).toContain("123");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, created.id));
      await db.delete(lugares).where(eq(lugares.id, created.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.update", { timeout: 30000 }, () => {
  it("update re-normaliza quando endereço muda", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({
        logradouro: "Rua A",
        numero: "10",
        fonte: "manual",
      });
      await caller.lugares.update({
        id: l.id,
        patch: { logradouro: "Rua B", numero: "20" },
      });
      const got = await caller.lugares.getById({ id: l.id });
      expect(got?.logradouro).toBe("Rua B");
      expect(got?.enderecoNormalizado).toContain("rua b");
      expect(got?.enderecoNormalizado).toContain("20");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.list + filters", { timeout: 30000 }, () => {
  it("list filtra por bairro", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({
        logradouro: "Rua X",
        bairro: "Centro",
        fonte: "manual",
      });
      const b = await caller.lugares.create({
        logradouro: "Rua Y",
        bairro: "Gravatá",
        fonte: "manual",
      });
      const result = await caller.lugares.list({
        bairro: "Centro",
        limit: 50,
        offset: 0,
      });
      const ids = result.items.map((it: any) => it.id);
      expect(ids).toContain(a.id);
      expect(ids).not.toContain(b.id);
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.delete", { timeout: 30000 }, () => {
  it("delete remove lugar sem participações", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({
        logradouro: "Rua Z",
        fonte: "manual",
      });
      const r = await caller.lugares.delete({ id: l.id });
      expect(r.deleted).toBe(true);
      const got = await caller.lugares.getById({ id: l.id });
      expect(got).toBeNull();
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares participações + busca", { timeout: 30000 }, () => {
  it("addParticipacao + getParticipacoesDoLugar", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua A", numero: "1", fonte: "manual" });
      await caller.lugares.addParticipacao({
        lugarId: l.id, processoId: null, pessoaId: null, tipo: "local-do-fato"
      });
      const parts = await caller.lugares.getParticipacoesDoLugar({ lugarId: l.id });
      expect(parts).toHaveLength(1);
      expect(parts[0].tipo).toBe("local-do-fato");
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, l.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("searchForAutocomplete encontra match", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua das Palmeiras", bairro: "Centro", fonte: "manual" });
      const results = await caller.lugares.searchForAutocomplete({ query: "palmeir", limit: 8 });
      expect(results.map((r: any) => r.id)).toContain(l.id);
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
