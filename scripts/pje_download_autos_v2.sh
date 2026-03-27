#!/bin/bash
# PJe TJBA - Download Autos Digitais via agent-browser
# Fluxo: Peticionar → Autos Digitais → Download → Área de Download → S3 URL → curl
#
# Prerequisitos: agent-browser session 'pje5' logada no PJe
# Uso: bash scripts/pje_download_autos_v2.sh

SESSION="pje5"
OUTPUT_DIR="$HOME/Desktop/pje-autos-vvd"
LOG_FILE="$OUTPUT_DIR/download-log-v2.json"
DOWNLOAD_AREA_URL="https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam"

mkdir -p "$OUTPUT_DIR"

# Process list (can be overridden with -l flag)
PROCESSOS=(
"8017921-24.2025.8.05.0039"
"8009582-13.2024.8.05.0039"
"8004980-08.2026.8.05.0039"
"0301007-02.2012.8.05.0039"
"8014719-73.2024.8.05.0039"
"8000560-57.2026.8.05.0039"
"8012452-94.2025.8.05.0039"
"8017082-96.2025.8.05.0039"
"8004773-43.2025.8.05.0039"
"8013962-79.2024.8.05.0039"
)

TOTAL=${#PROCESSOS[@]}
DOWNLOADED=0
FAILED=0

echo "=== PJe Download Autos Digitais ==="
echo "Processos: $TOTAL"
echo "Output: $OUTPUT_DIR"
echo ""

# Function: setup Peticionar in iframe
setup_peticionar() {
  agent-browser --session "$SESSION" eval "window.location.href = '/pje/Painel/painel_usuario/advogado.seam'" > /dev/null 2>&1
  sleep 5
  agent-browser --session "$SESSION" eval "
    var cells = document.querySelectorAll('td');
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].textContent.trim() === 'PETICIONAR') { cells[i].click(); break; }
    }
    'ok'
  " > /dev/null 2>&1
  sleep 8
  # Verify
  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    doc && doc.querySelector('input[id*=\"searchProcessos\"]') ? 'ready' : 'not ready'
  " 2>&1 | grep -q "ready"
}

# Function: search a process in Peticionar iframe
search_processo() {
  local NUM="$1"
  local SEQ=$(echo "$NUM" | cut -d'-' -f1)
  local REST=$(echo "$NUM" | cut -d'-' -f2)
  local DIG=$(echo "$REST" | cut -d'.' -f1)
  local ANO=$(echo "$REST" | cut -d'.' -f2)
  local ORG=$(echo "$REST" | cut -d'.' -f5)

  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var cb = doc.querySelector('input[id*=\"clearButton\"]');
    if (cb) cb.click();
  " > /dev/null 2>&1
  sleep 2

  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    doc.querySelector('input[id*=\"numeroSequencial\"]').value = '$SEQ';
    doc.querySelector('input[id*=\"Verificador\"]').value = '$DIG';
    doc.querySelector('input[id*=\"Ano\"]').value = '$ANO';
    doc.querySelector('input[id*=\"OrgaoJustica\"]').value = '$ORG';
    doc.querySelector('input[id*=\"searchProcessos\"]').click();
  " > /dev/null 2>&1
  sleep 7

  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    doc.querySelector('tr.rich-table-row') ? 'found' : 'not_found'
  " 2>&1 | grep -q "found"
}

# Function: click Autos Digitais and wait for main page to load the process
open_autos() {
  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var link = doc.querySelector('a[title=\"Autos Digitais\"]');
    if (link && link.onclick) { link.onclick(new Event('click')); 'clicked'; }
    else { 'no link'; }
  " > /dev/null 2>&1
  sleep 12

  # Check if main page loaded the Autos view
  local TITLE=$(agent-browser --session "$SESSION" eval "document.title" 2>&1 | tr -d '"')
  echo "$TITLE" | grep -q "^[0-9]"
}

# Function: click Download in the Autos view
queue_download() {
  # Click "Ícone de download" button (always ref e7 in the autos view)
  agent-browser --session "$SESSION" click '@e7' > /dev/null 2>&1
  sleep 3

  # Now click the "Download" confirm button (ref e10 in the dropdown)
  agent-browser --session "$SESSION" click '@e10' > /dev/null 2>&1
  sleep 5

  # Check success message
  agent-browser --session "$SESSION" eval "
    document.body.innerText.indexOf('Área de download') >= 0 ? 'queued' : 'unknown'
  " 2>&1 | grep -q "queued"
}

# Function: go to Download Area and get S3 URL
fetch_from_download_area() {
  local NUM="$1"
  local PDF_PATH="$2"

  # Navigate to Download Area (direct URL, not via panel)
  agent-browser --session "$SESSION" eval "
    window.location.href = '/pje/AreaDeDownload/listView.seam';
  " > /dev/null 2>&1
  sleep 5

  # Wait for file to be ready (poll up to 120s)
  local READY=false
  for attempt in $(seq 1 12); do
    # The Download Area renders directly (no iframe when accessed via direct URL)
    # The snapshot shows cells with process number and status
    local STATUS=$(agent-browser --session "$SESSION" eval "
      // Look in both iframe and main document
      var docs = [document];
      var iframe = document.querySelector('iframe');
      if (iframe && iframe.contentDocument) docs.push(iframe.contentDocument);

      for (var d = 0; d < docs.length; d++) {
        var cells = docs[d].querySelectorAll('td');
        for (var i = 0; i < cells.length; i++) {
          if (cells[i].textContent.indexOf('$NUM') >= 0) {
            // Found the process row — get status (3 cells later)
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
      }
      'not_found';
    " 2>&1 | tr -d '"')

    if echo "$STATUS" | grep -qi "sucesso"; then
      READY=true
      break
    elif echo "$STATUS" | grep -qi "processando"; then
      echo -n "."
      sleep 10
      # Refresh the page
      agent-browser --session "$SESSION" eval "window.location.reload()" > /dev/null 2>&1
      sleep 3
    else
      sleep 5
    fi
  done

  if [ "$READY" != "true" ]; then
    echo -n "(timeout)"
    return 1
  fi

  # Find and click the download button for THIS process
  # Use snapshot to find the right button ref
  # The last button in the row for the matching process
  agent-browser --session "$SESSION" eval "
    // Click the download button for the specific process
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
            if (btn) { btn.click(); 'clicked'; }
          }
        }
      }
    }
    'done';
  " > /dev/null 2>&1
  sleep 5

  # Get the S3 URL — the page/main window should navigate to the S3 URL
  local S3_URL=$(agent-browser --session "$SESSION" eval "window.location.href" 2>&1 | tr -d '"')

  if echo "$S3_URL" | grep -q "amazonaws"; then
    # Download from S3
    curl -sL "$S3_URL" -o "$PDF_PATH" --max-time 300
    local SIZE=$(stat -f%z "$PDF_PATH" 2>/dev/null || echo "0")
    if [ "$SIZE" -gt 10000 ]; then
      return 0
    fi
  fi

  return 1
}

# === MAIN LOOP ===
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S)'","results":[' > "$LOG_FILE"
FIRST=true

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i+1))
  PDF_PATH="$OUTPUT_DIR/autos-${NUM}.pdf"

  echo -n "[$IDX/$TOTAL] $NUM "

  # Skip if already downloaded
  if [ -f "$PDF_PATH" ] && [ "$(stat -f%z "$PDF_PATH" 2>/dev/null)" -gt 10000 ]; then
    SIZE=$(stat -f%z "$PDF_PATH")
    echo "CACHED (${SIZE}B)"
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
    echo "{\"numero\":\"$NUM\",\"status\":\"cached\",\"size\":$SIZE}" >> "$LOG_FILE"
    DOWNLOADED=$((DOWNLOADED+1))
    continue
  fi

  # Setup Peticionar if needed
  if ! search_processo "$NUM"; then
    echo -n "re-setup..."
    setup_peticionar
    sleep 2
    if ! search_processo "$NUM"; then
      echo "NOT FOUND"
      [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
      echo "{\"numero\":\"$NUM\",\"status\":\"not_found\"}" >> "$LOG_FILE"
      FAILED=$((FAILED+1))
      continue
    fi
  fi

  echo -n "found → autos..."
  if ! open_autos; then
    echo "AUTOS FAILED"
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
    echo "{\"numero\":\"$NUM\",\"status\":\"autos_failed\"}" >> "$LOG_FILE"
    FAILED=$((FAILED+1))
    setup_peticionar
    continue
  fi

  echo -n "queuing..."
  if ! queue_download; then
    echo "QUEUE FAILED"
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
    echo "{\"numero\":\"$NUM\",\"status\":\"queue_failed\"}" >> "$LOG_FILE"
    FAILED=$((FAILED+1))
    setup_peticionar
    continue
  fi

  echo -n "downloading..."
  if fetch_from_download_area "$NUM" "$PDF_PATH"; then
    SIZE=$(stat -f%z "$PDF_PATH" 2>/dev/null)
    echo "OK (${SIZE}B)"
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
    echo "{\"numero\":\"$NUM\",\"status\":\"downloaded\",\"size\":$SIZE}" >> "$LOG_FILE"
    DOWNLOADED=$((DOWNLOADED+1))
  else
    echo "DOWNLOAD FAILED"
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$LOG_FILE"
    echo "{\"numero\":\"$NUM\",\"status\":\"download_failed\"}" >> "$LOG_FILE"
    FAILED=$((FAILED+1))
  fi

  # Go back to Peticionar for next process
  setup_peticionar
  sleep 2
done

echo "]}" >> "$LOG_FILE"

echo ""
echo "=== Resultado ==="
echo "Downloaded: $DOWNLOADED/$TOTAL"
echo "Failed: $FAILED"
echo "Log: $LOG_FILE"
echo "PDFs: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | xargs echo "Arquivos PDF:"
du -sh "$OUTPUT_DIR" 2>/dev/null
