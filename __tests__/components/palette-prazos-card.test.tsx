// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PalettePrazosCard } from "@/components/shared/palette-prazos-card";

afterEach(() => cleanup());

const useQueryMock = vi.fn();
const onSelectMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: { prazos: { prazosCriticos: { useQuery: (...a: unknown[]) => useQueryMock(...a) } } },
}));

vi.mock("@/components/ui/command", () => ({
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid="group" data-heading={heading}>{children}</div>
  ),
  CommandItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={() => onSelect?.()}>{children}</button>
  ),
}));

const row = (id: number, urgencia: string, dias: number) => ({
  demanda: { id, ato: `Ato ${id}` },
  assistido: { nome: `Assistido ${id}` },
  processo: { id: id * 10 },
  diasRestantes: dias,
  urgencia,
});

describe("PalettePrazosCard", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    onSelectMock.mockReset();
  });

  it("renders nothing without urgent prazos", () => {
    useQueryMock.mockReturnValue({ data: [row(1, "ATENCAO", 4)] });
    const { container } = render(<PalettePrazosCard onSelect={onSelectMock} />);
    expect(container.textContent).toBe("");
  });

  it("lists overdue prazos and navigates to the processo on select", () => {
    useQueryMock.mockReturnValue({ data: [row(1, "VENCIDO", -3)] });
    render(<PalettePrazosCard onSelect={onSelectMock} />);
    const item = screen.getByRole("button", { name: /Ato 1/i });
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(onSelectMock).toHaveBeenCalledWith(10);
  });

  it("renders nothing while loading (no data)", () => {
    useQueryMock.mockReturnValue({ data: undefined });
    const { container } = render(<PalettePrazosCard onSelect={onSelectMock} />);
    expect(container.textContent).toBe("");
  });
});
