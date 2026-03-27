#!/bin/bash
# Batch wrapper: downloads each process one at a time (most reliable)
# Uso: bash scripts/pje_download_batch.sh <session> <list_file> [output_dir]

SESSION="${1:-pje6}"
LIST_FILE="${2:-$HOME/Desktop/juri-analisar-processos.txt}"
OUTPUT_DIR="${3:-$HOME/Desktop/pje-autos-juri}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$OUTPUT_DIR"

PROCESSOS=()
while IFS= read -r line; do
  [ -n "$line" ] && PROCESSOS+=("$line")
done < "$LIST_FILE"

TOTAL=${#PROCESSOS[@]}
OK=0; FAIL=0; CACHED=0

echo "=== PJe Batch Download ==="
echo "Session: $SESSION | Total: $TOTAL | Output: $OUTPUT_DIR"
echo ""

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i + 1))
  echo -n "[$IDX/$TOTAL] "

  bash "$SCRIPT_DIR/pje_download_one.sh" "$SESSION" "$NUM" "$OUTPUT_DIR"
  RC=$?

  if [ $RC -eq 0 ]; then
    # Check if it was cached or new download
    if grep -q "CACHED" <<< "$(bash "$SCRIPT_DIR/pje_download_one.sh" "$SESSION" "$NUM" "$OUTPUT_DIR" 2>&1)"; then
      CACHED=$((CACHED + 1))
    else
      OK=$((OK + 1))
    fi
  else
    FAIL=$((FAIL + 1))
  fi

  sleep 2
done

echo ""
echo "=== RESUMO ==="
echo "Baixados: $OK | Cached: $CACHED | Falhas: $FAIL"
echo ""
ls "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | xargs echo "Total PDFs:"
du -sh "$OUTPUT_DIR" 2>/dev/null
