#!/bin/bash
# Script pré-build para Vercel
# Remove lockfiles de outros gerenciadores para forçar uso de npm

echo "🔧 Removendo lockfiles de outros gerenciadores..."
rm -f pnpm-lock.yaml
rm -f yarn.lock
echo "✅ Lockfiles removidos. Usando npm..."
