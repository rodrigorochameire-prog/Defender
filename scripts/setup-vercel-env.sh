#!/bin/bash

# ===========================================
# Script para configurar variáveis de ambiente na Vercel
# ===========================================
# 
# USO:
# 1. Faça login na Vercel: vercel login
# 2. Execute este script: ./scripts/setup-vercel-env.sh
#
# OU adicione manualmente no dashboard:
# https://vercel.com/[seu-time]/[seu-projeto]/settings/environment-variables
# ===========================================

echo "🚀 Configurando variáveis de ambiente na Vercel..."
echo ""

# Verificar se está logado
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ Você não está logado na Vercel."
    echo "   Execute: vercel login"
    exit 1
fi

echo "✅ Logado como: $(vercel whoami)"
echo ""

# ===========================================
# AXIOM (Monitorização)
# ===========================================
echo "📊 Configurando Axiom..."
echo "   Obtenha seu token em: https://app.axiom.co/settings/api-tokens"
read -p "   AXIOM_TOKEN (deixe vazio para pular): " AXIOM_TOKEN

if [ -n "$AXIOM_TOKEN" ]; then
    echo "$AXIOM_TOKEN" | vercel env add AXIOM_TOKEN production
    echo "tetecare" | vercel env add AXIOM_DATASET production
    echo "   ✅ Axiom configurado!"
else
    echo "   ⏭️ Axiom pulado"
fi

echo ""

# ===========================================
# INNGEST (Filas de Mensagens)
# ===========================================
echo "📬 Configurando Inngest..."
echo "   Obtenha suas chaves em: https://app.inngest.com"
read -p "   INNGEST_EVENT_KEY: " INNGEST_EVENT_KEY
read -p "   INNGEST_SIGNING_KEY: " INNGEST_SIGNING_KEY

if [ -n "$INNGEST_EVENT_KEY" ] && [ -n "$INNGEST_SIGNING_KEY" ]; then
    echo "$INNGEST_EVENT_KEY" | vercel env add INNGEST_EVENT_KEY production
    echo "$INNGEST_SIGNING_KEY" | vercel env add INNGEST_SIGNING_KEY production
    echo "   ✅ Inngest configurado!"
else
    echo "   ⏭️ Inngest pulado"
fi

echo ""

# ===========================================
# OPENAI (Inteligência Artificial)
# ===========================================
echo "🤖 Configurando OpenAI..."
echo "   Obtenha sua chave em: https://platform.openai.com/api-keys"
read -p "   OPENAI_API_KEY: " OPENAI_API_KEY

if [ -n "$OPENAI_API_KEY" ]; then
    echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production
    echo "   ✅ OpenAI configurado!"
else
    echo "   ⏭️ OpenAI pulado"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "Para verificar as variáveis configuradas:"
echo "   vercel env ls"
echo ""
echo "Para fazer deploy com as novas variáveis:"
echo "   vercel --prod"
