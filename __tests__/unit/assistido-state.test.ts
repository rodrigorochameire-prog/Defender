import { describe, it, expect } from "vitest";
import {
  CAMPOS_FICHA,
  completudeFicha,
  attentionSignals,
  contextualCTA,
  toSnapshot,
  countProcessosSemCaso,
  DIAS_AUDIENCIA_PROXIMA,
  type AssistidoSnapshot,
} from "@/lib/assistidos/state";

// now fixo em meia-noite local → diffs em dias inteiros, sem flakiness de fuso/hora.
const NOW = new Date(2026, 5, 24); // 2026-06-24
const isoEmDias = (d: number) => {
  const dt = new Date(2026, 5, 24 + d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const fichaCompleta: AssistidoSnapshot = {
  cpf: "123",
  rg: "456",
  dataNascimento: "1990-01-01",
  nomeMae: "Maria",
  endereco: "Rua X",
  telefone: "71999",
  naturalidade: "Camaçari",
};

describe("completudeFicha", () => {
  it("ficha vazia → 0%, critical, todos os campos faltando", () => {
    const r = completudeFicha({});
    expect(r.pct).toBe(0);
    expect(r.tone).toBe("critical");
    expect(r.faltam).toHaveLength(CAMPOS_FICHA.length);
    expect(r.preenchidos).toEqual([]);
  });

  it("ficha completa → 100%, complete, nada faltando", () => {
    const r = completudeFicha(fichaCompleta);
    expect(r.pct).toBe(100);
    expect(r.tone).toBe("complete");
    expect(r.faltam).toEqual([]);
  });

  it("ignora strings em branco (whitespace) como não preenchido", () => {
    const r = completudeFicha({ cpf: "   ", rg: null, dataNascimento: undefined });
    expect(r.pct).toBe(0);
  });

  it("tons por faixa: critical <40, warn 40–69, good 70–99", () => {
    // 2/7 = 29% → critical
    expect(completudeFicha({ cpf: "1", rg: "2" }).tone).toBe("critical");
    // 3/7 = 43% → warn
    expect(completudeFicha({ cpf: "1", rg: "2", endereco: "x" }).tone).toBe("warn");
    // 5/7 = 71% → good
    expect(
      completudeFicha({ cpf: "1", rg: "2", endereco: "x", telefone: "9", nomeMae: "m" }).tone,
    ).toBe("good");
  });

  it("faltam reporta key+label legível", () => {
    const r = completudeFicha({ cpf: "1" });
    expect(r.faltam.find((f) => f.key === "endereco")?.label).toBe("endereço");
  });
});

describe("attentionSignals", () => {
  it("snapshot saudável e completo → nenhum sinal", () => {
    const s: AssistidoSnapshot = {
      ...fichaCompleta,
      processosSemCaso: 0,
      proximoPrazo: isoEmDias(30),
      proximaAudiencia: isoEmDias(60),
    };
    expect(attentionSignals(s, NOW)).toEqual([]);
  });

  it("prazo vencido → sinal demanda-atrasada (critical)", () => {
    const s: AssistidoSnapshot = { ...fichaCompleta, proximoPrazo: isoEmDias(-2) };
    const sig = attentionSignals(s, NOW);
    expect(sig.map((x) => x.kind)).toEqual(["demanda-atrasada"]);
    expect(sig[0].severity).toBe("critical");
  });

  it("demandaAtrasada explícita tem precedência sobre derivação do prazo", () => {
    const s: AssistidoSnapshot = {
      ...fichaCompleta,
      demandaAtrasada: true,
      proximoPrazo: isoEmDias(10), // futuro, mas flag manda
    };
    expect(attentionSignals(s, NOW)[0].kind).toBe("demanda-atrasada");
  });

  it("audiência dentro da janela vira sinal; fora da janela, não", () => {
    const dentro: AssistidoSnapshot = {
      ...fichaCompleta,
      proximaAudiencia: isoEmDias(DIAS_AUDIENCIA_PROXIMA),
    };
    expect(attentionSignals(dentro, NOW).map((x) => x.kind)).toContain("audiencia-proxima");

    const fora: AssistidoSnapshot = {
      ...fichaCompleta,
      proximaAudiencia: isoEmDias(DIAS_AUDIENCIA_PROXIMA + 1),
    };
    expect(attentionSignals(fora, NOW).map((x) => x.kind)).not.toContain("audiencia-proxima");
  });

  it("audiência ≤3d é critical; entre 4–7d é warning", () => {
    const perto: AssistidoSnapshot = { ...fichaCompleta, proximaAudiencia: isoEmDias(2) };
    const medio: AssistidoSnapshot = { ...fichaCompleta, proximaAudiencia: isoEmDias(5) };
    expect(attentionSignals(perto, NOW)[0].severity).toBe("critical");
    expect(attentionSignals(medio, NOW)[0].severity).toBe("warning");
  });

  it("audiência hoje → label 'Audiência hoje'", () => {
    const s: AssistidoSnapshot = { ...fichaCompleta, proximaAudiencia: isoEmDias(0) };
    expect(attentionSignals(s, NOW)[0].label).toBe("Audiência hoje");
  });

  it("processo sem caso → sinal processo-orfao", () => {
    const s: AssistidoSnapshot = { ...fichaCompleta, processosSemCaso: 1 };
    expect(attentionSignals(s, NOW).map((x) => x.kind)).toEqual(["processo-orfao"]);
  });

  it("cadastro crítico (<40%) vira sinal; sem telefone vira sem-contato", () => {
    const s: AssistidoSnapshot = { cpf: "1" }; // 1/7 → critical, e sem telefone
    const kinds = attentionSignals(s, NOW).map((x) => x.kind);
    expect(kinds).toContain("cadastro-critico");
    expect(kinds).toContain("sem-contato");
  });

  it("telefoneContato satisfaz o sinal de contato", () => {
    const s: AssistidoSnapshot = { ...fichaCompleta, telefone: null, telefoneContato: "71988" };
    expect(attentionSignals(s, NOW).map((x) => x.kind)).not.toContain("sem-contato");
  });

  it("ordena por precedência: atrasada → audiência → órfão → cadastro → contato", () => {
    const s: AssistidoSnapshot = {
      cpf: "1", // cadastro crítico + sem contato
      proximoPrazo: isoEmDias(-1), // atrasada
      proximaAudiencia: isoEmDias(2), // audiência próxima
      processosSemCaso: 1, // órfão
    };
    expect(attentionSignals(s, NOW).map((x) => x.kind)).toEqual([
      "demanda-atrasada",
      "audiencia-proxima",
      "processo-orfao",
      "cadastro-critico",
      "sem-contato",
    ]);
  });
});

describe("contextualCTA", () => {
  it("sem urgências → fallback 'Ver assistido'", () => {
    const s: AssistidoSnapshot = { ...fichaCompleta, processosSemCaso: 0 };
    expect(contextualCTA(s, NOW)).toEqual({ kind: "ver", label: "Ver assistido" });
  });

  it("escolhe a ação de maior precedência", () => {
    const s: AssistidoSnapshot = {
      ...fichaCompleta,
      processosSemCaso: 1,
      proximaAudiencia: isoEmDias(2),
    };
    expect(contextualCTA(s, NOW).label).toBe("Preparar audiência");
  });

  it("cada estado isolado resolve seu CTA esperado", () => {
    expect(contextualCTA({ ...fichaCompleta, proximoPrazo: isoEmDias(-1) }, NOW).label).toBe(
      "Tratar demanda atrasada",
    );
    expect(contextualCTA({ ...fichaCompleta, processosSemCaso: 2 }, NOW).label).toBe("Criar caso");
    expect(contextualCTA({ cpf: "1", telefone: "9" }, NOW).label).toBe("Completar cadastro");
  });
});

describe("toSnapshot", () => {
  it("descarta propriedades fora do contrato (ex.: vindas de AssistidoUI)", () => {
    const listItem = {
      ...fichaCompleta,
      // ruído que NÃO deve vazar para o snapshot:
      nome: "Fulano",
      photoUrl: "x.png",
      demandasAbertas: 4,
    } as unknown as AssistidoSnapshot;
    const snap = toSnapshot(listItem);
    expect(snap).not.toHaveProperty("nome");
    expect(snap).not.toHaveProperty("photoUrl");
    expect(snap.cpf).toBe("123");
  });

  it("extra enriquece o snapshot (processosSemCaso/demandaAtrasada)", () => {
    const snap = toSnapshot(fichaCompleta, { processosSemCaso: 2, demandaAtrasada: true });
    expect(snap.processosSemCaso).toBe(2);
    expect(snap.demandaAtrasada).toBe(true);
  });

  it("enriquecimento via extra dispara os sinais correspondentes", () => {
    const snap = toSnapshot(fichaCompleta, { processosSemCaso: 1 });
    expect(attentionSignals(snap, NOW).map((x) => x.kind)).toEqual(["processo-orfao"]);
  });
});

describe("countProcessosSemCaso", () => {
  it("conta processos com casoId nulo/ausente", () => {
    expect(
      countProcessosSemCaso([{ casoId: 10 }, { casoId: null }, {}, { casoId: 22 }]),
    ).toBe(2);
  });

  it("lista vazia → 0", () => {
    expect(countProcessosSemCaso([])).toBe(0);
  });
});
