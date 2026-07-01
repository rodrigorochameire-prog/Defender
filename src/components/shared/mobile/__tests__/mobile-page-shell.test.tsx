// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-page-shell.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobilePageShell } from "@/components/shared/mobile/mobile-page-shell";

afterEach(cleanup);

describe("MobilePageShell", () => {
  it("renders children", () => {
    render(<MobilePageShell><p>conteúdo</p></MobilePageShell>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
  it("applies bottom-nav clearance only below md", () => {
    const { container } = render(<MobilePageShell>x</MobilePageShell>);
    expect(container.firstElementChild?.className).toContain("pb-20");
    expect(container.firstElementChild?.className).toContain("md:pb-0");
  });
  it("merges a custom className", () => {
    const { container } = render(<MobilePageShell className="bg-red-500">x</MobilePageShell>);
    expect(container.firstElementChild?.className).toContain("bg-red-500");
  });
});
