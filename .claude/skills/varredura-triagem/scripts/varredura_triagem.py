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

# Parsers determinísticos (mesma pasta; stdlib puro — sem playwright).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from designacao_parse import (  # noqa: E402
    detectar_designacao_audiencia, extrair_movimentos_audiencia,
)
from mpu_parse import parse_decisao_mpu  # noqa: E402
from seeu_expediente import read_seeu_expediente  # noqa: E402  # leitor EP/SEEU (Task 2)

# ───── Config ────────────────────────────────────────────────────────────────

ENV_PATH = Path("/Users/rodrigorochameire/Projetos/Defender/.env.local")
PJE_BASE = "https://pje.tjba.jus.br/pje"
PANEL_URL = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"
DEFENSOR_ID = 1
RELOGIN_EVERY = 8

# Colunas/embeds PostgREST das demandas — fonte única usada por list_demandas
# E build_by_ids_params, garantindo que os dois modos puxem o mesmo shape.
_DEMANDA_SELECT = (
    "select=id,ato,assistido_id,processo_id,enrichment_data,pje_documento_id,"
    "processos!inner(numero_autos,atribuicao,vara,classe_processual,processosVvd:processos_vvd(tipo_processo,mpu_ativa)),"
    "assistidos!inner(nome)"
)
CDP_URL = "http://127.0.0.1:9222"
PAGE_LIMIT = 8

# Navegação em árvore do painel (situação → comarca → vara), portada do worker de
# import (pje_intimacoes_import.py) — validada ao vivo. find_in_panel SÓ acha os
# docs se o painel estiver navegado até a vara; por isso navegamos antes do loop.
SITUACAO_PADRAO = "Pendentes de ciência ou de resposta"
ATRIB_UNIDADE: dict[str, tuple[str, str]] = {
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
    "EXECUCAO_PENAL": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}


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


# Linhas de puro cabeçalho/rodapé/formatação do PJe — removidas antes de classificar,
# resumir (IA) e parsear medidas. NÃO removem keywords jurídicas (designo, defiro,
# sentença, condeno, medida protetiva…), só boilerplate.
_BOILER = [
    "poder judiciario", "tribunal de justica", "estado da bahia", "coordenadoria",
    "secretaria", "assinado eletronicamente", "documento assinado", "autenticidade",
    "codigo verificador", "chave de acesso", "diario da justica", "diario eletronico",
    "diario oficial", "consulte a autenticidade", "validacao do documento",
    "https://", "http://", "www.", "cep:", "cep ", "telefone:", "e-mail:", "email:",
    "endereco:", "forum ", "comarca de camacari -", "pagina ",
]
_BOILER_RE = [__import__("re").compile(p) for p in _BOILER]
_DISPOSITIVO_RE = __import__("re").compile(
    r"(ante o exposto|isto posto|posto isso|diante do exposto|do exposto|dispositiv|\bdecido\b|\bdefiro\b|\bdefere\b|\bjulgo\b|\bresolve\b|pelo exposto)",
    __import__("re").IGNORECASE,
)


def _clean_decisao_text(text: str, budget: int = 12000) -> str:
    """Limpa o texto da decisão: remove linhas de cabeçalho/rodapé/formatação,
    colapsa espaços; se exceder `budget`, mantém o início (contexto) + o DISPOSITIVO
    (parte operativa, em geral perto do fim) para não cortar o que importa."""
    if not text:
        return ""
    import re as _re
    keep = []
    for ln in text.split("\n"):
        s = ln.strip()
        if not s:
            keep.append("")
            continue
        low = normalize(s)
        # números soltos (paginação) ou linha que é só boilerplate
        if _re.fullmatch(r"\d{1,4}", s) or any(r.search(low) for r in _BOILER_RE):
            continue
        keep.append(s)
    cleaned = _re.sub(r"\n{3,}", "\n\n", "\n".join(keep)).strip()
    if len(cleaned) <= budget:
        return cleaned
    m = _DISPOSITIVO_RE.search(cleaned)
    if m and m.start() > budget * 0.4:
        head = cleaned[: int(budget * 0.45)].rstrip()
        disp = cleaned[m.start():]
        return (head + "\n\n[…trecho intermediário omitido…]\n\n" + disp)[:budget]
    return cleaned[:budget]


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
    # Classe da INTIMAÇÃO (ex.: "MPUMPCrim") — captura MPU dentro de processo AP.
    intim = (demanda.get("enrichment_data") or {}).get("tipo_processo") or ""
    if isinstance(intim, str) and intim.upper().startswith("MPU"):
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
            _DEMANDA_SELECT,
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

    def list_demandas_by_ids(self, ids: list[int]) -> list[dict]:
        params = build_by_ids_params(ids, DEFENSOR_ID)
        return self._req("GET", "/rest/v1/demandas?" + "&".join(params))

    def update_demanda(self, demanda_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/demandas?id=eq.{demanda_id}", fields)

    def insert_registro(self, registro: dict) -> None:
        self._req("POST", "/rest/v1/registros", registro, prefer="return=minimal")

    def registro_exists(self, demanda_id: int, titulo: str) -> bool:
        """True se já há um registro para esta demanda com este título — evita
        duplicar quando a varredura roda de novo sobre a mesma triagem
        (idempotência: a análise NÃO muda o status da demanda, então ela
        reaparece na lista em reexecuções)."""
        from urllib.parse import quote
        rows = self._req(
            "GET",
            f"/rest/v1/registros?demanda_id=eq.{demanda_id}"
            f"&titulo=eq.{quote(titulo)}&select=id&limit=1",
        )
        return bool(rows)

    def update_processo_vvd(self, processo_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/processos_vvd?processo_id=eq.{processo_id}", fields, prefer="return=minimal")

    def upsert_processo_vvd(self, processo_id: int, fields: dict) -> int | None:
        """Atualiza a linha de processos_vvd; se não existir, cria (insert mínimo:
        processo_id + tipo_processo='MPU' + fields). Retorna o id da linha (=
        processo_vvd_id, usado pela tabela medidas_mpu). requerido/requerente são
        opcionais no schema (processos_vvd via importação)."""
        rows = self._req("GET", f"/rest/v1/processos_vvd?processo_id=eq.{processo_id}&select=id&limit=1")
        if isinstance(rows, list) and rows:
            self._req("PATCH", f"/rest/v1/processos_vvd?processo_id=eq.{processo_id}", fields, prefer="return=minimal")
            return rows[0]["id"]
        r = self._req("POST", "/rest/v1/processos_vvd",
                      {"processo_id": processo_id, "tipo_processo": "MPU", **fields},
                      prefer="return=representation")
        return r[0]["id"] if isinstance(r, list) and r else None

    def insert_medidas_mpu(self, processo_vvd_id: int, medidas: list[dict]) -> int:
        """Insere medidas na tabela `medidas_mpu` (a que o painel MedidasVigentes
        exibe), 1 linha por medida. Idempotente: não duplica códigos já gravados
        para este processo_vvd. origem='varredura'."""
        existing = self._req("GET", f"/rest/v1/medidas_mpu?processo_vvd_id=eq.{processo_vvd_id}&select=codigo")
        have = {m["codigo"] for m in existing} if isinstance(existing, list) else set()
        novos = []
        for m in medidas:
            if m["codigo"] in have:
                continue
            # Chaves UNIFORMES em todas as linhas (PostgREST bulk exige isso).
            novos.append({
                "processo_vvd_id": processo_vvd_id,
                "codigo": m["codigo"],
                "artigo": m.get("artigo"),
                "distancia_metros": m.get("distancia_metros"),
                "parametros": ({"protegidos": m["protegidos"]} if m.get("protegidos") else None),
                "literal": (m.get("literal") or "")[:1000],
                "status": "ativa",
                "origem": "varredura",
            })
        if novos:
            self._req("POST", "/rest/v1/medidas_mpu", novos, prefer="return=minimal")
        return len(novos)

    def revogar_medidas_mpu(self, processo_vvd_id: int, codigos: list[str] | None = None) -> int:
        """Marca medidas como `status='revogada'` (+ data_revogacao=hoje) na tabela
        `medidas_mpu`. Se `codigos` é None → revoga TODAS as medidas ATIVAS do
        processo_vvd (revogação total). Se é lista → revoga só esses códigos.
        Idempotente: o filtro `status=eq.ativa` garante que medidas já revogadas
        NÃO são rebaixadas/retocadas. Retorna o nº de linhas afetadas."""
        from urllib.parse import quote
        path = (f"/rest/v1/medidas_mpu?processo_vvd_id=eq.{processo_vvd_id}"
                "&status=eq.ativa")
        if codigos:
            lista = ",".join(quote(str(c)) for c in codigos)
            path += f"&codigo=in.({lista})"
        body = {"status": "revogada", "data_revogacao": date.today().isoformat()}
        rows = self._req("PATCH", path, body, prefer="return=representation")
        return len(rows) if isinstance(rows, list) else 0

    def get_registro_by_titulo(self, demanda_id: int, titulo: str) -> dict | None:
        from urllib.parse import quote
        rows = self._req(
            "GET",
            f"/rest/v1/registros?demanda_id=eq.{demanda_id}&titulo=eq.{quote(titulo)}"
            "&select=id,enrichment_status&limit=1",
        )
        return rows[0] if isinstance(rows, list) and rows else None

    def update_registro(self, registro_id: int, fields: dict) -> None:
        self._req("PATCH", f"/rest/v1/registros?id=eq.{registro_id}", fields, prefer="return=minimal")

    def insert_registro_returning(self, registro: dict) -> int | None:
        """Insere e retorna o id (para vincular audiencia_id no registro base)."""
        rows = self._req("POST", "/rest/v1/registros", registro, prefer="return=representation")
        return rows[0]["id"] if isinstance(rows, list) and rows else None

    def link_registro_audiencia(self, registro_id: int, audiencia_id: int) -> None:
        self._req("PATCH", f"/rest/v1/registros?id=eq.{registro_id}",
                  {"audiencia_id": audiencia_id}, prefer="return=minimal")

    def audiencia_exists(self, processo_id: int, data_ymd: str, tipo: str) -> bool:
        """Idempotência: já há audiência do mesmo processo+tipo NO MESMO DIA?
        Usa range de data (robusto a fuso/hora) em vez de timestamp exato."""
        from urllib.parse import quote
        rows = self._req(
            "GET",
            f"/rest/v1/audiencias?processo_id=eq.{processo_id}"
            f"&tipo=eq.{quote(tipo[:50])}"
            f"&data_audiencia=gte.{data_ymd}T00:00:00&data_audiencia=lte.{data_ymd}T23:59:59"
            f"&select=id&limit=1",
        )
        return bool(rows)

    def insert_audiencia(self, aud: dict) -> int | None:
        rows = self._req("POST", "/rest/v1/audiencias", aud, prefer="return=representation")
        return rows[0]["id"] if isinstance(rows, list) and rows else None

    def cancel_audiencias_abertas(self, processo_id: int, tipo: str) -> int:
        """Redesignação: cancela audiências ABERTAS (agendada) do MESMO tipo do
        processo — não todas (um processo pode ter várias audiências futuras)."""
        from urllib.parse import quote
        rows = self._req(
            "PATCH",
            f"/rest/v1/audiencias?processo_id=eq.{processo_id}"
            f"&tipo=eq.{quote(tipo[:50])}&status=eq.agendada",
            {"status": "cancelada"}, prefer="return=representation",
        )
        return len(rows) if isinstance(rows, list) else 0

    def get_assistido_contato(self, assistido_id: int) -> dict | None:
        rows = self._req(
            "GET",
            f"/rest/v1/assistidos?id=eq.{assistido_id}"
            "&select=telefone,telefone_contato,nome_contato,parentesco_contato&limit=1",
        )
        return rows[0] if isinstance(rows, list) and rows else None

    def enqueue_ai_task(self, skill: str, demanda_ids: list[int], created_by: int) -> int | None:
        """Enfileira uma task lane=ai (claude_code_tasks) para o daemon Max."""
        rows = self._req("POST", "/rest/v1/claude_code_tasks", {
            "skill": skill, "lane": "ai", "status": "pending", "etapa": "Na fila",
            "created_by": created_by,
            "prompt": f"Enriquecer análise de {len(demanda_ids)} intimação(ões)",
            "instrucao_adicional": json.dumps({"demanda_ids": demanda_ids}),
        }, prefer="return=representation")
        return rows[0]["id"] if isinstance(rows, list) and rows else None


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
    (r"(nomeada a defensoria|vistas? a dpe|apresent\w*|ofereca|oferec\w*).{0,80}resposta a acusacao"
     r"|resposta a acusacao.{0,40}(\d+\s*dias|prazo|arts?\.?\s*396)"
     r"|arts?\.?\s*396(-?a)?\b",
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
    # ─── 5b. Júri pós-pronúncia (gatilho específico: art. 422 / plenário) ─────
    #     Valem p/ qualquer atribuição, mas só disparam com keyword específica;
    #     vêm ANTES das regras genéricas de decisão para não cair em "Analisar
    #     decisão". Impronúncia NÃO entra aqui (não se força RESE — réu não recorre
    #     da própria impronúncia; só contrarrazões se o MP recorrer).
    (r"(preclu|transitad).{0,40}pronuncia|art\.?\s*422|fase.{0,15}422|diligencias.{0,20}(plenario|422)",
     "Diligências do 422", "ALTA", 5, "diligencia", [], {}),
    (r"rol.{0,20}testemunhas.{0,20}plenario|prepara.{0,20}plenario",
     "Diligências do 422", "ALTA", 5, "diligencia", [], {}),
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


# ───── Regras Execução Penal (atribuicao = EXECUCAO_PENAL) ───────────────────
# Mesmo formato de RULES_BASE: (pattern, ato, prioridade, prazo_dias,
# registro_tipo, side_effects, extras). Texto NORMALIZADO (sem acento, minúsculo).
# Primeira regra que casa vence. Aplicadas ANTES de RULES_BASE quando a
# atribuição é Execução Penal; se nenhuma casar → fallback p/ RULES_BASE.
# Atos espelham src/config/atos-por-atribuicao.ts (Execução Penal). Ver
# references/fluxo-atos-por-atribuicao.md.
RULES_EP = [
    (r"extin(c|ç).{0,20}punibilidade|pena.{0,10}cumprida|prescri(c|ç)",
     "Extinção da punibilidade", "ALTA", 5, "diligencia", [], {}),
    (r"reconvers",
     "Manifestação contra reconversão", "ALTA", 5, "diligencia", [], {}),
    (r"regress.{0,20}regime|falta grave",
     "Manifestação contra regressão", "URGENTE", 5, "diligencia", [], {}),
    (r"rescis.{0,20}anpp|descumpr.{0,20}anpp",
     "Impugnação à rescisão de ANPP", "URGENTE", 5, "diligencia", [], {}),
    (r"sursis",
     "Alteração de condição do SURSIS", "NORMAL", 5, "diligencia", [], {}),
    (r"livramento condicional",
     "Livramento condicional", "NORMAL", 5, "diligencia", [], {}),
    (r"remi(c|ç)",
     "Remição de pena", "NORMAL", 5, "diligencia", [], {}),
    (r"progress.{0,20}regime|requisit.{0,20}progress|calculo.{0,15}pena|atestado.{0,15}pena",
     "Requerimento de progressão", "NORMAL", 5, "diligencia", [], {}),
    (r"sa(i|í)da tempor",
     "Saída temporária", "NORMAL", 5, "diligencia", [], {}),
    (r"permiss.{0,15}sa(i|í)da",
     "Permissão de saída", "NORMAL", 5, "diligencia", [], {}),
    (r"prisao domiciliar|domiciliar",
     "Prisão domiciliar", "URGENTE", 5, "diligencia", [], {}),
    (r"indulto|comuta(c|ç)",
     "Indulto", "ALTA", 5, "diligencia", [], {}),
    (r"transfer.{0,20}(unidade|autos|presidio)",
     "Transferência de unidade", "NORMAL", 5, "diligencia", [], {}),
    # fallback EP: decisão genérica de execução → analisar; senão None → RULES_BASE
    (r"\bdecisao\b",
     "Analisar decisão", "NORMAL", None, "diligencia", [], {}),
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
    # ─── Tipos que dispensam leitura de corpo (classificados pelo TÍTULO) ──────
    # Em geral PDFs/atos informativos cujo corpo não é legível como texto. Sem o
    # corpo, o título é o sinal possível — Ciência coarse; o defensor revisa no
    # card e abre os autos se precisar agir. Melhor que manual-review cego.
    if "ata da audiencia" in t or t.startswith("ata "):
        return {"ato": "Ciência de ata de audiência", "prioridade": "NORMAL", "prazo_dias": None,
                "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
    if "ato ordinat" in t:
        return {"ato": "Cumprir ato ordinatório", "prioridade": "NORMAL", "prazo_dias": None,
                "registro_tipo": "diligencia", "side_effects": [], "extras": {}}
    if "edital" in t:
        return {"ato": "Ciência de edital", "prioridade": "BAIXA", "prazo_dias": None,
                "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
    if "mandado" in t:
        return {"ato": "Ciência de mandado", "prioridade": "BAIXA", "prazo_dias": None,
                "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
    if "certid" in t:
        return {"ato": "Ciência", "prioridade": "BAIXA", "prazo_dias": None,
                "registro_tipo": "anotacao", "side_effects": [], "extras": {}}
    if "peticao" in t:
        return {"ato": "Ciência de petição", "prioridade": "BAIXA", "prazo_dias": None,
                "registro_tipo": "anotacao", "side_effects": [], "extras": {}}
    if "intima" in t:
        return {"ato": "Ciência", "prioridade": "BAIXA", "prazo_dias": None,
                "registro_tipo": "ciencia", "side_effects": [], "extras": {}}
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


# Atos de título "fracos" (ciência genérica BAIXA): quando o título só resolve
# pra um desses, um MOVIMENTO de audiência designada/redesignada na timeline é
# sinal MAIS concreto do objeto da intimação → tem prioridade sobre eles.
_TITULO_WEAK_ATOS = {
    "Ciência", "Ciência de petição", "Ciência de mandado", "Ciência de edital",
    "Ciência de ata de audiência",
}


def _melhor_movimento(movimentos: list | None) -> dict | None:
    """Escolhe a designação futura mais relevante (maior data) da timeline."""
    if not movimentos:
        return None
    return sorted(movimentos, key=lambda d: d.get("data") or "")[-1]


def _classificar_designacao(det: dict | None, is_mpu: bool = False) -> dict | None:
    """Designação parseada (de movimento ou corpo) → rule dict de ciência +
    side-effect de (re)agendar. A `Designacao` segue em `extras._designacao` para
    o agendamento não precisar re-parsear (e funcionar mesmo sem data no corpo)."""
    if not det:
        return None
    redesig = bool(det.get("redesignacao"))
    # MPU: audiência de justificação → ótica defensiva do requerido.
    if is_mpu and "justifica" in normalize(det.get("tipo") or ""):
        return {"ato": "Defesa em audiência de justificação", "prioridade": "URGENTE",
                "prazo_dias": 5, "registro_tipo": "diligencia",
                "fase": "audiencia_designada", "motivo": "ciencia_audiencia",
                "side_effects": ["agendar_audiencia"],
                "extras": {"tipo_audiencia": "JUSTIFICACAO", "_designacao": det}}
    return {
        "ato": "Ciência redesignação de audiência" if redesig else "Ciência designação de audiência",
        "prioridade": "NORMAL", "prazo_dias": None, "registro_tipo": "ciencia",
        "side_effects": ["reagendar_audiencia" if redesig else "agendar_audiencia"],
        "extras": {"_designacao": det},
    }


# Atos terminais — NÃO recebem agendamento automático a partir de um movimento
# (sentença/acórdão encerram fase; um movimento de audiência futuro coincidente
# seria espúrio). Demais atos podem ganhar o side-effect de (re)agendar.
_NO_AUGMENT_ATOS = {
    "Ciência absolvição", "Ciência condenação", "Ciência da pronúncia",
    "Ciência da impronúncia", "Analisar sentença", "Ciência acórdão",
    "Analisar acórdão",
}


def classify(text: str, titulo: str | None = None, is_mpu: bool = False,
             atribuicao: str | None = None, movimentos: list | None = None) -> dict | None:
    """Classifica e, se houver audiência (re)designada nos movimentos da timeline,
    garante o agendamento — mesmo quando o ato primário é outro (ex.: "Analisar
    decisão" cujo corpo não traz a data, mas a redesignação está num movimento).
    Sinais não competem: o ato analítico é preservado E a audiência é agendada.
    Atos terminais (`_NO_AUGMENT_ATOS`) não recebem agendamento espúrio."""
    rule = _classify_core(text, titulo, is_mpu, atribuicao, movimentos)
    melhor_mov = _melhor_movimento(movimentos)
    if rule and melhor_mov and rule["ato"] not in _NO_AUGMENT_ATOS:
        fx = rule.get("side_effects") or []
        if not any(s in ("agendar_audiencia", "reagendar_audiencia") for s in fx):
            redesig = bool(melhor_mov.get("redesignacao"))
            rule = {
                **rule,
                "side_effects": [*fx, "reagendar_audiencia" if redesig else "agendar_audiencia"],
                "extras": {**(rule.get("extras") or {}), "_designacao": melhor_mov},
            }
    return rule


def _classify_core(text: str, titulo: str | None = None, is_mpu: bool = False,
                   atribuicao: str | None = None, movimentos: list | None = None) -> dict | None:
    """Classifica usando (a) título do doc + (b) regras textuais como fallback.

    Quando is_mpu=True, RULES_MPU vem antes de RULES_BASE — ótica defensiva
    do requerido. Ver references/heuristicas-mpu.md.

    Quando a atribuição é Execução Penal (`"EXECUCAO_PENAL" in atribuicao`),
    RULES_EP vem antes de RULES_BASE — atos específicos da execução; se nenhuma
    regra EP casar, faz fallback para o título genérico + RULES_BASE.

    `movimentos` (designações extraídas da timeline via
    extrair_movimentos_audiencia) é um sinal ESTRUTURADO: quando o título é
    fraco/ausente, uma audiência designada/redesignada na timeline tem
    prioridade sobre o fallback de texto — resolve "despacho vago + audiência
    num movimento" (sem data no corpo do documento intimado).
    """
    n = normalize(text)
    melhor_mov = _melhor_movimento(movimentos)
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
        mv = _classificar_designacao(melhor_mov, is_mpu=True)
        if mv:
            return mv
        # se MPU mas nada matcheou, cai no RULES_BASE como último recurso
    if "EXECUCAO_PENAL" in (atribuicao or ""):
        for pat, ato, prio, prazo, tipo, fx, ex in RULES_EP:
            if re.search(pat, n):
                return {
                    "ato": ato, "prioridade": prio, "prazo_dias": prazo,
                    "registro_tipo": tipo, "side_effects": fx, "extras": ex,
                }
        # nenhuma regra EP casou → fallback para título genérico + RULES_BASE
    titulo_rule = _decide_by_titulo(titulo, text) if titulo else None
    if titulo_rule and titulo_rule["ato"] not in _TITULO_WEAK_ATOS:
        return titulo_rule
    mv_rule = _classificar_designacao(melhor_mov)
    if mv_rule:
        return mv_rule
    if titulo_rule:
        return titulo_rule
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


PRIORITY_TIMELINE = ["acordao", "acórdão", "sentenc", "decis", "despac", "manifesta",
                     "intima", "ata", "ato ordin", "edital", "mandado", "oficio",
                     "certid", "peticao", "petição"]


async def read_doc_content(ctx: BrowserContext, autos_url: str) -> dict:
    """Abre autos digitais e tenta ler o conteúdo mais informativo. Lê iframe
    default; depois itera candidatos relevantes da timeline e fica com o maior."""
    full = f"https://pje.tjba.jus.br{autos_url}" if autos_url.startswith("/") else autos_url
    # TRAVA ANTI-CIÊNCIA (protege o prazo de 10 dias de leitura): só lemos os
    # autos pela visão COMPLETA do processo (listProcessoCompletoAdvogado.seam),
    # que NÃO efetiva ciência. O popup visualizarExpediente.seam (acionado pelo
    # botão "TOMAR CIÊNCIA") EFETIVA a ciência — nunca abrir. Qualquer link que
    # não seja o de autos completos é recusado → cai em manual-review.
    low = full.lower()
    if "visualizarexpediente.seam" in low or "tomarciencia" in low or "listprocessocompletoadvogado.seam" not in low:
        log("  ⚠ link não é o de autos completos — recusado p/ não dar ciência (manual-review)")
        return {"text": "", "default_len": 0, "best_len": 0, "best_id": None,
                "top_titulo": None, "timeline": []}
    autos = await ctx.new_page()
    try:
        # A página de autos do PJe é lenta e às vezes estoura o timeout de forma
        # transitória — 1 retry resolve a maioria. Em vez de propagar o erro (que
        # contava o doc como "erro"), tentamos de novo antes de desistir.
        last_err = None
        for attempt in range(2):
            try:
                await autos.goto(full, wait_until="domcontentloaded", timeout=60000)
                last_err = None
                break
            except Exception as e:
                last_err = e
                if attempt == 0:
                    await asyncio.sleep(3)
        if last_err is not None:
            raise last_err
        await asyncio.sleep(4)

        async def read_iframe() -> str:
            """Lê o MELHOR frame: prefere o doc HTML (frameHtml/downloadBinario)
            quando tem conteúdo real; senão cai para o maior frame de texto (o
            frame principal de detalhe do processo, ~4KB). Antes só olhava
            frameHtml — PDFs (framePdf) e o frame principal davam 0b."""
            doc_text, biggest = "", ""
            for f in autos.frames:
                try:
                    t = await f.evaluate("() => document.body ? document.body.innerText : ''")
                except Exception:
                    t = ""
                if (f.name == "frameHtml" or "downloadBinario" in (f.url or "")) and len(t) > len(doc_text):
                    doc_text = t
                if len(t) > len(biggest):
                    biggest = t
            return doc_text if len(doc_text) > 200 else biggest

        default_text = await read_iframe()
        timeline = await autos.evaluate(JS_READ_TIMELINE)
        # Texto da página de autos (frame principal) — contém os MOVIMENTOS da
        # timeline (ex.: "AUDIÊNCIA ... REDESIGNADA CONDUZIDA POR DD/MM/AAAA ..."),
        # que não são documentos clicáveis e por isso não entram em `timeline`.
        try:
            panel_text = await autos.evaluate(
                "() => (document.body && document.body.innerText) || ''")
        except Exception:
            panel_text = ""

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
            # Título do doc de MAIOR prioridade da timeline (sinal pro classify
            # mesmo quando o corpo é PDF ilegível e best_id ficou None).
            "top_titulo": candidates[0]["titulo"] if candidates else None,
            "timeline": timeline[:8],
            "panel_text": (panel_text or "")[:20000],
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

    if not sb.registro_exists(demanda["id"], "Verificar conteúdo no PJe"):
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


def _ato_administrativo(rule: dict) -> bool:
    """Ato de mera ciência administrativa (remessa/juntada/baixa) — sem valor
    interpretativo, então NÃO vai para a IA (enrichment_status='skipped')."""
    return bool((rule.get("extras") or {}).get("nota"))


def apply_classification(sb: Supabase, demanda: dict, rule: dict, content: str) -> bool:
    """Aplica a classificação + executa os side-effects determinísticos
    (agenda, medidas MPU, contato), persiste o texto p/ a IA e marca o
    enrichment_status. Retorna True se a demanda deve ir para a fila de IA."""
    fields: dict = {
        "ato": rule["ato"],
        "prioridade": rule["prioridade"],
        "revisao_pendente": False,
    }
    if rule["prazo_dias"] is not None:
        fields["prazo"] = (date.today() + timedelta(days=rule["prazo_dias"])).isoformat()
    sb.update_demanda(demanda["id"], fields)

    proc_id = demanda.get("processo_id")
    assistido_id = demanda.get("assistido_id")
    side_effects = rule.get("side_effects") or []
    extras = rule.get("extras") or {}
    is_mpu = _is_mpu(demanda)

    # ── processos_vvd: fase/motivo (regras MPU) ────────────────────────────────
    fase, motivo = rule.get("fase"), rule.get("motivo")
    if (fase or motivo) and proc_id:
        pvvd: dict = {}
        if fase: pvvd["fase_procedimento"] = fase
        if motivo: pvvd["motivo_ultima_intimacao"] = motivo
        try:
            sb.upsert_processo_vvd(proc_id, pvvd)
        except Exception as e:
            log(f"  ⚠ falha processos_vvd (proc_id={proc_id}): {e}")

    # ── Contato do assistido (resposta à acusação) ─────────────────────────────
    contato_txt = ""
    if "resposta" in rule["ato"].lower() and assistido_id:
        try:
            c = sb.get_assistido_contato(assistido_id) or {}
            tel = c.get("telefone") or c.get("telefone_contato")
            if tel:
                quem = f" ({c.get('nome_contato')}, {c.get('parentesco_contato')})" if c.get("nome_contato") else ""
                contato_txt = f"\n\n**Contato do assistido:** {tel}{quem}"
        except Exception as e:
            log(f"  ⚠ falha contato assistido: {e}")

    # ── Registro base (ciência/diligência) — guarda texto p/ IA em raw_text ────
    skip_ai = _ato_administrativo(rule) or not (content or "").strip()
    enr_status = "skipped" if skip_ai else "pending"
    base_reg_id = None
    existing = sb.get_registro_by_titulo(demanda["id"], rule["ato"])
    if existing is None:
        conteudo = ((content[:1500] + ("..." if len(content) > 1500 else "")) or "(sem conteúdo lido)") + contato_txt
        base_reg_id = sb.insert_registro_returning({
            "assistido_id": assistido_id,
            "processo_id": proc_id,
            "demanda_id": demanda["id"],
            "data_registro": datetime.now().isoformat(),
            "tipo": rule["registro_tipo"],
            "titulo": rule["ato"],
            "conteudo": conteudo,
            "status": "realizado" if rule["registro_tipo"] == "ciencia" else "agendado",
            "autor_id": DEFENSOR_ID,
            "enrichment_status": enr_status,
            "enrichment_data": {"raw_text": (content or "")[:12000]} if not skip_ai else None,
        })
    else:
        # Registro base já existe (re-rodada). Faz BACKFILL do enriquecimento se
        # ainda não foi enriquecido (status null/pending/error) — permite a IA
        # processar demandas triadas antes da fase B. Não toca em 'done'/'skipped'.
        base_reg_id = existing["id"]
        if not skip_ai and existing.get("enrichment_status") in (None, "pending", "error"):
            sb.update_registro(base_reg_id, {
                "enrichment_status": "pending",
                "enrichment_data": {"raw_text": (content or "")[:12000]},
            })

    # ── Side-effect: agendar / reagendar audiência ─────────────────────────────
    if proc_id and any(fx in ("agendar_audiencia", "reagendar_audiencia") for fx in side_effects):
        _agendar_audiencia(sb, demanda, rule, content, base_reg_id)

    # ── Side-effect: MPU — medidas deferidas ───────────────────────────────────
    if is_mpu and proc_id:
        _aplicar_medidas_mpu(sb, demanda, content)

    return not skip_ai


def _agendar_audiencia(sb: Supabase, demanda: dict, rule: dict, content: str, base_reg_id) -> None:
    """Insere/atualiza a audiência (idempotente). Prefere a designação já parseada
    em `extras._designacao` (vinda de um movimento da timeline — pode não ter data
    no corpo do doc); senão extrai do texto do documento."""
    proc_id = demanda["processo_id"]
    det = (rule.get("extras") or {}).get("_designacao") or detectar_designacao_audiencia(content)
    if not det:
        # Sem data detectável → diligência p/ definir manualmente (não inventa data).
        if not sb.registro_exists(demanda["id"], "Definir data da audiência"):
            sb.insert_registro({
                "assistido_id": demanda.get("assistido_id"), "processo_id": proc_id,
                "demanda_id": demanda["id"], "data_registro": datetime.now().isoformat(),
                "tipo": "diligencia", "titulo": "Definir data da audiência",
                "conteudo": "Designação de audiência detectada, mas a data/hora não foi extraída automaticamente — conferir no PJe e agendar.",
                "status": "agendado", "autor_id": DEFENSOR_ID,
            })
        return
    tipo = det["tipo"]
    redesig = det["redesignacao"] or "reagendar_audiencia" in (rule.get("side_effects") or [])
    if redesig:
        n = sb.cancel_audiencias_abertas(proc_id, tipo)
        if n:
            log(f"  ↻ {n} audiência(s) '{tipo}' anterior(es) cancelada(s) (redesignação)")
    if sb.audiencia_exists(proc_id, det["data"], tipo):
        log(f"  = audiência '{tipo}' em {det['data']} já existe — não duplica")
        return
    assistido = (demanda.get("assistidos") or {}).get("nome") or "Assistido"
    numero = (demanda.get("processos") or {}).get("numero_autos") or ""
    aud_id = sb.insert_audiencia({
        "processo_id": proc_id,
        "assistido_id": demanda.get("assistido_id"),
        "defensor_id": DEFENSOR_ID,
        "data_audiencia": f"{det['data']}T{det['horario']}:00",
        "horario": det["horario"],
        "tipo": tipo[:50],
        "local": det.get("local"),
        "titulo": f"{tipo} - {assistido} - {numero}".strip(),
        "descricao": ("Agendada automaticamente pela varredura (designação detectada)."
                      + (f"\nModalidade: {det['modalidade']}" if det.get("modalidade") else "")
                      + f"\nTrecho: \"{det['trecho']}\""),
        "status": "agendada",
    })
    if aud_id:
        log(f"  📅 audiência agendada: {tipo} em {det['data']} {det['horario']}")
        if base_reg_id:
            try:
                sb.link_registro_audiencia(base_reg_id, aud_id)
            except Exception:
                pass


def _aplicar_medidas_mpu(sb: Supabase, demanda: dict, content: str) -> None:
    """Parseia medidas deferidas e grava em processos_vvd + registro dedicado."""
    proc_id = demanda["processo_id"]
    parsed = parse_decisao_mpu(content)
    medidas = parsed.get("medidas") or []
    revogadas = parsed.get("medidas_revogadas") or []
    if not medidas and not parsed.get("revogacao_total") and not revogadas:
        return
    if medidas:
        pvid = None
        try:
            pvvd: dict = {
                "medidas_deferidas": [m["codigo"] for m in medidas],  # campo de comparação (BlocosFaseVii)
                "mpu_ativa": True,
            }
            dist = next((m.get("distancia_metros") for m in medidas if m.get("distancia_metros")), None)
            if dist:
                pvvd["distancia_minima"] = dist
            if parsed.get("prazo_dias"):
                pvvd["data_decisao_mpu"] = date.today().isoformat()
            pvid = sb.upsert_processo_vvd(proc_id, pvvd)
        except Exception as e:
            log(f"  ⚠ falha ao gravar em processos_vvd: {e}")
        # Tabela medidas_mpu — a que o painel MedidasVigentes EXIBE (1 linha/medida).
        if pvid:
            try:
                n = sb.insert_medidas_mpu(pvid, medidas)
                if n:
                    log(f"  🛡 {n} medida(s) gravada(s) em medidas_mpu (painel)")
            except Exception as e:
                log(f"  ⚠ falha ao gravar medidas_mpu: {e}")
    # ─── Revogação / modulação: rebaixa medidas ativas para 'revogada'
    if parsed.get("revogacao_total") or revogadas:
        try:
            rpvid = sb.upsert_processo_vvd(proc_id, {})
            if rpvid:
                alvo = None if parsed.get("revogacao_total") else revogadas
                n_rev = sb.revogar_medidas_mpu(rpvid, alvo)
                if n_rev:
                    log(f"  ↻ {n_rev} medida(s) revogada(s)")
                titulo_rev = "Medidas protetivas — revogação"
                if not sb.registro_exists(demanda["id"], titulo_rev):
                    if parsed.get("revogacao_total"):
                        corpo_rev = ("Revogação TOTAL das medidas protetivas (parsing "
                                     "automático — conferir). Todas as medidas ativas "
                                     "foram marcadas como revogadas.")
                    else:
                        corpo_rev = ("Revogação parcial das medidas protetivas (parsing "
                                     "automático — conferir). Códigos revogados: "
                                     + ", ".join(str(c) for c in revogadas) + ".")
                    sb.insert_registro({
                        "assistido_id": demanda.get("assistido_id"), "processo_id": proc_id,
                        "demanda_id": demanda["id"], "data_registro": datetime.now().isoformat(),
                        "tipo": "anotacao", "titulo": titulo_rev, "conteudo": corpo_rev,
                        "status": "realizado", "autor_id": DEFENSOR_ID,
                    })
        except Exception as e:
            log(f"  ⚠ falha ao revogar medidas_mpu: {e}")

    # Registro "Medidas protetivas deferidas" (análise determinística — tipo
    # "analise" p/ aparecer no card de Análise IA junto ao resumo da fase 2)
    titulo = "Medidas protetivas deferidas"
    if medidas and not sb.registro_exists(demanda["id"], titulo):
        linhas = [f"- {m['rotulo']} ({m['artigo'] if str(m['artigo']).lower().startswith('art') else 'art. ' + m['artigo']})"
                  + (f" — {m['distancia_metros']}m" if m.get("distancia_metros") else "")
                  for m in medidas]
        corpo = "Medidas deferidas (parsing automático — conferir):\n" + "\n".join(linhas)
        if parsed.get("prazo_dias"):
            corpo += f"\n\nPrazo: {parsed['prazo_dias']} dias."
        sb.insert_registro({
            "assistido_id": demanda.get("assistido_id"), "processo_id": proc_id,
            "demanda_id": demanda["id"], "data_registro": datetime.now().isoformat(),
            "tipo": "analise", "titulo": titulo, "conteudo": corpo,
            "status": "realizado", "autor_id": DEFENSOR_ID,
        })
        log(f"  🛡 {len(medidas)} medida(s) protetiva(s) registrada(s)")


async def _wait_text(page: "Page", txt: str, timeout: float = 20):
    """Aguarda um elemento com texto `txt` ficar visível. Retorna Locator ou None."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        loc = page.get_by_text(txt, exact=False).first
        try:
            if await loc.count() > 0 and await loc.is_visible():
                return loc
        except Exception:
            pass
        await asyncio.sleep(0.5)
    return None


# JS de navegação no painel (RichFaces). Os nós (aba/situação/comarca/vara)
# FALHAM no actionability-check do Playwright (repaint/AJAX constante faz o
# Locator.click pendurar até timeout), mas o onclick inline dispara normalmente
# via element.click() no contexto da página. Por isso clicamos por JS.
_NORM_JS = "const norm=s=>(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim();"


async def _js_click_text(page: "Page", needle: str) -> bool:
    """Clica via JS o MENOR elemento visível cujo texto normalizado (sem acento,
    minúsculo) contém `needle`. Dispara o onclick inline (AJAX A4J) no contexto
    da página — robusto contra o actionability-check do Playwright."""
    return await page.evaluate(
        "(needle) => {" + _NORM_JS + """
          const n = norm(needle);
          let best=null, bl=1e9;
          for (const el of document.querySelectorAll('a,span,td')) {
            const t = norm(el.textContent);
            if (t.includes(n)) { const r=el.getBoundingClientRect();
              if (r.width>0 && r.height>0 && t.length<bl) { best=el; bl=t.length; } }
          }
          if (best) { best.click(); return true; }
          return false;
        }""",
        needle,
    )


async def _text_present(page: "Page", needle: str) -> bool:
    """True se algum elemento visível contém `needle` (normalizado)."""
    return await page.evaluate(
        "(needle) => {" + _NORM_JS + """
          const n = norm(needle);
          return [...document.querySelectorAll('a,span,td')].some(el =>
            norm(el.textContent).includes(n) && el.getBoundingClientRect().width>0);
        }""",
        needle,
    )


async def _situacoes_carregadas(page: "Page") -> bool:
    """True quando a aba Expedientes já renderizou a lista de situações (âncoras
    AJAX do formAbaExpediente visíveis)."""
    return await page.evaluate(
        """() => [...document.querySelectorAll('a[onclick]')].some(a =>
            /formAbaExpediente/i.test(a.getAttribute('onclick')||'') &&
            a.getBoundingClientRect().width>0)"""
    )


async def _poll(page: "Page", check, timeout: float = 20.0, interval: float = 1.0) -> bool:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        try:
            if await check():
                return True
        except Exception:
            pass
        await asyncio.sleep(interval)
    return False


async def navigate_to_unidade(page: "Page", atribuicao: str) -> bool:
    """Drill-down: aba Expedientes → situação → comarca → vara, com estabilização
    da tabela. Retorna True se navegou, False se a atribuição não é mapeada.
    Levanta RuntimeError se um passo falhar.

    Cliques via JS (`_js_click_text`): o handler de troca de aba mora no elemento
    interno `#tabExpedientes_shifted` (o <td>/_lbl NÃO tem onclick) e os nós do
    accordion sofrem repaint contínuo — `Locator.click` do Playwright pendura."""
    mapping = ATRIB_UNIDADE.get(atribuicao)
    if mapping is None:
        log(f"  ⚠ atribuição '{atribuicao}' sem mapa de vara — pulando navegação")
        return False
    comarca, unidade_txt = mapping

    # Passo 1: ativa a aba Expedientes via onclick do #tabExpedientes_shifted.
    # O próprio onclick faz `if(isTabActive) return false`, então clicar com a aba
    # já ativa é no-op seguro. Depois aguarda a lista de situações carregar (AJAX).
    await page.evaluate(
        "() => { const t = document.getElementById('tabExpedientes_shifted'); if (t) t.click(); }"
    )
    if not await _poll(page, lambda: _situacoes_carregadas(page), timeout=30, interval=1.0):
        raise RuntimeError("aba 'Expedientes' não carregou a lista de situações")

    # Passo 2: situação (ex.: "Pendentes de ciência ou de resposta").
    if not await _js_click_text(page, SITUACAO_PADRAO):
        raise RuntimeError(f"situação '{SITUACAO_PADRAO}' não encontrada")
    if not await _poll(page, lambda: _text_present(page, comarca), timeout=20):
        raise RuntimeError(f"comarca '{comarca}' não apareceu após selecionar situação")

    # Passo 3: comarca — com RETRY (o clique é toggle do accordion; só re-clica se
    # a vara não apareceu, evitando colapsar um nó já aberto).
    vara_ok = False
    for _ in range(4):
        await _js_click_text(page, comarca)
        if await _poll(page, lambda: _text_present(page, unidade_txt), timeout=8):
            vara_ok = True
            break
        await asyncio.sleep(1)
    if not vara_ok:
        raise RuntimeError(f"unidade '{unidade_txt}' não apareceu após comarca '{comarca}'")

    # Passo 4: vara/unidade.
    if not await _js_click_text(page, unidade_txt):
        raise RuntimeError(f"unidade '{unidade_txt}' não encontrada")

    # Estabiliza: contagem de linhas estável por 2 ciclos + texto da vara presente.
    vara_kw = None
    u = unidade_txt.upper()
    if "VIOL" in u:
        vara_kw = "VIOLÊNCIA DOMÉSTICA"
    elif "JÚRI" in u or "JURI" in u:
        vara_kw = "JÚRI"
    loop = asyncio.get_running_loop()
    deadline = loop.time() + 30
    prev_count, stable = -1, 0
    while loop.time() < deadline:
        stat = await page.evaluate(
            f"""() => {{
              const tbody = document.getElementById('{TBODY_ID}');
              if (!tbody) return {{ n: 0, txt: '' }};
              return {{ n: tbody.querySelectorAll('tr.rich-table-row').length,
                        txt: (tbody.innerText || '').toUpperCase() }};
            }}"""
        )
        n = stat.get("n", 0) or 0
        kw_ok = (vara_kw is None) or (vara_kw in (stat.get("txt") or ""))
        if n > 0 and n == prev_count and kw_ok:
            stable += 1
            if stable >= 2:
                break
        else:
            stable = 0
        prev_count = n
        await asyncio.sleep(0.8)
    return True


LOGIN_WAIT_TIMEOUT_S = 8 * 60


async def _is_logged_in(page) -> bool:
    """Sessão ativa = não está no login e sem campo de usuário visível."""
    try:
        if "login.seam" in (page.url or ""):
            return False
        return await page.query_selector("input[name=username]") is None
    except Exception:
        return False


async def _ensure_logged_in(ctx) -> "Page":
    """Garante uma aba logada no painel. Sem sessão, ABRE o login do PJe na janela
    do Chromium e AGUARDA o usuário logar (auto-detecta), depois volta ao painel.
    Facilita o login local em vez de exigir que já esteja logado/no painel."""
    page = next((pg for pg in ctx.pages if "advogado.seam" in (pg.url or "")), None)
    page = page or (ctx.pages[0] if ctx.pages else await ctx.new_page())
    try:
        await page.bring_to_front()
    except Exception:
        pass
    try:
        await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
    except Exception:
        pass
    if await _is_logged_in(page):
        return page
    log("Aguardando login no PJe… faça login na janela do Chromium")
    try:
        await page.goto(f"{PJE_BASE}/login.seam", wait_until="domcontentloaded", timeout=30000)
        await page.bring_to_front()
    except Exception:
        pass
    loop = asyncio.get_running_loop()
    deadline = loop.time() + LOGIN_WAIT_TIMEOUT_S
    while loop.time() < deadline:
        await asyncio.sleep(3)
        if await _is_logged_in(page):
            log("Login detectado — iniciando varredura…")
            try:
                await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                pass
            return page
    sys.exit("ERRO: tempo de espera pelo login esgotado — logue no PJe no Chromium :9222")


async def varredura(sb: Supabase, demandas: list[dict], modo: str, env: dict[str, str], atribuicao: str | None = None):
    if async_playwright is None:
        sys.exit("ERRO: patchright não instalado — ative .venv do enrichment-engine")

    stats = {"ok": 0, "manual": 0, "not_found": 0, "errors": 0}
    counts: dict[str, int] = {}
    pending_ai_ids: list[int] = []  # demandas p/ enriquecimento IA (fase 2)

    async with async_playwright() as p:
        if modo == "cdp":
            try:
                browser = await p.chromium.connect_over_cdp(CDP_URL)
                ctx = browser.contexts[0]
                # Procurar a página do painel
                # Garante sessão logada — abre o login e espera se necessário.
                page = await _ensure_logged_in(ctx)
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

        # Atribuição-alvo da rodada (param explícito ou inferida da 1ª demanda).
        # Definida fora do bloco de modo para estar SEMPRE em escopo no loop
        # (passada ao classify p/ ativar RULES_EP quando for Execução Penal).
        atrib_alvo = atribuicao or (
            demandas[0].get("processos", {}).get("atribuicao") if demandas else None
        )

        # Navega o painel até a vara da atribuição ANTES de localizar os docs —
        # find_in_panel só acha o expediente na tabela populada da vara correta.
        # Modo --demanda-ids: navegação usa UMA vara por rodada (a de demandas[0]);
        # demandas de outra vara caem no fallback manual-review. Lote homogêneo por
        # vara é o suportado — seleção em lote da UI é escopada por atribuição.
        if modo in ("cdp", "direct") and atrib_alvo and atrib_alvo != "EXECUCAO_PENAL":
            if atrib_alvo:
                try:
                    # Recarrega o painel p/ estado limpo da árvore (a aba pode estar
                    # num nó/vara anterior de uso prévio) — como faz o worker de import.
                    await page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
                    await asyncio.sleep(2)
                    if await navigate_to_unidade(page, atrib_alvo):
                        uni = ATRIB_UNIDADE.get(atrib_alvo)
                        log(f"painel navegado → {uni[0]} ▸ {uni[1]}" if uni else "painel navegado")
                except Exception as e:
                    log(f"  ⚠ navegação falhou ({str(e)[:90]}) — docs podem cair em manual-review")

        for i, d in enumerate(demandas):
            try:
                # `or {}` (não default do .get): a coluna pode vir presente-mas-None.
                doc_id = d.get("pje_documento_id") or (d.get("enrichment_data") or {}).get("id_documento_pje")
                doc_id = str(doc_id) if doc_id else None
                assistido = ((d.get("assistidos") or {}).get("nome") or "?")[:30]
                numero = (d.get("processos") or {}).get("numero_autos") or "?"
                log(f"[{i+1}/{len(demandas)}] {assistido} | {numero}")

                # Atribuição POR-DEMANDA (não a global da rodada): no modo
                # --demanda-ids a seleção pode misturar atribuições, então cada
                # demanda precisa ativar seu próprio conjunto de regras (ex.: EP).
                # Fallback p/ atrib_alvo quando a demanda não traz processo.
                atrib_demanda = (d.get("processos") or {}).get("atribuicao") or atrib_alvo
                if atrib_demanda == "EXECUCAO_PENAL":
                    # EP não está no PJe — leitor dedicado no SEEU (Task 2).
                    cnj = (d.get("processos") or {}).get("numero_autos") or ""
                    if not cnj or cnj == "?":
                        log("  ⚠ demanda EP sem CNJ — manual-review")
                        create_manual_review(sb, d); stats["not_found"] += 1; continue
                    try:
                        content = await read_seeu_expediente(ctx, cnj)
                    except Exception as e:
                        log(f"  ⚠ SEEU: {str(e)[:90]} — manual-review")
                        create_manual_review(sb, d); stats["not_found"] += 1; continue
                    # raw_text p/ o analise-intimacao inclui o contexto de pena
                    pena = content.get("pena_context") or {}
                    peninfo = ", ".join(f"{k}={v}" for k, v in pena.items() if v)
                    texto = _clean_decisao_text(content["text"])
                    if peninfo:
                        texto = f"[Execução: {peninfo}]\n{texto}"
                    best_titulo = content.get("top_titulo")
                    movimentos = []  # EP não usa a timeline de audiências do PJe
                else:
                    autos_url = await find_in_panel(page, doc_id, numero)
                    if not autos_url:
                        log(f"  ⚠ não encontrado no painel — fallback manual-review")
                        create_manual_review(sb, d)
                        stats["not_found"] += 1
                        continue

                    content = await read_doc_content(ctx, autos_url)
                    # Buscar título do "best item" da timeline pra classify
                    best_titulo = content.get("top_titulo")
                    if not best_titulo and content.get("best_id"):
                        for it in content.get("timeline", []):
                            if it.get("id") == content["best_id"]:
                                best_titulo = it.get("titulo")
                                break
                    # Limpa o texto (remove cabeçalho/rodapé/formatação, prioriza o
                    # dispositivo) antes de classificar, resumir (IA) e parsear medidas.
                    texto = _clean_decisao_text(content["text"])
                    # Sinal estruturado: audiências (re)designadas nos MOVIMENTOS da
                    # timeline — pega o objeto da intimação mesmo quando o doc intimado
                    # é um despacho vago sem data (caso André Chaves, 8016157-03).
                    movimentos = extrair_movimentos_audiencia(content.get("panel_text", ""))
                    if movimentos:
                        log(f"  ⤷ {len(movimentos)} movimento(s) de audiência na timeline")

                is_mpu_demanda = _is_mpu(d)
                if is_mpu_demanda:
                    log(f"  [MPU] detectado — usando regras defensivas")
                rule = classify(texto, titulo=best_titulo, is_mpu=is_mpu_demanda,
                                atribuicao=atrib_demanda, movimentos=movimentos)
                if not rule:
                    log(f"  → sem match (default={content['default_len']}b best={content['best_len']}b) — manual-review")
                    create_manual_review(sb, d)
                    stats["manual"] += 1
                    continue

                pendente_ia = apply_classification(sb, d, rule, texto)
                if pendente_ia:
                    pending_ai_ids.append(d["id"])
                counts[rule["ato"]] = counts.get(rule["ato"], 0) + 1
                stats["ok"] += 1
                log(f"  ✓ {rule['ato']} ({rule['prioridade']})")
            except Exception as e:
                log(f"  ✗ erro: {str(e)[:160]}")
                stats["errors"] += 1

    # Enfileira UMA task de enriquecimento IA (lane=ai) com as demandas analisadas
    # que têm conteúdo interpretável (pending). O daemon Max (claude -p) consome.
    if pending_ai_ids:
        try:
            task_id = sb.enqueue_ai_task("analise-intimacao", pending_ai_ids, DEFENSOR_ID)
            log(f"🧠 task IA enfileirada (#{task_id}) p/ {len(pending_ai_ids)} intimação(ões)")
        except Exception as e:
            log(f"⚠ falha ao enfileirar task IA: {str(e)[:120]}")

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
    parser.add_argument("--defensor-id", type=int, default=None,
                        help="ID do defensor (filtro + autor dos registros). Default: DEFENSOR_ID do módulo.")
    parser.add_argument("--demanda-ids", default=None,
                        help="CSV de IDs de demanda. Analisa SÓ essas, em qualquer coluna (ignora filtro de status). Exclusivo com --atribuicao/--since.")
    args = parser.parse_args()

    # Defensor do job (vem do ctx.user.id pela UI) — sobrepõe o default hardcoded,
    # senão o filtro defensor_id ignora as demandas de outro defensor.
    global DEFENSOR_ID
    if args.defensor_id:
        DEFENSOR_ID = args.defensor_id

    env = load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        sys.exit("ERRO: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")

    sb = Supabase(sb_url, sb_key)
    if args.demanda_ids:
        try:
            ids = [int(x) for x in args.demanda_ids.split(",") if x.strip()]
        except ValueError:
            sys.exit("ERRO: --demanda-ids deve ser CSV de inteiros (ex.: 1368,12)")
        if not ids:
            sys.exit("ERRO: --demanda-ids vazio")
        demandas = sb.list_demandas_by_ids(ids)
        print(f"[varredura] alvo: {len(demandas)} demandas (selecionadas)")
    else:
        demandas = sb.list_demandas(args.atribuicao, args.since, args.limit)
        print(f"[varredura] alvo: {len(demandas)} demandas em triagem")

    if args.modo == "manual-review":
        for d in demandas:
            create_manual_review(sb, d)
            print(f"  ✓ [{d['id']}] {d['assistidos']['nome'][:30]} ({d['processos']['numero_autos']})")
        return

    if args.modo == "direct" and (not env.get("PJE_CPF") or not env.get("PJE_SENHA")):
        sys.exit("ERRO: modo direct precisa PJE_CPF/PJE_SENHA no .env.local")

    asyncio.run(varredura(sb, demandas, args.modo, env, args.atribuicao))


def build_by_ids_params(ids: list[int], defensor_id: int) -> list[str]:
    """Monta os params PostgREST para buscar demandas por ID, SEM filtro de
    status (analisa em qualquer coluna). Puro/testável."""
    ids_csv = ",".join(str(int(i)) for i in ids)
    return [
        _DEMANDA_SELECT,
        f"id=in.({ids_csv})",
        f"defensor_id=eq.{defensor_id}",
        "deleted_at=is.null",
    ]


def _self_test_build_by_ids():
    p = build_by_ids_params([1368, 12], 1)
    joined = "&".join(p)
    assert "id=in.(1368,12)" in joined, joined
    assert "status=in." not in joined, "NÃO deve filtrar por status"
    assert "defensor_id=eq.1" in joined
    assert "deleted_at=is.null" in joined
    print("[self-test] build_by_ids_params OK")


if __name__ == "__main__":
    main()
