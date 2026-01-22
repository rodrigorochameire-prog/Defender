#!/bin/bash

# Script para adicionar AUTH_SECRET ao .env.local

cd ~/Projetos/Defender

# Gerar secret aleatório seguro
AUTH_SECRET=$(openssl rand -base64 32)

# Adicionar ao .env.local
echo "" >> .env.local
echo "# Autenticação JWT" >> .env.local
echo "AUTH_SECRET=$AUTH_SECRET" >> .env.local

echo "✅ AUTH_SECRET adicionado ao .env.local"
echo ""
echo "Agora execute:"
echo "  npm run dev"
echo ""
echo "E acesse: http://localhost:3000/login"
