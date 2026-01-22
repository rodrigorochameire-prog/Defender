#!/bin/bash

# Script Rápido: Configurar DATABASE_URL no Vercel
# INTELEX Defender - Supabase Database Connection

set -e

echo "🔐 Configurando DATABASE_URL no Vercel..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# DATABASE_URL com a senha fornecida
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Instalando Vercel CLI...${NC}"
    npm install -g vercel
fi

# Login e link
echo -e "${BLUE}🔐 Fazendo login no Vercel...${NC}"
vercel login

echo -e "${BLUE}🔗 Linkando projeto...${NC}"
vercel link

echo ""
echo -e "${BLUE}📝 Configurando DATABASE_URL...${NC}"
echo ""

# Função para adicionar variável
add_database_url() {
    local env_type=$1
    
    echo -e "${YELLOW}Configurando ${env_type}...${NC}"
    
    # Remover existente
    vercel env rm DATABASE_URL "$env_type" -y 2>/dev/null || true
    
    # Adicionar nova
    echo "$DATABASE_URL" | vercel env add DATABASE_URL "$env_type"
    
    echo -e "${GREEN}✅ DATABASE_URL configurado em ${env_type}${NC}"
    echo ""
}

# Configurar em todos os ambientes
add_database_url "production"
add_database_url "preview"
add_database_url "development"

echo ""
echo -e "${GREEN}✅ DATABASE_URL configurado com sucesso em todos os ambientes!${NC}"
echo ""

# Perguntar sobre redeploy
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
    echo -e "${YELLOW}⚠️  Lembre-se de fazer redeploy:${NC}"
    echo "   vercel --prod"
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Configuração concluída!"
echo "==================================================${NC}"
echo ""
