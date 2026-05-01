#!/usr/bin/env python3
"""
PJe → OMBUDS: navega o painel via AJAX e importa intimações pendentes.
Vara do Júri e Execuções Penais de Camaçari (18 expedientes esperados).
Login via HTTP puro (sem Playwright) para evitar bot-detection do SSO.
"""
from __future__ import annotations
import datetime, html as htmlmod, json, os, re, sys, time, warnings
from pathlib import Path
import requests
warnings.filterwarnings("ignore")

from dotenv import load_dotenv
load_dotenv(Path.home() / "Projetos/Defender/.env.local")

PJE_CPF      = os.environ.get("PJE_CPF", "")
PJE_SENHA    = os.environ.get("PJE_SENHA", "")
CRON_SECRET  = os.environ.get("CRON_SECRET", "")
OMBUDS_URL   = "https://ombuds.vercel.app/api/cron/pje-import"
DEFENSOR_ID  = int(os.environ.get("CRON_DEFENSOR_ID", "1"))
PJE_BASE     = "https://pje.tjba.jus.br/pje"
PJE_PANEL    = f"{PJE_BASE}/Painel/painel_usuario/advogado.seam"
UA           = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

PJE_AJAX_HDR = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": PJE_PANEL,
    "User-Agent": UA,
    "Accept": "application/xml,text/xml",
}


def log(msg: str) -> None:
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def login_requests() -> requests.Session:
    """Login no PJe via HTTP puro — sem Playwright."""
    log("Login no PJe via HTTP...")
    session = requests.Session()
    session.verify = False
    session.headers.update({"User-Agent": UA})

    # Step 1: GET PJe login — follows redirect to Keycloak SSO
    r1 = session.get(
        f"{PJE_BASE}/login.seam",
        timeout=30,
        allow_redirects=True,
    )
    log(f"  SSO URL: {r1.url[:80]}")

    # Step 2: Parse form action from Keycloak login page
    m = re.search(r'action="([^"]+)"', r1.text)
    if not m:
        raise RuntimeError("Formulário de login não encontrado na página SSO")
    action_url = m.group(1).replace("&amp;", "&")
    log(f"  Form action: {action_url[:80]}")

    # Step 3: POST credentials
    r2 = session.post(
        action_url,
        data={"username": PJE_CPF, "password": PJE_SENHA, "credentialId": ""},
        headers={"Content-Type": "application/x-www-form-urlencoded", "Referer": r1.url},
        timeout=60,
        allow_redirects=True,
    )
    log(f"  Pós-login URL: {r2.url[:80]}")

    if "advogado.seam" not in r2.url:
        # Try a direct GET of the panel — SSO may have set cookies already
        r3 = session.get(PJE_PANEL, timeout=30, allow_redirects=True)
        log(f"  Retry painel URL: {r3.url[:80]}")
        if "advogado.seam" not in r3.url:
            raise RuntimeError(f"Login falhou — URL final: {r3.url!r}")

    log(f"Login OK — {len(session.cookies)} cookies")
    return session


def ajax(session: requests.Session, data: dict) -> str:
    """POST AJAX para o painel PJe."""
    resp = session.post(PJE_PANEL, headers=PJE_AJAX_HDR, data=data, timeout=60)
    resp.raise_for_status()
    return resp.text


def _ajax_expand(session: requests.Session, node_id: str) -> str:
    return ajax(session, {
        "AJAXREQUEST": "_viewRoot",
        node_id: node_id,
        "ajaxSingle": node_id,
        "javax.faces.ViewState": "j_id1",
        "formAbaExpediente": "formAbaExpediente",
    })


def navigate_to_vara_expedientes(session: requests.Session) -> str:
    """Navega via AJAX: EXPEDIENTES → Apenas pendentes → CAMAÇARI → Vara do Júri."""
    log("Carregando aba EXPEDIENTES...")
    ajax(session, {
        "AJAXREQUEST": "tabExpedientes",
        "tabExpedientes": "tabExpedientes",
        "selectedTab": "tabExpedientes",
        "pend": "true",
        "javax.faces.ViewState": "j_id1",
        "tabPanel:_form": "tabPanel:_form",
    })

    log("Expandindo 'Apenas pendentes de ciência'...")
    cid1 = "formAbaExpediente:listaAgrSitExp:1:j_id161"
    resp2 = ajax(session, {
        "AJAXREQUEST": "_viewRoot",
        cid1: cid1, "ajaxSingle": cid1,
        "javax.faces.ViewState": "j_id1",
        "formAbaExpediente": "formAbaExpediente",
    })

    # Check if Vara do Júri is already visible (tree was pre-expanded)
    vara_id, vara_count = _find_vara_juri_id(resp2)
    if vara_id:
        log(f"Vara já visível sem expandir CAMAÇARI: ID={vara_id}, count={vara_count}")
    else:
        camacari_id = _find_camacari_id(resp2)
        if not camacari_id:
            raise RuntimeError("CAMAÇARI não encontrado na árvore de expedientes")
        log(f"CAMAÇARI encontrado: ID={camacari_id}")

        log("Expandindo CAMAÇARI...")
        resp3 = _ajax_expand(session, camacari_id)
        vara_id, vara_count = _find_vara_juri_id(resp3)

        if not vara_id:
            # Toggle collapsed it — expand again
            log("Vara não encontrada (possível colapso), re-expandindo CAMAÇARI...")
            resp3 = _ajax_expand(session, camacari_id)
            vara_id, vara_count = _find_vara_juri_id(resp3)

        if not vara_id:
            raise RuntimeError("Vara do Júri e Execuções Penais não encontrada")

    log(f"Vara do Júri e Execuções encontrada: ID={vara_id}, count={vara_count}")
    log(f"Expandindo vara ({vara_count} expedientes)...")
    return _ajax_expand(session, vara_id)


def _find_camacari_id(html: str) -> str | None:
    """Find the jNp anchor ID for CAMAÇARI comarca by looking before its nomeTarefa span."""
    for m in re.finditer(r'<span class="nomeTarefa[^"]*">CAMAÇARI</span>', html):
        pos = m.start()
        snippet = html[max(0, pos - 800): pos]
        ids = re.findall(r'id="(formAbaExpediente[^"]+jNp)"', snippet)
        if ids:
            return ids[-1]
    return None


def _find_vara_juri_id(html: str) -> tuple[str | None, int]:
    """Find the cxExItem anchor ID for Vara do Júri e Execuções Penais."""
    span_patterns = [
        r"Vara do J[uú]ri e Execu[çc][oõ]es Penais",
        r"J[uú]ri e Execu[çc][oõ]es",
    ]
    for pat in span_patterns:
        m = re.search(
            r'<span class="nomeTarefa[^"]*">[^<]*' + pat + r'[^<]*</span>',
            html, re.IGNORECASE
        )
        if not m:
            m = re.search(pat, html, re.IGNORECASE)
        if m:
            pos = m.start()
            snippet = html[max(0, pos - 2000): pos]
            ids = re.findall(r'id="(formAbaExpediente[^"]+cxExItem)"', snippet)
            if ids:
                count_m = re.search(r'Número de itens (\d+)', html[pos: pos + 300])
                count = int(count_m.group(1)) if count_m else 0
                return ids[-1], count
    return None, 0


def extract_expedientes_text(html: str) -> str:
    """Parseia HTML da tabela de expedientes e constrói texto compatível com o parser."""
    doc_ids = list(dict.fromkeys(re.findall(r"formExpedientes:tbExpedientes:(\d+):", html)))
    log(f"Doc IDs encontrados: {len(doc_ids)}")

    blocks: list[str] = []

    for doc_id in doc_ids:
        row_start = html.find(f"formExpedientes:tbExpedientes:{doc_id}:j_id498")
        if row_start < 0:
            continue
        next_row = html.find('<tr class="rich-table-row', row_start + 100)
        row = html[row_start: next_row if next_row > 0 else row_start + 5000]

        dest_m   = re.search(r'title="Destinat[^"]+">([^<]+)', row)
        tipo_m   = re.search(r'title="Tipo de documento">([^<]+)', row)
        proc_m   = re.search(r'title="Autos Digitais">(\w+)\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', row)
        prazo_m  = re.search(r'title="Prazo para manifesta[^"]+">([^<]+)', row)
        vara_m   = re.search(r'<div>/([A-ZÁÉÍÓÚÃÕÇÀ][^<]{10,})</div>', row)
        exp_m    = re.search(r'Expedi[çc][aã]o\s+eletr[ôo]nica\s*\((\d{2}/\d{2}/\d{4}[^)]*)\)', row)
        partes_m = re.search(r'<div>([^<]+\sX\s[^<]+)</div>', row)
        crime_m  = re.search(r'copyToClipboard\([^)]+\);"[^>]*></div></span>(.*?)<div>', row, re.DOTALL)

        if not proc_m or not dest_m:
            continue

        dest   = dest_m.group(1).strip()
        tipo   = tipo_m.group(1).strip() if tipo_m else ""
        classe = proc_m.group(1)
        numero = proc_m.group(2)
        prazo  = prazo_m.group(1).strip() if prazo_m else ""
        vara   = "/" + vara_m.group(1).strip() if vara_m else ""
        exp    = f"Expedição eletrônica ({exp_m.group(1).strip()})" if exp_m else ""
        partes = htmlmod.unescape(partes_m.group(1).strip()) if partes_m else ""
        crime  = re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", "", crime_m.group(1)))).strip() if crime_m else ""

        lines: list[str] = []
        if dest:
            lines.append(dest)
        if tipo:
            lines.append(tipo)

        proc_line = f"{classe} {numero}"
        if crime:
            proc_line += f" {crime}"
        if partes:
            proc_line += f" {partes}"
        if vara:
            proc_line += f" {vara}"
        lines.append(proc_line)

        if exp:
            lines.append(exp)
        if prazo:
            lines.append(prazo)

        blocks.append("\n".join(lines))

    return "\n\n".join(blocks)


def post_to_ombuds(texto_juri: str, texto_execucoes: str = "") -> dict:
    payload = json.dumps({
        "textoJuri": texto_juri,
        "textoExecucoes": texto_execucoes,
        "defensorId": DEFENSOR_ID,
    }).encode()
    import urllib.request, urllib.error
    req = urllib.request.Request(
        OMBUDS_URL,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {CRON_SECRET}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def main() -> None:
    if not PJE_CPF or not PJE_SENHA:
        log("ERRO: PJE_CPF / PJE_SENHA ausentes")
        sys.exit(1)
    if not CRON_SECRET:
        log("ERRO: CRON_SECRET ausente")
        sys.exit(1)

    # 1. Login via HTTP puro
    session = login_requests()

    # 2. Navegar até a vara e obter HTML
    log("Navegando para Vara do Júri e Execuções Penais...")
    vara_html = navigate_to_vara_expedientes(session)

    # 3. Extrair texto
    log("Extraindo expedientes do HTML...")
    texto_juri = extract_expedientes_text(vara_html)
    if not texto_juri:
        log("AVISO: nenhum expediente extraído")
        log(f"DEBUG: primeiros 2000 chars do HTML da vara:\n{vara_html[:2000]}")
        sys.exit(0)
    log(f"Texto gerado: {len(texto_juri)} chars")

    # 4. Importar no OMBUDS
    log("Importando no OMBUDS...")
    result = post_to_ombuds(texto_juri)
    juri_r  = result.get("juri", {})
    exec_r  = result.get("execucoes", {})
    total   = result.get("totalNovas", 0)

    sep = "=" * 55
    print(f"\n{sep}")
    print(f"RELATÓRIO PJe — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(sep)
    print(f"JÚRI:        +{juri_r.get('imported',0)} novas | {juri_r.get('updated',0)} atualizadas | {juri_r.get('skipped',0)} duplicatas")
    print(f"EXECUÇÕES:   +{exec_r.get('imported',0)} novas | {exec_r.get('updated',0)} atualizadas | {exec_r.get('skipped',0)} duplicatas")
    print(f"TOTAL NOVAS: {total}")
    erros = juri_r.get("errors", []) + exec_r.get("errors", [])
    if erros:
        print(f"ERROS ({len(erros)}): {erros[:5]}")
    print(sep)


if __name__ == "__main__":
    main()
