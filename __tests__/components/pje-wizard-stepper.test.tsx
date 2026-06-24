// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PjeWizardStepper, PJE_WIZARD_STEPS } from "@/components/demandas-premium/pje-wizard-stepper";

afterEach(() => cleanup());

describe("PjeWizardStepper", () => {
  it("renderiza os rótulos das 4 etapas", () => {
    render(<PjeWizardStepper current="configurar" />);
    for (const s of PJE_WIZARD_STEPS) {
      expect(screen.getByText(s.label)).toBeInTheDocument();
    }
  });

  it("marca a etapa atual com aria-current='step'", () => {
    render(<PjeWizardStepper current="revisar" />);
    const current = screen.getByText("Revisar").closest("li");
    expect(current?.getAttribute("aria-current")).toBe("step");
    // as outras não têm aria-current
    expect(screen.getByText("Concluído").closest("li")?.getAttribute("aria-current")).toBeNull();
  });

  it("etapas anteriores viram 'concluído' (check no lugar do número)", () => {
    render(<PjeWizardStepper current="revisar" />);
    // configurar (1) e colar (2) já passaram → não mostram número
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    // revisar (3, ativa) e resultado (4, futura) mostram número
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("na primeira etapa nenhuma está concluída (todos os números visíveis)", () => {
    render(<PjeWizardStepper current="configurar" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
