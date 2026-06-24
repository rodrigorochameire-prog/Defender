// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RedesignarDialog } from "../redesignar-dialog";

afterEach(() => cleanup());

const ctx = {
  tipoLabel: "AIJ",
  assistidoNome: "João da Silva",
  dataAtual: "2026-06-30",
  horaAtual: "14:00",
  prioridade: "REU_PRESO",
};

describe("RedesignarDialog", () => {
  it("exibe o contexto do evento no header quando fornecido", () => {
    render(
      <RedesignarDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending={false} contexto={ctx} />
    );
    expect(screen.getByText("AIJ")).toBeInTheDocument();
    expect(screen.getByText(/João da Silva/)).toBeInTheDocument();
    // Prioridade réu preso visível como sinal de consequência
    expect(screen.getByText("Réu preso")).toBeInTheDocument();
  });

  it("mantém o botão Redesignar desabilitado até data+hora válidas", () => {
    render(
      <RedesignarDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending={false} contexto={ctx} />
    );
    const btn = screen.getByRole("button", { name: /Redesignar/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Nova data/i), { target: { value: "2026-07-15" } });
    fireEvent.change(screen.getByLabelText(/Novo horário/i), { target: { value: "09:30" } });
    expect(btn).not.toBeDisabled();
  });

  it("mostra o resumo de → para após escolher nova data/hora", () => {
    render(
      <RedesignarDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending={false} contexto={ctx} />
    );
    fireEvent.change(screen.getByLabelText(/Nova data/i), { target: { value: "2026-07-15" } });
    fireEvent.change(screen.getByLabelText(/Novo horário/i), { target: { value: "09:30" } });
    // Resumo de → para: data atual formatada e nova data
    const resumo = screen.getByTestId("redesignar-resumo");
    expect(resumo).toHaveTextContent("30/06/2026");
    expect(resumo).toHaveTextContent("15/07/2026");
    expect(resumo).toHaveTextContent("09:30");
  });

  it("chama onConfirm com data, hora e motivo", () => {
    const onConfirm = vi.fn();
    render(
      <RedesignarDialog open onOpenChange={() => {}} onConfirm={onConfirm} isPending={false} contexto={ctx} />
    );
    fireEvent.change(screen.getByLabelText(/Nova data/i), { target: { value: "2026-07-15" } });
    fireEvent.change(screen.getByLabelText(/Novo horário/i), { target: { value: "09:30" } });
    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: "Ausência de testemunha" } });
    fireEvent.click(screen.getByRole("button", { name: /Redesignar/i }));
    expect(onConfirm).toHaveBeenCalledWith("2026-07-15", "09:30", "Ausência de testemunha");
  });

  it("degrada sem contexto (não quebra, sem header de identidade)", () => {
    render(<RedesignarDialog open onOpenChange={() => {}} onConfirm={() => {}} isPending={false} />);
    expect(screen.getByRole("heading", { name: "Redesignar audiência" })).toBeInTheDocument();
    expect(screen.queryByText("Réu preso")).toBeNull();
  });
});
