// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroPreviewCard } from "@/components/agenda/registro-audiencia/historico/registro-preview-card";

afterEach(() => cleanup());

const baseRegistro = {
  eventoId: "evt-1",
  dataRealizacao: "2026-04-02",
  realizada: true,
  assistidoCompareceu: true,
  resultado: "instrucao_encerrada",
  depoentes: [],
  atendimentoReuAntes: "",
  estrategiasDefesa: "",
  manifestacaoMP: "",
  manifestacaoDefesa: "",
  decisaoJuiz: "",
  encaminhamentos: "",
  anotacoesGerais: "",
  registradoPor: "",
  dataRegistro: "",
};

describe("RegistroPreviewCard", () => {
  it("variant preview: wrapper emerald", () => {
    const { container } = render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="preview" />
    );
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("variant saved: wrapper branco/neutral (sem bg-emerald-50)", () => {
    const { container } = render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(container.firstElementChild?.className ?? "").not.toMatch(/bg-emerald-50/);
  });

  it("mostra resultado quando preenchido", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/instrucao_encerrada/i)).toBeInTheDocument();
  });

  it("oculta manifestacaoMP quando vazio", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.queryByText(/ministério público/i)).toBeNull();
  });

  it("mostra manifestacaoMP quando preenchido", () => {
    const r = { ...baseRegistro, manifestacaoMP: "Pela condenação" };
    render(
      <RegistroPreviewCard registro={r as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/pela condenação/i)).toBeInTheDocument();
  });

  it("presença compareceu mostra badge com Presente", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/presente/i)).toBeInTheDocument();
  });

  it("variant preview mostra label EM EDIÇÃO", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="preview" />
    );
    expect(screen.getByText(/em edição/i)).toBeInTheDocument();
  });
});
