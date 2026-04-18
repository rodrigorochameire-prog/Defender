import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { pessoas } from "@/lib/db/schema";
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
      name: "Test Pessoas",
      email: `pessoas-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

describe("pessoas.create + pessoas.getById", { timeout: 30000 }, () => {
  it("cria pessoa e recupera por id", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.pessoas.create({
        nome: "Maria Teste Silva",
        fonteCriacao: "manual",
      });
      expect(created.id).toBeGreaterThan(0);
      expect(created.nomeNormalizado).toBe("maria teste silva");

      const fetched = await caller.pessoas.getById({ id: created.id });
      expect(fetched.pessoa.id).toBe(created.id);
      expect(fetched.pessoa.nome).toBe("Maria Teste Silva");
      expect(fetched.participacoes).toEqual([]);

      await db.delete(pessoas).where(eq(pessoas.id, created.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("normaliza nome automaticamente", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.pessoas.create({
        nome: "Dr. João da Silva",
        fonteCriacao: "manual",
      });
      expect(created.nomeNormalizado).toBe("joao da silva");
      await db.delete(pessoas).where(eq(pessoas.id, created.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("rejeita cpf duplicado", async () => {
    const user = await makeUser();
    const uniqueCpf = `${Date.now()}`.padStart(11, "0").slice(0, 11);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.pessoas.create({
        nome: "Primeira",
        cpf: uniqueCpf,
        fonteCriacao: "manual",
      });
      await expect(
        caller.pessoas.create({
          nome: "Segunda",
          cpf: uniqueCpf,
          fonteCriacao: "manual",
        }),
      ).rejects.toThrow();
    } finally {
      await db.delete(pessoas).where(eq(pessoas.cpf, uniqueCpf));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("pessoas.list", { timeout: 30000 }, () => {
  it("lista pessoas com busca por nome normalizado", async () => {
    const user = await makeUser();
    const idsCriados: number[] = [];
    try {
      const caller = createCaller(mkCtx(user));
      const p1 = await caller.pessoas.create({ nome: "Aurélio Unique Teste", fonteCriacao: "manual" });
      const p2 = await caller.pessoas.create({ nome: "Beatriz Unique Teste", fonteCriacao: "manual" });
      idsCriados.push(p1.id, p2.id);

      const res = await caller.pessoas.list({ search: "aurelio unique", limit: 10, offset: 0 });
      expect(res.items.some((p) => p.id === p1.id)).toBe(true);
      expect(res.items.some((p) => p.id === p2.id)).toBe(false);
    } finally {
      for (const id of idsCriados) await db.delete(pessoas).where(eq(pessoas.id, id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("pessoas.update + pessoas.delete", { timeout: 30000 }, () => {
  it("update atualiza campos e re-normaliza nome", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Carlos Original", fonteCriacao: "manual" });
      const upd = await caller.pessoas.update({ id: p.id, nome: "Dr. Carlos Alterado" });
      expect(upd.nome).toBe("Dr. Carlos Alterado");
      expect(upd.nomeNormalizado).toBe("carlos alterado");
      await db.delete(pessoas).where(eq(pessoas.id, p.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("delete remove a pessoa", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Delete Me", fonteCriacao: "manual" });
      await caller.pessoas.delete({ id: p.id });
      const found = await db.select().from(pessoas).where(eq(pessoas.id, p.id));
      expect(found).toHaveLength(0);
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
