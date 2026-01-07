#!/bin/bash
# ============================================
# Script para Criar .env e Rebuild
# ============================================

echo "📝 Criando arquivo .env..."
cp .env.local .env

echo ""
echo "✅ Arquivo .env criado!"
echo ""
echo "🔨 Fazendo rebuild..."
pnpm build

echo ""
echo "✅ Rebuild concluído!"
echo ""
echo "🚀 Agora execute: pnpm start"


