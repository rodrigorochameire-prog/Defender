// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ProcessoCockpitHeader,
  urgenciaPrazo,
  rotuloPrazo,
  humanizar,
  areaLabel,
} from "../processo-cockpit-header";

afterEach(() => cleanup());

const NOW = new Date("2026-06-24T12:00:00.000Z");
const emDias = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

// ─── urgenciaPrazo — escala determinística ───────────────────────────────

describe("urgenciaPrazo", () => {
  it("retorna null sem data", () => {
    expect(urgenciaPrazo(null, NOW)).toBeNull();
    expect(urgenciaPrazo(undefined, NOW)).toBeNull();
    expect(urgenciaPrazo("data-invalida", NOW)).toBeNull();
  });

  it("classifica > 7 dias como tranquilo", () => {
    expect(urgenciaPrazo(emDias(8), NOW)?.nivel).toBe("tranquilo");
  });

  it("classifica 3–7 dias como atenção", () => {
    expect(urgenciaPrazo(emDias(5), NOW)?.nivel).toBe("atencao");
    expect(urgenciaPrazo(emDias(7), NOW)?.nivel).toBe("atencao");
  });

  it("classifica <= 2 dias como urgente", () => {
    expect(urgenciaPrazo(emDias(2), NOW)?.nivel).toBe("urgente");
    expect(urgenciaPrazo(emDias(0), NOW)?.nivel).toBe("urgente");
  });

  it("trata data passada como urgente (dias negativos)", () => {
    const u = urgenciaPrazo(emDias(-3), NOW);
    expect(u?.nivel).toBe("urgente");
    expect(u?.dias).toBeLessThan(0);
  });
});

// ─── rotuloPrazo ─────────────────────────────────────────────────────────

describe("rotuloPrazo", () => {
  it("hoje / amanhã / futuro / passado", () => {
    expect(rotuloPrazo(0)).toBe("hoje");
    expect(rotuloPrazo(1)).toBe("amanhã");
    expect(rotuloPrazo(8)).toBe("em 8 dias");
    expect(rotuloPrazo(-1)).toBe("há 1 dia");
    expect(rotuloPrazo(-3)).toBe("há 3 dias");
  });
});

// ─── humanizar / areaLabel ───────────────────────────────────────────────

describe("humanizar e areaLabel", () => {
  it("humaniza UPPER_SNAKE", () => {
    expect(humanizar("INSTRUCAO")).toBe("Instrucao");
    expect(humanizar("FASE_RECURSAL")).toBe("Fase Recursal");
    expect(humanizar(null)).toBe("—");
  });

  it("areaLabel reusa labels acentuados das atribuições", () => {
    expect(areaLabel("VIOLENCIA_DOMESTICA")).toBe("Violência Doméstica");
    expect(areaLabel("JURI")).toBe("Tribunal do Júri");
  });

  it("areaLabel cai no humanizador para área desconhecida", () => {
    expect(areaLabel("AREA_NOVA")).toBe("Area Nova");
  });
});

// ─── render ──────────────────────────────────────────────────────────────

describe("ProcessoCockpitHeader — render", () => {
  it("mostra número (mono), área humanizada, fase e chip de audiência", () => {
    render(
      <ProcessoCockpitHeader
        numeroAutos="8001234-56.2025.8.05.0039"
        area="JURI"
        vara="1ª Vara do Júri"
        fase="INSTRUCAO"
        proximaAudiencia={{ dataAudiencia: emDias(8), tipo: "AIJ", local: "Sala 2" }}
        now={NOW}
      />,
    );
    expect(screen.getByText("8001234-56.2025.8.05.0039")).toBeInTheDocument();
    expect(screen.getByText(/Tribunal do Júri/)).toBeInTheDocument();
    expect(screen.getByText("Instrucao")).toBeInTheDocument();
    expect(screen.getByText(/em 8 dias/)).toBeInTheDocument();
  });

  it("omite o chip de audiência quando não há próxima audiência", () => {
    render(<ProcessoCockpitHeader numeroAutos="123" area="CRIMINAL" now={NOW} />);
    expect(screen.queryByText(/dias/)).not.toBeInTheDocument();
  });

  it("renderiza o slot de ações (CTA da Fase 3)", () => {
    render(
      <ProcessoCockpitHeader
        numeroAutos="123"
        area="CRIMINAL"
        actions={<button>Criar caso</button>}
        now={NOW}
      />,
    );
    expect(screen.getByRole("button", { name: "Criar caso" })).toBeInTheDocument();
  });
});
