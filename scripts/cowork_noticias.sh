#!/bin/bash
# =============================================================================
# cowork_noticias.sh — Classificação e sumarização de notícias via Cowork ($0)
#
# Uso:
#   ./scripts/cowork_noticias.sh              # Processa pendentes (max 20)
#   ./scripts/cowork_noticias.sh --limit 50   # Processa até 50
#   ./scripts/cowork_noticias.sh --factual    # Processa factual (Diário da Bahia)
#
# Fluxo:
#   1. Extrai notícias pendentes do Supabase via REST API
#   2. Chama claude -p com skill noticias (custo $0)
#   3. Importa _noticias_curadas.json de volta no banco
# =============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$PROJECT_DIR/.claude/skills-cowork"
WORK_DIR="$PROJECT_DIR/tmp/cowork-noticias"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Defaults
LIMIT=20
MODE="juridicas"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --limit) LIMIT="$2"; shift 2 ;;
    --factual) MODE="factual"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Env check
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  # Try loading from .env.local
  if [ -f "$PROJECT_DIR/.env.local" ]; then
    export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' "$PROJECT_DIR/.env.local" | sed 's/^/export /')
    SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
    SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
  fi
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
  echo "Configure em .env.local ou exporte como variáveis de ambiente."
  exit 1
fi

mkdir -p "$WORK_DIR"

echo "=== Cowork Notícias — $MODE (limit: $LIMIT) ==="
echo "Timestamp: $TIMESTAMP"

# =============================================================================
# STEP 1: Extrair notícias pendentes
# =============================================================================

if [ "$MODE" = "juridicas" ]; then
  echo "[1/3] Extraindo notícias jurídicas pendentes..."

  INPUT_FILE="$WORK_DIR/pendentes_${TIMESTAMP}.json"

  curl -s "$SUPABASE_URL/rest/v1/noticias_juridicas?status=eq.pendente&select=id,titulo,conteudo,fonte,categoria&limit=$LIMIT&order=scrapeado_em.desc" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    > "$INPUT_FILE"

elif [ "$MODE" = "factual" ]; then
  echo "[1/3] Extraindo artigos factual sem resumo..."

  INPUT_FILE="$WORK_DIR/factual_pendentes_${TIMESTAMP}.json"

  curl -s "$SUPABASE_URL/rest/v1/factual_artigos?resumo=is.null&select=id,titulo,conteudo_original,fonte_nome,secao&limit=$LIMIT&order=created_at.desc" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    > "$INPUT_FILE"
fi

# Check if we got results
COUNT=$(python3 -c "import json; print(len(json.load(open('$INPUT_FILE'))))" 2>/dev/null || echo 0)

if [ "$COUNT" = "0" ]; then
  echo "Nenhuma notícia pendente encontrada. Tudo limpo!"
  rm -f "$INPUT_FILE"
  exit 0
fi

echo "   Encontradas: $COUNT notícias"

# =============================================================================
# STEP 2: Chamar Claude Cowork
# =============================================================================

echo "[2/3] Chamando Claude Cowork (custo \$0)..."

OUTPUT_FILE="$WORK_DIR/_noticias_curadas.json"
rm -f "$OUTPUT_FILE"

NOTICIAS_JSON=$(cat "$INPUT_FILE")

if [ "$MODE" = "factual" ]; then
  PROMPT="Analise e sumarize os artigos factual (Diário da Bahia) abaixo. Use a skill noticias.
Para artigos factual, TODOS são relevantes (já foram filtrados). Foque na sumarização de qualidade.
Gere o arquivo _noticias_curadas.json no diretório de trabalho.

Artigos JSON:
$NOTICIAS_JSON"
else
  PROMPT="Classifique e sumarize as notícias jurídicas abaixo. Use a skill noticias.
Gere o arquivo _noticias_curadas.json no diretório de trabalho.

Notícias JSON:
$NOTICIAS_JSON"
fi

cd "$WORK_DIR"
claude -p \
  --system-prompt-file "$SKILLS_DIR/noticias/SKILL.md" \
  --permission-mode auto \
  "$PROMPT" \
  > "$WORK_DIR/cowork_log_${TIMESTAMP}.txt" 2>&1

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "ERRO: Claude não gerou _noticias_curadas.json"
  echo "Log: $WORK_DIR/cowork_log_${TIMESTAMP}.txt"
  exit 1
fi

CURADAS=$(python3 -c "import json; d=json.load(open('$OUTPUT_FILE')); print(len(d.get('noticias', [])))" 2>/dev/null || echo 0)
echo "   Curadas: $CURADAS notícias"

# =============================================================================
# STEP 3: Importar no banco
# =============================================================================

echo "[3/3] Importando no banco..."

python3 - "$OUTPUT_FILE" "$SUPABASE_URL" "$SUPABASE_KEY" "$MODE" << 'PYTHON_SCRIPT'
import json
import sys
import urllib.request

output_file = sys.argv[1]
supabase_url = sys.argv[2]
supabase_key = sys.argv[3]
mode = sys.argv[4]

with open(output_file) as f:
    data = json.load(f)

noticias = data.get("noticias", [])
updated = 0
errors = 0

for n in noticias:
    nid = n.get("id")
    if not nid:
        continue

    try:
        if mode == "juridicas":
            # Update noticias_juridicas
            patch = {
                "status": n.get("status_sugerido", "pendente"),
                "categoria": n.get("categoria", "artigo"),
                "tags": n.get("tags", []),
                "resumo": n.get("resumo"),
                "analise_ia": {
                    "resumoExecutivo": n.get("resumo_executivo", ""),
                    "impactoPratico": n.get("impacto_pratico", ""),
                    "casosAplicaveis": [],
                    "processadoEm": data.get("gerado_em", ""),
                    "modeloUsado": "cowork-claude-local",
                },
            }

            url = f"{supabase_url}/rest/v1/noticias_juridicas?id=eq.{nid}"

        elif mode == "factual":
            # Update factual_artigos
            patch = {
                "resumo": n.get("resumo"),
                "modelo_sumarizacao": "cowork-claude-local",
                "tags": n.get("tags", []),
            }

            url = f"{supabase_url}/rest/v1/factual_artigos?id=eq.{nid}"

        req = urllib.request.Request(
            url,
            data=json.dumps(patch).encode(),
            method="PATCH",
            headers={
                "Content-Type": "application/json",
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Prefer": "return=minimal",
            },
        )
        urllib.request.urlopen(req)
        updated += 1
    except Exception as e:
        print(f"  ERRO id={nid}: {e}")
        errors += 1

print(f"  Importadas: {updated} | Erros: {errors}")
PYTHON_SCRIPT

echo ""
echo "=== Concluído ==="
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo "Log:    $WORK_DIR/cowork_log_${TIMESTAMP}.txt"
