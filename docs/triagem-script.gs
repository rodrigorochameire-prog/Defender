// docs/triagem-script.gs
/**
 * TRIAGEM CRIMINAL — Apps Script de Captura → OMBUDS
 *
 * INSTALAÇÃO:
 * 1. Abrir a planilha "Triagem Criminal — DP Camaçari"
 * 2. Extensões → Apps Script
 * 3. Substituir conteúdo por este arquivo

 * 4. Configurar Script Properties (chave 🔧 no menu lateral):
 *      - SHEETS_WEBHOOK_SECRET = mesmo valor do .env do OMBUDS
 *      - OMBUDS_BASE_URL = ex: https://ombuds.vercel.app
 *      - WORKSPACE_ID = ID numérico da sua comarca (isolamento por workspace)
 * 5. Salvar (Ctrl+S)
 * 6. Executar `instalarTriggers` uma vez
 * 7. Autorizar permissões
 */

const ABAS_OPERACIONAIS = ["Juri", "VVD", "EP", "1ª Crime", "2ª Crime"];

const ABA_TO_API = {
  "Juri":      "Juri",
  "VVD":       "VVD",
  "EP":        "EP",
  "1ª Crime":  "Crime1",
  "2ª Crime":  "Crime2",
};

// Colunas comuns (1-indexed). Ajustar se layout mudar.
const COL = {
  TCC:                1,
  DATA:               2,
  ASSISTIDO_NOME:     3,
  TELEFONE:           4,
  COMPARECEU:         5,
  SITUACAO:           6,
  PROCESSO:           7,
  DEFENSOR_SUGERIDO:  8,
  DEFENSOR_ATRIBUIDO: 9,
  URGENCIA:           10,
  DOC_ENTREGUE:       11,
  DEMANDA:            12,
  PROTOCOLO_SOLAR:    13,
  STATUS_SYNC:        14,
};

// ==================================================
// TRIGGER PRINCIPAL
// ==================================================

function onEditTrigger(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const aba = sheet.getName();

  if (ABAS_OPERACIONAIS.indexOf(aba) === -1) return;
  const row = e.range.getRow();
  if (row <= 2) return;

  const nome = sheet.getRange(row, COL.ASSISTIDO_NOME).getValue();
  if (!nome) return;

  const statusAtual = sheet.getRange(row, COL.STATUS_SYNC).getValue();
  if (typeof statusAtual === "string" && statusAtual.indexOf("✓") === 0) return;

  if (e.range.getColumn() !== COL.DEMANDA && e.range.getColumn() !== COL.URGENCIA) {
    return;
  }

  enviarAtendimento(sheet, aba, row);
}

// ==================================================
// ENVIO PARA OMBUDS
// ==================================================

function enviarAtendimento(sheet, aba, row) {
  const props = PropertiesService.getScriptProperties();
  const SECRET = props.getProperty("SHEETS_WEBHOOK_SECRET");
  const BASE = props.getProperty("OMBUDS_BASE_URL") || "https://ombuds.vercel.app";
  const WORKSPACE_ID = props.getProperty("WORKSPACE_ID"); // ID da comarca (ex: 9 = Camaçari)

  if (!SECRET) {
    sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ SECRET ausente");
    return;
  }

  const payload = {
    aba: ABA_TO_API[aba],
    linha: row,
    apps_script_id: ScriptApp.getScriptId(),
    workspace_id: WORKSPACE_ID ? Number(WORKSPACE_ID) : null,
    payload: {
      assistido_nome:  sheet.getRange(row, COL.ASSISTIDO_NOME).getValue(),
      telefone:        sheet.getRange(row, COL.TELEFONE).getValue(),
      compareceu:      String(sheet.getRange(row, COL.COMPARECEU).getValue() || "Próprio").toLowerCase(),
      situacao:        sheet.getRange(row, COL.SITUACAO).getValue(),
      processo_cnj:    sheet.getRange(row, COL.PROCESSO).getValue(),
      urgencia:        sheet.getRange(row, COL.URGENCIA).getValue() || "Não",
      documento_entregue: sheet.getRange(row, COL.DOC_ENTREGUE).getValue() || "Nenhum",
      demanda:         sheet.getRange(row, COL.DEMANDA).getValue(),
    },
  };

  try {
    const res = UrlFetchApp.fetch(BASE + "/api/triagem/atendimento", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = JSON.parse(res.getContentText() || "{}");

    if (code === 200) {
      sheet.getRange(row, COL.TCC).setValue(body.tccRef);
      const link = '=HYPERLINK("' + BASE + body.triagemUrl + '","✓ #" & "' + body.atendimentoId + '")';
      sheet.getRange(row, COL.STATUS_SYNC).setFormula(link);
    } else {
      sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ " + (body.error || code));
    }
  } catch (err) {
    sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ " + err.message);
  }
}

// ==================================================
// MENU CUSTOMIZADO
// ==================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚡ Triagem")
    .addItem("Reprocessar pendências (linha atual)", "reprocessarLinhaAtual")
    .addItem("Reprocessar pendências (todas as abas)", "reprocessarTodasPendencias")
    .addSeparator()
    .addItem("Sincronizar Escala agora", "sincronizarEscalaAgora")
    .addItem("Sincronizar Plenários agora", "sincronizarPlenariosAgora")
    .addToUi();
}

function reprocessarLinhaAtual() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const aba = sheet.getName();
  if (ABAS_OPERACIONAIS.indexOf(aba) === -1) {
    SpreadsheetApp.getUi().alert("Posicione-se em uma das abas operacionais.");
    return;
  }
  enviarAtendimento(sheet, aba, sheet.getActiveRange().getRow());
}

function reprocessarTodasPendencias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let processadas = 0;
  ABAS_OPERACIONAIS.forEach(function (aba) {
    const sheet = ss.getSheetByName(aba);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let r = 2; r < data.length; r++) {
      const status = String(data[r][COL.STATUS_SYNC - 1] || "");
      const nome = data[r][COL.ASSISTIDO_NOME - 1];
      if (nome && status.indexOf("❌") === 0) {
        enviarAtendimento(sheet, aba, r + 1);
        processadas++;
      }
    }
  });
  SpreadsheetApp.getUi().alert("Reprocessadas: " + processadas);
}

function sincronizarEscalaAgora() {
  _sincronizarAba("escala", "Escala");
}

function sincronizarPlenariosAgora() {
  _sincronizarAba("plenarios", "Plenários");
}

function _sincronizarAba(tipo, nomeAba) {
  const props = PropertiesService.getScriptProperties();
  const SECRET = props.getProperty("SHEETS_WEBHOOK_SECRET");
  const BASE = props.getProperty("OMBUDS_BASE_URL") || "https://ombuds.vercel.app";
  const url = BASE + "/api/cron/triagem-sync-planilha?tipo=" + tipo;
  UrlFetchApp.fetch(url, {
    method: "post",
    headers: { Authorization: "Bearer " + SECRET },
    muteHttpExceptions: true,
  });
  SpreadsheetApp.getUi().alert("Sincronização de " + nomeAba + " disparada.");
}

// ==================================================
// INSTALAÇÃO DE TRIGGERS
// ==================================================

function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onEditTrigger").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getUi().alert("Trigger onEdit instalado.");
}
