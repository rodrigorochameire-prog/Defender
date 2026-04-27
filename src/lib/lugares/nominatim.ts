import type { Geocoder, GeocoderInput, GeocoderResult } from "./geocoder";

interface Opts {
  userAgent: string;
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
}

export class NominatimGeocoder implements Geocoder {
  private lastCall = 0;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;

  constructor(opts: Opts) {
    this.userAgent = opts.userAgent;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as any);
    this.minIntervalMs = opts.minIntervalMs ?? 1000;
  }

  async geocode(input: GeocoderInput): Promise<GeocoderResult> {
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCall = Date.now();

    const parts = [input.logradouro, input.numero, input.bairro, input.cidade, input.uf, "Brasil"]
      .filter((p) => p && String(p).trim())
      .join(", ");
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1&countrycodes=br`;

    try {
      const res = await this.fetchImpl(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      });
      if (!res.ok) return { source: "nominatim", failed: true };
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!Array.isArray(json) || json.length === 0) {
        return { source: "nominatim", failed: true };
      }
      const lat = Number(json[0].lat);
      const lng = Number(json[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { source: "nominatim", failed: true };
      }
      return { latitude: lat, longitude: lng, source: "nominatim" };
    } catch {
      return { source: "nominatim", failed: true };
    }
  }
}
