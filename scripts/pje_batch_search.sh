#!/bin/bash
# PJe Batch Search via agent-browser (session pje3 must be logged in)
# Outputs JSON to ~/Desktop/pje-movimentos-vvd.json

SESSION="pje3"
OUTPUT="/Users/rodrigorochameire/Desktop/pje-movimentos-vvd.json"

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
  "8014401-90.2024.8.05.0039"
  "8000189-30.2025.8.05.0039"
  "8006232-80.2025.8.05.0039"
  "8007756-15.2025.8.05.0039"
  "8016897-58.2025.8.05.0039"
  "8015813-22.2025.8.05.0039"
  "8013376-08.2025.8.05.0039"
  "8000241-89.2026.8.05.0039"
  "8248019-25.2025.8.05.0001"
  "8009112-79.2024.8.05.0039"
)

echo '{"scrapedAt":"'$(date -u +%Y-%m-%dT%H:%M:%S)'","processos":[' > "$OUTPUT"

TOTAL=${#PROCESSOS[@]}
FIRST=true

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i+1))
  echo "[$IDX/$TOTAL] $NUM"

  # Parse number parts
  SEQ=$(echo "$NUM" | cut -d'-' -f1)
  REST=$(echo "$NUM" | cut -d'-' -f2)
  DIG=$(echo "$REST" | cut -d'.' -f1)
  ANO=$(echo "$REST" | cut -d'.' -f2)
  ORG=$(echo "$REST" | cut -d'.' -f5)

  # Clear and search
  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var cb = doc.querySelector('input[id*=\"clearButton\"]');
    if (cb) cb.click();
    'cleared'
  " > /dev/null 2>&1

  sleep 2

  # Fill and search
  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    doc.querySelector('input[id*=\"numeroSequencial\"]').value = '$SEQ';
    doc.querySelector('input[id*=\"Verificador\"]').value = '$DIG';
    doc.querySelector('input[id*=\"Ano\"]').value = '$ANO';
    doc.querySelector('input[id*=\"OrgaoJustica\"]').value = '$ORG';
    doc.querySelector('input[id*=\"searchProcessos\"]').click();
    'ok'
  " > /dev/null 2>&1

  sleep 7

  # Extract results
  RESULT=$(agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var row = doc.querySelector('tr.rich-table-row');
    if (!row) {
      JSON.stringify({numero:'$NUM',status:'not_found'});
    } else {
      var cells = row.querySelectorAll('td.rich-table-cell');
      var orgao = '', autuado = '', classe = '', polo_ativo = '', polo_passivo = '';
      for (var i = 0; i < cells.length; i++) {
        var t = cells[i].textContent.trim();
        var u = t.toUpperCase();
        if (u.indexOf('VARA') >= 0 || u.indexOf('JUIZ') >= 0 || u.indexOf('TURMA') >= 0 || u.indexOf('GARANTIA') >= 0) orgao = t;
        else if (t.length === 10 && t[2] === '/' && t[5] === '/') autuado = t;
        else if (u.indexOf('AÇÃO') >= 0 || u.indexOf('PENAL') >= 0 || u.indexOf('PROCEDIMENTO') >= 0 || u.indexOf('INQUÉRITO') >= 0 || u.indexOf('MEDIDA') >= 0 || u.indexOf('INSANIDADE') >= 0) classe = t;
        else if (u.indexOf('MINISTÉRIO') >= 0 || u.indexOf('PÚBLICO') >= 0) polo_ativo = t;
        else if (t !== '$NUM' && t.indexOf('Peticionar') < 0 && t.indexOf('PJeOffice') < 0 && t.length > 5 && !polo_passivo) polo_passivo = t;
      }
      JSON.stringify({numero:'$NUM',status:'ok',orgao_julgador:orgao,autuado_em:autuado,classe:classe,polo_ativo:polo_ativo,polo_passivo:polo_passivo});
    }
  " 2>&1)

  # Clean the result (remove any agent-browser chrome output)
  CLEAN=$(echo "$RESULT" | grep -o '{.*}' | head -1)

  if [ -n "$CLEAN" ]; then
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$OUTPUT"
    fi
    echo "$CLEAN" >> "$OUTPUT"
    echo "  OK: $(echo "$CLEAN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("polo_passivo","?")[:40])' 2>/dev/null)"
  else
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$OUTPUT"
    fi
    echo "{\"numero\":\"$NUM\",\"status\":\"error\"}" >> "$OUTPUT"
    echo "  ERRO"
  fi

  sleep 2
done

echo "]}" >> "$OUTPUT"

echo ""
echo "Concluido! Resultado em: $OUTPUT"
echo "Total: $TOTAL processos"
