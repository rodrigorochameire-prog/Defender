#!/usr/bin/env python3
"""
fetch_news.py — Coleta automatizada de notícias via Google Custom Search + Claude/OpenAI.

Pipeline adaptado do news-hub-saas para integração com OMBUDS/Defender.

  1. Para cada seção do jornal, executa queries no Google CSE
  2. Extrai conteúdo textual (requests + BeautifulSoup)
  3. Sumariza com LLM (Claude ou OpenAI)
  4. Salva JSON compatível com importação no OMBUDS

Uso:
  python3 scripts/news/fetch_news.py [factual|juridico|radar]

Variáveis de ambiente (.env.local):
  GOOGLE_CSE_API_KEY=...
  GOOGLE_CSE_CX=...
  ANTHROPIC_API_KEY=...   (preferido)
  OPENAI_API_KEY=...      (fallback)
"""

import json
import os
import re
import time
import logging
import hashlib
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

# Tenta carregar .env
try:
    from dotenv import load_dotenv
    # Carrega .env.local do projeto Defender
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

# ==================== LOGGING ====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("fetch_news")

# ==================== CONFIG ====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CACHE_DIR = os.path.join(BASE_DIR, ".cache")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

GOOGLE_CSE_API_KEY = os.environ.get("GOOGLE_CSE_API_KEY", "")
GOOGLE_CSE_CX = os.environ.get("GOOGLE_CSE_CX", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

MAX_RESULTS_PER_QUERY = 5
MAX_ARTICLES_PER_SECTION = 5
CONTENT_MAX_CHARS = 8000
REQUEST_TIMEOUT = 15
MAX_WORKERS = 8

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)

# ==================== KNOWN SOURCES ====================
KNOWN_SOURCES = {
    "g1.globo.com": "G1", "globo.com": "G1",
    "uol.com.br": "UOL", "noticias.uol.com.br": "UOL",
    "folha.uol.com.br": "Folha de S.Paulo",
    "estadao.com.br": "Estadão",
    "correio24horas.com.br": "Correio 24 Horas",
    "bahianoticias.com.br": "Bahia Notícias",
    "ibahia.com": "iBahia", "metro1.com.br": "Metrópole",
    "bocaonews.com.br": "Bocão News",
    "conjur.com.br": "ConJur", "migalhas.com.br": "Migalhas",
    "stf.jus.br": "STF", "stj.jus.br": "STJ", "tjba.jus.br": "TJBA",
    "cnnbrasil.com.br": "CNN Brasil", "r7.com": "R7",
    "terra.com.br": "Terra", "bbc.com": "BBC",
    "agenciabrasil.ebc.com.br": "Agência Brasil",
    "ssp.ba.gov.br": "SSP-BA", "ba.gov.br": "Governo da Bahia",
    "gov.br": "Gov.br",
}


# ==================== GOOGLE CSE ====================
def google_search(query: str, num: int = 5, date_restrict: str = "d3") -> list[dict]:
    if not GOOGLE_CSE_API_KEY or not GOOGLE_CSE_CX:
        raise ValueError("Google CSE não configurado")

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_CSE_API_KEY, "cx": GOOGLE_CSE_CX,
        "q": query, "num": min(num, 10),
        "lr": "lang_pt", "gl": "br",
        "dateRestrict": date_restrict, "sort": "date",
    }

    try:
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        results = [{
            "title": item.get("title", ""),
            "link": item.get("link", ""),
            "snippet": item.get("snippet", ""),
        } for item in data.get("items", [])]
        log.info(f"  CSE: '{query}' -> {len(results)} resultados")
        return results
    except requests.exceptions.HTTPError:
        if resp.status_code == 429:
            log.warning("  CSE: Rate limit. Aguardando 5s...")
            time.sleep(5)
            return google_search(query, num, date_restrict)
        log.error(f"  CSE erro HTTP: {resp.status_code}")
        return []
    except Exception as e:
        log.error(f"  CSE erro: {e}")
        return []


# ==================== CONTENT EXTRACTION ====================
def extract_page_content(url: str) -> Optional[str]:
    url_hash = hashlib.md5(url.encode()).hexdigest()
    cache_file = os.path.join(CACHE_DIR, f"{url_hash}.txt")

    if os.path.exists(cache_file):
        age = time.time() - os.path.getmtime(cache_file)
        if age < 86400:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return f.read()

    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT},
                          timeout=REQUEST_TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        for tag in soup.find_all(['script', 'style', 'nav', 'footer',
                                   'header', 'aside', 'iframe', 'form', 'noscript']):
            tag.decompose()

        content = ""
        article = soup.find('article')
        if article:
            content = article.get_text(separator='\n', strip=True)

        if not content or len(content) < 200:
            main = (
                soup.find(attrs={"role": "main"}) or
                soup.find(class_=re.compile(r'(content|article|post|materia|noticia|texto)', re.I)) or
                soup.find(id=re.compile(r'(content|article|post|materia|noticia)', re.I))
            )
            if main:
                content = main.get_text(separator='\n', strip=True)

        if not content or len(content) < 200:
            paragraphs = soup.find_all('p')
            content = '\n'.join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 40)

        content = content[:CONTENT_MAX_CHARS]
        if content:
            with open(cache_file, 'w', encoding='utf-8') as f:
                f.write(content)
        return content if len(content) > 100 else None
    except Exception as e:
        log.debug(f"  Extração falhou para {url}: {e}")
        return None


# ==================== LLM SUMMARIZATION ====================
def summarize_with_claude(title: str, content: str, context: str) -> str:
    if not ANTHROPIC_API_KEY:
        return ""
    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 600,
                "messages": [{"role": "user", "content": f"""Você é um editor jornalístico. Resuma a notícia abaixo em 2 a 4 parágrafos concisos e informativos, em português brasileiro.

REGRAS:
- Texto corrido, sem bullet points, sem listas
- Mencione nomes, locais, datas e números relevantes
- Seja factual e objetivo
- Contexto da seção: {context}
- Separe parágrafos com \\n\\n
- Se o conteúdo não for relevante para "{context}", responda APENAS: "IRRELEVANTE"

TÍTULO: {title}

CONTEÚDO:
{content[:5000]}"""}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data.get("content", [{}])[0].get("text", "").strip()
        return "" if text == "IRRELEVANTE" else text
    except Exception as e:
        log.error(f"  Claude erro: {e}")
        return ""


def summarize_with_openai(title: str, content: str, context: str) -> str:
    if not OPENAI_API_KEY:
        return ""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": f"""Você é um editor jornalístico. Resuma a notícia abaixo em 2 a 4 parágrafos concisos e informativos, em português brasileiro.

REGRAS:
- Texto corrido, sem bullet points
- Mencione nomes, locais, datas e números relevantes
- Seja factual e objetivo
- Contexto: {context}
- Separe parágrafos com \\n\\n
- Se irrelevante para "{context}", responda APENAS: "IRRELEVANTE"

TÍTULO: {title}
CONTEÚDO:
{content[:5000]}"""}],
            max_tokens=600, temperature=0.3,
        )
        text = response.choices[0].message.content.strip()
        return "" if text == "IRRELEVANTE" else text
    except Exception as e:
        log.error(f"  OpenAI erro: {e}")
        return ""


def summarize_article(title: str, content: str, context: str) -> str:
    summary = summarize_with_claude(title, content, context)
    if not summary:
        summary = summarize_with_openai(title, content, context)
    return summary


# ==================== DEDUPLICATION ====================
def deduplicate_articles(articles: list[dict]) -> list[dict]:
    seen_titles = set()
    unique = []
    for art in articles:
        normalized = re.sub(r'[^\w\s]', '', art['title'].lower()).strip()
        words = set(normalized.split())
        is_dup = any(
            len(words & set(seen.split())) / max(len(words | set(seen.split())), 1) > 0.6
            for seen in seen_titles
        )
        if not is_dup:
            seen_titles.add(normalized)
            unique.append(art)
    return unique


def clean_title(title: str) -> str:
    return re.sub(r'\s*[\-–—\|]\s*(G1|UOL|Folha|Estadão|R7|Terra|CNN|BBC|Correio|iBahia).*$', '', title, flags=re.I).strip()


def get_source_name(url: str) -> str:
    domain = urlparse(url).netloc.replace("www.", "")
    for known_domain, name in KNOWN_SOURCES.items():
        if known_domain in url:
            return name
    return domain.split(".")[0].capitalize()


# ==================== PIPELINE POR SEÇÃO ====================
def fetch_section(section_config: dict) -> dict:
    name = section_config["name"]
    queries = section_config.get("queries", [])
    context = section_config.get("context", name)
    date_restrict = section_config.get("date_restrict", "d3")

    log.info(f"\n[{name}] Buscando {len(queries)} queries...")

    all_results, seen_urls = [], set()
    for query in queries:
        results = google_search(query, num=MAX_RESULTS_PER_QUERY, date_restrict=date_restrict)
        for r in results:
            if r["link"] not in seen_urls:
                seen_urls.add(r["link"])
                all_results.append(r)
        time.sleep(0.3)

    log.info(f"[{name}] {len(all_results)} URLs únicas")
    if not all_results:
        return {"name": name, "articles": []}

    contents = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_url = {
            executor.submit(extract_page_content, r["link"]): r
            for r in all_results
        }
        for future in as_completed(future_to_url):
            result = future_to_url[future]
            try:
                content = future.result()
                if content:
                    contents[result["link"]] = {
                        "title": result["title"],
                        "snippet": result["snippet"],
                        "content": content,
                        "url": result["link"],
                    }
            except Exception:
                pass

    log.info(f"[{name}] {len(contents)} páginas extraídas")

    articles = []
    for url, data in contents.items():
        text = data["content"] if len(data["content"]) > 200 else f"{data['snippet']}\n\n{data['content']}"
        summary = summarize_article(data["title"], text, context)
        if summary:
            articles.append({
                "title": clean_title(data["title"]),
                "summary": summary,
                "source_name": get_source_name(url),
                "source_url": url,
            })
        time.sleep(0.2)

    articles = deduplicate_articles(articles)[:MAX_ARTICLES_PER_SECTION]
    log.info(f"[{name}] {len(articles)} artigos finais")
    return {"name": name, "articles": articles}


# ==================== SEÇÕES ====================
FACTUAL_SECTIONS = [
    {"name": "DESTAQUES", "context": "Manchetes mais impactantes do dia na Bahia e no Brasil", "date_restrict": "d2",
     "queries": ["manchetes do dia Bahia Salvador", "notícias destaque Brasil hoje", "fato relevante Bahia hoje"]},
    {"name": "CAMAÇARI", "context": "Notícias de Camaçari, Bahia", "date_restrict": "d3",
     "queries": ["Camaçari notícias hoje", "Camaçari Bahia acontecimentos", "prefeitura Camaçari", "polo industrial Camaçari"]},
    {"name": "LAURO DE FREITAS", "context": "Notícias de Lauro de Freitas, Bahia", "date_restrict": "d3",
     "queries": ["Lauro de Freitas notícias hoje", "Lauro de Freitas Bahia acontecimentos"]},
    {"name": "SALVADOR", "context": "Notícias de Salvador, capital da Bahia", "date_restrict": "d2",
     "queries": ["Salvador Bahia notícias hoje", "Salvador capital Bahia acontecimentos", "prefeitura Salvador notícias"]},
    {"name": "BAHIA", "context": "Notícias do estado da Bahia", "date_restrict": "d2",
     "queries": ["Bahia estado notícias hoje", "governo Bahia notícias", "interior Bahia acontecimentos"]},
    {"name": "BRASIL", "context": "Principais notícias nacionais", "date_restrict": "d2",
     "queries": ["Brasil notícias hoje política", "economia brasileira notícias hoje", "governo federal notícias hoje"]},
    {"name": "MUNDO", "context": "Principais notícias internacionais", "date_restrict": "d2",
     "queries": ["notícias internacionais hoje", "mundo destaque notícias hoje"]},
    {"name": "TECNOLOGIA", "context": "Notícias de tecnologia e IA", "date_restrict": "d3",
     "queries": ["tecnologia notícias hoje Brasil", "inteligência artificial notícias"]},
    {"name": "ESPORTE", "context": "Esportes na Bahia e no Brasil", "date_restrict": "d2",
     "queries": ["esporte Bahia futebol hoje", "Bahia Vitória futebol resultado", "esporte Brasil destaque"]},
]

JURIDICO_SECTIONS = [
    {"name": "LEGISLAÇÃO", "context": "Novas leis e normas em matéria penal", "date_restrict": "d3",
     "queries": ["nova lei penal Brasil 2026", "projeto lei segurança pública Brasil", "alteração código penal processual 2026"]},
    {"name": "TRIBUNAIS SUPERIORES", "context": "Decisões do STF e STJ em matéria penal", "date_restrict": "d3",
     "queries": ["STF decisão penal hoje", "STJ julgamento criminal recurso", "supremo tribunal penal habeas corpus"]},
    {"name": "TJBA", "context": "Decisões do Tribunal de Justiça da Bahia", "date_restrict": "d7",
     "queries": ["TJBA decisão criminal Bahia", "tribunal justiça Bahia penal", "justiça Bahia sentença criminal"]},
    {"name": "SEGURANÇA PÚBLICA", "context": "Políticas de segurança pública", "date_restrict": "d3",
     "queries": ["segurança pública Bahia polícia", "política segurança pública Brasil", "estatísticas criminalidade Bahia"]},
    {"name": "PROCESSO PENAL", "context": "Temas de processo penal", "date_restrict": "d3",
     "queries": ["processo penal prisão preventiva Brasil", "audiência custódia decisão", "inquérito policial investigação criminal"]},
    {"name": "EXECUÇÃO PENAL", "context": "Sistema prisional e execução penal", "date_restrict": "d7",
     "queries": ["execução penal progressão regime", "sistema prisional Brasil Bahia", "monitoramento eletrônico tornozeleira"]},
    {"name": "VIOLÊNCIA DOMÉSTICA", "context": "Lei Maria da Penha e violência de gênero", "date_restrict": "d3",
     "queries": ["violência doméstica Lei Maria Penha", "medida protetiva decisão judicial", "feminicídio condenação julgamento"]},
    {"name": "DOUTRINA & DEBATE", "context": "Artigos de opinião jurídica e análises doutrinárias", "date_restrict": "d7",
     "queries": ["artigo jurídico direito penal opinião", "debate reforma penal Brasil", "análise jurídica criminal doutrina"]},
]

RADAR_SECTIONS = [
    {"name": "HOMICÍDIOS", "context": "Homicídios em Camaçari, Salvador e RMS", "date_restrict": "d3",
     "queries": ["homicídio Camaçari", "assassinato morte Camaçari Bahia", "tentativa homicídio Camaçari",
                 "feminicídio Camaçari Salvador Bahia", "tiroteio morto baleado Camaçari"]},
    {"name": "TRÁFICO DE DROGAS", "context": "Apreensões de drogas em Camaçari, Salvador e RMS", "date_restrict": "d3",
     "queries": ["tráfico drogas Camaçari", "apreensão drogas Camaçari Salvador", "traficante preso Camaçari Salvador"]},
    {"name": "OPERAÇÕES POLICIAIS", "context": "Operações policiais em Camaçari, Salvador e RMS", "date_restrict": "d3",
     "queries": ["operação policial Camaçari", "operação policial Salvador RMS", "mandado prisão cumprido Camaçari"]},
    {"name": "VIOLÊNCIA DOMÉSTICA", "context": "Violência doméstica em Camaçari, Salvador e RMS", "date_restrict": "d3",
     "queries": ["violência doméstica Camaçari", "Maria da Penha prisão Camaçari Bahia"]},
    {"name": "CRIMES SEXUAIS", "context": "Crimes sexuais em Camaçari, Salvador e RMS", "date_restrict": "d7",
     "queries": ["estupro vulnerável Camaçari Salvador", "abuso sexual criança Camaçari Bahia"]},
    {"name": "VIOLÊNCIA URBANA", "context": "Roubos, furtos e assaltos em Camaçari e RMS", "date_restrict": "d3",
     "queries": ["assalto roubo Camaçari", "violência urbana Camaçari Salvador"]},
    {"name": "SEGURANÇA PÚBLICA", "context": "Segurança pública em Camaçari e RMS", "date_restrict": "d7",
     "queries": ["segurança pública Camaçari", "câmera monitoramento policiamento Camaçari"]},
]

JOURNALS = {
    "factual": ("Diário da Bahia", FACTUAL_SECTIONS, "noticias_factual.json"),
    "juridico": ("Diário Criminal", JURIDICO_SECTIONS, "noticias_juridico.json"),
    "radar": ("Radar Criminal — Camaçari & RMS", RADAR_SECTIONS, "noticias_radar.json"),
}


def fetch_journal(journal_name: str, sections_config: list, output_file: str):
    log.info(f"\n{'='*60}\n  {journal_name}\n{'='*60}")

    sections = []
    total_articles = 0
    for sc in sections_config:
        data = fetch_section(sc)
        sections.append(data)
        total_articles += len(data["articles"])

    output = {
        "sections": sections,
        "updated_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
    }

    filepath = os.path.join(DATA_DIR, output_file)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"\n[{journal_name}] {total_articles} artigos -> {filepath}")
    return filepath


def main():
    import sys
    journal = sys.argv[1] if len(sys.argv) > 1 else "all"

    missing = []
    if not GOOGLE_CSE_API_KEY: missing.append("GOOGLE_CSE_API_KEY")
    if not GOOGLE_CSE_CX: missing.append("GOOGLE_CSE_CX")
    if not ANTHROPIC_API_KEY and not OPENAI_API_KEY:
        missing.append("ANTHROPIC_API_KEY ou OPENAI_API_KEY")
    if missing:
        log.error(f"Variáveis faltando: {', '.join(missing)}")
        return False

    start = time.time()

    if journal == "all":
        for key, (name, sections, outfile) in JOURNALS.items():
            fetch_journal(name, sections, outfile)
    elif journal in JOURNALS:
        name, sections, outfile = JOURNALS[journal]
        fetch_journal(name, sections, outfile)
    else:
        log.error(f"Jornal desconhecido: {journal}. Use: factual, juridico, radar, all")
        return False

    elapsed = time.time() - start
    log.info(f"\nPipeline concluído em {elapsed:.0f}s ({elapsed/60:.1f} min)")
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
