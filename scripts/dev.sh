#!/bin/bash
# ============================================
# Dev Server — Defender
# Mata processos antigos, limpa cache, inicia com mais memória
# Uso: ./scripts/dev.sh
# ============================================

set -e

PORT=3000
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 Parando processos na porta $PORT..."
kill -9 $(lsof -ti :$PORT) 2>/dev/null || true
sleep 1

echo "🧹 Limpando cache..."
rm -rf "$PROJECT_DIR/.next/cache"

echo "🚀 Iniciando dev server (4GB heap)..."
cd "$PROJECT_DIR"
NODE_OPTIONS="--max-old-space-size=4096" node node_modules/next/dist/bin/next dev --port $PORT
