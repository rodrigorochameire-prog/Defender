// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DossieV2Block } from "@/components/agenda/sheet/dossie-v2-block";

afterEach(() => cleanup());

const dossie = {
  ato: "Instrução e Julgamento",
  // resumo/teses ainda fazem parte do dossiê, mas este bloco NÃO os renderiza
  // mais — eles vivem nas seções granulares (Resumo Executivo / Teses).
  resumo: ["Parágrafo um.", "Parágrafo dois."],
  teses: [{ nome: "Absolvição", nivel: "■■■■□ ALTA", fundamento: "Prova frágil." }],
  perguntas: ["Confirmar identidade."],
  providencias: ["Requerer prova pericial."],
  versao_defendido: "Estava em casa no horário do fato.",
  // sem `intimacao` de propósito
};

describe("DossieV2Block", () => {
  it("renderiza ato, perguntas, providências e versão do defendido (complementos)", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.getByText("Instrução e Julgamento")).toBeTruthy();
    expect(screen.getByText("Confirmar identidade.")).toBeTruthy();
    expect(screen.getByText("Requerer prova pericial.")).toBeTruthy();
    expect(screen.getByText("Estava em casa no horário do fato.")).toBeTruthy();
  });
  it("não repete resumo nem teses — eles vivem nas seções granulares do painel", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.queryByText("Parágrafo um.")).toBeNull();
    expect(screen.queryByText("Absolvição")).toBeNull();
    expect(screen.queryByText("Prova frágil.")).toBeNull();
  });
  it("omite a subseção ausente (Intimação)", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.queryByText("Intimação")).toBeNull();
  });
});
