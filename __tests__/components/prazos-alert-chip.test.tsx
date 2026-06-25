// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PrazosAlertChip } from "@/components/shared/prazos-alert-chip";

afterEach(() => cleanup());

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    prazos: {
      estatisticasPrazos: { useQuery: (...a: unknown[]) => useQueryMock(...a) },
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe("PrazosAlertChip", () => {
  beforeEach(() => useQueryMock.mockReset());

  it("renders nothing when there is no urgency", () => {
    useQueryMock.mockReturnValue({ data: { vencidos: 0, vencendoHoje: 0, reuPresoVencido: 0 } });
    const { container } = render(<PrazosAlertChip />);
    expect(container.textContent).toBe("");
  });

  it("renders the urgent label when there are overdue/today deadlines", () => {
    useQueryMock.mockReturnValue({ data: { vencidos: 3, vencendoHoje: 2, reuPresoVencido: 0 } });
    render(<PrazosAlertChip />);
    expect(screen.getByText(/3 vencidos · 2 hoje/i)).toBeInTheDocument();
  });

  it("flags a jailed defendant with an overdue deadline", () => {
    useQueryMock.mockReturnValue({ data: { vencidos: 1, vencendoHoje: 0, reuPresoVencido: 1 } });
    render(<PrazosAlertChip />);
    expect(screen.getByText(/réu preso/i)).toBeInTheDocument();
  });

  it("links to the demandas list", () => {
    useQueryMock.mockReturnValue({ data: { vencidos: 1, vencendoHoje: 0 } });
    render(<PrazosAlertChip />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toMatch(/demandas/);
  });

  it("renders nothing while loading (no data yet)", () => {
    useQueryMock.mockReturnValue({ data: undefined });
    const { container } = render(<PrazosAlertChip />);
    expect(container.textContent).toBe("");
  });
});
