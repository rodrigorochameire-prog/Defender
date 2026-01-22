#!/bin/bash

# Script de Configuração Automática - Vercel Environment Variables
# INTELEX Defender - Supabase Integration
# 
# Este script configura automaticamente todas as variáveis de ambiente
# necessárias no Vercel para o projeto Defender

set -e

echo "🚀 INTELEX Defender - Configuração Automática Vercel"
echo "=================================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI não encontrado!${NC}"
    echo ""
    echo "Instalando Vercel CLI..."
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI instalado com sucesso!${NC}"
    echo ""
fi

# Login no Vercel
echo -e "${BLUE}🔐 Fazendo login no Vercel...${NC}"
vercel login
echo ""

# Link do projeto (se ainda não estiver linkado)
echo -e "${BLUE}🔗 Linkando projeto...${NC}"
vercel link
echo ""

# Solicitar credenciais faltantes
echo -e "${YELLOW}⚠️  Você precisa fornecer algumas credenciais do Supabase${NC}"
echo ""
echo "Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database"
echo ""
read -p "Cole a DATABASE_URL completa (com senha): " DATABASE_URL
echo ""

echo "Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/api"
echo ""
read -p "Cole a SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo ""

# Variáveis públicas (já obtidas via MCP)
NEXT_PUBLIC_SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc"

echo -e "${BLUE}📝 Configurando variáveis de ambiente...${NC}"
echo ""

# Função para adicionar variável de ambiente
add_env() {
    local key=$1
    local value=$2
    local env_type=$3
    
    echo -e "${YELLOW}Adicionando: ${key}${NC}"
    
    # Remover variável existente (se houver)
    vercel env rm "$key" "$env_type" -y 2>/dev/null || true
    
    # Adicionar nova variável
    echo "$value" | vercel env add "$key" "$env_type"
    
    echo -e "${GREEN}✅ ${key} configurado${NC}"
    echo ""
}

# Configurar variáveis para Production
echo -e "${BLUE}🌐 Configurando Production...${NC}"
echo ""

add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "production"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "production"
add_env "DATABASE_URL" "$DATABASE_URL" "production"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "production"

# Configurar variáveis para Preview
echo -e "${BLUE}🔍 Configurando Preview...${NC}"
echo ""

add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "preview"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "preview"
add_env "DATABASE_URL" "$DATABASE_URL" "preview"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "preview"

# Configurar variáveis para Development
echo -e "${BLUE}💻 Configurando Development...${NC}"
echo ""

add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "development"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "development"
add_env "DATABASE_URL" "$DATABASE_URL" "development"
add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "development"

echo ""
echo -e "${GREEN}✅ Todas as variáveis configuradas com sucesso!${NC}"
echo ""

# Perguntar se deseja fazer redeploy
read -p "Deseja fazer redeploy agora? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Fazendo redeploy...${NC}"
    vercel --prod
    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Lembre-se de fazer redeploy manualmente:${NC}"
    echo "   vercel --prod"
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Configuração concluída com sucesso!"
echo "==================================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Verifique o deploy em: https://vercel.com/dashboard"
echo "2. Teste a aplicação em produção"
echo "3. Verifique os logs se houver erros"
echo ""
