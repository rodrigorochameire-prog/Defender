#!/bin/bash

# Script para sincronizar com GitHub
# Executa os próximos passos: status, add, commit e push

set -e

echo "🔄 Verificando status do repositório..."
git status

echo ""
echo "📦 Adicionando arquivos novos/modificados..."
git add .

echo ""
echo "📝 Verificando o que será commitado..."
git status

echo ""
echo "💾 Fazendo commit das mudanças..."
git commit -m "docs: adiciona guia de conexão com GitHub e script de sincronização" || echo "Nenhuma mudança para commitar"

echo ""
echo "📤 Verificando se há commits para enviar..."
LOCAL=$(git rev-list @{u}..HEAD 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOCAL" -gt 0 ]; then
    echo "Enviando $LOCAL commit(s) para o GitHub..."
    git push origin main
    echo "✅ Push concluído com sucesso!"
else
    echo "✅ Nenhum commit local para enviar"
fi

echo ""
echo "📥 Verificando se há atualizações no GitHub..."
git fetch origin
REMOTE=$(git rev-list HEAD..@{u} 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMOTE" -gt 0 ]; then
    echo "⚠️  Há $REMOTE commit(s) no GitHub que não estão no repositório local"
    echo "Execute 'git pull origin main' para baixar as atualizações"
else
    echo "✅ Repositório local está atualizado"
fi

echo ""
echo "✨ Sincronização concluída!"
