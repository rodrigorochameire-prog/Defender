// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LugarSheet } from "@/components/lugares/lugar-sheet";

afterEach(() => cleanup());

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    lugares: {
      getById: { useQuery: () => ({ data: {
        id: 1, logradouro: "Rua X", numero: "123", bairro: "Centro",
        cidade: "Camaçari", uf: "BA", enderecoCompleto: "Rua X, 123 - Centro",
        latitude: null, longitude: null, geocodingSource: null,
      }, isLoading: false }) },
      getParticipacoesDoLugar: { useQuery: () => ({ data: [], isLoading: false }) },
      geocode: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("LugarSheet", () => {
  it("renderiza 4 abas com dados do lugar", () => {
    render(<LugarSheet lugarId={1} open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/Rua X, 123/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /geral/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /participa/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /coordenada/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /merge/i })).toBeInTheDocument();
  });

  it("não renderiza quando lugarId=null", () => {
    const { container } = render(<LugarSheet lugarId={null} open={false} onOpenChange={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
