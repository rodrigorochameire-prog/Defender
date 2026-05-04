#!/usr/bin/env python3
"""
Varredura da Triagem — OMBUDS × PJe (skill canônica varredura-triagem)

Para cada demanda em 5_TRIAGEM/URGENTE: localiza no painel de expedientes do
PJe, abre Autos Digitais, lê o documento mais informativo da timeline,
classifica via heurísticas (`references/heuristicas-classificacao.md`),
atualiza `ato`/`prioridade`/`prazo` da demanda e cria registro tipado
(ciencia/anotacao/diligencia). NUNCA muda `status`.

Modos
-----
  --modo cdp           Anexa a um Chromium aberto pelo usuário (CDP em :9222)
                       já logado no PJe. Preferido — pula login, menos detecção.
  --modo direct        Inicia Chromium headless do .venv e faz login programático.
  --modo manual-review Sem PJe vivo: cria registro de diligência com link direto
                       pros autos no PJe e marca revisao_pendente=true.

Exemplos
--------
  # Anexa ao Chromium aberto pelo usuário (recomendado)
  python3 varredura_triagem.py --modo cdp --since 2026-05-03

  # Atribuição específica
  python3 varredura_triagem.py --modo cdp --atribuicao VVD_CAMACARI

  # Apenas marca revisão (sem PJe)
  python3 varredura_triagem.py --modo manual-review --since 2026-05-03

Pré-requisitos do modo CDP
--------------------------
  Usuário deve abrir Chromium com flag de debug:
    /Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222
  E logar manualmente no PJe + navegar até EXPEDIENTES > Vara desejada.
  O script anexa a esta sessão (sem novo login, evita bot-detection).

Ambiente
--------
  PJE_CPF, PJE_SENHA (só modo direct)
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Validado em 2026-05-04: 6/10 demandas classificadas automaticamente em rodada
real; restantes ficam em manual-review (com diligência + link).
"""
from __future__ import annotations

import argparse, asyncio, json, os, re, sys, unicodedata, urllib.request, urllib.error
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any

try:
    from patchright.async_api import async_playwright, BrowserContext, Page
except ImportError:
    async_playwright = None  # type: ignore

# ───── Config ────────────────────────────────────────────────────────────────

ENV_PATH = Path("/Users/rodrigorochameire/Projetos/Defender/.env.local")
PJE_BASE = "https://pje.tjba.jus.br/pje"
PANEL_URL = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"
DEFENSOR_ID = 1
RELOGIN_EVERY = 8
CDP_URL = "http://127.0.0.1:9222"
PAGE_LIMIT = 8


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
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def _is_mpu(demanda: dict) -> bool:
    """Espelho de src/lib/mpu.ts isMpu(). Detecta MPU por:
    - processos.processosVvd.tipo_processo == 'MPU'
    - processos.processosVvd.mpu_ativa is True
    - processos.numero_autos começando com 'MPUMP'

    Mapeamento de campo (Supabase snake_case → TS camelCase):
        tipo_processo  → tipoProcesso
        mpu_ativa      → mpuAtiva
        numero_autos   → numeroAutos

    Mantenha em sincronia com src/lib/mpu.ts. Se renomear campos no banco
    ou na query TS, atualize os dois lados.
    """
    proc = demanda.get("processos") or {}
    pvvd_list = proc.get("processosVvd") or []
    # Supabase retorna como list quando 1:n; pegar o primeiro
    pvvd = pvvd_list[0] if isinstance(pvvd_list, list) and pvvd_list else (pvvd_list or {})
    if pvvd.get("tipo_processo") == "MPU":
        return True
    if pvvd.get("mpu_ativa") is True:
        return True
    numero = proc.get("numero_autos") or ""
    if isinstance(numero, str) and numero.startswith("MPUMP"):
        return True
    return False


# ───── Supabase REST ─────────────────────────────────────────────────────────

class Supabase:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
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
            raise RuntimeError(f"{method} {path[:80]} → {e.code}: {err[:300]}")

    def list_demandas(self, atribuicao: str | None, since: str | None, limit: int) -> list[dict]:
        params = [
            "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
            "processos!inner(numero_autos,atribuicao,vara,classe_processual,processosVvd:processos_vvd(tipo_processo,mpu_ativa)),"
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
            params.append(f"created_at=gte.{since}")
        return self._req("GET", "/rest/v1/demandas?" + "&".join(params))

    def update_demanda(self, demanda_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}", fields)

    def insert_registro(self, registro: dict) -> None:
        self._req("POST", "/rest/v1/registros", registro, prefer="return=minimal")

    def update_processo_vvd(self, processo_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/processos_vvd?processo_id=eq.{processo_id}", fields, prefer="return=minimal")


# ───── Classificador ────────────────────────────────────────────────────────

# (pattern, ato, prioridade, prazo_dias, registro_tipo, side_effects, extras)
# Ordem CRÍTICA — primeira regra que casa vence. Princípios:
#   1. Audiências (designar/redesignar) — palavra muito específica, ação clara
#   2. Atos com prazo expresso (resposta, memoriais, alegações, manifestações)
#   3. Despachos com keyword exata
#   4. Acórdão ANTES de sentença (acórdãos contêm referências a sentenças
#      da 1ª instância, então sentença genérica matcharia falso-positivo)
#   5. Sentença com resultado claro (absolv/condeno) ANTES de sentença genérica
#   6. Decisões — específicas antes de genéricas
#   7. Despachos administrativos (juntada, remessa, arquivamento)
RULES_BASE = [
    # ─── 1. Audiências
    (r"sessao de julgamento.{0,30}(tribunal do juri|plenario)",
     "Ciência sessão de julgamento", "ALTA", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "JURI"}),
    (r"(redesigno|redesignada|fica redesignada).{0,40}(audiencia|aij)",
     "Ciência redesignação de audiência", "NORMAL", None, "ciencia", ["reagendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    (r"designada.{0,30}audiencia.{0,15}justificacao",
     "Ciência designação de audiência", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "JUSTIFICACAO"}),
    (r"(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao e julgamento)",
     "Ciência designação de audiência", "NORMAL", None, "ciencia", ["agendar_audiencia"], {"tipo_audiencia": "INSTRUCAO"}),
    # ─── 2. Atos com prazo expresso
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
    # ─── 3. Despachos
    (r"deixo de conhecer|formular em autos proprios",
     "Cumprir despacho", "URGENTE", None, "diligencia", [], {}),
    # ─── 4. Acórdão — PRECISA vir antes de sentença genérica
    #     Detecção robusta: contexto de 2ª instância (câmara/turma/tribunal)
    (r"(acordao|acórdão).{0,500}(improvido|desprovido|nao provido)",
     "Ciência acórdão", "NORMAL", None, "ciencia", [], {}),
    (r"(camara criminal|turma criminal).{0,200}(acordao|acórdão|recurso em sentido estrito)",
     "Analisar acórdão", "URGENTE", 15, "diligencia", [], {}),
    (r"\bacordao\b",
     "Analisar acórdão", "URGENTE", 15, "diligencia", [], {}),
    # ─── 5. Sentença com resultado
    (r"(sentenca|julgo).{0,200}absolv",
     "Ciência absolvição", "NORMAL", None, "ciencia", [], {}),
    (r"(sentenca|julgo).{0,200}condeno",
     "Ciência condenação", "ALTA", None, "ciencia", [], {}),
    # ─── 6. Sentença / decisão genérica
    #     Sentença DEVE estar em contexto de 1ª instância (vara, juiz)
    (r"\bsentenca\b(?!\s+da\s+pron)",  # exclui "sentença da pronúncia" — outra regra cobre
     "Analisar sentença", "URGENTE", 5, "diligencia", [], {}),
    (r"decisao.{0,80}medida protetiv",
     "Ciência de decisão", "NORMAL", None, "ciencia", [], {}),
    (r"\bdecisao\b",
     "Analisar decisão", "NORMAL", None, "diligencia", [], {}),
    # ─── 7. Despachos administrativos / remessa
    (r"encaminha-?se.{0,30}(inquerito|i\.?p\.?).{0,30}(ministerio publico|mp\b)",
     "Ciência", "BAIXA", None, "anotacao", [], {"nota": "Inquérito remetido ao MP — DPE aguarda denúncia"}),
    (r"remessa.{0,30}(ministerio publico|mp\b)",
     "Ciência", "BAIXA", None, "anotacao", [], {"nota": "Remessa ao MP"}),
    (r"juntada de.{0,30}(comprovante|envio)",
     "Ciência", "BAIXA", None, "anotacao", [], {}),
    (r"baixa definitiva|arquivado definitivamente",
     "Ciência", "BAIXA", None, "ciencia", ["marcar_concluido"], {}),
]


# ───── Regras MPU (defensivas — assistido = requerido) ──────────────────────
# Tupla: (pattern, ato, prioridade, prazo_dias, registro_tipo, fase, motivo, side_effects, extras)
# Aplicadas SOMENTE quando is_mpu=True. Sob ótica defensiva do requerido.
# Ver: references/heuristicas-mpu.md
# Constantes em src/lib/mpu-constants.ts (FASE_PROCEDIMENTO, MOTIVO_INTIMACAO).
RULES_MPU = [
    # 1. Audiência de justificação
    (r"design(o|ada).{0,40}audiencia.{0,20}(justifica|aij)",
     "Defesa em audiência de justificação", "URGENTE", 5, "diligencia",
     "audiencia_designada", "ciencia_audiencia",
     ["agendar_audiencia"], {"tipo_audiencia": "JUSTIFICACAO"}),
    # 2. MPU deferida (decisão liminar)
    (r"(deferi|defiro).{0,40}medidas?\s+protetiva",
     "Analisar viabilidade de agravo", "NORMAL", 15, "diligencia",
     "decisao_liminar", "ciencia_decisao_mpu",
     [], {}),
    # 3. Prorrogação/renovação
    (r"(prorrog|renov|manten|continui).{0,30}(medida|mpu|protetiva)",
     "Manifestar contra prorrogação de MPU", "URGENTE", 5, "diligencia",
     "manifestacao_pendente", "manifestar_renovacao",
     [], {}),
    # 4. Pedido de revogação (favorável ao requerido)
    (r"(pedido|requeri|manifest).{0,30}revogac.{0,40}(medida|mpu|protetiva)",
     "Acompanhar pedido de revogação", "BAIXA", None, "anotacao",
     "manifestacao_pendente", "manifestar_revogacao",
     [], {"nota": "Pedido favorável — acompanhar"}),
    # 5. Descumprimento art. 24-A
    (r"(notic|comunic|registro).{0,30}descumpriment",
     "Defesa criminal — descumprimento art. 24-A", "URGENTE", 5, "diligencia",
     "descumprimento_apurado", "manifestar_descumprimento",
     [], {}),
    # 6. Laudo psicossocial
    (r"laudo.{0,20}psicossoci|estudo psicossoci",
     "Manifestar sobre laudo psicossocial", "NORMAL", 10, "diligencia",
     "manifestacao_pendente", "manifestar_laudo",
     [], {}),
    # 7. Modulação
    (r"(modul|redu|alterac).{0,40}(raio|distancia|medida\s+protetiva)",
     "Manifestar sobre modulação de MPU", "NORMAL", 10, "diligencia",
     "manifestacao_pendente", "manifestar_modulacao",
     [], {}),
    # 8. Tornozeleira / monitoramento
    (r"tornozeleira|monitoramento\s+eletronico",
     "Contestar imposição de tornozeleira", "URGENTE", 5, "diligencia",
     "manifestacao_pendente", "manifestar_modulacao",
     [], {}),
    # 9. Fallback genérico para MPU (TOMAR CIÊNCIA, intimação simples)
    (r"tomar ciencia|intimacao",
     "Ciência", "BAIXA", None, "ciencia",
     "manifestacao_pendente", "intimacao_generica",
     [], {}),
]


def _decide_by_titulo(titulo: str, text: str) -> dict | None:
    """Sinal PRIMÁRIO: tipo do documento na timeline do PJe (Acórdão/Sentença/
    Decisão/Despacho/Intimação). Mais confiável que keyword no texto, porque o
    PJe categoriza os docs no upload — evita falso-positivo (ex.: 1ª instância
    citando precedente de acórdão).
    """
    t = normalize(titulo)
    n = normalize(text)
    if "acordao" in t or "acórdão" in t:
        if re.search(r"(improvido|desprovido|nao provido|nego provimento)", n):
            return {"ato": "Ciência acórdão", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        return {"ato": "Analisar acórdão", "prioridade": "URGENTE", "prazo_dias": 15,
                "registro_tipo": "diligencia", "side_effects": [], "extras": {}}
    if "sentenc" in t:
        if re.search(r"absolv", n):
            return {"ato": "Ciência absolvição", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        if re.search(r"condeno|condenacao", n):
            return {"ato": "Ciência condenação", "prioridade": "ALTA", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        if re.search(r"impronunci|improvinci", n):
            return {"ato": "Ciência da impronúncia", "prioridade": "ALTA", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        if re.search(r"\bpronunci(o|a)\b", n):
            return {"ato": "Ciência da pronúncia", "prioridade": "ALTA", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        return {"ato": "Analisar sentença", "prioridade": "URGENTE", "prazo_dias": 5,
                "registro_tipo": "diligencia", "side_effects": [], "extras": {}}
    if "decis" in t:
        # Designação de audiência tem prioridade (mesmo dentro de "Decisão")
        if re.search(r"(designo|designada|fica designada).{0,40}(audiencia|aij)", n):
            return {"ato": "Ciência designação de audiência", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": ["agendar_audiencia"], "extras": {"tipo_audiencia": "INSTRUCAO"}}
        if re.search(r"(redesigno|redesignada).{0,40}(audiencia|aij)", n):
            return {"ato": "Ciência redesignação de audiência", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": ["reagendar_audiencia"], "extras": {}}
        if re.search(r"medida protetiv", n):
            return {"ato": "Ciência de decisão", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
        return {"ato": "Analisar decisão", "prioridade": "NORMAL", "prazo_dias": None,
                "registro_tipo": "diligencia", "side_effects": [], "extras": {}}
    if "despac" in t:
        if re.search(r"deixo de conhecer|formular em autos proprios", n):
            return {"ato": "Cumprir despacho", "prioridade": "URGENTE", "prazo_dias": None,
                    "registro_tipo": "diligencia", "side_effects": [], "extras": {}}
        # Despachos administrativos comuns
        if re.search(r"encaminha-?se.{0,30}(inquerito|i\.?p\.?).{0,30}(ministerio publico|mp\b)", n):
            return {"ato": "Ciência", "prioridade": "BAIXA", "prazo_dias": None,
                    "registro_tipo": "anotacao", "side_effects": [], "extras": {"nota": "Inquérito remetido ao MP"}}
        if re.search(r"(designo|designada|fica designada).{0,40}(audiencia|aij)", n):
            return {"ato": "Ciência designação de audiência", "prioridade": "NORMAL", "prazo_dias": None,
                    "registro_tipo": "ciencia", "side_effects": ["agendar_audiencia"], "extras": {}}
        return None  # despacho genérico — fallback texto
    return None  # outros tipos: fallback texto


def _decide_by_titulo_mpu(titulo: str, text: str) -> dict | None:
    """Variante MPU: prioriza tipo de doc + lógica defensiva.
    Ver references/heuristicas-mpu.md.
    """
    t = normalize(titulo)
    n = normalize(text)
    if "decis" in t or "sentenc" in t:
        # Audiência justificação — antes de outras regras
        if re.search(r"design(o|ada).{0,40}audiencia.{0,20}(justifica|aij)", n):
            return {"ato": "Defesa em audiência de justificação", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "audiencia_designada", "motivo": "ciencia_audiencia",
                    "side_effects": ["agendar_audiencia"], "extras": {"tipo_audiencia": "JUSTIFICACAO"}}
        # Tornozeleira — tem peso de urgência
        if re.search(r"tornozeleira|monitoramento\s+eletronico", n):
            return {"ato": "Contestar imposição de tornozeleira", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "manifestacao_pendente", "motivo": "manifestar_modulacao",
                    "side_effects": [], "extras": {}}
        # Descumprimento
        if re.search(r"(notic|comunic|registro).{0,30}descumpriment", n):
            return {"ato": "Defesa criminal — descumprimento art. 24-A", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "descumprimento_apurado", "motivo": "manifestar_descumprimento",
                    "side_effects": [], "extras": {}}
        # MPU deferida
        if re.search(r"(deferi|defiro).{0,40}medidas?\s+protetiva", n):
            return {"ato": "Analisar viabilidade de agravo", "prioridade": "NORMAL",
                    "prazo_dias": 15, "registro_tipo": "diligencia",
                    "fase": "decisao_liminar", "motivo": "ciencia_decisao_mpu",
                    "side_effects": [], "extras": {}}
    if "intimac" in t or "tomar ciencia" in n:
        # Prorrogação — antes de fallback
        if re.search(r"(prorrog|renov|manten).{0,30}(medida|mpu|protetiva)", n):
            return {"ato": "Manifestar contra prorrogação de MPU", "prioridade": "URGENTE",
                    "prazo_dias": 5, "registro_tipo": "diligencia",
                    "fase": "manifestacao_pendente", "motivo": "manifestar_renovacao",
                    "side_effects": [], "extras": {}}
    return None  # fallback para RULES_MPU em classify()


def classify(text: str, titulo: str | None = None, is_mpu: bool = False) -> dict | None:
    """Classifica usando (a) título do doc + (b) regras textuais como fallback.

    Quando is_mpu=True, RULES_MPU vem antes de RULES_BASE — ótica defensiva
    do requerido. Ver references/heuristicas-mpu.md.
    """
    n = normalize(text)
    if is_mpu:
        if titulo:
            r = _decide_by_titulo_mpu(titulo, text)
            if r:
                return r
        for pat, ato, prio, prazo, tipo, fase, motivo, fx, ex in RULES_MPU:
            if re.search(pat, n):
                return {"ato": ato, "prioridade": prio, "prazo_dias": prazo,
                        "registro_tipo": tipo, "fase": fase, "motivo": motivo,
                        "side_effects": fx, "extras": ex}
        # se MPU mas nada matcheou, cai no RULES_BASE como último recurso
    if titulo:
        r = _decide_by_titulo(titulo, text)
        if r:
            return r
    for pat, ato, prio, prazo, tipo, fx, ex in RULES_BASE:
        if re.search(pat, n):
            return {
                "ato": ato, "prioridade": prio, "prazo_dias": prazo,
                "registro_tipo": tipo, "side_effects": fx, "extras": ex,
            }
    return None


# ───── PJe scraping helpers ──────────────────────────────────────────────────

# Selectors críticos (validados 2026-05-04):
TBODY_ID = "formExpedientes:tbExpedientes:tb"

JS_RESET_TO_PAGE_1 = r"""() => {
  // Tenta «« primeiro, fallback para clicar '1'
  const first = Array.from(document.querySelectorAll('.rich-datascr-button'))
    .find(b => b.textContent.trim() === '««' && !b.className.includes('dsbld'));
  if (first) { first.click(); return 'first'; }
  const one = Array.from(document.querySelectorAll('.rich-datascr-inact'))
    .find(el => el.textContent.trim() === '1');
  if (one) { one.click(); return 'one'; }
  return 'noop';
}"""

JS_FIND_BY_DOC_ID = r"""(target) => {
  const tbody = document.getElementById('formExpedientes:tbExpedientes:tb');
  if (!tbody) return null;
  for (const row of tbody.querySelectorAll('tr.rich-table-row')) {
    const m = row.innerHTML.match(/formExpedientes:tbExpedientes:(\d+):/);
    if (m && m[1] === target) {
      const a = row.querySelector('a[title="Autos Digitais"]');
      if (a) {
        const oc = a.getAttribute('onclick') || '';
        const m2 = oc.match(/window\.open\('([^']+)'/);
        return m2 ? m2[1] : null;
      }
    }
  }
  return null;
}"""

JS_FIND_BY_PROCESSO = r"""(numero) => {
  const tbody = document.getElementById('formExpedientes:tbExpedientes:tb');
  if (!tbody) return null;
  for (const row of tbody.querySelectorAll('tr.rich-table-row')) {
    const a = row.querySelector('a[title="Autos Digitais"]');
    if (a && a.textContent.includes(numero)) {
      const oc = a.getAttribute('onclick') || '';
      const m = oc.match(/window\.open\('([^']+)'/);
      return m ? m[1] : null;
    }
  }
  return null;
}"""

JS_GOTO_PAGE = r"""(target) => {
  const items = Array.from(document.querySelectorAll('.rich-datascr-inact'));
  const next = items.find(el => el.textContent.trim() === String(target));
  if (next) { next.click(); return true; }
  return false;
}"""

JS_READ_TIMELINE = r"""() => {
  const seen = new Set(); const items = [];
  for (const a of document.querySelectorAll('a')) {
    const t = (a.textContent || '').trim();
    const m = t.match(/^(\d{7,})\s*-\s*(.+?)(?:\s*\(.*)?$/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      items.push({id: m[1], titulo: m[2].trim().slice(0, 80)});
    }
  }
  return items.slice(0, 30);
}"""

JS_CLICK_TIMELINE_ITEM = r"""(target) => {
  for (const a of document.querySelectorAll('a')) {
    const t = (a.textContent || '').trim();
    const m = t.match(/^(\d{7,})\s*-/);
    if (m && m[1] === target) { a.click(); return true; }
  }
  return false;
}"""


async def reset_panel_to_page_1(page: Page) -> None:
    await page.evaluate(JS_RESET_TO_PAGE_1)
    await asyncio.sleep(2.5)


async def find_in_panel(page: Page, doc_id: str | None, processo_numero: str) -> str | None:
    """Busca o expediente no painel — primeiro por doc_id (mais preciso),
    depois fallback por número do processo. Itera páginas 1..PAGE_LIMIT."""
    await reset_panel_to_page_1(page)
    for pg_num in range(1, PAGE_LIMIT + 1):
        if doc_id:
            url = await page.evaluate(JS_FIND_BY_DOC_ID, doc_id)
            if url:
                return url
        url = await page.evaluate(JS_FIND_BY_PROCESSO, processo_numero)
        if url:
            return url
        # próxima página
        ok = await page.evaluate(JS_GOTO_PAGE, pg_num + 1)
        if not ok:
            return None
        await asyncio.sleep(2.5)
    return None


PRIORITY_TIMELINE = ["acordao", "acórdão", "sentenc", "decis", "despac", "manifesta", "intima"]


async def read_doc_content(ctx: BrowserContext, autos_url: str) -> dict:
    """Abre autos digitais e tenta ler o conteúdo mais informativo. Lê iframe
    default; depois itera candidatos relevantes da timeline e fica com o maior."""
    full = f"https://pje.tjba.jus.br{autos_url}" if autos_url.startswith("/") else autos_url
    autos = await ctx.new_page()
    try:
        await autos.goto(full, wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(4)

        async def read_iframe() -> str:
            for f in autos.frames:
                if f.name == "frameHtml" or "downloadBinario" in (f.url or ""):
                    try:
                        return await f.evaluate("() => document.body ? document.body.innerText : ''")
                    except Exception:
                        return ""
            return ""

        default_text = await read_iframe()
        timeline = await autos.evaluate(JS_READ_TIMELINE)

        # Candidatos por prioridade semântica
        candidates: list[dict] = []
        for prio in PRIORITY_TIMELINE:
            for it in timeline:
                if prio in normalize(it["titulo"]) and it not in candidates:
                    candidates.append(it)

        best_text = default_text
        best_id = None
        for cand in candidates[:6]:
            try:
                clicked = await autos.evaluate(JS_CLICK_TIMELINE_ITEM, cand["id"])
                if not clicked:
                    continue
                await asyncio.sleep(3)
                txt = await read_iframe()
                if len(txt) > len(best_text):
                    best_text = txt
                    best_id = cand["id"]
            except Exception:
                pass

        return {
            "text": best_text,
            "default_len": len(default_text),
            "best_len": len(best_text),
            "best_id": best_id,
            "timeline": timeline[:8],
        }
    finally:
        await autos.close()


# ───── Pipeline ──────────────────────────────────────────────────────────────

def create_manual_review(sb: Supabase, demanda: dict) -> None:
    """Modo fallback: registro de diligência + revisao_pendente=true."""
    enrichment = demanda.get("enrichment_data") or {}
    tipo_doc = enrichment.get("tipo_documento_pje", "Intimação")
    doc_id = demanda.get("pje_documento_id") or enrichment.get("id_documento_pje")
    numero = demanda["processos"]["numero_autos"]
    link = f"{PJE_BASE}/Processo/ConsultaDocumento/listView.seam?nd={doc_id}" if doc_id else None

    conteudo = "\n".join(filter(None, [
        "Triagem manual: verificar conteúdo deste expediente no PJe e classificar o ato definitivo.",
        "",
        f"**Tipo do documento (importado):** {tipo_doc}",
        f"**Processo:** {numero}",
        f"**Link direto (login PJe necessário):** {link}" if link else "**Link direto:** ID do documento não capturado no import — buscar no PJe pelo número do processo",
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


def apply_classification(sb: Supabase, demanda: dict, rule: dict, content: str) -> None:
    fields: dict = {
        "ato": rule["ato"],
        "prioridade": rule["prioridade"],
        "revisao_pendente": False,
    }
    if rule["prazo_dias"] is not None:
        fields["prazo"] = (date.today() + timedelta(days=rule["prazo_dias"])).isoformat()
    sb.update_demanda(demanda["id"], fields)

    # Atualiza processos_vvd quando a regra MPU traz fase/motivo (Plano 1 da reforma).
    # Falha não interrompe — registro principal e demanda já foram salvos.
    fase = rule.get("fase")
    motivo = rule.get("motivo")
    proc_id = demanda.get("processo_id")
    if (fase or motivo) and proc_id:
        pvvd_fields: dict = {}
        if fase:
            pvvd_fields["fase_procedimento"] = fase
        if motivo:
            pvvd_fields["motivo_ultima_intimacao"] = motivo
        try:
            sb.update_processo_vvd(proc_id, pvvd_fields)
        except Exception as e:
            log(f"  ⚠ falha ao atualizar processos_vvd (proc_id={proc_id}): {e}")

    sb.insert_registro({
        "assistido_id": demanda["assistido_id"],
        "processo_id": demanda["processo_id"],
        "demanda_id": demanda["id"],
        "data_registro": datetime.now().isoformat(),
        "tipo": rule["registro_tipo"],
        "titulo": rule["ato"],
        "conteudo": (content[:1500] + ("..." if len(content) > 1500 else "")) or "(sem conteúdo lido)",
        "status": "realizado" if rule["registro_tipo"] == "ciencia" else "agendado",
        "autor_id": DEFENSOR_ID,
    })


async def varredura(sb: Supabase, demandas: list[dict], modo: str, env: dict[str, str]):
    if async_playwright is None:
        sys.exit("ERRO: patchright não instalado — ative .venv do enrichment-engine")

    stats = {"ok": 0, "manual": 0, "not_found": 0, "errors": 0}
    counts: dict[str, int] = {}

    async with async_playwright() as p:
        if modo == "cdp":
            try:
                browser = await p.chromium.connect_over_cdp(CDP_URL)
                ctx = browser.contexts[0]
                # Procurar a página do painel
                page = next((pg for pg in ctx.pages if "advogado.seam" in pg.url), None)
                if not page:
                    sys.exit(f"ERRO: nenhuma aba aberta em {PANEL_URL} no Chromium CDP. Abra o painel do PJe primeiro.")
                log(f"CDP attached — {len(ctx.pages)} abas, painel em {page.url[:60]}")
            except Exception as e:
                sys.exit(f"ERRO CDP: {e}\nDica: lance Chromium com --remote-debugging-port=9222")
        else:  # direct
            browser = await p.chromium.launch(headless=True)
            ctx = await browser.new_context(ignore_https_errors=True)
            page = await ctx.new_page()
            log("Login programático no PJe...")
            await page.goto(f"{PJE_BASE}/login.seam", wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_selector("input[name=username]", timeout=15000)
            await page.fill("input[name=username]", env["PJE_CPF"])
            await page.fill("input[name=password]", env["PJE_SENHA"])
            await page.click("input[type=submit]")
            await page.wait_for_url(re.compile(r"advogado\.seam"), timeout=30000)
            # User precisa pré-navegar até EXPEDIENTES > vara desejada antes de
            # rodar o script. Modo direct não faz isso automaticamente ainda.
            log(f"  ⚠ modo direct: navegue manualmente até EXPEDIENTES > Vara")
            await asyncio.sleep(5)

        for i, d in enumerate(demandas):
            doc_id = d.get("pje_documento_id") or d.get("enrichment_data", {}).get("id_documento_pje")
            doc_id = str(doc_id) if doc_id else None
            assistido = d["assistidos"]["nome"][:30]
            numero = d["processos"]["numero_autos"]
            log(f"[{i+1}/{len(demandas)}] {assistido} | {numero}")

            try:
                autos_url = await find_in_panel(page, doc_id, numero)
                if not autos_url:
                    log(f"  ⚠ não encontrado no painel — fallback manual-review")
                    create_manual_review(sb, d)
                    stats["not_found"] += 1
                    continue

                content = await read_doc_content(ctx, autos_url)
                # Buscar título do "best item" da timeline pra classify
                best_titulo = None
                if content.get("best_id"):
                    for it in content.get("timeline", []):
                        if it.get("id") == content["best_id"]:
                            best_titulo = it.get("titulo")
                            break
                is_mpu_demanda = _is_mpu(d)
                if is_mpu_demanda:
                    log(f"  [MPU] detectado — usando regras defensivas")
                rule = classify(content["text"], titulo=best_titulo, is_mpu=is_mpu_demanda)
                if not rule:
                    log(f"  → sem match (default={content['default_len']}b best={content['best_len']}b) — manual-review")
                    create_manual_review(sb, d)
                    stats["manual"] += 1
                    continue

                apply_classification(sb, d, rule, content["text"])
                counts[rule["ato"]] = counts.get(rule["ato"], 0) + 1
                stats["ok"] += 1
                log(f"  ✓ {rule['ato']} ({rule['prioridade']})")
            except Exception as e:
                log(f"  ✗ erro: {str(e)[:160]}")
                stats["errors"] += 1

    print_report(stats, counts)


def print_report(stats: dict, counts: dict) -> None:
    print()
    print(f"=== Relatório varredura — {date.today().isoformat()} ===")
    total = sum(stats.values())
    print(f"Total: {total} | OK: {stats['ok']} | manual-review: {stats['manual']} | "
          f"não no painel: {stats['not_found']} | erros: {stats['errors']}")
    if counts:
        print("\nAtos atribuídos:")
        for ato, n in sorted(counts.items(), key=lambda x: -x[1]):
            print(f"  {ato:.<40} {n}")


# ───── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--atribuicao", default=None,
                        choices=["VVD_CAMACARI", "JURI_CAMACARI", "CRIMINAL_CAMACARI", "EXECUCAO_PENAL"])
    parser.add_argument("--since", default=None, help="YYYY-MM-DD (created_at mínima)")
    parser.add_argument("--limit", type=int, default=80)
    parser.add_argument("--modo", choices=["cdp", "direct", "manual-review"], default="cdp",
                        help="cdp=anexa Chromium aberto pelo usuário; direct=launcha headless; manual-review=só registra diligência")
    args = parser.parse_args()

    env = load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        sys.exit("ERRO: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")

    sb = Supabase(sb_url, sb_key)
    demandas = sb.list_demandas(args.atribuicao, args.since, args.limit)
    print(f"[varredura] alvo: {len(demandas)} demandas em triagem")

    if args.modo == "manual-review":
        for d in demandas:
            create_manual_review(sb, d)
            print(f"  ✓ [{d['id']}] {d['assistidos']['nome'][:30]} ({d['processos']['numero_autos']})")
        return

    if args.modo == "direct" and (not env.get("PJE_CPF") or not env.get("PJE_SENHA")):
        sys.exit("ERRO: modo direct precisa PJE_CPF/PJE_SENHA no .env.local")

    asyncio.run(varredura(sb, demandas, args.modo, env))


if __name__ == "__main__":
    main()
