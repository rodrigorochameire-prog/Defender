import { describe, it, expect } from "vitest";
import { toHistoryItems, relativeTime, type RawTaskRow } from "../task-history";

const NOW = new Date("2026-06-25T12:00:00Z").getTime();

function row(partial: Partial<RawTaskRow>): RawTaskRow {
  return {
    id: 1,
    skill: "juri",
    status: "completed",
    etapa: null,
    erro: null,
    resultado: null,
    createdAt: new Date("2026-06-25T11:58:00Z"),
    completedAt: new Date("2026-06-25T11:59:00Z"),
    ...partial,
  };
}

describe("relativeTime", () => {
  it("renders sub-minute as 'agora'", () => {
    expect(relativeTime(new Date(NOW - 30 * 1000), NOW)).toBe("agora");
  });
  it("renders minutes", () => {
    expect(relativeTime(new Date(NOW - 5 * 60 * 1000), NOW)).toBe("há 5 min");
  });
  it("renders hours", () => {
    expect(relativeTime(new Date(NOW - 3 * 3600 * 1000), NOW)).toBe("há 3 h");
  });
  it("renders days", () => {
    expect(relativeTime(new Date(NOW - 2 * 86400 * 1000), NOW)).toBe("há 2 d");
  });
  it("handles ISO string input", () => {
    expect(relativeTime(new Date(NOW - 60 * 1000).toISOString(), NOW)).toBe("há 1 min");
  });
  it("returns dash for null/invalid", () => {
    expect(relativeTime(null, NOW)).toBe("—");
    expect(relativeTime("not-a-date", NOW)).toBe("—");
  });
});

describe("toHistoryItems", () => {
  it("maps the catalog label from the skill slug (fallback to slug)", () => {
    const [item] = toHistoryItems([row({ skill: "juri" })], NOW);
    expect(item.skillLabel).toMatch(/júri/i);
    const [unknown] = toHistoryItems([row({ skill: "nao-existe" })], NOW);
    expect(unknown.skillLabel).toBe("nao-existe");
  });

  it("assigns status label + tone per status", () => {
    const map = (status: RawTaskRow["status"]) =>
      toHistoryItems([row({ status })], NOW)[0];
    expect(map("completed").tone).toBe("success");
    expect(map("failed").tone).toBe("danger");
    expect(map("processing").tone).toBe("running");
    expect(map("pending").tone).toBe("muted");
    expect(map("needs_review").tone).toBe("warning");
  });

  it("uses the error text as summary for failed tasks", () => {
    const [item] = toHistoryItems(
      [row({ status: "failed", erro: "claude -p exit 1" })],
      NOW,
    );
    expect(item.summary).toContain("exit 1");
  });

  it("extracts a short summary from a structured result object", () => {
    const [item] = toHistoryItems(
      [row({ status: "completed", resultado: { resumo: "Tese de nulidade viável" } })],
      NOW,
    );
    expect(item.summary).toBe("Tese de nulidade viável");
  });

  it("uses the stage as summary while processing", () => {
    const [item] = toHistoryItems(
      [row({ status: "processing", etapa: "Analisando teses...", completedAt: null })],
      NOW,
    );
    expect(item.summary).toBe("Analisando teses...");
  });

  it("preserves order and exposes a relative 'when'", () => {
    const items = toHistoryItems(
      [
        row({ id: 1, createdAt: new Date(NOW - 60 * 1000) }),
        row({ id: 2, createdAt: new Date(NOW - 2 * 3600 * 1000) }),
      ],
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual([1, 2]);
    expect(items[0].when).toBe("há 1 min");
    expect(items[1].when).toBe("há 2 h");
  });

  it("truncates very long summaries", () => {
    const long = "x".repeat(300);
    const [item] = toHistoryItems(
      [row({ status: "failed", erro: long })],
      NOW,
    );
    expect(item.summary.length).toBeLessThanOrEqual(160);
  });
});
