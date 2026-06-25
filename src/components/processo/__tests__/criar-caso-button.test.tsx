// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CriarCasoButton } from "../criar-caso-button";

afterEach(() => cleanup());

describe("CriarCasoButton", () => {
  it("renderiza o label padrão e dispara onCriar no clique", () => {
    const onCriar = vi.fn();
    render(<CriarCasoButton onCriar={onCriar} />);
    const btn = screen.getByRole("button", { name: /Criar caso/ });
    fireEvent.click(btn);
    expect(onCriar).toHaveBeenCalledTimes(1);
  });

  it("aceita label customizado", () => {
    render(<CriarCasoButton onCriar={vi.fn()} label="Criar caso deste processo" />);
    expect(screen.getByRole("button", { name: "Criar caso deste processo" })).toBeInTheDocument();
  });

  it("desabilita e não dispara quando isPending", () => {
    const onCriar = vi.fn();
    render(<CriarCasoButton onCriar={onCriar} isPending />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onCriar).not.toHaveBeenCalled();
  });

  it("respeita disabled", () => {
    render(<CriarCasoButton onCriar={vi.fn()} disabled />);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
