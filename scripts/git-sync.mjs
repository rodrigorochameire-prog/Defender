#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

function execGit(command) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout?.toString() || '' };
  }
}

console.log('🔄 Verificando status do repositório Git...\n');

// 1. Verificar status
console.log('1️⃣ Verificando status...');
const status = execGit('git status --short');
if (status.success) {
  if (status.output) {
    console.log('📝 Arquivos modificados/novos encontrados:');
    console.log(status.output);
  } else {
    console.log('✅ Nenhuma mudança pendente');
  }
} else {
  console.log('⚠️  Erro ao verificar status:', status.error);
}

// 2. Verificar branch atual
console.log('\n2️⃣ Verificando branch atual...');
const branch = execGit('git branch --show-current');
if (branch.success) {
  console.log(`📍 Branch atual: ${branch.output}`);
} else {
  console.log('⚠️  Erro ao verificar branch:', branch.error);
}

// 3. Verificar remote
console.log('\n3️⃣ Verificando conexão com GitHub...');
const remote = execGit('git remote -v');
if (remote.success) {
  console.log('🔗 Remotes configurados:');
  console.log(remote.output);
} else {
  console.log('⚠️  Erro ao verificar remotes:', remote.error);
}

// 4. Verificar se há commits não enviados
console.log('\n4️⃣ Verificando commits locais não enviados...');
const ahead = execGit('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0');
if (ahead.success && parseInt(ahead.output) > 0) {
  console.log(`📤 ${ahead.output} commit(s) local(is) não enviado(s) para o GitHub`);
} else {
  console.log('✅ Todos os commits locais estão sincronizados');
}

// 5. Verificar se há atualizações no GitHub
console.log('\n5️⃣ Verificando atualizações no GitHub...');
const fetch = execGit('git fetch origin --dry-run 2>&1');
if (fetch.success) {
  const behind = execGit('git rev-list --count HEAD..@{u} 2>/dev/null || echo 0');
  if (behind.success && parseInt(behind.output) > 0) {
    console.log(`📥 ${behind.output} commit(s) disponível(is) no GitHub`);
  } else {
    console.log('✅ Repositório local está atualizado');
  }
} else {
  console.log('⚠️  Não foi possível verificar atualizações:', fetch.error);
}

// 6. Mostrar últimos commits
console.log('\n6️⃣ Últimos 5 commits:');
const log = execGit('git log --oneline -5');
if (log.success) {
  console.log(log.output);
} else {
  console.log('⚠️  Erro ao verificar histórico:', log.error);
}

console.log('\n✨ Verificação concluída!\n');

// Sugestões
console.log('💡 Próximos passos sugeridos:');
console.log('   • Para adicionar mudanças: git add .');
console.log('   • Para fazer commit: git commit -m "Sua mensagem"');
console.log('   • Para enviar ao GitHub: git push origin main');
console.log('   • Para baixar atualizações: git pull origin main');
