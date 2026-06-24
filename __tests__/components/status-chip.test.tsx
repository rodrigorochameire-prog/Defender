// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { StatusChip } from "@/components/demandas-premium/StatusChip";
import { getStatusConfig } from "@/config/demanda-status";

afterEach(() => cleanup());

// Usa um status real qualquer; a fonte da verdade do rótulo é getStatusConfig.
const SAMPLE = "em_andamento";
const expectedLabel = getStatusConfig(SAMPLE).label;

describe("StatusChip", () => {
  it("renderiza o rótulo vindo de getStatusConfig", () => {
    render(<StatusChip status={SAMPLE} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("status nulo cai no fallback 'Pendente' sem quebrar", () => {
    render(<StatusChip status={null} />);
    expect(screen.getByText(getStatusConfig(null).label)).toBeInTheDocument();
  });

  it("sem onClick: renderiza como <span>, não como botão", () => {
    render(<StatusChip status={SAMPLE} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("com onClick: vira <button> e dispara o handler", () => {
    const onClick = vi.fn();
    render(<StatusChip status={SAMPLE} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: `Status: ${expectedLabel}` });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aceita label override (fidelidade do substatus)", () => {
    render(<StatusChip status={SAMPLE} label="2 - Elaborar" />);
    expect(screen.getByText("2 - Elaborar")).toBeInTheDocument();
    expect(screen.queryByText(expectedLabel)).not.toBeInTheDocument();
  });

  it("showIcon renderiza o ícone do status", () => {
    const { container } = render(<StatusChip status={SAMPLE} showIcon />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("encaminha ref e data-status-trigger no botão (ancoragem de dropdown)", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<StatusChip status={SAMPLE} onClick={() => {}} ref={ref} data-status-trigger />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.getAttribute("data-status-trigger")).toBe("true");
  });

  it("aplica estilo semântico (tint de fundo + cor do status)", () => {
    const { color } = getStatusConfig(SAMPLE);
    // variante interativa: o elemento externo é o <button> (tem o style semântico)
    render(<StatusChip status={SAMPLE} onClick={() => {}} />);
    const el = screen.getByRole("button");
    expect(el.style.color).toBeTruthy();
    expect(el.style.backgroundColor).toContain("rgba");
    expect(el.style.border).toContain("rgba");
    expect(color).toBeTruthy();
  });
});
