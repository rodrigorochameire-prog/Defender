import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SKILL_CATALOG } from "../catalog";

/**
 * Amarração catálogo ↔ daemon: todo slug exposto na UI tem de resolver a um
 * handler real do daemon — uma chave em SKILL_ALIASES.json ou um diretório de
 * skill em .claude/skills-cowork/. Sem isso, um botão na interface enfileiraria
 * uma task que o daemon não saberia executar.
 */
const COWORK_DIR = join(process.cwd(), ".claude", "skills-cowork");
const ALIASES_PATH = join(COWORK_DIR, "SKILL_ALIASES.json");

function loadResolvableSlugs(): Set<string> {
  const resolvable = new Set<string>();

  // Diretórios de skill (cada um é um slug válido direto).
  if (existsSync(COWORK_DIR)) {
    for (const entry of readdirSync(COWORK_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) resolvable.add(entry.name);
    }
  }

  // Aliases UI → diretório.
  if (existsSync(ALIASES_PATH)) {
    const aliases = JSON.parse(readFileSync(ALIASES_PATH, "utf8")) as Record<
      string,
      string
    >;
    for (const key of Object.keys(aliases)) {
      if (key.startsWith("_")) continue; // _comment etc.
      resolvable.add(key);
    }
  }

  return resolvable;
}

describe("catalog ↔ daemon integrity", () => {
  it("the cowork skills directory exists", () => {
    expect(existsSync(COWORK_DIR)).toBe(true);
  });

  it("every catalog slug resolves to a daemon handler (alias key or skill dir)", () => {
    const resolvable = loadResolvableSlugs();
    const orphans = SKILL_CATALOG.filter((s) => !resolvable.has(s.slug)).map(
      (s) => s.slug,
    );
    expect(
      orphans,
      `Slugs do catálogo sem handler no daemon: ${orphans.join(", ")}`,
    ).toEqual([]);
  });
});
