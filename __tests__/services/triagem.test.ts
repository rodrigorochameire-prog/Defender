import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateTccRef, normalizePayload, shouldAutoResolve } from "@/lib/services/triagem";

describe("generateTccRef", () => {
  it("formata ano + número sequencial com 4 dígitos", () => {
    expect(generateTccRef(2026, 1)).toBe("TCC-2026-0001");
    expect(generateTccRef(2026, 124)).toBe("TCC-2026-0124");
    expect(generateTccRef(2026, 9999)).toBe("TCC-2026-9999");
  });

  it("rejeita ano fora do intervalo razoável", () => {
    expect(() => generateTccRef(1999, 1)).toThrow(/ano inválido/i);
    expect(() => generateTccRef(2100, 1)).toThrow(/ano inválido/i);
  });
});

describe("normalizePayload", () => {
  it("preenche compareceu='proprio' como default", () => {
    const p = normalizePayload({ assistido_nome: "João" });
    expect(p.compareceu).toBe("proprio");
  });

  it("trata urgência=string como boolean", () => {
    expect(normalizePayload({ assistido_nome: "X", urgencia: "Mandado prisão" }).urgencia).toBe(true);
    expect(normalizePayload({ assistido_nome: "X", urgencia: "Não" }).urgencia).toBe(false);
    expect(normalizePayload({ assistido_nome: "X", urgencia: "" }).urgencia).toBe(false);
  });

  it("preserva urgenciaMotivo quando urgencia=true", () => {
    const p = normalizePayload({ assistido_nome: "X", urgencia: "Mandado prisão" });
    expect(p.urgenciaMotivo).toBe("Mandado prisão");
  });

  it("rejeita CNJ inválido", () => {
    expect(() => normalizePayload({ assistido_nome: "X", processo_cnj: "12345" }))
      .toThrow(/CNJ/i);
  });

  it("aceita CNJ no formato correto (20 dígitos com pontuação removida)", () => {
    const p = normalizePayload({
      assistido_nome: "X",
      processo_cnj: "8001234-56.2026.8.05.0039",
    });
    expect(p.processoCnj).toBe("80012345620268050039");
  });
});

describe("shouldAutoResolve", () => {
  it("auto-resolve quando documento entregue e demanda livre vazia", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Decl. União Estável",
      demandaLivre: null,
    })).toBe(true);
  });

  it("auto-resolve quando documento entregue e demanda livre curta", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Destit. Adv",
      demandaLivre: "só assinatura",
    })).toBe(true);
  });

  it("não auto-resolve quando demanda livre é substantiva", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Decl. União Estável",
      demandaLivre: "Esposa quer fazer visita ao preso, mas também precisa de orientação sobre divórcio e guarda dos filhos.",
    })).toBe(false);
  });

  it("não auto-resolve sem documento entregue", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Nenhum",
      demandaLivre: null,
    })).toBe(false);
  });
});
