#!/usr/bin/env node
// Popula os 4 atendimentos SOLAR de 12/06/2026 (9ª DP Camaçari, Dr. Rodrigo).
// Idempotente: pula registros cujo numero_solar já existe; cria/completa
// assistidos pelo CPF/nome antes de inserir.
//
// Uso: node scripts/popular-atendimentos-12jun2026.mjs
// Requer DATABASE_URL (lido de .env.local).

import { Client } from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });

const AUTOR_ID = 1; // Rodrigo Rocha Meire
const LOCAL = "9ª Defensoria Pública de Camaçari";

// Horários em America/Bahia (UTC-3) gravados como instante UTC,
// convenção vigente da coluna registros.data_registro.
const bahia = (hhmm) => new Date(`2026-06-12T${hhmm}:00-03:00`);

const ATENDIMENTOS = [
  {
    numeroSolar: "260608.003.087",
    hora: "10:00",
    subtipo: "inicial",
    assistido: {
      nome: "Roberto Cordeiro Gomes",
      cpf: "001.311.265-12",
      dataNascimento: "1980-09-15",
    },
    assunto:
      "Usa tornozeleira eletrônica e está impedido de sair de Camaçari; trabalha em Dias d'Ávila e pede autorização para ir trabalhar (e assinar) fora da comarca.",
    anotacoesRecepcao:
      "Assistido usa tornozeleira eletrônica e não pode sair de Camaçari; trabalha em Dias d'Ávila como prestador de serviço e precisa ir assinar, estando impedido pela condição; veio pedir autorização para ir trabalhar em Dias d'Ávila.",
    historicoSolar: [
      {
        data: "08/06/2026",
        texto:
          "Agendamento (recepção): pedido de orientação sobre autorização para trabalhar em Dias d'Ávila com tornozeleira eletrônica.",
      },
    ],
    processosCitados: [{ cnj: "8008640-10.2026.8.05.0039", origem: "anotacao" }],
  },
  {
    numeroSolar: "260608.003.220",
    hora: "10:50",
    subtipo: "inicial",
    assistido: {
      nome: "André Roque Aragão",
      cpf: "860.552.465-03",
      dataNascimento: "1982-06-18",
    },
    assunto:
      "Possui medida protetiva; precisa passar em frente à casa da ex-companheira para ir ao trabalho. Busca orientações sobre o processo.",
    anotacoesRecepcao:
      "Assistido possui medida protetiva; relata que precisa passar em frente à casa da ex-companheira para ir ao trabalho; alega que ela tem problemas psicológicos e usa medicação controlada; busca orientações sobre o processo.",
    historicoSolar: [
      {
        data: "08/06/2026",
        texto:
          "Agendamento (recepção): orientação sobre medida protetiva e trajeto para o trabalho.",
      },
    ],
    processosCitados: [{ cnj: "8000634-14.2026.8.05.0039", origem: "anotacao" }],
  },
  {
    numeroSolar: "260609.002.857",
    hora: "11:40",
    subtipo: "inicial",
    assistido: {
      nome: "Luan Marlon Ribeiro dos Santos",
      cpf: "083.154.995-56",
      dataNascimento: "1999-02-26",
    },
    assunto:
      "Mãe do assistido busca orientação sobre o processo do filho: ele 'assina' e está internado em centro terapêutico após um surto.",
    anotacoesRecepcao:
      "A mãe do assistido compareceu para orientação sobre o processo do filho; informa que ele \"assina\", está internado em centro terapêutico após um surto, e busca orientações de como agir.",
    historicoSolar: [
      {
        data: "09/06/2026",
        texto:
          "Agendamento (recepção): mãe comparece — filho internado em centro terapêutico após surto; orientação sobre o processo.",
      },
    ],
    processosCitados: [{ cnj: "8099430-91.2025.8.05.0001", origem: "anotacao" }],
    interlocutor: "familiar",
  },
  {
    numeroSolar: "260610.002.780",
    hora: "12:30",
    subtipo: "retorno",
    assistido: {
      nome: "João Victor Moura Ramos",
      cpf: "104.426.145-51",
      dataNascimento: "2000-12-05",
    },
    assunto:
      "Entrega de documentos de comparecimento ao CAPS (mãe do assistido). Ação penal do Júri — contexto de esquizofrenia, laudo de inimputabilidade total nos autos.",
    anotacoesRecepcao:
      "A mãe do assistido foi agendada para entrega de documentos de comparecimento ao CAPS do seu filho. Nº 8005316-46.2025.8.05.0039",
    historicoSolar: [
      {
        data: "10/06/2026",
        texto:
          "Agendamento (recepção): entrega de documentos de comparecimento ao CAPS.",
      },
      {
        data: "10/04/2026",
        numero: "260410.001.613",
        texto:
          "Atendimento inicial: assistido e genitora atendidos; audiência em 14/04 com Dra. Juliane; prisão revogada, internação provisória e posterior alta; contexto de esquizofrenia; laudo de inimputabilidade total nos autos.",
      },
    ],
    processosCitados: [
      { cnj: "8005316-46.2025.8.05.0039", origem: "vinculado_solar" },
    ],
    interlocutor: "familiar",
  },
];

const PEDIDO = "Consulta-Orientação";
const AREA = "CRIMINAL";

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  for (const item of ATENDIMENTOS) {
    const existente = await db.query(
      "SELECT id FROM registros WHERE numero_solar = $1 LIMIT 1",
      [item.numeroSolar]
    );
    if (existente.rows.length > 0) {
      console.log(`~ ${item.numeroSolar} já existe (registro ${existente.rows[0].id}) — pulando`);
      continue;
    }

    // 1. Assistido: localiza por CPF, depois por nome; cria se não houver.
    //    Completa CPF/nascimento quando faltarem no cadastro.
    let assistidoId = null;
    const porCpf = await db.query("SELECT id FROM assistidos WHERE cpf = $1 LIMIT 1", [
      item.assistido.cpf,
    ]);
    if (porCpf.rows.length > 0) {
      assistidoId = porCpf.rows[0].id;
    } else {
      const porNome = await db.query(
        "SELECT id, cpf, data_nascimento FROM assistidos WHERE unaccent(lower(nome)) = unaccent(lower($1)) ORDER BY (cpf IS NOT NULL) DESC LIMIT 1",
        [item.assistido.nome]
      );
      if (porNome.rows.length > 0) {
        assistidoId = porNome.rows[0].id;
        await db.query(
          "UPDATE assistidos SET cpf = COALESCE(cpf, $2), data_nascimento = COALESCE(data_nascimento, $3), updated_at = now() WHERE id = $1",
          [assistidoId, item.assistido.cpf, item.assistido.dataNascimento]
        );
        console.log(`  assistido ${item.assistido.nome} encontrado por nome (id ${assistidoId}) — CPF/nascimento completados`);
      } else {
        const criado = await db.query(
          "INSERT INTO assistidos (nome, cpf, data_nascimento, created_at, updated_at) VALUES ($1, $2, $3, now(), now()) RETURNING id",
          [item.assistido.nome, item.assistido.cpf, item.assistido.dataNascimento]
        );
        assistidoId = criado.rows[0].id;
        console.log(`  assistido ${item.assistido.nome} criado (id ${assistidoId})`);
      }
    }

    // 2. Processos citados: casa CNJ com processos cadastrados (anota processoId)
    //    e escolhe o vínculo formal quando o processo existir no OMBUDS.
    let processoId = null;
    const citados = [];
    for (const c of item.processosCitados) {
      const p = await db.query(
        "SELECT id FROM processos WHERE numero_autos = $1 LIMIT 1",
        [c.cnj]
      );
      if (p.rows.length > 0) {
        citados.push({ ...c, processoId: p.rows[0].id });
        if (!processoId) processoId = p.rows[0].id;
      } else {
        citados.push(c);
      }
    }

    // 3. Insere o atendimento agendado
    const titulo = `Atendimento ${item.subtipo} — ${item.assistido.nome}`;
    const inserted = await db.query(
      `INSERT INTO registros (
         assistido_id, processo_id, tipo, status, titulo, assunto, local,
         data_registro, interlocutor, numero_solar, subtipo, area, pedido,
         anotacoes_recepcao, historico_solar, processos_citados, autor_id,
         created_at, updated_at
       ) VALUES ($1,$2,'atendimento','agendado',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now(),now())
       RETURNING id`,
      [
        assistidoId,
        processoId,
        titulo,
        item.assunto,
        LOCAL,
        bahia(item.hora),
        item.interlocutor ?? "assistido",
        item.numeroSolar,
        item.subtipo,
        AREA,
        PEDIDO,
        item.anotacoesRecepcao,
        JSON.stringify(item.historicoSolar),
        JSON.stringify(citados),
        AUTOR_ID,
      ]
    );
    console.log(
      `+ ${item.numeroSolar} ${item.hora} ${item.assistido.nome} → registro ${inserted.rows[0].id}` +
        (processoId ? ` (processo ${processoId})` : "")
    );
  }

  const check = await db.query(
    `SELECT r.id, r.numero_solar, to_char(r.data_registro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bahia', 'DD/MM HH24:MI') AS hora_local,
            r.subtipo, a.nome, r.processo_id
       FROM registros r JOIN assistidos a ON a.id = r.assistido_id
      WHERE r.data_registro >= '2026-06-12T00:00:00Z' AND r.data_registro < '2026-06-13T12:00:00Z'
        AND r.tipo = 'atendimento'
      ORDER BY r.data_registro`
  );
  console.log("\nAtendimentos de 12/06/2026 no banco:");
  for (const row of check.rows) {
    console.log(
      `  #${row.id} ${row.hora_local} [${row.subtipo}] ${row.nome} (SOLAR ${row.numero_solar}${row.processo_id ? `, proc ${row.processo_id}` : ""})`
    );
  }

  await db.end();
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
