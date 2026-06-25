// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AnaliseProcessoCard } from "../analise-processo-card";

afterEach(() => cleanup());

describe("AnaliseProcessoCard — 3 estados", () => {
  it("estado estruturado: renderiza resumo, tese, estratégia, crime e pontos críticos", () => {
    render(
      <AnaliseProcessoCard
        analise={{
          resumoFato: "Réu preso em flagrante por tráfico.",
          teseDefesa: "Atipicidade — porte para consumo.",
          estrategiaAtual: "Pleitear desclassificação no art. 28.",
          crimePrincipal: "Tráfico de drogas",
          pontosCriticos: ["Ausência de laudo definitivo", "Cadeia de custódia frágil"],
          fonteArquivo: "analise_8001234.json",
          importadoEm: "2026-06-20T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Resumo do fato")).toBeInTheDocument();
    expect(screen.getByText(/Réu preso em flagrante/)).toBeInTheDocument();
    expect(screen.getByText("Tese de defesa")).toBeInTheDocument();
    expect(screen.getByText("Estratégia atual")).toBeInTheDocument();
    expect(screen.getByText("Tráfico de drogas")).toBeInTheDocument();
    expect(screen.getByText("Pontos críticos")).toBeInTheDocument();
    expect(screen.getByText("Ausência de laudo definitivo")).toBeInTheDocument();
    expect(screen.getByText("Cadeia de custódia frágil")).toBeInTheDocument();
  });

  it("estado fallback: sem análise estruturada, renderiza resumo/achados de analysisData", () => {
    render(
      <AnaliseProcessoCard
        analise={null}
        analysisData={{
          resumo: "Síntese gerada por scan do acórdão.",
          achadosChave: ["Prescrição em tese", "Confissão espontânea"],
        }}
        analyzedAt="2026-06-18T10:00:00.000Z"
      />,
    );

    expect(screen.getByText(/Síntese gerada por scan/)).toBeInTheDocument();
    expect(screen.getByText("Prescrição em tese")).toBeInTheDocument();
    // não deve mostrar os rótulos do estado estruturado
    expect(screen.queryByText("Tese de defesa")).not.toBeInTheDocument();
  });

  it("estado vazio: sem análise alguma, mostra o empty state", () => {
    render(<AnaliseProcessoCard analise={null} analysisData={null} />);

    expect(screen.getByText("Sem análise importada")).toBeInTheDocument();
    expect(screen.queryByText("Resumo do fato")).not.toBeInTheDocument();
  });

  it("estado loading: renderiza skeleton, sem conteúdo de análise", () => {
    const { container } = render(<AnaliseProcessoCard isLoading />);
    expect(screen.queryByText("Sem análise importada")).not.toBeInTheDocument();
    expect(screen.queryByText("Resumo do fato")).not.toBeInTheDocument();
    // o skeleton é o único filho
    expect(container.firstChild).toBeTruthy();
  });

  it("estruturado ignora fallback quando ambos presentes (prioridade da análise rica)", () => {
    render(
      <AnaliseProcessoCard
        analise={{ teseDefesa: "Legítima defesa." }}
        analysisData={{ resumo: "NÃO DEVE APARECER" }}
      />,
    );
    expect(screen.getByText("Legítima defesa.")).toBeInTheDocument();
    expect(screen.queryByText("NÃO DEVE APARECER")).not.toBeInTheDocument();
  });
});
