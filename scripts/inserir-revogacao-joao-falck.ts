/**
 * Insere o processo 8011095-45.2026.8.05.0039 (pedido de revogação de prisão)
 * vinculado à AP 8000166-50.2026.8.05.0039 do João Batista Souza Falck Junior.
 *
 * Cria também a demanda correspondente e um registro tipo 'elaboracao'
 * apontando para a peça protocolada.
 *
 * Execute com: npx tsx scripts/inserir-revogacao-joao-falck.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL ausente.");
  process.exit(1);
}

const NOVO_NUMERO = "8011095-45.2026.8.05.0039";
const AP_NUMERO = "8000166-50.2026.8.05.0039";
const ASSISTIDO_NOME = "João Batista Souza Falck Junior";
const ASSISTIDO_CPF = "084.555.845-56";
const DEFENSOR_ID = 1; // Rodrigo

const PECA_TITULO = "Pedido de revogação da prisão preventiva";
const PECA_LINK = "https://drive.google.com/...Pedido de Revogação - João Batista Souza Falck Junior.pdf";

async function main() {
  const sql = postgres(DATABASE_URL!, { ssl: "require", connect_timeout: 10 });
  try {
    console.log("==> Buscando AP existente e assistido");
    const apRows = await sql<
      { id: number; assistido_id: number; comarca: string | null; area: string; defensor_id: number | null; caso_id: number | null }[]
    >`
      SELECT id, assistido_id, comarca, area, defensor_id, caso_id
      FROM processos
      WHERE numero_autos = ${AP_NUMERO}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (apRows.length === 0) {
      console.error(`AP ${AP_NUMERO} não encontrada. Cancele e cadastre a AP antes.`);
      return;
    }

    const ap = apRows[0];
    console.log(`   AP id=${ap.id}, assistido_id=${ap.assistido_id}, area=${ap.area}, comarca=${ap.comarca ?? "(null)"}`);

    const assistido = await sql<{ id: number; nome: string; cpf: string | null }[]>`
      SELECT id, nome, cpf
      FROM assistidos
      WHERE id = ${ap.assistido_id}
      LIMIT 1
    `;
    if (assistido.length === 0) {
      console.error("Assistido não encontrado pelo assistido_id da AP.");
      return;
    }
    console.log(`   Assistido id=${assistido[0].id}, nome=${assistido[0].nome}, cpf=${assistido[0].cpf ?? "(sem cpf)"}`);

    console.log("\n==> Verificando se o processo de revogação já existe");
    const existe = await sql<{ id: number }[]>`
      SELECT id FROM processos
      WHERE numero_autos = ${NOVO_NUMERO} AND deleted_at IS NULL
      LIMIT 1
    `;
    let novoProcessoId: number;
    if (existe.length > 0) {
      novoProcessoId = existe[0].id;
      console.log(`   Já existia: id=${novoProcessoId}. Atualizando vínculo.`);
      await sql`
        UPDATE processos
        SET processo_origem_id = ${ap.id},
            tipo_processo = 'REVOGACAO',
            assistido_id = ${ap.assistido_id},
            defensor_id = COALESCE(defensor_id, ${DEFENSOR_ID}),
            comarca = COALESCE(comarca, ${ap.comarca}),
            area = ${ap.area},
            caso_id = COALESCE(caso_id, ${ap.caso_id}),
            updated_at = NOW()
        WHERE id = ${novoProcessoId}
      `;
    } else {
      const ins = await sql<{ id: number }[]>`
        INSERT INTO processos (
          assistido_id, numero_autos, comarca, vara, area,
          classe_processual, assunto, situacao, tipo_processo,
          processo_origem_id, defensor_id, caso_id,
          observacoes, created_at, updated_at
        ) VALUES (
          ${ap.assistido_id},
          ${NOVO_NUMERO},
          ${ap.comarca ?? "Camaçari"},
          ${"Vara de Violência Doméstica e Familiar contra a Mulher"},
          ${ap.area},
          ${"PEDIDO DE REVOGAÇÃO DE PRISÃO"},
          ${"Pedido de revogação da prisão preventiva (autos apartados, vinculados à AP 8000166-50.2026.8.05.0039)"},
          ${"ativo"},
          ${"REVOGACAO"},
          ${ap.id},
          ${DEFENSOR_ID},
          ${ap.caso_id},
          ${"Distribuído em 29/04/2026. Autos apartados associados à ação penal AP 8000166-50.2026.8.05.0039."},
          NOW(), NOW()
        )
        RETURNING id
      `;
      novoProcessoId = ins[0].id;
      console.log(`   Criado processo id=${novoProcessoId} vinculado à AP id=${ap.id} via processo_origem_id.`);
    }

    console.log("\n==> Criando demanda correspondente");
    const demandaExistente = await sql<{ id: number }[]>`
      SELECT id FROM demandas
      WHERE processo_id = ${novoProcessoId}
        AND ato = ${PECA_TITULO}
        AND deleted_at IS NULL
      LIMIT 1
    `;
    let demandaId: number;
    if (demandaExistente.length > 0) {
      demandaId = demandaExistente[0].id;
      console.log(`   Demanda já existia: id=${demandaId}`);
    } else {
      const insDem = await sql<{ id: number }[]>`
        INSERT INTO demandas (
          processo_id, assistido_id, ato, tipo_ato,
          status, prioridade, defensor_id,
          providencias,
          created_at, updated_at
        ) VALUES (
          ${novoProcessoId},
          ${ap.assistido_id},
          ${PECA_TITULO},
          ${"PETICAO"},
          ${"7_PROTOCOLADO"},
          ${"ALTA"},
          ${DEFENSOR_ID},
          ${"Pedido protocolado em 29/04/2026 — distribuído sob o nº " + NOVO_NUMERO + ". Tese principal: insubsistência dos fundamentos. Subsidiariamente: comparecimento periódico em juízo + manutenção das MPUs + deprecação ao juízo de Salvador. Última hipótese: monitoração eletrônica."},
          NOW(), NOW()
        )
        RETURNING id
      `;
      demandaId = insDem[0].id;
      console.log(`   Demanda criada: id=${demandaId}`);
    }

    console.log("\n==> Verificando tabela 'registros' (branch feat/registros-tipados)");
    const tabelaRegistros = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name='registros'
    `;
    if (tabelaRegistros.length === 0) {
      console.log("   Tabela 'registros' não existe ainda no banco — pulando criação do registro tipado.");
      console.log("   (A branch feat/registros-tipados ainda não foi aplicada via db:push em prod.)");
    } else {
      const regExistente = await sql<{ id: number }[]>`
        SELECT id FROM registros
        WHERE demanda_id = ${demandaId} AND tipo='elaboracao'
        LIMIT 1
      `;
      if (regExistente.length > 0) {
        console.log(`   Registro 'elaboracao' já existia: id=${regExistente[0].id}`);
      } else {
        const insReg = await sql<{ id: number }[]>`
          INSERT INTO registros (
            assistido_id, processo_id, demanda_id,
            data_registro, tipo, titulo, conteudo,
            status, interlocutor, autor_id,
            created_at, updated_at
          ) VALUES (
            ${ap.assistido_id},
            ${novoProcessoId},
            ${demandaId},
            NOW(),
            ${"elaboracao"},
            ${PECA_TITULO},
            ${"Peça elaborada e protocolada em 29/04/2026 (autos " + NOVO_NUMERO + "). Vide Drive: " + PECA_LINK},
            ${"realizado"},
            ${"juizo"},
            ${DEFENSOR_ID},
            NOW(), NOW()
          )
          RETURNING id
        `;
        console.log(`   Registro criado: id=${insReg[0].id}`);
      }
    }

    console.log("\n==> Resumo final");
    const resumo = await sql<any[]>`
      SELECT
        p.id, p.numero_autos, p.tipo_processo, p.processo_origem_id,
        po.numero_autos AS origem_numero
      FROM processos p
      LEFT JOIN processos po ON po.id = p.processo_origem_id
      WHERE p.numero_autos IN (${AP_NUMERO}, ${NOVO_NUMERO})
      ORDER BY p.id
    `;
    console.table(resumo);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
