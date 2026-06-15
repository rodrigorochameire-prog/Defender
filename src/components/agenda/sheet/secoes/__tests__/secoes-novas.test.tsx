// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MotivoDesignacaoSecao } from "../MotivoDesignacaoSecao";
import { DossieV2Block } from "../../dossie-v2-block";

describe("MotivoDesignacaoSecao", () => {
  it("mostra o chip da origem e o detalhe", () => {
    render(<MotivoDesignacaoSecao motivo={{ origem: "pedido_revogacao_ofendida", detalhe: "ela quer revogar" }} />);
    expect(screen.getByText("Pedido de revogação da ofendida")).toBeInTheDocument();
    expect(screen.getByText("ela quer revogar")).toBeInTheDocument();
  });

  it("string legada (origem null) mostra só o detalhe, sem chip", () => {
    render(<MotivoDesignacaoSecao motivo={{ origem: null, detalhe: "juiz remarcou" }} />);
    expect(screen.getByText("juiz remarcou")).toBeInTheDocument();
    expect(screen.queryByText("Reavaliação pelo juízo")).not.toBeInTheDocument();
  });
});

describe("DossieV2Block ocultarIntimacao", () => {
  it("não renderiza a intimação quando ocultarIntimacao", () => {
    render(<DossieV2Block dossie={{ intimacao: "ofendida em situação de rua" } as any} ocultarIntimacao />);
    expect(screen.queryByText("ofendida em situação de rua")).not.toBeInTheDocument();
  });
});
