// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// ── Stub tRPC hooks ────────────────────────────────────────────────────────────
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      audiencias: { getDepoenteMidia: { invalidate: vi.fn() } },
    }),
    audiencias: {
      getDepoenteMidia: {
        useQuery: () => ({ data: undefined }),
      },
    },
    drive: {
      sectionsByProcesso: {
        useQuery: () => ({ data: undefined }),
      },
    },
  },
}));

// ── Stub sub-components & utilities ───────────────────────────────────────────
vi.mock("@/components/shared/pessoa-avatar", () => ({
  PessoaAvatar: () => null,
}));
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));
vi.mock("@/lib/agenda/secao-classificada", () => ({
  secoesPorTipo: () => [],
}));
vi.mock("./vincular-audio-popover", () => ({
  VincularAudioPopover: () => null,
}));
vi.mock("./transcript-player", () => ({
  TranscriptPlayer: () => null,
}));
vi.mock("./gravar-depoimento", () => ({
  GravarDepoimento: () => null,
}));

// ── Import after mocks ─────────────────────────────────────────────────────────
import { DepoenteCardV2, type DepoenteV2 } from "./depoente-card-v2";

const baseDepoente: DepoenteV2 = {
  id: 1,
  nome: "João Silva",
  tipo: "DEFESA",
  status: "INTIMADA",
};

function renderCard(depoente: DepoenteV2, isOpen = true) {
  return render(
    <DepoenteCardV2
      depoente={depoente}
      isOpen={isOpen}
      onToggle={vi.fn()}
      variant="sheet"
      onMarcarOuvido={vi.fn()}
      onRedesignar={vi.fn()}
      onAdicionarPergunta={vi.fn()}
    />,
  );
}

describe("DepoenteCardV2 — CertidaoExpander (Fix 2)", () => {
  it("exibe certidão quando status=INTIMADA (intim presente)", () => {
    const depoente: DepoenteV2 = {
      ...baseDepoente,
      status: "INTIMADA",
      certidaoComunicacao: "Certidão de comunicação via oficial.",
    };
    renderCard(depoente);
    expect(screen.getByText(/ver certidão de comunicação/i)).toBeInTheDocument();
  });

  it("exibe certidão quando status=OUVIDA (intim ausente) — Fix 2", () => {
    // OUVIDA returns null from intimacaoLabel → previously hidden, now must show
    const depoente: DepoenteV2 = {
      ...baseDepoente,
      status: "OUVIDA",
      certidaoComunicacao: "Certidão pós-audiência registrada.",
    };
    renderCard(depoente);
    expect(screen.getByText(/ver certidão de comunicação/i)).toBeInTheDocument();
  });

  it("exibe certidão quando status=undefined (intim ausente) — Fix 2", () => {
    const depoente: DepoenteV2 = {
      ...baseDepoente,
      status: undefined,
      certidaoComunicacao: "Certidão sem status de intimação.",
    };
    renderCard(depoente);
    expect(screen.getByText(/ver certidão de comunicação/i)).toBeInTheDocument();
  });

  it("não exibe bloco de intimação quando status=OUVIDA e sem certidão", () => {
    const depoente: DepoenteV2 = {
      ...baseDepoente,
      status: "OUVIDA",
      certidaoComunicacao: null,
    };
    renderCard(depoente);
    expect(screen.queryByText(/ver certidão de comunicação/i)).toBeNull();
    // Neither should an intim text appear
    expect(screen.queryByText(/intimada/i)).toBeNull();
  });
});
