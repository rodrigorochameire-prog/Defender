// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SkillLauncher } from "@/components/shared/skill-launcher";

afterEach(() => cleanup());

const triggerMock = vi.fn();

// Mutable hook state, controlled per-test.
let hookState: {
  state: string;
  etapa: string;
  taskId: number | null;
  resultado: unknown;
  erro: string | null;
  trigger: typeof triggerMock;
  reset: ReturnType<typeof vi.fn>;
  isSubmitting: boolean;
};

function resetHookState() {
  hookState = {
    state: "idle",
    etapa: "",
    taskId: null,
    resultado: null,
    erro: null,
    trigger: triggerMock,
    reset: vi.fn(),
    isSubmitting: false,
  };
}

vi.mock("@/hooks/use-skill-task", () => ({
  useSkillTask: () => hookState,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("SkillLauncher", () => {
  beforeEach(() => {
    triggerMock.mockClear();
    resetHookState();
  });

  it("lists júri skills and hides VVD skills under a júri attribution", () => {
    render(
      <SkillLauncher
        entity="processo"
        atribuicao="JURI_CAMACARI"
        assistidoId={7}
        processoId={42}
      />,
    );
    expect(screen.getByRole("button", { name: /estratégia do júri/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /análise vvd/i })).toBeNull();
  });

  it("triggers the skill with the exact context payload on click", () => {
    render(
      <SkillLauncher
        entity="processo"
        atribuicao="JURI_CAMACARI"
        assistidoId={7}
        processoId={42}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /estratégia do júri/i }));
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ skill: "juri", assistidoId: 7, processoId: 42 }),
    );
  });

  it("shows the progress stage while a task is processing", () => {
    resetHookState();
    hookState.state = "processing";
    hookState.etapa = "Analisando teses...";
    render(
      <SkillLauncher
        entity="processo"
        atribuicao="JURI_CAMACARI"
        assistidoId={7}
        processoId={42}
      />,
    );
    expect(screen.getByText(/analisando teses/i)).toBeInTheDocument();
  });

  it("renders a hint and no skill buttons when no assistido is linked", () => {
    render(<SkillLauncher entity="processo" atribuicao="JURI_CAMACARI" processoId={42} />);
    expect(screen.queryByRole("button", { name: /estratégia do júri/i })).toBeNull();
    expect(screen.getByText(/assistido/i)).toBeInTheDocument();
  });

  it("does not trigger a second task while one is already running", () => {
    resetHookState();
    hookState.state = "processing";
    hookState.etapa = "Processando...";
    render(
      <SkillLauncher
        entity="processo"
        atribuicao="VVD_CAMACARI"
        assistidoId={1}
        processoId={2}
      />,
    );
    const vvdButton = screen.getByRole("button", { name: /análise vvd/i });
    fireEvent.click(vvdButton);
    expect(triggerMock).not.toHaveBeenCalled();
  });
});
