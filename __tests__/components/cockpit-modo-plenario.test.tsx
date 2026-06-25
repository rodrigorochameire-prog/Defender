// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  plenarioContainerClass,
  EntrarModoPlenarioButton,
  CockpitPlenarioBar,
} from "@/components/juri/cockpit/cockpit-plenario";

afterEach(() => cleanup());

describe("F2-A — modo plenário (overlay full-screen)", () => {
  // -- helper: container class toggle ---------------------------------------
  it("default (modo desligado) NÃO adiciona classes de overlay — chrome normal preservado", () => {
    const cls = plenarioContainerClass(false);
    expect(cls).toBe("");
    expect(cls).not.toContain("fixed");
    expect(cls).not.toContain("z-50");
  });

  it("ao ativar o modo, o container ganha as classes full-screen (fixed/inset-0/z-50)", () => {
    const cls = plenarioContainerClass(true);
    expect(cls).toContain("fixed");
    expect(cls).toContain("inset-0");
    expect(cls).toContain("z-50");
    expect(cls).toContain("overflow-auto");
    // respeita o tema — usa tokens, não força dark
    expect(cls).toContain("bg-background");
    expect(cls).not.toContain("dark");
  });

  // -- default render: opt-in trigger visível -------------------------------
  it("render padrão mostra o botão 'Entrar em modo plenário'", () => {
    const onEntrar = vi.fn();
    render(<EntrarModoPlenarioButton onEntrar={onEntrar} />);
    const btn = screen.getByRole("button", { name: /modo plenário/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onEntrar).toHaveBeenCalledTimes(1);
  });

  // -- barra mínima: sessão + cronômetro + Encerrar -------------------------
  it("barra mínima mostra nome da sessão, cronômetro e o botão Encerrar", () => {
    render(
      <CockpitPlenarioBar
        sessaoNome="Júri — José da Silva"
        cronometro={<span>12:34</span>}
        encerrarSlot={<button>Encerrar Sessão</button>}
        autoSalvo
        onSairModo={vi.fn()}
      />,
    );
    expect(screen.getByText("Júri — José da Silva")).toBeInTheDocument();
    expect(screen.getByText("12:34")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /encerrar sessão/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-salvo/i)).toBeInTheDocument();
  });

  // -- exit safety: "Sair do modo" NÃO encerra a sessão ---------------------
  it("'Sair do modo' chama apenas onSairModo e NÃO invoca o handler de encerrar", () => {
    const onSairModo = vi.fn();
    const onEncerrar = vi.fn();
    render(
      <CockpitPlenarioBar
        sessaoNome="Sessão X"
        cronometro={<span>00:00</span>}
        encerrarSlot={
          <button onClick={onEncerrar}>Encerrar Sessão</button>
        }
        onSairModo={onSairModo}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /sair do modo/i }));
    expect(onSairModo).toHaveBeenCalledTimes(1);
    expect(onEncerrar).not.toHaveBeenCalled();
  });
});
