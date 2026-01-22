#!/bin/bash

# Script DEFINITIVO: Senha com URL Encoding Correto
# Senha real: 401bFr505@@
# Senha encoded: 401bFr505%40%40

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🔐 CORREÇÃO DEFINITIVA - URL Encoding da Senha${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️  Problema identificado:${NC}"
echo "   Senha: 401bFr505@@"
echo "   O caractere @ precisa ser escapado em URLs"
echo ""
echo -e "${BLUE}✅ Solução:${NC}"
echo "   @ → %40 (URL encoding)"
echo "   401bFr505@@ → 401bFr505%40%40"
echo ""

# Connection string com senha corretamente escapada
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505%40%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"

echo -e "${BLUE}📋 Connection String com senha escapada:${NC}"
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
echo -e "${BLUE}📝 Adicionando DATABASE_URL com senha escapada...${NC}"
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
    echo -e "${YELLOW}📋 Verifique os logs:${NC}"
    echo "   vercel logs"
    echo ""
    echo "   Ou acesse: https://vercel.com/dashboard"
    echo ""
    echo -e "${GREEN}✅ O erro 'password authentication failed' deve ter sumido!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Lembre-se de fazer redeploy:${NC}"
    echo "   vercel --prod"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Senha corretamente escapada e configurada!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
