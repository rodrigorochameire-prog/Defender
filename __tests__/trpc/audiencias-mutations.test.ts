import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { audiencias } from "@/lib/db/schema/agenda";
import { processos, assistidos, users } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);

function mkCtx(user: any) {
  return { user, requestId: "test-" + Math.random(), selectedDefensorScopeId: null };
}

async function seed() {
  const [user] = await db.insert(users).values({
    name: "Test Quick Note",
    email: `quicknote-${Date.now()}@test.local`,
    workspaceId: 1,
  } as any).returning();
  const [assistido] = await db.insert(assistidos).values({
    nome: "Assistido QN " + Date.now(),
    workspaceId: 1,
  } as any).returning();
  const [processo] = await db.insert(processos).values({
    assistidoId: assistido.id,
    numeroAutos: "QN-" + Date.now(),
    area: "JURI",
  } as any).returning();
  const [audiencia] = await db.insert(audiencias).values({
    processoId: processo.id,
    assistidoId: assistido.id,
    dataAudiencia: new Date("2026-05-01T10:00:00Z"),
    tipo: "INSTRUCAO",
    defensorId: user.id,
    anotacoesRapidas: [],
  } as any).returning();
  return { user, audiencia, processo, assistido };
}

async function cleanup(ids: { audienciaId: number; processoId: number; assistidoId: number; userId: number }) {
  await db.delete(audiencias).where(eq(audiencias.id, ids.audienciaId));
  await db.delete(processos).where(eq(processos.id, ids.processoId));
  await db.delete(assistidos).where(eq(assistidos.id, ids.assistidoId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

describe("audiencias.addQuickNote", { timeout: 30000 }, () => {
  it("appends nota ao array JSONB", async () => {
    const { user, audiencia, processo, assistido } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.addQuickNote({
        audienciaId: audiencia.id,
        texto: "Chegou atrasado",
      });
      const [row] = await db.select().from(audiencias).where(eq(audiencias.id, audiencia.id));
      expect(Array.isArray(row.anotacoesRapidas)).toBe(true);
      expect(row.anotacoesRapidas).toHaveLength(1);
      expect(row.anotacoesRapidas?.[0].texto).toBe("Chegou atrasado");
      expect(row.anotacoesRapidas?.[0].autorId).toBe(user.id);
      expect(row.anotacoesRapidas?.[0].timestamp).toBeTruthy();
    } finally {
      await cleanup({ audienciaId: audiencia.id, processoId: processo.id, assistidoId: assistido.id, userId: user.id });
    }
  });

  it("mantém notas existentes ao adicionar nova", async () => {
    const { user, audiencia, processo, assistido } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.addQuickNote({ audienciaId: audiencia.id, texto: "A" });
      await caller.audiencias.addQuickNote({ audienciaId: audiencia.id, texto: "B" });
      const [row] = await db.select().from(audiencias).where(eq(audiencias.id, audiencia.id));
      expect(row.anotacoesRapidas).toHaveLength(2);
      expect(row.anotacoesRapidas?.map((n: any) => n.texto)).toEqual(["A", "B"]);
    } finally {
      await cleanup({ audienciaId: audiencia.id, processoId: processo.id, assistidoId: assistido.id, userId: user.id });
    }
  });

  it("rejeita texto vazio", async () => {
    const { user, audiencia, processo, assistido } = await seed();
    try {
      const caller = createCaller(mkCtx(user));
      await expect(
        caller.audiencias.addQuickNote({ audienciaId: audiencia.id, texto: "" })
      ).rejects.toThrow();
    } finally {
      await cleanup({ audienciaId: audiencia.id, processoId: processo.id, assistidoId: assistido.id, userId: user.id });
    }
  });
});
