// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistroComposer } from "../registro-composer";

// Mirror the mock setup from registro-editor.test.tsx — needed because
// RegistroComposer renders <RegistroEditor> when expanded, which uses tRPC.
const createMutate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ registros: { list: { invalidate: vi.fn() } } }),
    registros: {
      create: {
        useMutation: () => ({ mutate: createMutate, isPending: false }),
      },
    },
  },
}));

afterEach(() => cleanup());

describe("RegistroComposer", () => {
  it("starts collapsed and expands the editor on click", () => {
    render(<RegistroComposer scope={{ assistidoId: 1, demandaId: 3 }} />);

    // collapsed: the add bar button is shown, editor's Salvar is not
    const addBar = screen.getByRole("button", { name: /adicionar registro/i });
    expect(addBar).toBeInTheDocument();
    // "Salvar" only exists inside RegistroEditor — must be absent when collapsed
    expect(screen.queryByRole("button", { name: /salvar/i })).not.toBeInTheDocument();

    fireEvent.click(addBar);

    // expanded: RegistroEditor is mounted, Salvar button now present
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("shows an Abrir autos affordance only when onAbrirAutos is provided", () => {
    const onAbrirAutos = vi.fn();

    const { rerender } = render(<RegistroComposer scope={{ assistidoId: 1 }} />);
    // No prop → no Abrir autos button
    expect(screen.queryByRole("button", { name: /abrir autos/i })).not.toBeInTheDocument();

    rerender(<RegistroComposer scope={{ assistidoId: 1 }} onAbrirAutos={onAbrirAutos} />);
    // Prop provided → button appears and calls the callback
    fireEvent.click(screen.getByRole("button", { name: /abrir autos/i }));
    expect(onAbrirAutos).toHaveBeenCalledTimes(1);
    // Abrir autos must NOT expand the editor
    expect(screen.queryByRole("button", { name: /salvar/i })).not.toBeInTheDocument();
  });
});
