import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import {
  encaminhamentos,
  encaminhamentoDestinatarios,
} from "@/lib/db/schema/cowork";
import { users } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";

const createCaller = createCallerFactory(appRouter);

async function makeUser(name: string) {
  const [u] = await db.insert(users).values({
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}-${Date.now()}@test.local`,
    workspaceId: 1,
  } as any).returning();
  return u;
}

function mkCtx(user: any) {
  return {
    user,
    requestId: "test-" + Math.random(),
    selectedDefensorScopeId: null,
  };
}

describe("encaminhamentos.aceitar (transferir)", () => {
  it("transfers demanda ownership when accepted", { timeout: 30000 }, async () => {
    const { demandas, processos, assistidos } = await import("@/lib/db/schema/core");

    const alice = await makeUser("Alice Aceitar");
    const bob = await makeUser("Bob Aceitar");
    const [asst] = await db.insert(assistidos).values({
      nome: "Teste Transfer",
      workspaceId: 1,
    } as any).returning();
    const [proc] = await db.insert(processos).values({
      assistidoId: asst.id,
      numeroAutos: "TEST-TRANSFER-" + Date.now(),
      area: "JURI",
    } as any).returning();
    const [dem] = await db.insert(demandas).values({
      processoId: proc.id,
      assistidoId: asst.id,
      ato: "Teste de transferência",
      defensorId: alice.id,
      workspaceId: 1,
      status: "5_TRIAGEM" as any,
    } as any).returning();

    const aliceCaller = createCaller(mkCtx(alice));
    const { id: encId } = await aliceCaller.encaminhamentos.criar({
      tipo: "transferir",
      mensagem: "assume isso",
      destinatarioIds: [bob.id],
      demandaId: dem.id,
      notificarOmbuds: false,
      notificarWhatsapp: false,
    });

    const bobCaller = createCaller(mkCtx(bob));
    await bobCaller.encaminhamentos.aceitar({ id: encId });

    const [demAfter] = await db.select().from(demandas).where(eq(demandas.id, dem.id));
    expect(demAfter.defensorId).toBe(bob.id);

    const [encAfter] = await db.select().from(encaminhamentos).where(eq(encaminhamentos.id, encId));
    expect(encAfter.status).toBe("aceito");
    expect(encAfter.concluidoPorId).toBe(bob.id);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, encId));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, encId));
    await db.delete(demandas).where(eq(demandas.id, dem.id));
    await db.delete(processos).where(eq(processos.id, proc.id));
    await db.delete(assistidos).where(eq(assistidos.id, asst.id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
  });
});

describe("encaminhamentos.criar", () => {
  it("rejects transferir with multiple destinatarios", async () => {
    const alice = await makeUser("Alice Criar1");
    const bob = await makeUser("Bob Criar1");
    const carol = await makeUser("Carol Criar1");
    const caller = createCaller(mkCtx(alice));

    await expect(
      caller.encaminhamentos.criar({
        tipo: "transferir",
        mensagem: "passa isso",
        destinatarioIds: [bob.id, carol.id],
        demandaId: 1,
      }),
    ).rejects.toThrow(/apenas 1 destinatário/i);

    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
    await db.delete(users).where(eq(users.id, carol.id));
  });

  it("creates anotar with multiple destinatarios", async () => {
    const alice = await makeUser("Alice Criar2");
    const bob = await makeUser("Bob Criar2");
    const carol = await makeUser("Carol Criar2");
    const caller = createCaller(mkCtx(alice));

    const { id } = await caller.encaminhamentos.criar({
      tipo: "anotar",
      mensagem: "recado para os dois",
      destinatarioIds: [bob.id, carol.id],
      notificarOmbuds: false,
      notificarWhatsapp: false,
    });

    const dests = await db
      .select()
      .from(encaminhamentoDestinatarios)
      .where(eq(encaminhamentoDestinatarios.encaminhamentoId, id));
    expect(dests).toHaveLength(2);

    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, id));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
    await db.delete(users).where(eq(users.id, carol.id));
  });
});

describe("encaminhamentos.listar", () => {
  it("splits items correctly between remetente and destinatario views", async () => {
    const alice = await makeUser("Alice Listar");
    const bob = await makeUser("Bob Listar");

    const [enc] = await db.insert(encaminhamentos).values({
      workspaceId: 1,
      remetenteId: alice.id,
      tipo: "anotar",
      mensagem: "teste de envio",
    } as any).returning();

    await db.insert(encaminhamentoDestinatarios).values({
      encaminhamentoId: enc.id,
      userId: bob.id,
    } as any);

    const aliceCaller = createCaller(mkCtx(alice));
    const aliceEnviados = await aliceCaller.encaminhamentos.listar({ filtro: "enviados" });
    expect(aliceEnviados.items.map((i) => i.id)).toContain(enc.id);

    const bobCaller = createCaller(mkCtx(bob));
    const bobRecebidos = await bobCaller.encaminhamentos.listar({ filtro: "recebidos" });
    expect(bobRecebidos.items.map((i) => i.id)).toContain(enc.id);

    const bobEnviados = await bobCaller.encaminhamentos.listar({ filtro: "enviados" });
    expect(bobEnviados.items.map((i) => i.id)).not.toContain(enc.id);

    // cleanup
    await db.delete(encaminhamentoDestinatarios).where(eq(encaminhamentoDestinatarios.encaminhamentoId, enc.id));
    await db.delete(encaminhamentos).where(eq(encaminhamentos.id, enc.id));
    await db.delete(users).where(eq(users.id, alice.id));
    await db.delete(users).where(eq(users.id, bob.id));
  });
});
