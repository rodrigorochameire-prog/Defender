import { describe, it, expect } from "vitest";
import {
  ZOMBIE_TIMEOUT_MS,
  toEpoch,
  isZombie,
  activeBlockers,
  selectZombieIds,
} from "../task-lifecycle.mjs";

// Âncora temporal fixa (determinística — sem Date.now()).
const NOW = new Date("2026-06-21T12:00:00.000Z").getTime();
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("toEpoch", () => {
  it("converte ISO string, Date e null", () => {
    expect(toEpoch("2026-06-21T12:00:00.000Z")).toBe(NOW);
    expect(toEpoch(new Date(NOW))).toBe(NOW);
    expect(toEpoch(null)).toBeNull();
    expect(toEpoch(undefined)).toBeNull();
    expect(toEpoch("não-é-data")).toBeNull();
  });
});

describe("isZombie", () => {
  it("tarefa pending nunca é zumbi, por mais antiga que seja", () => {
    const task = { id: 1, status: "pending", createdAt: minsAgo(600) };
    expect(isZombie(task, NOW)).toBe(false);
  });

  it("processing recente (dentro do timeout) não é zumbi", () => {
    const task = { id: 2, status: "processing", startedAt: minsAgo(5) };
    expect(isZombie(task, NOW)).toBe(false);
  });

  it("processing além do timeout é zumbi", () => {
    const task = { id: 3, status: "processing", startedAt: minsAgo(20) };
    expect(isZombie(task, NOW)).toBe(true);
  });

  it("usa createdAt como fallback quando startedAt é nulo", () => {
    const recente = { id: 4, status: "processing", startedAt: null, createdAt: minsAgo(5) };
    const antiga = { id: 5, status: "processing", startedAt: null, createdAt: minsAgo(20) };
    expect(isZombie(recente, NOW)).toBe(false);
    expect(isZombie(antiga, NOW)).toBe(true);
  });

  it("sem nenhuma data datável, é conservador (não-zumbi)", () => {
    const task = { id: 6, status: "processing", startedAt: null, createdAt: null };
    expect(isZombie(task, NOW)).toBe(false);
  });

  it("respeita timeout customizado", () => {
    const task = { id: 7, status: "processing", startedAt: minsAgo(3) };
    expect(isZombie(task, NOW, 2 * 60_000)).toBe(true);
    expect(isZombie(task, NOW, 10 * 60_000)).toBe(false);
  });

  it("completed/failed não são zumbis", () => {
    expect(isZombie({ id: 8, status: "completed", startedAt: minsAgo(600) }, NOW)).toBe(false);
    expect(isZombie({ id: 9, status: "failed", startedAt: minsAgo(600) }, NOW)).toBe(false);
  });

  it("exatamente no limite não é zumbi (estritamente maior)", () => {
    const task = { id: 10, status: "processing", startedAt: new Date(NOW - ZOMBIE_TIMEOUT_MS).toISOString() };
    expect(isZombie(task, NOW)).toBe(false);
  });
});

describe("activeBlockers / selectZombieIds", () => {
  const tasks = [
    { id: 1, status: "pending", createdAt: minsAgo(2) }, // bloqueia (na fila)
    { id: 2, status: "processing", startedAt: minsAgo(5) }, // bloqueia (vivo)
    { id: 3, status: "processing", startedAt: minsAgo(30) }, // zumbi
    { id: 4, status: "processing", startedAt: null, createdAt: minsAgo(40) }, // zumbi (fallback)
  ];

  it("activeBlockers retorna só os que ainda bloqueiam", () => {
    expect(activeBlockers(tasks, NOW).map((t) => t.id)).toEqual([1, 2]);
  });

  it("selectZombieIds retorna só os zumbis", () => {
    expect(selectZombieIds(tasks, NOW)).toEqual([3, 4]);
  });

  it("partição é completa e disjunta", () => {
    const blockers = activeBlockers(tasks, NOW).map((t) => t.id);
    const zombies = selectZombieIds(tasks, NOW);
    expect([...blockers, ...zombies].sort()).toEqual([1, 2, 3, 4]);
    expect(blockers.filter((id) => zombies.includes(id))).toEqual([]);
  });

  it("lista vazia → sem bloqueadores e sem zumbis", () => {
    expect(activeBlockers([], NOW)).toEqual([]);
    expect(selectZombieIds([], NOW)).toEqual([]);
  });
});
