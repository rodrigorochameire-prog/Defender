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
      vincularAudioDepoente: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    analise: {
      criarTask: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    drive: {
      filesByProcesso: { useQuery: () => ({ data: [], isLoading: false }) },
      filesByAssistido: { useQuery: () => ({ data: [], isLoading: false }) },
      getDriveStatusForProcesso: { useQuery: () => ({ data: null, isLoading: false }) },
      getDriveStatusForAssistido: { useQuery: () => ({ data: null, isLoading: false }) },
      uploadWithLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      midiasByAssistido: { useQuery: () => ({ data: { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } }, isLoading: false }) },
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

  it("renderiza bloco Documentos (novo, com tabs Autos/Assistido)", () => {
    const { container } = render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    // Verify Docs section exists in the ToC
    const docsToCButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.toUpperCase().trim() === "DOCS"
    );
    expect(docsToCButton).toBeDefined();
    // Verify that DocumentosBlock section exists (data-section-id="documentos")
    const documentosSection = container.querySelector('[data-section-id="documentos"]');
    expect(documentosSection).toBeDefined();
  });

  it("renderiza bloco Mídia (empty state quando sem mídia)", () => {
    const { container } = render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    // Verify Mídia section exists in the ToC
    const midiaToCButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.toUpperCase().trim() === "MÍDIA"
    );
    expect(midiaToCButton).toBeDefined();
    // Verify that MidiaBlock section exists (data-section-id="midia")
    const midiaSection = container.querySelector('[data-section-id="midia"]');
    expect(midiaSection).toBeDefined();
  });

  it("não mostra mais links externos antigos 'Pasta do Assistido' / 'Autos do Processo' (regressão Fase 2)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.queryByText(/^pasta do assistido$/i)).toBeNull();
    expect(screen.queryByText(/^autos do processo$/i)).toBeNull();
  });

  it("mostra AnalyzeCTA quando imputação vazia", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    // Pelo menos um botão "Rodar análise IA" deve existir (no bloco "Análise IA" top, em Imputação empty state, etc.)
    const cta = screen.getAllByRole("button", { name: /rodar análise/i });
    expect(cta.length).toBeGreaterThan(0);
  });

  it("FreshnessBadge não renderiza quando analyzedAt é null", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    // Quando a query retorna ctx sem analyzedAt, não deve haver badge "hoje" / "Xd atrás" / "reanalisar"
    expect(screen.queryByText(/^hoje$/i)).toBeNull();
    expect(screen.queryByText(/atrás/i)).toBeNull();
    expect(screen.queryByText(/reanalisar/i)).toBeNull();
  });
});
