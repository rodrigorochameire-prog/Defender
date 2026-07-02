#!/usr/bin/env python3
"""analise_profunda_autos.py — worker BROWSER da Fase 2c.

Dado um demandaId: baixa os autos, organiza no Drive (distribuir-autos) e enfileira
a task lane=ai `analise-autos` (o caminho do coworkAnalise), embutindo o demandaId.
Fonte dos autos por atribuição (Fase 2b): EXECUCAO_PENAL → SEEU (baixar_autos_seeu,
vários PDFs); o resto → PJe (baixar_pdf_autos, um PDF). Atualiza
demandas.analise_profunda_status.
Roda no daemon do defensor (CDP :9222). Só as funções puras abaixo são unit-testadas.

O fluxo CDP (main_async/main) NÃO tem unit test — depende de um Chromium logado
com --remote-debugging-port=9222 e de um processo real no PJe. Sua validação é
a etapa de aceite ao vivo (ver task-5-report.md). O gate aqui é estrutural:
test_worker_structure.py + `--help` sem erro de import.
"""
import argparse, asyncio, json, re, shutil, subprocess, sys
from pathlib import Path


def parse_args_meta(argv: list[str]) -> dict:
    p = argparse.ArgumentParser()
    p.add_argument("--demanda-id", type=int, required=True)
    p.add_argument("--processo-id", type=int, required=True)
    p.add_argument("--assistido-id", type=int, required=True)
    p.add_argument("--atribuicao", default="")
    p.add_argument("--defensor-id", type=int, default=1)
    a = p.parse_args(argv)
    return {
        "demanda_id": a.demanda_id, "processo_id": a.processo_id,
        "assistido_id": a.assistido_id, "atribuicao": a.atribuicao,
        "defensor_id": a.defensor_id,
    }


MAX_DOSSIE_CHARS = 18000
SECTION_TEXT_CAP = 2000
ATEND_TEXT_CAP = 1500
MAX_REGISTROS = 40
MAX_POR_TIPO = 3
MAX_SECTIONS = 30
MAX_KEY_POINTS = 5
MAX_MIDIAS = 10
MIDIA_TEXT_CAP = 1200

CNJ_RE = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
MAX_ASSOCIADOS = 30


def extract_cnjs(text: str) -> list:
    """CNJs distintos, ordenados, capados. Nunca levanta."""
    return sorted(set(CNJ_RE.findall(text or "")))[:MAX_ASSOCIADOS]


def _cnj_digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def associados_from_text(text: str, cnj_principal: str = "") -> list:
    """CNJs citados no texto dos autos, EXCETO o processo principal."""
    main = _cnj_digits(cnj_principal)
    return [c for c in extract_cnjs(text) if _cnj_digits(c) != main]


def extrair_associados_autos(pdf_path, cnj_principal: str = "") -> list:
    """Extrai CNJs de associados do TEXTO dos autos (pdftotext). Nunca levanta."""
    try:
        if not pdf_path:
            return []
        texto = vt.extract_pdf_text(pdf_path)
        return associados_from_text(texto or "", cnj_principal)
    except Exception:
        return []


_SECOES_ASSOC = ["Dependência", "Prevenção", "Desmembramento", "Vinculação Direta"]


def cnj_dv_ok(cnj) -> bool:
    d = re.sub(r"\D", "", cnj or "")
    if len(d) != 20:
        return False
    return f"{98 - ((int(d[:7] + d[9:])) * 100 % 97):02d}" == d[7:9]


def parse_associados_panel(panel_text: str, cnj_principal: str = "") -> list:
    """Painel 'Associados' (4 accordions) → [{cnj,tipo,classe,assunto,sigilo,comarca}]. Puro."""
    principal = re.sub(r"\D", "", cnj_principal or "")
    txt = panel_text or ""
    out = []
    for i, sec in enumerate(_SECOES_ASSOC):
        a = txt.find(sec)
        if a < 0:
            continue
        b = len(txt)
        for other in _SECOES_ASSOC[i + 1:]:
            j = txt.find(other, a + len(sec))
            if j >= 0:
                b = min(b, j)
        seg = txt[a:b]
        seen = set()
        for m in CNJ_RE.finditer(seg):
            cnj = m.group(0)
            dig = re.sub(r"\D", "", cnj)
            if dig == principal or dig in seen:
                continue
            seen.add(dig)
            ls = seg.rfind("\n", 0, m.start()) + 1
            le = seg.find("\n", m.end())
            le = le if le >= 0 else len(seg)
            linha = seg[ls:le]
            before = linha[:m.start() - ls].strip()
            classe = before.split()[-1] if before else ""
            after = linha[m.end() - ls:]
            am = re.search(r"-\s*(.+)", after)
            assunto = am.group(1).strip() if am else ""
            bloco = seg[m.start():m.start() + 250]
            out.append({
                "cnj": cnj, "tipo": sec, "classe": classe, "assunto": assunto,
                "sigilo": "sigilos" in bloco.lower(), "comarca": dig[16:20],
            })
    return out


def classificar_relacionado(item: dict) -> dict:
    it = dict(item)
    d = re.sub(r"\D", "", it.get("cnj", ""))
    it["dv_ok"] = cnj_dv_ok(it.get("cnj", ""))
    if len(d) == 20 and d[16:20] == "0000":
        grau = "2ª inst"
    elif len(d) == 20 and d[13:16] == "805":
        grau = "1º grau"
    else:
        grau = "outra corte"
    it["grau"] = grau
    it["baixavel"] = bool(it["dv_ok"] and not it.get("sigilo") and grau == "1º grau")
    return it


def merge_relacionados(aba: list, texto_cnjs: list, cnj_principal: str = "") -> list:
    """União classificada: aba (primário) + CNJs do texto que faltam (fonte 'texto'/'citado')."""
    principal = re.sub(r"\D", "", cnj_principal or "")
    by = {}
    for it in (aba or []):
        d = re.sub(r"\D", "", it.get("cnj", ""))
        if d and d != principal and d not in by:
            x = dict(it); x["fonte"] = "aba"
            by[d] = classificar_relacionado(x)
    for c in (texto_cnjs or []):
        d = re.sub(r"\D", "", c)
        if d and d != principal and d not in by:
            x = {"cnj": c, "tipo": "citado", "classe": "", "assunto": "",
                 "sigilo": False, "comarca": d[16:20], "fonte": "texto"}
            by[d] = classificar_relacionado(x)
    return sorted(by.values(), key=lambda x: (x["fonte"] != "aba", not x.get("baixavel"), x["cnj"]))


def _cap(s, n):
    s = (s or "")
    if not isinstance(s, str):
        s = str(s)
    s = s.strip()
    return s[:n] if len(s) > n else s


def format_dossie(sections: list, registros: list, analises: list, associados: list = None, midias: list = None, relacionados: list = None) -> str:
    """Monta um bloco markdown COMPACTO (só resumos, capados) com o contexto
    do assistido além dos autos. Retorna '' se não houver nada. Função pura."""
    parts = []

    # Drive (resumos de peças)
    drive_lines = []
    for sec in (sections or [])[:MAX_SECTIONS]:
        titulo = sec.get("titulo") or sec.get("tipo") or "documento"
        resumo = _cap(sec.get("resumo"), SECTION_TEXT_CAP)
        if not resumo:
            resumo = _cap(sec.get("texto_extraido"), SECTION_TEXT_CAP)
        if resumo:
            drive_lines.append(f"- **{titulo}**: {resumo}")
    if drive_lines:
        parts.append("### Documentos no Drive (resumos)\n" + "\n".join(drive_lines))

    # Atendimentos (≤MAX_POR_TIPO por tipo, ≤MAX_REGISTROS total)
    atend_lines = []
    per_tipo = {}
    total = 0
    for r in (registros or []):
        if total >= MAX_REGISTROS:
            break
        tipo = r.get("tipo") or "registro"
        if per_tipo.get(tipo, 0) >= MAX_POR_TIPO:
            continue
        dossie_at = r.get("dossie_atendimento") or {}
        resumo = ""
        if isinstance(dossie_at, dict):
            rs = dossie_at.get("resumo")
            if isinstance(rs, list):
                rs = " ".join(str(x) for x in rs)
            resumo = _cap(rs, ATEND_TEXT_CAP)
        if not resumo:
            resumo = _cap(r.get("transcricao_resumo"), ATEND_TEXT_CAP)
        if not resumo:
            resumo = _cap(r.get("conteudo"), ATEND_TEXT_CAP)
        if not resumo:
            continue
        data = _cap(r.get("data_registro"), 10)
        subtipo = r.get("subtipo") or ""
        tag = f"{tipo}/{subtipo}" if subtipo else tipo
        line = f"- {data} [{tag}]: {resumo}"
        enr = r.get("enrichment_data") or {}
        kp = enr.get("key_points") if isinstance(enr, dict) else None
        if isinstance(kp, list) and kp:
            line += "\n  - pontos-chave: " + "; ".join(str(x) for x in kp[:MAX_KEY_POINTS])
        atend_lines.append(line)
        per_tipo[tipo] = per_tipo.get(tipo, 0) + 1
        total += 1
    if atend_lines:
        parts.append("### Atendimentos (o que o assistido relatou)\n" + "\n".join(atend_lines))

    # Mídias (áudio/vídeo já transcrito) — resumo preferido, senão transcrição capada
    midia_lines = []
    for m in (midias or [])[:MAX_MIDIAS]:
        enr = m.get("enrichment_data") or {}
        resumo = ""
        if isinstance(enr, dict):
            resumo = _cap(enr.get("summary"), MIDIA_TEXT_CAP)
            if not resumo:
                resumo = _cap(enr.get("transcript_plain") or enr.get("transcript"), MIDIA_TEXT_CAP)
        if not resumo:
            continue
        nome = m.get("name") or "mídia"
        midia_lines.append(f"- **{nome}**: {resumo}")
    if midia_lines:
        parts.append("### Mídias (áudio/vídeo transcrito)\n" + "\n".join(midia_lines))

    # Análises anteriores (já normalizadas em {origem, resumo})
    an_lines = []
    for a in (analises or []):
        resumo = _cap(a.get("resumo"), SECTION_TEXT_CAP)
        if resumo:
            an_lines.append(f"- ({a.get('origem', 'análise')}) {resumo}")
    if an_lines:
        parts.append("### Análises anteriores\n" + "\n".join(an_lines))

    # Processos associados/conexos (citados nos autos)
    if associados:
        assoc_lines = [f"- {c}" for c in associados[:MAX_ASSOCIADOS]]
        parts.append("### Processos associados/conexos (citados nos autos)\n" + "\n".join(assoc_lines))

    # Processos relacionados (aba Associados do PJe + citados nos autos, classificados)
    if relacionados:
        rl = []
        for r in relacionados[:MAX_ASSOCIADOS]:
            cl = r.get("classe") or ""
            label = f"{r.get('tipo','')}/{cl}" if cl else r.get("tipo", "")
            ass = f" — {r['assunto']}" if r.get("assunto") else ""
            extra = " 🔒 sigiloso" if r.get("sigilo") else ""
            rl.append(f"- [{label}] {r['cnj']}{ass} ({r.get('grau','')}){extra}")
        parts.append("### Processos relacionados (associados na aba + citados nos autos)\n" + "\n".join(rl))

    if not parts:
        return ""
    body = "## Dossiê do assistido (contexto além dos autos)\n\n" + "\n\n".join(parts)
    if len(body) > MAX_DOSSIE_CHARS:
        body = body[:MAX_DOSSIE_CHARS] + "\n\n[…dossiê truncado]"
    return body


def _norm_analises(assistido_rows, processo_rows, registro_rows) -> list:
    """Normaliza análises anteriores em [{origem, resumo}]."""
    out = []
    for r in (assistido_rows or []):
        ad = r.get("analysis_data") or {}
        if isinstance(ad, dict) and ad.get("resumo"):
            out.append({"origem": "assistido", "resumo": ad["resumo"]})
    for r in (processo_rows or []):
        ad = r.get("analysis_data") or {}
        if isinstance(ad, dict) and ad.get("resumo"):
            out.append({"origem": "processo", "resumo": ad["resumo"]})
    for r in (registro_rows or []):
        en = r.get("enrichment_data") or {}
        if isinstance(en, dict):
            res = en.get("resumo") or en.get("objeto")
            if res:
                out.append({"origem": "análise anterior", "resumo": res})
    return out


def fetch_dossie_data(sb, assistido_id: int):
    """GETs PostgREST (select= explícito). Retorna (sections, registros, analises, midias)."""
    aid = int(assistido_id)
    sections = sb._req(
        "GET",
        f"/rest/v1/drive_document_sections?select=tipo,titulo,resumo,texto_extraido,review_status,drive_files!inner(assistido_id)"
        f"&drive_files.assistido_id=eq.{aid}&review_status=neq.rejected&order=updated_at.desc&limit=30",
    ) or []
    # Mídias do assistido (áudio/vídeo) já transcritas — resumo/transcrição vivem
    # em drive_files.enrichment_data (jsonb). Filtra por mime_type de mídia.
    midias = sb._req(
        "GET",
        f"/rest/v1/drive_files?select=name,mime_type,enrichment_data"
        f"&assistido_id=eq.{aid}&or=(mime_type.like.audio*,mime_type.like.video*)"
        f"&order=last_modified_time.desc&limit=20",
    ) or []
    registros = sb._req(
        "GET",
        f"/rest/v1/registros?select=data_registro,tipo,subtipo,conteudo,dossie_atendimento,transcricao_resumo,enrichment_data"
        f"&assistido_id=eq.{aid}&order=data_registro.desc&limit=60",
    ) or []
    a_rows = sb._req("GET", f"/rest/v1/assistidos?select=analysis_data&id=eq.{aid}") or []
    p_rows = sb._req("GET", f"/rest/v1/processos?select=analysis_data&assistido_id=eq.{aid}") or []
    an_rows = sb._req(
        "GET",
        f"/rest/v1/registros?select=enrichment_data,data_registro&assistido_id=eq.{aid}&tipo=eq.analise&order=data_registro.desc&limit=10",
    ) or []
    analises = _norm_analises(a_rows, p_rows, an_rows)
    return sections, registros, analises, midias


def build_dossie_assistido(sb, assistido_id, associados: list = None, relacionados: list = None) -> str:
    """fetch + format. NUNCA levanta — retorna '' em qualquer erro (a Fase 2c
    nunca quebra por causa do dossiê)."""
    try:
        if not assistido_id and not associados and not relacionados:
            return ""
        sections, registros, analises, midias = ([], [], [], [])
        if assistido_id:
            sections, registros, analises, midias = fetch_dossie_data(sb, assistido_id)
        return format_dossie(sections, registros, analises, associados=associados, midias=midias, relacionados=relacionados)
    except Exception:
        return ""


def build_analise_autos_task(row: dict, demanda_id: int, created_by: int, dossie: str = "") -> dict:
    """Values da task lane=ai `analise-autos` (mesmo caminho do coworkAnalise),
    com demandaId embutido p/ o fechamento de estado ser derivável na leitura.
    `dossie` (opcional) = contexto do assistido, concatenado ao prompt."""
    prompt = f"Análise profunda dos autos — demanda {demanda_id}"
    if dossie:
        prompt += "\n\n" + dossie
    return {
        "assistido_id": row["assistido_id"],
        "processo_id": row["processo_id"],
        "skill": "analise-autos",
        "lane": "ai",
        "prompt": prompt,
        "instrucao_adicional": json.dumps({"demandaId": demanda_id, "fonte": "fase2c"}),
        "status": "pending",
        "created_by": created_by,
    }


# ───── Fluxo CDP (browser-broker-daemon) ──────────────────────────────────────
#
# Reuso do varredura-triagem: conexão Supabase REST (Supabase, load_env),
# navegação do painel (_ensure_logged_in, navigate_to_unidade, find_in_panel) e a
# primitiva de download (baixar_pdf_autos). Nomes REAIS confirmados por grep em
# varredura_triagem.py — NÃO existem `abrir_cdp`/`resolver_link_autos`/
# `distribuir_autos_para_assistido`/`Supabase.insert_claude_code_task` (eram
# placeholders do brief); ver task-5-report.md §symbol-map.
_VT = Path(__file__).resolve().parents[2] / "varredura-triagem" / "scripts"
sys.path.insert(0, str(_VT))
import varredura_triagem as vt  # noqa: E402
# Fase 2b: primitiva de autos do SEEU (roteamento EP→SEEU, resto→PJe). Vive no
# mesmo dir da 2a (varredura-triagem/scripts). A coleta/download é live-gated.
import seeu_autos as sa  # noqa: E402

# distribuir-autos vive FORA do repo (skill pessoal, ~/.claude/skills) — é o
# script real que casa CNJ→pasta do assistido no Drive. Best-effort: se ele não
# existir na máquina (ex.: CI), a distribuição falha isolada e o estado vira
# 'erro' sem tocar em nada no disco.
_DISTRIBUIR_SCRIPT = (
    Path.home() / ".claude" / "skills" / "distribuir-autos" / "scripts" / "distribuir_autos.py"
)
# Mesma pasta-inbox que distribuir_autos.py::INBOX (BASE/"2 - Distribuição").
# Duplicado aqui de propósito (evita importar aquele módulo — que faz
# `import psycopg2` e conecta ao Postgres no import — só para ler uma constante
# de path). Mantenha em sincronia se o inbox mudar de lugar.
_DISTRIBUIR_INBOX = (
    Path.home() / "Library" / "CloudStorage"
    / "GoogleDrive-rodrigorochameire@gmail.com" / "Meu Drive"
    / "1 - Defensoria 9ª DP" / "2 - Distribuição"
)


def insert_claude_code_task(sb: "vt.Supabase", task: dict) -> int | None:
    """POST /rest/v1/claude_code_tasks com um payload JÁ montado (o de
    build_analise_autos_task). Não existe um `Supabase.insert_claude_code_task`
    no varredura_triagem.py — o mais próximo é `enqueue_ai_task`, que monta seu
    próprio dict (skill/demanda_ids) e não serve para o nosso payload por-linha
    (assistido_id/processo_id/skill/lane/prompt/instrucao_adicional/status/
    created_by). Mesmo padrão de headers/url de Supabase.insert_registro."""
    import urllib.request, urllib.error

    headers = dict(sb.headers)
    headers["Prefer"] = "return=representation"
    data = json.dumps(task).encode()
    req = urllib.request.Request(
        f"{sb.url}/rest/v1/claude_code_tasks", data=data, headers=headers, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode()
            rows = json.loads(txt) if txt else []
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"POST claude_code_tasks → {e.code}: {e.read().decode()[:300]}")
    return rows[0]["id"] if isinstance(rows, list) and rows else None


def _distribuir_para_assistido(pdf_path: str, cnj: str) -> dict:
    """Copia o PDF baixado (em /tmp) para o inbox do distribuir-autos, nomeado
    pelo CNJ (casa com o regex CNJ_RE daquele script), e roda o script (mesmo
    Python do worker — já tem psycopg2, ver task-5-report.md) para movê-lo à
    pasta do assistido no Drive. Não apaga nada em caso de falha — o PDF fica
    parado no inbox (mesmo comportamento do watcher normal)."""
    if not _DISTRIBUIR_SCRIPT.exists():
        raise RuntimeError(f"distribuir_autos.py não encontrado em {_DISTRIBUIR_SCRIPT}")
    _DISTRIBUIR_INBOX.mkdir(parents=True, exist_ok=True)
    dest = _DISTRIBUIR_INBOX / f"{cnj}.pdf"
    shutil.copy2(pdf_path, dest)
    r = subprocess.run(
        [sys.executable, str(_DISTRIBUIR_SCRIPT), "--apply", "--create-folders", "--quiet"],
        capture_output=True, text=True, timeout=90,
    )
    if r.returncode != 0:
        raise RuntimeError(
            f"distribuir_autos.py saiu com código {r.returncode}: "
            f"{(r.stderr or r.stdout or '')[:200]}"
        )
    # Sucesso (código 0) normalmente MOVE o arquivo para fora do inbox. Se ele
    # ainda estiver lá, o CNJ não bateu com o regex do script (falha parcial
    # silenciosa) — a análise não pode seguir como se os autos tivessem sido
    # distribuídos.
    if dest.exists():
        raise RuntimeError(f"autos não distribuídos (arquivo ainda no inbox: {dest})")
    return {"invoked": True, "inbox_file": str(dest)}


def _distribuir_autos_multiplos(pdf_paths: list[str], cnj: str) -> dict:
    """SEEU (2b) devolve VÁRIOS documentos por processo. Copia cada PDF para o
    inbox do distribuir-autos com o CNJ no nome (p/ o CNJ_RE daquele script casar)
    e roda o script UMA vez para movê-los à pasta do assistido. Mesma disciplina
    de falha de _distribuir_para_assistido: se algum ficou no inbox (CNJ não bateu),
    erra — a análise não segue como se os autos tivessem sido distribuídos."""
    if not _DISTRIBUIR_SCRIPT.exists():
        raise RuntimeError(f"distribuir_autos.py não encontrado em {_DISTRIBUIR_SCRIPT}")
    _DISTRIBUIR_INBOX.mkdir(parents=True, exist_ok=True)
    dests = []
    for p in pdf_paths:
        # prefixa o CNJ no nome (o basename da 2b é <seq>_<tipo>.pdf, sem CNJ)
        dest = _DISTRIBUIR_INBOX / f"{cnj} - {Path(p).name}"
        shutil.copy2(p, dest)
        dests.append(dest)
    r = subprocess.run(
        [sys.executable, str(_DISTRIBUIR_SCRIPT), "--apply", "--create-folders", "--quiet"],
        capture_output=True, text=True, timeout=180,
    )
    if r.returncode != 0:
        raise RuntimeError(
            f"distribuir_autos.py saiu com código {r.returncode}: "
            f"{(r.stderr or r.stdout or '')[:200]}"
        )
    parados = [str(d) for d in dests if d.exists()]
    if parados:
        raise RuntimeError(f"autos não distribuídos (arquivos ainda no inbox: {parados[:3]})")
    return {"invoked": True, "count": len(dests)}


async def main_async(meta: dict) -> dict:
    """Baixa autos → Drive → enfileira análise ai → estado. Retorna dict de
    resultado (o daemon captura o último objeto JSON impresso em stdout)."""
    demanda_id = meta["demanda_id"]

    env = vt.load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        return {"ok": False, "erro": "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes"}
    sb = vt.Supabase(sb_url, sb_key)  # Supabase(url, key) — não é singleton do vt

    # 1. resolve demanda→processo→CNJ+assistido (mesmo shape usado pelo varredura
    # via list_demandas_by_ids/build_by_ids_params).
    rows = sb.list_demandas_by_ids([demanda_id])
    if not rows:
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": "demanda não encontrada"}
    row = rows[0]
    processo = row.get("processos") or {}
    cnj = processo.get("numero_autos")
    assistido_nome = (row.get("assistidos") or {}).get("nome") or "?"
    atribuicao = meta.get("atribuicao") or processo.get("atribuicao")
    if not cnj:
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": "processo sem numero_autos"}

    # resume-safe: se uma rodada anterior já deixou a demanda 'analisando'/
    # 'concluida', não repete download nem reenfileira a task ai.
    status_atual = sb._req(
        "GET", f"/rest/v1/demandas?id=eq.{demanda_id}&select=analise_profunda_status"
    )
    status_atual = (status_atual[0].get("analise_profunda_status") if status_atual else None)
    if status_atual in ("analisando", "concluida"):
        return {"ok": True, "skipped": True, "status": status_atual, "cnj": cnj}

    sb.update_demanda(demanda_id, {"analise_profunda_status": "baixando_autos"})

    try:
        if vt.async_playwright is None:
            raise RuntimeError("patchright não instalado — ative .venv do enrichment-engine")

        # Roteamento da fonte de autos (2b): EXECUCAO_PENAL vem do SEEU; o resto
        # (Júri/VVD/Criminal) do PJe. Determina se tocamos ou não o PJe SSO.
        fonte = sa.escolhe_fonte_autos(atribuicao)
        associados = []

        async with vt.async_playwright() as p:
            # Conexão CDP inline — mesmo padrão de varredura() (não há um
            # `abrir_cdp()` isolado no varredura_triagem.py).
            browser = await p.chromium.connect_over_cdp(vt.CDP_URL)
            ctx = browser.contexts[0]

            if fonte == "seeu":
                # Execução Penal: autos vêm do SEEU (Mesa do Defensor da 2a).
                # NUNCA navegar para o PJe SSO aqui (gotcha 2a/1.5: isso destrói a
                # sessão da Mesa do SEEU). baixar_autos_seeu devolve VÁRIOS PDFs.
                pdf_paths = await sa.baixar_autos_seeu(ctx, cnj)
                if not pdf_paths:
                    sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
                    return {"ok": False, "erro": "autos do SEEU não baixados"}
            else:
                page = await vt._ensure_logged_in(ctx)

                if atribuicao:
                    try:
                        await page.goto(vt.PANEL_URL, wait_until="domcontentloaded", timeout=30000)
                        await asyncio.sleep(2)
                        await vt.navigate_to_unidade(page, atribuicao)
                    except Exception as e:  # noqa: BLE001
                        # segue mesmo assim: find_in_panel pode falhar se o painel
                        # não navegou até a vara certa — vira "expediente não
                        # encontrado" abaixo, que é reportável e re-disparável.
                        vt.log(f"  ⚠ navegação do painel falhou: {str(e)[:120]}")

                # 2. resolve o link de autos completos do processo (find_in_panel —
                # busca por doc_id e, na falta, por número do processo) e baixa
                # (baixar_pdf_autos reaplica a trava anti-ciência).
                doc_id = row.get("pje_documento_id") or (row.get("enrichment_data") or {}).get(
                    "id_documento_pje"
                )
                doc_id = str(doc_id) if doc_id else None
                autos_url = await vt.find_in_panel(page, doc_id, cnj)
                if not autos_url:
                    sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
                    return {"ok": False, "erro": "expediente não encontrado no painel PJe"}

                pdf_path = await vt.baixar_pdf_autos(ctx, autos_url)
                if not pdf_path:
                    sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
                    return {"ok": False, "erro": "autos não baixados (sigilo/sem link)"}

                associados = extrair_associados_autos(pdf_path, cnj)

        # 3. organiza no Drive (distribuir-autos por CNJ → <assistido>/Autos/).
        distribuido = (
            _distribuir_autos_multiplos(pdf_paths, cnj) if fonte == "seeu"
            else _distribuir_para_assistido(pdf_path, cnj)
        )

        # 4. enfileira a análise (lane ai) + estado analisando.
        dossie = build_dossie_assistido(sb, row["assistido_id"], associados=associados)
        task = build_analise_autos_task(
            {"assistido_id": row["assistido_id"], "processo_id": row["processo_id"]},
            demanda_id=demanda_id, created_by=meta["defensor_id"], dossie=dossie,
        )
        ai_id = insert_claude_code_task(sb, task)
        sb.update_demanda(demanda_id, {
            "analise_profunda_status": "analisando",
            "analise_profunda_task_id": ai_id,
        })
        return {
            "ok": True, "cnj": cnj, "assistido": assistido_nome,
            "ai_task_id": ai_id, "distribuido": distribuido,
        }
    except Exception as e:  # noqa: BLE001
        sb.update_demanda(demanda_id, {"analise_profunda_status": "erro"})
        return {"ok": False, "erro": str(e)[:200]}


def main():
    meta = parse_args_meta(sys.argv[1:])
    result = asyncio.run(main_async(meta))
    # O daemon captura o último objeto JSON do stdout em resultado.
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
