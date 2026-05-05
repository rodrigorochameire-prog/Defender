#!/usr/bin/env python3
"""
PJe → OMBUDS: importa expedientes MPU pendentes do painel VVD.

Reusa login_requests do scraper Júri. Resolve sigilo de polo passivo
via 1ª via privilegiada (sessão de representante), fallback ao token
`ca` quando 1ª via não retornar partes.

Uso:
  python3 scripts/pje_mpu_import.py                         # roda nos 31 pendentes
  python3 scripts/pje_mpu_import.py --dry-run               # imprime, não posta
  python3 scripts/pje_mpu_import.py --processo-pje-id=XXX   # filtra para 1 processo
"""
from __future__ import annotations
import argparse, datetime, html as htmlmod, json, os, re, sys, time
from pathlib import Path
from typing import Any
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Reuso máximo do scraper Júri (mesmo .env.local, mesma sessão, mesmo padrão AJAX)
sys.path.insert(0, str(Path(__file__).parent))
from pje_intimacoes_scraper import (  # noqa: E402
    login_requests,
    log,
    ajax,
    _ajax_expand,
    _find_camacari_id,
    PJE_BASE,
    PJE_PANEL,
    PJE_AJAX_HDR,
)


# ───── Constantes de URL específicas do importador MPU ────────────────────
LISTVIEW_URL = f"{PJE_BASE}/Processo/ConsultaProcesso/Detalhe/listView.seam"
LISTPROCESSOCOMPLETO_URL = f"{PJE_BASE}/Processo/ConsultaDocumento/listProcessoCompleto.seam"

OMBUDS_URL = "https://ombuds.vercel.app/api/cron/pje-import"


# ───── Helpers ─────────────────────────────────────────────────────────────


def load_env() -> dict[str, str]:
    """Carrega .env.local de Projetos/Defender."""
    env_path = Path.home() / "Projetos/Defender/.env.local"
    env: dict[str, str] = dict(os.environ)
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ───── Stubs (preenchidos nas próximas tasks) ──────────────────────────────

def parse_expedientes_list(html: str) -> list[dict]:
    """Extrai expedientes do HTML do painel VVD.

    Cada expediente: numero_cnj, processo_pje_id, data_expedicao,
    tipo_documento, prazo. Linhas <tr class="rich-table-row">.
    """
    expedientes: list[dict] = []

    # Cada linha de expediente é um <tr class="rich-table-row">
    for row in re.finditer(
        r'<tr[^>]*class="[^"]*rich-table-row[^"]*"[^>]*>(.*?)</tr>',
        html, re.DOTALL | re.IGNORECASE,
    ):
        block = row.group(1)

        # processo_pje_id vem do onclick="openProcesso('1234567')"
        pje_id_m = re.search(r"openProcesso\('(\d+)'\)", block)
        # numero CNJ
        cnj_m = re.search(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", block)
        # data de expedição
        exp_m = re.search(
            r"Expedi[çc][aã]o\s+eletr[oô]nica\s*\((\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2})?)\)",
            block,
        )
        # prazo
        prazo_m = re.search(r"Prazo:\s*(\d+\s*dias?)", block, re.IGNORECASE)
        # tipo documento — primeiro <div> que NÃO é partes/vara/destinatário
        tipo_m = None
        for div in re.finditer(r"<div>([^<]+)</div>", block):
            txt = div.group(1).strip()
            if (txt
                and " X " not in txt
                and not txt.startswith("/")
                and not ("Defensoria" in txt and "Pública" in txt)
                and not re.match(r"\d{7}-", txt)):
                tipo_m = txt
                break

        if not (pje_id_m and cnj_m):
            continue

        expedientes.append({
            "numero_cnj": cnj_m.group(0),
            "processo_pje_id": pje_id_m.group(1),
            "data_expedicao": exp_m.group(1).strip() if exp_m else "",
            "tipo_documento": tipo_m or "",
            "prazo": prazo_m.group(1).strip() if prazo_m else "",
        })

    return expedientes


def _find_vara_vvd_id(html: str) -> tuple[str | None, int]:
    """Busca o ID 'cxExItem' da Vara de Violência Doméstica.

    Espelha _find_vara_juri_id do scraper Júri (linhas 158-179): encontra
    o span com nome da vara e recua no HTML para achar o ID exato.
    """
    span_patterns = [
        r"Vara de Viol[êe]ncia Dom[êe]stica",
        r"Viol[êe]ncia Dom[êe]stica",
    ]
    for pat in span_patterns:
        m = re.search(
            r'<span class="nomeTarefa[^"]*">[^<]*' + pat + r'[^<]*</span>',
            html, re.IGNORECASE,
        )
        if not m:
            m = re.search(pat, html, re.IGNORECASE)
        if m:
            pos = m.start()
            snippet = html[max(0, pos - 2000): pos]
            ids = re.findall(r'id="(formAbaExpediente[^"]+cxExItem)"', snippet)
            if ids:
                count_m = re.search(r"Número de itens (\d+)", html[pos: pos + 300])
                count = int(count_m.group(1)) if count_m else 0
                return ids[-1], count
    return None, 0


def navigate_to_vvd_panel(session: requests.Session) -> str:
    """Navega EXPEDIENTES → Apenas pendentes → CAMAÇARI → Vara VVD.

    Espelha navigate_to_vara_expedientes do scraper Júri (mesma sequência
    AJAX, ViewState fixo "j_id1", `_ajax_expand` reusado), trocando apenas
    a busca da vara para `_find_vara_vvd_id`.
    """
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

    # Vara VVD pode já estar visível (árvore pré-expandida) ou exigir expandir CAMAÇARI
    vara_id, vara_count = _find_vara_vvd_id(resp2)
    if vara_id:
        log(f"Vara VVD já visível sem expandir CAMAÇARI: ID={vara_id}, count={vara_count}")
    else:
        camacari_id = _find_camacari_id(resp2)
        if not camacari_id:
            raise RuntimeError("CAMAÇARI não encontrado na árvore de expedientes")
        log(f"CAMAÇARI encontrado: ID={camacari_id}")

        log("Expandindo CAMAÇARI...")
        resp3 = _ajax_expand(session, camacari_id)
        vara_id, vara_count = _find_vara_vvd_id(resp3)

        if not vara_id:
            # Toggle pode ter colapsado — re-expandir
            log("Vara VVD não encontrada (possível colapso), re-expandindo CAMAÇARI...")
            resp3 = _ajax_expand(session, camacari_id)
            vara_id, vara_count = _find_vara_vvd_id(resp3)

        if not vara_id:
            raise RuntimeError("Vara de Violência Doméstica não encontrada após expandir CAMAÇARI")

    log(f"Vara VVD encontrada: ID={vara_id}, count={vara_count}")
    log(f"Expandindo vara ({vara_count} expedientes)...")
    return _ajax_expand(session, vara_id)


def _extract_ca_token(html: str) -> str | None:
    """Extrai token `ca` (32 hex chars) do popup Peticionar.

    Tenta 3 estratégias em ordem:
      1. data-ca="..." em qualquer atributo HTML
      2. ?ca=... em URL embutida
      3. var ca = "..." em JS inline
    """
    for pattern in (
        r'data-ca=["\']([a-f0-9]{32})["\']',
        r'[?&]ca=([a-f0-9]{32})',
        r'var\s+ca\s*=\s*["\']([a-f0-9]{32})["\']',
    ):
        m = re.search(pattern, html, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _parse_partes_from_html(html: str) -> list[dict]:
    """Extrai partes da seção 'partes' do HTML do processo.

    Cada linha (`<tr>`) com tipo + nome + (CPF/OAB opcional).
    Tipos reconhecidos: REQUERENTE, REQUERIDO, REPRESENTANTE, AUTOR, RÉU, etc.
    """
    partes: list[dict] = []
    TIPO_RE = re.compile(
        r"^\s*(REQUERENTE|REQUERIDO|REPRESENTANTE|AUTOR|R[ÉE]U|V[ÍI]TIMA|TESTEMUNHA)\s*$",
        re.IGNORECASE,
    )

    # Procurar bloco de partes (id="partes" ou heurística mais ampla)
    bloco_m = re.search(r'<table[^>]*id="partes"[^>]*>(.*?)</table>', html, re.DOTALL)
    if not bloco_m:
        # Fallback: procurar por qualquer tabela contendo REQUERIDO ou REQUERENTE
        bloco_m = re.search(r"<table[^>]*>([^<]*?(?:REQUERIDO|REQUERENTE).*?)</table>", html, re.DOTALL | re.IGNORECASE)
    if not bloco_m:
        return partes

    for row in re.finditer(r"<tr[^>]*>(.*?)</tr>", bloco_m.group(1), re.DOTALL):
        cells = re.findall(r"<td[^>]*>([^<]*)</td>", row.group(1))
        if not cells or len(cells) < 2:
            continue

        tipo_cell = cells[0].strip()
        if not TIPO_RE.match(tipo_cell):
            continue

        nome = htmlmod.unescape(cells[1].strip())
        if not nome:
            continue

        parte = {"tipo": tipo_cell.lower(), "nome": nome}
        # CPF / OAB no terceiro campo (se houver)
        if len(cells) >= 3:
            extra = cells[2].strip()
            cpf_m = re.search(r"CPF:\s*([\d.\-]+)", extra)
            oab_m = re.search(r"OAB:\s*([A-Z/]+\s*\d*)", extra)
            if cpf_m:
                parte["cpf"] = cpf_m.group(1)
            if oab_m:
                parte["oab"] = oab_m.group(1).strip()

        partes.append(parte)

    return partes


def resolve_polo_passivo(session: requests.Session, processo_pje_id: str) -> dict:
    """1ª via privilegiada → fallback via token `ca`."""
    # 1ª via: GET listView.seam?id=<id>
    r = session.get(f"{LISTVIEW_URL}?id={processo_pje_id}", timeout=30, verify=False)
    if r.status_code != 200:
        return {"partes": [], "via": "listView_error"}

    partes = _parse_partes_from_html(r.text)
    if partes:
        return {"partes": partes, "via": "listView"}

    # 2ª via (fallback): extrair `ca` do popup → listProcessoCompleto.seam
    ca = _extract_ca_token(r.text)
    if not ca:
        return {"partes": [], "via": "ca_not_found"}

    r2 = session.get(f"{LISTPROCESSOCOMPLETO_URL}?ca={ca}", timeout=30, verify=False)
    if r2.status_code != 200:
        return {"partes": [], "via": "ca_http_error"}

    partes2 = _parse_partes_from_html(r2.text)
    if partes2:
        return {"partes": partes2, "via": "ca_fallback"}

    return {"partes": [], "via": "ca_empty"}


def _normalize(s: str) -> str:
    import unicodedata
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()


def _is_dpe(parte: dict) -> bool:
    """DPE-BA: nome contém 'defensoria', tipo='representante', ou OAB='DPE/BA'."""
    nome = _normalize(parte.get("nome", ""))
    tipo = _normalize(parte.get("tipo", ""))
    oab = _normalize(parte.get("oab", ""))
    return "defensoria" in nome or tipo == "representante" or "dpe" in oab


def identify_requerido(partes: list[dict]) -> str | None:
    """Cascata: tipo > CPF > não-DPE > None (placeholder)."""
    # Regra 1: tipo explícito "requerido"
    requeridos = [p for p in partes if _normalize(p.get("tipo", "")) == "requerido"]
    if len(requeridos) == 1:
        return requeridos[0]["nome"]
    if len(requeridos) > 1:
        return " e ".join(p["nome"] for p in requeridos)

    # Regra 2: primeira parte com CPF que NÃO é DPE
    for p in partes:
        if p.get("cpf") and not _is_dpe(p):
            return p["nome"]

    # Regra 3: primeira parte que NÃO é DPE
    for p in partes:
        if not _is_dpe(p):
            return p["nome"]

    return None


PLACEHOLDER_NOME = "⚠ A identificar — {cnj}"
VARA_FIXA = "/Vara de Violência Doméstica de Camaçari"
REQUERENTE_PLACEHOLDER = "REQUERENTE"  # nome anonimizado (sigilo)


def format_for_endpoint(expediente: dict, requerido: str | None) -> str:
    """Bloco de texto no formato consumido por parsePJeIntimacoesCompleto.

    Exemplo de saída:
      Designação de audiência
      MPUMPCrim 8001234-12.2026.8.05.0039
      REQUERENTE X João Pereira
      /Vara de Violência Doméstica de Camaçari
      Expedição eletrônica (28/04/2026 10:23)
      Prazo: 5 dias
    """
    cnj = expediente["numero_cnj"]
    nome_assistido = requerido or PLACEHOLDER_NOME.format(cnj=cnj)

    # Linha 3: prefixo MPUMPCrim para o parser detectar tipoProcesso='MPUMPCrim'
    # e classificar como Medida Protetiva (regex em pje-parser.ts:311)
    linha_processo = f"MPUMPCrim {cnj}"

    linhas: list[str] = []
    if expediente.get("tipo_documento"):
        linhas.append(expediente["tipo_documento"])
    linhas.append(linha_processo)
    linhas.append(f"{REQUERENTE_PLACEHOLDER} X {nome_assistido}")
    linhas.append(VARA_FIXA)
    if expediente.get("data_expedicao"):
        linhas.append(f"Expedição eletrônica ({expediente['data_expedicao']})")
    if expediente.get("prazo"):
        linhas.append(f"Prazo: {expediente['prazo']}")

    return "\n".join(linhas)


def post_to_ombuds(blocos_texto: list[str], cron_secret: str, defensor_id: int) -> dict:
    """POST único com texto VVD concatenado em blocos separados por \\n\\n."""
    texto_vvd = "\n\n".join(blocos_texto)
    payload = json.dumps({
        "textoVvd": texto_vvd,
        "defensorId": defensor_id,
    }).encode()

    import urllib.request
    req = urllib.request.Request(
        OMBUDS_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cron_secret}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa MPU do PJe → OMBUDS.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Imprime blocos no stdout, NÃO faz POST")
    parser.add_argument("--processo-pje-id", default=None,
                        help="Filtra para 1 processo só (validação manual)")
    args = parser.parse_args()

    env = load_env()
    if not env.get("PJE_CPF") or not env.get("PJE_SENHA"):
        sys.exit("ERRO: PJE_CPF/PJE_SENHA ausentes no .env.local")

    if not args.dry_run and not env.get("CRON_SECRET"):
        sys.exit("ERRO: CRON_SECRET ausente no .env.local (necessário para POST)")

    defensor_id = int(env.get("CRON_DEFENSOR_ID", "1"))

    # 1. Login
    log("Login no PJe...")
    session = login_requests()  # importado do scraper Júri

    # 2. Navegar até painel VVD
    log("Navegando para Vara de Violência Doméstica...")
    html_painel = navigate_to_vvd_panel(session)

    # 3. Parsear expedientes
    expedientes = parse_expedientes_list(html_painel)
    log(f"Encontrados {len(expedientes)} expedientes pendentes")
    if args.processo_pje_id:
        expedientes = [e for e in expedientes if e["processo_pje_id"] == args.processo_pje_id]
        log(f"Filtrado para processo_pje_id={args.processo_pje_id} → {len(expedientes)} restantes")
    if not expedientes:
        log("Nada a importar.")
        sys.exit(0)

    # 4. Para cada expediente: resolver sigilo + identificar + formatar
    blocos: list[str] = []
    placeholders = 0
    falhas = 0
    via_counts: dict[str, int] = {}

    for i, e in enumerate(expedientes, 1):
        log(f"[{i}/{len(expedientes)}] {e['numero_cnj']} (pjeId={e['processo_pje_id']})")
        try:
            r = resolve_polo_passivo(session, e["processo_pje_id"])
            via_counts[r["via"]] = via_counts.get(r["via"], 0) + 1
            requerido = identify_requerido(r["partes"])
            if requerido is None:
                placeholders += 1
                log(f"  ⚠ placeholder (via={r['via']})")
            else:
                log(f"  REQUERIDO={requerido} (via={r['via']})")
            bloco = format_for_endpoint(e, requerido)
            blocos.append(bloco)
        except Exception as exc:
            falhas += 1
            log(f"  ✗ {type(exc).__name__}: {exc}")
            continue
        time.sleep(0.3)  # gentil com PJe

    # 5. POST (ou dry-run)
    if args.dry_run:
        print("\n" + "=" * 60)
        print("DRY-RUN — nenhum POST será feito")
        print("=" * 60)
        for b in blocos:
            print(b)
            print()
        print(f"Total: {len(blocos)} blocos | placeholders: {placeholders} | falhas: {falhas} | vias: {via_counts}")
        sys.exit(0)

    log(f"POST {len(blocos)} blocos ao OMBUDS...")
    result = post_to_ombuds(blocos, env["CRON_SECRET"], defensor_id)

    # 6. Relatório
    vvd = result.get("vvd", {})
    print("\n" + "=" * 60)
    print(f"RELATÓRIO MPU IMPORT — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    print(f"Expedientes processados: {len(expedientes)}")
    print(f"Blocos enviados:         {len(blocos)}")
    print(f"  - importados:          {vvd.get('imported', '?')}")
    print(f"  - atualizados:         {vvd.get('updated', '?')}")
    print(f"  - duplicatas (skip):   {vvd.get('skipped', '?')}")
    print(f"Placeholders (REQUERIDO não identificado): {placeholders}")
    print(f"Falhas durante scraping:                   {falhas}")
    print(f"Vias usadas (sigilo): {via_counts}")
    print("=" * 60)


if __name__ == "__main__":
    main()
