import { describe, it, expect, vi, beforeEach } from "vitest";
import { NominatimGeocoder } from "@/lib/lugares/nominatim";

describe("NominatimGeocoder", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("monta URL correta com User-Agent", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "-12.697", lon: "-38.324" }],
    }));
    const g = new NominatimGeocoder({ userAgent: "Test/1.0", fetchImpl: fetchMock as any, minIntervalMs: 0 });
    await g.geocode({ logradouro: "Rua X", numero: "123", bairro: "Centro", cidade: "Camaçari", uf: "BA" });
    const [url, opts] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toContain("nominatim.openstreetmap.org/search");
    expect(url).toContain("countrycodes=br");
    expect(url).toContain("format=json");
    expect(url).toContain("limit=1");
    expect(opts.headers["User-Agent"]).toBe("Test/1.0");
  });

  it("retorna lat/lng e source=nominatim em sucesso", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "-12.697", lon: "-38.324", display_name: "..." }],
    }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any, minIntervalMs: 0 });
    const r = await g.geocode({ logradouro: "Rua X", cidade: "Camaçari", uf: "BA" });
    expect(r.latitude).toBe(-12.697);
    expect(r.longitude).toBe(-38.324);
    expect(r.source).toBe("nominatim");
    expect(r.failed).toBeFalsy();
  });

  it("failed=true quando resultado vazio", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any, minIntervalMs: 0 });
    const r = await g.geocode({ logradouro: "Lugar que não existe", cidade: "X", uf: "BA" });
    expect(r.failed).toBe(true);
    expect(r.latitude).toBeUndefined();
  });

  it("failed=true em HTTP error", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any, minIntervalMs: 0 });
    const r = await g.geocode({ logradouro: "X", cidade: "Camaçari", uf: "BA" });
    expect(r.failed).toBe(true);
  });

  it("rate-limit: 2 chamadas seguidas respeitam minIntervalMs", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ lat: "0", lon: "0" }],
    }));
    const g = new NominatimGeocoder({ userAgent: "T", fetchImpl: fetchMock as any, minIntervalMs: 50 });
    const t0 = Date.now();
    await g.geocode({ cidade: "X", uf: "BA" });
    await g.geocode({ cidade: "Y", uf: "BA" });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });
});
