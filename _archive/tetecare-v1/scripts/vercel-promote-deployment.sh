#!/bin/bash
# Script para promover o deployment mais recente no Vercel
# Requer: vercel CLI instalado e autenticado

set -e

echo "🔍 Verificando se Vercel CLI está instalado..."
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não está instalado."
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

echo "🔐 Verificando autenticação no Vercel..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Você não está autenticado no Vercel."
    echo "🔑 Fazendo login..."
    vercel login
fi

echo "📋 Listando deployments recentes..."
vercel ls --limit=5

echo ""
echo "🎯 Para promover um deployment específico para produção, execute:"
echo "   vercel promote <deployment-url>"
echo ""
echo "📝 Ou para criar um novo deployment da branch main:"
echo "   vercel --prod"
echo ""
echo "💡 Dica: Execute 'vercel ls' para ver todos os deployments disponíveis"

