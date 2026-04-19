export interface GeocoderInput {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export interface GeocoderResult {
  latitude?: number;
  longitude?: number;
  source: "nominatim" | "manual" | "origem";
  failed?: boolean;
}

export interface Geocoder {
  geocode(input: GeocoderInput): Promise<GeocoderResult>;
}
