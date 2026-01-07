#!/bin/bash
# Script para executar SQL via psql

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ Arquivo .env.local não encontrado!"
    echo "Por favor, crie o arquivo .env.local com a variável DATABASE_URL"
    exit 1
fi

# Ler DATABASE_URL do .env.local
DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não encontrado no .env.local"
    exit 1
fi

echo "🔗 Conectando ao banco de dados..."
echo "📄 Executando SQL_RLS_FINAL_COMPLETO.sql..."

# Executar script SQL
psql "$DATABASE_URL" -f SQL_RLS_FINAL_COMPLETO.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Script executado com sucesso!"
    echo ""
    echo "📋 Valide as políticas criadas executando:"
    echo "psql \"$DATABASE_URL\" -c \"SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';\""
else
    echo ""
    echo "❌ Erro ao executar script"
    echo "Verifique as mensagens acima para mais detalhes"
    exit 1
fi


