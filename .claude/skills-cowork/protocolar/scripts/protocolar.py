#!/usr/bin/env python3
"""
protocolar.py — Helper para protocolar minutas da DPE-BA
Copia .docx para pasta Protocolar e gera .pdf via LibreOffice
"""

import argparse
import os
import sys
import shutil
import unicodedata
import re
import glob


PROTOCOLAR_PATH_CANDIDATES = [
    # Caminho montado na VM (Google Drive via Cowork)
    "/sessions/{session}/mnt/1 - Defensoria 9ª DP/Protocolar",
]


def find_session_id():
    """Detecta o ID da sessão atual a partir do path do script ou do ambiente."""
    # Tenta pelo caminho do próprio processo
    for path in [__file__, os.getcwd()]:
        m = re.search(r'/sessions/([^/]+)/', path)
        if m:
            return m.group(1)
    # Tenta listar /sessions/
    try:
        sessions = [d for d in os.listdir('/sessions/') if os.path.isdir(f'/sessions/{d}')]
        if sessions:
            return sessions[0]
    except Exception:
        pass
    return None


def find_protocolar_dir():
    """Localiza a pasta Protocolar montada na VM."""
    session = find_session_id()
    if session:
        candidate = f"/sessions/{session}/mnt/1 - Defensoria 9\u00aa DP/Protocolar"
        if os.path.isdir(candidate):
            return candidate
    # Busca genérica
    for pattern in ["/sessions/*/mnt/1 - Defensoria*/Protocolar"]:
        matches = glob.glob(pattern)
        if matches:
            return matches[0]
    return None


def normalize(text):
    """Remove acentos e caracteres não aceitos pelo PJe."""
    # Decompõe caracteres acentuados (NFD) e remove marcas diacríticas
    nfd = unicodedata.normalize('NFD', text)
    ascii_text = ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')
    # Remove caracteres não permitidos (mantém letras, números, espaços e hífens)
    clean = re.sub(r'[^\w\s\-]', '', ascii_text)
    # Colapsa espaços múltiplos
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def build_filename(tipo, conteudo, nome, ext):
    """Monta o nome do arquivo no padrão PJe DPE-BA."""
    tipo_norm   = normalize(tipo).upper()
    conteudo_norm = normalize(conteudo)
    nome_norm   = normalize(nome)
    return f"{tipo_norm} - {conteudo_norm} - {nome_norm}{ext}"


def convert_to_pdf(docx_path, out_dir):
    """Converte .docx para .pdf usando o wrapper LibreOffice da skill docx."""
    # Encontra o wrapper soffice
    wrapper_candidates = glob.glob("/sessions/*/mnt/.skills/skills/docx/scripts/office/soffice.py")
    if wrapper_candidates:
        sys.path.insert(0, os.path.dirname(os.path.dirname(wrapper_candidates[0])))
        from office.soffice import run_soffice
    else:
        # Fallback: tenta importar diretamente
        try:
            sys.path.insert(0, '/sessions/' + find_session_id() + '/mnt/.skills/skills/docx/scripts')
            from office.soffice import run_soffice
        except ImportError:
            raise RuntimeError("Wrapper LibreOffice não encontrado. Certifique-se de que a skill 'docx' está instalada.")

    # Copia para área temporária (sem espaços no nome para evitar problemas)
    tmp_dir = "/tmp/protocolar_tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_docx = os.path.join(tmp_dir, "doc_para_converter.docx")
    shutil.copy2(docx_path, tmp_docx)

    result = run_soffice([
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', tmp_dir,
        tmp_docx
    ], capture_output=True, text=True)

    tmp_pdf = os.path.join(tmp_dir, "doc_para_converter.pdf")
    if not os.path.exists(tmp_pdf):
        raise RuntimeError(f"Conversão PDF falhou. Stderr: {result.stderr}")

    return tmp_pdf


def main():
    parser = argparse.ArgumentParser(description='Protocola minuta DPE-BA')
    parser.add_argument('--origem',   required=True, help='Caminho do .docx de origem')
    parser.add_argument('--tipo',     required=True, help='Tipo do ato (RA, AF, RESE, HC, etc.)')
    parser.add_argument('--conteudo', required=True, help='Conteúdo/assunto resumido')
    parser.add_argument('--nome',     required=True, help='Nome do assistido')
    parser.add_argument('--destino',  default=None,  help='Caminho da pasta Protocolar (opcional; auto-detectado se omitido)')
    args = parser.parse_args()

    # Validar origem
    if not os.path.isfile(args.origem):
        print(f"ERRO: Arquivo de origem não encontrado: {args.origem}", file=sys.stderr)
        sys.exit(1)

    # Localizar pasta Protocolar
    destino = args.destino or find_protocolar_dir()
    if not destino:
        print(
            "ERRO: Pasta Protocolar não encontrada.\n"
            "Solicite acesso ao diretório: /Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP",
            file=sys.stderr
        )
        sys.exit(2)

    os.makedirs(destino, exist_ok=True)

    # Montar nomes de destino
    nome_docx = build_filename(args.tipo, args.conteudo, args.nome, '.docx')
    nome_pdf  = build_filename(args.tipo, args.conteudo, args.nome, '.pdf')
    path_docx = os.path.join(destino, nome_docx)
    path_pdf  = os.path.join(destino, nome_pdf)

    # Copiar .docx
    shutil.copy2(args.origem, path_docx)
    print(f"DOCX copiado: {path_docx}")

    # Converter e copiar .pdf
    tmp_pdf = convert_to_pdf(args.origem, destino)
    shutil.copy2(tmp_pdf, path_pdf)
    print(f"PDF gerado:   {path_pdf}")

    print("\nProtocolo concluído.")
    print(f"  .docx → {path_docx}")
    print(f"  .pdf  → {path_pdf}")


if __name__ == '__main__':
    main()
