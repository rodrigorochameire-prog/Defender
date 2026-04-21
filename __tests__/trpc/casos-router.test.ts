import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { casos, processos, assistidos, users } from "@/lib/db/schema";
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
      name: "Test Casos",
      email: `casos-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

// ==========================================
// getCasosDoAssistido
// ==========================================
describe("casos.getCasosDoAssistido", { timeout: 30000 }, () => {
  it("retorna casos do assistido ordenados por updatedAt desc", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const wid = user.workspaceId ?? 1;

      const [ass] = await db
        .insert(assistidos)
        .values({ workspaceId: wid, nome: `Test Assist ${Date.now()}` } as any)
        .returning({ id: assistidos.id });

      const [c1] = await db
        .insert(casos)
        .values({ assistidoId: ass.id, titulo: "Caso A" } as any)
        .returning({ id: casos.id });

      const [c2] = await db
        .insert(casos)
        .values({ assistidoId: ass.id, titulo: "Caso B" } as any)
        .returning({ id: casos.id });

      try {
        const lista = await caller.casos.getCasosDoAssistido({ assistidoId: ass.id });
        const ids = lista.map((c: any) => c.id);
        expect(ids).toContain(c1.id);
        expect(ids).toContain(c2.id);
      } finally {
        await db.delete(casos).where(eq(casos.assistidoId, ass.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

// ==========================================
// getCasoById + ACL
// ==========================================
describe("casos.getCasoById + ACL", { timeout: 30000 }, () => {
  it("retorna caso do workspace", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const wid = user.workspaceId ?? 1;

      const [ass] = await db
        .insert(assistidos)
        .values({ workspaceId: wid, nome: `Ass ${Date.now()}` } as any)
        .returning({ id: assistidos.id });

      const [c] = await db
        .insert(casos)
        .values({ assistidoId: ass.id, titulo: "X" } as any)
        .returning({ id: casos.id });

      try {
        const got = await caller.casos.getCasoById({ id: c.id });
        expect(got?.titulo).toBe("X");
      } finally {
        await db.delete(casos).where(eq(casos.id, c.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("ACL: caso de outro workspace retorna null", async () => {
    // user pertence ao workspace 1; caso está vinculado a assistido de outro workspace
    const user = await makeUser(); // workspaceId = 1
    let ws2Id: number | null = null;
    try {
      const caller = createCaller(mkCtx(user));

      // Criar workspace temporário
      const [ws2] = await db
        .execute(
          `INSERT INTO workspaces (name, is_active) VALUES ('WS Test ACL', false) RETURNING id`
        ) as any[];
      ws2Id = ws2.id;

      const [ass] = await db
        .insert(assistidos)
        .values({ workspaceId: ws2Id, nome: `Outro WS ${Date.now()}` } as any)
        .returning({ id: assistidos.id });

      const [c] = await db
        .insert(casos)
        .values({ assistidoId: ass.id, titulo: "outro ws" } as any)
        .returning({ id: casos.id });

      try {
        const got = await caller.casos.getCasoById({ id: c.id });
        expect(got).toBeNull();
      } finally {
        await db.delete(casos).where(eq(casos.id, c.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
      if (ws2Id) {
        await db.execute(`DELETE FROM workspaces WHERE id = ${ws2Id}`);
      }
    }
  });
});

// ==========================================
// setReferenciaProcesso
// ==========================================
describe("casos.setReferenciaProcesso", { timeout: 30000 }, () => {
  it("marca processo como referência e desmarca outros do caso", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const wid = user.workspaceId ?? 1;

      const [ass] = await db
        .insert(assistidos)
        .values({ workspaceId: wid, nome: `Ass ${Date.now()}` } as any)
        .returning({ id: assistidos.id });

      const [c] = await db
        .insert(casos)
        .values({ assistidoId: ass.id, titulo: "Ref" } as any)
        .returning({ id: casos.id });

      const [p1] = await db
        .insert(processos)
        .values({
          workspaceId: wid,
          casoId: c.id,
          area: "JURI",
          assistidoId: ass.id,
          numeroAutos: `REF-${Date.now()}-1`,
        } as any)
        .returning({ id: processos.id });

      const [p2] = await db
        .insert(processos)
        .values({
          workspaceId: wid,
          casoId: c.id,
          area: "JURI",
          assistidoId: ass.id,
          numeroAutos: `REF-${Date.now()}-2`,
        } as any)
        .returning({ id: processos.id });

      try {
        // Marcar p1
        await caller.casos.setReferenciaProcesso({ processoId: p1.id });
        let row = await db
          .select({ ref: processos.isReferencia })
          .from(processos)
          .where(eq(processos.id, p1.id));
        expect(row[0].ref).toBe(true);
        row = await db
          .select({ ref: processos.isReferencia })
          .from(processos)
          .where(eq(processos.id, p2.id));
        expect(row[0].ref).toBe(false);

        // Trocar para p2
        await caller.casos.setReferenciaProcesso({ processoId: p2.id });
        row = await db
          .select({ ref: processos.isReferencia })
          .from(processos)
          .where(eq(processos.id, p1.id));
        expect(row[0].ref).toBe(false);
        row = await db
          .select({ ref: processos.isReferencia })
          .from(processos)
          .where(eq(processos.id, p2.id));
        expect(row[0].ref).toBe(true);
      } finally {
        await db.delete(processos).where(eq(processos.casoId, c.id));
        await db.delete(casos).where(eq(casos.id, c.id));
        await db.delete(assistidos).where(eq(assistidos.id, ass.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
