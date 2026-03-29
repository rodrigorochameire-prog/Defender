# Sync Google Sheets por Defensor — Spec

**Data:** 2026-03-29
**Prioridade:** Próxima sessão
**Status:** Documentado, não implementado

---

## 1. Problema

Hoje o Google Sheets sync é global (1 token, 1 planilha para todo o sistema). Com 25 defensores em 5 comarcas, cada defensor precisa da sua própria planilha sincronizando suas demandas.

## 2. Fluxo Desejado

```
Defensor clica "Sincronizar Planilha" no menu
  ↓
Se NÃO tem Google vinculado:
  → Tela de instrução guiada (passo-a-passo visual)
  → Botão "Vincular minha conta Google"
  → Popup OAuth do Google (pedir permissão)
  → Token salvo no banco vinculado ao userId
  → Retorna ao OMBUDS
  ↓
Se TEM Google vinculado mas NÃO tem planilha:
  → Botão "Criar minha planilha"
  → Sistema cria planilha no Google Drive do defensor
  → Planilha nomeada: "OMBUDS — [Nome] — [Comarca]"
  → Abas criadas baseadas nas áreas do defensor:
    - Criminal → aba "Demandas Criminal"
    - Júri → aba "Demandas Júri"
    - EP → aba "Demandas EP"
    - VVD → aba "Demandas VVD"
    - Infância → aba "Demandas Infância"
    - Cível → aba "Demandas Cível"
    - Família → aba "Demandas Família"
  → Headers pré-formatados em cada aba
  → Link da planilha salvo no banco
  ↓
Se TEM planilha vinculada:
  → Mostra link para a planilha
  → Status do sync (última sync, próxima sync)
  → Botão "Sincronizar agora"
  → Toggle on/off para sync automático
  → Opção de desvincular
```

## 3. Alterações Necessárias

### 3.1 Banco de dados

#### Modificar `google_tokens` → tornar per-user

```sql
-- Opção A: adicionar user_id à tabela existente
ALTER TABLE google_tokens ADD COLUMN user_id integer REFERENCES users(id);
CREATE UNIQUE INDEX google_tokens_user_idx ON google_tokens(user_id);

-- OU Opção B: nova tabela (mais limpo)
CREATE TABLE user_google_tokens (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  refresh_token text NOT NULL,
  access_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Nova tabela ou campo para planilha vinculada

```sql
-- Adicionar campos em users OU criar tabela separada
-- Opção simples: campos no user
ALTER TABLE users ADD COLUMN sheets_spreadsheet_id varchar(100);
ALTER TABLE users ADD COLUMN sheets_spreadsheet_url text;
ALTER TABLE users ADD COLUMN sheets_sync_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN sheets_last_sync timestamptz;
```

### 3.2 OAuth per-user

#### Modificar `/api/google/auth`
- Receber `userId` como state parameter no OAuth flow
- Quando callback retorna, salvar token vinculado ao userId (não só email)

```typescript
// auth/route.ts — adicionar userId ao state
const state = JSON.stringify({ userId: session.userId });
authUrl.searchParams.set("state", state);

// callback/route.ts — recuperar userId do state
const state = JSON.parse(request.nextUrl.searchParams.get("state") || "{}");
const userId = state.userId;
// Salvar token para esse userId
```

### 3.3 Criação automática de planilha

#### Função `createUserSpreadsheet(userId)`

```typescript
async function createUserSpreadsheet(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  const token = await getUserGoogleToken(userId);

  // Determinar abas baseado nas áreas
  const areaToTab: Record<string, string> = {
    CRIMINAL: "Demandas Criminal",
    JURI: "Demandas Júri",
    EXECUCAO_PENAL: "Demandas EP",
    VIOLENCIA_DOMESTICA: "Demandas VVD",
    INFANCIA_JUVENTUDE: "Demandas Infância",
    CIVEL: "Demandas Cível",
    FAMILIA: "Demandas Família",
    FAZENDA_PUBLICA: "Demandas Fazenda Pública",
  };

  const tabs = (user.areasPrincipais ?? [])
    .map(area => areaToTab[area])
    .filter(Boolean);

  // Se não tem áreas definidas, criar aba genérica
  if (tabs.length === 0) tabs.push("Demandas");

  // Criar planilha via Google Sheets API
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `OMBUDS — ${user.name} — ${comarca.nome}`,
      },
      sheets: tabs.map((title, i) => ({
        properties: { sheetId: i, title, index: i },
      })),
    },
  });

  // Adicionar headers em cada aba
  const headers = [
    "__id__", "Status", "Réu Preso", "Data Entrada",
    "Assistido", "Nº Autos", "Ato", "Prazo",
    "Providências", "Delegado Para",
  ];

  // ... batch update para adicionar headers + formatação

  // Salvar ID da planilha no user
  await db.update(users).set({
    sheetsSpreadsheetId: spreadsheet.data.spreadsheetId,
    sheetsSpreadsheetUrl: spreadsheet.data.spreadsheetUrl,
    sheetsSyncEnabled: true,
  }).where(eq(users.id, userId));

  return spreadsheet;
}
```

### 3.4 Sync Engine per-user

#### Modificar `sync-engine.ts`

Hoje o sync engine trabalha com uma planilha global. Precisa:

1. Receber `userId` como parâmetro
2. Buscar o token Google do user
3. Buscar a planilha do user
4. Sync apenas as demandas daquele defensor
5. Escrever nas abas corretas baseado na área de cada demanda

```typescript
async function syncUserDemandas(userId: number) {
  const user = await getUser(userId);
  const token = await getUserGoogleToken(userId);
  const demandas = await getUserDemandas(userId);

  // Agrupar demandas por área
  const byArea = groupBy(demandas, d => d.processo?.area ?? "CRIMINAL");

  // Para cada área, sync com a aba correspondente
  for (const [area, areaDemandas] of Object.entries(byArea)) {
    const tabName = areaToTab[area];
    await syncToTab(user.sheetsSpreadsheetId, tabName, areaDemandas, token);
  }
}
```

### 3.5 Página do defensor

#### Nova página ou seção em configurações

`/admin/settings/planilha` ou integrar em `/admin/settings`

**Estado 1 — Sem Google vinculado:**
```
┌──────────────────────────────────────────────────┐
│  📊 Sincronizar com Google Sheets                │
│                                                  │
│  Sincronize suas demandas com uma planilha do    │
│  Google para acompanhar de qualquer lugar.       │
│                                                  │
│  ━━━ Passo a passo ━━━                          │
│                                                  │
│  1️⃣ Clique no botão abaixo                      │
│  2️⃣ Uma janela do Google vai abrir              │
│  3️⃣ Faça login com seu email Google             │
│  4️⃣ Clique em "Permitir"                        │
│  5️⃣ Pronto! Voltará automaticamente             │
│                                                  │
│  ⓘ O OMBUDS só acessa sua planilha. Não lemos   │
│    seus emails ou outros arquivos.               │
│                                                  │
│         [ 🔗 Vincular minha conta Google ]       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Estado 2 — Google vinculado, sem planilha:**
```
┌──────────────────────────────────────────────────┐
│  📊 Sincronizar com Google Sheets                │
│                                                  │
│  ✅ Google vinculado: fulano@gmail.com           │
│                                                  │
│  Vamos criar sua planilha personalizada com      │
│  abas para cada área que você atua:              │
│                                                  │
│  🟣 Demandas Júri                               │
│  🟠 Demandas EP                                 │
│  🔴 Demandas Criminal                           │
│                                                  │
│         [ 📊 Criar minha planilha ]              │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Estado 3 — Tudo vinculado:**
```
┌──────────────────────────────────────────────────┐
│  📊 Google Sheets — Sincronizado                 │
│                                                  │
│  📎 OMBUDS — Dr. Fulano — Camaçari              │
│     [ Abrir planilha ↗ ]                         │
│                                                  │
│  Última sync: há 5 minutos                       │
│  Demandas sincronizadas: 47                      │
│                                                  │
│  🔄 Sync automático: [ON]                       │
│                                                  │
│  [ Sincronizar agora ]  [ Desvincular ]          │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 3.6 Sidebar

Adicionar item "Planilha" no MAIN_NAV para defensores:
```typescript
{ label: "Planilha", path: "/admin/settings/planilha", icon: "Sheet" }
```

## 4. Considerações

### OAuth Google — configuração necessária

O Google OAuth já está configurado (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET em .env). O escopo `drive` já inclui Sheets. Mas o callback atual (`/api/google/callback`) salva token globalmente. Precisa ser modificado para per-user.

### Permissões Google Cloud Console

No Google Cloud Console, verificar se o projeto tem a **Sheets API** habilitada (provavelmente já tem, dado que `google-sheets.ts` existe). Se não, habilitar em APIs & Services → Library → Google Sheets API.

### Rate limits

Google Sheets API: 300 requests/min por projeto. Com 25 defensores, sync a cada 5 min = 5 req/defensor × 25 = 125 req/5min. Dentro do limite.

### Conflitos

O sync engine existente já tem sistema de detecção de conflitos e resolução (PLANILHA/BANCO/CUSTOM). Reusar para o per-user sync.

### Segurança

Cada defensor só acessa sua própria planilha via seu próprio token. O admin (Rodrigo) pode ver todas as planilhas via o painel de equipe.

## 5. Estimativa

| Task | Tempo |
|------|-------|
| Tabela user_google_tokens + campos sheets no user | 15min |
| OAuth per-user (modificar auth + callback) | 30min |
| Criação automática de planilha | 45min |
| Sync engine per-user | 1h |
| Página do defensor (3 estados) | 45min |
| Testes | 30min |
| **Total** | **~3.5h** |

## 6. Dependências

- Google Cloud Console: Sheets API habilitada
- GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET configurados (já estão)
- Scope `drive` no OAuth (já está)

## 7. Não fazer agora

- Sync com Excel/OneDrive (muito mais complexo, demanda diferente)
- Compartilhamento de planilha entre defensores (futuro)
- Edição de layout das abas pelo defensor (fixo por área)
