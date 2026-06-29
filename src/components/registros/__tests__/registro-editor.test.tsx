// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistroEditor } from "../registro-editor";

// Spy capturado em nível de módulo via vi.hoisted para ser referenciável
// dentro do factory do vi.mock (que é hoisted antes dos imports).
const createMutate = vi.hoisted(() => vi.fn());

// tRPC client é stub via mock — não precisamos de provider real para
// asserts sobre rendering dos chips.
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ registros: { list: { invalidate: vi.fn() } } }),
    registros: {
      create: {
        useMutation: () => ({ mutate: createMutate, isPending: false }),
      },
    },
  },
}));

beforeEach(() => createMutate.mockClear());
afterEach(() => cleanup());

describe("RegistroEditor — tiposPrimarios", () => {
  it("renderiza só os tipos primários inline quando a prop é passada", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia", "anotacao"]}
      />,
    );
    // Inline: 3 botões com aria-label dos primários
    expect(screen.getByRole("button", { name: "Ciência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Providência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anotação" })).toBeInTheDocument();
    // Não inline: outros tipos não aparecem como botão direto
    expect(screen.queryByRole("button", { name: "Diligência" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pesquisa" })).toBeNull();
  });

  it("sem tiposPrimarios mantém comportamento atual (todos os 12)", () => {
    render(
      <RegistroEditor assistidoId={1} tipoDefault="ciencia" />,
    );
    expect(screen.getByRole("button", { name: "Atendimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diligência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pesquisa" })).toBeInTheDocument();
  });

  it("mostra botão Mais quando há tipos não-primários", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia"]}
      />,
    );
    expect(screen.getByRole("button", { name: /^Mais$/ })).toBeInTheDocument();
  });

  it("não mostra Mais quando todos os tipos já são primários", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        // todos os 13 tipos canônicos (inclui "analise")
        tiposPrimarios={[
          "analise", "atendimento", "diligencia", "anotacao", "ciencia",
          "providencia", "delegacao", "pesquisa", "elaboracao", "peticao",
          "busca", "investigacao", "transferencia",
        ]}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Mais$/ })).toBeNull();
  });

  it("atalho '1' troca para o primeiro tipo primário", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="providencia"
        tiposPrimarios={["ciencia", "providencia", "anotacao"]}
      />,
    );
    // Antes: providencia ativo
    expect(screen.getByRole("button", { name: "Providência", pressed: true })).toBeInTheDocument();
    // Dispara key '1' no document — fora de input/textarea
    fireEvent.keyDown(document.body, { key: "1" });
    expect(screen.getByRole("button", { name: "Ciência", pressed: true })).toBeInTheDocument();
  });

  it("atalho NÃO dispara quando foco está no textarea", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia"]}
      />,
    );
    const textarea = screen.getByPlaceholderText(/o que aconteceu/i);
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "2" });
    // Continua em ciencia (não trocou para providencia)
    expect(screen.getByRole("button", { name: "Ciência", pressed: true })).toBeInTheDocument();
  });
});

describe("RegistroEditor — prazo (diligência)", () => {
  it("inclui prazo no payload quando tipo é diligência e Salvar é clicado", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        processoId={2}
        demandaId={3}
        tipoDefault="diligencia"
      />,
    );
    // Preenche conteúdo
    fireEvent.change(screen.getByPlaceholderText(/o que aconteceu/i), {
      target: { value: "Apresentar RA" },
    });
    // Preenche prazo — só existe para diligência
    fireEvent.change(screen.getByLabelText(/prazo/i), {
      target: { value: "2026-07-11" },
    });
    // Clica Salvar
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "diligencia", prazo: "2026-07-11" }),
    );
  });

  it("não mostra campo prazo quando tipo não é diligência", () => {
    render(<RegistroEditor assistidoId={1} tipoDefault="ciencia" />);
    expect(screen.queryByLabelText(/prazo/i)).not.toBeInTheDocument();
  });
});
