import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/triagem/atendimento/[id]/promover/route";
import { PATCH } from "@/app/api/triagem/atendimento/[id]/route";
import { db } from "@/lib/db";
import { atendimentosTriagem, demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAtendimento } from "@/lib/services/triagem";

const SECRET = process.env.SHEETS_WEBHOOK_SECRET ?? "test-secret";

describe("POST /api/triagem/atendimento/:id/promover", () => {
  // Track created records for cleanup
  const createdAtendimentos: number[] = [];
  const createdDemandas: number[] = [];
  const createdProcessos: number[] = [];
  const createdAssistidos: number[] = [];

  afterEach(async () => {
    // Cleanup in FK-safe order: demandas → processos → assistidos → atendimentos
    for (const id of createdDemandas) {
      await db.delete(demandas).where(eq(demandas.id, id)).catch(() => {});
    }
    for (const id of createdProcessos) {
      await db.delete(processos).where(eq(processos.id, id)).catch(() => {});
    }
    for (const id of createdAssistidos) {
      await db.delete(assistidos).where(eq(assistidos.id, id)).catch(() => {});
    }
    for (const id of createdAtendimentos) {
      await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, id)).catch(() => {});
    }
    createdDemandas.length = 0;
    createdProcessos.length = 0;
    createdAssistidos.length = 0;
    createdAtendimentos.length = 0;
  });

  it("promove atendimento e cria demanda 5_TRIAGEM", async () => {
    // Find a valid defensor in the DB
    const [defensor] = await db.select({ id: users.id }).from(users).limit(1);
    if (!defensor) throw new Error("Nenhum user no DB — teste não pode rodar sem defensor");

    const created = await createAtendimento({
      aba: "Juri",
      linha: 5,
      payload: { assistido_nome: "Promotest Júri" },
    });
    createdAtendimentos.push(created.atendimentoId);

    const req = new Request(
      `http://localhost/api/triagem/atendimento/${created.atendimentoId}/promover`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ defensorId: defensor.id }),
      },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: String(created.atendimentoId) }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.demandaId).toBeGreaterThan(0);
    expect(body.ombudsUrl).toContain("/demandas-premium/");

    // Verify atendimento status updated
    const [a] = await db
      .select()
      .from(atendimentosTriagem)
      .where(eq(atendimentosTriagem.id, created.atendimentoId));
    expect(a.status).toBe("promovido");
    expect(a.promovidoParaDemandaId).toBe(body.demandaId);

    // Verify demanda created with correct status
    const [d] = await db
      .select()
      .from(demandas)
      .where(eq(demandas.id, body.demandaId));
    expect(d.status).toBe("5_TRIAGEM");

    // Track for cleanup
    createdDemandas.push(d.id);
    createdProcessos.push(d.processoId);
    createdAssistidos.push(d.assistidoId);
  });

  it("rejeita promover atendimento já resolvido (status=resolvido)", async () => {
    // auto-resolve: documento entregue + demanda curta
    const created = await createAtendimento({
      aba: "Crime1",
      linha: 6,
      payload: { assistido_nome: "Já resolvido", documento_entregue: "Decl. União Estável" },
    });
    createdAtendimentos.push(created.atendimentoId);
    // status should be "resolvido" after auto-resolve
    expect(created.status).toBe("resolvido");

    // Get any defensor
    const [defensor] = await db.select({ id: users.id }).from(users).limit(1);
    const defensorId = defensor?.id ?? 1;

    const req = new Request(
      `http://localhost/api/triagem/atendimento/${created.atendimentoId}/promover`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ defensorId }),
      },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: String(created.atendimentoId) }),
    });
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toContain("resolvido");
  });

  it("rejeita sem autenticação", async () => {
    const req = new Request(
      "http://localhost/api/triagem/atendimento/999/promover",
      {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({ defensorId: 1 }),
      },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: "999" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejeita sem defensorId", async () => {
    const req = new Request(
      "http://localhost/api/triagem/atendimento/999/promover",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const res = await POST(req as any, {
      params: Promise.resolve({ id: "999" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("defensorId");
  });
});

describe("PATCH /api/triagem/atendimento/:id", () => {
  const ids: number[] = [];

  afterEach(async () => {
    for (const id of ids) await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, id));
    ids.length = 0;
  });

  it("resolve um atendimento", async () => {
    const c = await createAtendimento({ aba: "VVD", linha: 5, payload: { assistido_nome: "Test resolver" } });
    ids.push(c.atendimentoId);

    const req = new Request(`http://localhost/api/triagem/atendimento/${c.atendimentoId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ acao: "resolver" }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: String(c.atendimentoId) }) });
    expect(res.status).toBe(200);
    const [a] = await db.select().from(atendimentosTriagem).where(eq(atendimentosTriagem.id, c.atendimentoId));
    expect(a.status).toBe("resolvido");
  });

  it("rejeita devolver sem motivo", async () => {
    const c = await createAtendimento({ aba: "EP", linha: 5, payload: { assistido_nome: "Test devolver" } });
    ids.push(c.atendimentoId);
    const req = new Request(`http://localhost/api/triagem/atendimento/${c.atendimentoId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ acao: "devolver" }),
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: String(c.atendimentoId) }) });
    expect(res.status).toBe(400);
  });
});
