/**
 * Script para listar usuários admin via Supabase API
 * Execute com: node scripts/list-admins-api.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = "https://siwapjqndevuwsluncnr.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY não definida");
  process.exit(1);
}

async function listAdmins() {
  console.log("\n📋 Listando Administradores\n");

  try {
    // Buscar todos os usuários
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const users = await response.json();

    // Filtrar admins
    const admins = users.filter((u) => u.role === "admin");

    if (admins.length === 0) {
      console.log("❌ Nenhum administrador cadastrado");
    } else {
      console.log(`✅ ${admins.length} administrador(es) encontrado(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Status: ${admin.approval_status}`);
        console.log(`   Verificado: ${admin.email_verified ? "Sim" : "Não"}`);
        console.log(`   Criado em: ${admin.created_at}`);
        console.log("");
      });
    }

    // Verificar emails específicos
    console.log("\n🔍 Verificando emails específicos:\n");

    const emailsToCheck = [
      "jeronimo.fabio@gmail.com",
      "rodrigorochameire@gmail.com",
    ];

    for (const email of emailsToCheck) {
      const user = users.find(
        (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
      );

      if (user) {
        console.log(`✅ ${email}`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   É admin: ${user.role === "admin" ? "SIM ✓" : "NÃO"}`);
        console.log("");
      } else {
        console.log(`❌ ${email} - Não encontrado no sistema\n`);
      }
    }

    // Listar todos os usuários
    console.log("\n📋 Todos os usuários no sistema:\n");
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });
  } catch (error) {
    console.error("❌ Erro ao listar admins:", error);
  }
}

listAdmins();
