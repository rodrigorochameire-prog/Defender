/**
 * Cria a spreadsheet "Triagem Criminal — DP Camaçari" com 12 abas,
 * headers, validações dropdown e fórmulas QUERY para Hoje e Pendências.
 *
 * Execução: npm run triagem:setup-sheet
 * Requer: GOOGLE_SERVICE_ACCOUNT_KEY no .env.local
 *
 * Após rodar, copie o ID impresso para TRIAGEM_SPREADSHEET_ID no .env.local
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

const FOLDER_ID = process.env.TRIAGEM_DRIVE_FOLDER_ID;
const EXISTING_SPREADSHEET_ID = process.env.TRIAGEM_SPREADSHEET_ID;

async function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não configurado");
  let key: { client_email: string; private_key: string };
  try {
    key = JSON.parse(raw);
  } catch {
    key = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  }
  const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
  return auth.getClient();
}

const ABAS_OPERACIONAIS = ["Juri", "VVD", "EP", "1ª Crime", "2ª Crime"];
const ABAS_AUTO = ["Hoje", "Pendências"];
const ABAS_REF = ["Escala", "Plenários", "Documentos prontos", "Cheat Sheet", "Stats"];

const HEADERS_COMUNS = [
  "#TCC", "Data/hora", "Assistido", "Telefone", "Compareceu",
  "Situação", "Nº Processo", "Defensor sugerido", "Defensor atribuído",
  "Urgência", "Doc. entregue", "Demanda", "Protocolo Solar", "Status sync",
];

const URGENCIA_OPTS = ["Não", "Mandado prisão", "Audiência ≤7d", "Pedido expresso"];
const COMPARECEU_OPTS = ["Próprio", "Familiar", "Outro"];
const DOC_OPTS = ["Nenhum", "União Estável", "Destit. Adv", "Decl. Hipossuficiência", "Outro"];

function makeValidation(sheetId: number, columnIndex: number, opts: string[]) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 2000,
        startColumnIndex: columnIndex,
        endColumnIndex: columnIndex + 1,
      },
      rule: {
        condition: {
          type: "ONE_OF_LIST",
          values: opts.map(o => ({ userEnteredValue: o })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  };
}

async function main() {
  const auth = await getAuth();
  const drive = google.drive({ version: "v3", auth });
  const sheets = google.sheets({ version: "v4", auth });

  let spreadsheetId: string;

  if (EXISTING_SPREADSHEET_ID) {
    spreadsheetId = EXISTING_SPREADSHEET_ID;
    console.log(`📋 Usando planilha existente: ${spreadsheetId}`);
  } else {
    if (!FOLDER_ID) {
      console.error("ERRO: configure TRIAGEM_SPREADSHEET_ID (planilha pré-criada manualmente)");
      console.error("OU TRIAGEM_DRIVE_FOLDER_ID (com Shared Drive — service account precisa de quota)");
      console.error("");
      console.error("Caminho mais simples: criar planilha vazia manualmente, compartilhar com");
      console.error("ombuds-drive@vvd-automation.iam.gserviceaccount.com como Editor, e configurar");
      console.error("TRIAGEM_SPREADSHEET_ID no .env.local com o ID da planilha.");
      process.exit(1);
    }
    const driveCreate = await drive.files.create({
      requestBody: {
        name: "Triagem Criminal — DP Camaçari",
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [FOLDER_ID],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    spreadsheetId = driveCreate.data.id!;
    console.log(`✅ Planilha criada na pasta: ${spreadsheetId}`);
  }
  console.log(`   URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  // 2. Adiciona as 12 abas + remove a "Sheet1" default
  const allTabs = [...ABAS_OPERACIONAIS, ...ABAS_AUTO, ...ABAS_REF];
  const addRequests = allTabs.map((title, i) => ({
    addSheet: {
      properties: {
        title,
        index: i,
        gridProperties: { rowCount: 2000, columnCount: 20, frozenRowCount: 1 },
      },
    },
  }));

  const batch1 = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: addRequests },
  });

  // Pega o sheetId default ("Sheet1") pra remover depois
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const defaultSheetId = meta.data.sheets?.find(
    s => !allTabs.includes(s.properties?.title ?? ""),
  )?.properties?.sheetId;

  const sheetIdByTitle = new Map<string, number>();
  for (const reply of batch1.data.replies ?? []) {
    const props = reply.addSheet?.properties;
    if (props?.title && props.sheetId != null) {
      sheetIdByTitle.set(props.title, props.sheetId);
    }
  }

  const requests: unknown[] = [];

  for (const aba of ABAS_OPERACIONAIS) {
    const sheetId = sheetIdByTitle.get(aba)!;
    requests.push({
      updateCells: {
        rows: [{
          values: HEADERS_COMUNS.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: { textFormat: { bold: true } },
          })),
        }],
        fields: "userEnteredValue,userEnteredFormat.textFormat.bold",
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
      },
    });
    requests.push(makeValidation(sheetId, 4, COMPARECEU_OPTS));
    requests.push(makeValidation(sheetId, 9, URGENCIA_OPTS));
    requests.push(makeValidation(sheetId, 10, DOC_OPTS));
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 2000,
            startColumnIndex: 0,
            endColumnIndex: 14,
          },
        },
      },
    });
  }

  const hojeId = sheetIdByTitle.get("Hoje")!;
  requests.push({
    updateCells: {
      rows: [{
        values: [{
          userEnteredValue: {
            formulaValue: `=QUERY({Juri!A2:N; VVD!A2:N; EP!A2:N; '1ª Crime'!A2:N; '2ª Crime'!A2:N}, "where Col2 >= date '"&TEXT(TODAY(),"yyyy-MM-dd")&"' order by Col2 desc", 0)`,
          },
        }],
      }],
      fields: "userEnteredValue",
      start: { sheetId: hojeId, rowIndex: 0, columnIndex: 0 },
    },
  });

  const pendId = sheetIdByTitle.get("Pendências")!;
  requests.push({
    updateCells: {
      rows: [{
        values: [{
          userEnteredValue: {
            formulaValue: `=QUERY({Juri!A2:N; VVD!A2:N; EP!A2:N; '1ª Crime'!A2:N; '2ª Crime'!A2:N}, "where Col14 contains '❌' or (Col10 != 'Não' and Col10 is not null and Col13 is null)", 0)`,
          },
        }],
      }],
      fields: "userEnteredValue",
      start: { sheetId: pendId, rowIndex: 0, columnIndex: 0 },
    },
  });

  // Remove a Sheet1 default criada pelo Drive
  if (defaultSheetId != null) {
    requests.push({ deleteSheet: { sheetId: defaultSheetId } });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: requests as never },
  });

  console.log(`✅ Setup completo.`);
  console.log(`   Configure no .env.local: TRIAGEM_SPREADSHEET_ID=${spreadsheetId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
