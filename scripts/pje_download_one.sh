#!/bin/bash
# ============================================================================
# PJe TJBA - Download de UM processo por vez (mais confiável)
# Fluxo completo: busca → autos → download → S3 → arquivo
#
# Uso: bash scripts/pje_download_one.sh <session> <numero> <output_dir>
# Ex:  bash scripts/pje_download_one.sh pje6 "8000379-90.2025.8.05.0039" ~/Desktop/pje-autos-juri
# ============================================================================

SESSION="$1"
NUM="$2"
OUTPUT_DIR="${3:-$HOME/Desktop/pje-autos-juri}"

if [ -z "$SESSION" ] || [ -z "$NUM" ]; then
  echo "Uso: $0 <session> <numero_processo> [output_dir]"
  exit 1
fi

PDF="$OUTPUT_DIR/autos-${NUM}.pdf"
mkdir -p "$OUTPUT_DIR"

# Check cache
if [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null || echo 0)" -gt 10000 ]; then
  echo "CACHED $(stat -f%z "$PDF")B"
  exit 0
fi

ab() { agent-browser --session "$SESSION" "$@" 2>&1; }
ab_eval() { agent-browser --session "$SESSION" eval "$1" 2>&1 | tr -d '"'; }

# Parse numero
SEQ="${NUM%%-*}"
REST="${NUM#*-}"
DIG="${REST%%.*}"; REST="${REST#*.}"
ANO="${REST%%.*}"; REST="${REST#*.}"
REST="${REST#*.}"; REST="${REST#*.}"
ORG="$REST"

echo -n "$NUM: "

# 1. Go to Painel → Peticionar
ab_eval "window.location.href = '/pje/Painel/painel_usuario/advogado.seam'" > /dev/null
sleep 6
# Click Peticionar via snapshot ref (more reliable than JS text matching)
SNAP=$(ab snapshot -i 2>&1)
PET_REF=$(echo "$SNAP" | grep 'LayoutTable "Peticionar"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
if [ -n "$PET_REF" ]; then
  ab click "@$PET_REF" > /dev/null
else
  # Fallback: try clicking the cell that contains only "PETICIONAR"
  ab_eval "
    var tds = document.querySelectorAll('td');
    for (var i = 0; i < tds.length; i++) {
      if (tds[i].textContent.trim() === 'PETICIONAR' || tds[i].innerText.trim() === 'PETICIONAR') {
        tds[i].click(); break;
      }
    }
  " > /dev/null
fi
sleep 8

# 2. Search
ab_eval "
  var doc = document.querySelector('iframe').contentDocument;
  var cb = doc.querySelector('input[id*=\"clearButton\"]');
  if (cb) cb.click();
" > /dev/null
sleep 2

ab_eval "
  var doc = document.querySelector('iframe').contentDocument;
  doc.querySelector('input[id*=\"numeroSequencial\"]').value = '$SEQ';
  doc.querySelector('input[id*=\"Verificador\"]').value = '$DIG';
  doc.querySelector('input[id*=\"Ano\"]').value = '$ANO';
  doc.querySelector('input[id*=\"OrgaoJustica\"]').value = '$ORG';
  doc.querySelector('input[id*=\"searchProcessos\"]').click();
" > /dev/null
sleep 7

FOUND=$(ab_eval "var doc=document.querySelector('iframe').contentDocument; doc.querySelector('tr.rich-table-row') ? 'yes' : 'no'")
if [ "$FOUND" != "yes" ]; then
  echo "NOT_FOUND"
  exit 1
fi

# 3. Click Autos Digitais
ab_eval "
  var doc = document.querySelector('iframe').contentDocument;
  var link = doc.querySelector('a[title=\"Autos Digitais\"]');
  if (link && link.onclick) link.onclick(new Event('click'));
" > /dev/null
sleep 12

TITLE=$(ab_eval "document.title")
if ! echo "$TITLE" | grep -qE '^[0-9]'; then
  echo "AUTOS_FAIL (title=$TITLE)"
  exit 1
fi

# 4. Click Download icon (find by snapshot)
SNAP=$(ab snapshot -i 2>&1)
DL_REF=$(echo "$SNAP" | grep "Ícone de download" | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
if [ -z "$DL_REF" ]; then
  echo "NO_DL_BTN"
  exit 1
fi
ab click "@$DL_REF" > /dev/null
sleep 3

# 5. Click Download confirm
SNAP=$(ab snapshot -i 2>&1)
CONFIRM_REF=$(echo "$SNAP" | grep '^- button "Download"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
if [ -z "$CONFIRM_REF" ]; then
  echo "NO_CONFIRM_BTN"
  exit 1
fi
ab click "@$CONFIRM_REF" > /dev/null
sleep 5

QUEUED=$(ab_eval "document.body.innerText.indexOf('Área de download') >= 0 ? 'yes' : 'no'")
if [ "$QUEUED" != "yes" ]; then
  echo "QUEUE_FAIL"
  exit 1
fi

echo -n "queued → "

# 6. Go to Download Area and wait
ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
sleep 5

for attempt in $(seq 1 24); do
  # Read all cells from the page (Área de Download renders directly, no iframe)
  STATUS=$(ab_eval "
    var cells = document.querySelectorAll('td');
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].textContent.indexOf('$NUM') >= 0) {
        var row = cells[i].closest('tr');
        if (row) {
          var tds = row.querySelectorAll('td');
          for (var j = 0; j < tds.length; j++) {
            var t = tds[j].textContent.trim();
            if (t === 'Sucesso' || t === 'Processando' || t === 'Erro') return t;
          }
        }
      }
    }
    // Also check inside iframe
    var iframe = document.querySelector('iframe');
    if (iframe && iframe.contentDocument) {
      var cells2 = iframe.contentDocument.querySelectorAll('td');
      for (var k = 0; k < cells2.length; k++) {
        if (cells2[k].textContent.indexOf('$NUM') >= 0) {
          var row2 = cells2[k].closest('tr');
          if (row2) {
            var tds2 = row2.querySelectorAll('td');
            for (var l = 0; l < tds2.length; l++) {
              var t2 = tds2[l].textContent.trim();
              if (t2 === 'Sucesso' || t2 === 'Processando' || t2 === 'Erro') return t2;
            }
          }
        }
      }
    }
    'not_found'
  ")

  if [ "$STATUS" = "Sucesso" ]; then
    echo -n "ready → "
    break
  elif [ "$STATUS" = "Processando" ]; then
    echo -n "."
    sleep 10
    ab_eval "window.location.reload()" > /dev/null
    sleep 3
  elif [ "$STATUS" = "Erro" ]; then
    echo "GENERATION_ERROR"
    exit 1
  else
    sleep 5
    ab_eval "window.location.reload()" > /dev/null
    sleep 3
  fi
done

if [ "$STATUS" != "Sucesso" ]; then
  echo "TIMEOUT_WAITING"
  exit 1
fi

# 7. Click download button for this process
ab_eval "
  // Try both main doc and iframe
  var docs = [document];
  var iframe = document.querySelector('iframe');
  if (iframe && iframe.contentDocument) docs.push(iframe.contentDocument);
  for (var d = 0; d < docs.length; d++) {
    var cells = docs[d].querySelectorAll('td');
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].textContent.indexOf('$NUM') >= 0) {
        var row = cells[i].closest('tr');
        if (row) {
          var btn = row.querySelector('button:not([disabled])');
          if (btn) { btn.click(); return 'clicked'; }
        }
      }
    }
  }
  'no_btn'
" > /dev/null
sleep 5

# 8. Get S3 URL
S3_URL=$(ab_eval "window.location.href")

if echo "$S3_URL" | grep -q "amazonaws"; then
  curl -sL "$S3_URL" -o "$PDF" --max-time 300
  SIZE=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 10000 ]; then
    echo "OK ($(( SIZE / 1024 ))KB)"
    exit 0
  else
    echo "SMALL_FILE (${SIZE}B)"
    rm -f "$PDF"
    exit 1
  fi
else
  echo "NO_S3_URL ($S3_URL)"
  exit 1
fi
