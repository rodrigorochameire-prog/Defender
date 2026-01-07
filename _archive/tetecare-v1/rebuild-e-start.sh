#!/bin/bash

# Script para rebuild e start do projeto
# Execute: bash rebuild-e-start.sh

echo "🔨 Rebuild do projeto..."
pnpm build

if [ $? -eq 0 ]; then
  echo "✅ Build concluído com sucesso!"
  echo ""
  echo "🚀 Iniciando servidor..."
  pnpm start
else
  echo "❌ Build falhou. Verifique os erros acima."
  exit 1
fi


