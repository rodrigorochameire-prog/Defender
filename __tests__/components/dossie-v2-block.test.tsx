// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DossieV2Block } from "@/components/agenda/sheet/dossie-v2-block";

afterEach(() => cleanup());

const dossie = {
  ato: "Instrução e Julgamento",
  resumo: ["Parágrafo um.", "Parágrafo dois."],
  teses: [{ nome: "Absolvição", nivel: "■■■■□ ALTA", fundamento: "Prova frágil." }],
  perguntas: ["Confirmar identidade."],
  // sem `intimacao` de propósito
};

describe("DossieV2Block", () => {
  it("renderiza resumo, tese (nome+fundamento) e pergunta", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.getByText("Parágrafo um.")).toBeTruthy();
    expect(screen.getByText("Absolvição")).toBeTruthy();
    expect(screen.getByText("Prova frágil.")).toBeTruthy();
    expect(screen.getByText("Confirmar identidade.")).toBeTruthy();
  });
  it("omite a subseção ausente (Intimação)", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.queryByText("Intimação")).toBeNull();
  });
});
