#!/bin/bash
# =============================================================================
# cowork_noticias_diarias.sh — Curadoria diária de notícias via Cowork ($0)
#
# Busca, classifica e popula o banco com notícias do dia nos 3 eixos:
#   1. Radar Criminal (Camaçari e região)
#   2. Notícias Jurídicas (legislação, jurisprudência, artigos)
#   3. Institucional (TJBA, DPE-BA, MP-BA em matéria penal)
#
# Uso:
#   ./scripts/cowork_noticias_diarias.sh            # Execução completa
#   ./scripts/cowork_noticias_diarias.sh --dry-run   # Só gera JSON, não importa
#   ./scripts/cowork_noticias_diarias.sh --import-only FILE  # Só importa JSON existente
#
# Custo: $0 (claude -p usa assinatura local)
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$PROJECT_DIR/.claude/skills-cowork"
WORK_DIR="$PROJECT_DIR/tmp/cowork-noticias"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATA_HOJE=$(date +%Y-%m-%d)

DRY_RUN=false
IMPORT_ONLY=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --import-only) IMPORT_ONLY="$2"; shift 2 ;;
    *) echo "Uso: $0 [--dry-run] [--import-only FILE]"; exit 1 ;;
  esac
done

mkdir -p "$WORK_DIR"

# Load env
if [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  source <(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' "$PROJECT_DIR/.env.local")
  set +a
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

echo "============================================="
echo "  Curadoria Diária de Notícias — $DATA_HOJE"
echo "  Modo: $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'PRODUÇÃO')"
echo "============================================="
echo ""

# =============================================================================
# STEP 1: Buscar e curar notícias via Claude Cowork
# =============================================================================

OUTPUT_FILE="$WORK_DIR/_noticias_diarias.json"

if [ -n "$IMPORT_ONLY" ]; then
  echo "[SKIP] Usando arquivo existente: $IMPORT_ONLY"
  OUTPUT_FILE="$IMPORT_ONLY"
else
  echo "[1/2] Buscando notícias com Claude Cowork (custo \$0)..."
  echo "       Isso leva 2-5 minutos..."
  echo ""

  rm -f "$OUTPUT_FILE"

  PROMPT="Hoje é ${DATA_HOJE}. Execute a curadoria diária de notícias nos 3 eixos (Radar Criminal Camaçari, Jurídicas Nacional, Institucional TJBA/DPE/MP).

Pesquise na web as notícias de hoje e dos últimos 2-3 dias. Use WebSearch para cada eixo.

Gere o arquivo _noticias_diarias.json conforme o schema da skill, no diretório de trabalho atual."

  cd "$WORK_DIR"

  if claude -p \
    --system-prompt-file "$SKILLS_DIR/noticias/SKILL.md" \
    --permission-mode auto \
    "$PROMPT" \
    > "$WORK_DIR/cowork_log_${TIMESTAMP}.txt" 2>&1; then
    echo "       Claude concluiu com sucesso."
  else
    echo "       AVISO: Claude retornou com erro, verificando output..."
  fi

  if [ ! -f "$OUTPUT_FILE" ]; then
    echo ""
    echo "ERRO: Claude não gerou _noticias_diarias.json"
    echo "Verifique o log: $WORK_DIR/cowork_log_${TIMESTAMP}.txt"
    exit 1
  fi

  # Stats
  python3 -c "
import json
with open('$OUTPUT_FILE') as f:
    d = json.load(f)
r = len(d.get('radar', []))
j = len(d.get('juridicas', []))
i = len(d.get('institucional', []))
print(f'       Radar: {r} | Jurídicas: {j} | Institucional: {i} | Total: {r+j+i}')
if d.get('resumo_dia'):
    print(f'       Resumo: {d[\"resumo_dia\"]}')
" 2>/dev/null || echo "       (não foi possível ler stats)"

  echo ""
fi

# =============================================================================
# STEP 2: Importar no banco
# =============================================================================

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] JSON gerado em: $OUTPUT_FILE"
  echo "Para importar: $0 --import-only $OUTPUT_FILE"
  exit 0
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "AVISO: Sem credenciais Supabase. JSON salvo em: $OUTPUT_FILE"
  echo "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local"
  echo "Depois importe com: $0 --import-only $OUTPUT_FILE"
  exit 0
fi

echo "[2/2] Importando no banco..."

python3 - "$OUTPUT_FILE" "$SUPABASE_URL" "$SUPABASE_KEY" << 'PYTHON_SCRIPT'
import json
import sys
import urllib.request
from datetime import datetime

output_file = sys.argv[1]
supabase_url = sys.argv[2]
supabase_key = sys.argv[3]

headers = {
    "Content-Type": "application/json",
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Prefer": "return=minimal",
}

with open(output_file) as f:
    data = json.load(f)

stats = {"radar": 0, "juridicas": 0, "institucional": 0, "duplicadas": 0, "erros": 0}

def check_duplicate(url):
    """Verifica se URL já existe no banco"""
    encoded_url = urllib.parse.quote(url, safe='')
    check_url = f"{supabase_url}/rest/v1/noticias_juridicas?url_original=eq.{encoded_url}&select=id&limit=1"
    req = urllib.request.Request(check_url, headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    })
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return len(result) > 0
    except:
        return False

def insert_noticia(noticia, categoria_override=None):
    """Insere notícia no banco"""
    url = noticia.get("url", "")
    if not url or not noticia.get("titulo"):
        return False

    if check_duplicate(url):
        stats["duplicadas"] += 1
        return False

    categoria = categoria_override or noticia.get("categoria", "artigo")
    fonte = noticia.get("fonte", "web")

    record = {
        "titulo": noticia["titulo"],
        "conteudo": noticia.get("resumo"),
        "resumo": noticia.get("resumo_executivo") or noticia.get("resumo", "")[:300],
        "fonte": fonte,
        "url_original": url,
        "categoria": categoria,
        "tags": json.dumps(noticia.get("tags", [])),
        "status": "aprovada",
        "aprovado_em": datetime.now().isoformat(),
        "publicado_em": noticia.get("publicado_em", datetime.now().strftime("%Y-%m-%d")),
        "analise_ia": json.dumps({
            "resumoExecutivo": noticia.get("resumo_executivo", ""),
            "impactoPratico": noticia.get("impacto_pratico", ""),
            "casosAplicaveis": [],
            "processadoEm": data.get("gerado_em", datetime.now().isoformat()),
            "modeloUsado": "cowork-claude-local",
        }),
    }

    try:
        req = urllib.request.Request(
            f"{supabase_url}/rest/v1/noticias_juridicas",
            data=json.dumps(record).encode(),
            method="POST",
            headers={**headers, "Prefer": "return=minimal"},
        )
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, 'read') else str(e)
        if "duplicate" in body.lower() or "unique" in body.lower():
            stats["duplicadas"] += 1
        else:
            print(f"  ERRO [{e.code}]: {noticia['titulo'][:60]}... → {body[:100]}")
            stats["erros"] += 1
        return False
    except Exception as e:
        print(f"  ERRO: {noticia['titulo'][:60]}... → {e}")
        stats["erros"] += 1
        return False

# --- RADAR ---
for n in data.get("radar", []):
    if insert_noticia(n, categoria_override="radar"):
        stats["radar"] += 1

# --- JURÍDICAS ---
for n in data.get("juridicas", []):
    if insert_noticia(n):
        stats["juridicas"] += 1

# --- INSTITUCIONAL ---
for n in data.get("institucional", []):
    if insert_noticia(n, categoria_override="institucional"):
        stats["institucional"] += 1

total = stats["radar"] + stats["juridicas"] + stats["institucional"]
print(f"""
  Importação concluída:
    Radar:          {stats['radar']} novas
    Jurídicas:      {stats['juridicas']} novas
    Institucional:  {stats['institucional']} novas
    ─────────────────────
    Total inseridas: {total}
    Duplicadas:      {stats['duplicadas']}
    Erros:           {stats['erros']}
""")
PYTHON_SCRIPT

echo ""
echo "=== Concluído ==="
echo "JSON:  $OUTPUT_FILE"
echo "Log:   $WORK_DIR/cowork_log_${TIMESTAMP}.txt"
