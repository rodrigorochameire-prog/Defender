// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { orderedCardIds, shiftRangeIds } from "../selection-range";

afterEach(() => {
  document.body.innerHTML = "";
});

const renderCards = (ids: string[]) => {
  document.body.innerHTML = ids
    .map((id) => `<div data-card-id="${id}">card ${id}</div>`)
    .join("");
};

describe("shiftRangeIds", () => {
  it("includes the card(s) between anchor and target — the Kanban bug", () => {
    // A, B, C on screen; shift-click from A to C must select B too.
    expect(shiftRangeIds(["A", "B", "C", "D"], "A", "C")).toEqual(["A", "B", "C"]);
  });

  it("is direction-agnostic (target before anchor)", () => {
    expect(shiftRangeIds(["A", "B", "C", "D"], "C", "A")).toEqual(["A", "B", "C"]);
  });

  it("returns a single id when anchor === target", () => {
    expect(shiftRangeIds(["A", "B", "C"], "B", "B")).toEqual(["B"]);
  });

  it("returns [] when an id is absent (caller falls back to toggle)", () => {
    expect(shiftRangeIds(["A", "B"], "A", "Z")).toEqual([]);
  });
});

describe("orderedCardIds", () => {
  it("reads the rendered DOM order, NOT the flat fallback (root cause)", () => {
    // The flat list (demandasOrdenadas) is in a different order than the Kanban
    // renders. The selection must follow the screen, so DOM order must win.
    renderCards(["c3", "c1", "c2"]);
    const flatFallback = ["c1", "c2", "c3"];
    expect(orderedCardIds(flatFallback)).toEqual(["c3", "c1", "c2"]);
  });

  it("falls back to the flat list when no cards are tagged (table/compact views)", () => {
    expect(orderedCardIds(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("end-to-end: range follows the visual order between two clicks", () => {
    // Screen order c3, c1, c2; flat list would have ordered them c1, c2, c3.
    // Shift-clicking the 1st and 3rd visible cards must catch the visible middle (c1).
    renderCards(["c3", "c1", "c2"]);
    const ordered = orderedCardIds(["c1", "c2", "c3"]);
    expect(shiftRangeIds(ordered, "c3", "c2")).toEqual(["c3", "c1", "c2"]);
  });
});
