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
const CREATE_URL  = "https://ombuds.vercel.app/api/sheets/create-from-row";
const SECRET_TOKEN = "a71a4680f5b946eb018d5e2e219ec2b6f5c1c900006e98ffe460cedcbf23cd18";

// ==========================================
// ESTRUTURA DA PLANILHA (colunas 1-indexed)
// Corresponde ao layout criado pelo servidor (google-sheets.ts):
//   A=__id__ (oculto), B=Status, C=Prisão, D=Data,
//   E=Assistido, F=Autos, G=Ato, H=Prazo,
//   I=Providências, J=Delegado Para
// ==========================================

const COL_OMBUDS_ID    = 1;  // A — __id__ (chave interna, oculto)
const COL_STATUS       = 2;  // B
const COL_REU_PRESO    = 3;  // C — Prisão
const COL_DATA_ENTRADA = 4;  // D — Data
const COL_ASSISTIDO    = 5;  // E — Assistido (nome)
const COL_AUTOS        = 6;  // F — Nº Autos
const COL_ATO          = 7;  // G — Ato
const COL_PRAZO        = 8;  // H — Prazo
const COL_PROVIDENCIAS = 9;  // I — Providências
const COL_DELEGADO     = 10; // J — Delegado Para

/**
 * Mapeamento: número de coluna → nome do campo na API
 * null = ignorar (não sincronizar via webhook de atualização)
 */
const COLUNAS = {
  [COL_OMBUDS_ID]:    null,          // A — tracking: não dispara webhook
  [COL_STATUS]:       "status",
  [COL_REU_PRESO]:    "reuPreso",
  [COL_DATA_ENTRADA]: "dataEntrada",
  [COL_ASSISTIDO]:    "assistido",
  [COL_AUTOS]:        "autos",
  [COL_ATO]:          "ato",
  [COL_PRAZO]:        "prazo",
  [COL_PROVIDENCIAS]: "providencias",
  [COL_DELEGADO]:     null,          // J — delegadoPara: não sincronizado (futuro)
};

// ==========================================
// TRIGGER PRINCIPAL
// ==========================================

/**
 * Detecta edições e:
 *  - Se a linha JÁ TEM __ombuds_id__ → atualiza o campo no app (webhook)
 *  - Se a linha NÃO TEM __ombuds_id__ e tem dados mínimos → cria a demanda no app
 *
 * Instalado como trigger "onEdit" pelo método instalarTrigger().
 */
function onEditTrigger(e) {
  try {
    // Guard: ignora eventos sem range (edições por script, macro, ou colagem em massa)
    if (!e || !e.range) return;

    const range = e.range;
    const row = range.getRow();

    // Ignora cabeçalho (linhas 1-3: título, separador, headers)
    if (row <= 3) return;

    const sheet = range.getSheet();
    const col   = range.getColumn();

    // Lê o ID de rastreamento da coluna J
    const ombudsId = sheet.getRange(row, COL_OMBUDS_ID).getValue();

    if (ombudsId && ombudsId !== "") {
      // ── Linha existente: sincroniza o campo editado ──────────────────────
      const campo = COLUNAS[col];
      if (!campo) return; // coluna não mapeada ou tracking — ignora

      const valor = e.value ?? "";
      // oldValue = o que estava na célula ANTES da edição. Servidor usa para
      // detectar conflito real (se o banco mudou entre o último sync e a
      // edição, oldValue não bate com o valor atual no banco).
      const oldValue = e.oldValue ?? null;
      _enviarWebhook(Number(ombudsId), campo, valor, oldValue);

      // Se o campo editado foi Status, reagrupar a aba localmente para que a
      // linha se mova imediatamente para o bloco correto (sem esperar o
      // reorder do servidor). Sort estável preserva a ordem dentro do grupo.
      if (col === COL_STATUS) {
        _reagruparPorStatus(sheet);
      }

    } else {
      // ── Linha nova: tenta criar a demanda no app ────────────────────────
      // Só dispara se o campo editado for um campo de dados (não a coluna tracking)
      if (col === COL_OMBUDS_ID) return;

      // Lê os campos obrigatórios
      const assistidoNome = String(sheet.getRange(row, COL_ASSISTIDO).getValue() ?? "").trim();
      const numeroAutos   = String(sheet.getRange(row, COL_AUTOS).getValue() ?? "").trim();
      const ato           = String(sheet.getRange(row, COL_ATO).getValue() ?? "").trim();

      // Só cria se tiver os três campos obrigatórios
      if (!assistidoNome || !numeroAutos || !ato) return;

      // Lê os demais campos opcionais
      const status       = String(sheet.getRange(row, COL_STATUS).getValue()       ?? "").trim();
      const reuPreso     = String(sheet.getRange(row, COL_REU_PRESO).getValue()    ?? "").trim();
      const dataEntrada  = String(sheet.getRange(row, COL_DATA_ENTRADA).getValue() ?? "").trim();
      const prazo        = String(sheet.getRange(row, COL_PRAZO).getValue()        ?? "").trim();
      const providencias = String(sheet.getRange(row, COL_PROVIDENCIAS).getValue() ?? "").trim();
      const sheetName    = sheet.getName();
      // Email do editor da planilha — usado pelo servidor para resolver o
      // defensor dono da demanda. Sem isso o servidor cai em um fallback
      // arbitrário (primeiro defensor do banco), o que já causou bug.
      const defensorEmail = (e.user && e.user.getEmail && e.user.getEmail()) ||
                            Session.getActiveUser().getEmail() || "";

      const demandaId = _criarDemanda({
        assistidoNome,
        numeroAutos,
        ato,
        status,
        reuPreso,
        dataEntrada,
        prazo,
        providencias,
        sheetName,
        defensorEmail,
      });

      if (demandaId) {
        // Grava o ID de volta na coluna J para sincronizações futuras
        sheet.getRange(row, COL_OMBUDS_ID).setValue(demandaId);
        console.log("[OMBUDS Sync] Demanda " + demandaId + " criada para " + assistidoNome);
      }
    }
  } catch (err) {
    console.error("[OMBUDS Sync] Erro inesperado:", err);
  }
}

// ==========================================
// REAGRUPAMENTO LOCAL
// ==========================================

/**
 * Ordena as linhas de dados da aba pela coluna Status (ASC).
 * Os rótulos já usam prefixo numérico ("1 - ...", "2 - ...", "5 - ...",
 * "7 - ..."), então o sort alfanumérico produz o agrupamento correto.
 * Sort é estável → ordem dentro do mesmo status é preservada.
 *
 * Linhas 1-3 (título, separador, cabeçalho) não são tocadas.
 */
function _reagruparPorStatus(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 3) return;
    const lastCol = sheet.getLastColumn();
    const dataRange = sheet.getRange(4, 1, lastRow - 3, lastCol);
    dataRange.sort({ column: COL_STATUS, ascending: true });
  } catch (err) {
    console.error("[OMBUDS Sync] Falha ao reagrupar por status:", err);
  }
}

// ==========================================
// HELPERS DE HTTP
// ==========================================

/**
 * Envia atualização de campo para o app (demanda já existente).
 * `oldValue` é opcional — quando presente, habilita detecção de conflito
 * real no servidor (evita sobrescrever banco que foi alterado em paralelo).
 */
function _enviarWebhook(id, campo, valor, oldValue) {
  const payload = JSON.stringify({ id, campo, valor, oldValue: oldValue });
  const options = {
    method: "POST",
    contentType: "application/json",
    payload,
    headers: { Authorization: "Bearer " + SECRET_TOKEN },
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
}

/**
 * Chama o endpoint para criar uma nova demanda a partir dos dados da linha.
 * Retorna o ID criado ou null em caso de erro.
 */
function _criarDemanda(dados) {
  const payload = JSON.stringify(dados);
  const options = {
    method: "POST",
    contentType: "application/json",
    payload,
    headers: { Authorization: "Bearer " + SECRET_TOKEN },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(CREATE_URL, options);
  const status = response.getResponseCode();
  const body   = response.getContentText();

  if (status === 200) {
    try {
      const json = JSON.parse(body);
      return json.demandaId ?? null;
    } catch (_) {
      console.error("[OMBUDS Sync] Resposta inválida ao criar demanda:", body);
      return null;
    }
  } else {
    console.error(
      "[OMBUDS Sync] Erro ao criar demanda" +
      " status=" + status +
      " body=" + body
    );
    return null;
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
    "• Editar linha existente → sincroniza campo no app\n" +
    "• Adicionar linha nova (com Assistido + Autos + Ato) → cria demanda no app automaticamente"
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

/**
 * Sincroniza todas as linhas existentes que ainda não têm __ombuds_id__.
 * Útil para importar linhas adicionadas manualmente antes da integração.
 * Menu: Executar → sincronizarLinhasSemId
 */
function sincronizarLinhasSemId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let total = 0;
  let criadas = 0;
  let erros = 0;

  for (const sheet of sheets) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue; // sem dados

    const sheetName = sheet.getName();

    for (let row = 4; row <= lastRow; row++) { // Row 1=title, 2=separator, 3=headers
      const ombudsId = sheet.getRange(row, COL_OMBUDS_ID).getValue();
      if (ombudsId && ombudsId !== "") continue; // já tem ID

      const assistidoNome = String(sheet.getRange(row, COL_ASSISTIDO).getValue() ?? "").trim();
      const numeroAutos   = String(sheet.getRange(row, COL_AUTOS).getValue()     ?? "").trim();
      const ato           = String(sheet.getRange(row, COL_ATO).getValue()       ?? "").trim();

      if (!assistidoNome || !numeroAutos || !ato) continue;

      total++;
      const demandaId = _criarDemanda({
        assistidoNome,
        numeroAutos,
        ato,
        status:       String(sheet.getRange(row, COL_STATUS).getValue()       ?? "").trim(),
        reuPreso:     String(sheet.getRange(row, COL_REU_PRESO).getValue()    ?? "").trim(),
        dataEntrada:  String(sheet.getRange(row, COL_DATA_ENTRADA).getValue() ?? "").trim(),
        prazo:        String(sheet.getRange(row, COL_PRAZO).getValue()        ?? "").trim(),
        providencias: String(sheet.getRange(row, COL_PROVIDENCIAS).getValue() ?? "").trim(),
        sheetName,
      });

      if (demandaId) {
        sheet.getRange(row, COL_OMBUDS_ID).setValue(demandaId);
        criadas++;
      } else {
        erros++;
      }

      // Pausa leve para evitar rate limit
      Utilities.sleep(300);
    }
  }

  SpreadsheetApp.getUi().alert(
    "✅ Sincronização concluída!\n\n" +
    "Linhas analisadas: " + total + "\n" +
    "Demandas criadas: " + criadas + "\n" +
    "Erros: " + erros
  );
}
