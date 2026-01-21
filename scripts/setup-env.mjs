#!/usr/bin/env node
/**
 * Script interativo para configurar variáveis de ambiente do Supabase
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PROJECT_ID = 'hxfvlaeqhkmelvyzgfqp';
const ENV_FILE = join(process.cwd(), '.env.local');

console.log('🚀 Configurador de Ambiente - DefensorHub\n');
console.log('═'.repeat(60));

// Função para abrir URL no navegador
async function openBrowser(url) {
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  
  try {
    await execAsync(`${command} "${url}"`);
    return true;
  } catch (error) {
    return false;
  }
}

// Função para aguardar input do usuário
async function waitForInput(message) {
  process.stdout.write(message);
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function main() {
  console.log('\n📋 Credenciais já configuradas:');
  console.log('   ✅ NEXT_PUBLIC_SUPABASE_URL');
  console.log('   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   ✅ CLERK_PUBLISHABLE_KEY');
  console.log('   ✅ CLERK_SECRET_KEY\n');

  console.log('⚠️  Faltam configurar:');
  console.log('   ❌ DATABASE_URL (senha do banco)');
  console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY\n');

  console.log('═'.repeat(60));
  console.log('\n🔐 PASSO 1: SERVICE_ROLE_KEY\n');
  
  const apiUrl = `https://supabase.com/dashboard/project/${PROJECT_ID}/settings/api`;
  console.log(`📂 Abrindo: ${apiUrl}\n`);
  
  await openBrowser(apiUrl);
  
  console.log('👉 No dashboard do Supabase:');
  console.log('   1. Procure por "Project API keys"');
  console.log('   2. Encontre a chave "service_role" (com ícone de cadeado)');
  console.log('   3. Clique em "Copy" ou revele e copie a chave\n');
  
  const serviceKey = await waitForInput('Cole a SERVICE_ROLE_KEY aqui e pressione Enter: ');
  
  if (!serviceKey || serviceKey === '[SUA_SERVICE_ROLE_KEY]') {
    console.log('❌ Chave inválida. Abortando...\n');
    process.exit(1);
  }

  console.log('\n═'.repeat(60));
  console.log('\n🔐 PASSO 2: SENHA DO BANCO DE DADOS\n');
  
  const dbUrl = `https://supabase.com/dashboard/project/${PROJECT_ID}/settings/database`;
  console.log(`📂 Abrindo: ${dbUrl}\n`);
  
  await openBrowser(dbUrl);
  
  console.log('👉 No dashboard do Supabase:');
  console.log('   1. Procure por "Database Settings"');
  console.log('   2. Em "Connection string", encontre a senha');
  console.log('   3. Copie APENAS a senha (sem o restante da URL)\n');
  
  const dbPassword = await waitForInput('Cole a SENHA do banco aqui e pressione Enter: ');
  
  if (!dbPassword || dbPassword === '[SUA_SENHA]') {
    console.log('❌ Senha inválida. Abortando...\n');
    process.exit(1);
  }

  console.log('\n═'.repeat(60));
  console.log('\n💾 Atualizando .env.local...\n');

  try {
    let envContent = readFileSync(ENV_FILE, 'utf-8');
    
    // Atualizar SERVICE_ROLE_KEY
    envContent = envContent.replace(
      /SUPABASE_SERVICE_ROLE_KEY=.*/,
      `SUPABASE_SERVICE_ROLE_KEY="${serviceKey}"`
    );
    
    // Atualizar DATABASE_URL
    envContent = envContent.replace(
      /DATABASE_URL="postgresql:\/\/postgres:\[SUA_SENHA\]@/,
      `DATABASE_URL="postgresql://postgres:${dbPassword}@`
    );
    
    writeFileSync(ENV_FILE, envContent, 'utf-8');
    
    console.log('✅ Arquivo .env.local atualizado com sucesso!\n');
    console.log('═'.repeat(60));
    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!\n');
    console.log('📋 Próximos passos:');
    console.log('   1. Feche o servidor de desenvolvimento se estiver rodando');
    console.log('   2. Execute: npm run dev');
    console.log('   3. Acesse: http://localhost:3000\n');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar .env.local:', error.message);
    process.exit(1);
  }
}

// Configurar stdin
process.stdin.setEncoding('utf-8');

// Executar
main().catch((error) => {
  console.error('❌ Erro:', error.message);
  process.exit(1);
});
