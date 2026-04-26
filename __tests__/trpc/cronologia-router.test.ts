import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { marcosProcessuais, prisoes, cautelares } from "@/lib/db/schema/cronologia";
import { processos, assistidos, users } from "@/lib/db/schema/core";
import { casos } from "@/lib/db/schema/casos";
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
      name: "Test Cronologia",
      email: `cronologia-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

async function makeProcesso(workspaceId: number) {
  const [assistido] = await db
    .insert(assistidos)
    .values({ nome: "Assistido Cron " + Date.now(), workspaceId } as any)
    .returning();
  const [proc] = await db
    .insert(processos)
    .values({
      assistidoId: assistido.id,
      numeroAutos: `CRON-${Date.now()}`,
      area: "JURI",
      workspaceId,
    } as any)
    .returning();
  return { proc, assistido };
}

describe("cronologia.marcos CRUD", { timeout: 30000 }, () => {
  it("createMarco + listMarcos + deleteMarco", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        const created = await caller.cronologia.createMarco({
          processoId: proc.id,
          tipo: "fato",
          data: "2025-01-15",
          observacoes: "teste",
        });
        expect(created.id).toBeGreaterThan(0);

        const lista = await caller.cronologia.listMarcos({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("fato");

        await caller.cronologia.deleteMarco({ id: created.id });
        expect(
          (await caller.cronologia.listMarcos({ processoId: proc.id })).length
        ).toBe(0);
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("updateMarco", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        const { id } = await caller.cronologia.createMarco({
          processoId: proc.id,
          tipo: "fato",
          data: "2025-01-15",
        });
        await caller.cronologia.updateMarco({
          id,
          patch: { tipo: "denuncia", data: "2025-02-20" },
        });
        const lista = await caller.cronologia.listMarcos({ processoId: proc.id });
        expect(lista[0].tipo).toBe("denuncia");
        expect(lista[0].data).toBe("2025-02-20");
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("ACL: processo de outro workspace rejeita createMarco", async () => {
    // user owns processo in workspaceId=1
    const user = await makeUser();
    try {
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        // attacker user context claims workspaceId=2 (different workspace)
        const attackerCtx = {
          user: { ...user, workspaceId: 2 },
          requestId: "test-" + Math.random(),
          selectedDefensorScopeId: null,
        };
        const attackerCaller = createCaller(attackerCtx);
        await expect(
          attackerCaller.cronologia.createMarco({
            processoId: proc.id,
            tipo: "fato",
            data: "2025-01-15",
          })
        ).rejects.toThrow();
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("cronologia.prisoes CRUD", { timeout: 30000 }, () => {
  it("createPrisao + listPrisoes + update + delete", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        const { id } = await caller.cronologia.createPrisao({
          processoId: proc.id, tipo: "preventiva", dataInicio: "2025-03-20", situacao: "ativa",
        });
        const lista = await caller.cronologia.listPrisoes({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("preventiva");
        expect(lista[0].situacao).toBe("ativa");

        await caller.cronologia.updatePrisao({ id, patch: { situacao: "relaxada", dataFim: "2025-06-10" } });
        const after = await caller.cronologia.listPrisoes({ processoId: proc.id });
        expect(after[0].situacao).toBe("relaxada");
        expect(after[0].dataFim).toBe("2025-06-10");

        await caller.cronologia.deletePrisao({ id });
        expect((await caller.cronologia.listPrisoes({ processoId: proc.id })).length).toBe(0);
      } finally {
        await db.delete(prisoes).where(eq(prisoes.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("cronologia.cautelares CRUD", { timeout: 30000 }, () => {
  it("create + list + update + delete", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        const { id } = await caller.cronologia.createCautelar({
          processoId: proc.id, tipo: "monitoramento-eletronico",
          dataInicio: "2025-04-01", status: "ativa",
        });
        const lista = await caller.cronologia.listCautelares({ processoId: proc.id });
        expect(lista).toHaveLength(1);
        expect(lista[0].tipo).toBe("monitoramento-eletronico");

        await caller.cronologia.updateCautelar({ id, patch: { status: "descumprida" } });
        expect((await caller.cronologia.listCautelares({ processoId: proc.id }))[0].status).toBe("descumprida");

        await caller.cronologia.deleteCautelar({ id });
        expect((await caller.cronologia.listCautelares({ processoId: proc.id })).length).toBe(0);
      } finally {
        await db.delete(cautelares).where(eq(cautelares.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("cronologia.getCronologiaCompleta", { timeout: 30000 }, () => {
  it("retorna marcos + prisoes + cautelares em uma chamada", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const { proc, assistido } = await makeProcesso(user.workspaceId ?? 1);
      try {
        await caller.cronologia.createMarco({ processoId: proc.id, tipo: "fato", data: "2025-01-15" });
        await caller.cronologia.createPrisao({ processoId: proc.id, tipo: "preventiva", dataInicio: "2025-03-20" });
        await caller.cronologia.createCautelar({ processoId: proc.id, tipo: "monitoramento-eletronico", dataInicio: "2025-04-01" });

        const full = await caller.cronologia.getCronologiaCompleta({ processoId: proc.id });
        expect(full.marcos).toHaveLength(1);
        expect(full.prisoes).toHaveLength(1);
        expect(full.cautelares).toHaveLength(1);
      } finally {
        await db.delete(marcosProcessuais).where(eq(marcosProcessuais.processoId, proc.id));
        await db.delete(prisoes).where(eq(prisoes.processoId, proc.id));
        await db.delete(cautelares).where(eq(cautelares.processoId, proc.id));
        await db.delete(processos).where(eq(processos.id, proc.id));
        await db.delete(assistidos).where(eq(assistidos.id, assistido.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("cronologia.getCronologiaDoCaso", { timeout: 30000 }, () => {
  it("agrega marcos+prisoes+cautelares de todos processos do caso", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const wid = user.workspaceId ?? 1;

      // Cria assistido pra caso (caso.assistidoId é base de ACL)
      const [ass] = await db.insert(assistidos).values({
        workspaceId: wid, nome: `Test ${Date.now()}`,
      }).returning({ id: assistidos.id });
      const [c] = await db.insert(casos).values({
        workspaceId: wid, assistidoId: ass.id, titulo: "T",
      }).returning({ id: casos.id });
      // 2 processos no caso
      const [p1] = await db.insert(processos).values({
        workspaceId: wid, casoId: c.id, area: "JURI", assistidoId: ass.id,
        numeroAutos: `P1-${Date.now()}`,
      }).returning({ id: processos.id });
      const [p2] = await db.insert(processos).values({
        workspaceId: wid, casoId: c.id, area: "JURI", assistidoId: ass.id,
        numeroAutos: `P2-${Date.now()}`,
      }).returning({ id: processos.id });

      try {
        await caller.cronologia.createMarco({ processoId: p1.id, tipo: "fato", data: "2025-01-01" });
        await caller.cronologia.createMarco({ processoId: p2.id, tipo: "denuncia", data: "2025-03-01" });
        await caller.cronologia.createPrisao({ processoId: p1.id, tipo: "preventiva", dataInicio: "2025-02-01" });

        const agg = await caller.cronologia.getCronologiaDoCaso({ casoId: c.id });
        expect(agg.marcos).toHaveLength(2);
        expect(agg.prisoes).toHaveLength(1);
        expect(agg.cautelares).toHaveLength(0);
        expect(agg.marcos[0].data).toBe("2025-01-01");
      } finally {
        await db.delete(marcosProcessuais).where(inArray(marcosProcessuais.processoId, [p1.id, p2.id]));
        await db.delete(prisoes).where(inArray(prisoes.processoId, [p1.id, p2.id]));
        await db.delete(processos).where(eq(processos.casoId, c.id));
        await db.delete(casos).where(eq(casos.id, c.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
