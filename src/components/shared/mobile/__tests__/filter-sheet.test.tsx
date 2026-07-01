// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/filter-sheet.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FilterSheet } from "@/components/shared/mobile/filter-sheet";

afterEach(cleanup);

describe("FilterSheet", () => {
  it("opens the sheet and shows the filter body", () => {
    render(
      <FilterSheet triggerLabel="Filtros" activeCount={2}>
        <label>Status</label>
      </FilterSheet>,
    );
    // Badge shows active count on the trigger.
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Filtros/i }));
    expect(screen.getByText("Status")).toBeInTheDocument();
  });
});
