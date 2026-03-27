import { describe, it, expect, beforeAll } from "vitest";
import { matchSkill, matchByCommand, matchByRegex } from "@/lib/skills/matcher";
import { registerSkill } from "@/lib/skills/registry";

beforeAll(() => {
  registerSkill({
    id: "prazos-vencendo",
    name: "Prazos Vencendo",
    description: "Mostra prazos vencendo",
    icon: "Clock",
    triggers: ["prazos", "vencendo", "prazo urgente"],
    triggerPattern: /praz[oa]s?\s*(venc|urgen|hoje|amanh|semana)/i,
    type: "navigate",
    route: "/prazos?filter=vencendo",
    category: "urgente",
  });
  registerSkill({
    id: "briefing",
    name: "Briefing",
    description: "Briefing do caso",
    icon: "FileText",
    triggers: ["briefing", "resumo do caso", "resumo"],
    params: [{ name: "assistido", extract: /(?:briefing|resumo)\s+(?:do\s+)?(?:caso\s+)?(?:do\s+)?(.+)/i, required: true }],
    type: "delegate",
    category: "analise",
  });
});

describe("matchByCommand", () => {
  it("matcha comando /prazos", () => {
    const result = matchByCommand("/prazos");
    expect(result?.skill.id).toBe("prazos-vencendo");
  });

  it("matcha /briefing com parâmetro", () => {
    const result = matchByCommand("/briefing Gabriel");
    expect(result?.skill.id).toBe("briefing");
    expect(result?.params.assistido).toBe("Gabriel");
  });

  it("retorna null para texto sem /", () => {
    expect(matchByCommand("prazos vencendo")).toBeNull();
  });
});

describe("matchByRegex", () => {
  it("matcha por trigger keyword", () => {
    const result = matchByRegex("quais prazos estão vencendo?");
    expect(result?.skill.id).toBe("prazos-vencendo");
    expect(result?.score).toBeGreaterThanOrEqual(2);
  });

  it("matcha por triggerPattern", () => {
    const result = matchByRegex("prazos de hoje");
    expect(result?.skill.id).toBe("prazos-vencendo");
  });

  it("extrai parâmetro do briefing", () => {
    const result = matchByRegex("briefing do Gabriel");
    expect(result?.skill.id).toBe("briefing");
    expect(result?.params.assistido).toBe("Gabriel");
  });

  it("retorna null quando nada matcha", () => {
    expect(matchByRegex("qual a cor do céu")).toBeNull();
  });
});

describe("matchSkill", () => {
  it("prioriza comando sobre regex", () => {
    const result = matchSkill("/prazos vencendo");
    expect(result?.matchedBy).toBe("command");
  });

  it("usa regex quando não é comando", () => {
    const result = matchSkill("prazos vencendo hoje");
    expect(result?.matchedBy).toBe("regex");
  });
});
