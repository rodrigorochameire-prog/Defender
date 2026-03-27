#!/usr/bin/env python3
"""
PJe Scraper Local — Busca intimações da Vara do Júri, baixa PDFs e organiza no Drive.

Roda localmente no Mac via launchd (cron).
Conecta direto ao Supabase para gravar demandas.

Uso:
  python3 scripts/pje_scraper.py                    # Scrape + import (sem download PDF)
  python3 scripts/pje_scraper.py --download          # Scrape + import + download PDFs
  python3 scripts/pje_scraper.py --download --notify  # + notificação iMessage

Requer:
  pip install psycopg2-binary python-dotenv
  npm i -g agent-browser && agent-browser install
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, date
from pathlib import Path

# Carregar .env.local do projeto
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pje-scraper")

# ==========================================
# CONFIG
# ==========================================

PJE_CPF = os.getenv("PJE_CPF", "")
PJE_SENHA = os.getenv("PJE_SENHA", "")
PJE_URL = "https://pje.tjba.jus.br/pje/login.seam"
DATABASE_URL = os.getenv("DATABASE_URL", "")

DRIVE_BASE = Path.home() / "Library" / "CloudStorage" / "GoogleDrive-rodrigorochameire@gmail.com" / "Meu Drive" / "1 - Defensoria 9ª DP"
JURI_FOLDER = DRIVE_BASE / "Processos - Júri"

STATE_FILE = Path.home() / ".pje-scraper-state.json"

# Mapeamento classe → prefixo pasta
CLASSE_PREFIX = {
    "Juri": "AP", "InsanAc": "InsanAc", "LibProv": "LibProv",
    "PetCrim": "PetCrim", "EP": "EP", "IP": "IP",
    "AcNãoPerPenal": "AP", "APOrd": "AP",
}

# ==========================================
# STATE (evitar duplicatas entre execuções)
# ==========================================

def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"last_run": None, "imported_doc_ids": []}

def save_state(state: dict):
    state["last_run"] = datetime.now().isoformat()
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))

# ==========================================
# PJE LOGIN + SCRAPE
# ==========================================

def run_ab(session: str, *args) -> str:
    """Executa comando agent-browser e retorna output."""
    import subprocess
    cmd = ["agent-browser", "--session", session] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.stdout + result.stderr


async def login_pje() -> bool:
    """Login no PJe via agent-browser."""
    log.info("Abrindo PJe...")
    run_ab("pje", "open", PJE_URL)
    run_ab("pje", "wait", "--load", "networkidle")
    time.sleep(2)

    # Preencher login
    snap = run_ab("pje", "snapshot", "-i")
    if "CPF/CNPJ" in snap:
        run_ab("pje", "fill", "@e2", PJE_CPF)
        run_ab("pje", "fill", "@e3", PJE_SENHA)
        run_ab("pje", "click", "@e5")
        run_ab("pje", "wait", "--load", "networkidle")
        time.sleep(3)

    # Verificar login
    snap = run_ab("pje", "snapshot", "-i")
    if "Rodrigo Meire" in snap:
        log.info("Login OK")
        return True

    log.error("Login falhou")
    return False


async def navigate_to_juri() -> bool:
    """Navega até Vara do Júri de Camaçari via agent-browser."""
    # 1. Painel do representante processual
    log.info("Navegando para expedientes...")
    snap = run_ab("pje", "snapshot", "-i")

    # Encontrar ref do link "Painel do representante processual"
    found_painel = False
    for line in snap.split("\n"):
        if "representante processual" in line.lower():
            log.info("Encontrado: %s", line.strip()[:100])
            ref = re.search(r'ref=(\w+)', line)
            if ref:
                log.info("Clicando @%s...", ref.group(1))
                run_ab("pje", "click", f"@{ref.group(1)}")
                found_painel = True
                # Aguardar conteúdo carregar
                try:
                    run_ab("pje", "wait", "--text", "Pendentes")
                except Exception:
                    time.sleep(5)
                url = run_ab("pje", "get", "url")
                log.info("URL após clique: %s", url.strip()[:100])
                time.sleep(2)
                break

    if not found_painel:
        log.warning("'Painel do representante processual' não encontrado no snap")

    # Aguardar expedientes carregarem
    log.info("Aguardando expedientes...")
    # Scroll down para revelar conteúdo
    run_ab("pje", "scroll", "down", "500")
    time.sleep(2)

    for attempt in range(10):
        # Usar snapshot completo (incluindo cursor-interactive)
        snap = run_ab("pje", "snapshot", "-i", "-C")
        if "Pendentes" in snap or "pendentes" in snap:
            log.info("Expedientes carregados")
            break
        # Tentar scroll e snapshot com diferentes abordagens
        run_ab("pje", "scroll", "down", "300")
        time.sleep(2)
    else:
        # Debug: pegar texto completo da página
        text = run_ab("pje", "get", "text", "body")
        log.warning("Expedientes não carregaram. Body text: %s", text[:500])

    # 2. Clicar "Apenas pendentes de ciência"
    found_pendentes = False
    for line in snap.split("\n"):
        if "pendentes de ciência" in line.lower() or "pendentes de ciencia" in line.lower():
            log.info("Encontrado: %s", line.strip()[:100])
            ref = re.search(r'ref=(\w+)', line)
            if ref:
                run_ab("pje", "click", f"@{ref.group(1)}")
                log.info("Clicou 'Apenas pendentes de ciência'")
                found_pendentes = True
                time.sleep(5)
                break

    if not found_pendentes:
        log.warning("'Apenas pendentes de ciência' não encontrado")

    # 3. Expandir CAMAÇARI
    snap = run_ab("pje", "snapshot", "-i")
    found_camacari = False
    for line in snap.split("\n"):
        if "CAMAÇARI" in line and "ref=" in line:
            log.info("Encontrado CAMAÇARI: %s", line.strip()[:100])
            ref = re.search(r'ref=(\w+)', line)
            if ref:
                run_ab("pje", "click", f"@{ref.group(1)}")
                log.info("Expandiu CAMAÇARI")
                found_camacari = True
                time.sleep(3)
                break

    if not found_camacari:
        log.warning("CAMAÇARI não encontrado")

    # 4. Clicar Vara do Júri via JS (JSF)
    log.info("Clicando Vara do Júri...")
    import subprocess
    js_code = """(() => {
        const spans = document.querySelectorAll('span.nomeTarefa');
        for (const span of spans) {
            if (span.textContent.includes('Vara do Júri')) {
                span.closest('a').onclick();
                return 'ok';
            }
        }
        return 'not found';
    })()"""
    result = subprocess.run(
        ["agent-browser", "--session", "pje", "eval", js_code],
        capture_output=True, text=True, timeout=10,
    )
    if "ok" in result.stdout:
        log.info("Vara do Júri selecionada")
        time.sleep(4)
        return True

    log.error("Não encontrou Vara do Júri")
    return False


async def extract_intimacoes() -> list[dict]:
    """Extrai intimações da lista de expedientes via agent-browser snapshot."""
    snap = run_ab("pje", "snapshot", "-i")

    intimacoes = []
    lines = snap.split("\n")

    for line in lines:
        # Detectar cells com dados de intimação
        if not ("Expedição eletrônica" in line and ("Decisão" in line or "Despacho" in line or "Sentença" in line or "Ato Ordinatório" in line or "Intimação" in line)):
            continue

        text = line.strip()

        # Extrair dados
        match_doc = re.search(r'(.+?)\s+(Decisão|Despacho|Sentença|Ato Ordinatório|Intimação)\s+\((\d+)\)', text)
        match_processo = re.search(r'(Juri|InsanAc|LibProv|PetCrim|EP|IP|AcNãoPerPenal)\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text)
        match_expedicao = re.search(r'Expedição eletrônica \((\d{2}/\d{2}/\d{4})', text)
        match_prazo = re.search(r'Prazo:(\d+)\s+dias', text)
        match_crime = re.search(r'\d{4}\.\d{4}(.+?)(?:Ministério|DEFENSORIA)', text)

        if match_doc and match_processo:
            intimacoes.append({
                "assistido": match_doc.group(1).strip(),
                "tipo_documento": match_doc.group(2),
                "id_documento": match_doc.group(3),
                "classe_processual": match_processo.group(1),
                "numero_autos": match_processo.group(2),
                "crime": match_crime.group(1).strip() if match_crime else "",
                "data_expedicao": match_expedicao.group(1) if match_expedicao else "",
                "prazo_dias": int(match_prazo.group(1)) if match_prazo else None,
            })

    log.info("Extraídas %d intimações do PJe", len(intimacoes))
    return intimacoes


# ==========================================
# DOWNLOAD PDFs
# ==========================================

async def download_document(page, id_documento: str, tipo_documento: str, dest_folder: Path) -> Path | None:
    """Baixa um documento do PJe abrindo-o e usando o botão de download do viewer."""
    filename = f"{tipo_documento.lower().replace(' ', '-')}-{id_documento}.pdf"
    filepath = dest_folder / filename

    if filepath.exists() and filepath.stat().st_size > 100:
        log.info("Já existe: %s", filename)
        return filepath

    try:
        # Clicar no link do documento
        doc_link = await page.query_selector(f"a:has-text('{id_documento}')")
        if not doc_link:
            log.warning("Link do doc %s não encontrado", id_documento)
            return None

        await doc_link.click()
        await asyncio.sleep(3)

        # Baixar via expect_download
        async with page.expect_download(timeout=20000) as dl_info:
            # Procurar botão download nos iframes
            for iframe_el in await page.query_selector_all("iframe"):
                frame = await iframe_el.content_frame()
                if not frame:
                    continue
                for nested_el in await frame.query_selector_all("iframe"):
                    nested = await nested_el.content_frame()
                    if not nested:
                        continue
                    btn = await nested.query_selector("button[title*='Baixar'], button[title*='Download']")
                    if btn:
                        await btn.click()
                        break

        download = await dl_info.value
        await download.save_as(str(filepath))

        if filepath.exists() and filepath.stat().st_size > 100:
            log.info("Baixado: %s (%d KB)", filename, filepath.stat().st_size // 1024)
            return filepath

    except Exception as e:
        log.warning("Falha download %s: %s", id_documento, e)

    return None


async def download_intimacao_docs(page, intimacao: dict) -> list[Path]:
    """Baixa documentos de uma intimação, organizando no Drive."""
    assistido = intimacao["assistido"]
    numero = intimacao["numero_autos"]
    classe = intimacao.get("classe_processual", "Juri")
    prefix = CLASSE_PREFIX.get(classe, "AP")

    # Criar estrutura: Processos - Júri / [Assistido] / AP [numero] /
    assistido_folder = JURI_FOLDER / sanitize(assistido)
    processo_folder = assistido_folder / f"{prefix} {numero}"
    processo_folder.mkdir(parents=True, exist_ok=True)

    downloaded = []
    filepath = await download_document(
        page,
        intimacao["id_documento"],
        intimacao["tipo_documento"],
        processo_folder,
    )
    if filepath:
        downloaded.append(filepath)

    return downloaded


def sanitize(name: str) -> str:
    """Remove caracteres inválidos de nome de pasta."""
    return re.sub(r'[<>:"/\\|?*]', '', name).strip()


# ==========================================
# SUPABASE (inserção direta)
# ==========================================

def get_db_connection():
    """Conecta ao Supabase via psycopg2."""
    import psycopg2
    return psycopg2.connect(DATABASE_URL)


def find_or_create_assistido(conn, nome: str) -> int:
    """Encontra assistido por nome ou cria novo."""
    cur = conn.cursor()
    cur.execute("SELECT id FROM assistidos WHERE nome ILIKE %s AND deleted_at IS NULL LIMIT 1", (nome,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        "INSERT INTO assistidos (nome, created_at, updated_at) VALUES (%s, NOW(), NOW()) RETURNING id",
        (nome,),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    log.info("Novo assistido: %s (id=%d)", nome, new_id)
    return new_id


def find_or_create_processo(conn, assistido_id: int, numero_autos: str, classe: str | None, crime: str) -> int:
    """Encontra processo por número ou cria novo."""
    cur = conn.cursor()
    cur.execute("SELECT id FROM processos WHERE numero_autos = %s LIMIT 1", (numero_autos,))
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        """INSERT INTO processos
           (assistido_id, numero_autos, atribuicao, area, vara, comarca, comarca_id,
            classe_processual, assunto, is_juri, created_at, updated_at)
           VALUES (%s, %s, 'JURI_CAMACARI', 'JURI', 'Vara do Júri e Execuções Penais',
                   'Camaçari', 1, %s, %s, true, NOW(), NOW())
           RETURNING id""",
        (assistido_id, numero_autos, classe, crime),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    log.info("Novo processo: %s (id=%d)", numero_autos, new_id)
    return new_id


def doc_already_imported(conn, id_documento: str) -> bool:
    """Verifica se o documento PJe já foi importado."""
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM demandas WHERE enrichment_data->>'id_documento_pje' = %s AND deleted_at IS NULL LIMIT 1",
        (id_documento,),
    )
    return cur.fetchone() is not None


def infer_ato(tipo_documento: str) -> str:
    """Infere o ato com base no tipo de documento."""
    mapping = {
        "Decisão": "Analisar decisão",
        "Sentença": "Analisar sentença",
        "Despacho": "Cumprir despacho",
        "Ato Ordinatório": "Ciência",
        "Intimação": "Ciência",
    }
    return mapping.get(tipo_documento, "Ciência")


def insert_demanda(conn, intimacao: dict, processo_id: int, assistido_id: int) -> int | None:
    """Insere demanda no banco."""
    today = date.today().isoformat()
    is_urgent = intimacao.get("data_expedicao", "") == datetime.now().strftime("%d/%m/%Y")

    ato = infer_ato(intimacao["tipo_documento"])
    status = "URGENTE" if is_urgent else "2_ATENDER"

    # Parse data_expedicao (DD/MM/YYYY → YYYY-MM-DD)
    data_entrada = None
    if intimacao.get("data_expedicao"):
        try:
            parts = intimacao["data_expedicao"].split("/")
            data_entrada = f"{parts[2]}-{parts[1]}-{parts[0]}"
        except (IndexError, ValueError):
            pass

    enrichment = json.dumps({
        "crime": intimacao.get("crime", ""),
        "vara": "Vara do Júri e Execuções Penais",
        "id_documento_pje": intimacao["id_documento"],
        "tipo_documento_pje": intimacao["tipo_documento"],
        "tipo_processo": intimacao.get("classe_processual", ""),
        "atribuicao_detectada": "Tribunal do Júri",
    })

    cur = conn.cursor()
    cur.execute(
        """INSERT INTO demandas
           (processo_id, assistido_id, ato, status, data_entrada,
            import_batch_id, defensor_id, enrichment_data, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, 1, %s::jsonb, NOW(), NOW())
           RETURNING id""",
        (processo_id, assistido_id, ato, status, data_entrada,
         f"pje-scrape-{today}", enrichment),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    return new_id


# ==========================================
# NOTIFICAÇÃO
# ==========================================

def notify_imessage(message: str):
    """Envia notificação via iMessage."""
    import subprocess
    target = os.getenv("NOTIF_IMESSAGE", "")
    if not target:
        log.warning("NOTIF_IMESSAGE não configurado")
        return

    script = f'''
    tell application "Messages"
        set targetService to 1st service whose service type = iMessage
        set targetBuddy to buddy "{target}" of targetService
        send "{message}" to targetBuddy
    end tell
    '''
    try:
        subprocess.run(["osascript", "-e", script], check=True, timeout=10)
        log.info("iMessage enviado")
    except Exception as e:
        log.warning("Falha iMessage: %s", e)


# ==========================================
# MAIN
# ==========================================

async def run(download_pdfs: bool = False, notify: bool = False):
    state = load_state()
    imported_ids = set(state.get("imported_doc_ids", []))

    # 1. Login
    if not await login_pje():
        run_ab("pje", "close")
        return

    # 2. Navegar para Vara do Júri
    if not await navigate_to_juri():
        run_ab("pje", "close")
        return

    # 3. Extrair intimações
    intimacoes = await extract_intimacoes()
    if not intimacoes:
        log.info("Nenhuma intimação encontrada")
        run_ab("pje", "close")
        save_state(state)
        return

    # 4. Filtrar já importadas
    novas = [i for i in intimacoes if i["id_documento"] not in imported_ids]
    log.info("%d novas (de %d total)", len(novas), len(intimacoes))

    if not novas:
        log.info("Todas já importadas")
        run_ab("pje", "close")
        save_state(state)
        return

    # 5. Importar no Supabase
    conn = get_db_connection()
    importadas = 0

    for intimacao in novas:
        id_doc = intimacao["id_documento"]

        # Verificar duplicata no banco
        if doc_already_imported(conn, id_doc):
            log.info("Já no banco: doc %s", id_doc)
            imported_ids.add(id_doc)
            continue

        # Criar assistido/processo se necessário
        assistido_id = find_or_create_assistido(conn, intimacao["assistido"])
        processo_id = find_or_create_processo(
            conn, assistido_id, intimacao["numero_autos"],
            intimacao.get("classe_processual"), intimacao.get("crime", ""),
        )

        # Inserir demanda
        demanda_id = insert_demanda(conn, intimacao, processo_id, assistido_id)
        if demanda_id:
            importadas += 1
            imported_ids.add(id_doc)
            log.info(
                "Importada: %s — %s (%s) → demanda #%d",
                intimacao["assistido"], intimacao["tipo_documento"],
                intimacao["numero_autos"], demanda_id,
            )

    conn.close()

    # 6. Notificar
    if notify and importadas > 0:
        msg = f"[PJe] {importadas} novas intimações importadas da Vara do Júri"
        notify_imessage(msg)

    # 7. Salvar estado
    state["imported_doc_ids"] = list(imported_ids)
    save_state(state)

    log.info("Concluído: %d importadas, %d total no estado", importadas, len(imported_ids))
    run_ab("pje", "close")


def main():
    parser = argparse.ArgumentParser(description="PJe Scraper Local")
    parser.add_argument("--download", action="store_true", help="Baixar PDFs dos documentos")
    parser.add_argument("--notify", action="store_true", help="Enviar notificação iMessage")
    parser.add_argument("--headless", action="store_true", help="Rodar sem janela do browser")
    args = parser.parse_args()

    if not PJE_CPF or not PJE_SENHA:
        log.error("PJE_CPF e PJE_SENHA devem estar configurados no .env.local")
        sys.exit(1)

    if not DATABASE_URL:
        log.error("DATABASE_URL deve estar configurado no .env.local")
        sys.exit(1)

    asyncio.run(run(download_pdfs=args.download, notify=args.notify))


if __name__ == "__main__":
    main()
