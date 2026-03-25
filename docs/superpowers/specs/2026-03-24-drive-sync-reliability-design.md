# Drive Sync Reliability — Design Doc

**Data:** 2026-03-24
**Branch:** feat/sheets-noticias-redesign
**Escopo:** Correções de bugs + watchdog cron + painel de status no admin

---

## Contexto

O sistema de sync com Google Drive tem 4 bugs identificados por diagnóstico direto do banco e leitura do código:

1. **Bug: webhook secret não passado** — `registerWebhookForFolder` registra canais no Google sem incluir o `token` (secret). Quando o Google envia a notificação, o header `x-goog-channel-token` vem vazio. Se `DRIVE_WEBHOOK_SECRET` estiver definido no env, o handler rejeita com 401. Os webhooks são inúteis nesse cenário.

2. **Bug: canais expirados acumulam no banco** — A tabela `driveWebhooks` tem 52 registros, 40 deles com `expiration < now()` e `isActive: true`. O job de renovação (`renewChannelsFn`) renova canais prestes a expirar, mas não limpa os já expirados.

3. **Bug: VVD sem sync há 15 dias — causa real: duplicate key** — Confirmado via `driveSyncLogs.errorMessage`: `duplicate key value violates unique constraint "drive_files_drive_file_id_unique"`. O `syncIncremental` usa um `db.insert()` sem `onConflictDoUpdate`, então quando um arquivo já existe em `driveFiles` com um `driveFolderId` diferente (dois sync folders com sobreposição de arquivos), o INSERT explode. Isso joga exceção, o catch do `syncIncremental` retorna `success: false` e `newSyncToken: null`, e o `smartSync` não atualiza `lastSyncAt`. A pasta fica estagnada permanentemente.

4. **Falta de visibilidade** — erros ficam invisíveis; nenhuma UI mostra o estado do sync.

**Estado atual:**
```
driveSyncFolders: 7 pastas ativas
driveWebhooks:    52 canais (40 expirados marcados isActive: true, 12 ativos válidos)
Sync VVD:         falha com duplicate key em cada tentativa desde 09/03
Cron 30 min:      funciona para as outras 5 pastas
Webhooks:         sem efeito (bug do secret)
```

---

## Solução

### 1. Correções de Bugs

#### Bug 1: Webhook secret

**Arquivo:** `src/lib/services/google-drive.ts` — `registerWebhookForFolder` (linha ~720)

```ts
// Antes:
const watchResult = await watchChanges(syncToken, webhookUrl);

// Depois:
const watchResult = await watchChanges(syncToken, webhookUrl, process.env.DRIVE_WEBHOOK_SECRET);
```

#### Bug 2: Canais expirados não são limpos

**Arquivo:** `src/lib/services/google-drive.ts` — `renewExpiringChannels`

Adicionar **no início** da função (antes da query de canais prestes a expirar):

```ts
// Passo 0: limpar canais já expirados
await db
  .update(driveWebhooks)
  .set({ isActive: false })
  .where(and(eq(driveWebhooks.isActive, true), lt(driveWebhooks.expiration, new Date())));
```

Também ampliar a janela de renovação de 24h → 48h. Alternativa: manter 24h mas rodar o cron duas vezes por dia (`0 3,15 * * *`). Escolha: **janela 48h** — é o menor número de mudanças, sem risco de jitter entre runs.

#### Bug 3: Duplicate key no INSERT do syncIncremental

**Arquivo:** `src/lib/services/google-drive.ts` — `syncIncremental` (INSERT de novo arquivo, linha ~535)

Mudar o `db.insert(driveFiles).values({...}).returning(...)` para usar `onConflictDoUpdate`:

```ts
const [inserted] = await db
  .insert(driveFiles)
  .values({ driveFileId: file.id, driveFolderId: folderId, ... })
  .onConflictDoUpdate({
    target: driveFiles.driveFileId,
    set: {
      name: file.name,
      mimeType: file.mimeType,
      fileSize: file.size ? parseInt(file.size) : null,
      webViewLink: file.webViewLink,
      lastModifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : null,
      driveChecksum: file.md5Checksum,
      syncStatus: "synced",
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    },
  })
  .returning({ id: driveFiles.id });
```

Isso transforma o conflito em upsert, evitando a exceção. O `result.filesAdded` vai ser incrementado mesmo que seja um upsert — aceitável.

---

### 2. Watchdog Cron (a cada 5 minutos)

**Arquivo:** `src/lib/inngest/functions.ts` — nova função

```ts
export const driveWatchdogFn = inngest.createFunction(
  {
    id: "drive-watchdog",
    name: "Drive Sync Watchdog",
    retries: 0,
    rateLimit: { limit: 1, period: "5m" }, // max 1 run global por 5 min
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const staleThreshold = new Date(Date.now() - 20 * 60 * 1000);

    const staleFolders = await step.run("find-stale-folders", async () => {
      return db.select().from(driveSyncFolders).where(
        and(
          eq(driveSyncFolders.isActive, true),
          or(
            lt(driveSyncFolders.lastSyncAt, staleThreshold),
            isNull(driveSyncFolders.lastSyncAt)
          )
        )
      );
    });

    for (const folder of staleFolders) {
      await inngest.send({
        name: "drive/incremental-sync",
        data: { folderId: folder.driveFolderId, triggerSource: "watchdog" },
      });
    }

    return { staleFolders: staleFolders.length };
  }
);
```

**Proteção contra event storms:** O `incrementalSyncFn` já tem `concurrency: { limit: 1, key: "event.data.folderId" }` que impede runs paralelos por pasta e serializa a fila por pasta. Isso é suficiente — **não adicionar `rateLimit`** ao `incrementalSyncFn`.

Razão: `rateLimit` descarta eventos (não apenas serializa). Se um sync falha e logo em seguida o watchdog envia um novo evento para a mesma pasta, o `rateLimit` descartaria esse retry na mesma janela de 5 minutos — exatamente o cenário que o watchdog deve corrigir. O `concurrency` já garante que não há dois runs simultâneos; eventos extras ficam em fila e serão processados sequencialmente, o que é o comportamento correto.

Registrar `driveWatchdogFn` no array `functions`.

---

### 3. Painel de Status de Sync — `/admin/drive-sync`

**Arquivos:**
- `src/app/(dashboard)/admin/drive-sync/page.tsx` — nova página
- `src/lib/trpc/routers/drive.ts` — 3 adições

#### Contexto: queries existentes

- `drive.healthStatus` → chama `checkSyncHealth()` → retorna stats globais (contagens)
- `drive.syncDashboard` → foco em assistidos vinculados vs. não-vinculados por atribuição

A nova query `drive.getSyncStatus` é complementar, focada em **saúde de sync por pasta** (lastSyncAt, webhook, erros recentes).

#### tRPC query: `drive.getSyncStatus`

**Nota sobre N+1:** A query faz 2 queries adicionais por pasta (file count + webhook ativo). Com 7 pastas isso são ~15 queries por chamada. Para uma página admin com refresh de 30s isso é aceitável. Não é necessário otimizar agora.

**Nota sobre erros:** `driveSyncLogs` não tem coluna `folderId` — não é possível escopar erros por pasta sem migration. O campo `recentErrors` vem do `checkSyncHealth()` global e é exibido no header global, não por pasta.

```ts
getSyncStatus: adminProcedure.query(async () => {
  const now = new Date();

  // Batch 1: pastas ativas
  const folders = await db.select().from(driveSyncFolders)
    .where(eq(driveSyncFolders.isActive, true));

  // Batch 2: file counts por pasta (uma query com GROUP BY)
  const fileCounts = await db
    .select({
      driveFolderId: driveFiles.driveFolderId,
      count: sql<number>`count(*)::int`,
    })
    .from(driveFiles)
    .groupBy(driveFiles.driveFolderId);

  const fileCountMap = new Map(fileCounts.map(r => [r.driveFolderId, r.count]));

  // Batch 3: webhook ativo mais recente por pasta
  const activeWebhooks = await db
    .select({
      folderId: driveWebhooks.folderId,
      channelId: driveWebhooks.channelId,
      expiration: driveWebhooks.expiration,
    })
    .from(driveWebhooks)
    .where(and(
      eq(driveWebhooks.isActive, true),
      gt(driveWebhooks.expiration, now)
    ))
    .orderBy(desc(driveWebhooks.expiration));

  // Pega o webhook mais recente por pasta
  const webhookMap = new Map<string, { channelId: string; expiration: Date }>();
  for (const w of activeWebhooks) {
    if (!webhookMap.has(w.folderId)) {
      webhookMap.set(w.folderId, { channelId: w.channelId, expiration: w.expiration });
    }
  }

  const result = folders.map((folder) => {
    const webhook = webhookMap.get(folder.driveFolderId) ?? null;
    const syncAgoMs = folder.lastSyncAt ? now.getTime() - folder.lastSyncAt.getTime() : null;
    const syncAgoMin = syncAgoMs !== null ? Math.floor(syncAgoMs / 60000) : null;

    const health: "healthy" | "warning" | "critical" =
      !folder.lastSyncAt || syncAgoMin! > 60 ? "critical"
      : syncAgoMin! > 15 || !webhook ? "warning"
      : "healthy";

    return {
      id: folder.id,
      name: folder.name,
      driveFolderId: folder.driveFolderId,
      lastSyncAt: folder.lastSyncAt,
      syncAgoMin,
      fileCount: Number(fileCountMap.get(folder.driveFolderId) ?? 0),
      hasSyncToken: !!folder.syncToken,
      health,
      activeWebhook: webhook,
    };
  });

  // Global stats (via checkSyncHealth existente)
  const globalHealth = await checkSyncHealth();

  return { folders: result, global: globalHealth };
}),
```

**Importações necessárias em `drive.ts`:**
- Adicionar `driveWebhooks` ao import de `@/lib/db`
- Adicionar `stopChannel` ao import de `@/lib/services/google-drive`

#### tRPC mutation: `drive.forceSyncFolder`

```ts
forceSyncFolder: adminProcedure
  .input(z.object({ driveFolderId: z.string() }))
  .mutation(async ({ input }) => {
    await inngest.send({
      name: "drive/incremental-sync",
      data: { folderId: input.driveFolderId, triggerSource: "admin-force" },
    });
    return { dispatched: true };
  }),
```

#### tRPC mutation: `drive.cleanExpiredChannels`

```ts
cleanExpiredChannels: adminProcedure.mutation(async () => {
  // 1. Mark expired channels inactive in DB
  const result = await db
    .update(driveWebhooks)
    .set({ isActive: false })
    .where(and(
      eq(driveWebhooks.isActive, true),
      lt(driveWebhooks.expiration, new Date())
    ))
    .returning({ channelId: driveWebhooks.channelId, resourceId: driveWebhooks.resourceId });

  // 2. Stop each expired channel on Google's side (best-effort, ignore errors)
  for (const ch of result) {
    if (ch.resourceId) {
      stopChannel(ch.channelId, ch.resourceId).catch(() => {});
    }
  }

  return { cleaned: result.length };
}),
```

Nota: `stopChannel` é best-effort porque os canais provavelmente já expiraram no lado do Google — o 404 é tratado como sucesso dentro de `stopChannel`.

#### UI: Página `/admin/drive-sync`

**Layout:**
- Header com status global (badge verde/amarelo/vermelho + "X erros na última hora")
- Grid de cards (1 por pasta monitorada)
- Botão "Limpar canais expirados" no header

**Cada card de pasta:**
- Nome + badge de saúde (verde = `healthy`, amarelo = `warning`, vermelho = `critical`)
- "Última sync: X min atrás" ou "Nunca sincronizado"
- "Webhook: ativo, expira em X dias" ou "Sem webhook ativo"
- "X arquivos no banco"
- Ícone de token (se tem syncToken ou não)
- Botão "Forçar sync" → `forceSyncFolder` mutation

**Auto-refresh:** `refetchInterval: 30_000` no `useQuery`.

**Design:** Seguir Padrão Defender (zinc + emerald). Badges: `bg-emerald-100 text-emerald-800` (healthy), `bg-yellow-100 text-yellow-800` (warning), `bg-red-100 text-red-800` (critical).

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/services/google-drive.ts` | Bug 1: passar secret; Bug 2: cleanup expirados; Bug 3: `onConflictDoUpdate` no INSERT |
| `src/lib/inngest/functions.ts` | Novo `driveWatchdogFn` com `rateLimit: { limit: 1, period: "5m" }` global; registrar no array |
| `src/lib/trpc/routers/drive.ts` | Nova query `getSyncStatus`; mutations `forceSyncFolder` e `cleanExpiredChannels` |
| `src/app/(dashboard)/admin/drive-sync/page.tsx` | Nova página (Server Component + Client polling) |

---

## O que não muda

- Schema do banco (sem migrations)
- `syncFolderWithDatabase`, `smartSync` (não alterados além do upsert no INSERT)
- `syncDriveFn` cron de 30 min (mantido)
- Arquitetura de webhooks (mantida, só corrigida)

---

## Critérios de Sucesso

1. Webhook com secret: notificações do Drive passam no handler sem 401
2. VVD sincroniza sem erros após fix do upsert
3. Banco vai de 52 → ~12 entradas ativas em `driveWebhooks` após limpeza
4. Nenhuma pasta fica > 20 min sem sync (watchdog garante)
5. Admin consegue ver status de cada pasta em tempo real com auto-refresh
6. Botão "Forçar sync" funciona e dispara imediatamente
