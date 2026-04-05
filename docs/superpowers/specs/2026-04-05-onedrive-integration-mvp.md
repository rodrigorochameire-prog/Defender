# OneDrive Integration MVP — Design Spec

> **Data:** 2026-04-05
> **Status:** Aprovado
> **Escopo:** Auth Microsoft per-user, Storage Abstraction Layer, OneDrive Provider CRUD, Settings UI, coexistência Google + OneDrive

---

## 1. Contexto

A Defensoria Pública da Bahia migrou para Microsoft 365. OMBUDS precisa suportar OneDrive como storage provider alternativo ao Google Drive, permitindo cada defensor configurar seu próprio OneDrive organizacional.

### Azure AD App (já configurado)

| Campo | Valor |
|-------|-------|
| Tenant ID | `4042ad54-d3b5-466d-92e0-c771e7b3581c` |
| Application (client) ID | `de618c3d-80de-481b-b068-7e044ae15110` |
| Client Secret | (armazenado em Apple Notes + env vars) |
| Redirect URIs | `https://ombuds.vercel.app/api/microsoft/callback`, `http://localhost:3000/api/microsoft/callback` |
| Permissions (Delegated) | User.Read, Files.ReadWrite, Files.ReadWrite.All, offline_access, Calendars.ReadWrite, Mail.Read, Sites.ReadWrite.All, User.ReadBasic.All |
| Tenant | Defensoria Pública do Estado da Bahia (`defensoria.ba.def.br`) |

### Princípio de coexistência

Google Drive e OneDrive coexistem. Um defensor pode:
- Trocar de Google para OneDrive sem perder arquivos antigos
- Manter os dois conectados durante transição
- Arquivos antigos (Google) e novos (OneDrive) aparecem juntos na mesma aba Drive

---

## 2. Arquitetura

### Arquivos a criar

```
src/lib/services/
  drive-provider.ts              ← interface DriveProvider + tipos DriveFile
  providers/
    google-drive-provider.ts     ← wrapper das funções existentes em google-drive.ts
    onedrive-provider.ts         ← Microsoft Graph implementation
    onedrive-auth.ts             ← MSAL token management
  drive-factory.ts               ← getProviderForUser(userId) → DriveProvider

src/app/api/microsoft/
  auth/route.ts                  ← inicia OAuth flow
  callback/route.ts              ← recebe code, troca por tokens

src/lib/db/schema/
  microsoft-tokens.ts            ← tabela user_microsoft_tokens
```

### Arquivos a modificar

```
src/lib/db/schema/drive.ts       ← coluna `provider` em drive_files e drive_sync_folders
src/lib/db/schema/users.ts       ← coluna `storage_provider` em users (ou user_settings)
src/lib/trpc/routers/drive.ts    ← usar factory ao invés de google-drive.ts direto
src/app/(dashboard)/admin/settings/ ← UI de conexão OneDrive
```

---

## 3. Auth Flow Microsoft

### Fluxo OAuth2 Authorization Code

```
1. Defensor clica "Conectar OneDrive" em Settings
2. GET /api/microsoft/auth
   → Gera state token + PKCE code_verifier
   → Redireciona para:
     https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize
     ?client_id={clientId}
     &response_type=code
     &redirect_uri={redirectUri}
     &scope=Files.ReadWrite Files.ReadWrite.All offline_access User.Read
     &state={stateToken}
     &code_challenge={codeChallenge}
     &code_challenge_method=S256

3. Defensor autoriza no Microsoft
4. Redirect para /api/microsoft/callback?code={code}&state={state}
5. POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
   → Troca code por access_token + refresh_token
6. GET https://graph.microsoft.com/v1.0/me
   → Obtém email e nome do usuário Microsoft
7. Salva em user_microsoft_tokens:
   - userId, accessToken, refreshToken, expiresAt, email, displayName
8. Atualiza user: storageProvider = "onedrive"
9. Redireciona para Settings com toast de sucesso
```

### Token refresh

Antes de cada chamada ao Graph API:
1. Verifica se `expiresAt` < now + 5min
2. Se expirado: POST ao token endpoint com refresh_token
3. Atualiza access_token e expiresAt no banco
4. Se refresh falhar (token revogado): marca como desconectado, notifica user

### State + PKCE storage

O `state` token e `code_verifier` são armazenados em cookie HTTP-only criptografado (`ms-auth-state`) com expiração de 10 minutos. No callback, o cookie é lido, validado contra o `state` da query string, e o `code_verifier` é usado para o token exchange. O cookie é apagado após uso.

### Env vars

```
MICROSOFT_CLIENT_ID=     # ver Apple Notes "OMBUDS — Azure AD Credentials"
MICROSOFT_CLIENT_SECRET= # ver Apple Notes
MICROSOFT_TENANT_ID=     # ver Apple Notes
MICROSOFT_REDIRECT_URI=  # https://ombuds.vercel.app/api/microsoft/callback (ou localhost)
```

### Package e abordagem

**Auth (token exchange/refresh):** `@azure/msal-node` v2.x — ConfidentialClientApplication para `acquireTokenByCode` e `acquireTokenSilent`. Gerencia o ciclo de vida dos tokens sem lógica manual de refresh.

**Graph API calls:** Raw fetch contra `https://graph.microsoft.com/v1.0` usando o access_token obtido pelo MSAL. Sem SDK de Graph — mantém padrão do projeto (Google Drive também usa raw fetch).

---

## 4. Schema Changes

### Nova tabela: `user_microsoft_tokens`

```typescript
export const userMicrosoftTokens = pgTable("user_microsoft_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  email: varchar("email", { length: 255 }),
  displayName: varchar("display_name", { length: 255 }),
  microsoftUserId: varchar("microsoft_user_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Coluna em `drive_files`

```sql
ALTER TABLE drive_files ADD COLUMN provider varchar(20) DEFAULT 'google';
-- Unique constraint deve ser scoped ao provider:
-- DROP INDEX IF EXISTS drive_files_drive_file_id_unique;
-- CREATE UNIQUE INDEX drive_files_provider_file_id_unique ON drive_files (drive_file_id, provider);
```

### Coluna em `drive_sync_folders`

```sql
ALTER TABLE drive_sync_folders ADD COLUMN provider varchar(20) DEFAULT 'google';
```

### Coluna em `drive_sync_logs`

```sql
ALTER TABLE drive_sync_logs ADD COLUMN provider varchar(20) DEFAULT 'google';
```

### Coluna em `users`

Adicionar `onedrive_root_folder_id` para armazenar a pasta raiz do OneDrive (equivalente ao `drive_folder_id` existente para Google):

```sql
ALTER TABLE users ADD COLUMN onedrive_root_folder_id varchar(100);
ALTER TABLE users ADD COLUMN microsoft_linked boolean DEFAULT false;
```

### Coluna em users (ou user_settings)

```sql
ALTER TABLE users ADD COLUMN storage_provider varchar(20) DEFAULT 'google';
```

---

## 5. Storage Abstraction Layer

### Interface DriveProvider

```typescript
interface DriveProvider {
  getProviderName(): "google" | "onedrive";

  // Arquivos
  listFiles(folderId: string, options?: { pageSize?: number }): Promise<DriveFile[]>;
  getFileInfo(fileId: string): Promise<DriveFile>;
  uploadFile(buffer: Buffer, name: string, mimeType: string, folderId: string): Promise<DriveFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<DriveFile>;
  moveFile(fileId: string, targetFolderId: string): Promise<DriveFile>;

  // Pastas
  createFolder(name: string, parentId: string): Promise<DriveFile>;
  findFolderByName(name: string, parentId: string): Promise<DriveFile | null>;

  // Sync (MVP: apenas getChanges, webhooks no próximo ciclo)
  getChanges(syncToken?: string): Promise<{ items: DriveFile[]; newToken: string }>;

  // URLs
  getDownloadUrl(fileId: string): Promise<string>;
  getWebViewUrl(fileId: string): Promise<string>;
}
```

### Tipo normalizado DriveFile

```typescript
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  parentId: string | null;
  webUrl: string | null;
  downloadUrl: string | null;
  isFolder: boolean;
  provider: "google" | "onedrive";
}
```

### Factory

```typescript
// drive-factory.ts
async function getDriveProvider(userId: number): Promise<DriveProvider> {
  // 1. Verifica a preferência do usuário
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storageProvider: true }
  });
  const preferred = user?.storageProvider ?? "google";

  // 2. Busca token do provider preferido
  if (preferred === "onedrive") {
    const msToken = await db.query.userMicrosoftTokens.findFirst({
      where: eq(userMicrosoftTokens.userId, userId)
    });
    if (msToken) return new OneDriveProvider(msToken);
    // fallback para Google se OneDrive sem token
  }

  const googleToken = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId)
  });
  if (googleToken) return new GoogleDriveProvider(googleToken);

  throw new Error("Nenhum storage provider configurado");
}

// Para acessar arquivo específico (pode ser de provider diferente do ativo)
async function getProviderForFile(fileProvider: "google" | "onedrive", userId: number): Promise<DriveProvider> {
  if (fileProvider === "onedrive") {
    const msToken = await db.query.userMicrosoftTokens.findFirst({
      where: eq(userMicrosoftTokens.userId, userId)
    });
    if (!msToken) throw new Error("OneDrive desconectado");
    return new OneDriveProvider(msToken);
  }
  const googleToken = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId)
  });
  if (!googleToken) throw new Error("Google Drive desconectado");
  return new GoogleDriveProvider(googleToken);
}
```

### GoogleDriveProvider

Wrapper fino que delega para as funções existentes em `google-drive.ts` e `google-drive-peruser.ts`. Zero refactor das 4.420 linhas — apenas adapta inputs/outputs para a interface `DriveProvider`.

### OneDriveProvider

Implementação direta usando fetch contra Microsoft Graph `https://graph.microsoft.com/v1.0`:

| Método | Graph Endpoint |
|--------|---------------|
| listFiles | `GET /me/drive/items/{id}/children` |
| getFileInfo | `GET /me/drive/items/{id}` |
| uploadFile (<4MB) | `PUT /me/drive/items/{folderId}:/{name}:/content` |
| uploadFile (≥4MB) | Upload session (`createUploadSession`) |
| downloadFile | `GET /me/drive/items/{id}/content` |
| deleteFile | `DELETE /me/drive/items/{id}` |
| renameFile | `PATCH /me/drive/items/{id}` body: `{ name }` |
| moveFile | `PATCH /me/drive/items/{id}` body: `{ parentReference: { id } }` |
| createFolder | `POST /me/drive/items/{id}/children` body: `{ name, folder: {} }` |
| findFolderByName | `GET /me/drive/items/{id}/children?$filter=name eq '{name}'` |
| getChanges | `GET /me/drive/root/delta` |
| getDownloadUrl | `@microsoft.graph.downloadUrl` do item metadata |
| getWebViewUrl | `webUrl` do item metadata |

---

## 6. Coexistência Google + OneDrive

### Ao trocar de provider

1. Defensor conecta OneDrive → `users.storage_provider = "onedrive"`
2. Novos uploads/pastas → OneDrive (`drive_files.provider = "onedrive"`)
3. Arquivos antigos → continuam com `provider = "google"`, acessíveis via GoogleDriveProvider
4. Na aba Drive: busca `drive_files` do assistido independente do provider. Para cada arquivo, usa o provider correto para download/preview.
5. Google Drive NÃO é desconectado automaticamente — mantém acesso paralelo

### Se desconectar Google depois

- Arquivos `provider = "google"` ficam no banco mas sem acesso (token removido)
- UI mostra badge "Google Drive desconectado" nesses arquivos
- Arquivos continuam existindo no Google Drive pessoal do defensor

---

## 7. UI — Settings

Nova seção "Armazenamento" na página de configurações:

**Quando nenhum conectado:**
- Card Google Drive com botão "Conectar Google Drive"
- Card OneDrive com botão "Conectar OneDrive"

**Quando Google conectado (estado atual):**
- Card Google Drive: email, badge "Ativo", botão "Desconectar"
- Card OneDrive: botão "Conectar OneDrive"

**Quando OneDrive conectado:**
- Card Google Drive: email (se ainda conectado), badge "Arquivos anteriores", ou botão "Conectar"
- Card OneDrive: email Microsoft, badge "Ativo", botão "Desconectar"

**Switch de provider:** Ao conectar o segundo, pergunta "Usar OneDrive para novos arquivos?" → Se sim, atualiza `storage_provider`.

---

## 8. Aba Drive do Assistido

Sem mudanças visuais. Internamente:

1. Query `drive_files WHERE assistido_id = X` (retorna mix de providers)
2. Para cada operação (download, preview, delete), verifica `file.provider` e usa o factory correto
3. Upload: usa o provider ativo do defensor (`users.storage_provider`)
4. Criar pasta de assistido: usa o provider ativo

---

## 9. Router drive.ts — escopo do refactor MVP

O router `drive.ts` (5.131 linhas) importa ~40 funções de `google-drive.ts`. No MVP, **não refatoramos todo o router**. Estratégia:

**Rotas que passam pelo factory (MVP):**
- `listFiles`, `uploadFile`, `downloadFile`, `deleteFile`, `getFileInfo`, `createFolder` — as operações CRUD básicas que o DriveProvider cobre.

**Rotas que continuam chamando Google direto (sem mudança):**
- `syncFolderWithDatabase`, `smartSync`, `watchChanges` — sync/webhooks (próximo ciclo)
- `createGoogleDoc`, `updateGoogleDoc`, `exportGoogleDocAsPdf` — document generation (próximo ciclo)
- `syncPautaDocument`, `registrarAudienciaNoDrive` — integrações específicas
- Enrichment pipeline (`classifyDocument`, `extractSections`) — funciona via `downloadFile` que já vai usar o factory

**Resultado:** As rotas CRUD passam pelo factory (OneDrive funciona). As rotas avançadas continuam Google-only sem quebrar. Progressivamente migradas nos próximos ciclos.

---

## 10. Fora do escopo (próximos ciclos)

- Sync incremental + webhooks OneDrive (delta polling como interim)
- Document generation (.docx via docxtemplater)
- Calendar migration (Google → Microsoft)
- Migração em massa de arquivos Google → OneDrive
- SharePoint sites integration
- Mail.Read integration
- Offline support

---

## 10. Decisões de design validadas

| Decisão | Escolha |
|---------|---------|
| Provider architecture | Abstraction layer com interface DriveProvider |
| Google refactor | Wrapper fino, zero mudança no código existente |
| OneDrive implementation | Raw fetch contra Graph API (sem SDK pesado) |
| Auth | MSAL node + OAuth2 auth code + PKCE |
| Token storage | Tabela dedicada user_microsoft_tokens |
| Coexistência | Dual-provider, arquivos antigos acessíveis, switch suave |
| DB | Coluna `provider` em drive_files + `storage_provider` em users |
| UI scope | Settings page + aba Drive sem mudanças visuais |
| Tenant | Defensoria BA (single tenant, pode mudar para common) |
