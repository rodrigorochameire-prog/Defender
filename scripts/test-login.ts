/**
 * Script para testar credenciais de login
 * Execute com: npx tsx scripts/test-login.ts
 */

import bcrypt from "bcryptjs";

const FALLBACK_USER = {
  email: "rodrigorochameire@gmail.com",
  passwordHash: "$2a$10$Hy9MfkPeH.PL75ttDLpOteoxyQRzQr4WhLXwCWdwsZI2ixoLsH1M6", // Defesa9dp*
  role: "admin",
  name: "Rodrigo Rocha Meire",
};

async function testLogin() {
  console.log("\n🔐 TESTE DE LOGIN - DEFENDER\n");
  console.log("━".repeat(50));

  const testPassword = "Defesa9dp*";
  const wrongPassword = "senhaerrada";

  console.log("\n📋 Credenciais Configuradas:\n");
  console.log(`   Email: ${FALLBACK_USER.email}`);
  console.log(`   Senha: ${testPassword}`);
  console.log(`   Role: ${FALLBACK_USER.role}`);
  console.log(`   Nome: ${FALLBACK_USER.name}`);

  console.log("\n━".repeat(50));
  console.log("\n✅ TESTE 1: Senha Correta\n");

  const isValidCorrect = await bcrypt.compare(testPassword, FALLBACK_USER.passwordHash);

  if (isValidCorrect) {
    console.log("   ✅ Login bem-sucedido!");
    console.log(`   👤 Usuário: ${FALLBACK_USER.name}`);
    console.log(`   🔑 Role: ${FALLBACK_USER.role}`);
    console.log(`   📧 Email: ${FALLBACK_USER.email}`);
  } else {
    console.log("   ❌ Falha no login - senha incorreta");
  }

  console.log("\n━".repeat(50));
  console.log("\n❌ TESTE 2: Senha Incorreta\n");

  const isValidWrong = await bcrypt.compare(wrongPassword, FALLBACK_USER.passwordHash);

  if (isValidWrong) {
    console.log("   ⚠️  ERRO: Senha incorreta foi aceita!");
  } else {
    console.log("   ✅ Senha incorreta rejeitada corretamente");
  }

  console.log("\n━".repeat(50));
  console.log("\n📝 RESUMO:\n");
  console.log(`   Status do Sistema: ${isValidCorrect && !isValidWrong ? "✅ FUNCIONANDO" : "❌ COM PROBLEMAS"}`);
  console.log(`   Autenticação: ${isValidCorrect ? "✅ OK" : "❌ FALHOU"}`);
  console.log(`   Segurança: ${!isValidWrong ? "✅ OK" : "❌ FALHOU"}`);

  console.log("\n━".repeat(50));
  console.log("\n💡 Como usar:\n");
  console.log("   1. Acesse: http://localhost:3000/login");
  console.log(`   2. Email: ${FALLBACK_USER.email}`);
  console.log(`   3. Senha: ${testPassword}`);
  console.log("   4. Clique em 'Entrar'");
  console.log("\n   ⚡ O login funcionará mesmo sem conexão com o banco!\n");

  console.log("━".repeat(50) + "\n");
}

testLogin();
