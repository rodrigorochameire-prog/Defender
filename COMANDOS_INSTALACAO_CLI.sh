#!/bin/bash
# Script para instalar Supabase CLI no macOS

echo "🚀 Instalando Supabase CLI..."

# Verificar se Homebrew está instalado
if command -v brew &> /dev/null; then
    echo "✅ Homebrew encontrado. Instalando via Homebrew..."
    brew install supabase/tap/supabase
elif command -v npm &> /dev/null; then
    echo "✅ npm encontrado. Instalando via npm..."
    npm install -g supabase
else
    echo "❌ Homebrew e npm não encontrados."
    echo ""
    echo "📋 OPÇÕES DE INSTALAÇÃO:"
    echo ""
    echo "1. Instalar Homebrew primeiro:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo "2. Depois instalar Supabase CLI:"
    echo "   brew install supabase/tap/supabase"
    echo ""
    echo "OU"
    echo ""
    echo "3. Instalar Node.js (que inclui npm):"
    echo "   Baixe em: https://nodejs.org/"
    echo ""
    echo "4. Depois instalar Supabase CLI:"
    echo "   npm install -g supabase"
    echo ""
    exit 1
fi

# Verificar instalação
if command -v supabase &> /dev/null; then
    echo ""
    echo "✅ Supabase CLI instalado com sucesso!"
    echo ""
    supabase --version
    echo ""
    echo "📝 PRÓXIMOS PASSOS:"
    echo "1. Login: supabase login"
    echo "2. Linkar projeto: supabase link --project-ref siwapjqndevuwsluncnr"
    echo "3. Executar script: supabase db execute -f SQL_RLS_FINAL_COMPLETO.sql"
else
    echo "❌ Erro na instalação. Verifique as mensagens acima."
    exit 1
fi


