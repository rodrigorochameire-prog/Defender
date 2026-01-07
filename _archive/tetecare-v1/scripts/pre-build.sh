#!/bin/bash
# Script pré-build para Vercel
# Prepara o ambiente para o build

echo "🔧 Preparando ambiente de build..."

# Garante que o diretório api existe
mkdir -p api

# Remove qualquer diretório .vercel/output que possa existir (para evitar conflitos)
if [ -d ".vercel/output" ]; then
  echo "⚠️  Removendo .vercel/output existente..."
  rm -rf .vercel/output
fi

echo "✅ Ambiente preparado."
