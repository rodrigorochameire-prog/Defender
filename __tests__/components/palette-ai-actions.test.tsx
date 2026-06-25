// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaletteAiActions } from "@/components/shared/palette-ai-actions";

afterEach(() => cleanup());

const triggerMock = vi.fn();
const onDoneMock = vi.fn();
const getByIdMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    processos: {
      getById: { useQuery: (...args: unknown[]) => getByIdMock(...args) },
    },
  },
}));

vi.mock("@/hooks/use-skill-task", () => ({
  useSkillTask: () => ({
    state: "idle",
    etapa: "",
    taskId: null,
    resultado: null,
    erro: null,
    trigger: triggerMock,
    reset: vi.fn(),
    isSubmitting: false,
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

// cmdk primitives → simples passthroughs clicáveis.
vi.mock("@/components/ui/command", () => ({
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="group" data-heading={heading}>
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
}));

describe("PaletteAiActions", () => {
  beforeEach(() => {
    triggerMock.mockClear();
    onDoneMock.mockClear();
    getByIdMock.mockReset();
    getByIdMock.mockReturnValue({ data: undefined });
  });

  it("renders nothing without an entity", () => {
    const { container } = render(<PaletteAiActions entity={null} onDone={onDoneMock} />);
    expect(container.textContent).toBe("");
  });

  it("lists júri actions for a processo and triggers via daemon on select", () => {
    getByIdMock.mockReturnValue({
      data: {
        id: 42,
        atribuicao: "JURI_CAMACARI",
        assistidos: [{ id: 7, isPrincipal: true, nome: "João" }],
      },
    });
    render(
      <PaletteAiActions entity={{ entity: "processo", id: 42 }} onDone={onDoneMock} />,
    );
    const juri = screen.getByRole("button", { name: /estratégia do júri/i });
    expect(juri).toBeInTheDocument();
    fireEvent.click(juri);
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ skill: "juri", assistidoId: 7, processoId: 42 }),
    );
    expect(onDoneMock).toHaveBeenCalled();
  });

  it("renders assistido-level actions without a query", () => {
    render(
      <PaletteAiActions entity={{ entity: "assistido", id: 9 }} onDone={onDoneMock} />,
    );
    const item = screen.getByRole("button", { name: /transcrever atendimento/i });
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ skill: "transcrever-atendimento", assistidoId: 9 }),
    );
  });

  it("renders nothing for a processo with no linked assistido (cannot trigger)", () => {
    getByIdMock.mockReturnValue({
      data: { id: 42, atribuicao: "JURI_CAMACARI", assistidos: [] },
    });
    const { container } = render(
      <PaletteAiActions entity={{ entity: "processo", id: 42 }} onDone={onDoneMock} />,
    );
    expect(container.textContent).toBe("");
  });
});
