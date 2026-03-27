#!/usr/bin/env python3
"""
PJe TJBA - Scraper de movimentações processuais via Peticionar.
Busca processos pelo número, extrai dados básicos e tenta abrir Autos Digitais.

Uso: python3 scripts/pje_scrape_movimentos.py
Saída: ~/Desktop/pje-movimentos-vvd.json
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from playwright.sync_api import sync_playwright, Page, Frame

# --- Config ---
PJE_LOGIN_URL = "https://pje.tjba.jus.br/pje/login.seam"
PANEL_URL = "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam"
OUTPUT_PATH = Path.home() / "Desktop" / "pje-movimentos-vvd.json"
HEADLESS = False

# Processos VVD prioritarios (reu preso + 2_ATENDER)
PROCESSOS = [
    "8017921-24.2025.8.05.0039",
    "8009582-13.2024.8.05.0039",
    "8004980-08.2026.8.05.0039",
    "0301007-02.2012.8.05.0039",
    "8014719-73.2024.8.05.0039",
    "8000560-57.2026.8.05.0039",
    "8012452-94.2025.8.05.0039",
    "8017082-96.2025.8.05.0039",
    "8004773-43.2025.8.05.0039",
    "8013962-79.2024.8.05.0039",
    "8014401-90.2024.8.05.0039",
    "8000189-30.2025.8.05.0039",
    "8006232-80.2025.8.05.0039",
    "8007756-15.2025.8.05.0039",
    "8016897-58.2025.8.05.0039",
    "8015813-22.2025.8.05.0039",
    "8013376-08.2025.8.05.0039",
    "8000241-89.2026.8.05.0039",
    "8248019-25.2025.8.05.0001",
    "8009112-79.2024.8.05.0039",
]


def parse_numero(num):
    """Parse NNNNNNN-DD.YYYY.J.TR.OOOO into parts."""
    parts = num.replace("-", ".").split(".")
    return {
        "seq": parts[0],
        "dig": parts[1],
        "ano": parts[2],
        "jus": parts[3],
        "tri": parts[4],
        "org": parts[5],
    }


def safe_dialog_handler(dialog):
    """Handle dialog without async issues."""
    try:
        dialog.accept()
    except Exception:
        pass


def wait_ajax(target, timeout_ms=10000):
    """Wait for RichFaces AJAX to complete."""
    try:
        target.wait_for_function(
            """() => {
                var s = document.querySelector('.rf-st-start, [id$=status][style*=visible]');
                return !s;
            }""",
            timeout=timeout_ms,
        )
    except Exception:
        time.sleep(2)


def do_login(page, cpf, senha):
    """Login no PJe TJBA."""
    print("[1] Abrindo PJe login...")
    # Pre-intercept dialogs via route
    page.add_init_script("""
        window.confirm = function() { return true; };
        window.alert = function() { return true; };
    """)
    page.goto(PJE_LOGIN_URL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(5)

    # O PJe redireciona para SSO Keycloak
    # Detectar qual formulario esta na tela
    current_url = page.url
    print(f"    URL: {current_url[:80]}")

    # Tenta login via certificado digital (se disponível) ou CPF/senha
    cert_btn = page.query_selector('button:has-text("CERTIFICADO"), a:has-text("CERTIFICADO"), input[value*="CERTIFICADO"]')
    if cert_btn:
        print("    Usando certificado digital...")
        cert_btn.click()
        time.sleep(10)  # Aguarda dialogo do certificado do browser
    elif "sso.cloud.pje" in current_url:
        # Keycloak SSO form - CPF/senha
        page.wait_for_selector("#username", timeout=10000)
        page.fill("#username", cpf)
        page.fill("#password", senha)
        page.click("#kc-login")
    else:
        # Formulario PJe direto (fallback)
        for sel_user in ['#username', 'input[name="username"]', 'input[placeholder*="CPF"]']:
            if page.query_selector(sel_user):
                page.fill(sel_user, cpf)
                break
        for sel_pass in ['#password', 'input[name="password"]', 'input[type="password"]']:
            if page.query_selector(sel_pass):
                page.fill(sel_pass, senha)
                break
        for sel_btn in ['#kc-login', 'button[type="submit"]', 'input[type="submit"]']:
            if page.query_selector(sel_btn):
                page.click(sel_btn)
                break

    # Aguarda redirect - pode ir para pagina intermediaria
    time.sleep(8)

    # Se nao chegou no painel, navega diretamente
    if "advogado.seam" not in page.url:
        print(f"    Redirecionando para painel...")
        page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=30000)
        time.sleep(8)

    # Pode ter dialog bloqueando - tenta fechar via JS
    page.evaluate("""() => {
        // Tenta interceptar confirm/alert
        window.confirm = function() { return true; };
        window.alert = function() { return true; };
    }""")
    time.sleep(2)

    title = page.title()
    url = page.url
    print(f"    Logado: {title}")
    print(f"    URL: {url[:80]}")
    return "advogado.seam" in url or "Painel" in title or "Defensor" in title


def get_peticionar_frame(page):
    """Navega para Peticionar e retorna o iframe."""
    print("[2] Abrindo Peticionar...")

    # Garante que estamos no painel
    if "advogado.seam" not in page.url:
        page.goto(PANEL_URL, wait_until="domcontentloaded", timeout=20000)
        time.sleep(8)

    # Espera os cards do painel aparecerem
    try:
        page.wait_for_selector("text=PETICIONAR", timeout=15000)
    except Exception:
        print("    Cards do painel nao apareceram, tentando reload...")
        page.reload(wait_until="domcontentloaded")
        time.sleep(8)

    # Clica na aba Peticionar via JS (RichFaces tab)
    clicked = page.evaluate("""() => {
        var cells = document.querySelectorAll('td');
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].textContent.trim() === 'PETICIONAR') {
                cells[i].click();
                return 'clicked_cell';
            }
        }
        // Fallback: try table onclick for Peticionar tab
        var tables = document.querySelectorAll('table');
        for (var i = 0; i < tables.length; i++) {
            if (tables[i].textContent.indexOf('Peticionar') >= 0 && tables[i].onclick) {
                tables[i].onclick(new Event('click'));
                return 'clicked_table';
            }
        }
        return 'not_found';
    }""")
    print(f"    Click Peticionar: {clicked}")
    time.sleep(8)

    # Acessa o iframe
    iframe_el = page.query_selector("iframe")
    if not iframe_el:
        print("    ERRO: iframe nao encontrado")
        return None

    frame = iframe_el.content_frame()
    if not frame:
        print("    ERRO: nao conseguiu acessar iframe")
        return None

    # Espera o formulario de busca carregar
    try:
        frame.wait_for_selector('input[id*="numeroSequencial"]', timeout=15000)
        print("    Peticionar OK")
        return frame
    except Exception:
        print("    ERRO: formulario nao carregou")
        return None


def search_in_peticionar(frame, numero):
    """Busca um processo e retorna dados basicos da tabela."""
    parts = parse_numero(numero)

    # Limpa
    try:
        frame.click('input[id*="clearButton"]')
        time.sleep(2)
        wait_ajax(frame)
    except Exception:
        pass

    # Preenche os campos do numero
    frame.evaluate("""(p) => {
        var doc = document;
        var seq = doc.querySelector('input[id*="numeroSequencial"]');
        var dig = doc.querySelector('input[id*="Verificador"]');
        var ano = doc.querySelector('input[id*="Ano"]');
        var org = doc.querySelector('input[id*="OrgaoJustica"]');
        if (seq) seq.value = p.seq;
        if (dig) dig.value = p.dig;
        if (ano) ano.value = p.ano;
        if (org) org.value = p.org;
    }""", parts)

    # Pesquisa
    frame.click('input[id*="searchProcessos"]')
    time.sleep(6)
    wait_ajax(frame)

    # Extrai dados da tabela de resultados
    data = frame.evaluate("""() => {
        var row = document.querySelector('tr.rich-table-row');
        if (!row) return null;

        var cells = row.querySelectorAll('td.rich-table-cell');
        var texts = [];
        for (var i = 0; i < cells.length; i++) {
            texts.push(cells[i].textContent.trim());
        }

        // Pega ID do link de autos digitais
        var autosLink = row.querySelector('a[title="Autos Digitais"]');
        var autosId = autosLink ? autosLink.id : null;

        // Pega ID do processo do onclick
        var processId = null;
        if (autosLink && autosLink.onclick) {
            var match = autosLink.onclick.toString().match(/idProcessoSelecionado['\"]?\\s*[:=]\\s*['\"]?(\\d+)/);
            if (match) processId = match[1];
        }

        return {texts: texts, autosLinkId: autosId, processId: processId};
    }""")

    if not data or not data.get("texts"):
        return None

    texts = data["texts"]
    info = {
        "numero": numero,
        "orgao_julgador": None,
        "autuado_em": None,
        "classe": None,
        "polo_ativo": None,
        "polo_passivo": None,
        "process_id_pje": data.get("processId"),
        "autos_link_id": data.get("autosLinkId"),
        "raw_cells": texts,
    }

    # Parse dos campos (ordem: Peticionar btn | Processo link | Processo span | Orgao | Autuado | Classe | Polo ativo | Polo passivo)
    for cell in texts:
        c = cell.strip()
        if not c or len(c) < 3:
            continue
        cup = c.upper()
        if "VARA" in cup or "JUIZO" in cup or "JUÍZO" in cup or "TURMA" in cup or "GARANTIAS" in cup:
            info["orgao_julgador"] = c
        elif len(c) == 10 and "/" in c and c[2] == "/" and c[5] == "/":
            info["autuado_em"] = c
        elif "AÇÃO" in cup or "PENAL" in cup or "PROCEDIMENTO" in cup or "INSANIDADE" in cup or "INQUÉRITO" in cup or "MEDIDA" in cup:
            info["classe"] = c
        elif "MINISTÉRIO" in cup or "PÚBLICO" in cup:
            info["polo_ativo"] = c
        elif c != numero and "Peticionar" not in c and "PJeOffice" not in c and len(c) > 5:
            if info["polo_passivo"] is None:
                info["polo_passivo"] = c

    return info


def try_open_autos(page, frame, link_id):
    """Tenta abrir Autos Digitais capturando popup."""
    if not link_id:
        return None

    try:
        with page.context.expect_page(timeout=15000) as popup_info:
            frame.evaluate("""(linkId) => {
                var link = document.getElementById(linkId);
                if (link) {
                    // Force target blank to open popup
                    link.removeAttribute('onclick');
                    link.setAttribute('target', '_blank');
                    link.setAttribute('href', '/pje/downloadBinario.seam');
                    link.click();
                }
            }""", link_id)

        popup = popup_info.value
        popup.wait_for_load_state("domcontentloaded", timeout=20000)
        time.sleep(3)

        # Extrai conteudo da pagina de autos
        content = popup.evaluate("""() => {
            var nodes = document.querySelectorAll('.rich-tree-node-text, .rf-trn-cnt, [class*=treeNode]');
            var items = [];
            nodes.forEach(function(n) {
                var t = n.textContent.trim();
                if (t.length > 3) items.push(t);
            });
            if (items.length === 0) {
                return document.body ? document.body.innerText.substring(0, 5000) : '';
            }
            return items.join('\\n');
        }""")

        popup.close()
        return content

    except Exception as e:
        print(f"    Popup falhou: {str(e)[:80]}")
        return None


def main():
    # Carrega credenciais
    env_path = Path(__file__).parent.parent / ".env.local"
    cpf = os.environ.get("PJE_CPF", "")
    senha = os.environ.get("PJE_SENHA", "")

    if env_path.exists() and (not cpf or not senha):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip()
                    if k == "PJE_CPF":
                        cpf = v
                    elif k == "PJE_SENHA":
                        senha = v

    if not cpf or not senha:
        print("ERRO: Configure PJE_CPF e PJE_SENHA no .env.local")
        sys.exit(1)

    print("=== PJe TJBA - Scraper VVD ===")
    print(f"Processos: {len(PROCESSOS)}")
    print(f"Saida: {OUTPUT_PATH}\n")

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        page = context.new_page()
        page.on("dialog", safe_dialog_handler)

        try:
            # Login
            if not do_login(page, cpf, senha):
                print("ERRO: Login falhou")
                browser.close()
                return

            # Peticionar
            frame = get_peticionar_frame(page)
            if not frame:
                print("ERRO: Peticionar nao carregou")
                browser.close()
                return

            # Busca cada processo
            for i, numero in enumerate(PROCESSOS):
                print(f"\n[{i+1}/{len(PROCESSOS)}] {numero}")

                try:
                    info = search_in_peticionar(frame, numero)
                except Exception as e:
                    print(f"    ERRO busca: {str(e)[:80]}")
                    results.append({"numero": numero, "status": "error", "error": str(e)[:200]})
                    # Tenta recarregar o frame
                    try:
                        frame = get_peticionar_frame(page)
                    except Exception:
                        pass
                    continue

                if not info:
                    print(f"    Nao encontrado")
                    results.append({"numero": numero, "status": "not_found"})
                    continue

                print(f"    Vara: {info.get('orgao_julgador', '?')}")
                print(f"    Classe: {info.get('classe', '?')}")
                print(f"    Polo passivo: {info.get('polo_passivo', '?')}")

                # Tenta autos digitais
                autos_content = try_open_autos(page, frame, info.get("autos_link_id"))
                if autos_content:
                    info["autos_content"] = autos_content[:3000]
                    info["status"] = "ok_with_autos"
                    print(f"    Autos: {len(autos_content)} chars")
                else:
                    info["status"] = "ok_basic"

                # Remove campos internos
                info.pop("autos_link_id", None)
                info.pop("raw_cells", None)
                results.append(info)

                time.sleep(2)

        except Exception as e:
            print(f"\nERRO GERAL: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    # Salva
    output = {
        "scrapedAt": datetime.now().isoformat(),
        "total": len(results),
        "ok": sum(1 for r in results if "ok" in r.get("status", "")),
        "not_found": sum(1 for r in results if r.get("status") == "not_found"),
        "errors": sum(1 for r in results if r.get("status") == "error"),
        "processos": results,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSalvo: {OUTPUT_PATH}")
    print(f"OK: {output['ok']} | Nao encontrado: {output['not_found']} | Erros: {output['errors']}")


if __name__ == "__main__":
    main()
