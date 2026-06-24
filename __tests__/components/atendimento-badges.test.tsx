// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  AtendimentoStatusBadge,
  ReadinessBadge,
  MetadataLine,
} from "@/components/atendimentos/atendimento-badges";

const NOW = new Date("2026-06-24T12:00:00");

afterEach(() => cleanup());

describe("AtendimentoStatusBadge — um único badge forte por item", () => {
  it('agendado vencido renderiza "A registrar"', () => {
    render(<AtendimentoStatusBadge status="agendado" dataRegistro="2026-06-20T09:00:00" now={NOW} />);
    expect(screen.getByText("A registrar")).toBeInTheDocument();
  });

  it('realizado renderiza "Realizado"', () => {
    render(<AtendimentoStatusBadge status="realizado" dataRegistro="2026-06-20T09:00:00" now={NOW} />);
    expect(screen.getByText("Realizado")).toBeInTheDocument();
  });

  it("renderiza exatamente um badge de status (sem competição)", () => {
    const { container } = render(
      <AtendimentoStatusBadge status="cancelado" dataRegistro="2026-06-20T09:00:00" now={NOW} />,
    );
    expect(container.querySelectorAll("[data-status-badge]")).toHaveLength(1);
  });
});

describe("ReadinessBadge — sutil, só quando há contexto", () => {
  it('com dossiê OMBUDS mostra "Contexto preparado"', () => {
    render(<ReadinessBadge dossieAtendimento={{ fonte: "ombuds" }} />);
    expect(screen.getByText("Contexto preparado")).toBeInTheDocument();
  });

  it("sem dossiê não renderiza nada", () => {
    const { container } = render(<ReadinessBadge dossieAtendimento={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("MetadataLine — área · tipo em tipografia secundária", () => {
  it('renderiza "Violência Doméstica · Inicial"', () => {
    render(<MetadataLine area="VIOLENCIA_DOMESTICA" subtipo="inicial" />);
    expect(screen.getByText("Violência Doméstica · Inicial")).toBeInTheDocument();
  });

  it("sem área nem tipo não renderiza nada", () => {
    const { container } = render(<MetadataLine area={null} subtipo={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
