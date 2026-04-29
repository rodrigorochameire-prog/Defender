/**
 * Vincula AP 8000166 e Revogação 8011095 via casos.id compartilhado.
 * Cria caso se ainda não existir.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", connect_timeout: 10 });

async function main() {
  try {
    const ap = await sql<{ id: number; assistido_id: number; caso_id: number | null; defensor_id: number | null }[]>`
      SELECT id, assistido_id, caso_id, defensor_id
      FROM processos WHERE numero_autos = '8000166-50.2026.8.05.0039' LIMIT 1
    `;
    const rev = await sql<{ id: number; assistido_id: number; caso_id: number | null }[]>`
      SELECT id, assistido_id, caso_id
      FROM processos WHERE numero_autos = '8011095-45.2026.8.05.0039' LIMIT 1
    `;
    if (!ap[0] || !rev[0]) throw new Error("Processos não encontrados");

    let casoId = ap[0].caso_id ?? rev[0].caso_id;

    if (!casoId) {
      console.log("==> Criando caso");
      const caso = await sql<{ id: number }[]>`
        INSERT INTO casos (titulo, atribuicao, assistido_id, defensor_id, status, created_at, updated_at)
        VALUES (
          'Joao Batista Souza Falck Junior — VVD (AP + Revogação)',
          'VVD_CAMACARI',
          ${ap[0].assistido_id},
          ${ap[0].defensor_id},
          'ativo',
          NOW(), NOW()
        )
        RETURNING id
      `;
      casoId = caso[0].id;
      console.log(`   Caso criado id=${casoId}`);
    } else {
      console.log(`==> Reusando caso id=${casoId}`);
    }

    await sql`UPDATE processos SET caso_id = ${casoId}, updated_at = NOW() WHERE id IN (${ap[0].id}, ${rev[0].id})`;
    console.log("==> Atualizado caso_id em ambos os processos");

    const final = await sql<any[]>`
      SELECT id, numero_autos, tipo_processo, caso_id, processo_origem_id
      FROM processos
      WHERE numero_autos IN ('8000166-50.2026.8.05.0039','8011095-45.2026.8.05.0039')
      ORDER BY id
    `;
    console.table(final);
  } finally {
    await sql.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
