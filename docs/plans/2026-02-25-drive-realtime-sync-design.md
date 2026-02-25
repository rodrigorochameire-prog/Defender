# Design: Drive Real-Time Sync

## Problema

O OMBUDS sincroniza com Google Drive via `files.list` recursiva (O(n) total de arquivos) a cada sync. Com 5000+ arquivos, isso gera 50-100 API calls e 10-30s por sync. Webhook registration e renewal sao manuais. Se o canal expira, o sistema cai silenciosamente para polling de 15min sem alerta.

## Solucao: Changes API + Webhook Lifecycle Automatico

### 1. Sync Engine: files.list -> changes.list

Substituir full-listing por sync incremental via Changes API.

- Bootstrap (uma vez): `GET changes/getStartPageToken` -> salva token no campo `syncToken` (ja existe no schema `driveSyncFolders`)
- A cada sync: `GET changes.list(pageToken=syncToken)` -> retorna apenas delta
- Custo: 1-3 API calls vs 50-100

### 2. Webhook Auto-Registration

Ao registrar pasta via `registerFolder`:
1. `changes.getStartPageToken()` -> salva `syncToken`
2. `changes.watch()` com token -> Google retorna channelId + resourceId + expiration
3. Salva na tabela `driveWebhooks` automaticamente

### 3. Webhook Auto-Renewal (Inngest CRON diario)

- CRON `0 3 * * *`: busca canais que expiram em <24h
- Para cada: registra NOVO canal, para o ANTIGO
- Overlap intencional (~24h): handler e idempotente via token incremental

### 4. Webhook Handler Simplificado

```
POST /api/webhooks/drive
  1. Responde 200 OK (<100ms)
  2. Valida channelId + token secreto
  3. Se "sync" -> ignore
  4. Dispara Inngest "drive/incremental-sync" { channelId, folderId }
```

### 5. Inngest incremental-sync

```
1. Carrega syncToken do driveSyncFolders
2. changes.list(pageToken=syncToken)
3. Para cada change:
   - removed/trashed -> DELETE do drive_files
   - file existe -> UPSERT no drive_files
4. Pagina ate newStartPageToken -> salva no DB
5. Se newFileIds -> dispara "drive/auto-link-and-enrich"
```

Concurrency: 1 por folderId (debounce natural).

### 6. Safety Net: CRON Reduzido

- De 15min -> 5min
- Usa changes.list incremental (1 call se nada mudou)

### 7. Recuperacao 410 Gone

Se token invalidado:
1. Detecta HTTP 410
2. Limpa syncToken
3. Full-sync unico (files.list) para reconstruir
4. Grava novo startPageToken
5. Volta ao incremental

### 8. Health Check (CRON */30)

- Canais expirados sem renovacao
- Pastas sem sync ha 30+ min
- Erros recentes (>3/hora)
- Drift a cada 6h (count local vs Drive)
- Resultado: healthy | degraded | critical
- Notificacao para admins via sistema existente

### 9. UI: Indicador de Saude

DriveStatusBar ganha pulsinho:
- Verde: lastSyncAt < 10min
- Amarelo: 10-60min
- Vermelho: > 60min

## Arquivos a Modificar

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `src/lib/services/google-drive.ts` | `getStartPageToken()`, `watchChanges()`, `stopChannel()`, `syncIncremental()`, `renewChannels()`, `healthCheck()` |
| 2 | `src/app/api/webhooks/drive/route.ts` | Simplificar: validar -> Inngest event |
| 3 | `src/lib/inngest/functions.ts` | Nova `incrementalSyncFn`, atualizar CRON, nova `renewChannelsFn`, nova `healthCheckFn` |
| 4 | `src/lib/trpc/routers/drive.ts` | `registerFolder` auto-register webhook, `healthStatus` query |
| 5 | `src/components/drive/DriveStatusBar.tsx` | Indicador de saude |

## O que se Mantem

- Tabelas driveFiles, driveSyncFolders, driveWebhooks, driveSyncLogs
- Pipeline auto-link-and-enrich
- Queries tRPC de browsing
- UI components (DriveStatusBar, DriveTabEnhanced, SubpastaExplorer)
- Upload, rename, delete
- Distribution folder logic
