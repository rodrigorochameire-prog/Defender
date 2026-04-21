import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/triagem/atendimento/route";
import { db } from "@/lib/db";
import { atendimentosTriagem } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.SHEETS_WEBHOOK_SECRET ?? "test-secret";

function makeRequest(body: object, auth = `Bearer ${SECRET}`): Request {
  return new Request("http://localhost/api/triagem/atendimento", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: auth },
    body: JSON.stringify(body),
  });
}

describe("POST /api/triagem/atendimento", () => {
  const createdIds: number[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      for (const id of createdIds) {
        await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, id));
      }
      createdIds.length = 0;
    }
  });

  it("rejeita sem auth", async () => {
    const res = await POST(makeRequest({ aba: "Juri", linha: 4, payload: { assistido_nome: "X" } }, "Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("rejeita aba inválida", async () => {
    const res = await POST(makeRequest({ aba: "Cível", linha: 4, payload: { assistido_nome: "X" } }));
    expect(res.status).toBe(400);
  });

  it("cria atendimento e retorna TCC ref + URL", async () => {
    const res = await POST(makeRequest({
      aba: "Juri",
      linha: 4,
      payload: { assistido_nome: "João Silva", telefone: "71999990000", urgencia: "Mandado prisão" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tccRef).toMatch(/^TCC-\d{4}-\d{4}$/);
    expect(body.triagemUrl).toContain("/triagem?id=");
    createdIds.push(body.atendimentoId);

    const [row] = await db.select().from(atendimentosTriagem).where(eq(atendimentosTriagem.id, body.atendimentoId));
    expect(row.assistidoNome).toBe("João Silva");
    expect(row.urgencia).toBe(true);
    expect(row.status).toBe("pendente_avaliacao");
  });

  it("auto-resolve quando documento entregue + demanda vazia", async () => {
    const res = await POST(makeRequest({
      aba: "Crime1",
      linha: 5,
      payload: { assistido_nome: "Maria Santos", documento_entregue: "Decl. União Estável" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("resolvido");
    createdIds.push(body.atendimentoId);
  });
});
