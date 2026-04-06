#!/bin/bash
# ============================================================================
# PJe TJBA - Download Autos Digitais v3
# Usa apenas agent-browser snapshot/fill/click (sem eval em iframes)
# ============================================================================
set -uo pipefail

SESSION="${PJE_SESSION:-pje7}"
OUTPUT_DIR="$HOME/Desktop/pje-autos-juri"
LIST_FILE="${1:-$HOME/Desktop/juri-pendentes.txt}"
RELOGIN_EVERY=8

mkdir -p "$OUTPUT_DIR"

# Carregar credenciais
ENV_FILE="$HOME/Defender/.env.local"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

if [ ! -f "$LIST_FILE" ]; then
  echo "ERRO: Lista $LIST_FILE não encontrada"
  exit 1
fi

PROCESSOS=()
while IFS= read -r line; do
  [ -n "$line" ] && PROCESSOS+=("$line")
done < "$LIST_FILE"
TOTAL=${#PROCESSOS[@]}

echo "=== PJe Download Autos v3 ==="
echo "Session: $SESSION | Processos: $TOTAL"
echo "Output: $OUTPUT_DIR"
echo ""

# ============================================================================
# Helpers
# ============================================================================
ab() { agent-browser --session "$SESSION" "$@" 2>&1; }

snap() { ab snapshot -i 2>&1; }

ref_for() {
  # Extrai ref de uma linha de snapshot que contém o pattern
  local PATTERN="$1"
  local SNAP="$2"
  echo "$SNAP" | grep "$PATTERN" | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1
}

accept_dialog() {
  ab dialog accept > /dev/null 2>&1 || true
  sleep 1
}

do_login() {
  echo "  [LOGIN] Abrindo login..."
  ab open "https://pje.tjba.jus.br/pje/login.seam" > /dev/null 2>&1
  sleep 8

  local SNAP=$(snap)

  # Se já logado
  if echo "$SNAP" | grep -q "Rodrigo Meire"; then
    echo "  [LOGIN] Já logado"
    return 0
  fi

  local CPF_REF=$(ref_for 'textbox "CPF' "$SNAP")
  local SENHA_REF=$(ref_for 'textbox "Senha' "$SNAP")
  local ENTRAR_REF=$(ref_for 'button "Entrar"' "$SNAP")

  if [ -n "$CPF_REF" ] && [ -n "$SENHA_REF" ] && [ -n "$ENTRAR_REF" ] && [ -n "$PJE_CPF" ]; then
    ab fill "@$CPF_REF" "$PJE_CPF" > /dev/null 2>&1
    ab fill "@$SENHA_REF" "$PJE_SENHA" > /dev/null 2>&1
    ab click "@$ENTRAR_REF" > /dev/null 2>&1
    sleep 12

    SNAP=$(snap)
    if echo "$SNAP" | grep -q "Rodrigo Meire"; then
      echo "  [LOGIN] OK"
      return 0
    fi
  fi

  echo "  [LOGIN] FALHOU — logue manualmente e pressione Enter..."
  read -r
}

goto_peticionar() {
  for attempt in 1 2 3; do
    ab open "https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam" > /dev/null 2>&1
    sleep 6
    accept_dialog

    local SNAP=$(snap)

    # Verificar se caiu no login
    if echo "$SNAP" | grep -q 'textbox "CPF'; then
      echo "  [goto_pet] Sessão perdida, relogando..."
      do_login
      continue
    fi

    # Clicar aba PETICIONAR (LayoutTable ou td)
    local PET_REF=$(ref_for 'LayoutTable "Peticionar"' "$SNAP")
    if [ -z "$PET_REF" ]; then
      PET_REF=$(ref_for 'PETICIONAR' "$SNAP")
    fi

    if [ -n "$PET_REF" ]; then
      ab click "@$PET_REF" > /dev/null 2>&1
      sleep 2
      accept_dialog
      sleep 8

      SNAP=$(snap)
      if echo "$SNAP" | grep -qi "Número do processo\|searchProcessos\|numeroSequencial"; then
        return 0
      fi
    fi

    echo "  [goto_pet] Tentativa $attempt falhou"
    sleep 3
  done
  return 1
}

search_and_queue() {
  local NUM="$1"
  local SEQ="${NUM%%-*}"
  local REST="${NUM#*-}"
  local DIG="${REST%%.*}"; REST="${REST#*.}"
  local ANO="${REST%%.*}"

  # Preencher campos de busca no iframe
  local SNAP=$(snap)

  # Encontrar campos: Número (sequencial), verificador, ano
  local SEQ_REF=$(ref_for 'textbox "Número do processo"' "$SNAP")
  if [ -z "$SEQ_REF" ]; then
    SEQ_REF=$(ref_for 'textbox.*Sequencial' "$SNAP")
  fi

  # Limpar primeiro (se houver botão limpar)
  local CLEAR_REF=$(ref_for 'button.*[Ll]impar\|button.*[Cc]lear' "$SNAP")
  if [ -n "$CLEAR_REF" ]; then
    ab click "@$CLEAR_REF" > /dev/null 2>&1
    sleep 2
    SNAP=$(snap)
    SEQ_REF=$(ref_for 'textbox "Número do processo"' "$SNAP")
  fi

  if [ -z "$SEQ_REF" ]; then
    echo "no_search_field"
    return
  fi

  # O iframe tem vários textbox: sequencial, verificador, ano, justiça, orgão
  # Preencher por posição relativa
  ab fill "@$SEQ_REF" "$SEQ" > /dev/null 2>&1

  # Verificador (próximo textbox após sequencial)
  SNAP=$(snap)
  local VERI_REF=$(echo "$SNAP" | grep -A1 "ref=$SEQ_REF" | grep 'textbox' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

  # Usar abordagem mais confiável: listar todos os textbox do iframe
  local IFRAME_FIELDS=$(echo "$SNAP" | grep -A100 'Iframe' | grep 'textbox' | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p')
  local FIELD_ARRAY=($IFRAME_FIELDS)

  # Campos na ordem: [0]=Acesso rápido, [1]=Número, [2]=Verificador, [3]=Ano, [4]=Justiça(8), [5]=UF(05), [6]=Orgão
  if [ ${#FIELD_ARRAY[@]} -ge 7 ]; then
    ab fill "@${FIELD_ARRAY[1]}" "$SEQ" > /dev/null 2>&1
    ab fill "@${FIELD_ARRAY[2]}" "$DIG" > /dev/null 2>&1
    ab fill "@${FIELD_ARRAY[3]}" "$ANO" > /dev/null 2>&1
    # Justiça e UF já preenchidos (8 e 05)
  elif [ ${#FIELD_ARRAY[@]} -ge 4 ]; then
    ab fill "@${FIELD_ARRAY[0]}" "$SEQ" > /dev/null 2>&1
    ab fill "@${FIELD_ARRAY[1]}" "$DIG" > /dev/null 2>&1
    ab fill "@${FIELD_ARRAY[2]}" "$ANO" > /dev/null 2>&1
  fi

  # Clicar botão pesquisar
  SNAP=$(snap)
  local SEARCH_REF=$(ref_for 'button.*[Pp]esquisar\|button.*[Cc]onsultar\|button.*[Bb]uscar' "$SNAP")
  if [ -z "$SEARCH_REF" ]; then
    # Tentar por imagem de lupa ou outro pattern
    SEARCH_REF=$(ref_for 'searchProcessos' "$SNAP")
  fi

  if [ -n "$SEARCH_REF" ]; then
    ab click "@$SEARCH_REF" > /dev/null 2>&1
  else
    echo "no_search_btn"
    return
  fi

  sleep 7

  # Verificar resultado
  SNAP=$(snap)
  local AUTOS_REF=$(ref_for 'link "Autos Digitais"\|Autos Digitais' "$SNAP")

  if [ -z "$AUTOS_REF" ]; then
    # Verificar se tem resultado de busca
    if echo "$SNAP" | grep -q "Nenhum resultado\|Nenhum processo"; then
      echo "not_found"
    else
      echo "no_autos_link"
    fi
    return
  fi

  # Clicar Autos Digitais
  ab click "@$AUTOS_REF" > /dev/null 2>&1
  sleep 12

  # Verificar se abriu a página de autos (título = número do processo)
  SNAP=$(snap)

  # Procurar botão de download (ícone de download)
  local DL_REF=$(ref_for 'Ícone de download\|download' "$SNAP")
  if [ -z "$DL_REF" ]; then
    DL_REF=$(ref_for 'button.*@e7\|aria-expanded' "$SNAP")
  fi

  if [ -z "$DL_REF" ]; then
    echo "no_dl_icon"
    return
  fi

  ab click "@$DL_REF" > /dev/null 2>&1
  sleep 3

  # Confirmar download
  SNAP=$(snap)
  local CONFIRM_REF=$(ref_for 'button "Download"' "$SNAP")
  if [ -z "$CONFIRM_REF" ]; then
    CONFIRM_REF=$(ref_for '"Download"' "$SNAP")
  fi

  if [ -n "$CONFIRM_REF" ]; then
    ab click "@$CONFIRM_REF" > /dev/null 2>&1
    sleep 5
  fi

  # Verificar sucesso
  SNAP=$(snap)
  if echo "$SNAP" | grep -qi "Área de download\|será disponibilizado"; then
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

  if [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null || echo 0)" -gt 10000 ]; then
    echo "[$IDX/$TOTAL] $NUM - CACHED"
    CACHED+=("$NUM")
    continue
  fi

  # Relogin periódico
  if [ $PROC_COUNTER -ge $RELOGIN_EVERY ]; then
    echo "  [RELOGIN] Renovando sessão..."
    do_login
    PROC_COUNTER=0
    goto_peticionar || { echo "ERRO: Peticionar falhou após relogin"; exit 1; }
  fi

  echo -n "[$IDX/$TOTAL] $NUM - "

  RESULT=$(search_and_queue "$NUM")

  case "$RESULT" in
    queued|queue_unknown)
      echo "QUEUED"
      QUEUED+=("$NUM")
      ;;
    not_found)
      echo "NOT FOUND"
      FAILED+=("$NUM:not_found")
      ;;
    *)
      echo "FAIL ($RESULT)"
      FAILED+=("$NUM:$RESULT")
      ;;
  esac

  PROC_COUNTER=$((PROC_COUNTER + 1))

  # Voltar para peticionar para próximo processo
  goto_peticionar || {
    echo "  WARN: goto_peticionar falhou, tentando relogin..."
    do_login
    goto_peticionar || true
  }
  sleep 1
done

echo ""
echo "Enfileirados: ${#QUEUED[@]} | Cached: ${#CACHED[@]} | Falhas: ${#FAILED[@]}"
[ ${#FAILED[@]} -gt 0 ] && printf '  Falha: %s\n' "${FAILED[@]}"

if [ ${#QUEUED[@]} -eq 0 ] && [ ${#CACHED[@]} -gt 0 ]; then
  echo "Tudo cacheado!"
  exit 0
fi

if [ ${#QUEUED[@]} -eq 0 ]; then
  echo "Nada enfileirado."
  exit 0
fi

# ============================================================================
# FASE 2: Baixar da Área de Download (via snapshot + click)
# ============================================================================
echo ""
echo "=== FASE 2: Baixar PDFs ==="

DOWNLOADED=0
REMAINING=("${QUEUED[@]}")

for round in $(seq 1 30); do
  [ ${#REMAINING[@]} -eq 0 ] && break

  echo "  --- Round $round ---"

  ab open "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam" > /dev/null 2>&1
  sleep 10

  SNAP=$(snap)

  STILL_WAITING=()
  for NUM in "${REMAINING[@]}"; do
    PDF="$OUTPUT_DIR/autos-${NUM}.pdf"
    [ -f "$PDF" ] && [ "$(stat -f%z "$PDF" 2>/dev/null)" -gt 10000 ] && { DOWNLOADED=$((DOWNLOADED + 1)); continue; }

    # Verificar se este processo aparece com status Sucesso no snapshot
    if echo "$SNAP" | grep -q "\"$NUM\""; then
      # Verificar status
      local_status=$(echo "$SNAP" | grep -A5 "\"$NUM\"" | grep -o 'Sucesso\|Processando\|Fila\|Erro' | head -1)

      if [ "$local_status" = "Sucesso" ]; then
        echo -n "  $NUM: downloading... "

        # Encontrar botão (não disabled) nesta row
        BTN_REF=$(echo "$SNAP" | grep -A10 "\"$NUM\"" | grep 'button.*ui-btn' | grep -v disabled | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

        if [ -n "$BTN_REF" ]; then
          ab click "@$BTN_REF" > /dev/null 2>&1
          sleep 8

          # A página pode ter aberto uma nova aba/página com segundo botão de Download
          SNAP2=$(snap)

          # Verificar se estamos em uma página de download (com botão Download)
          DL2_REF=$(echo "$SNAP2" | grep 'button "Download"\|link "Download"\|button.*[Bb]aixar' | grep -v disabled | sed -n 's/.*ref=\(e[0-9]*\).*/\1/p' | head -1)

          if [ -n "$DL2_REF" ]; then
            echo -n "(2nd click) "
            ab click "@$DL2_REF" > /dev/null 2>&1
            sleep 8
          fi

          # Verificar S3 URL
          S3_URL=$(ab eval "window.location.href" 2>&1 | tr -d '"')

          if echo "$S3_URL" | grep -q "amazonaws\|s3\."; then
            curl -sL "$S3_URL" -o "$PDF" --max-time 300
            SIZE=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
            if [ "$SIZE" -gt 10000 ]; then
              echo "OK ($(( SIZE / 1024 ))KB)"
              DOWNLOADED=$((DOWNLOADED + 1))
            else
              echo "SMALL"
              rm -f "$PDF"
              STILL_WAITING+=("$NUM")
            fi
          else
            # Verificar ~/Downloads
            sleep 3
            NEWEST=$(ls -t ~/Downloads/*.pdf 2>/dev/null | head -1)
            if [ -n "$NEWEST" ] && [ "$(stat -f%z "$NEWEST" 2>/dev/null)" -gt 10000 ]; then
              mv "$NEWEST" "$PDF"
              SIZE=$(stat -f%z "$PDF" 2>/dev/null || echo 0)
              echo "OK via Downloads ($(( SIZE / 1024 ))KB)"
              DOWNLOADED=$((DOWNLOADED + 1))
            else
              echo "FAIL"
              STILL_WAITING+=("$NUM")
            fi
          fi

          # Re-navegar para Área (pois saímos para S3)
          sleep 2
          ab open "https://pje.tjba.jus.br/pje/AreaDeDownload/listView.seam" > /dev/null 2>&1
          sleep 8
          SNAP=$(snap)
        else
          echo "no button"
          STILL_WAITING+=("$NUM")
        fi
      else
        STILL_WAITING+=("$NUM")
      fi
    else
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
