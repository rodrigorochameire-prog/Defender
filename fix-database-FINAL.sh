#!/bin/bash

# Script FINAL: Connection String CORRETA do Supabase
# Correção: aws-1-sa-east-1 (não aws-0)

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔧 CORREÇÃO FINAL - Connection String Oficial${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Problema identificado:${NC}"
echo "   As tentativas anteriores usavam: aws-0-sa-east-1"
echo "   A connection string correta usa: aws-1-sa-east-1"
echo ""

# Connection string CORRETA do dashboard do Supabase
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

echo -e "${BLUE}📋 Connection String Oficial (Session Pooler):${NC}"
echo "   $DATABASE_URL"
echo ""

# Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Vercel CLI...${NC}"
    npm install -g vercel
    echo ""
fi

# Login e link
echo -e "${BLUE}🔐 Fazendo login no Vercel...${NC}"
vercel login
echo ""

echo -e "${BLUE}🔗 Linkando projeto...${NC}"
vercel link
echo ""

# Remover existente
echo -e "${YELLOW}🗑️  Removendo DATABASE_URL existente...${NC}"
vercel env rm DATABASE_URL production -y 2>/dev/null || true
vercel env rm DATABASE_URL preview -y 2>/dev/null || true
vercel env rm DATABASE_URL development -y 2>/dev/null || true
echo ""

# Adicionar nova
echo -e "${BLUE}📝 Adicionando DATABASE_URL correta...${NC}"
echo ""

echo "$DATABASE_URL" | vercel env add DATABASE_URL production
echo "$DATABASE_URL" | vercel env add DATABASE_URL preview
echo "$DATABASE_URL" | vercel env add DATABASE_URL development

echo ""
echo -e "${GREEN}✅ DATABASE_URL configurado em todos os ambientes!${NC}"
echo ""

# Perguntar sobre redeploy
read -p "Deseja fazer redeploy agora? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Fazendo redeploy...${NC}"
    echo ""
    vercel --prod
    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos passos:${NC}"
    echo "   1. Acesse: https://vercel.com/dashboard"
    echo "   2. Vá em Deployments → Latest → Logs"
    echo "   3. Verifique se o erro 'Tenant or user not found' sumiu"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⚠️  Lembre-se de fazer redeploy:${NC}"
    echo "   vercel --prod"
    echo ""
    echo -e "${YELLOW}   Depois verifique os logs:${NC}"
    echo "   vercel logs"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Configuração concluída com connection string oficial!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
