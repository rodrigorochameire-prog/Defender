#!/usr/bin/env node
/**
 * Script para buscar todas as credenciais do Supabase via API
 * Usa as ferramentas MCP para obter as chaves necessárias
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = 'hxfvlaeqhkmelvyzgfqp';

async function getSupabaseCredentials() {
  console.log('🔍 Buscando credenciais do Supabase...\n');

  try {
    // Buscar a URL do projeto
    const apiUrl = 'https://hxfvlaeqhkmelvyzgfqp.supabase.co';
    console.log('✅ URL do projeto:', apiUrl);

    // Buscar chaves de API via endpoint público
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_ID}/api-keys`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || ''}`,
        },
      }
    );

    if (!response.ok) {
      console.log('⚠️  Não foi possível buscar as chaves via API.');
      console.log('   Você precisará buscá-las manualmente no Dashboard.\n');
      return null;
    }

    const keys = await response.json();
    
    // Encontrar as chaves específicas
    const anonKey = keys.find(k => k.name === 'anon')?.api_key;
    const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;

    console.log('✅ Chave ANON encontrada');
    console.log('✅ Chave SERVICE_ROLE encontrada\n');

    return {
      url: apiUrl,
      anonKey,
      serviceKey,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar credenciais:', error.message);
    return null;
  }
}

async function updateEnvFile(credentials) {
  const envPath = join(process.cwd(), '.env.local');
  
  try {
    // Ler o .env.local existente
    let envContent = readFileSync(envPath, 'utf-8');

    // Atualizar as variáveis
    if (credentials.anonKey) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY="${credentials.anonKey}"`
      );
    }

    if (credentials.serviceKey) {
      envContent = envContent.replace(
        /SUPABASE_SERVICE_ROLE_KEY=.*/,
        `SUPABASE_SERVICE_ROLE_KEY="${credentials.serviceKey}"`
      );
    }

    // Salvar o arquivo atualizado
    writeFileSync(envPath, envContent, 'utf-8');
    console.log('✅ Arquivo .env.local atualizado com sucesso!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar .env.local:', error.message);
    return false;
  }
}

// Executar
const credentials = await getSupabaseCredentials();

if (credentials) {
  await updateEnvFile(credentials);
  
  console.log('📋 Próximos passos:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database');
  console.log('   2. Copie a senha do banco de dados');
  console.log('   3. Substitua [SUA_SENHA] na variável DATABASE_URL no arquivo .env.local');
  console.log('   4. Reinicie o servidor de desenvolvimento (npm run dev)\n');
} else {
  console.log('\n📋 Busque as credenciais manualmente:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/api');
  console.log('   2. Copie a chave "anon public" para NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   3. Copie a chave "service_role secret" para SUPABASE_SERVICE_ROLE_KEY');
  console.log('   4. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database');
  console.log('   5. Copie a senha e atualize DATABASE_URL\n');
}
