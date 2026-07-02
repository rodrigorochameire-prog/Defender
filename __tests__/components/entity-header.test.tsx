// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// A barra utilitária charcoal arrasta CommandPalette/Notifications/Breadcrumbs,
// que dependem de tRPC/next-navigation. Fora do escopo (estrutura/altura-base do
// header de entidade) — stubamos para um marcador identificável.
vi.mock("@/components/layouts/header-utility-row", () => ({
  HeaderUtilityRow: ({ variant }: { variant: string }) => (
    <div data-testid="utility-row" data-variant={variant} className="flex h-11 items-center" />
  ),
}));

import { EntityPageHeader } from "@/components/layouts/entity-page-header";

afterEach(() => cleanup());

const NOME = "Joaquina Aparecida de Souza Albuquerque Cavalcanti";

function setup() {
  return render(
    <EntityPageHeader
      avatar={<div data-testid="avatar" />}
      name={NOME}
      metadata={
        <>
          <span data-testid="status-badge">Preso</span>
          <span data-testid="cpf" className="font-mono tabular-nums">123.456.789-00</span>
        </>
      }
      actions={<button data-testid="cta-atendimento">Atendimento</button>}
    />,
  );
}

describe("EntityPageHeader — variante B (header de entidade)", () => {
  it("renderiza o nome com a assinatura serifada do OMBUDS (font-serif preservado)", () => {
    setup();
    const nome = screen.getByRole("heading", { level: 1, name: NOME });
    expect(nome).toHaveTextContent(NOME);
    // A assinatura serifada do nome é mantida — variante B não troca a fonte.
    expect(nome.className).toContain("font-serif");
  });

  it("dispõe CPF/status HORIZONTALMENTE ao lado do nome (metadado em linha, não banner empilhado)", () => {
    const { container } = setup();
    const nome = screen.getByRole("heading", { level: 1, name: NOME });
    const cpf = screen.getByTestId("cpf");
    const status = screen.getByTestId("status-badge");

    // O nome e os metadados compartilham uma mesma faixa horizontal (flex row),
    // não uma pilha vertical estilo banner.
    const identityRow = nome.closest("[data-entity-identity-row]") as HTMLElement | null;
    expect(identityRow).not.toBeNull();
    expect(identityRow!.className).toContain("flex");
    expect(identityRow!.className).not.toContain("flex-col");

    // CPF e status vivem na mesma faixa (ao lado do nome), não abaixo.
    expect(within(identityRow!).getByTestId("cpf")).toBe(cpf);
    expect(within(identityRow!).getByTestId("status-badge")).toBe(status);
    expect(container).toBeTruthy();
  });

  // O teste "compartilha a métrica do CollapsiblePageHeader" foi removido no
  // Lote F (remoção do CollapsiblePageHeader/HEADER_STYLE): testava uma
  // estrutura (HeaderUtilityRow variant="embedded" + data-entity-identity-band
  // + container charcoal via HEADER_STYLE) que o EntityPageHeader já não usa
  // — o componente migrou para HEADER_GLASS em lote anterior e não renderiza
  // mais HeaderUtilityRow nem expõe data-entity-identity-band. Testava só o
  // componente legado, não comportamento real remanescente.

  it("sticky no topo — herda o comportamento de ancoragem do header compartilhado", () => {
    const { container } = setup();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("sticky");
    expect(root.className).toContain("top-0");
  });
});
