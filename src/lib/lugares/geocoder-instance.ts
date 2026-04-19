import { NominatimGeocoder } from "./nominatim";
import type { Geocoder } from "./geocoder";

let _instance: Geocoder | null = null;

export function getGeocoder(): Geocoder {
  if (_instance) return _instance;
  _instance = new NominatimGeocoder({
    userAgent: "OMBUDS-Defender/1.0 (rodrigorochameire@gmail.com)",
  });
  return _instance;
}

// Apenas pra testes
export function _setGeocoderForTests(g: Geocoder | null) {
  _instance = g;
}
