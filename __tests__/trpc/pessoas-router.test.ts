import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { pessoas, participacoesProcesso } from "@/lib/db/schema";
import { users, processos, assistidos } from "@/lib/db/schema/core";
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

// ===== Task 5: Participações + busca =====

describe("pessoas — participações", { timeout: 30000 }, () => {
  async function seed() {
    const user = await makeUser();
    const [assistido] = await db.insert(assistidos).values({
      nome: "Test Assistido " + Date.now(),
      workspaceId: 1,
    } as any).returning();
    const [processo] = await db.insert(processos).values({
      assistidoId: assistido.id,
      numeroAutos: "PESSOAS-" + Date.now(),
      area: "JURI",
    } as any).returning();
    return { user, assistido, processo };
  }

  async function cleanup(ids: { userId: number; assistidoId: number; processoId: number }) {
    await db.delete(processos).where(eq(processos.id, ids.processoId));
    await db.delete(assistidos).where(eq(assistidos.id, ids.assistidoId));
    await db.delete(users).where(eq(users.id, ids.userId));
  }

  it("addParticipacao cria e getById retorna", async () => {
    const { user, assistido, processo } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Test Part", fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: p.id,
          processoId: processo.id,
          papel: "testemunha",
          lado: "acusacao",
          fonte: "manual",
        });
        const res = await caller.pessoas.getById({ id: p.id });
        expect(res.participacoes).toHaveLength(1);
        expect(res.participacoes[0].papel).toBe("testemunha");
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await cleanup({ userId: user.id, assistidoId: assistido.id, processoId: processo.id });
    }
  });

  it("searchForAutocomplete retorna matches", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Zeferino Autocomplete " + Date.now(), fonteCriacao: "manual" });
      try {
        const res = await caller.pessoas.searchForAutocomplete({ query: "zeferino", limit: 5 });
        expect(res.some((x: any) => x.id === p.id)).toBe(true);
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("addParticipacao bloqueia duplicata (mesmo papel)", async () => {
    const { user, assistido, processo } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Unique Part", fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: p.id,
          processoId: processo.id,
          papel: "testemunha",
          fonte: "manual",
        });
        await expect(
          caller.pessoas.addParticipacao({
            pessoaId: p.id,
            processoId: processo.id,
            papel: "testemunha",
            fonte: "manual",
          }),
        ).rejects.toThrow();
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await cleanup({ userId: user.id, assistidoId: assistido.id, processoId: processo.id });
    }
  });
});

// ===== Task 6: Merge + distincts =====

describe("pessoas — merge", { timeout: 30000 }, () => {
  it("merge move participações e marca mergedInto", async () => {
    const user = await makeUser();
    const [assistido] = await db.insert(assistidos).values({
      nome: "Merge Test " + Date.now(), workspaceId: 1,
    } as any).returning();
    const [proc] = await db.insert(processos).values({
      assistidoId: assistido.id, numeroAutos: "MERGE-" + Date.now(), area: "JURI",
    } as any).returning();
    try {
      const caller = createCaller(mkCtx(user));
      const from = await caller.pessoas.create({ nome: "Duplicata A " + Date.now(), fonteCriacao: "manual" });
      const into = await caller.pessoas.create({ nome: "Duplicata B " + Date.now(), fonteCriacao: "manual" });
      try {
        await caller.pessoas.addParticipacao({
          pessoaId: from.id, processoId: proc.id, papel: "testemunha", fonte: "manual",
        });
        await caller.pessoas.merge({ fromId: from.id, intoId: into.id, reason: "mesma pessoa" });

        const [fromRow] = await db.select().from(pessoas).where(eq(pessoas.id, from.id));
        expect(fromRow.mergedInto).toBe(into.id);
        expect(fromRow.mergeReason).toBe("mesma pessoa");

        const parts = await db
          .select()
          .from(participacoesProcesso)
          .where(eq(participacoesProcesso.pessoaId, into.id));
        expect(parts.some((p) => p.processoId === proc.id)).toBe(true);
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, from.id));
        await db.delete(pessoas).where(eq(pessoas.id, into.id));
      }
    } finally {
      await db.delete(processos).where(eq(processos.id, proc.id));
      await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("markAsDistinct grava em pessoas_distincts_confirmed", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.pessoas.create({ nome: "Distinct A " + Date.now(), fonteCriacao: "manual" });
      const b = await caller.pessoas.create({ nome: "Distinct B " + Date.now(), fonteCriacao: "manual" });
      try {
        await caller.pessoas.markAsDistinct({ pessoaAId: a.id, pessoaBId: b.id });
        const { pessoasDistinctsConfirmed } = await import("@/lib/db/schema");
        const rows = await db.select().from(pessoasDistinctsConfirmed);
        const pair = rows.find(
          (r) =>
            (r.pessoaAId === a.id && r.pessoaBId === b.id) ||
            (r.pessoaAId === b.id && r.pessoaBId === a.id),
        );
        expect(pair).toBeTruthy();
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, a.id));
        await db.delete(pessoas).where(eq(pessoas.id, b.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
