import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { audiencias, testemunhas, audienciasHistorico } from "@/lib/db/schema/agenda";
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

async function seedTestemunha(user: any) {
  const [assistido] = await db.insert(assistidos).values({
    nome: "Assistido DepOuv " + Date.now(),
    workspaceId: 1,
  } as any).returning();
  const [processo] = await db.insert(processos).values({
    assistidoId: assistido.id,
    numeroAutos: "DO-" + Date.now(),
    area: "JURI",
  } as any).returning();
  const [testemunha] = await db.insert(testemunhas).values({
    processoId: processo.id,
    nome: "João Ouvido " + Date.now(),
    tipo: "ACUSACAO",
    status: "ARROLADA",
  } as any).returning();
  return { user, testemunha, processo, assistido };
}

async function cleanupTestemunha(ids: { testemunhaId: number; processoId: number; assistidoId: number }) {
  await db.delete(testemunhas).where(eq(testemunhas.id, ids.testemunhaId));
  await db.delete(processos).where(eq(processos.id, ids.processoId));
  await db.delete(assistidos).where(eq(assistidos.id, ids.assistidoId));
}

async function seedFullAudiencia(userIdOverride?: number) {
  const [user] = userIdOverride
    ? [{ id: userIdOverride }]
    : await db.insert(users).values({
        name: "User Batch " + Date.now(),
        email: `batch-${Date.now()}-${Math.random()}@test.local`,
        workspaceId: 1,
      } as any).returning();
  const [assistido] = await db.insert(assistidos).values({
    nome: "Assistido Batch " + Date.now(),
    workspaceId: 1,
  } as any).returning();
  const [processo] = await db.insert(processos).values({
    assistidoId: assistido.id,
    numeroAutos: "BATCH-" + Date.now(),
    area: "JURI",
  } as any).returning();
  const [audiencia] = await db.insert(audiencias).values({
    processoId: processo.id,
    assistidoId: assistido.id,
    dataAudiencia: new Date("2026-05-15T14:00:00Z"),
    tipo: "INSTRUCAO",
    defensorId: user.id,
    horario: "14:00",
    status: "agendada",
  } as any).returning();
  return { user, audiencia, processo, assistido };
}

async function cleanupFullAudiencia(ids: { audienciaId: number; processoId: number; assistidoId: number; userId: number }) {
  // historico cascade deletes via FK
  await db.delete(audiencias).where(eq(audiencias.id, ids.audienciaId));
  await db.delete(processos).where(eq(processos.id, ids.processoId));
  await db.delete(assistidos).where(eq(assistidos.id, ids.assistidoId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

describe("audiencias.redesignarDepoente", { timeout: 30000 }, () => {
  it("grava redesignadoPara e motivo em observacoes", async () => {
    const [user] = await db.insert(users).values({
      name: "User RD",
      email: `rd-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.redesignarDepoente({
        depoenteId: testemunha.id,
        novaData: "2026-06-15",
        motivo: "Não localizado",
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.redesignadoPara).toBe("2026-06-15");
      expect(row.observacoes).toContain("Não localizado");
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("audiencias.marcarConcluida", { timeout: 30000 }, () => {
  it("atualiza status=concluida, resultado e observacoes", async () => {
    const { user, audiencia, processo, assistido } = await seedFullAudiencia();
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.marcarConcluida({
        audienciaId: audiencia.id,
        resultado: "instrucao_encerrada",
        observacao: "MP e defesa manifestaram em memoriais",
      });
      const [row] = await db.select().from(audiencias).where(eq(audiencias.id, audiencia.id));
      expect(row.status).toBe("concluida");
      expect(row.resultado).toBe("instrucao_encerrada");
      expect(row.observacoes ?? "").toContain("memoriais");
    } finally {
      await cleanupFullAudiencia({ audienciaId: audiencia.id, processoId: processo.id, assistidoId: assistido.id, userId: user.id });
    }
  });
});

describe("audiencias.redesignarAudiencia", { timeout: 30000 }, () => {
  it("cria historico e atualiza dataAudiencia/horario/status", async () => {
    const { user, audiencia, processo, assistido } = await seedFullAudiencia();
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.redesignarAudiencia({
        audienciaId: audiencia.id,
        novaData: "2026-06-20",
        novoHorario: "14:30",
        motivo: "Ausência do juiz",
      });
      const [row] = await db.select().from(audiencias).where(eq(audiencias.id, audiencia.id));
      expect(row.status).toBe("redesignada");
      expect(new Date(row.dataAudiencia).toISOString().slice(0, 10)).toBe("2026-06-20");
      expect(row.horario).toBe("14:30");

      const historico = await db
        .select()
        .from(audienciasHistorico)
        .where(eq(audienciasHistorico.audienciaId, audiencia.id));
      expect(historico).toHaveLength(1);
      expect(historico[0].anotacoes).toContain("REDESIGNADA");
      expect(historico[0].anotacoes).toContain("Ausência do juiz");
      expect(historico[0].editadoPorId).toBe(user.id);
    } finally {
      await cleanupFullAudiencia({ audienciaId: audiencia.id, processoId: processo.id, assistidoId: assistido.id, userId: user.id });
    }
  });
});

describe("audiencias.marcarDepoenteOuvido", { timeout: 30000 }, () => {
  it("seta status=OUVIDA e preenche ouvidoEm", async () => {
    const [user] = await db.insert(users).values({
      name: "User MDO",
      email: `mdo-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.marcarDepoenteOuvido({ depoenteId: testemunha.id });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.status).toBe("OUVIDA");
      expect(row.ouvidoEm).toBeInstanceOf(Date);
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("grava sinteseJuizo quando fornecida", async () => {
    const [user] = await db.insert(users).values({
      name: "User MDO2",
      email: `mdo2-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.marcarDepoenteOuvido({
        depoenteId: testemunha.id,
        sinteseJuizo: "Confirmou fatos da denúncia com detalhes",
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.sinteseJuizo).toBe("Confirmou fatos da denúncia com detalhes");
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("audiencias.vincularAudioDepoente", { timeout: 30000 }, () => {
  it("grava audioDriveFileId quando informado", async () => {
    const [user] = await db.insert(users).values({
      name: "User VAD",
      email: `vad-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: "drive-file-abc",
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.audioDriveFileId).toBe("drive-file-abc");
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("desvincula quando audioDriveFileId é null", async () => {
    const [user] = await db.insert(users).values({
      name: "User VAD2",
      email: `vad2-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: "drive-abc",
      });
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: null,
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.audioDriveFileId).toBeNull();
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
