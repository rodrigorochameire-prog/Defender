#!/usr/bin/env python3
"""
Corrige coordenadas de bairros costeiros no banco de dados.

Problema: o arquivo camacari_bairros_centroids.json tinha coordenadas erradas
para bairros da orla (erro de até 23km na latitude). Este script atualiza
todos os artigos radar_noticias com bairro costeiro para as coordenadas corretas.

Uso:
  cd enrichment-engine
  python3 scripts/fix_coastal_geocoding.py
"""

import os
import sys

# Adiciona o diretório pai ao path para importar serviços
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client

# Coordenadas corretas verificadas via OpenStreetMap/guiamapa.com
COASTAL_CORRECT = {
    "Arembepe":       (-12.7789, -38.1841),  # Praia de Arembepe (OSM/Mapcarta)
    "Monte Gordo":    (-12.6667, -38.1167),  # mapasamerica.dices.net
    "Guarajuba":      (-12.6509, -38.0834),  # guiamapa - Rodovia BA-099 via Guarajuba
    "Barra do Jacuípe": (-12.6439, -38.0926), # guiamapa - Rua J, Barra do Jacuípe
    "Barra de Pojuca": (-12.6432, -38.0846), # guiamapa - Acesso Pôr do Sol
    "Jauá":           (-12.8312, -38.2288),  # guiamapa - 2º Acesso Praia de Jauá
    "Vila Praiana":   (-12.7600, -38.1900),  # estimativa entre Jauá e Arembepe
    "Imbassaí":       (-12.5350, -37.9350),  # OSM (Mata de São João, limite Camaçari)
    "Itacimirim":     (-12.5060, -38.0100),  # estimativa norte de Barra de Pojuca
}

# Coordenadas antigas (erradas) — para logar quantos artigos foram afetados
COASTAL_OLD = {
    "Arembepe":         (-12.5707, -38.2042),
    "Monte Gordo":      (-12.5560, -38.2130),
    "Guarajuba":        (-12.5494, -38.2174),
    "Barra do Jacuípe": (-12.5466, -38.2106),
    "Barra de Pojuca":  (-12.5345, -38.2090),
    "Jauá":             (-12.5917, -38.2298),
    "Vila Praiana":     (-12.5820, -38.2150),
    "Imbassaí":         (-12.4800, -38.1950),
}


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos")
        sys.exit(1)

    supabase = create_client(url, key)
    total_updated = 0

    print("🔧 Corrigindo coordenadas de bairros costeiros...\n")

    for bairro, (new_lat, new_lon) in COASTAL_CORRECT.items():
        old = COASTAL_OLD.get(bairro)

        # Buscar todos os artigos deste bairro que têm coordenadas
        resp = (
            supabase.table("radar_noticias")
            .select("id, latitude, longitude")
            .eq("bairro", bairro)
            .not_.is_("latitude", "null")
            .execute()
        )
        articles = resp.data or []

        if not articles:
            print(f"  {bairro}: nenhum artigo geocodificado — pulando")
            continue

        # Atualizar todos para as coordenadas corretas
        update_resp = (
            supabase.table("radar_noticias")
            .update({"latitude": new_lat, "longitude": new_lon})
            .eq("bairro", bairro)
            .not_.is_("latitude", "null")
            .execute()
        )

        count = len(articles)
        total_updated += count
        old_str = f"({old[0]:.4f}, {old[1]:.4f})" if old else "(desconhecido)"
        print(f"  ✅ {bairro}: {count} artigos  {old_str} → ({new_lat:.4f}, {new_lon:.4f})")

    # Também resetar artigos sem coordenadas em bairros costeiros para re-geocoding
    print("\n🔄 Verificando artigos sem coordenadas em bairros costeiros...")
    for bairro in COASTAL_CORRECT:
        resp = (
            supabase.table("radar_noticias")
            .select("id", count="exact")
            .eq("bairro", bairro)
            .is_("latitude", "null")
            .execute()
        )
        count = resp.count or 0
        if count > 0:
            print(f"  ⚠️  {bairro}: {count} artigo(s) ainda sem coordenadas — execute geocode_batch")

    print(f"\n✅ Total atualizado: {total_updated} artigos")
    print("💡 Execute geocode_batch para geocodificar artigos novos/pendentes")


if __name__ == "__main__":
    main()
