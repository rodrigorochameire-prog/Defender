#!/bin/bash
# ============================================================================
# Upload Autos Digitais para Google Drive via curl (resumable upload)
# Usa OAuth token (não Service Account — SA não tem quota para uploads)
# ============================================================================
set -uo pipefail

PDF_DIR="${1:-$HOME/Desktop/pje-autos-juri}"
JURI_FOLDER_ID="1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-"

source "$HOME/Defender/.env.local"

echo "=== Upload Autos → Google Drive ==="
echo "PDFs: $PDF_DIR"
echo ""

# ============================================================================
# Obter OAuth access token via refresh token
# ============================================================================
get_access_token() {
  local RESPONSE
  RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
    -d "client_id=$GOOGLE_CLIENT_ID" \
    -d "client_secret=$GOOGLE_CLIENT_SECRET" \
    -d "refresh_token=$GOOGLE_REFRESH_TOKEN" \
    -d "grant_type=refresh_token")

  echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}

ACCESS_TOKEN=$(get_access_token)
if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERRO: Não conseguiu obter access token OAuth"
  echo "Verifique GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no .env.local"
  exit 1
fi
echo "[AUTH] OAuth token obtido"
echo ""

# ============================================================================
# Funções Drive API via curl
# ============================================================================
drive_find_folder() {
  local NAME="$1" PARENT="$2"
  curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$(echo "$NAME" | sed "s/'/\\\\'/g")'+and+'$PARENT'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)" \
    | python3 -c "import sys,json; files=json.load(sys.stdin).get('files',[]); print(files[0]['id'] if files else '')" 2>/dev/null
}

drive_create_folder() {
  local NAME="$1" PARENT="$2"
  local RESULT
  RESULT=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink" \
    -d "{\"name\":\"$NAME\",\"parents\":[\"$PARENT\"],\"mimeType\":\"application/vnd.google-apps.folder\"}")
  echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))" 2>/dev/null
}

drive_find_file() {
  local NAME="$1" PARENT="$2"
  curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$(echo "$NAME" | sed "s/'/\\\\'/g")'+and+'$PARENT'+in+parents+and+trashed=false&fields=files(id,name,size)" \
    | python3 -c "import sys,json; files=json.load(sys.stdin).get('files',[]); print(files[0]['id'] if files else '')" 2>/dev/null
}

drive_upload_resumable() {
  local FILE="$1" NAME="$2" PARENT="$3"
  local SIZE=$(stat -f%z "$FILE")

  # Step 1: Initiate resumable upload
  local UPLOAD_URL
  UPLOAD_URL=$(curl -s -i -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json; charset=UTF-8" \
    -H "X-Upload-Content-Type: application/pdf" \
    -H "X-Upload-Content-Length: $SIZE" \
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink" \
    -d "{\"name\":\"$NAME\",\"parents\":[\"$PARENT\"]}" \
    | grep -i "^location:" | sed 's/location: //i' | tr -d '\r')

  if [ -z "$UPLOAD_URL" ]; then
    echo "FAIL (no upload URL)"
    return 1
  fi

  # Step 2: Upload the file
  local RESULT
  RESULT=$(curl -s -X PUT \
    -H "Content-Type: application/pdf" \
    -H "Content-Length: $SIZE" \
    --data-binary "@$FILE" \
    "$UPLOAD_URL")

  local FILE_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [ -n "$FILE_ID" ]; then
    return 0
  fi
  echo "FAIL ($RESULT)"
  return 1
}

# ============================================================================
# Main loop
# ============================================================================
PDFS=($(ls "$PDF_DIR"/autos-*.pdf 2>/dev/null | sort))
TOTAL=${#PDFS[@]}
echo "$TOTAL PDFs para upload"
echo ""

UPLOADED=0
SKIPPED=0
ERRORS=0

for i in "${!PDFS[@]}"; do
  FILE="${PDFS[$i]}"
  BASENAME=$(basename "$FILE")
  IDX=$((i + 1))

  # Extrair número do processo
  NUM=$(echo "$BASENAME" | sed 's/^autos-//; s/\.pdf$//')
  SIZE=$(stat -f%z "$FILE")
  SIZE_MB=$((SIZE / 1024 / 1024))

  echo -n "[$IDX/$TOTAL] $NUM (${SIZE_MB}MB): "

  # Renovar token a cada 20 uploads (expira em 1h)
  if [ $((IDX % 20)) -eq 0 ]; then
    ACCESS_TOKEN=$(get_access_token)
    [ -z "$ACCESS_TOKEN" ] && { echo "TOKEN EXPIRED"; break; }
  fi

  # Encontrar ou criar pasta do processo
  FOLDER_NAME="$NUM"
  FOLDER_ID=$(drive_find_folder "$FOLDER_NAME" "$JURI_FOLDER_ID")

  if [ -z "$FOLDER_ID" ]; then
    FOLDER_ID=$(drive_create_folder "$FOLDER_NAME" "$JURI_FOLDER_ID")
    if [ -z "$FOLDER_ID" ]; then
      echo "ERRO (criar pasta)"
      ERRORS=$((ERRORS + 1))
      continue
    fi
  fi

  # Verificar se já existe
  PDF_NAME="Autos Digitais - ${NUM}.pdf"
  EXISTING=$(drive_find_file "$PDF_NAME" "$FOLDER_ID")
  if [ -n "$EXISTING" ]; then
    echo "CACHED"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Upload via resumable
  if drive_upload_resumable "$FILE" "$PDF_NAME" "$FOLDER_ID"; then
    echo "OK"
    UPLOADED=$((UPLOADED + 1))
  else
    ERRORS=$((ERRORS + 1))
  fi

  sleep 1
done

echo ""
echo "=== RESUMO ==="
echo "Uploaded: $UPLOADED"
echo "Skipped: $SKIPPED"
echo "Errors: $ERRORS"
echo "Total: $TOTAL"
