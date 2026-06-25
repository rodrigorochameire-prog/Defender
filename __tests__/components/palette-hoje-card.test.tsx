// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PaletteHojeCard } from "@/components/shared/palette-hoje-card";

afterEach(() => cleanup());

const useQueryMock = vi.fn();
const onSelectMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: { audiencias: { proximas: { useQuery: (...a: unknown[]) => useQueryMock(...a) } } },
}));

vi.mock("@/components/ui/command", () => ({
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="group" data-heading={heading}>{children}</div>
  ),
  CommandItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={() => onSelect?.()}>{children}</button>
  ),
}));

function todayAt(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("PaletteHojeCard", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    onSelectMock.mockReset();
  });

  it("renders nothing when there are no hearings today", () => {
    useQueryMock.mockReturnValue({ data: [] });
    const { container } = render(<PaletteHojeCard onSelect={onSelectMock} />);
    expect(container.textContent).toBe("");
  });

  it("lists today's hearings and navigates to the processo on select", () => {
    useQueryMock.mockReturnValue({
      data: [
        { id: 1, dataHora: todayAt(23), tipo: "AIJ", assistido: { nome: "Fulano" }, processo: { id: 99 } },
      ],
    });
    render(<PaletteHojeCard onSelect={onSelectMock} />);
    const item = screen.getByRole("button", { name: /AIJ/i });
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(onSelectMock).toHaveBeenCalledWith(99);
  });

  it("does not call onSelect with a missing processo", () => {
    useQueryMock.mockReturnValue({
      data: [{ id: 2, dataHora: todayAt(23), tipo: "CUSTODIA", processo: null }],
    });
    render(<PaletteHojeCard onSelect={onSelectMock} />);
    fireEvent.click(screen.getByRole("button", { name: /CUSTODIA/i }));
    expect(onSelectMock).not.toHaveBeenCalled();
  });
});
