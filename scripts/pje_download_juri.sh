#!/bin/bash
# ============================================================================
# PJe TJBA - Download Autos Digitais (Júri - Analisar)
# Otimizado: enfileira tudo, depois baixa da Área de Download
# ============================================================================
set -uo pipefail

SESSION="${PJE_SESSION:-pje6}"
OUTPUT_DIR="$HOME/Desktop/pje-autos-juri"
LIST_FILE="${1:-$HOME/Desktop/juri-analisar-processos.txt}"

# Carregar credenciais PJe do .env.local
ENV_FILE="$HOME/Projetos/Defender/.env.local"
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

mkdir -p "$OUTPUT_DIR"

if [ ! -f "$LIST_FILE" ]; then
  echo "ERRO: Lista $LIST_FILE não encontrada"
  exit 1
fi

PROCESSOS=()
while IFS= read -r line; do
  [ -n "$line" ] && PROCESSOS+=("$line")
done < "$LIST_FILE"
TOTAL=${#PROCESSOS[@]}

echo "=== PJe Download Autos - Júri Analisar ==="
echo "Session: $SESSION | Processos: $TOTAL"
echo "Output: $OUTPUT_DIR"
echo ""

# ============================================================================
# Helpers using agent-browser
# ============================================================================

ab() { agent-browser --session "$SESSION" "$@" 2>&1; }
ab_eval() { agent-browser --session "$SESSION" eval "$1" 2>&1 | tr -d '"'; }

do_login() {
  # Navegar para login
  ab open "https://pje.tjba.jus.br/pje/login.seam" > /dev/null 2>&1
  sleep 8

  local URL=$(ab_eval "window.location.href")

  # Se já está no painel, sessão válida
  if echo "$URL" | grep -q "Painel\|advogado"; then
    return 0
  fi

  # Tentar auto-login usando fill (simula keystrokes reais, Keycloak aceita)
  if [ -n "$PJE_CPF" ] && [ -n "$PJE_SENHA" ]; then
    echo "  [LOGIN] Auto-login (fill)..."
    # Pegar refs dos campos via snapshot
    local SNAP=$(ab snapshot -i 2>&1)
    local CPF_REF=$(echo "$SNAP" | grep 'textbox "CPF' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
    local SENHA_REF=$(echo "$SNAP" | grep 'textbox "Senha' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
    local ENTRAR_REF=$(echo "$SNAP" | grep 'button "Entrar"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

    if [ -n "$CPF_REF" ] && [ -n "$SENHA_REF" ] && [ -n "$ENTRAR_REF" ]; then
      ab fill "@$CPF_REF" "$PJE_CPF" > /dev/null 2>&1
      ab fill "@$SENHA_REF" "$PJE_SENHA" > /dev/null 2>&1
      ab click "@$ENTRAR_REF" > /dev/null 2>&1
      sleep 12

      URL=$(ab_eval "window.location.href")
      if echo "$URL" | grep -q "Painel\|advogado"; then
        echo "  [LOGIN] OK"
        return 0
      fi
    fi
  fi

  echo "  [LOGIN] FALHOU — logue manualmente e pressione Enter..."
  read -r
  return 0
}

relogin() {
  echo "  [RELOGIN] Renovando sessão JSF..."
  do_login
}

goto_peticionar() {
  for attempt in 1 2 3 4 5; do
    # Na tentativa 4, forçar relogin completo
    if [ "$attempt" -ge 4 ]; then
      echo "  [goto_peticionar] Forçando login completo (tentativa $attempt)..."
      do_login
    fi

    ab_eval "window.location.href = '/pje/Painel/painel_usuario/advogado.seam'" > /dev/null
    sleep 6

    # Verificar se caiu no login
    local URL=$(ab_eval "window.location.href")
    if echo "$URL" | grep -q "login\|sso.cloud\|about:blank"; then
      echo "  [goto_peticionar] Sessão perdida, refazendo login..."
      do_login
      continue
    fi

    # Tentar nova interface (menu lateral) e antiga (abas td)
    local SNAP=$(ab snapshot -i 2>&1)
    local PET_REF=$(echo "$SNAP" | grep 'link "Peticionar"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

    if [ -n "$PET_REF" ]; then
      # Nova interface: link no menu lateral
      ab click "@$PET_REF" > /dev/null 2>&1
      sleep 2
      # Aceitar dialog CNJ se aparecer
      ab dialog accept > /dev/null 2>&1
      sleep 8
    else
      # Antiga interface: aba td
      ab_eval "
        var cells = document.querySelectorAll('td');
        for (var i = 0; i < cells.length; i++) {
          if (cells[i].textContent.trim() === 'PETICIONAR') { cells[i].click(); break; }
        }
      " > /dev/null
      sleep 8
    fi

    # Verificar se iframe com campo de busca carregou
    # Na nova interface, pode ser que Peticionar abre direto no iframe
    local R="fail"
    for check in 1 2 3; do
      SNAP=$(ab snapshot -i 2>&1)
      if echo "$SNAP" | grep -qi "searchProcessos\|numeroSequencial\|Pesquisa de Processos"; then
        R="ready"
        break
      fi
      sleep 3
    done

    if [ "$R" = "ready" ]; then
      return 0
    fi
    echo "  [goto_peticionar] Tentativa $attempt falhou, retentando..."
    sleep 3
  done
  return 1
}

search_proc() {
  local NUM="$1"
  local SEQ="${NUM%%-*}"
  local REST="${NUM#*-}"
  local DIG="${REST%%.*}"; REST="${REST#*.}"
  local ANO="${REST%%.*}"; REST="${REST#*.}"
  REST="${REST#*.}"; REST="${REST#*.}"
  local ORG="$REST"

  ab_eval "var doc=document.querySelector('iframe').contentDocument; var c=doc.querySelector('input[id*=\"clearButton\"]'); if(c)c.click();" > /dev/null
  sleep 2
  ab_eval "
    var doc=document.querySelector('iframe').contentDocument;
    doc.querySelector('input[id*=\"numeroSequencial\"]').value='$SEQ';
    doc.querySelector('input[id*=\"Verificador\"]').value='$DIG';
    doc.querySelector('input[id*=\"Ano\"]').value='$ANO';
    doc.querySelector('input[id*=\"OrgaoJustica\"]').value='$ORG';
    doc.querySelector('input[id*=\"searchProcessos\"]').click();
  " > /dev/null
  sleep 7
  local R=$(ab_eval "var doc=document.querySelector('iframe').contentDocument; doc.querySelector('tr.rich-table-row') ? 'yes' : 'no'")
  [ "$R" = "yes" ]
}

click_autos() {
  ab_eval "
    var doc=document.querySelector('iframe').contentDocument;
    var link=doc.querySelector('a[title=\"Autos Digitais\"]');
    if(link && link.onclick){link.onclick(new Event('click'));'ok';}else{'fail';}
  " > /dev/null
  sleep 12
  local TITLE=$(ab_eval "document.title")
  echo "$TITLE" | grep -qE '^[0-9]'
}

queue_download() {
  # Find and click the download icon button (text contains "download", has aria-expanded)
  # Then find and click the "Download" confirm button

  # Step 1: Get the snapshot and find download icon ref
  local SNAP=$(ab snapshot -i 2>&1)
  local DL_REF=$(echo "$SNAP" | grep -i "Ícone de download" | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

  if [ -z "$DL_REF" ]; then
    echo "no_dl_btn"
    return
  fi

  ab click "@$DL_REF" > /dev/null 2>&1
  sleep 3

  # Step 2: Find Download confirm button
  SNAP=$(ab snapshot -i 2>&1)
  local CONFIRM_REF=$(echo "$SNAP" | grep '^- button "Download"' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

  if [ -z "$CONFIRM_REF" ]; then
    echo "no_confirm_btn"
    return
  fi

  ab click "@$CONFIRM_REF" > /dev/null 2>&1
  sleep 5

  local R=$(ab_eval "document.body.innerText.indexOf('Área de download') >= 0 ? 'queued' : 'fail'")
  echo "$R"
}

# ============================================================================
# FASE 1: Enfileirar todos os downloads
# ============================================================================
echo "=== FASE 1: Enfileirar downloads ==="

QUEUED=()
CACHED=()
FAILED=()

RELOGIN_EVERY=10
PROC_COUNTER=0

goto_peticionar || { echo "ERRO: Peticionar falhou"; exit 1; }

for i in "${!PROCESSOS[@]}"; do
  NUM="${PROCESSOS[$i]}"
  IDX=$((i + 1))
  PDF="$OUTPUT_DIR/autos-${NUM}.pdf"

  if [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null || echo 0)" -gt 10000 ]; then
    echo "[$IDX/$TOTAL] $NUM - CACHED"
    CACHED+=("$NUM")
    continue
  fi

  # Relogin a cada N processos para evitar corrupção JSF
  if [ $PROC_COUNTER -ge $RELOGIN_EVERY ]; then
    relogin
    PROC_COUNTER=0
    goto_peticionar || { echo "ERRO: Peticionar falhou após relogin"; exit 1; }
  fi

  echo -n "[$IDX/$TOTAL] $NUM - "

  if ! search_proc "$NUM"; then
    echo "NOT FOUND"
    FAILED+=("$NUM:not_found")
    PROC_COUNTER=$((PROC_COUNTER + 1))
    continue
  fi

  if ! click_autos; then
    echo "AUTOS FAIL"
    FAILED+=("$NUM:autos_fail")
    goto_peticionar || true
    continue
  fi

  RESULT=$(queue_download)
  if [ "$RESULT" = "queued" ]; then
    echo "QUEUED"
    QUEUED+=("$NUM")
  else
    echo "QUEUE FAIL ($RESULT)"
    FAILED+=("$NUM:queue_$RESULT")
  fi

  PROC_COUNTER=$((PROC_COUNTER + 1))
  goto_peticionar || { echo "  WARN: reload failed"; sleep 3; goto_peticionar || true; }
  sleep 1
done

echo ""
echo "Enfileirados: ${#QUEUED[@]} | Cached: ${#CACHED[@]} | Falhas: ${#FAILED[@]}"

if [ ${#QUEUED[@]} -eq 0 ]; then
  echo "Nada a baixar."
  [ ${#FAILED[@]} -gt 0 ] && printf 'Falha: %s\n' "${FAILED[@]}"
  exit 0
fi

# ============================================================================
# FASE 2: Baixar da Área de Download
# ============================================================================
echo ""
echo "=== FASE 2: Baixar PDFs ==="

ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
sleep 8

DOWNLOADED=0
REMAINING=("${QUEUED[@]}")

# Função para ler status da Área de Download (DOM direto, sem iframe)
read_area_status() {
  ab_eval "
    var result={};
    var rows=document.querySelectorAll('tr');
    for(var r=0;r<rows.length;r++){
      var tds=rows[r].querySelectorAll('td');
      if(tds.length>=4){
        var num=tds[0].textContent.trim();
        var status=tds[3].textContent.trim();
        if(num.match(/^[0-9]{7}-/))result[num]=status;
      }
    }
    JSON.stringify(result);
  "
}

# Função para clicar download de um processo específico
click_area_download() {
  local NUM="$1"
  # Usar snapshot do agent-browser para encontrar o botão correto
  local SNAP=$(ab snapshot -i 2>&1)
  # Procurar a row com o número do processo e achar o botão de download
  local DL_REF=$(echo "$SNAP" | grep -A5 "$NUM" | grep -i 'button.*download\|link.*download\|button.*Baixar\|img.*download' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

  if [ -z "$DL_REF" ]; then
    # Fallback: buscar botão genérico na mesma região
    DL_REF=$(echo "$SNAP" | grep -A5 "$NUM" | grep 'button\|link.*\.pdf' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)
  fi

  if [ -n "$DL_REF" ]; then
    ab click "@$DL_REF" > /dev/null 2>&1
    echo "$DL_REF"
  else
    # Fallback via JS: clicar botão/link na row que contém o número
    ab_eval "
      var cells=document.querySelectorAll('td');
      for(var i=0;i<cells.length;i++){
        if(cells[i].textContent.indexOf('$NUM')>=0){
          var row=cells[i].closest('tr');
          if(row){
            var btn=row.querySelector('a[href],button:not([disabled])');
            if(btn){btn.click();'clicked';}else{'no_btn';}
          }
        }
      }
    "
  fi
}

for round in $(seq 1 30); do
  [ ${#REMAINING[@]} -eq 0 ] && break

  echo "  --- Round $round ---"

  # Refresh a Área de Download
  ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
  sleep 6

  # Debug: mostrar conteúdo da página
  if [ "$round" -eq 1 ]; then
    echo "  [DEBUG] Conteúdo da Área de Download:"
    ab_eval "
      var rows=document.querySelectorAll('tr');
      var info=[];
      for(var r=0;r<rows.length;r++){
        var tds=rows[r].querySelectorAll('td');
        if(tds.length>=2) info.push(Array.from(tds).map(function(t){return t.textContent.trim().substring(0,40)}).join(' | '));
      }
      info.join('\\n');
    " | head -20
    echo "  [/DEBUG]"
  fi

  # Ler status de todos os processos
  STATUSES=$(read_area_status)
  echo "  Status raw: ${STATUSES:0:200}"

  STILL_WAITING=()
  for NUM in "${REMAINING[@]}"; do
    STATUS=$(echo "$STATUSES" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('$NUM','unknown'))" 2>/dev/null || echo "parse_err")

    if [ "$STATUS" = "Sucesso" ]; then
      echo -n "  $NUM: downloading... "

      # Marcar arquivos existentes em ~/Downloads antes do click
      BEFORE_DL=$(ls -t ~/Downloads/*.pdf 2>/dev/null | head -1)

      click_area_download "$NUM"
      sleep 8

      # Tentar 3 estratégias para pegar o PDF:

      # 1) Verificar se navegou para S3
      S3_URL=$(ab_eval "window.location.href")
      if echo "$S3_URL" | grep -q "amazonaws\|s3\."; then
        PDF="$OUTPUT_DIR/autos-${NUM}.pdf"
        curl -sL "$S3_URL" -o "$PDF" --max-time 300
        SIZE=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
        if [ "$SIZE" -gt 10000 ]; then
          echo "OK via S3 ($(( SIZE / 1024 ))KB)"
          DOWNLOADED=$((DOWNLOADED + 1))
          ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
          sleep 3
          continue
        fi
        rm -f "$PDF"
      fi

      # 2) Verificar se apareceu novo PDF em ~/Downloads
      sleep 3
      AFTER_DL=$(ls -t ~/Downloads/*.pdf 2>/dev/null | head -1)
      if [ -n "$AFTER_DL" ] && [ "$AFTER_DL" != "$BEFORE_DL" ]; then
        SIZE=$(stat -f%z "$AFTER_DL" 2>/dev/null || echo 0)
        if [ "$SIZE" -gt 10000 ]; then
          mv "$AFTER_DL" "$OUTPUT_DIR/autos-${NUM}.pdf"
          echo "OK via ~/Downloads ($(( SIZE / 1024 ))KB)"
          DOWNLOADED=$((DOWNLOADED + 1))
          ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
          sleep 3
          continue
        fi
      fi

      # 3) Nenhuma estratégia funcionou
      echo "FAIL (URL: ${S3_URL:0:80})"
      STILL_WAITING+=("$NUM")

      # Voltar para Área de Download
      ab_eval "window.location.href = '/pje/AreaDeDownload/listView.seam'" > /dev/null
      sleep 3

    elif [ "$STATUS" = "unknown" ] || [ "$STATUS" = "parse_err" ]; then
      echo "  $NUM: NOT IN AREA (status: $STATUS)"
      STILL_WAITING+=("$NUM")
    elif [ "$STATUS" = "Processando" ] || [ "$STATUS" = "Em processamento" ] || [ "$STATUS" = "Fila" ]; then
      STILL_WAITING+=("$NUM")
    else
      echo "  $NUM: status=$STATUS"
      STILL_WAITING+=("$NUM")
    fi
  done

  REMAINING=("${STILL_WAITING[@]+"${STILL_WAITING[@]}"}")
  if [ ${#REMAINING[@]} -gt 0 ]; then
    echo "  Aguardando ${#REMAINING[@]} processos... (round $round/30)"
    sleep 15
  fi
done

# ============================================================================
# Resumo
# ============================================================================
echo ""
echo "=== RESUMO ==="
echo "Baixados: $DOWNLOADED"
echo "Cached: ${#CACHED[@]}"
echo "Falhas: ${#FAILED[@]}"
[ ${#FAILED[@]} -gt 0 ] && printf '  %s\n' "${FAILED[@]}"
echo ""
ls "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | xargs echo "Total PDFs:"
du -sh "$OUTPUT_DIR" 2>/dev/null
