#!/usr/bin/env python3
"""
Varredura da Triagem — OMBUDS × PJe

Para cada demanda em 5_TRIAGEM/URGENTE, abre o expediente no PJe, lê o conteúdo,
classifica fase processual + ato, atualiza o ato da demanda e cria registro
(ciência/anotação/diligência). Se há designação/redesignação de audiência,
agenda em `audiencias` e sincroniza com Google Calendar.

NÃO altera `status` — mantém a demanda em triagem para revisão final do Rodrigo.

Uso:
  python3 varredura_triagem.py --atribuicao VVD_CAMACARI --since 2026-05-03
  python3 varredura_triagem.py --atribuicao JURI_CAMACARI --limit 5
  python3 varredura_triagem.py --modo manual-review     # só cria registros de diligência

Requer:
  - .venv do enrichment-engine (patchright)
  - PJE_CPF, PJE_SENHA, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY no .env.local
"""
from __future__ import annotations

import argparse, asyncio, json, os, re, sys, time, unicodedata
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any
import urllib.request, urllib.error

# patchright apenas no modo direct
try:
    from patchright.async_api import async_playwright
except ImportError:
    async_playwright = None

# ───── Config ────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[3] if "Skills - harmonizacao" in str(Path(__file__).resolve()) else Path(__file__).resolve().parents[2]
ENV_PATH = Path("/Users/rodrigorochameire/Projetos/Defender/.env.local")
PJE_BASE = "https://pje.tjba.jus.br/pje"
DEFENSOR_ID = 1
RELOGIN_EVERY = 8

# ───── Helpers ───────────────────────────────────────────────────────────────

def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def normalize(s: str) -> str:
    """Lower-case, sem acentos. Para regex robusto contra variação de PJe."""
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


# ───── Supabase REST ─────────────────────────────────────────────────────────

class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def _req(self, method: str, path: str, body: Any = None, prefer: str | None = None):
        h = dict(self.headers)
        if prefer:
            h["Prefer"] = prefer
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"{self.url}{path}", data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                txt = r.read().decode()
                return json.loads(txt) if txt else {}
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise RuntimeError(f"Supabase {method} {path} → {e.code}: {err[:300]}")

    def list_demandas_triagem(self, atribuicao: str | None, since: str | None, limit: int) -> list[dict]:
        params = [
            "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
            "processos!inner(numero_autos,atribuicao,vara,classe_processual),"
            "assistidos!inner(nome)",
            "status=in.(5_TRIAGEM,URGENTE)",
            f"defensor_id=eq.{DEFENSOR_ID}",
            "deleted_at=is.null",
            "order=data_expedicao.desc",
            f"limit={limit}",
        ]
        if atribuicao:
            params.append(f"processos.atribuicao=eq.{atribuicao}")
        if since:
            params.append(f"data_expedicao=gte.{since}")
        path = "/rest/v1/demandas?" + "&".join(params)
        return self._req("GET", path)

    def update_demanda(self, demanda_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}", fields)

    def insert_registro(self, registro: dict) -> dict:
        return self._req("POST", "/rest/v1/registros", registro, prefer="return=representation")

    def find_audiencia(self, processo_id: int, dia: str) -> list[dict]:
        return self._req(
            "GET",
            f"/rest/v1/audiencias?processo_id=eq.{processo_id}"
            f"&data_audiencia=gte.{dia}T00:00:00&data_audiencia=lt.{dia}T23:59:59",
        )

    def insert_audiencia(self, audiencia: dict) -> dict:
        return self._req("POST", "/rest/v1/audiencias", audiencia, prefer="return=representation")


# ───── Classificador ────────────────────────────────────────────────────────

class RuleResult:
    def __init__(self, ato: str, prioridade: str, prazo: int | None,
                 registro_tipo: str, side_effects: list[str], extras: dict):
        self.ato = ato
        self.prioridade = prioridade
        self.prazo_dias = prazo
        self.registro_tipo = registro_tipo
        self.side_effects = side_effects
        self.extras = extras


# Regras por atribuição. Ordem importa — primeira que casa vence.
RULES_VVD = [
    (r"(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao e julgamento)",
     "Ciência designação de audiência", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    (r"(redesigno|redesignada|fica redesignada).{0,40}(audiencia|aij)",
     "Ciência redesignação de audiência", "NORMAL", None, "ciencia", ["reagendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    (r"designada.{0,30}audiencia.{0,15}justificacao",
     "Ciência designação de audiência", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "JUSTIFICACAO"}),
    (r"(nomeada a defensoria|vistas? a dpe).{0,80}resposta a acusacao|apresente.{0,20}resposta a acusacao",
     "Resposta à Acusação", "URGENTE", 10, "diligencia", [], {}),
    (r"prazo (sucessivo )?de \d+ dias.{0,40}alegacoes finais",
     "Alegações finais", "URGENTE", 5, "diligencia", [], {}),
    (r"apresentar memoriais|prazo.{0,30}memoriais",
     "Memoriais", "URGENTE", 5, "diligencia", [], {}),
    (r"manifeste-?se sobre o laudo|vistas?.{0,15}laudo",
     "Manifestação sobre laudo", "NORMAL", 5, "diligencia", [], {}),
    (r"manifeste-?se.{0,30}(revogacao|modulacao).{0,15}(mpu|medida protetiva)",
     "Manifestação sobre MPU", "NORMAL", 5, "diligencia", [], {}),
    (r"deixo de conhecer|formular em autos proprios",
     "Cumprir despacho", "URGENTE", None, "diligencia", [], {}),
    (r"(sentenca|julgo).{0,200}absolv",
     "Ciência absolvição", "NORMAL", None, "ciencia", [], {}),
    (r"(sentenca|julgo).{0,200}condeno",
     "Ciência condenação", "ALTA", None, "ciencia", [], {}),
    (r"\bsentenca\b",
     "Analisar sentença", "URGENTE", 5, "diligencia", [], {}),
    (r"\bacordao\b.{0,500}(improvido|desprovido|nao provido)",
     "Ciência acórdão", "NORMAL", None, "ciencia", [], {}),
    (r"\bacordao\b",
     "Analisar acórdão", "URGENTE", 15, "diligencia", [], {}),
    (r"\bdecisao\b",
     "Analisar decisão", "NORMAL", None, "diligencia", [], {}),
    (r"arquivado definitivamente|arquivamento definitivo",
     "Ciência", "BAIXA", None, "ciencia", ["marcar_concluido"], {}),
    (r"sigiloso.{0,30}sem visibilidade|peticionar.{0,30}fora dos autos",
     "Outro", "BAIXA", None, "anotacao", ["marcar_sem_atuacao"], {}),
]

RULES_JURI = [
    (r"sessao de julgamento.{0,30}(tribunal do juri|plenario)",
     "Ciência sessão de julgamento", "ALTA", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "JURI"}),
    (r"\bpronunci(o|a)\b", "Ciência da pronúncia", "ALTA", None, "ciencia", [], {}),
    (r"impronunci(o|a)|improvincio", "Ciência da impronúncia", "ALTA", None, "ciencia", [], {}),
    (r"desclassific", "Ciência desclassificação", "ALTA", None, "ciencia", [], {}),
    (r"art\.?\s*422|diligencias do 422", "Diligências do 422", "ALTA", 5, "diligencia", [], {}),
] + RULES_VVD  # JURI herda regras gerais

RULES_EP = [
    (r"designada.{0,30}audiencia.{0,15}justificacao",
     "Designação de justificação", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "ESPECIALIZADA"}),
    (r"designada.{0,30}audiencia admonitoria",
     "Designação admonitória", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "ESPECIALIZADA"}),
    (r"manifeste-?se.{0,30}reconversao", "Manifestação contra reconversão", "URGENTE", 5, "diligencia", [], {}),
    (r"manifeste-?se.{0,30}regressao", "Manifestação contra regressão", "URGENTE", 5, "diligencia", [], {}),
] + RULES_VVD


def classify(content: str, atribuicao: str) -> RuleResult | None:
    text = normalize(content)
    rules = (
        RULES_JURI if atribuicao.startswith("JURI") else
        RULES_EP if atribuicao == "EXECUCAO_PENAL" else
        RULES_VVD
    )
    for pat, ato, prio, prazo, tipo, fx, ex in rules:
        if re.search(pat, text):
            return RuleResult(ato, prio, prazo, tipo, fx, ex)
    return None


# ───── PJe scraper ───────────────────────────────────────────────────────────

class PjeScraper:
    def __init__(self, env: dict[str, str], headless: bool = True):
        self.env = env
        self.headless = headless
        self.pw = None
        self.browser = None
        self.ctx = None
        self.page = None
        self.docs_done = 0

    async def __aenter__(self):
        if async_playwright is None:
            raise RuntimeError("patchright não instalado — ative .venv do enrichment-engine")
        self.pw = await async_playwright().__aenter__()
        await self._fresh_browser()
        return self

    async def __aexit__(self, *a):
        if self.browser:
            await self.browser.close()
        if self.pw:
            await self.pw.__aexit__(*a)

    async def _fresh_browser(self):
        if self.browser:
            await self.browser.close()
        self.browser = await self.pw.chromium.launch(headless=self.headless)
        self.ctx = await self.browser.new_context(ignore_https_errors=True)
        self.page = await self.ctx.new_page()
        await self._login()
        self.docs_done = 0

    async def _login(self):
        log("PJe → login...")
        p = self.page
        await p.goto(f"{PJE_BASE}/login.seam", wait_until="domcontentloaded", timeout=30000)
        await p.wait_for_selector("input[name=username]", timeout=15000)
        await p.fill("input[name=username]", self.env["PJE_CPF"])
        await p.fill("input[name=password]", self.env["PJE_SENHA"])
        await p.click("input[type=submit]")
        await p.wait_for_url(re.compile(r"advogado\.seam"), timeout=30000)
        log(f"  ✓ logado")

    async def fetch_doc_content(self, doc_id: str | None, numero_processo: str) -> dict:
        """Retorna {tipo, text, link, sigiloso}. Se não conseguir, text=None."""
        if self.docs_done >= RELOGIN_EVERY:
            log(f"Relogin (após {self.docs_done} docs)...")
            await self._fresh_browser()

        self.docs_done += 1

        # TODO: implementar busca real — hoje retorna placeholder
        # Há 2 caminhos de busca:
        #   (a) por pje_documento_id via Processo/ConsultaDocumento/listView.seam (form de busca)
        #   (b) por numero_processo via Painel → EXPEDIENTES → Vara → linha → "Autos Digitais"
        #
        # Caminho (a) é mais direto MAS o form usa JSF/RichFaces complicado;
        # caminho (b) é o que o memory:reference_triagem_sweep_workflow descreve.
        return {
            "tipo": "PENDENTE_IMPLEMENTACAO",
            "text": None,
            "link": f"{PJE_BASE}/Processo/ConsultaDocumento/listView.seam?nd={doc_id}" if doc_id else None,
            "sigiloso": False,
        }


# ───── Pipeline ──────────────────────────────────────────────────────────────

async def varredura_direct(args, env, sb: Supabase):
    demandas = sb.list_demandas_triagem(args.atribuicao, args.since, args.limit)
    log(f"Demandas alvo: {len(demandas)}")

    stats = {"ok": 0, "skipped": 0, "errors": 0, "audiencias": 0}
    counts_ato: dict[str, int] = {}

    async with PjeScraper(env, headless=not args.show) as scraper:
        for d in demandas:
            doc_id = d.get("pje_documento_id") or d.get("enrichment_data", {}).get("id_documento_pje")
            numero = d["processos"]["numero_autos"]
            atribuicao = d["processos"]["atribuicao"]
            assistido_nome = d["assistidos"]["nome"]

            try:
                res = await scraper.fetch_doc_content(doc_id, numero)
                if res["text"] is None:
                    log(f"  [{d['id']}] {assistido_nome[:30]} ({numero}) — scraping pendente, fallback manual")
                    create_manual_review(sb, d, res.get("link"))
                    stats["skipped"] += 1
                    continue

                rule = classify(res["text"], atribuicao)
                if not rule:
                    log(f"  [{d['id']}] sem match — fallback manual")
                    create_manual_review(sb, d, res.get("link"))
                    stats["skipped"] += 1
                    continue

                apply_rule(sb, d, rule, res["text"])
                counts_ato[rule.ato] = counts_ato.get(rule.ato, 0) + 1
                if "agendar_audiencia" in rule.side_effects or "reagendar_audiencia" in rule.side_effects:
                    stats["audiencias"] += 1
                stats["ok"] += 1
                log(f"  ✓ [{d['id']}] {assistido_nome[:25]} → {rule.ato} ({rule.prioridade})")
            except Exception as e:
                log(f"  ✗ [{d['id']}] erro: {str(e)[:120]}")
                stats["errors"] += 1

    print_report(stats, counts_ato, args.atribuicao or "TODAS")


def create_manual_review(sb: Supabase, demanda: dict, link: str | None):
    """Modo fallback: cria registro de diligência + marca revisao_pendente."""
    enrichment = demanda.get("enrichment_data") or {}
    tipo_doc = enrichment.get("tipo_documento_pje", "Intimação")
    numero = demanda["processos"]["numero_autos"]

    conteudo = "\n".join(filter(None, [
        "Triagem manual: verificar conteúdo deste expediente no PJe e classificar o ato definitivo.",
        "",
        f"**Tipo do documento (importado):** {tipo_doc}",
        f"**Processo:** {numero}",
        f"**Link direto (login PJe necessário):** {link}" if link else "**Link direto:** ID do documento não capturado",
    ]))

    sb.insert_registro({
        "assistido_id": demanda["assistido_id"],
        "processo_id": demanda["processo_id"],
        "demanda_id": demanda["id"],
        "data_registro": datetime.now().isoformat(),
        "tipo": "diligencia",
        "titulo": "Verificar conteúdo no PJe",
        "conteudo": conteudo,
        "status": "agendado",
        "autor_id": DEFENSOR_ID,
    })
    sb.update_demanda(demanda["id"], {"revisao_pendente": True})


def apply_rule(sb: Supabase, demanda: dict, rule: RuleResult, content: str):
    """Aplica a regra: atualiza ato + cria registro + (opcional) cria audiência."""
    fields: dict = {
        "ato": rule.ato,
        "prioridade": rule.prioridade,
        "revisao_pendente": False,
    }
    if rule.prazo_dias is not None:
        fields["prazo"] = (date.today() + timedelta(days=rule.prazo_dias)).isoformat()

    sb.update_demanda(demanda["id"], fields)

    sb.insert_registro({
        "assistido_id": demanda["assistido_id"],
        "processo_id": demanda["processo_id"],
        "demanda_id": demanda["id"],
        "data_registro": datetime.now().isoformat(),
        "tipo": rule.registro_tipo,
        "titulo": rule.ato,
        "conteudo": (content[:1500] + ("..." if len(content) > 1500 else "")),
        "status": "realizado" if rule.registro_tipo == "ciencia" else "agendado",
        "autor_id": DEFENSOR_ID,
    })

    # Side effects de audiência: extrair data/hora e agendar
    if "agendar_audiencia" in rule.side_effects:
        agendar_audiencia(sb, demanda, rule, content)


def agendar_audiencia(sb: Supabase, demanda: dict, rule: RuleResult, content: str):
    """Extrai data/hora do texto e cria audiência se ainda não existir."""
    # Regex: dia/mes/ano + hora
    m = re.search(r"(\d{1,2})[\s/](?:de\s+)?(\w+|\d{1,2})[\s/](?:de\s+)?(\d{4}).{0,50}?(\d{1,2})[h:](\d{0,2})", normalize(content))
    if not m:
        log(f"    ⚠ não consegui extrair data/hora — registre manualmente")
        return

    # TODO: parsing de mês por extenso, fallback robusto
    log(f"    📅 audiência detectada — criar manualmente em /agenda")


def print_report(stats: dict, counts: dict, atribuicao: str):
    print()
    print(f"=== Varredura — {atribuicao} — {date.today().isoformat()} ===")
    print(f"Total: {stats['ok'] + stats['skipped'] + stats['errors']} "
          f"({stats['ok']} ok, {stats['skipped']} skip, {stats['errors']} erro)")
    print()
    print("Atos atualizados:")
    for ato, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {ato.ljust(40)} {n}")
    print(f"\nAudiências criadas: {stats['audiencias']}")


# ───── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--atribuicao", default=None,
                        choices=["VVD_CAMACARI", "JURI_CAMACARI", "CRIMINAL_CAMACARI", "EXECUCAO_PENAL"])
    parser.add_argument("--since", default=None, help="YYYY-MM-DD (data_expedicao mínima)")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--modo", choices=["direct", "manual-review"], default="direct")
    parser.add_argument("--show", action="store_true", help="mostrar browser (debug)")
    args = parser.parse_args()

    env = load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not sb_url or not sb_key:
        sys.exit("ERRO: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local")

    sb = Supabase(sb_url, sb_key)

    if args.modo == "manual-review":
        # Sem PJe vivo: só marca revisão para todas as demandas alvo
        demandas = sb.list_demandas_triagem(args.atribuicao, args.since, args.limit)
        log(f"Modo manual-review: marcando {len(demandas)} demandas")
        for d in demandas:
            doc_id = d.get("pje_documento_id") or d.get("enrichment_data", {}).get("id_documento_pje")
            link = f"{PJE_BASE}/Processo/ConsultaDocumento/listView.seam?nd={doc_id}" if doc_id else None
            create_manual_review(sb, d, link)
            log(f"  ✓ [{d['id']}] {d['assistidos']['nome'][:30]} ({d['processos']['numero_autos']})")
    else:
        if not env.get("PJE_CPF") or not env.get("PJE_SENHA"):
            sys.exit("ERRO: PJE_CPF/PJE_SENHA ausentes no .env.local")
        asyncio.run(varredura_direct(args, env, sb))


if __name__ == "__main__":
    main()
