#!/bin/bash

# Script: Corrigir Conexão do Banco de Dados Supabase
# Testa 3 variações de connection string para encontrar a correta

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Correção de Conexão do Banco de Dados Supabase${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
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

# Apresentar opções
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  3 Opções de Connection String Disponíveis${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}[1] Transaction Pooler com SSL (Recomendado para Vercel)${NC}"
echo "    postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
echo ""
echo -e "${GREEN}[2] Direct Connection com SSL${NC}"
echo "    postgresql://postgres:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres?sslmode=require"
echo ""
echo -e "${GREEN}[3] Session Pooler com SSL${NC}"
echo "    postgresql://postgres:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Solicitar escolha
read -p "Escolha uma opção (1-3) ou 'a' para testar todas: " choice
echo ""

# Definir connection strings
OPTION_1="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
OPTION_2="postgresql://postgres:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres?sslmode=require"
OPTION_3="postgresql://postgres:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Função para configurar DATABASE_URL
configure_database_url() {
    local db_url=$1
    local option_name=$2
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Configurando: ${option_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Remover existente
    echo -e "${YELLOW}🗑️  Removendo DATABASE_URL existente...${NC}"
    vercel env rm DATABASE_URL production -y 2>/dev/null || true
    vercel env rm DATABASE_URL preview -y 2>/dev/null || true
    vercel env rm DATABASE_URL development -y 2>/dev/null || true
    echo ""
    
    # Adicionar nova
    echo -e "${YELLOW}📝 Adicionando nova DATABASE_URL...${NC}"
    echo "$db_url" | vercel env add DATABASE_URL production
    echo "$db_url" | vercel env add DATABASE_URL preview
    echo "$db_url" | vercel env add DATABASE_URL development
    echo ""
    
    echo -e "${GREEN}✅ DATABASE_URL configurado em todos os ambientes${NC}"
}

# Processar escolha
case $choice in
    1)
        configure_database_url "$OPTION_1" "Transaction Pooler com SSL"
        ;;
    2)
        configure_database_url "$OPTION_2" "Direct Connection com SSL"
        ;;
    3)
        configure_database_url "$OPTION_3" "Session Pooler com SSL"
        ;;
    a|A)
        echo -e "${YELLOW}⚠️  Modo de teste: Vamos começar com a opção recomendada (1)${NC}"
        echo -e "${YELLOW}   Se não funcionar, volte e teste as outras opções.${NC}"
        configure_database_url "$OPTION_1" "Transaction Pooler com SSL"
        ;;
    *)
        echo -e "${RED}❌ Opção inválida. Usando opção 1 (recomendada).${NC}"
        configure_database_url "$OPTION_1" "Transaction Pooler com SSL"
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Configuração Concluída${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Perguntar sobre redeploy
read -p "Deseja fazer redeploy agora para testar? (y/n): " -n 1 -r
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
    echo -e "${YELLOW}   Se o erro persistir:${NC}"
    echo "   - Execute este script novamente"
    echo "   - Escolha outra opção (2 ou 3)"
    echo "   - Teste até encontrar a que funciona"
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
echo -e "${GREEN}  ✅ Script concluído!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}💡 Dica:${NC} Se a opção escolhida não funcionar, execute:"
echo "   ./fix-database-connection.sh"
echo ""
echo "   E teste outra opção até encontrar a correta."
echo ""
