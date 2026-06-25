// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AudienciasHojeChip } from "@/components/shared/audiencias-hoje-chip";

afterEach(() => cleanup());

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: { audiencias: { proximas: { useQuery: (...a: unknown[]) => useQueryMock(...a) } } },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, title }: any) => (
    <a href={href} title={title}>{children}</a>
  ),
}));

function todayAt(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("AudienciasHojeChip", () => {
  beforeEach(() => useQueryMock.mockReset());

  it("renders nothing when there are no hearings today", () => {
    useQueryMock.mockReturnValue({ data: [] });
    const { container } = render(<AudienciasHojeChip />);
    expect(container.textContent).toBe("");
  });

  it("shows the count of today's hearings", () => {
    useQueryMock.mockReturnValue({
      data: [
        { id: 1, dataHora: todayAt(23), tipo: "AIJ", assistido: { nome: "Fulano" } },
        { id: 2, dataHora: todayAt(22), tipo: "CUSTODIA" },
      ],
    });
    render(<AudienciasHojeChip />);
    expect(screen.getByText(/2 hoje/i)).toBeInTheDocument();
  });

  it("links to the audiências page", () => {
    useQueryMock.mockReturnValue({ data: [{ id: 1, dataHora: todayAt(23), tipo: "AIJ" }] });
    render(<AudienciasHojeChip />);
    expect(screen.getByRole("link").getAttribute("href")).toMatch(/audiencias/);
  });

  it("renders nothing while loading (no data)", () => {
    useQueryMock.mockReturnValue({ data: undefined });
    const { container } = render(<AudienciasHojeChip />);
    expect(container.textContent).toBe("");
  });
});
