import { describe, it, expect } from "vitest";
import { defensorBadge, normalizeDefensor } from "../normalize-defensor";

describe("normalizeDefensor", () => {
  it("auxílio tem precedência sobre o nome do titular", () => {
    expect(normalizeDefensor("Rodrigo Rocha Meire (PEDIR AUXÍLIO)")).toBe("Grupo do Júri");
  });
  it("variantes de nome resolvem", () => {
    expect(normalizeDefensor("Dr. Rodrigo")).toBe("Dr. Rodrigo");
    expect(normalizeDefensor("juliane andrade")).toBe("Dra. Juliane");
    expect(normalizeDefensor(null)).toBeNull();
  });
});

describe("defensorBadge — classes prontas do selo", () => {
  it("Rodrigo e Juliane: círculo cheio com letra branca", () => {
    expect(defensorBadge("Rodrigo")?.badgeClass).toBe("bg-emerald-500 text-white");
    expect(defensorBadge("Juliane")?.badgeClass).toBe("bg-violet-500 text-white");
  });

  it("Grupo do Júri: círculo cheio cinza neutro (não compete com os titulares)", () => {
    const b = defensorBadge("Grupo do Júri");
    expect(b?.initial).toBe("G");
    expect(b?.badgeClass).toBe("bg-neutral-400 dark:bg-neutral-600 text-white");
  });
});
