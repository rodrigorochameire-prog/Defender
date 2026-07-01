// @vitest-environment happy-dom
// src/components/ui/__tests__/responsive-table.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

type Row = { id: string; nome: string; status: string };
const columns: Column<Row>[] = [
  { key: "nome", header: "Nome", cell: (r) => r.nome },
  { key: "status", header: "Status", cell: (r) => r.status },
];
const rows: Row[] = [
  { id: "1", nome: "João", status: "Ativo" },
  { id: "2", nome: "Maria", status: "Pendente" },
];

function renderTable() {
  return render(
    <ResponsiveTable columns={columns} rows={rows} getRowKey={(r) => r.id} />,
  );
}

describe("ResponsiveTable", () => {
  it("renders a <table> on desktop", () => {
    isMobile.mockReturnValue(false);
    const { container } = renderTable();
    expect(container.querySelector("table")).toBeTruthy();
    expect(screen.getByText("João")).toBeInTheDocument();
  });
  it("renders stacked cards (no <table>) on mobile", () => {
    isMobile.mockReturnValue(true);
    const { container } = renderTable();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.getByText("João")).toBeInTheDocument();
    // Card view shows the column header as a label:
    expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
  });
});
