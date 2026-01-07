#!/bin/bash

# Script seguro para aplicar migrações
# Usa o check-and-migrate.ts ao invés de drizzle-kit migrate diretamente

echo "🔧 Migração Segura - TucoCare Pro"
echo "================================="
echo ""

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Por favor, crie o arquivo .env com as variáveis necessárias."
    exit 1
fi

# Gerar novas migrações apenas se houver mudanças no schema
echo "📝 Gerando migrações (se necessário)..."
npx drizzle-kit generate --config=drizzle.config.ts 2>&1 | grep -v "Duplicate column"

# Usar o script personalizado para aplicar migrações
echo ""
echo "🚀 Aplicando migrações com verificações de segurança..."
npx tsx scripts/check-and-migrate.ts

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Processo de migração concluído com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "  1. npm run build  - Construir o projeto"
    echo "  2. npm start      - Iniciar o servidor"
else
    echo ""
    echo "❌ Falha no processo de migração."
    echo "   Por favor, verifique os logs acima para mais detalhes."
fi

exit $exit_code
