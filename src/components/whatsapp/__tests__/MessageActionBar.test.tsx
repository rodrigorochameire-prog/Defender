// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageActionBar } from "../MessageActionBar";

afterEach(() => cleanup());

function setup(overrides: Partial<React.ComponentProps<typeof MessageActionBar>> = {}) {
  const props = {
    isFavorite: false,
    hasMedia: false,
    onSaveToProcess: vi.fn(),
    onCreateNote: vi.fn(),
    onSaveToDrive: vi.fn(),
    onToggleFavorite: vi.fn(),
    onCopy: vi.fn(),
    onReply: vi.fn(),
    onShowDetails: vi.fn(),
    ...overrides,
  };
  render(<MessageActionBar {...props} />);
  return props;
}

describe("MessageActionBar", () => {
  it("expõe as ações primárias por aria-label", () => {
    setup();
    expect(screen.getByLabelText("Salvar no Processo")).toBeInTheDocument();
    expect(screen.getByLabelText("Criar Anotação")).toBeInTheDocument();
    expect(screen.getByLabelText("Favoritar")).toBeInTheDocument();
    expect(screen.getByLabelText("Mais opções")).toBeInTheDocument();
  });

  it("oculta 'Salvar no Drive' sem mídia e mostra com mídia", () => {
    const { rerender } = render(
      <MessageActionBar
        isFavorite={false}
        hasMedia={false}
        onSaveToProcess={vi.fn()}
        onCreateNote={vi.fn()}
        onSaveToDrive={vi.fn()}
        onToggleFavorite={vi.fn()}
        onCopy={vi.fn()}
        onReply={vi.fn()}
        onShowDetails={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Salvar no Drive")).not.toBeInTheDocument();
    rerender(
      <MessageActionBar
        isFavorite={false}
        hasMedia={true}
        onSaveToProcess={vi.fn()}
        onCreateNote={vi.fn()}
        onSaveToDrive={vi.fn()}
        onToggleFavorite={vi.fn()}
        onCopy={vi.fn()}
        onReply={vi.fn()}
        onShowDetails={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Salvar no Drive")).toBeInTheDocument();
  });

  it("alterna o rótulo de favorito conforme o estado", () => {
    setup({ isFavorite: true });
    expect(screen.getByLabelText("Desfavoritar")).toBeInTheDocument();
  });

  it("usa ícones neutros no repouso — sem cores fortes por ação", () => {
    setup({ hasMedia: true });
    for (const label of ["Salvar no Processo", "Criar Anotação", "Salvar no Drive"]) {
      const svg = screen.getByLabelText(label).querySelector("svg");
      const cls = svg?.getAttribute("class") ?? "";
      expect(cls).toContain("text-muted-foreground");
      expect(cls).not.toMatch(/text-emerald|text-amber|text-indigo/);
    }
  });

  it("mantém a estrela âmbar apenas quando favoritada (estado real)", () => {
    setup({ isFavorite: true });
    const svg = screen.getByLabelText("Desfavoritar").querySelector("svg");
    expect(svg?.getAttribute("class") ?? "").toMatch(/amber/);
  });
});
