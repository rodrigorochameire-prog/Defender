# Design: Sincronização Bidirecional Google Sheets ↔ OMBUDS

**Data**: 2026-03-19
**Status**: Aprovado — pronto para implementação

---

## Objetivo

Sincronização bidirecional entre a planilha Google Sheets atual (`Demandas Júri e substituições`) e o banco de dados do OMBUDS, com o **app como fonte de verdade**.

---

## Planilha Atual

- **ID**: `1ZSsdrSLraRbCWMA7ldA4yHGpQHsZ4iIUCKQvmc1y_Bw`
- **Abas** (= atribuições): Júri, Violência Doméstica, EP, Substituição Criminal, Curadoria, Protocolo Integrado, Plenários, Liberdade
- **Colunas atuais**: Status | Prisão | Data | Assistido | Autos | Ato | Prazo | Providências

---

## Arquitetura

```
┌─────────────────┐         ┌──────────────────────┐
│   OMBUDS App    │◄───────►│   Google Sheets      │
│  (fonte verdade)│         │  (interface edição)  │
└────────┬────────┘         └──────────┬───────────┘
         │                             │
         │  App → Sheets               │  Sheets → App
         │  (Google Sheets API v4)     │  (Apps Script onEdit)
         │                             │
         ▼                             ▼
   sheets-sync.ts              POST /api/sheets/webhook
   pushDemanda()               → valida → update DB
```

### Regra de Conflito
**App tem precedência.** Se ambos os lados editarem simultaneamente, o próximo sync do app sobrescreve o Sheets.

### Anti-loop
Mutations do app passam `skipSheetSync: true` quando originadas do webhook, evitando ciclo infinito.

---

## Estrutura de Colunas

| Col | Campo | Mapeamento DB | Editável |
|-----|-------|---------------|----------|
| A (oculta, largura 0) | `__id__` | `demandas.id` | ❌ sistema |
| B | Status | `demandas.status` | ✅ |
| C | Prisão | `demandas.reuPreso` (date→bool) | ✅ |
| D | Data Entrada | `demandas.dataEntrada` | ✅ |
| E | Assistido | `assistidos.nome` | ✅ |
| F | Autos | `processos.numeroAutos` | ✅ |
| G | Ato | `demandas.ato` | ✅ |
| H | Prazo | `demandas.prazo` | ✅ |
| I | Providências | `demandas.providencias` | ✅ |
| J | Delegado Para | `users.name` via `demandas.delegadoParaId` | ✅ |

**Linha 1**: cabeçalho protegido
**Linha 2+**: dados ordenados por prazo crescente

---

## Componentes a Construir

### 1. `src/lib/sheets-sync.ts`
Serviço encapsulando Google Sheets API v4:
```typescript
pushDemanda(demanda: DemandaComRelacoes): Promise<void>
removeDemanda(demandaId: number, atribuicao: string): Promise<void>
moveDemanda(id: number, abaAntiga: string, abaNova: string): Promise<void>
syncAll(defensorId: string): Promise<SyncStats>
initSheet(atribuicao: string): Promise<void>
```

### 2. Modificações em `src/lib/trpc/routers/demandas.ts`
- `create` → `await sheetsSync.pushDemanda(demanda)` ao final
- `update` → `await sheetsSync.pushDemanda(demanda)` (com flag `skipSheetSync`)
- `delete` → `await sheetsSync.removeDemanda(id, atribuicao)`

### 3. `src/app/api/sheets/webhook/route.ts`
```typescript
POST /api/sheets/webhook
Authorization: Bearer {SHEETS_WEBHOOK_SECRET}
Body: { id: number, campo: string, valor: string }
```
- Valida token
- Mapeia campo → campo DB
- Chama update interno com `skipSheetSync: true`
- Retorna 200 OK

### 4. Apps Script (instalado na planilha)
```javascript
const WEBHOOK_URL = "https://ombuds.vercel.app/api/sheets/webhook";
const SECRET_TOKEN = "..."; // configurado pelo usuário

function onEdit(e) {
  const row = e.range.getRow();
  if (row <= 1) return;
  const sheet = e.range.getSheet();
  const id = sheet.getRange(row, 1).getValue();
  if (!id) return;
  const COLUNAS = {2:"status",3:"reuPreso",4:"dataEntrada",5:"assistido",
                   6:"autos",7:"ato",8:"prazo",9:"providencias",10:"delegadoPara"};
  const campo = COLUNAS[e.range.getColumn()];
  if (!campo) return;
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({ id, campo, valor: e.value }),
    headers: { "Authorization": "Bearer " + SECRET_TOKEN }
  });
}
```

### 5. Env Vars
```
GOOGLE_SHEETS_SERVICE_ACCOUNT={"type":"service_account",...}
GOOGLE_SHEETS_SPREADSHEET_ID=1ZSsdrSLraRbCWMA7ldA4yHGpQHsZ4iIUCKQvmc1y_Bw
SHEETS_WEBHOOK_SECRET=<gerado automaticamente>
```

### 6. Configurações UI (`/admin/configuracoes`)
- Campo: ID da Planilha Google
- Campo: Token Secreto (gerado + copiável)
- Botão: "Sincronizar tudo agora"
- Status: última sincronização + erros

---

## Mapeamento Atribuição → Aba

| `processo.atribuicao` | Nome da Aba |
|-----------------------|-------------|
| `GRUPO_JURI` | Júri |
| `VVD` | Violência Doméstica |
| `EXECUCAO_PENAL` | EP |
| `SUBSTITUICAO_CRIMINAL` | Substituição Criminal |
| `CURADORIA` | Curadoria |
| `PROTOCOLO_INTEGRADO` | Protocolo Integrado |
| `PLENARIOS` | Plenários |
| `LIBERDADE` | Liberdade |

---

## Ordem de Implementação

1. Credenciais Google Cloud (Service Account)
2. `sheets-sync.ts` com `pushDemanda` + `syncAll`
3. Modificações no router `demandas.ts`
4. Endpoint `/api/sheets/webhook`
5. Apps Script
6. UI de configurações

---

## Decisões de Design

- **App tem precedência** em conflitos
- **Coluna oculta `__id__`** como chave de ligação (sem depender de nome/processo)
- **Apps Script** em vez de polling ou Pub/Sub (gratuito, latência de segundos, sem infra extra)
- **Service Account** para autenticação (sem OAuth interativo, funciona em servidor)
- **Flag `skipSheetSync`** nos mutations para evitar loop infinito
