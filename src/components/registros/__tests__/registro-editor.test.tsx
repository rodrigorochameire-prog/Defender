// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistroEditor } from "../registro-editor";

// tRPC client é stub via mock — não precisamos de provider real para
// asserts sobre rendering dos chips.
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ registros: { list: { invalidate: vi.fn() } } }),
    registros: {
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

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
        // todos os 12
        tiposPrimarios={[
          "atendimento", "diligencia", "anotacao", "ciencia", "providencia",
          "delegacao", "pesquisa", "elaboracao", "peticao",
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
