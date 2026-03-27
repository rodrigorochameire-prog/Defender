#!/bin/bash
SESSION="pje3"
OUTPUT="/Users/rodrigorochameire/Desktop/pje-movimentos-vvd-batch2.json"

PROCESSOS=(
"0500512-56.2021.8.05.0039" "0500619-37.2020.8.05.0039" "0700602-80.2021.8.05.0039"
"8001482-35.2025.8.05.0039" "8001681-57.2025.8.05.0039" "8002244-85.2024.8.05.0039"
"8002830-25.2024.8.05.0039" "8002914-89.2025.8.05.0039" "8003395-52.2025.8.05.0039"
"8003567-91.2025.8.05.0039" "8003829-41.2025.8.05.0039" "8004185-02.2026.8.05.0039"
"8004219-45.2024.8.05.0039" "8004502-05.2023.8.05.0039" "8004658-56.2024.8.05.0039"
"8004996-64.2023.8.05.0039" "8005242-55.2026.8.05.0039" "8005521-41.2026.8.05.0039"
"8005650-80.2025.8.05.0039" "8005727-89.2025.8.05.0039" "8005980-77.2025.8.05.0039"
"8006894-15.2023.8.05.0039" "8007140-40.2025.8.05.0039" "8008636-75.2023.8.05.0039"
"8008838-81.2025.8.05.0039" "8009078-70.2025.8.05.0039" "8009449-05.2023.8.05.0039"
"8009522-74.2023.8.05.0039" "8009543-16.2024.8.05.0039" "8009547-53.2024.8.05.0039"
"8009660-70.2025.8.05.0039" "8009665-29.2024.8.05.0039" "8009688-38.2025.8.05.0039"
"8009693-60.2025.8.05.0039" "8009695-30.2025.8.05.0039" "8009782-83.2025.8.05.0039"
"8009783-68.2025.8.05.0039" "8009785-38.2025.8.05.0039" "8010006-55.2024.8.05.0039"
"8010266-35.2024.8.05.0039" "8010573-52.2025.8.05.0039" "8011086-54.2024.8.05.0039"
"8011093-46.2024.8.05.0039" "8011331-31.2025.8.05.0039" "8011677-50.2023.8.05.0039"
"8012028-52.2025.8.05.0039" "8012054-21.2023.8.05.0039" "8012061-13.2023.8.05.0039"
"8012135-67.2023.8.05.0039" "8012288-32.2025.8.05.0039" "8012289-17.2025.8.05.0039"
"8012386-17.2025.8.05.0039" "8012602-75.2025.8.05.0039" "8012813-14.2025.8.05.0039"
"8012827-32.2024.8.05.0039" "8012947-41.2025.8.05.0039" "8013046-11.2025.8.05.0039"
"8013629-30.2024.8.05.0039" "8014170-63.2024.8.05.0039" "8014649-56.2024.8.05.0039"
"8015428-11.2024.8.05.0039" "8015483-44.2024.8.05.0039" "8015964-22.2024.8.05.0039"
"8017493-42.2025.8.05.0039" "8018948-47.2022.8.05.0039" "8022920-03.2026.8.05.0001"
"8155282-03.2025.8.05.0001" "8236693-68.2025.8.05.0001"
)

echo '{"scrapedAt":"'$(date -u +%Y-%m-%dT%H:%M:%S)'","processos":[' > "$OUTPUT"
TOTAL=${#PROCESSOS[@]}
FIRST=true

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i+1))
  echo "[$IDX/$TOTAL] $NUM"
  SEQ=$(echo "$NUM" | cut -d'-' -f1)
  REST=$(echo "$NUM" | cut -d'-' -f2)
  DIG=$(echo "$REST" | cut -d'.' -f1)
  ANO=$(echo "$REST" | cut -d'.' -f2)
  ORG=$(echo "$REST" | cut -d'.' -f5)

  agent-browser --session "$SESSION" eval "
    var doc = document.querySelector('iframe').contentDocument;
    var cb = doc.querySelector('input[id*=\"clearButton\"]');
    if (cb) cb.click();
    'cleared'
  " > /dev/null 2>&1
  sleep 2

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

  CLEAN=$(echo "$RESULT" | grep -o '{.*}' | head -1)
  if [ -n "$CLEAN" ]; then
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$OUTPUT"
    echo "$CLEAN" >> "$OUTPUT"
    echo "  OK"
  else
    [ "$FIRST" = true ] && FIRST=false || echo "," >> "$OUTPUT"
    echo "{\"numero\":\"$NUM\",\"status\":\"error\"}" >> "$OUTPUT"
    echo "  ERRO"
  fi
  sleep 1
done

echo "]}" >> "$OUTPUT"
echo ""
echo "Concluido! $OUTPUT"
echo "Total: $TOTAL"
