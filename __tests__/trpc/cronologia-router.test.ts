import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { marcosProcessuais } from "@/lib/db/schema/cronologia";
import { processos, assistidos, users } from "@/lib/db/schema/core";
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
