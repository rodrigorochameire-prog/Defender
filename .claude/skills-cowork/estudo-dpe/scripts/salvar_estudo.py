#!/usr/bin/env python3
"""
Script helper para a skill estudo-dpe.
Converte e copia materiais de estudo para a pasta Preparacao Gabriela DPBA.
"""

import argparse
import asyncio
import glob
import os
import re
import shutil
import subprocess
import sys
import unicodedata


def normalizar_nome(nome: str) -> str:
    """Remove acentos e caracteres especiais do nome do arquivo."""
    nfkd = unicodedata.normalize("NFKD", nome)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    sem_especiais = re.sub(r"[^\w\s-]", "", sem_acento)
    com_underscore = re.sub(r"[\s]+", "_", sem_especiais.strip())
    return com_underscore


def encontrar_pasta_destino() -> str | None:
    """Encontra a pasta de destino montada na VM."""
    # Buscar em todos os mnt possíveis
    padrao = "/sessions/*/mnt/Preparacao Gabriela DPBA"
    resultados = glob.glob(padrao)
    if resultados:
        return resultados[0]
    # Tentar caminho direto do usuário (se acessível)
    direto = "/Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA"
    if os.path.isdir(direto):
        return direto
    return None


async def html_para_pdf(html_path: str, pdf_path: str) -> bool:
    """Converte HTML para PDF usando Playwright."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.goto(f"file://{os.path.abspath(html_path)}", wait_until="networkidle")
            await page.pdf(
                path=pdf_path,
                format="A4",
                print_background=True,
                margin={"top": "15mm", "bottom": "15mm", "left": "10mm", "right": "10mm"},
            )
            await browser.close()
        return True
    except Exception as e:
        print(f"[ERRO Playwright] {e}", file=sys.stderr)
        return False


def docx_para_pdf(docx_path: str, destino_dir: str) -> str | None:
    """Converte DOCX para PDF usando LibreOffice."""
    try:
        resultado = subprocess.run(
            ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", destino_dir, docx_path],
            capture_output=True, text=True, timeout=60
        )
        if resultado.returncode == 0:
            base = os.path.splitext(os.path.basename(docx_path))[0]
            pdf_gerado = os.path.join(destino_dir, base + ".pdf")
            if os.path.exists(pdf_gerado):
                return pdf_gerado
    except Exception as e:
        print(f"[ERRO LibreOffice] {e}", file=sys.stderr)
    return None


def main():
    parser = argparse.ArgumentParser(description="Salva material de estudo DPE na pasta correta")
    parser.add_argument("--origem", required=True, help="Caminho do arquivo de origem (.html, .docx ou .pdf)")
    parser.add_argument("--nome", required=True, help="Nome base do arquivo destino (sem extensão)")
    args = parser.parse_args()

    origem = os.path.abspath(args.origem)
    if not os.path.exists(origem):
        print(f"[ERRO] Arquivo de origem não encontrado: {origem}", file=sys.stderr)
        sys.exit(1)

    pasta_destino = encontrar_pasta_destino()
    if not pasta_destino:
        print("[ERRO] Pasta de destino não encontrada. Use request_cowork_directory para montar.", file=sys.stderr)
        print("PATH_REQUERIDO:/Users/rodrigorochameire/Meu Drive/Pessoal/Preparacao Gabriela DPBA")
        sys.exit(2)

    nome_normalizado = normalizar_nome(args.nome)
    if not nome_normalizado.endswith("_DPE"):
        nome_normalizado += "_DPE"

    ext = os.path.splitext(origem)[1].lower()
    pdf_final = os.path.join(pasta_destino, nome_normalizado + ".pdf")

    print(f"[INFO] Arquivo de origem: {origem}")
    print(f"[INFO] Pasta de destino: {pasta_destino}")
    print(f"[INFO] Nome final: {nome_normalizado}.pdf")

    if ext == ".pdf":
        shutil.copy2(origem, pdf_final)
        print(f"[OK] PDF copiado: {pdf_final}")

    elif ext == ".html":
        ok = asyncio.run(html_para_pdf(origem, pdf_final))
        if ok:
            print(f"[OK] HTML→PDF convertido e salvo: {pdf_final}")
        else:
            print("[ERRO] Falha na conversão HTML→PDF", file=sys.stderr)
            sys.exit(3)

    elif ext in (".docx", ".doc"):
        tmp_dir = "/tmp/estudo_dpe_tmp"
        os.makedirs(tmp_dir, exist_ok=True)
        pdf_tmp = docx_para_pdf(origem, tmp_dir)
        if pdf_tmp:
            shutil.move(pdf_tmp, pdf_final)
            print(f"[OK] DOCX→PDF convertido e salvo: {pdf_final}")
        else:
            print("[ERRO] Falha na conversão DOCX→PDF", file=sys.stderr)
            sys.exit(4)
    else:
        print(f"[ERRO] Formato não suportado: {ext}", file=sys.stderr)
        sys.exit(5)

    print(f"ARQUIVO_SALVO:{pdf_final}")


if __name__ == "__main__":
    main()
