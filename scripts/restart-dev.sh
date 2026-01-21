#!/bin/bash

# Script para Reiniciar o Servidor de Desenvolvimento
# Limpa cache e reinicia o Next.js

echo "🔄 Reiniciando servidor de desenvolvimento..."
echo ""

# 1. Encontrar e matar processos Next.js
echo "📛 Parando processos Node/Next.js..."
pkill -f "next dev" 2>/dev/null || echo "   Nenhum processo rodando"
sleep 1

# 2. Limpar cache do Next.js
echo "🧹 Limpando cache..."
rm -rf .next
echo "   ✅ Cache .next removido"

# 3. Limpar cache do npm/pnpm (opcional)
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "   ✅ Cache node_modules removido"
fi

echo ""
echo "✨ Pronto para reiniciar!"
echo ""
echo "Execute agora:"
echo "  npm run dev"
echo "  ou"
echo "  pnpm dev"
echo ""
echo "Depois, recarregue o navegador com Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)"
echo ""
