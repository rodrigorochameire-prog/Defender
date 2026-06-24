// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MessageActionSheet } from "../MessageActionSheet";

afterEach(() => cleanup());

function baseProps(overrides: Partial<React.ComponentProps<typeof MessageActionSheet>> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
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
}

describe("MessageActionSheet", () => {
  it("lista as ações quando aberto", () => {
    render(<MessageActionSheet {...baseProps()} />);
    expect(screen.getByText("Salvar no Processo")).toBeInTheDocument();
    expect(screen.getByText("Criar Anotação")).toBeInTheDocument();
    expect(screen.getByText("Favoritar")).toBeInTheDocument();
    expect(screen.getByText("Copiar texto")).toBeInTheDocument();
    expect(screen.getByText("Responder citando")).toBeInTheDocument();
  });

  it("oculta 'Salvar no Drive' sem mídia e mostra com mídia", () => {
    const { rerender } = render(<MessageActionSheet {...baseProps({ hasMedia: false })} />);
    expect(screen.queryByText("Salvar no Drive")).not.toBeInTheDocument();
    rerender(<MessageActionSheet {...baseProps({ hasMedia: true })} />);
    expect(screen.getByText("Salvar no Drive")).toBeInTheDocument();
  });

  it("alterna o rótulo de favorito conforme o estado", () => {
    render(<MessageActionSheet {...baseProps({ isFavorite: true })} />);
    expect(screen.getByText("Desfavoritar")).toBeInTheDocument();
  });

  it("executa a ação e fecha a sheet ao tocar", () => {
    const onSaveToProcess = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MessageActionSheet
        {...baseProps({ onSaveToProcess, onOpenChange })}
      />,
    );
    fireEvent.click(screen.getByText("Salvar no Processo"));
    expect(onSaveToProcess).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("não renderiza conteúdo quando fechado", () => {
    render(<MessageActionSheet {...baseProps({ open: false })} />);
    expect(screen.queryByText("Salvar no Processo")).not.toBeInTheDocument();
  });
});
