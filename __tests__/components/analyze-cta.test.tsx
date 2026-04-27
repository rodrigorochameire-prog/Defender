// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnalyzeCTA } from "@/components/agenda/sheet/analyze-cta";

afterEach(() => cleanup());

const mutateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    analise: {
      criarTask: { useMutation: vi.fn(() => ({ mutate: mutateMock, isPending: false })) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("AnalyzeCTA", () => {
  beforeEach(() => { mutateMock.mockClear(); });

  it("estado idle mostra botão Rodar análise IA", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus={null} />);
    expect(screen.getByRole("button", { name: /rodar análise/i })).toBeInTheDocument();
  });

  it("chama criarTask ao clicar", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: /rodar análise/i }));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ assistidoId: 1, processoId: 2 }),
    );
  });

  it("estado queued mostra Enfileirada sem botão rodar", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="queued" />);
    expect(screen.getByText(/enfileirada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rodar/i })).toBeNull();
  });

  it("estado processing mostra Analisando", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="processing" />);
    expect(screen.getByText(/analisando/i)).toBeInTheDocument();
  });

  it("estado failed mostra retry button", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="failed" />);
    expect(screen.getByText(/falhou/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar/i })).toBeInTheDocument();
  });

  it("botão desabilitado quando assistidoId null", () => {
    render(<AnalyzeCTA assistidoId={null} processoId={null} analysisStatus={null} />);
    const btn = screen.getByRole("button", { name: /rodar/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
