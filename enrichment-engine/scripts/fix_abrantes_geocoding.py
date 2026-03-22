#!/usr/bin/env python3
"""
Corrige geocodificação errada dos bairros do Distrito de Abrantes.

Nominatim retorna coordenadas 6-23km fora da posição real para esses bairros.
Este script substitui as coordenadas pelo centroide curado para registros
que estão > 3km do centroide correto.

Uso:
  cd enrichment-engine
  python3 scripts/fix_abrantes_geocoding.py [--dry-run]
"""

import os, sys, math, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

# Centroides curados (lat, lon) — levantados via GPS/satélite
CENTROIDS: dict[str, tuple[float, float]] = {
    "Abrantes":           (-12.652, -38.312),
    "Areias":             (-12.660, -38.290),
    "Buris de Abrantes":  (-12.656, -38.308),
    "Buri Satuba":        (-12.660, -38.320),
    "Canto do Sol":       (-12.644, -38.306),
    "Catu de Abrantes":   (-12.648, -38.300),
    "Coqueiro de Abrantes": (-12.645, -38.298),
    "Nova Abrantes":      (-12.643, -38.301),
    "Vila de Abrantes":   (-12.654, -38.310),
}

THRESHOLD_KM = 3.0  # Corrigir se estiver mais que 3km do centroide correto


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Mostrar sem atualizar")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌  Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    db = create_client(SUPABASE_URL, SUPABASE_KEY)

    total_fixed = 0
    total_skipped = 0

    for bairro, (correct_lat, correct_lon) in CENTROIDS.items():
        result = (
            db.table("radar_noticias")
            .select("id, bairro, latitude, longitude")
            .eq("bairro", bairro)
            .not_.is_("latitude", "null")
            .not_.is_("longitude", "null")
            .execute()
        )

        rows = result.data or []
        for row in rows:
            cur_lat = float(row["latitude"])
            cur_lon = float(row["longitude"])
            dist = haversine_km(cur_lat, cur_lon, correct_lat, correct_lon)

            if dist > THRESHOLD_KM:
                print(
                    f"{'[DRY]' if args.dry_run else '[FIX]'} id={row['id']} bairro='{bairro}' "
                    f"atual=({cur_lat:.4f},{cur_lon:.4f}) → correto=({correct_lat:.4f},{correct_lon:.4f}) "
                    f"erro={dist:.1f}km"
                )
                if not args.dry_run:
                    db.table("radar_noticias").update({
                        "latitude": correct_lat,
                        "longitude": correct_lon,
                    }).eq("id", row["id"]).execute()
                total_fixed += 1
            else:
                total_skipped += 1

    print(f"\n{'[DRY-RUN] ' if args.dry_run else ''}Corrigidos: {total_fixed} | Já corretos: {total_skipped}")


if __name__ == "__main__":
    main()
