#!/bin/bash
# ============================================================================
# PJe TJBA - Download Autos Digitais v4
# Fluxo testado e validado step-by-step:
#   1. Peticionar → buscar processo
#   2. Autos Digitais (via eval contentDocument)
#   3. Ícone download (@e7) → Cronologia Crescente → Download (@e10)
#   4. Área de Download → snapshot+click → S3 URL → curl
# ============================================================================
set -uo pipefail

SESSION="${PJE_SESSION:-pje8}"
OUTPUT_DIR="$HOME/Desktop/pje-autos-juri"
LIST_FILE="${1:-$HOME/Desktop/juri-pendentes.txt}"
RELOGIN_EVERY=8

mkdir -p "$OUTPUT_DIR"

ENV_FILE="$HOME/Defender/.env.local"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

[ ! -f "$LIST_FILE" ] && { echo "ERRO: $LIST_FILE não encontrada"; exit 1; }

PROCESSOS=()
while IFS= read -r line; do
  [ -n "$line" ] && PROCESSOS+=("$line")
done < "$LIST_FILE"
TOTAL=${#PROCESSOS[@]}

echo "=== PJe Download Autos v4 ==="
echo "Session: $SESSION | Processos: $TOTAL | Output: $OUTPUT_DIR"
echo ""

# ============================================================================
# Helpers
# ============================================================================
ab() { agent-browser --session "$SESSION" "$@" 2>&1; }
ab_eval() { agent-browser --session "$SESSION" eval "$1" 2>&1 | tr -d '"'; }
snap() { agent-browser --session "$SESSION" snapshot -i 2>&1; }
ref_for() { echo "$2" | grep "$1" | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1; }

do_login() {
  ab open "https://pje.tjba.jus.br/pje/login.seam" > /dev/null
  sleep 8
  local S=$(snap)
  if echo "$S" | grep -q "Rodrigo Meire"; then echo "  [LOGIN] Já logado"; return 0; fi
  local CR=$(ref_for 'textbox "CPF' "$S")
  local SR=$(ref_for 'textbox "Senha' "$S")
  local ER=$(ref_for 'button "Entrar"' "$S")
  [ -z "$CR" ] && { echo "  [LOGIN] Campos não encontrados"; return 1; }
  ab fill "@$CR" "$PJE_CPF" > /dev/null; ab fill "@$SR" "$PJE_SENHA" > /dev/null
  ab click "@$ER" > /dev/null; sleep 12
  S=$(snap)
  echo "$S" | grep -q "Rodrigo Meire" && { echo "  [LOGIN] OK"; return 0; }
  echo "  [LOGIN] FALHOU"; return 1
}

goto_peticionar() {
  for attempt in 1 2 3; do
    ab open "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam" > /dev/null
    sleep 6
    local S=$(snap)
    # Check login
    if echo "$S" | grep -q 'textbox "CPF'; then do_login || continue; S=$(snap); fi
    # Click PETICIONAR (LayoutTable)
    local PR=$(ref_for 'LayoutTable "Peticionar"' "$S")
    [ -z "$PR" ] && { echo "  [goto_pet] PETICIONAR não encontrado"; continue; }
    ab click "@$PR" > /dev/null; sleep 2
    ab dialog accept > /dev/null 2>&1 || true; sleep 10
    # Verify iframe loaded
    local R=$(ab_eval "var f=document.querySelector('iframe'); f&&f.contentDocument&&f.contentDocument.querySelector('input[id*=\"searchProcessos\"]')?'ready':'fail'")
    [ "$R" = "ready" ] && return 0
    echo "  [goto_pet] Tentativa $attempt: iframe=$R"
  done
  return 1
}

search_proc() {
  local NUM="$1" SEQ DIG ANO ORG
  SEQ="${NUM%%-*}"; local REST="${NUM#*-}"
  DIG="${REST%%.*}"; REST="${REST#*.}"
  ANO="${REST%%.*}"; REST="${REST#*.}"; REST="${REST#*.}"; REST="${REST#*.}"
  ORG="$REST"

  # Clear + fill + search via contentDocument
  ab_eval "var d=document.querySelector('iframe').contentDocument; var c=d.querySelector('input[id*=\"clearButton\"]'); if(c)c.click();" > /dev/null
  sleep 2
  ab_eval "
    var d=document.querySelector('iframe').contentDocument;
    d.querySelector('input[id*=\"numeroSequencial\"]').value='$SEQ';
    d.querySelector('input[id*=\"Verificador\"]').value='$DIG';
    d.querySelector('input[id*=\"Ano\"]').value='$ANO';
    d.querySelector('input[id*=\"OrgaoJustica\"]').value='$ORG';
    d.querySelector('input[id*=\"searchProcessos\"]').click();
  " > /dev/null
  sleep 7
  local R=$(ab_eval "var d=document.querySelector('iframe').contentDocument; d.querySelector('tr.rich-table-row')?'yes':'no'")
  [ "$R" = "yes" ]
}

click_autos() {
  ab_eval "
    var d=document.querySelector('iframe').contentDocument;
    var link=d.querySelector('a[title=\"Autos Digitais\"]');
    if(link&&link.onclick){link.onclick(new Event('click'));'ok';}else if(link){link.click();'ok';}else{'fail';}
  " > /dev/null
  sleep 15
  # Wait for page to fully load (sometimes takes longer)
  for check in 1 2 3; do
    local T=$(ab_eval "document.title")
    if echo "$T" | grep -qE '^[0-9]'; then
      return 0
    fi
    local URL=$(ab_eval "window.location.href")
    if echo "$URL" | grep -q "DetalheProcesso\|ConsultaProcesso\|listProcessoCompleto"; then
      return 0
    fi
    sleep 5
  done
  return 1
}

queue_download() {
  # Click download icon — wait and retry if not found
  local S DL
  for try in 1 2 3; do
    S=$(snap)
    DL=$(ref_for 'Ícone de download' "$S")
    [ -n "$DL" ] && break
    # Also try alternative patterns
    DL=$(ref_for 'download' "$S" | head -1)
    [ -n "$DL" ] && break
    sleep 5
  done
  [ -z "$DL" ] && { echo "no_dl_icon"; return; }
  ab click "@$DL" > /dev/null; sleep 3

  # Set Cronologia to Crescente
  S=$(snap)
  local CRONO=$(ref_for 'combobox "Cronologia"' "$S")
  if [ -n "$CRONO" ]; then
    ab select "@$CRONO" "Crescente" > /dev/null 2>&1
    sleep 1
  fi

  # Click Download button
  local DL_BTN=$(ref_for 'button "Download"' "$S")
  [ -z "$DL_BTN" ] && { echo "no_dl_btn"; return; }
  ab click "@$DL_BTN" > /dev/null; sleep 6

  # Check confirmation
  S=$(snap)
  if echo "$S" | grep -qi "ÁREA DE DOWNLOAD\|disponibilizado"; then
    echo "queued"
  else
    echo "queue_unknown"
  fi
}

# ============================================================================
# FASE 1: Enfileirar downloads
# ============================================================================
echo "=== FASE 1: Enfileirar downloads ==="

QUEUED=()
CACHED=()
FAILED=()
PROC_COUNTER=0

goto_peticionar || { echo "ERRO: Peticionar falhou"; exit 1; }

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i + 1))
  PDF="$OUTPUT_DIR/autos-${NUM}.pdf"

  [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null || echo 0)" -gt 10000 ] && {
    echo "[$IDX/$TOTAL] $NUM - CACHED"
    CACHED+=("$NUM"); continue
  }

  if [ $PROC_COUNTER -ge $RELOGIN_EVERY ]; then
    echo "  [RELOGIN]..."; do_login; PROC_COUNTER=0
    goto_peticionar || { echo "  Peticionar falhou após relogin"; break; }
  fi

  echo -n "[$IDX/$TOTAL] $NUM - "

  if ! search_proc "$NUM"; then
    echo "NOT FOUND"; FAILED+=("$NUM:not_found")
    PROC_COUNTER=$((PROC_COUNTER + 1)); continue
  fi

  if ! click_autos; then
    echo "AUTOS FAIL"; FAILED+=("$NUM:autos_fail")
    PROC_COUNTER=$((PROC_COUNTER + 1))
    goto_peticionar || { do_login; goto_peticionar || true; }
    continue
  fi

  RESULT=$(queue_download)
  case "$RESULT" in
    queued*) echo "QUEUED"; QUEUED+=("$NUM") ;;
    *) echo "FAIL ($RESULT)"; FAILED+=("$NUM:$RESULT") ;;
  esac

  PROC_COUNTER=$((PROC_COUNTER + 1))
  goto_peticionar || { echo "  WARN: relogin"; do_login; goto_peticionar || true; }
  sleep 1
done

echo ""
echo "Enfileirados: ${#QUEUED[@]} | Cached: ${#CACHED[@]} | Falhas: ${#FAILED[@]}"
[ ${#FAILED[@]} -gt 0 ] && printf '  %s\n' "${FAILED[@]}"

[ ${#QUEUED[@]} -eq 0 ] && { echo "Nada enfileirado."; exit 0; }

# ============================================================================
# FASE 2: Baixar da Área de Download (snapshot + click → S3 URL → curl)
# ============================================================================
echo ""
echo "=== FASE 2: Baixar PDFs ==="

DOWNLOADED=0
REMAINING=("${QUEUED[@]}")

for round in $(seq 1 30); do
  [ ${#REMAINING[@]} -eq 0 ] && break
  echo "  --- Round $round ---"

  ab open "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam" > /dev/null
  sleep 10
  local S=$(snap)

  STILL_WAITING=()
  for NUM in "${REMAINING[@]}"; do
    PDF="$OUTPUT_DIR/autos-${NUM}.pdf"
    [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null)" -gt 10000 ] && { DOWNLOADED=$((DOWNLOADED+1)); continue; }

    if ! echo "$S" | grep -q "\"$NUM\""; then
      STILL_WAITING+=("$NUM"); continue
    fi

    local STATUS=$(echo "$S" | grep -A5 "\"$NUM\"" | grep -o 'Sucesso\|Processando\|Fila\|Erro' | head -1)

    if [ "$STATUS" = "Sucesso" ]; then
      echo -n "  $NUM: "
      local BTN=$(echo "$S" | grep -A10 "\"$NUM\"" | grep 'button.*ui-btn' | grep -v disabled | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
      [ -z "$BTN" ] && { echo "no btn"; STILL_WAITING+=("$NUM"); continue; }

      ab click "@$BTN" > /dev/null; sleep 10
      local URL=$(ab_eval "window.location.href")

      if echo "$URL" | grep -q "amazonaws\|s3\."; then
        curl -sL "$URL" -o "$PDF" --max-time 300
        local SZ=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
        if [ "$SZ" -gt 10000 ]; then
          echo "OK ($((SZ / 1024))KB)"; DOWNLOADED=$((DOWNLOADED+1))
        else
          echo "SMALL"; rm -f "$PDF"; STILL_WAITING+=("$NUM")
        fi
      else
        echo "NO S3 (${URL:0:60})"; STILL_WAITING+=("$NUM")
      fi

      # Re-navigate (exited to S3)
      ab open "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam" > /dev/null
      sleep 8; S=$(snap)
    else
      STILL_WAITING+=("$NUM")
    fi
  done

  REMAINING=("${STILL_WAITING[@]+"${STILL_WAITING[@]}"}")
  [ ${#REMAINING[@]} -gt 0 ] && { echo "  Aguardando ${#REMAINING[@]}... (round $round)"; sleep 15; }
done

echo ""
echo "=== RESUMO ==="
echo "Baixados: $DOWNLOADED | Cached: ${#CACHED[@]} | Falhas: ${#FAILED[@]}"
[ ${#FAILED[@]} -gt 0 ] && printf '  %s\n' "${FAILED[@]}"
ls "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | xargs echo "Total PDFs:"
du -sh "$OUTPUT_DIR" 2>/dev/null
