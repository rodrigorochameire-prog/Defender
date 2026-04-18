// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { IntelDot } from "@/components/pessoas/intel-dot";

afterEach(() => cleanup());

describe("IntelDot", () => {
  it("não renderiza quando level=none", () => {
    const { container } = render(<IntelDot level="none" />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza subtle (neutral-300)", () => {
    const { container } = render(<IntelDot level="subtle" />);
    const el = container.firstElementChild;
    expect(el).toBeTruthy();
    expect(el?.className ?? "").toMatch(/neutral-300/);
  });

  it("renderiza normal (neutral-500)", () => {
    const { container } = render(<IntelDot level="normal" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/neutral-500/);
  });

  it("renderiza emerald", () => {
    const { container } = render(<IntelDot level="emerald" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("renderiza amber", () => {
    const { container } = render(<IntelDot level="amber" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/amber/);
  });

  it("renderiza red", () => {
    const { container } = render(<IntelDot level="red" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/rose-600/);
  });

  it("aria-label descritivo", () => {
    const { container } = render(<IntelDot level="amber" aria-label="Contradição" />);
    expect(container.firstElementChild?.getAttribute("aria-label")).toBe("Contradição");
  });
});
