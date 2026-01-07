#!/bin/bash

# ===========================================
# Script para configurar variáveis de ambiente no Vercel
# ===========================================

echo "🔧 Configurando variáveis de ambiente no Vercel..."
echo ""

# Variáveis a serem configuradas
declare -A ENV_VARS=(
  ["DATABASE_URL"]="postgresql://postgres:401bFr505*@db.siwapjqndevuwsluncnr.supabase.co:5432/postgres"
  ["AUTH_SECRET"]="tetecare-v2-super-secret-key-2025-production-ready"
  ["NEXT_PUBLIC_APP_URL"]="https://tetecare.vercel.app"
  ["NEXT_PUBLIC_SUPABASE_URL"]="https://siwapjqndevuwsluncnr.supabase.co"
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpd2FwanFuZGV2dXdzbHVuY25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDcwOTQsImV4cCI6MjA4MjA4MzA5NH0.TZY7Niw2qT-Pp3vMc2l5HO-Pq6dcEGvjKBrxBYQwm_4"
  ["SUPABASE_SERVICE_ROLE_KEY"]="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpd2FwanFuZGV2dXdzbHVuY25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjUwNzA5NCwiZXhwIjoyMDgyMDgzMDk0fQ.aS2tpEkxHEXZ3mbclUg1ol_DgaJzv3WulcvXokftUmo"
)

# Verificar se vercel está instalado
if ! command -v vercel &> /dev/null; then
    echo "Instalando Vercel CLI..."
    npm install -g vercel
fi

# Verificar login
echo "Verificando login..."
if ! vercel whoami &> /dev/null; then
    echo "Por favor, faça login na Vercel:"
    vercel login
fi

# Link do projeto (se necessário)
echo "Linkando projeto..."
vercel link --yes

# Adicionar cada variável
for key in "${!ENV_VARS[@]}"; do
    value="${ENV_VARS[$key]}"
    echo "Adicionando $key..."
    echo "$value" | vercel env add "$key" production --yes 2>/dev/null || echo "  (já existe ou erro)"
done

echo ""
echo "✅ Variáveis configuradas!"
echo ""
echo "Agora faça um redeploy:"
echo "  vercel --prod"
