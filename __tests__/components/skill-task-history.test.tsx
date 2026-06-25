// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SkillTaskHistory } from "@/components/shared/skill-task-history";

afterEach(() => cleanup());

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    analise: {
      recentForEntity: { useQuery: (...args: unknown[]) => useQueryMock(...args) },
    },
  },
}));

describe("SkillTaskHistory", () => {
  beforeEach(() => useQueryMock.mockReset());

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
