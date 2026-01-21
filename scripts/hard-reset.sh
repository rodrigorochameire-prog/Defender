#!/bin/bash

# Script para Reset Completo (quando nada funciona)
# Remove tudo e reconstrói do zero

echo "💥 HARD RESET - Removendo tudo e reconstruindo..."
echo ""
echo "⚠️  ATENÇÃO: Isso vai demorar alguns minutos!"
echo ""
read -p "Continuar? (s/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "Cancelado."
  exit 1
fi

# 1. Parar processos
echo "📛 Parando processos..."
pkill -f "next dev" 2>/dev/null
pkill -f "node" 2>/dev/null
sleep 2

# 2. Limpar tudo
echo "🧹 Removendo caches e builds..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 3. Reinstalar dependências (opcional - comentado por padrão)
# echo "📦 Reinstalando dependências..."
# rm -rf node_modules
# npm install
# ou: pnpm install

echo ""
echo "✅ Reset completo!"
echo ""
echo "Execute agora:"
echo "  npm run dev"
echo "  ou"
echo "  pnpm dev"
echo ""
