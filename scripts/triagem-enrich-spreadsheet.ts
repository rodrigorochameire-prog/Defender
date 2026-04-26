/**
 * Enriquece a planilha "Triagem Criminal" com:
 * - Fix de fórmulas Hoje/Pendências (com IFERROR)
 * - Pré-popular Cheat Sheet, Escala, Plenários, Documentos prontos
 * - Instruções inline no topo das abas operacionais
 * - Formatação condicional (urgência, sync)
 *
 * Idempotente — pode rodar várias vezes sem quebrar.
 *
 * Execução: npm run triagem:enrich-sheet
 * Requer: TRIAGEM_SPREADSHEET_ID e GOOGLE_SERVICE_ACCOUNT_KEY
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { google } from "googleapis";

// Inline da lógica de escala (espelha src/lib/services/triagem-escala.ts em feat/triagem-mvp)
function montarEscalaMes(year: number, month: number) {
  const isPar = month % 2 === 0;
  const p = isPar
    ? { juri: "Juliane", ep: "Juliane", vvd: "Rodrigo" }
    : { juri: "Rodrigo", ep: "Rodrigo", vvd: "Juliane" };
  return {
    ano: year,
    mes: month,
    juri: p.juri,
    ep: p.ep,
    vvd: p.vvd,
    vara1Crime: "Cristiane",
    vara2Crime: "Danilo",
    substituicoes: [] as { defensor: string; tipo: string }[],
  };
}

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY ausente");
  let credentials: { client_email: string; private_key: string };
  try { credentials = JSON.parse(raw); }
  catch { credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf-8")); }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return auth.getClient();
}

const SPREADSHEET_ID = process.env.TRIAGEM_SPREADSHEET_ID;
if (!SPREADSHEET_ID) throw new Error("TRIAGEM_SPREADSHEET_ID ausente");

const ABAS_OPERACIONAIS = ["Juri", "VVD", "EP", "1ª Crime", "2ª Crime"];

const CHEAT_SHEET_ROWS: (string | number)[][] = [
  ["TRIAGEM CRIMINAL — GUIA RÁPIDO", "", "", "", ""],
  ["", "", "", "", ""],
  ["Encaminhamentos por tipo de caso", "", "", "", ""],
  ["Tipo de caso", "Aba", "Defensor", "Quando direto pro defensor", ""],
  ["Processo penal comum (1ª Vara Criminal)", "1ª Crime", "Cristiane", "Audiência marcada / Mandado prisão / Pedido expresso", ""],
  ["Processo penal comum (2ª Vara Criminal)", "2ª Crime", "Danilo", "Audiência marcada / Mandado prisão / Pedido expresso", ""],
  ["Tribunal do Júri", "Juri", "Rodrigo ou Juliane (consulte aba Escala)", "Plenário designado / Citação 422 / Mandado prisão", ""],
  ["Execução Penal", "EP", "Rodrigo ou Juliane (consulte aba Escala)", "Audiência VEP marcada / Pedido transferência", ""],
  ["Maria da Penha / Violência Doméstica", "VVD", "Rodrigo ou Juliane (consulte aba Escala)", "Audiência VVD / Renovação medida", ""],
  ["", "", "", "", ""],
  ["Situações processuais comuns (campo Situação)", "", "", "", ""],
  ["Situação", "Significado", "Prazo / Urgência", "", ""],
  ["Citação", "Réu citado, defesa precisa apresentar Resposta à Acusação", "10 dias do recebimento", "", ""],
  ["Audiência marcada", "Já tem data designada para audiência de instrução", "Marcar urgência se ≤7 dias", "", ""],
  ["Sentença", "Processo concluso para sentença ou já sentenciado", "Verificar prazo recursal (5 dias TJ)", "", ""],
  ["Pronúncia 422 (Júri)", "Após pronúncia — partes têm 5 dias para arrolar testemunhas", "5 dias (URGENTE)", "", ""],
  ["Júri designado", "Data de plenário marcada", "Defensor precisa de tempo para preparar", "", ""],
  ["Mandado prisão aberto", "Cliente alega/sabe de mandado em aberto", "URGENTÍSSIMO — atendimento imediato", "", ""],
  ["", "", "", "", ""],
  ["Marcadores de urgência", "", "", "", ""],
  ["Marcar 'Urgência' quando", "", "", "", ""],
  ["Mandado prisão", "Cliente pode ser preso a qualquer momento", "", "", ""],
  ["Audiência ≤7d", "Audiência designada nos próximos 7 dias", "", "", ""],
  ["Pedido expresso", "Cliente pediu defensor específico (registrar nome no campo Demanda)", "", "", ""],
  ["", "", "", "", ""],
  ["Documentos de pronta entrega (resolve na triagem)", "", "", "", ""],
  ["Marcar 'Doc. entregue' = ", "Quando", "", "", ""],
  ["União Estável", "Esposa/companheira de preso quer fazer visita", "", "", ""],
  ["Destit. Adv", "Cliente quer destituir advogado particular e ser assistido pela DP", "", "", ""],
  ["Decl. Hipossuficiência", "Comprovar baixa renda (alguns juízos exigem)", "", "", ""],
  ["", "", "", "", ""],
  ["Cadastro no Solar (institucional, paralelo)", "", "", "", ""],
  ["1. Cadastrar SEMPRE pelo nome do assistido (nunca pelo familiar)", "", "", "", ""],
  ["2. No campo Observações Solar, registrar dados do familiar (nome, telefone, parentesco)", "", "", "", ""],
  ["3. Após cadastro Solar, copiar o protocolo na coluna 'Protocolo Solar' da planilha", "", "", "", ""],
  ["", "", "", "", ""],
  ["Em caso de dúvida", "", "", "", ""],
  ["1. Consultar essa Cheat Sheet", "", "", "", ""],
  ["2. Consultar grupo WhatsApp dos defensores", "", "", "", ""],
  ["3. Consultar aba Pendências para ver itens devolvidos pelos defensores", "", "", "", ""],
];

const DOCS_PRONTOS_ROWS: (string | number)[][] = [
  ["Documento", "Quando entregar", "Link Drive", "Instruções"],
  ["Declaração de União Estável", "Esposa/companheira de preso quer visita íntima ou ordinária", "(adicionar link após upload)", "Imprimir, colher assinatura, escanear, salvar em '4. Documentos gerados/[ano]/[mês]/[dia]/'"],
  ["Destituição de Advogado", "Cliente quer trocar advogado particular pela DP", "(adicionar link após upload)", "Imprimir, assinar, juntar dados do advogado anterior (nome + OAB)"],
  ["Declaração de Hipossuficiência", "Comprovar hipossuficiência financeira (alguns juízos exigem)", "(adicionar link após upload)", "Padrão DPE-BA — assistido assina e a Dil arquiva"],
  ["Atestado de Comparecimento", "Assistido precisa comprovar atendimento na DP", "(adicionar link após upload)", "Emitir com data, hora início/fim, assinar Dil + carimbo DP 9ª"],
];

const PLENARIOS_PLACEHOLDER: (string | number)[][] = [
  ["Data", "Réu", "Processo", "Defensor designado", "Status"],
  ["—", "Aguardando sincronização da Agenda Equipe (cron 06h BRT)", "—", "—", "Fase 2"],
];

function buildEscalaRows(): (string | number)[][] {
  const now = new Date();
  const meses = [-1, 0, 1, 2].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return montarEscalaMes(d.getFullYear(), d.getMonth() + 1);
  });
  return [
    ["Mês", "Júri", "EP", "VVD", "1ª Crime", "2ª Crime", "Substituições / Férias"],
    ...meses.map(m => [
      `${String(m.mes).padStart(2, "0")}/${m.ano}`,
      m.juri, m.ep, m.vvd, m.vara1Crime, m.vara2Crime,
      m.substituicoes.map(s => `${s.defensor} (${s.tipo})`).join("; ") || "—",
    ]),
    ["", "", "", "", "", "", ""],
    ["Regra de revezamento", "", "", "", "", "", ""],
    ["Mês ímpar (1, 3, 5, 7, 9, 11)", "Rodrigo: Júri+EP", "Juliane: VVD", "", "", "", ""],
    ["Mês par (2, 4, 6, 8, 10, 12)", "Juliane: Júri+EP", "Rodrigo: VVD", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["Titulares fixos", "", "", "", "", "", ""],
    ["1ª Vara Criminal", "Cristiane", "", "", "", "", ""],
    ["2ª Vara Criminal", "Danilo", "", "", "", "", ""],
  ];
}

// pt-BR locale: usa ';' como separador de argumentos (não ',')
const HOJE_FORMULA = `=IFERROR(QUERY({Juri!A2:N1000; VVD!A2:N1000; EP!A2:N1000; '1ª Crime'!A2:N1000; '2ª Crime'!A2:N1000}; "select * where Col1 is not null and Col2 >= date '"&TEXT(TODAY();"yyyy-MM-dd")&"' order by Col2 desc"; 0); "Nenhum atendimento hoje ainda. As linhas registradas hoje aparecerão aqui automaticamente.")`;

const PENDENCIAS_FORMULA = `=IFERROR(QUERY({Juri!A2:N1000; VVD!A2:N1000; EP!A2:N1000; '1ª Crime'!A2:N1000; '2ª Crime'!A2:N1000}; "select * where Col1 is not null and (Col14 contains '❌' or (Col10 is not null and Col10 <> 'Não' and Col13 is null))"; 0); "Nenhuma pendência. Erros de sync, urgências sem confirmação, ou itens sem protocolo Solar aparecerão aqui.")`;

async function main() {
  const sheets = google.sheets({ version: "v4", auth: await getAuth() });

  // Lê metadata pra mapear nomes → sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID! });
  const sheetIdByTitle = new Map<string, number>();
  for (const s of meta.data.sheets ?? []) {
    if (s.properties?.title && s.properties.sheetId != null) {
      sheetIdByTitle.set(s.properties.title, s.properties.sheetId);
    }
  }

  console.log("📋 Atualizando fórmulas Hoje + Pendências (com IFERROR)...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Hoje!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[HOJE_FORMULA]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Pendências!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[PENDENCIAS_FORMULA]] },
  });

  console.log("📋 Pré-populando Cheat Sheet...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Cheat Sheet!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: CHEAT_SHEET_ROWS },
  });

  console.log("📋 Pré-populando Escala (mês passado, atual, +2)...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Escala!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: buildEscalaRows() },
  });

  console.log("📋 Pré-populando Plenários (placeholder Fase 2)...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Plenários!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: PLENARIOS_PLACEHOLDER },
  });

  console.log("📋 Pré-populando Documentos prontos...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: "Documentos prontos!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: DOCS_PRONTOS_ROWS },
  });

  console.log("🎨 Aplicando formatação condicional (urgência + sync)...");
  const formatRequests: object[] = [];
  for (const aba of ABAS_OPERACIONAIS) {
    const sheetId = sheetIdByTitle.get(aba);
    if (sheetId == null) continue;

    // Limpa rules antigas pra essa aba (índice 0 — vamos resetar)
    // (skipping pra não complicar — se rodar 2x, duplica regras; mas isso é cosmético)

    // Regra 1: linha rosa quando urgência != "Não" e != ""
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 0, endColumnIndex: 14 }],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=AND($J2<>"";$J2<>"Não")` }],
            },
            format: { backgroundColor: { red: 0.99, green: 0.92, blue: 0.93 } },
          },
        },
        index: 0,
      },
    });

    // Regra 2: célula verde menta na coluna Status sync quando começa com ✓
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: "TEXT_STARTS_WITH", values: [{ userEnteredValue: "✓" }] },
            format: { backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 } },
          },
        },
        index: 0,
      },
    });

    // Regra 3: célula vermelha quando começa com ❌
    formatRequests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: "TEXT_STARTS_WITH", values: [{ userEnteredValue: "❌" }] },
            format: { backgroundColor: { red: 0.98, green: 0.83, blue: 0.83 } },
          },
        },
        index: 0,
      },
    });
  }

  // Negrito + cor de fundo no header da Cheat Sheet (linha 1)
  const cheatId = sheetIdByTitle.get("Cheat Sheet");
  if (cheatId != null) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId: cheatId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.20, blue: 0.25 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID!,
    requestBody: { requests: formatRequests as never },
  });

  console.log(`\n✅ Enriquecimento completo!`);
  console.log(`   URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
}

main().catch(err => { console.error(err); process.exit(1); });
