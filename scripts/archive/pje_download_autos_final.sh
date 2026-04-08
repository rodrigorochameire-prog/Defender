#!/bin/bash
# ============================================================================
# PJe TJBA - Download Autos Digitais (otimizado)
#
# ESTRATÉGIA: Enfileirar TODOS os downloads primeiro, depois buscar da
# Área de Download de uma vez. Muito mais rápido que um por um.
#
# Fluxo por processo (~30s):
#   Panel → Peticionar → Search → Autos Digitais → Download icon → Confirm
#
# Depois, uma vez só:
#   Área de Download → Poll → Download todos os PDFs via S3
#
# Prerequisitos: agent-browser session logada no PJe
# ============================================================================

set -euo pipefail

SESSION="${PJE_SESSION:-pje5}"
OUTPUT_DIR="${OUTPUT_DIR:-$HOME/Desktop/pje-autos-vvd}"
DRIVE_UPLOAD="${DRIVE_UPLOAD:-true}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$OUTPUT_DIR"

# ============================================================================
# Process list - from scraped JSONs or argument
# ============================================================================
if [ -n "${1:-}" ] && [ -f "$1" ]; then
  mapfile -t PROCESSOS < <(grep -oE '[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}' "$1")
elif [ -n "${1:-}" ]; then
  PROCESSOS=("$1")
else
  # Load from scraped JSONs
  PROCESSOS=()
  for f in "$HOME/Desktop/pje-movimentos-vvd.json" "$HOME/Desktop/pje-movimentos-vvd-batch2.json"; do
    if [ -f "$f" ]; then
      while IFS= read -r num; do
        PROCESSOS+=("$num")
      done < <(python3 -c "
import json
with open('$f') as fh:
    data = json.load(fh)
for p in data.get('processos', []):
    if p.get('status','').startswith('ok'):
        print(p['numero'])
" 2>/dev/null)
    fi
  done
  # Deduplicate
  PROCESSOS=($(printf '%s\n' "${PROCESSOS[@]}" | sort -u))
fi

TOTAL=${#PROCESSOS[@]}
echo "=== PJe Download Autos Digitais (otimizado) ==="
echo "Processos: $TOTAL"
echo "Output: $OUTPUT_DIR"
echo "Session: $SESSION"
echo ""

# ============================================================================
# Helper: navigate to Peticionar and verify
# ============================================================================
goto_peticionar() {
  agent-browser --session "$SESSION" eval "
    window.location.href = '/pje/Painel/painel_usuario/advogado.seam';
  " > /dev/null 2>&1
  sleep 6

  agent-browser --session "$SESSION" eval "
    var cells = document.querySelectorAll('td');
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].textContent.trim() === 'PETICIONAR') { cells[i].click(); break; }
    }
  " > /dev/null 2>&1
  sleep 8

  # Verify iframe loaded
  local OK=$(agent-browser --session "$SESSION" eval "
    var iframe = document.querySelector('iframe');
    iframe && iframe.contentDocument && iframe.contentDocument.querySelector('input[id*=\"searchProcessos\"]') ? 'ok' : 'fail'
  " 2>&1 | tr -d '"')
  [ "$OK" = "ok" ]
}

# ============================================================================
# Helper: search process in Peticionar
# ============================================================================
search() {
  local NUM="$1"
  local SEQ="${NUM%%-*}"
  local REST="${NUM#*-}"
  local DIG="${REST%%.*}"; REST="${REST#*.}"
  local ANO="${REST%%.*}"; REST="${REST#*.}"
  REST="${REST#*.}"; REST="${REST#*.}"
  local ORG="$REST"

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

  local FOUND=$(agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    doc.querySelector('tr.rich-table-row') ? 'yes' : 'no'
  " 2>&1 | tr -d '"')
  [ "$FOUND" = "yes" ]
}

# ============================================================================
# Helper: click Autos Digitais → main page loads → click Download → confirm
# Returns: "queued" or "fail"
# ============================================================================
queue_one() {
  local NUM="$1"

  # Click Autos Digitais in iframe
  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var link = doc.querySelector('a[title=\"Autos Digitais\"]');
    if (link && link.onclick) link.onclick(new Event('click'));
  " > /dev/null 2>&1
  sleep 12

  # Verify main page loaded the Autos view
  local TITLE=$(agent-browser --session "$SESSION" eval "document.title" 2>&1 | tr -d '"')
  if ! echo "$TITLE" | grep -qE '^[0-9]'; then
    echo "autos_failed"
    return
  fi

  # Click download icon (@e7) and confirm (@e10)
  agent-browser --session "$SESSION" click '@e7' > /dev/null 2>&1
  sleep 3
  agent-browser --session "$SESSION" click '@e10' > /dev/null 2>&1
  sleep 5

  # Check queued message
  local MSG=$(agent-browser --session "$SESSION" eval "
    document.body.innerText.indexOf('Área de download') >= 0 ? 'queued' : 'fail'
  " 2>&1 | tr -d '"')
  echo "$MSG"
}

# ============================================================================
# PHASE 1: Queue all downloads
# ============================================================================
echo "=== FASE 1: Enfileirar downloads ==="
QUEUED=()
SKIPPED=()
FAILED_QUEUE=()

goto_peticionar || { echo "ERRO: Peticionar nao carregou"; exit 1; }

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i + 1))
  PDF="$OUTPUT_DIR/autos-${NUM}.pdf"

  # Skip cached
  if [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null || echo 0)" -gt 10000 ]; then
    SIZE=$(stat -f%z "$PDF")
    echo "[$IDX/$TOTAL] $NUM - CACHED ($(( SIZE / 1024 ))KB)"
    SKIPPED+=("$NUM")
    continue
  fi

  echo -n "[$IDX/$TOTAL] $NUM - "

  # Search
  if ! search "$NUM"; then
    echo "NOT FOUND"
    FAILED_QUEUE+=("$NUM:not_found")
    continue
  fi

  # Queue download
  RESULT=$(queue_one "$NUM")
  if [ "$RESULT" = "queued" ]; then
    echo "QUEUED"
    QUEUED+=("$NUM")
  else
    echo "QUEUE FAILED ($RESULT)"
    FAILED_QUEUE+=("$NUM:$RESULT")
  fi

  # Go back to Peticionar for next process
  goto_peticionar || { echo "  WARN: Peticionar reload failed, retrying..."; sleep 3; goto_peticionar; }
  sleep 1
done

echo ""
echo "Enfileirados: ${#QUEUED[@]}/${TOTAL}"
echo "Cached: ${#SKIPPED[@]}"
echo "Falhas: ${#FAILED_QUEUE[@]}"

if [ ${#QUEUED[@]} -eq 0 ]; then
  echo "Nenhum download a fazer."
  exit 0
fi

# ============================================================================
# PHASE 2: Poll Área de Download and fetch PDFs
# ============================================================================
echo ""
echo "=== FASE 2: Download dos PDFs ==="

# Navigate to Download Area
agent-browser --session "$SESSION" eval "
  window.location.href = '/pje/AreaDeDownload/listView.seam';
" > /dev/null 2>&1
sleep 5

DOWNLOADED=0
MAX_WAIT=300  # 5 min max wait for all PDFs
ELAPSED=0

while [ ${#QUEUED[@]} -gt 0 ] && [ $ELAPSED -lt $MAX_WAIT ]; do
  # Refresh page
  agent-browser --session "$SESSION" eval "window.location.reload()" > /dev/null 2>&1
  sleep 5

  # Get status of all processes in the Download Area
  STATUSES=$(agent-browser --session "$SESSION" eval "
    var result = {};
    var docs = [document];
    var iframe = document.querySelector('iframe');
    if (iframe && iframe.contentDocument) docs.push(iframe.contentDocument);
    for (var d = 0; d < docs.length; d++) {
      var rows = docs[d].querySelectorAll('tr');
      for (var r = 0; r < rows.length; r++) {
        var tds = rows[r].querySelectorAll('td');
        if (tds.length >= 4) {
          var num = tds[0].textContent.trim();
          var status = tds[3].textContent.trim();
          if (num.match(/^\d{7}-/)) result[num] = status;
        }
      }
    }
    JSON.stringify(result);
  " 2>&1 | tr -d '"' | sed 's/\\"/"/g')

  # Check each queued process
  STILL_WAITING=()
  for NUM in "${QUEUED[@]}"; do
    STATUS=$(echo "$STATUSES" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('$NUM','unknown'))" 2>/dev/null)

    if [ "$STATUS" = "Sucesso" ]; then
      echo -n "  $NUM: Pronto! Baixando... "

      # Click the download button for this process
      agent-browser --session "$SESSION" eval "
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
                if (btn) btn.click();
              }
            }
          }
        }
      " > /dev/null 2>&1
      sleep 5

      # Get S3 URL
      S3_URL=$(agent-browser --session "$SESSION" eval "window.location.href" 2>&1 | tr -d '"')

      if echo "$S3_URL" | grep -q "amazonaws"; then
        PDF="$OUTPUT_DIR/autos-${NUM}.pdf"
        curl -sL "$S3_URL" -o "$PDF" --max-time 300
        SIZE=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
        if [ "$SIZE" -gt 10000 ]; then
          echo "OK ($(( SIZE / 1024 ))KB)"
          DOWNLOADED=$((DOWNLOADED + 1))
        else
          echo "FALHOU (${SIZE}B)"
          rm -f "$PDF"
        fi
      else
        echo "URL nao-S3: ${S3_URL:0:60}"
      fi

      # Go back to Download Area for next
      agent-browser --session "$SESSION" eval "
        window.location.href = '/pje/AreaDeDownload/listView.seam';
      " > /dev/null 2>&1
      sleep 3
    else
      STILL_WAITING+=("$NUM")
    fi
  done

  QUEUED=("${STILL_WAITING[@]+"${STILL_WAITING[@]}"}")
  if [ ${#QUEUED[@]} -gt 0 ]; then
    echo "  Aguardando ${#QUEUED[@]} processos... (${ELAPSED}s)"
    sleep 10
    ELAPSED=$((ELAPSED + 20))
  fi
done

echo ""
echo "Baixados: $DOWNLOADED"

# ============================================================================
# PHASE 3: Upload to Google Drive (subpasta do assistido/processo)
# ============================================================================
if [ "$DRIVE_UPLOAD" = "true" ] && [ $DOWNLOADED -gt 0 ]; then
  echo ""
  echo "=== FASE 3: Upload para Google Drive ==="

  cd "$PROJECT_DIR"

  # Create a Node.js script that uses the project's google-drive service
  node -e "
    const { execSync } = require('child_process');

    // We need to use tsx to run TypeScript
    // Build a simple upload script
    const script = \`
      import { db } from './src/lib/db/index.js';
      import { processos, assistidos } from './src/lib/db/schema/core.js';
      import { eq } from 'drizzle-orm';
      import { criarPastaProcesso, uploadFileBuffer, isGoogleDriveConfigured } from './src/lib/services/google-drive.js';
      import * as fs from 'fs';
      import * as path from 'path';

      const OUTPUT_DIR = '${OUTPUT_DIR}';

      async function main() {
        if (!isGoogleDriveConfigured()) {
          console.log('Drive not configured');
          return;
        }

        const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('autos-') && f.endsWith('.pdf'));
        console.log('PDFs to upload: ' + files.length);

        for (const file of files) {
          const num = file.replace('autos-', '').replace('.pdf', '');
          const pdfPath = path.join(OUTPUT_DIR, file);

          const [proc] = await db.select().from(processos).where(eq(processos.numeroAutos, num)).limit(1);
          if (!proc) { console.log(num + ': processo not found in DB'); continue; }

          const [assist] = await db.select().from(assistidos).where(eq(assistidos.id, proc.assistidoId)).limit(1);
          const nome = assist ? assist.nome : 'Desconhecido';

          let folderId = proc.driveFolderId;
          if (!folderId) {
            const pasta = await criarPastaProcesso(proc.id, nome, num, proc.atribuicao || 'VVD_CAMACARI');
            folderId = pasta?.id;
          }
          if (!folderId) { console.log(num + ': folder creation failed'); continue; }

          const buf = fs.readFileSync(pdfPath);
          const result = await uploadFileBuffer(buf, 'Autos Digitais - ' + num + '.pdf', 'application/pdf', folderId, 'Baixado do PJe em ' + new Date().toLocaleDateString('pt-BR'), { preventDuplicates: true });

          if (result) {
            console.log(num + ': uploaded to Drive (' + (buf.length / 1024 / 1024).toFixed(1) + 'MB) -> ' + nome);
          } else {
            console.log(num + ': upload failed');
          }
        }

        process.exit(0);
      }
      main().catch(e => { console.error(e.message); process.exit(1); });
    \`;
    console.log('Drive upload script ready (needs tsx/ts-node)');
  " 2>/dev/null || true

  # Fallback: try using npx tsx
  echo "Uploading PDFs to Drive..."
  npx tsx -e "
    import { db } from './src/lib/db/index.js';
    import { processos, assistidos } from './src/lib/db/schema/core.js';
    import { eq } from 'drizzle-orm';
    import { criarPastaProcesso, uploadFileBuffer, isGoogleDriveConfigured } from './src/lib/services/google-drive.js';
    import * as fs from 'fs';
    import * as path from 'path';

    const OUTPUT_DIR = '${OUTPUT_DIR}';

    async function main() {
      if (!isGoogleDriveConfigured()) { console.log('Drive not configured'); return; }
      const files = fs.readdirSync(OUTPUT_DIR).filter((f: string) => f.startsWith('autos-') && f.endsWith('.pdf'));
      console.log('PDFs: ' + files.length);

      for (const file of files) {
        const num = file.replace('autos-', '').replace('.pdf', '');
        const pdfPath = path.join(OUTPUT_DIR, file);
        const size = fs.statSync(pdfPath).size;
        if (size < 10000) continue;

        const [proc] = await db.select().from(processos).where(eq(processos.numeroAutos, num)).limit(1);
        if (!proc) { console.log(num + ': not in DB'); continue; }

        const [assist] = await db.select().from(assistidos).where(eq(assistidos.id, proc.assistidoId)).limit(1);
        const nome = assist ? assist.nome : 'Desconhecido';

        let folderId = proc.driveFolderId;
        if (!folderId) {
          const pasta = await criarPastaProcesso(proc.id, nome, num, proc.atribuicao || 'VVD_CAMACARI');
          folderId = pasta?.id;
        }
        if (!folderId) { console.log(num + ': no folder'); continue; }

        const buf = fs.readFileSync(pdfPath);
        const result = await uploadFileBuffer(buf, 'Autos Digitais - ' + num + '.pdf', 'application/pdf', folderId, 'PJe ' + new Date().toLocaleDateString('pt-BR'), { preventDuplicates: true });
        console.log(num + ': ' + (result ? 'OK -> ' + nome : 'FAIL'));
      }
      process.exit(0);
    }
    main().catch((e: any) => { console.error(e.message); process.exit(1); });
  " 2>&1 || echo "Drive upload failed - run manually later"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=== RESUMO FINAL ==="
echo "Cached: ${#SKIPPED[@]}"
echo "Baixados: $DOWNLOADED"
echo "Falhas enfileirar: ${#FAILED_QUEUE[@]}"
if [ ${#FAILED_QUEUE[@]} -gt 0 ]; then
  echo "Processos com falha:"
  printf '  %s\n' "${FAILED_QUEUE[@]}"
fi
echo ""
ls "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | xargs echo "Total PDFs:"
du -sh "$OUTPUT_DIR" 2>/dev/null
