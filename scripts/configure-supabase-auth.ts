/**
 * Script para configurar as URLs de autenticação no Supabase
 * 
 * Uso:
 * npx tsx scripts/configure-supabase-auth.ts
 * 
 * Requer:
 * - SUPABASE_PROJECT_REF (ID do projeto, ex: siwapjqndevuwsluncnr)
 * - SUPABASE_ACCESS_TOKEN (Token de acesso da dashboard, Settings > Access Tokens)
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "hxfvlaeqhkmelvyzgfqp";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const SITE_URL = "https://ombuds.vercel.app";
const REDIRECT_URLS = [
  "https://ombuds.vercel.app/**",
  "https://ombuds.vercel.app/reset-password",
  "https://defesahub.vercel.app/**",
  "https://defesahub.vercel.app/reset-password",
  "https://*.vercel.app/**",
  "http://localhost:3000/**",
  "http://localhost:3000/reset-password",
];

async function configureSupabaseAuth() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error("❌ SUPABASE_ACCESS_TOKEN não configurado!");
    console.log("\n📋 Para obter o token:");
    console.log("1. Acesse https://supabase.com/dashboard/account/tokens");
    console.log("2. Clique em 'Generate new token'");
    console.log("3. Copie o token e execute:");
    console.log(`   SUPABASE_ACCESS_TOKEN=seu_token npx tsx scripts/configure-supabase-auth.ts`);
    process.exit(1);
  }

  console.log("🔧 Configurando Supabase Auth...\n");

  try {
    // Buscar configuração atual
    const getResponse = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!getResponse.ok) {
      const error = await getResponse.text();
      throw new Error(`Erro ao buscar config: ${getResponse.status} - ${error}`);
    }

    const currentConfig = await getResponse.json();
    console.log("📖 Configuração atual:");
    console.log(`   Site URL: ${currentConfig.site_url || "(não configurado)"}`);
    console.log(`   Redirect URLs: ${currentConfig.uri_allow_list || "(não configurado)"}`);
    console.log();

    // Atualizar configuração
    const updateResponse = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_url: SITE_URL,
          uri_allow_list: REDIRECT_URLS.join(","),
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Erro ao atualizar config: ${updateResponse.status} - ${error}`);
    }

    const updatedConfig = await updateResponse.json();
    
    console.log("✅ Configuração atualizada com sucesso!\n");
    console.log("📝 Nova configuração:");
    console.log(`   Site URL: ${updatedConfig.site_url}`);
    console.log(`   Redirect URLs:`);
    REDIRECT_URLS.forEach(url => console.log(`     - ${url}`));
    console.log();
    console.log("🎉 Pronto! Agora a recuperação de senha deve funcionar corretamente.");
    
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

// Executar
configureSupabaseAuth();
