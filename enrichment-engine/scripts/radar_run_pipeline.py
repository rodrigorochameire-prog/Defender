#!/usr/bin/env python3
"""
Radar Criminal — Script standalone para rodar o pipeline completo.
Executa: Scrape → Salvar → Extração Gemini → Geocoding → Matching
Pode rodar localmente sem FastAPI.

Requer Python 3.10+ (usa dict | None, match/case).
O venv do enrichment-engine usa Python 3.12.

Usage:
  # Usar o Python do venv:
  .venv/bin/python scripts/radar_run_pipeline.py --scrape
  .venv/bin/python scripts/radar_run_pipeline.py --extract
  .venv/bin/python scripts/radar_run_pipeline.py --geocode
  .venv/bin/python scripts/radar_run_pipeline.py --match
  .venv/bin/python scripts/radar_run_pipeline.py --all
"""

import asyncio
import json
import os
import sys
import re
from datetime import datetime, timezone
from typing import Optional, Dict, List, Tuple, Any
from urllib.parse import urljoin
from pathlib import Path

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from bs4 import BeautifulSoup

# ===================================================
# CONFIG — load from .env.local or environment
# ===================================================

def load_env():
    """Load env vars from .env.local and enrichment-engine/.env."""
    env_files = [
        Path(__file__).parent.parent.parent / ".env.local",   # project root
        Path(__file__).parent.parent / ".env",                  # enrichment-engine/
    ]
    for env_file in env_files:
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    val = val.strip().strip('"').strip("'")
                    if key.strip() not in os.environ:
                        os.environ[key.strip()] = val

load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# ===================================================
# KEYWORDS for police news detection
# ===================================================

KEYWORDS = [
    "homicídio", "homicidio", "assassinato", "assassinado", "morto a tiros",
    "baleado", "esfaqueado", "tentativa de homicídio",
    "tráfico", "trafico", "drogas", "entorpecentes", "cocaína", "maconha", "crack",
    "roubo", "roubado", "assalto", "assaltante", "latrocínio",
    "furto", "furtado", "arrombamento",
    "violência doméstica", "violencia domestica", "maria da penha", "agredida",
    "estupro", "abuso sexual", "importunação sexual",
    "lesão corporal", "lesao corporal", "agredido", "agressão",
    "arma de fogo", "revólver", "pistola", "porte ilegal",
    "estelionato", "golpe", "fraude",
    "preso", "detido", "flagrante", "mandado de prisão", "operação policial",
    "delegacia", "polícia", "ocorrência",
]

CAMAÇARI_KEYWORDS = [
    "camaçari", "camacari", "dias d'ávila", "dias d'avila", "dias davila",
    "lauro de freitas", "simões filho", "simoes filho",
    "candeias", "mata de são joão", "pojuca",
    "abrantes", "vila de abrantes", "monte gordo", "guarajuba", "jauá",
    "phoc", "gleba", "lama preta", "nova vitória", "nova vitoria",
    "ponto certo", "parque verde", "inocoop",
]

def is_police_news(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in KEYWORDS)

def is_camacari_region(title: str, body: str = "") -> bool:
    """Check if news is related to Camaçari region."""
    text = (title + " " + body).lower()
    return any(kw in text for kw in CAMAÇARI_KEYWORDS)

# ===================================================
# DB Helper using supabase-py
# ===================================================

_supabase_client = None

def get_db():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


# ===================================================
# STEP 1: SCRAPE
# ===================================================

async def scrape_all():
    """Scrape all active sources and save to DB."""
    db = get_db()

    # Get active sources
    fontes = db.table("radar_fontes").select("*").eq("ativo", True).execute().data or []
    print(f"\n📡 {len(fontes)} fontes ativas")

    # Get existing URLs for dedup
    existing = db.table("radar_noticias").select("url").execute().data or []
    existing_urls = {r["url"] for r in existing}
    print(f"📋 {len(existing_urls)} URLs já no banco")

    all_articles = []

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        for fonte in fontes:
            nome = fonte["nome"]
            base_url = fonte["url"].rstrip("/")
            print(f"\n🔍 Scraping: {nome} ({base_url})")

            # Get search paths based on domain
            paths = _get_paths(base_url)
            articles = []

            for path in paths:
                page_url = f"{base_url}{path}"
                try:
                    r = await client.get(page_url, headers={
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                    })
                    if r.status_code != 200:
                        continue

                    soup = BeautifulSoup(r.text, "html.parser")
                    links = _extract_links(soup, str(r.url))

                    for href, title in links:
                        if href in existing_urls:
                            continue
                        if not is_police_news(title):
                            continue

                        # Scrape article content
                        try:
                            article = await _scrape_article(client, href, nome, fonte["id"])
                            if article:
                                # Prioritize Camaçari region news
                                body = article.get("corpo", "")
                                article["is_camacari"] = is_camacari_region(title, body)
                                articles.append(article)
                                existing_urls.add(href)
                        except Exception as e:
                            continue

                except Exception:
                    continue

            print(f"   ✓ {len(articles)} artigos coletados")
            all_articles.extend(articles)

            # Update ultima_coleta
            db.table("radar_fontes").update({
                "ultima_coleta": datetime.now(timezone.utc).isoformat()
            }).eq("id", fonte["id"]).execute()

    # Save to DB — prioritize Camaçari region
    saved = 0
    # Sort: Camaçari first
    all_articles.sort(key=lambda a: (not a.get("is_camacari", False)))

    for article in all_articles:
        try:
            article.pop("is_camacari", None)
            db.table("radar_noticias").upsert(article, on_conflict="url").execute()
            saved += 1
        except Exception as e:
            print(f"   ⚠ Erro salvando: {str(e)[:80]}")

    print(f"\n✅ SCRAPE COMPLETO: {len(all_articles)} coletados, {saved} salvos")
    return saved


def _get_paths(base_url: str) -> list[str]:
    """URL-specific paths for police news sections."""
    u = base_url.lower()
    if "cn1.com.br" in u:
        return ["/", "/noticias/3"]  # cn1 category 3 = policia
    elif "blogdovalente" in u:
        return ["/", "/category/policia", "/category/cidades"]
    elif "jornalgrandebahia" in u:
        return ["/", "/municipios", "/seguranca-publica"]
    elif "jornalcamacari" in u:
        return ["/", "/categoria/policia", "/policia"]
    elif "bahianoticias" in u:
        return ["/", "/municipios", "/seguranca-publica"]
    elif "atarde" in u:
        return ["/bahia", "/policia", "/bahia/policia"]
    elif "correio24horas" in u:
        return ["/", "/minha-bahia", "/policia"]
    elif "g1.globo.com" in u:
        return ["/", "/ba/bahia/noticia"]
    elif "bnews" in u:
        return ["/", "/noticias/policia", "/noticias/cidades"]
    return ["/"]


def _extract_links(soup: BeautifulSoup, base_url: str) -> list[tuple[str, str]]:
    """Extract article links from page."""
    links = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        title = a.get_text(strip=True)

        if not href or not title or len(title) < 25:
            continue

        url = urljoin(base_url, href)

        if any(skip in url for skip in [
            "/author/", "/tag/", "/page/", "#", "javascript:",
            "mailto:", ".pdf", ".jpg", ".png", "/wp-admin", "/login", "/feed"
        ]):
            continue

        if url in seen:
            continue
        seen.add(url)
        links.append((url, title))

    return links[:60]


async def _scrape_article(client: httpx.AsyncClient, url: str, fonte: str, fonte_id: int) -> dict | None:
    """Scrape individual article content."""
    r = await client.get(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    })
    if r.status_code != 200:
        return None

    soup = BeautifulSoup(r.text, "html.parser")

    titulo = _extract_title(soup)
    if not titulo:
        return None

    corpo = _extract_body(soup)
    if not corpo or len(corpo) < 80:
        return None

    data_pub = _extract_date(soup)
    imagem = _extract_image(soup, url)

    return {
        "url": url,
        "fonte": fonte,
        "titulo": titulo[:500],
        "corpo": corpo[:50000],
        "data_publicacao": data_pub,
        "imagem_url": imagem,
        "enrichment_status": "pending",
        "raw_html": r.text[:200000],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _extract_title(soup: BeautifulSoup) -> str | None:
    h1 = soup.find("h1")
    if h1:
        t = h1.get_text(strip=True)
        if len(t) > 10:
            return t
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].strip()
    return None

def _extract_body(soup: BeautifulSoup) -> str | None:
    for sel in [
        "article .entry-content", ".entry-content", ".post-content",
        ".article-content", ".article-body", ".materia-texto",
        ".texto-materia", "article", '[itemprop="articleBody"]',
        ".content-text", ".news-body", ".td-post-content",
    ]:
        elem = soup.select_one(sel)
        if elem:
            for tag in elem.find_all(["script", "style", "iframe", "nav", "footer", "aside"]):
                tag.decompose()
            text = elem.get_text(separator="\n", strip=True)
            if len(text) > 80:
                return text

    container = soup.find("main") or soup.find("article") or soup.find("body")
    if container:
        paras = container.find_all("p")
        text = "\n".join(p.get_text(strip=True) for p in paras if len(p.get_text(strip=True)) > 20)
        if len(text) > 80:
            return text
    return None

def _extract_date(soup: BeautifulSoup) -> str | None:
    for prop in ["article:published_time", "datePublished", "pubdate"]:
        meta = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if meta and meta.get("content"):
            return meta["content"]

    time_tag = soup.find("time", datetime=True)
    if time_tag:
        return time_tag["datetime"]

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                d = data.get("datePublished") or data.get("dateCreated")
                if d: return d
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        d = item.get("datePublished")
                        if d: return d
        except: pass
    return None

def _extract_image(soup: BeautifulSoup, base_url: str) -> str | None:
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return og["content"]
    return None


# ===================================================
# STEP 2: EXTRACT (Gemini Flash)
# ===================================================

EXTRACTION_PROMPT = """Você é um extrator de dados especializado em notícias policiais da região de Camaçari/BA.

Extraia do texto abaixo as seguintes informações em JSON:

{
  "tipo_crime": "homicidio|tentativa_homicidio|trafico|roubo|furto|violencia_domestica|sexual|lesao_corporal|porte_arma|estelionato|outros",
  "bairro": "nome do bairro (null se não mencionado)",
  "logradouro": "rua/local específico (null se não mencionado)",
  "delegacia": "delegacia mencionada (null)",
  "circunstancia": "flagrante|mandado|denuncia|operacao|investigacao|julgamento|null",
  "artigos_penais": ["art. 121 CP"],
  "arma_meio": "arma de fogo|arma branca|null",
  "data_fato": "YYYY-MM-DD ou null",
  "resumo": "Resumo de 2-3 frases objetivas",
  "envolvidos": [
    {"nome": "NOME COMPLETO", "papel": "suspeito|vitima|preso|acusado", "idade": null, "vulgo": null, "sexo": "M|F|null"}
  ]
}

REGRAS:
1. Nomes em MAIÚSCULAS e completos
2. tipo_crime: categoria mais específica e GRAVE
3. Resumo factual, sem sensacionalismo
4. Se não conseguir extrair, use null
5. Responda APENAS com JSON válido, sem markdown"""

async def extract_batch(limit: int = 30):
    """Extract structured data from pending news using Gemini Flash."""
    if not GEMINI_API_KEY:
        print("⚠ GEMINI_API_KEY não configurada — pulando extração")
        return 0

    from google import genai
    from google.genai import types

    client_ai = genai.Client(api_key=GEMINI_API_KEY)
    db = get_db()

    # Get pending news
    pending = db.table("radar_noticias")\
        .select("id, titulo, corpo")\
        .eq("enrichment_status", "pending")\
        .order("created_at")\
        .limit(limit)\
        .execute().data or []

    if not pending:
        print("📭 Nenhuma notícia pendente para extração")
        return 0

    print(f"\n🧠 Extraindo dados de {len(pending)} notícias via Gemini Flash...")
    processed = 0

    for noticia in pending:
        nid = noticia["id"]
        titulo = noticia.get("titulo", "")
        corpo = (noticia.get("corpo") or "")[:12000]

        text = f"TÍTULO: {titulo}\n\nTEXTO:\n{corpo}"

        try:
            response = client_ai.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{EXTRACTION_PROMPT}\n\n---\n\n{text}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=4096,
                ),
            )

            result = json.loads(response.text)

            update = {"enrichment_status": "extracted", "updated_at": datetime.now(timezone.utc).isoformat()}

            if result.get("tipo_crime") in [
                "homicidio", "tentativa_homicidio", "trafico", "roubo", "furto",
                "violencia_domestica", "sexual", "lesao_corporal", "porte_arma",
                "estelionato", "outros"
            ]:
                update["tipo_crime"] = result["tipo_crime"]

            if result.get("bairro"):
                update["bairro"] = result["bairro"]
            if result.get("logradouro"):
                update["logradouro"] = result["logradouro"]
            if result.get("delegacia"):
                update["delegacia"] = result["delegacia"]
            if result.get("circunstancia") in ["flagrante", "mandado", "denuncia", "operacao", "investigacao", "julgamento"]:
                update["circunstancia"] = result["circunstancia"]
            if result.get("artigos_penais"):
                update["artigos_penais"] = json.dumps(result["artigos_penais"])
            if result.get("arma_meio"):
                update["arma_meio"] = result["arma_meio"]
            if result.get("data_fato"):
                update["data_fato"] = result["data_fato"]
            if result.get("resumo"):
                update["resumo_ia"] = result["resumo"][:1000]
            if result.get("envolvidos"):
                update["envolvidos"] = json.dumps(result["envolvidos"], ensure_ascii=False)

            db.table("radar_noticias").update(update).eq("id", nid).execute()
            processed += 1

            tipo = update.get("tipo_crime", "?")
            bairro = update.get("bairro", "?")
            n_env = len(result.get("envolvidos", []))
            print(f"   ✓ [{nid}] {tipo:20s} | {bairro:20s} | {n_env} envolvidos | {titulo[:60]}")

        except Exception as e:
            print(f"   ✗ [{nid}] Erro: {str(e)[:80]}")
            continue

    print(f"\n✅ EXTRAÇÃO: {processed}/{len(pending)} processadas")
    return processed


# ===================================================
# STEP 3: GEOCODE (Nominatim)
# ===================================================

async def geocode_batch(limit: int = 30):
    """Geocode news that have bairro but no lat/lng."""
    db = get_db()

    pending = db.table("radar_noticias")\
        .select("id, bairro, logradouro")\
        .eq("enrichment_status", "extracted")\
        .is_("latitude", "null")\
        .not_.is_("bairro", "null")\
        .limit(limit)\
        .execute().data or []

    if not pending:
        print("📭 Nenhuma notícia para geocodificar")
        return 0

    print(f"\n🌍 Geocodificando {len(pending)} notícias...")
    geocoded = 0

    async with httpx.AsyncClient(timeout=10) as client:
        for n in pending:
            bairro = n.get("bairro", "")
            logradouro = n.get("logradouro", "")
            query = f"{logradouro}, {bairro}" if logradouro else bairro
            query += ", Camaçari, Bahia, Brasil"

            try:
                r = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": query, "format": "json", "limit": 1, "countrycodes": "br"},
                    headers={"User-Agent": "OMBUDS-Radar/1.0"},
                )
                if r.status_code == 200 and r.json():
                    data = r.json()[0]
                    lat, lon = float(data["lat"]), float(data["lon"])
                    db.table("radar_noticias").update({
                        "latitude": lat, "longitude": lon
                    }).eq("id", n["id"]).execute()
                    geocoded += 1
                    print(f"   ✓ [{n['id']}] {bairro} → ({lat:.4f}, {lon:.4f})")

                await asyncio.sleep(1.1)  # Nominatim rate limit: 1 req/sec
            except Exception as e:
                print(f"   ✗ [{n['id']}] {str(e)[:60]}")

    print(f"\n✅ GEOCODING: {geocoded}/{len(pending)} geocodificadas")
    return geocoded


# ===================================================
# STEP 4: MATCHING
# ===================================================

async def match_batch(limit: int = 30):
    """Match news envolvidos against assistidos."""
    db = get_db()

    pending = db.table("radar_noticias")\
        .select("id, titulo, tipo_crime, bairro, data_fato, envolvidos")\
        .eq("enrichment_status", "extracted")\
        .not_.is_("envolvidos", "null")\
        .limit(limit)\
        .execute().data or []

    if not pending:
        print("📭 Nenhuma notícia para matching")
        return 0

    print(f"\n🔗 Matching {len(pending)} notícias contra assistidos...")
    total_matches = 0

    for n in pending:
        envolvidos = n.get("envolvidos")
        if isinstance(envolvidos, str):
            try:
                envolvidos = json.loads(envolvidos)
            except:
                continue

        if not isinstance(envolvidos, list):
            continue

        matches_found = 0
        for env in envolvidos:
            if not isinstance(env, dict):
                continue
            nome = (env.get("nome") or "").strip()
            if not nome or len(nome) < 5:
                continue

            # Search via pg_trgm function
            try:
                result = db.rpc("search_assistidos_trgm", {
                    "search_name": nome,
                    "min_similarity": 0.35,
                    "max_results": 3
                }).execute()

                candidates = result.data or []
            except:
                # Fallback: ILIKE search
                parts = nome.upper().split()
                if len(parts) < 2:
                    continue
                candidates = db.table("assistidos")\
                    .select("id, nome, endereco, cpf")\
                    .is_("deleted_at", "null")\
                    .ilike("nome", f"%{parts[0]}%{parts[-1]}%")\
                    .limit(3)\
                    .execute().data or []
                for c in candidates:
                    c["similarity"] = _token_similarity(nome, c.get("nome", ""))

            for cand in candidates:
                sim = float(cand.get("similarity", 0))
                if sim < 0.3:
                    continue

                score = min(100, round(sim * 40) + 30)  # nome(40) + base(30)
                status = "auto_confirmado" if score >= 80 else "possivel"

                try:
                    db.table("radar_matches").insert({
                        "noticia_id": n["id"],
                        "assistido_id": cand["id"],
                        "nome_encontrado": nome,
                        "score_confianca": score,
                        "status": status,
                        "dados_extraidos": json.dumps({"envolvido": env, "similarity": sim}, ensure_ascii=False),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }).execute()
                    matches_found += 1
                    print(f"   🔗 [{n['id']}] {nome} ↔ {cand.get('nome','')} (score={score}, sim={sim:.2f})")
                except Exception as e:
                    if "duplicate" in str(e).lower():
                        pass  # Already matched
                    else:
                        print(f"   ⚠ Match insert error: {str(e)[:60]}")

        # Update status
        new_status = "matched" if matches_found > 0 else "extracted"
        db.table("radar_noticias").update({
            "enrichment_status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", n["id"]).execute()

        total_matches += matches_found

    print(f"\n✅ MATCHING: {total_matches} matches encontrados em {len(pending)} notícias")
    return total_matches


def _token_similarity(a: str, b: str) -> float:
    ta = set(a.upper().split())
    tb = set(b.upper().split())
    if not ta or not tb: return 0.0
    return len(ta & tb) / len(ta | tb)


# ===================================================
# MAIN
# ===================================================

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Radar Criminal Pipeline")
    parser.add_argument("--scrape", action="store_true", help="Scrape news from portals")
    parser.add_argument("--extract", action="store_true", help="Extract data via Gemini")
    parser.add_argument("--geocode", action="store_true", help="Geocode locations")
    parser.add_argument("--match", action="store_true", help="Match against assistidos")
    parser.add_argument("--all", action="store_true", help="Run full pipeline")
    args = parser.parse_args()

    if not any([args.scrape, args.extract, args.geocode, args.match, args.all]):
        args.all = True

    print("=" * 60)
    print("🛡  RADAR CRIMINAL — Pipeline de Inteligência")
    print(f"⏰  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    if args.scrape or args.all:
        await scrape_all()

    if args.extract or args.all:
        await extract_batch()

    if args.geocode or args.all:
        await geocode_batch()

    if args.match or args.all:
        await match_batch()

    # Final stats
    db = get_db()
    total = db.table("radar_noticias").select("id", count="exact").execute()
    extracted = db.table("radar_noticias").select("id", count="exact").eq("enrichment_status", "extracted").execute()
    matched = db.table("radar_noticias").select("id", count="exact").eq("enrichment_status", "matched").execute()
    matches = db.table("radar_matches").select("id", count="exact").execute()

    print(f"\n{'=' * 60}")
    print(f"📊 RESUMO FINAL")
    print(f"   Notícias no banco: {total.count}")
    print(f"   Extraídas: {extracted.count}")
    print(f"   Com match: {matched.count}")
    print(f"   Total matches: {matches.count}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
