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

// O EventDetailSheet renderiza uma árvore profunda (audiências, drive, mídia,
// pessoas, cautelares, mpu, …). Em vez de enumerar cada procedure, o mock usa
// Proxies: procedures com dados relevantes para as asserções são declaradas em
// `overrides`; qualquer outra cai em stubs genéricos (useQuery/useMutation),
// evitando "Cannot read properties of undefined" a cada procedure nova.
vi.mock("@/lib/trpc/client", () => {
  const overrides: Record<string, Record<string, any>> = {
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
    },
    drive: {
      autosDoProcesso: { useQuery: () => ({ data: { desteProcesso: [], correlacionados: [], outros: [] }, isLoading: false }) },
      midiasByAssistido: { useQuery: () => ({ data: { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } }, isLoading: false }) },
    },
  };

  // Stub padrão para qualquer procedure: expõe useQuery e useMutation.
  const defaultProcedure = {
    useQuery: () => ({ data: undefined, isLoading: false }),
    useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useInfiniteQuery: () => ({ data: undefined, isLoading: false, fetchNextPage: vi.fn() }),
  };

  const makeRouterProxy = (routerName: string) => {
    const routerOverrides = overrides[routerName] ?? {};
    return new Proxy(
      {},
      { get: (_t, procedure: string) => routerOverrides[procedure] ?? defaultProcedure },
    );
  };

  const trpcProxy = new Proxy(
    {},
    {
      get: (_t, router: string) => {
        if (router === "useUtils") {
          // utils.<router>.<procedure>.invalidate() — proxy aninhado, sempre no-op.
          return () =>
            new Proxy({}, { get: () => new Proxy({}, { get: () => ({ invalidate: vi.fn(), refetch: vi.fn() }) }) });
        }
        return makeRouterProxy(router);
      },
    },
  );

  return { trpc: trpcProxy };
});

// Mock config module used in sheet.
// Partial mock: preserva os exports reais (getAvatarGradient etc. usados pelo
// AssistidoAvatar) e só sobrescreve o necessário — robusto a novos exports.
vi.mock("@/lib/config/atribuicoes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config/atribuicoes")>();
  return {
    ...actual,
    normalizeAreaToFilter: (v: string) => v,
    SOLID_COLOR_MAP: {} as Record<string, string>,
  };
});

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

  it("renderiza a seção de depoentes exatamente uma vez (regressão bug duplicação)", () => {
    // Pós migração F3, os depoentes moram na DepoentesSecao (data-section-id="depoentes")
    // em vez do DepoenteCardV2 (data-lado, hoje só no card expandido). O guard anti-
    // duplicação continua valendo: a âncora da seção deve aparecer uma única vez.
    const { container } = render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(container.querySelectorAll('[data-section-id="depoentes"]').length).toBe(1);
  });

  // NOTA: os testes "renderiza bloco Documentos" e "renderiza bloco Mídia" foram
  // removidos. Eles assumiam o layout antigo (todas as seções achatadas no DOM).
  // A refatoração "modos de trabalho" (spec §D) particionou as seções em abas de
  // área — Documentos/Mídia agora renderizam DENTRO da sua aba (gated por conteúdo),
  // não no DOM da aba ativa por padrão. Contrato antigo, não regressão.

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
