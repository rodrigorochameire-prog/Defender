// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DepoenteCardV2 } from "@/components/agenda/sheet/depoente-card-v2";

afterEach(() => cleanup());

const noop = () => {};
const baseDep = {
  id: 1,
  nome: "João Silva",
  tipo: "ACUSACAO" as const,
  status: "ARROLADA" as const,
  lado: "acusacao",
};

const handlers = {
  onMarcarOuvido: noop,
  onRedesignar: noop,
  onAdicionarPergunta: noop,
  onAbrirAudio: noop,
};

describe("DepoenteCardV2 (aberto)", () => {
  const depoenteRico = {
    ...baseDep,
    versaoDelegacia: "Negou os fatos na delegacia",
    versaoJuizo: "Admitiu parcialmente em juízo",
  };

  it("mostra síntese delegacia e juízo quando aberto", () => {
    render(
      <DepoenteCardV2 depoente={depoenteRico} isOpen={true} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(screen.getAllByText(/delegacia/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/negou os fatos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/juízo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/admitiu parcialmente/i)).toBeInTheDocument();
  });

  it("mostra 'vazio' quando síntese ausente", () => {
    render(
      <DepoenteCardV2 depoente={baseDep} isOpen={true} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(screen.getAllByText(/vazio/i).length).toBeGreaterThan(0);
  });

  it("chama onMarcarOuvido quando clicar no botão", () => {
    const onMarcarOuvido = vi.fn();
    render(
      <DepoenteCardV2
        depoente={baseDep}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
        onMarcarOuvido={onMarcarOuvido}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /marcar ouvid/i }));
    expect(onMarcarOuvido).toHaveBeenCalledWith(1, undefined);
  });

  it("chama onRedesignar", () => {
    const onRedesignar = vi.fn();
    render(
      <DepoenteCardV2
        depoente={baseDep}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
        onRedesignar={onRedesignar}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /redesignar/i }));
    expect(onRedesignar).toHaveBeenCalledWith(1);
  });

  it("mostra botão áudio apenas quando audioDriveFileId presente", () => {
    const { rerender } = render(
      <DepoenteCardV2 depoente={baseDep} isOpen onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(screen.queryByRole("button", { name: /áudio/i })).toBeNull();
    rerender(
      <DepoenteCardV2
        depoente={{ ...baseDep, audioDriveFileId: "abc" }}
        isOpen
        onToggle={noop}
        variant="sheet"
        {...handlers}
      />
    );
    expect(screen.getByRole("button", { name: /áudio/i })).toBeInTheDocument();
  });
});

describe("DepoenteCardV2 (fechado)", () => {
  it("mostra nome e qualidade", () => {
    render(
      <DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText(/acusação/i)).toBeInTheDocument();
  });

  it("border-left rose para acusação", () => {
    const { container } = render(
      <DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(container.querySelector('[data-lado="acusacao"]')?.className).toMatch(/border-l-rose/);
  });

  it("border-left emerald para defesa", () => {
    const dep = { ...baseDep, tipo: "DEFESA" as const, lado: "defesa" };
    const { container } = render(
      <DepoenteCardV2 depoente={dep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />
    );
    expect(container.querySelector('[data-lado="defesa"]')?.className).toMatch(/border-l-emerald/);
  });

  it("badge de status OUVIDA aparece", () => {
    const dep = { ...baseDep, status: "OUVIDA" as const };
    render(<DepoenteCardV2 depoente={dep} isOpen={false} onToggle={noop} variant="sheet" {...handlers} />);
    expect(screen.getByText(/ouvid/i)).toBeInTheDocument();
  });

  it("chama onToggle ao clicar no header", () => {
    const onToggle = vi.fn();
    render(
      <DepoenteCardV2 depoente={baseDep} isOpen={false} onToggle={onToggle} variant="sheet" {...handlers} />
    );
    fireEvent.click(screen.getByRole("button", { name: /joão silva/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
