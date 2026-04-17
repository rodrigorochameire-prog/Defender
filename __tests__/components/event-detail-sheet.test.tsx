// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventDetailSheet } from "@/components/agenda/event-detail-sheet";

afterEach(() => cleanup());

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    audiencias: {
      getAudienciaContext: {
        useQuery: () => ({
          data: {
            assistido: { id: 1, nome: "Maria" },
            processo: { id: 10, numeroAutos: "0000-00" },
            testemunhas: [{ id: 1, nome: "João Único", tipo: "ACUSACAO", status: "ARROLADA" }],
            diligencias: [],
            atendimentos: [],
            analysisData: null,
            caso: null,
          },
          isLoading: false,
        }),
      },
      marcarConcluida: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      redesignarAudiencia: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      marcarDepoenteOuvido: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      redesignarDepoente: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      addQuickNote: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    drive: {
      filesByProcesso: { useQuery: () => ({ data: [], isLoading: false }) },
      filesByAssistido: { useQuery: () => ({ data: [], isLoading: false }) },
      getDriveStatusForProcesso: { useQuery: () => ({ data: null, isLoading: false }) },
      getDriveStatusForAssistido: { useQuery: () => ({ data: null, isLoading: false }) },
      uploadWithLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      midiasByAssistido: { useQuery: () => ({ data: null, isLoading: false }) },
    },
    useUtils: () => ({
      audiencias: { getAudienciaContext: { invalidate: vi.fn() } },
      drive: {
        filesByProcesso: { invalidate: vi.fn() },
        filesByAssistido: { invalidate: vi.fn() },
      },
    }),
  },
}));

// Mock config module used in sheet
vi.mock("@/lib/config/atribuicoes", () => ({
  normalizeAreaToFilter: (v: string) => v,
  SOLID_COLOR_MAP: {} as Record<string, string>,
}));

// Mock sonner — no-op toasts in tests
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("EventDetailSheet", () => {
  const evento = {
    id: 1,
    fonte: "audiencias",
    rawId: 1,
    titulo: "Audiência",
    data: "2026-05-01",
    horarioInicio: "10:00",
    assistido: "Maria",
  };

  it("renderiza nome do depoente exatamente uma vez (regressão bug duplicação)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.getAllByText("João Único")).toHaveLength(1);
  });
});
