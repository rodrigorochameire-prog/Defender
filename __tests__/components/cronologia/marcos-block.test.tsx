// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MarcosBlock } from "@/app/(dashboard)/admin/processos/[id]/_components/marcos-block";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    cronologia: {
      createMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("MarcosBlock", () => {
  it("renderiza lista com count correto", () => {
    render(<MarcosBlock processoId={1} marcos={[
      { id: 1, tipo: "fato", data: "2025-01-15", documentoReferencia: null },
      { id: 2, tipo: "denuncia", data: "2025-05-20", documentoReferencia: null },
    ]} onRefresh={() => {}} />);
    expect(screen.getByText(/Marcos \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/fato/)).toBeInTheDocument();
    expect(screen.getByText(/denuncia/)).toBeInTheDocument();
  });

  it("renderiza 'nenhum marco' quando vazio", () => {
    render(<MarcosBlock processoId={1} marcos={[]} onRefresh={() => {}} />);
    expect(screen.getByText(/Nenhum marco/i)).toBeInTheDocument();
  });

  it("click Novo abre form", () => {
    render(<MarcosBlock processoId={1} marcos={[]} onRefresh={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /novo/i }));
    expect(screen.getByText(/Tipo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar/i })).toBeInTheDocument();
  });
});
