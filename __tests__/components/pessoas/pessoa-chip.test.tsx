// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PessoaChip } from "@/components/pessoas/pessoa-chip";

afterEach(() => cleanup());

describe("PessoaChip (silencioso — Fase I-A)", () => {
  it("renderiza nome passado direto", () => {
    render(<PessoaChip nome="Maria Silva" />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("renderiza ícone de pessoa", () => {
    const { container } = render(<PessoaChip nome="João" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("mostra papel quando fornecido", () => {
    render(<PessoaChip nome="Maria" papel="testemunha" />);
    expect(screen.getByText(/testemunha/i)).toBeInTheDocument();
  });

  it("chama onClick quando clicável", () => {
    const onClick = vi.fn();
    render(<PessoaChip nome="X" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("não é clicável quando clickable=false", () => {
    render(<PessoaChip nome="Y" clickable={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("aplica cor indigo para papéis policiais", () => {
    const { container } = render(<PessoaChip nome="PM João" papel="policial-militar" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/indigo/);
  });

  it("aplica cor emerald para testemunha", () => {
    const { container } = render(<PessoaChip nome="X" papel="testemunha" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });
});

describe("PessoaChip v2 (I-B)", () => {
  it("renderiza dot quando dotLevel !== none", () => {
    const { container } = render(
      <PessoaChip nome="Maria" dotLevel="normal" />
    );
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it("não renderiza dot quando dotLevel=none", () => {
    const { container } = render(
      <PessoaChip nome="João" dotLevel="none" />
    );
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it("mostra '?' quando ambiguityMark=true", () => {
    render(<PessoaChip nome="Comum" ambiguityMark />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("showDot=false não renderiza dot mesmo com level", () => {
    const { container } = render(
      <PessoaChip nome="X" dotLevel="normal" showDot={false} />
    );
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
