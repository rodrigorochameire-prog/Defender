import { describe, it, expect } from "vitest";
import { wipHealth, WIP_LIMITS } from "../kanban-wip";

describe("wipHealth", () => {
  it("sem limite → sempre ok", () => {
    expect(wipHealth(999)).toBe("ok");
    expect(wipHealth(999, null)).toBe("ok");
    expect(wipHealth(999, undefined)).toBe("ok");
  });

  const limit = { warn: 15, danger: 25 };

  it("abaixo do aviso → ok", () => {
    expect(wipHealth(0, limit)).toBe("ok");
    expect(wipHealth(14, limit)).toBe("ok");
  });

  it("no aviso (inclusive) até antes do perigo → warn", () => {
    expect(wipHealth(15, limit)).toBe("warn");
    expect(wipHealth(24, limit)).toBe("warn");
  });

  it("no perigo (inclusive) em diante → danger", () => {
    expect(wipHealth(25, limit)).toBe("danger");
    expect(wipHealth(100, limit)).toBe("danger");
  });

  it("em_andamento tem limite configurado", () => {
    expect(WIP_LIMITS.em_andamento).toEqual({ warn: 15, danger: 25 });
    expect(wipHealth(30, WIP_LIMITS.em_andamento)).toBe("danger");
  });
});
