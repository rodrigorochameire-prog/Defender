import { describe, it, expect } from "vitest";
import { registrosRouter } from "@/lib/trpc/routers/registros";

// ─── Smoke / structure ───────────────────────────────────────────────────

describe("registrosRouter — structure", () => {
  it("exposes list/create/update/delete procedures", () => {
    expect(registrosRouter).toBeDefined();
    expect(registrosRouter._def.procedures).toBeDefined();

    const procs = registrosRouter._def.procedures as Record<string, unknown>;
    expect(procs.list).toBeDefined();
    expect(procs.create).toBeDefined();
    expect(procs.update).toBeDefined();
    expect(procs.delete).toBeDefined();
  });
});

// ─── Helper: pull the zod input schema from a tRPC procedure ─────────────
// tRPC v11 stores parsers in _def.inputs (array) on the built procedure.
function getInputSchema(proc: any) {
  // v11: procedure._def.inputs is an array of zod schemas
  const inputs = proc?._def?.inputs;
  if (Array.isArray(inputs) && inputs.length > 0) return inputs[0];
  // fallback for other shapes
  return proc?._def?.input ?? null;
}

// ─── list — filter inputs ────────────────────────────────────────────────

describe("registrosRouter.list input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.list);

  it("accepts no filters (all optional)", () => {
    expect(schema).toBeTruthy();
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("accepts assistidoId filter", () => {
    const parsed = schema.safeParse({ assistidoId: 42 });
    expect(parsed.success).toBe(true);
  });

  it("accepts processoId filter", () => {
    const parsed = schema.safeParse({ processoId: 7 });
    expect(parsed.success).toBe(true);
  });

  it("accepts demandaId filter", () => {
    const parsed = schema.safeParse({ demandaId: 100 });
    expect(parsed.success).toBe(true);
  });

  it("accepts audienciaId filter", () => {
    const parsed = schema.safeParse({ audienciaId: 5 });
    expect(parsed.success).toBe(true);
  });

  it("accepts tipo filter from the 7-tipo enum", () => {
    for (const tipo of [
      "atendimento",
      "diligencia",
      "anotacao",
      "providencia",
      "delegacao",
      "pesquisa",
      "elaboracao",
    ]) {
      const parsed = schema.safeParse({ tipo });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects an invalid tipo on list", () => {
    const parsed = schema.safeParse({ tipo: "foo" });
    expect(parsed.success).toBe(false);
  });

  it("clamps limit to a max of 300", () => {
    // 300 is the cap (raised from 100 so RegistrosPanel's limit:200 is valid)
    expect(schema.safeParse({ limit: 200 }).success).toBe(true);
    expect(schema.safeParse({ limit: 300 }).success).toBe(true);
    expect(schema.safeParse({ limit: 301 }).success).toBe(false);
  });
});

// ─── create — input validation ───────────────────────────────────────────

describe("registrosRouter.create input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.create);

  it("requires assistidoId", () => {
    const parsed = schema.safeParse({
      tipo: "atendimento",
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires conteudo", () => {
    const parsed = schema.safeParse({
      tipo: "atendimento",
      assistidoId: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("requires tipo", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects tipo 'foo' (must be one of the 7-tipo enum)", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "foo",
      conteudo: "lorem",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts each of the 7 valid tipos", () => {
    for (const tipo of [
      "atendimento",
      "diligencia",
      "anotacao",
      "providencia",
      "delegacao",
      "pesquisa",
      "elaboracao",
    ]) {
      const parsed = schema.safeParse({
        assistidoId: 1,
        tipo,
        conteudo: "lorem",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("accepts a delegacao with demandaId + delegadoParaId + motivoDelegacao", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "delegacao",
      conteudo: "delegado para Estagiária X",
      demandaId: 99,
      delegadoParaId: 4,
      motivoDelegacao: "Acúmulo de prazos",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts optional context fields (processoId, audienciaId, titulo, dataRegistro, interlocutor)", () => {
    const parsed = schema.safeParse({
      assistidoId: 1,
      tipo: "atendimento",
      conteudo: "lorem",
      processoId: 10,
      audienciaId: 5,
      titulo: "Reunião",
      dataRegistro: new Date().toISOString(),
      interlocutor: "familiar",
    });
    expect(parsed.success).toBe(true);
  });
});

// ─── update — input validation ───────────────────────────────────────────

describe("registrosRouter.update input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.update);

  it("requires id", () => {
    const parsed = schema.safeParse({ titulo: "novo" });
    expect(parsed.success).toBe(false);
  });

  it("accepts partial updates (titulo only)", () => {
    const parsed = schema.safeParse({ id: 1, titulo: "novo" });
    expect(parsed.success).toBe(true);
  });

  it("accepts partial updates (conteudo only)", () => {
    const parsed = schema.safeParse({ id: 1, conteudo: "atualizado" });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid tipo on update", () => {
    const parsed = schema.safeParse({ id: 1, tipo: "foo" });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid tipo on update", () => {
    const parsed = schema.safeParse({ id: 1, tipo: "providencia" });
    expect(parsed.success).toBe(true);
  });
});

// ─── delete — input validation ───────────────────────────────────────────

describe("registrosRouter.delete input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.delete);

  it("requires id", () => {
    const parsed = schema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("accepts a numeric id", () => {
    const parsed = schema.safeParse({ id: 1 });
    expect(parsed.success).toBe(true);
  });
});

// ─── atendimentos (SOLAR) — campos e procedures novos ────────────────────

describe("registrosRouter.agendar — campos SOLAR", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.agendar);

  const base = { assistidoId: 1, dataRegistro: "2026-06-12T13:00:00.000Z" };

  it("aceita agendamento mínimo (sem campos SOLAR)", () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it("aceita todos os campos SOLAR", () => {
    const parsed = schema.safeParse({
      ...base,
      numeroSolar: "260610.002.780",
      subtipo: "retorno",
      area: "CRIMINAL",
      pedido: "Consulta-Orientação",
      anotacoesRecepcao: "Mãe do assistido agendada para entrega de documentos",
      historicoSolar: [
        { data: "10/04/2026", numero: "260410.001.613", texto: "Atendimento inicial" },
      ],
      processosCitados: [
        { cnj: "8005316-46.2025.8.05.0039", processoId: 259, origem: "vinculado_solar" },
        { cnj: "8099430-91.2025.8.05.0001", origem: "anotacao" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita subtipo inválido", () => {
    expect(schema.safeParse({ ...base, subtipo: "urgente" }).success).toBe(false);
  });

  it("rejeita área inválida", () => {
    expect(schema.safeParse({ ...base, area: "TRABALHISTA" }).success).toBe(false);
  });

  it("rejeita origem inválida em processosCitados", () => {
    const parsed = schema.safeParse({
      ...base,
      processosCitados: [{ cnj: "123", origem: "pje" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("registrosRouter.update — edição de atendimento", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.update);

  it("aceita reagendamento (dataRegistro)", () => {
    expect(schema.safeParse({ id: 1, dataRegistro: "2026-06-13T13:00:00.000Z" }).success).toBe(true);
  });

  it("aceita limpar processoId (null)", () => {
    expect(schema.safeParse({ id: 1, processoId: null }).success).toBe(true);
  });

  it("aceita campos SOLAR no update", () => {
    const parsed = schema.safeParse({
      id: 1,
      numeroSolar: "260608.003.087",
      subtipo: "inicial",
      anotacoesRecepcao: "Usa tornozeleira eletrônica",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("registrosRouter.listAtendimentos input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.listAtendimentos);

  it("aceita filtros vazios", () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("aceita combinação de filtros", () => {
    const parsed = schema.safeParse({
      status: ["agendado", "realizado"],
      subtipo: "inicial",
      area: "VIOLENCIA_DOMESTICA",
      search: "Roberto",
      dateFrom: "2026-06-12T00:00:00.000Z",
      dateTo: "2026-06-13T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita status inválido", () => {
    expect(schema.safeParse({ status: ["pendente"] }).success).toBe(false);
  });
});

// ─── sprint 2 — dossiê, walk-in e prepararAtendimento ────────────────────

describe("registrosRouter.agendar — walk-in (status/conteudo)", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.agendar);
  const base = { assistidoId: 1, dataRegistro: "2026-06-12T13:00:00.000Z" };

  it("default de status é agendado", () => {
    const parsed = schema.safeParse(base);
    expect(parsed.success).toBe(true);
    expect(parsed.data.status).toBe("agendado");
  });

  it("aceita walk-in realizado com relato", () => {
    const parsed = schema.safeParse({ ...base, status: "realizado", conteudo: "Relato do atendimento" });
    expect(parsed.success).toBe(true);
  });

  it("rejeita status cancelado na criação", () => {
    expect(schema.safeParse({ ...base, status: "cancelado" }).success).toBe(false);
  });
});

describe("registrosRouter.update — dossieAtendimento", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.update);

  it("aceita dossiê completo", () => {
    const parsed = schema.safeParse({
      id: 1,
      dossieAtendimento: {
        gerado_em: "2026-06-11T20:00:00.000Z",
        fonte: "skill",
        objetivo: "Autorização para trabalhar em Dias d'Ávila",
        resumo: ["1 processo citado fora do OMBUDS"],
        situacao_processual: [
          { cnj: "8008640-10.2026.8.05.0039", situacao: "não cadastrado no OMBUDS" },
        ],
        alertas: ["Usa tornozeleira eletrônica"],
        orientacoes: ["Levar comprovante de vínculo de trabalho"],
        perguntas: ["Qual o horário e local de trabalho?"],
        documentos_solicitar: ["Carteira de trabalho ou contrato"],
        providencias: ["Peticionar autorização ao juízo da execução"],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("aceita limpar o dossiê (null)", () => {
    expect(schema.safeParse({ id: 1, dossieAtendimento: null }).success).toBe(true);
  });

  it("rejeita fonte inválida", () => {
    const parsed = schema.safeParse({ id: 1, dossieAtendimento: { fonte: "manual" } });
    expect(parsed.success).toBe(false);
  });
});

describe("registrosRouter.prepararAtendimento input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.prepararAtendimento);

  it("requer id positivo", () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ id: 0 }).success).toBe(false);
    expect(schema.safeParse({ id: 480 }).success).toBe(true);
  });
});

// ─── atendimentosPendentes (card do dashboard) ───────────────────────────

describe("registrosRouter.atendimentosPendentes input", () => {
  const schema = getInputSchema((registrosRouter as any)._def.procedures.atendimentosPendentes);

  it("aceita sem argumentos (input opcional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it("aceita limit dentro do range", () => {
    expect(schema.safeParse({ limit: 6 }).success).toBe(true);
  });

  it("rejeita limit acima de 50", () => {
    expect(schema.safeParse({ limit: 80 }).success).toBe(false);
  });
});
