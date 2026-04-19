import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { lugares, participacoesLugar, lugaresAccessLog, lugaresDistinctsConfirmed } from "@/lib/db/schema";
import { users } from "@/lib/db/schema/core";
import { eq, and } from "drizzle-orm";
import { createCallerFactory } from "@/lib/trpc/init";
import { appRouter } from "@/lib/trpc/routers";
import { _setGeocoderForTests } from "@/lib/lugares/geocoder-instance";

const createCaller = createCallerFactory(appRouter);
const mkCtx = (user: any) => ({
  user,
  requestId: "test-" + Math.random(),
  selectedDefensorScopeId: null,
});

async function makeUser() {
  const [u] = await db
    .insert(users)
    .values({
      name: "Test Lugares",
      email: `lugares-${Date.now()}-${Math.random()}@test.local`,
      workspaceId: 1,
    } as any)
    .returning();
  return u;
}

describe("lugares.create + getById", { timeout: 30000 }, () => {
  it("cria + busca lugar com normalização", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const created = await caller.lugares.create({
        logradouro: "Rua das Palmeiras",
        numero: "123",
        bairro: "Centro",
        cidade: "Camaçari",
        uf: "BA",
        fonte: "manual",
      });
      expect(created.id).toBeGreaterThan(0);
      const got = await caller.lugares.getById({ id: created.id });
      expect(got?.logradouro).toBe("Rua das Palmeiras");
      expect(got?.enderecoNormalizado).toContain("rua das palmeiras");
      expect(got?.enderecoNormalizado).toContain("123");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, created.id));
      await db.delete(lugares).where(eq(lugares.id, created.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.update", { timeout: 30000 }, () => {
  it("update re-normaliza quando endereço muda", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({
        logradouro: "Rua A",
        numero: "10",
        fonte: "manual",
      });
      await caller.lugares.update({
        id: l.id,
        patch: { logradouro: "Rua B", numero: "20" },
      });
      const got = await caller.lugares.getById({ id: l.id });
      expect(got?.logradouro).toBe("Rua B");
      expect(got?.enderecoNormalizado).toContain("rua b");
      expect(got?.enderecoNormalizado).toContain("20");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.list + filters", { timeout: 30000 }, () => {
  it("list filtra por bairro", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({
        logradouro: "Rua X",
        bairro: "Centro",
        fonte: "manual",
      });
      const b = await caller.lugares.create({
        logradouro: "Rua Y",
        bairro: "Gravatá",
        fonte: "manual",
      });
      const result = await caller.lugares.list({
        bairro: "Centro",
        limit: 50,
        offset: 0,
      });
      const ids = result.items.map((it: any) => it.id);
      expect(ids).toContain(a.id);
      expect(ids).not.toContain(b.id);
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.delete", { timeout: 30000 }, () => {
  it("delete remove lugar sem participações", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({
        logradouro: "Rua Z",
        fonte: "manual",
      });
      const r = await caller.lugares.delete({ id: l.id });
      expect(r.deleted).toBe(true);
      const got = await caller.lugares.getById({ id: l.id });
      expect(got).toBeNull();
    } finally {
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.userId, user.id));
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares participações + busca", { timeout: 30000 }, () => {
  it("addParticipacao + getParticipacoesDoLugar", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua A", numero: "1", fonte: "manual" });
      await caller.lugares.addParticipacao({
        lugarId: l.id, processoId: null, pessoaId: null, tipo: "local-do-fato"
      });
      const parts = await caller.lugares.getParticipacoesDoLugar({ lugarId: l.id });
      expect(parts).toHaveLength(1);
      expect(parts[0].tipo).toBe("local-do-fato");
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, l.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("searchForAutocomplete encontra match", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua das Palmeiras", bairro: "Centro", fonte: "manual" });
      const results = await caller.lugares.searchForAutocomplete({ query: "palmeir", limit: 8 });
      expect(results.map((r: any) => r.id)).toContain(l.id);
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares merge-queue", { timeout: 30000 }, () => {
  it("listDuplicates detecta mesmo normalizado", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({ logradouro: "R. X", numero: "10", fonte: "manual" });
      const b = await caller.lugares.create({ logradouro: "Rua X", numero: "10", fonte: "manual" });
      const dupes = await caller.lugares.listDuplicates({ limit: 20, offset: 0 });
      const found = dupes.items.find((p: any) =>
        (p.aId === a.id && p.bId === b.id) || (p.aId === b.id && p.bId === a.id)
      );
      expect(found).toBeTruthy();
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, a.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, b.id));
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("merge move participações e marca merged_into", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const keep = await caller.lugares.create({ logradouro: "Rua A", numero: "1", fonte: "manual" });
      const dup = await caller.lugares.create({ logradouro: "Rua A dup", numero: "1", fonte: "manual" });
      await caller.lugares.addParticipacao({ lugarId: dup.id, tipo: "local-do-fato" });
      await caller.lugares.merge({ keepId: keep.id, mergeId: dup.id });
      const got = await caller.lugares.getById({ id: dup.id });
      expect(got?.mergedInto).toBe(keep.id);
      const parts = await caller.lugares.getParticipacoesDoLugar({ lugarId: keep.id });
      expect(parts.length).toBeGreaterThanOrEqual(1);
      await db.delete(participacoesLugar).where(eq(participacoesLugar.lugarId, keep.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, keep.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, dup.id));
      await db.delete(lugares).where(eq(lugares.id, dup.id));
      await db.delete(lugares).where(eq(lugares.id, keep.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("markDistinct impede re-aparecer em listDuplicates", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const a = await caller.lugares.create({ logradouro: "Rua Z", numero: "9", fonte: "manual" });
      const b = await caller.lugares.create({ logradouro: "R. Z", numero: "9", fonte: "manual" });
      await caller.lugares.markDistinct({ aId: a.id, bId: b.id });
      const dupes = await caller.lugares.listDuplicates({ limit: 50, offset: 0 });
      const found = dupes.items.find((p: any) =>
        (p.aId === a.id && p.bId === b.id) || (p.aId === b.id && p.bId === a.id)
      );
      expect(found).toBeUndefined();
      const lo = Math.min(a.id, b.id);
      const hi = Math.max(a.id, b.id);
      await db.delete(lugaresDistinctsConfirmed)
        .where(and(eq(lugaresDistinctsConfirmed.lugarAId, lo), eq(lugaresDistinctsConfirmed.lugarBId, hi)));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, a.id));
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, b.id));
      await db.delete(lugares).where(eq(lugares.id, a.id));
      await db.delete(lugares).where(eq(lugares.id, b.id));
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});

describe("lugares.geocode", { timeout: 30000 }, () => {
  it("geocode salva lat/lng", async () => {
    _setGeocoderForTests({
      async geocode() { return { latitude: -12.697, longitude: -38.324, source: "nominatim" }; },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua X", numero: "1", fonte: "manual" });
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.latitude).toBeCloseTo(-12.697);
      const got = await caller.lugares.getById({ id: l.id });
      expect(Number(got?.latitude)).toBeCloseTo(-12.697);
      expect(got?.geocodingSource).toBe("nominatim");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("geocode skip-if-exists sem force", async () => {
    _setGeocoderForTests({
      async geocode() { throw new Error("não deveria chamar"); },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Rua Y", fonte: "manual" });
      await caller.lugares.update({ id: l.id, patch: { latitude: -12, longitude: -38 } });
      // Simular lugar já geocodado
      await db.update(lugares).set({ geocodingSource: "manual", geocodedAt: new Date() })
        .where(eq(lugares.id, l.id));
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.source).toBe("manual");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("geocode falha grava geocoding_source=nominatim-fail", async () => {
    _setGeocoderForTests({
      async geocode() { return { source: "nominatim", failed: true }; },
    });
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const l = await caller.lugares.create({ logradouro: "Não existe", fonte: "manual" });
      const r = await caller.lugares.geocode({ id: l.id });
      expect(r.failed).toBe(true);
      const got = await caller.lugares.getById({ id: l.id });
      expect(got?.geocodingSource).toBe("nominatim-fail");
      await db.delete(lugaresAccessLog).where(eq(lugaresAccessLog.lugarId, l.id));
      await db.delete(lugares).where(eq(lugares.id, l.id));
    } finally {
      _setGeocoderForTests(null);
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
