import { describe, it, expect } from "vitest";
import { resolverTipo } from "../tipos-audiencia";

// Mapa origem (valor sujo atual no banco) → descrição canônica esperada.
// Cobre os 17 valores distintos hoje presentes em audiencias.tipo.
const ESPERADO: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "Audiência de Instrução e Julgamento",
  "Instrução e Julgamento": "Audiência de Instrução e Julgamento",
  Instrução: "Audiência de Instrução e Julgamento",
  INSTRUCAO: "Audiência de Instrução e Julgamento",
  AIJ: "Audiência de Instrução e Julgamento",
  "Continuação de Instrução / Acareação": "Audiência de Instrução e Julgamento",
  "Oitiva Especial": "Depoimento Especial",
  "Depoimento Especial": "Depoimento Especial",
  OITIVA_ESPECIALIZADA: "Depoimento Especial",
  Justificação: "Justificação",
  "Audiência de Justificação": "Justificação",
  JUSTIFICAÇÃO: "Justificação",
  "Sessão de Julgamento do Tribunal do Júri": "Sessão de Julgamento do Tribunal do Júri",
  "Audiência Admonitória": "Audiência Admonitória",
  "Produção Antecipada de Provas": "Produção Antecipada de Provas",
  "Instrução + Depoimento Especial": "Instrução + Depoimento Especial",
  audiencia: "Audiência",
};

describe("migração: 17 valores sujos → descrição canônica", () => {
  it.each(Object.entries(ESPERADO))("'%s' → '%s'", (origem, destino) => {
    expect(resolverTipo(origem).descricao).toBe(destino);
  });
});
