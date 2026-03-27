#!/bin/bash
# ============================================================================
# Reorganizar PDFs no Google Drive
# De: Processos - Júri / {numero} / Autos Digitais.pdf
# Para: Processos - Júri / {Nome Assistido} / AP {numero} / Autos Digitais.pdf
# ============================================================================
set -uo pipefail

PDF_DIR="${1:-$HOME/Desktop/pje-autos-juri}"
JURI_FOLDER_ID="1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-"
MAPPING_FILE="$HOME/Desktop/pje-juri-mapping.txt"

source "$HOME/Projetos/Defender/.env.local"

echo "=== Reorganizar Drive: Processos - Júri ==="

# Gerar mapping via DB
cd ~/Projetos/Defender
env $(grep -v '^#\|GOOGLE_SERVICE_ACCOUNT_KEY' .env.local | xargs) npx tsx -e "
const { db } = require('./src/lib/db');
const { processos } = require('./src/lib/db/schema');
const { inArray } = require('drizzle-orm');
const fs = require('fs');

async function main() {
  const nums = fs.readdirSync('$PDF_DIR')
    .filter(f => f.endsWith('.pdf') && f.startsWith('autos-'))
    .map(f => f.replace('autos-','').replace('.pdf',''));

  const results = await db.query.processos.findMany({
    where: inArray(processos.numeroAutos, nums),
    columns: { numeroAutos: true, classeJudicial: true },
    with: { assistido: { columns: { nome: true } } },
  });

  const lines = [];
  for (const r of results) {
    const classe = (r.classeJudicial || '').toUpperCase();
    let tipo = 'AP';
    if (classe.includes('INQUÉRITO') || classe.includes('INQUERITO')) tipo = 'IP';
    else if (classe.includes('EXECUÇÃO')) tipo = 'EP';
    lines.push(r.numeroAutos + '|' + (r.assistido?.nome || 'Sem Assistido') + '|' + tipo);
  }
  // Add nums not in DB
  const found = new Set(results.map(r => r.numeroAutos));
  for (const n of nums) {
    if (!found.has(n)) lines.push(n + '|Sem Assistido|AP');
  }
  fs.writeFileSync('$MAPPING_FILE', lines.join('\n'));
  console.log(lines.length + ' processos mapeados');
}
main().then(() => process.exit(0));
" 2>&1

echo ""

# Obter OAuth token
get_token() {
  curl -s -X POST "https://oauth2.googleapis.com/token" \
    -d "client_id=$GOOGLE_CLIENT_ID" -d "client_secret=$GOOGLE_CLIENT_SECRET" \
    -d "refresh_token=$GOOGLE_REFRESH_TOKEN" -d "grant_type=refresh_token" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}
TOKEN=$(get_token)
[ -z "$TOKEN" ] && { echo "ERRO: OAuth falhou"; exit 1; }
echo "[AUTH] OK"

# Drive helpers
find_folder() {
  local NAME="$1" PARENT="$2"
  curl -s -H "Authorization: Bearer $TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$(echo "$NAME" | sed "s/'/\\\\'/g")'+and+'$PARENT'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id)" \
    | python3 -c "import sys,json; f=json.load(sys.stdin).get('files',[]); print(f[0]['id'] if f else '')" 2>/dev/null
}

create_folder() {
  local NAME="$1" PARENT="$2"
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://www.googleapis.com/drive/v3/files?fields=id" \
    -d "{\"name\":\"$NAME\",\"parents\":[\"$PARENT\"],\"mimeType\":\"application/vnd.google-apps.folder\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null
}

find_or_create_folder() {
  local NAME="$1" PARENT="$2"
  local ID=$(find_folder "$NAME" "$PARENT")
  if [ -z "$ID" ]; then
    ID=$(create_folder "$NAME" "$PARENT")
  fi
  echo "$ID"
}

upload_resumable() {
  local FILE="$1" NAME="$2" PARENT="$3"
  local SIZE=$(stat -f%z "$FILE")

  local URL=$(curl -s -i -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-Upload-Content-Type: application/pdf" \
    -H "X-Upload-Content-Length: $SIZE" \
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id" \
    -d "{\"name\":\"$NAME\",\"parents\":[\"$PARENT\"]}" \
    | grep -i "^location:" | sed 's/location: //i' | tr -d '\r')

  [ -z "$URL" ] && return 1

  curl -s -X PUT -H "Content-Type: application/pdf" -H "Content-Length: $SIZE" \
    --data-binary "@$FILE" "$URL" > /dev/null
}

find_file() {
  local NAME="$1" PARENT="$2"
  curl -s -H "Authorization: Bearer $TOKEN" \
    "https://www.googleapis.com/drive/v3/files?q=name='$(echo "$NAME" | sed "s/'/\\\\'/g")'+and+'$PARENT'+in+parents+and+trashed=false&fields=files(id)" \
    | python3 -c "import sys,json; f=json.load(sys.stdin).get('files',[]); print(f[0]['id'] if f else '')" 2>/dev/null
}

# Deletar pastas antigas (por número de processo direto)
echo ""
echo "=== Limpando pastas antigas ==="
while IFS='|' read -r NUM NOME TIPO; do
  OLD_FOLDER=$(find_folder "$NUM" "$JURI_FOLDER_ID")
  if [ -n "$OLD_FOLDER" ]; then
    echo "  Deletando pasta antiga: $NUM"
    curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
      "https://www.googleapis.com/drive/v3/files/$OLD_FOLDER" > /dev/null
  fi
done < "$MAPPING_FILE"

# Upload com nova estrutura
echo ""
echo "=== Upload com nova estrutura ==="
UPLOADED=0
TOTAL=$(wc -l < "$MAPPING_FILE" | tr -d ' ')

while IFS='|' read -r NUM NOME TIPO; do
  UPLOADED=$((UPLOADED + 1))
  FILE="$PDF_DIR/autos-${NUM}.pdf"
  [ ! -f "$FILE" ] && { echo "[$UPLOADED/$TOTAL] $NUM: PDF não encontrado"; continue; }

  SIZE=$(stat -f%z "$FILE")
  SIZE_MB=$((SIZE / 1024 / 1024))
  echo -n "[$UPLOADED/$TOTAL] $NOME / $TIPO $NUM (${SIZE_MB}MB): "

  # Renovar token a cada 15
  if [ $((UPLOADED % 15)) -eq 0 ]; then
    TOKEN=$(get_token)
    [ -z "$TOKEN" ] && { echo "TOKEN EXPIRED"; break; }
  fi

  # 1. Criar/encontrar pasta do assistido
  ASSISTIDO_FOLDER=$(find_or_create_folder "$NOME" "$JURI_FOLDER_ID")
  [ -z "$ASSISTIDO_FOLDER" ] && { echo "ERRO (pasta assistido)"; continue; }

  # 2. Criar/encontrar pasta do processo (AP 8015405-36.2022...)
  PROC_FOLDER_NAME="$TIPO $NUM"
  PROC_FOLDER=$(find_or_create_folder "$PROC_FOLDER_NAME" "$ASSISTIDO_FOLDER")
  [ -z "$PROC_FOLDER" ] && { echo "ERRO (pasta processo)"; continue; }

  # 3. Verificar se PDF já existe
  PDF_NAME="Autos Digitais - ${NUM}.pdf"
  EXISTING=$(find_file "$PDF_NAME" "$PROC_FOLDER")
  if [ -n "$EXISTING" ]; then
    echo "CACHED"
    continue
  fi

  # 4. Upload
  if upload_resumable "$FILE" "$PDF_NAME" "$PROC_FOLDER"; then
    echo "OK"
  else
    echo "FAIL"
  fi

  sleep 0.5
done < "$MAPPING_FILE"

echo ""
echo "=== CONCLUÍDO ==="
