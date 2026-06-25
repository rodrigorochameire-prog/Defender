import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import { auditLogs } from "@/lib/db/schema/audit";
import { vidaFuncionalEventos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);
const mkCtx = (user: any) => ({ user, requestId: "test-" + Math.random(), selectedDefensorScopeId: null });

async function makeDefensor(suffix: string) {
  const [u] = await db.insert(users).values({
    name: "VF Test " + suffix,
    email: `vf-${suffix}-${Date.now()}-${Math.random()}@test.local`,
    role: "defensor",
    workspaceId: 1,
  } as any).returning();
  return u;
}

/** Remove audit log entries for a user before deleting the user (FK constraint). */
async function cleanupUser(userId: number) {
  await db.delete(auditLogs).where(eq(auditLogs.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

describe("vidaFuncional CRUD + isolamento", { timeout: 30000 }, () => {
  it("cria evento e recupera por id; calcula cluster", async () => {
    const a = await makeDefensor("a");
    try {
      const caller = createCaller(mkCtx(a));
      const ev = await caller.vidaFuncional.createEvento({
        tipo: "PROMOCAO", titulo: "Classe Especial", dataEvento: "2026-01-10",
      });
      expect(ev.id).toBeGreaterThan(0);
      expect(ev.cluster).toBe("progressao");
      expect(ev.defensorId).toBe(a.id);

      const fetched = await caller.vidaFuncional.getEvento({ id: ev.id });
      expect(fetched.titulo).toBe("Classe Especial");

      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await cleanupUser(a.id);
    }
  });

  it("defensor B NÃO vê o evento do defensor A (privado)", async () => {
    const a = await makeDefensor("a2");
    const b = await makeDefensor("b2");
    try {
      const ev = await createCaller(mkCtx(a)).vidaFuncional.createEvento({
        tipo: "FERIAS", titulo: "Férias de A", dataEvento: "2026-05-04",
      });
      const listB = await createCaller(mkCtx(b)).vidaFuncional.listEventos({});
      expect(listB.some((e) => e.id === ev.id)).toBe(false);
      await expect(createCaller(mkCtx(b)).vidaFuncional.getEvento({ id: ev.id })).rejects.toThrow();

      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await cleanupUser(a.id);
      await cleanupUser(b.id);
    }
  });

  it("admin NÃO tem god-view sobre a vida funcional de outro", async () => {
    const a = await makeDefensor("a3");
    const [admin] = await db.insert(users).values({
      name: "Admin VF", email: `vf-admin-${Date.now()}@test.local`, role: "admin", workspaceId: 1,
    } as any).returning();
    try {
      const ev = await createCaller(mkCtx(a)).vidaFuncional.createEvento({
        tipo: "GRATIFICACAO", titulo: "Gratif. de A", dataEvento: "2026-03-01",
      });
      const listAdmin = await createCaller(mkCtx(admin)).vidaFuncional.listEventos({});
      expect(listAdmin.some((e) => e.id === ev.id)).toBe(false);
      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await cleanupUser(a.id);
      await cleanupUser(admin.id);
    }
  });

  it("soft-delete remove da listagem", async () => {
    const a = await makeDefensor("a4");
    try {
      const caller = createCaller(mkCtx(a));
      const ev = await caller.vidaFuncional.createEvento({
        tipo: "DIARIA", titulo: "Diária X", dataEvento: "2026-02-02",
      });
      await caller.vidaFuncional.deleteEvento({ id: ev.id });
      const list = await caller.vidaFuncional.listEventos({});
      expect(list.some((e) => e.id === ev.id)).toBe(false);
      await db.delete(vidaFuncionalEventos).where(eq(vidaFuncionalEventos.id, ev.id));
    } finally {
      await cleanupUser(a.id);
    }
  });
});
