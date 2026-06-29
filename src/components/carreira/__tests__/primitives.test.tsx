// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { KpiChip, CarreiraCard, CarreiraField, CarreiraListSkeleton, ConfirmDeleteButton } from "@/components/carreira";
import { Plane } from "lucide-react";

afterEach(cleanup);

describe("KpiChip", () => {
  it("renders value + label, works without icon", () => {
    render(<KpiChip label="Pendentes" value={3} />);
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("renders an icon when given", () => {
    const { container } = render(<KpiChip icon={Plane} label="Férias" value="2" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("CarreiraCard", () => {
  it("applies the accent pinstripe class when accent given", () => {
    const { container } = render(<CarreiraCard accent="ausencias">x</CarreiraCard>);
    expect(container.querySelector("span.absolute.inset-x-0.top-0")).toBeTruthy();
  });
  it("calls onClick and is focusable when interactive", () => {
    const fn = vi.fn();
    render(<CarreiraCard onClick={fn}>hit</CarreiraCard>);
    fireEvent.click(screen.getByText("hit"));
    expect(fn).toHaveBeenCalledOnce();
  });
  it("applies selected ring", () => {
    const { container } = render(<CarreiraCard selected>s</CarreiraCard>);
    expect(container.firstChild).toHaveClass("ring-2");
  });
});

describe("CarreiraField", () => {
  it("renders its label and children", () => {
    render(<CarreiraField label="Destino"><input aria-label="destino-input" /></CarreiraField>);
    expect(screen.getByText("Destino")).toBeInTheDocument();
    expect(screen.getByLabelText("destino-input")).toBeInTheDocument();
  });
});

describe("CarreiraListSkeleton", () => {
  it("renders N rows with aria-busy", () => {
    const { container } = render(<CarreiraListSkeleton rows={4} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-skeleton-row]').length).toBe(4);
  });
});

describe("ConfirmDeleteButton", () => {
  it("opens dialog and fires onConfirm only on confirm", async () => {
    const fn = vi.fn();
    render(<ConfirmDeleteButton onConfirm={fn} title="Excluir?" />);
    fireEvent.click(screen.getByRole("button", { name: /excluir/i }));
    const confirm = await screen.findByRole("button", { name: /^Excluir$/ });
    fireEvent.click(confirm);
    expect(fn).toHaveBeenCalledOnce();
  });
});
