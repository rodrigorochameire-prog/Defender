import { describe, it, expect, afterEach } from "vitest";
import {
  assertPaidApiAllowed,
  assertClaudeApiAllowed,
  assertGeminiApiAllowed,
  assertOpenAiApiAllowed,
} from "../paid-api-guard";

const FLAGS = ["ALLOW_CLAUDE_API", "ALLOW_GEMINI_API", "ALLOW_OPENAI_API"] as const;

afterEach(() => {
  for (const f of FLAGS) delete process.env[f];
});

describe("paid-api-guard — bloqueio por padrão", () => {
  it("bloqueia anthropic/gemini/openai sem flag", () => {
    expect(() => assertPaidApiAllowed("anthropic", "t")).toThrow(/bloqueada/);
    expect(() => assertPaidApiAllowed("gemini", "t")).toThrow(/bloqueada/);
    expect(() => assertPaidApiAllowed("openai", "t")).toThrow(/bloqueada/);
  });

  it("a mensagem cita o feature e a conta Max", () => {
    expect(() => assertGeminiApiAllowed("jurisprudencia-ai")).toThrow(/jurisprudencia-ai/);
    expect(() => assertGeminiApiAllowed("x")).toThrow(/conta Max/);
  });
});

describe("paid-api-guard — liberação por flag (por provedor)", () => {
  it("ALLOW_GEMINI_API=true libera só o gemini", () => {
    process.env.ALLOW_GEMINI_API = "true";
    expect(() => assertGeminiApiAllowed("t")).not.toThrow();
    expect(() => assertOpenAiApiAllowed("t")).toThrow();
    expect(() => assertClaudeApiAllowed("t")).toThrow();
  });

  it("ALLOW_OPENAI_API=true libera só o openai", () => {
    process.env.ALLOW_OPENAI_API = "true";
    expect(() => assertOpenAiApiAllowed("t")).not.toThrow();
    expect(() => assertGeminiApiAllowed("t")).toThrow();
  });

  it("ALLOW_CLAUDE_API=true libera só o anthropic", () => {
    process.env.ALLOW_CLAUDE_API = "true";
    expect(() => assertClaudeApiAllowed("t")).not.toThrow();
    expect(() => assertGeminiApiAllowed("t")).toThrow();
  });

  it("valor diferente de 'true' não libera", () => {
    process.env.ALLOW_GEMINI_API = "1";
    expect(() => assertGeminiApiAllowed("t")).toThrow();
  });
});

describe("paid-api-guard — back-compat", () => {
  it("assertClaudeApiAllowed continua funcionando (re-export)", () => {
    expect(typeof assertClaudeApiAllowed).toBe("function");
    expect(() => assertClaudeApiAllowed("legacy")).toThrow(/bloqueada/);
  });
});
