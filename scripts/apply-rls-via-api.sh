#!/bin/bash
# Script para aplicar políticas RLS via Supabase Management API

SUPABASE_URL="https://siwapjqndevuwsluncnr.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpd2FwanFuZGV2dXdzbHVuY25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUwNzA5NCwiZXhwIjoyMDgyMDgzMDk0fQ.aS2tpEkxHEXZ3mbclUg1ol_DgaJzv3WulcvXokftUmo"

# Função para executar SQL via API
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "🔧 $description..."
    
    # Usar a REST API do Supabase para executar SQL diretamente
    response=$(curl -sS -k -X POST "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "apikey: $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$sql\"}" 2>&1)
    
    if echo "$response" | grep -q "error"; then
        echo "⚠️  Não disponível via RPC"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "🚀 Configurando políticas RLS no Supabase Storage..."
echo ""

# Como a função RPC não existe, vamos usar a abordagem de criar via Supabase Studio
# Abrindo o SQL Editor diretamente

echo "📋 O SQL precisa ser executado manualmente no Supabase Dashboard."
echo ""
echo "🔗 Acesse: https://supabase.com/dashboard/project/siwapjqndevuwsluncnr/sql"
echo ""
echo "📝 Cole o conteúdo do arquivo EXECUTAR_SUPABASE_DASHBOARD.sql"
echo ""

# Verificar buckets existentes
echo "📦 Verificando buckets existentes..."
curl -sS -k -X GET "$SUPABASE_URL/storage/v1/bucket" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "apikey: $SERVICE_KEY" | python3 -c "
import json, sys
buckets = json.load(sys.stdin)
print(f'   Encontrados {len(buckets)} buckets:')
for b in buckets:
    status = 'público' if b.get('public') else 'privado'
    print(f'   - {b[\"name\"]} ({status})')
"

echo ""
echo "✅ Buckets verificados!"
echo ""
echo "⚠️  Para aplicar as políticas RLS, execute o SQL no Dashboard do Supabase."

