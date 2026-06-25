// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SkillTaskHistory } from "@/components/shared/skill-task-history";

afterEach(() => cleanup());

const useQueryMock = vi.fn();
const retryMutate = vi.fn();
const cancelMutate = vi.fn();
const invalidateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ analise: { recentForEntity: { invalidate: invalidateMock } } }),
    analise: {
      recentForEntity: { useQuery: (...args: unknown[]) => useQueryMock(...args) },
      retryTask: { useMutation: () => ({ mutate: retryMutate, isPending: false }) },
      cancelarTask: { useMutation: () => ({ mutate: cancelMutate, isPending: false }) },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

describe("SkillTaskHistory", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    retryMutate.mockReset();
    cancelMutate.mockReset();
  });

  it("renders an empty state when there are no past runs", () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    render(<SkillTaskHistory processoId={42} />);
    expect(screen.getByText(/nenhuma execução/i)).toBeInTheDocument();
  });

  it("renders recent runs with skill label and summary", () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 1,
          skill: "juri",
          status: "completed",
          etapa: null,
          erro: null,
          resultado: { resumo: "Tese de nulidade viável" },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });
    render(<SkillTaskHistory processoId={42} />);
    expect(screen.getByText(/estratégia do júri/i)).toBeInTheDocument();
    expect(screen.getByText(/nulidade viável/i)).toBeInTheDocument();
    expect(screen.getByText(/concluído/i)).toBeInTheDocument();
  });

  it("shows a failed run with its error summary", () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 2,
          skill: "vvd",
          status: "failed",
          etapa: null,
          erro: "claude -p exit 1",
          resultado: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      isLoading: false,
    });
    render(<SkillTaskHistory assistidoId={9} />);
    expect(screen.getByText(/falhou/i)).toBeInTheDocument();
    expect(screen.getByText(/exit 1/i)).toBeInTheDocument();
    // failed → botão de re-tentar dispara retryTask com o id
    fireEvent.click(screen.getByRole("button", { name: /tentar de novo/i }));
    expect(retryMutate).toHaveBeenCalledWith({ taskId: 2 });
  });

  it("offers cancel on a pending task", () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 5,
          skill: "juri",
          status: "pending",
          etapa: "Na fila",
          erro: null,
          resultado: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
      ],
      isLoading: false,
    });
    render(<SkillTaskHistory processoId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(cancelMutate).toHaveBeenCalledWith({ taskId: 5 });
  });

  it("passes the entity ids to the query", () => {
    useQueryMock.mockReturnValue({ data: [], isLoading: false });
    render(<SkillTaskHistory processoId={7} assistidoId={3} />);
    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ processoId: 7, assistidoId: 3 }),
      expect.anything(),
    );
  });
});
