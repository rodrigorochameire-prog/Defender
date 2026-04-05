# Microsoft 365 / OneDrive Integration — Viability Report & Spec

> **Data:** 2026-04-04
> **Status:** Aprovado para MVP
> **Escopo:** Integração OneDrive per-user para defensores gerenciarem arquivos via OMBUDS

---

## 1. Contexto

A Defensoria migrou o workspace para Microsoft 365. OMBUDS atualmente usa Google Drive como storage core (45 funções, ~9.500 linhas). Precisamos viabilizar OneDrive como alternativa, permitindo cada defensor configurar seu próprio OneDrive.

## 2. Integração Atual com Google

| Serviço | Profundidade | Arquivos Principais |
|---------|-------------|-------------------|
| Google Drive | Core — 45 funções, sync, webhooks, folders | `google-drive.ts` (4.420 linhas), `drive.ts` router (5.131 linhas) |
| Google Docs | Deep — ofícios, modelos | `google-drive.ts` |
| Google Sheets | Medium — sync demandas/VVD | `google-sheets.ts`, `google-sheets-peruser.ts` |
| Google Calendar | Medium — eventos audiências | `google-calendar.ts` |

## 3. Mapeamento API (Google → Microsoft Graph)

| Google Drive Operation | MS Graph Equivalent |
|---|---|
| `files.list` (folder) | `GET /drive/items/{id}/children` |
| `files.create` (folder) | `POST /drive/items/{id}/children` com folder facet |
| `files.create` (upload) | `PUT /drive/items/{id}:/filename:/content` |
| `files.update` (rename/move) | `PATCH /drive/items/{id}` |
| `files.copy` | `POST /drive/items/{id}/copy` |
| `files.delete` | `DELETE /drive/items/{id}` |
| `files.get` (metadata) | `GET /drive/items/{id}` |
| `files.get` (download) | `GET /drive/items/{id}/content` |
| `changes.list` (sync) | `GET /drive/root/delta` |
| `channels.watch` (webhook) | `POST /subscriptions` (expira em ~3 dias) |
| Google Doc create | `.docx` via docxtemplater + upload |
| Export Doc as PDF | `GET /drive/items/{id}/content?format=pdf` |

## 4. Auth Architecture — Azure AD

### Per-user OAuth (principal para MVP)
- Azure AD App Registration com Delegated permissions
- Scopes: `Files.ReadWrite`, `offline_access`, `User.Read`
- Auth code flow → callback → refresh_token armazenado
- Refresh tokens duram até 90 dias

### Env vars necessárias
```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common  # ou tenant específico da Defensoria
MICROSOFT_REDIRECT_URI=
```

## 5. NPM Packages

| Package | Uso |
|---------|-----|
| `@microsoft/microsoft-graph-client` | Client Graph API |
| `@azure/msal-node` | Auth MSAL (token management) |
| `docxtemplater` + `pizzip` | Geração de .docx |
| `mammoth` | .docx → HTML (leitura) |

## 6. Estratégia — Abstraction Layer

```
DriveProvider (interface)
├── GoogleDriveProvider (wrapper do código atual)
└── OneDriveProvider (novo, Microsoft Graph)
```

DB: coluna `provider` em `drive_files` e `drive_sync_folders`.

## 7. Riscos

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Criação de docs (sem Google Docs equiv.) | ALTO | docxtemplater para .docx |
| Webhooks expiram em 3 dias | MÉDIO | Renewal mais frequente |
| Service Account requer Entra ID org | MÉDIO | MVP usa apenas Delegated (per-user) |
| File IDs diferentes entre providers | MÉDIO | Coluna `provider` no DB |

## 8. Estimativa

| Componente | Tamanho | Tempo |
|-----------|---------|-------|
| Auth Azure AD + rotas | S | 1 semana |
| Core file operations | M | 1 semana |
| Folder hierarchy | M | 1 semana |
| Sync + webhooks | M | 1 semana |
| Document generation | L | 2 semanas |
| Abstraction layer | L | 2 semanas |
| Testing E2E | L | 2-3 semanas |
| **MVP (per-user, sem Google fallback)** | | **8-10 semanas** |
