// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { AnaliseStatusBadge, AnaliseResumoFields } from "./AnaliseResumo";

describe("AnaliseResumo", () => {
  it("badge 'IA pendente' quando _status=pendente", () => {
    render(<AnaliseStatusBadge status="pendente" />);
    expect(screen.getByText(/pendente/i)).toBeInTheDocument();
  });
  it("badge 'documento não lido' quando _status=nao_lido", () => {
    render(<AnaliseStatusBadge status="nao_lido" />);
    expect(screen.getByText(/não lido/i)).toBeInTheDocument();
  });
  it("sem badge quando concluido", () => {
    const { container } = render(<AnaliseStatusBadge status="concluido" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renderiza campos rotulados a partir do JSON", () => {
    render(<AnaliseResumoFields expanded data={{ objeto: "Pronúncia", decidido: "Pronunciado",
      providencia: "Analisar RESE", prazo: "", recurso: "sim · RESE", _status: "concluido", _fonte: "fase2" }} resumo={null} />);
    expect(screen.getByText("Pronúncia")).toBeInTheDocument();
    expect(screen.getByText(/Analisar RESE/)).toBeInTheDocument();
    expect(screen.getByText(/Cabe recurso/i)).toBeInTheDocument();
  });
  it("degrada para o texto resumo quando não há JSON", () => {
    render(<AnaliseResumoFields data={null} resumo={"Objeto: algo\nProvidência/Prazo: fazer"} />);
    expect(screen.getByText(/Objeto: algo/)).toBeInTheDocument();
  });
});
