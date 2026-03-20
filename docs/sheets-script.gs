/**
 * OMBUDS — Apps Script de Sincronização Bidirecional
 *
 * INSTALAÇÃO:
 * 1. Na planilha: Extensões → Apps Script
 * 2. Cole este código substituindo o conteúdo existente
 * 3. Salve (Ctrl+S)
 * 4. Execute "instalarTrigger" uma vez (Menu: Executar → instalarTrigger)
 * 5. Autorize as permissões solicitadas
 *
 * CONFIGURAÇÃO:
 * Atualize as constantes abaixo com os valores do seu ambiente.
 */

// ==========================================
// CONFIGURAÇÃO — ALTERE AQUI
// ==========================================

const WEBHOOK_URL = "https://ombuds.vercel.app/api/sheets/webhook";
const SECRET_TOKEN = "a71a4680f5b946eb018d5e2e219ec2b6f5c1c900006e98ffe460cedcbf23cd18";

// ==========================================
// MAPEAMENTO DE COLUNAS
// Deve corresponder ao serviço google-sheets.ts
// ==========================================

const COLUNAS = {
  1: null,           // A — __id__ (chave interna, não sincronizar)
  2: "status",       // B
  3: "reuPreso",     // C
  4: "dataEntrada",  // D
  5: "assistido",    // E
  6: "autos",        // F
  7: "ato",          // G
  8: "prazo",        // H
  9: "providencias", // I
  10: "delegadoPara", // J
};

// ==========================================
// TRIGGER PRINCIPAL
// ==========================================

/**
 * Detecta edições e envia para o app.
 * Instalado como trigger "onEdit" pelo método instalarTrigger().
 */
function onEditTrigger(e) {
  try {
    const range = e.range;
    const row = range.getRow();

    // Ignora cabeçalho (linha 1)
    if (row <= 1) return;

    const sheet = range.getSheet();
    const col = range.getColumn();

    // Ignora coluna __id__ (A) e colunas não mapeadas
    const campo = COLUNAS[col];
    if (!campo) return;

    // Busca o ID da demanda na coluna A da mesma linha
    const id = sheet.getRange(row, 1).getValue();
    if (!id || id === "") return;

    const valor = e.value ?? "";

    // Envia para o app
    const payload = JSON.stringify({ id: Number(id), campo, valor });

    const options = {
      method: "POST",
      contentType: "application/json",
      payload,
      headers: {
        Authorization: "Bearer " + SECRET_TOKEN,
      },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const status = response.getResponseCode();

    if (status !== 200) {
      console.error(
        "[OMBUDS Sync] Erro ao sincronizar demanda " + id +
        " campo=" + campo +
        " status=" + status +
        " body=" + response.getContentText()
      );
    } else {
      console.log("[OMBUDS Sync] Demanda " + id + " — " + campo + " atualizado");
    }
  } catch (err) {
    console.error("[OMBUDS Sync] Erro inesperado:", err);
  }
}

// ==========================================
// INSTALAÇÃO DO TRIGGER
// ==========================================

/**
 * Execute esta função UMA vez para instalar o trigger onEdit.
 * Menu: Executar → instalarTrigger
 */
function instalarTrigger() {
  // Remove triggers antigos do mesmo tipo para evitar duplicatas
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "onEditTrigger") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Instala novo trigger
  ScriptApp.newTrigger("onEditTrigger")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "✅ OMBUDS Sync instalado!\n\n" +
    "Qualquer edição nas planilhas de demandas será automaticamente " +
    "sincronizada com o aplicativo."
  );
}

/**
 * Testa a conexão com o app.
 * Menu: Executar → testarConexao
 */
function testarConexao() {
  try {
    const response = UrlFetchApp.fetch(
      WEBHOOK_URL.replace("/webhook", "/test"),
      {
        method: "GET",
        headers: { Authorization: "Bearer " + SECRET_TOKEN },
        muteHttpExceptions: true,
      }
    );
    const status = response.getResponseCode();
    SpreadsheetApp.getUi().alert(
      status === 200
        ? "✅ Conexão com OMBUDS OK!"
        : "❌ Erro de conexão: HTTP " + status + "\n" + response.getContentText()
    );
  } catch (err) {
    SpreadsheetApp.getUi().alert("❌ Erro: " + err);
  }
}
