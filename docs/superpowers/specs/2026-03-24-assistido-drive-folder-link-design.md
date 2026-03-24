# Design: Vinculação de Assistido à Pasta do Google Drive

**Data**: 2026-03-24
**Status**: Aprovado

---

## Problema

Assistidos possuem uma coluna `driveFolderId` na tabela do banco que frequentemente fica `null`, mesmo quando uma pasta com o mesmo nome já existe no Google Drive e está sincronizada na tabela `driveFiles`. Como resultado, a tab "Drive" na página do assistido aparece vazia, sem nenhum vínculo com os arquivos existentes.

O problema afeta tanto assistidos antigos (criados antes da integração Drive) quanto novos (onde a criação automática da pasta pode falhar silenciosamente).

---

## Solução: Abordagem Híbrida

Auto-match por nome normalizado gera vínculos automáticos para matches de alta confiança. Para os demais, a UI da tab Drive exibe a sugestão com confirmação ou um picker manual.

---

## Seção 1: Dados e Matching

### Esclarecimento de Schema

Na tabela `driveFiles`, existem dois campos com nomes parecidos:
- `driveFileId` (`varchar`) — ID único do arquivo/pasta no Google Drive (é o que `assistidos.driveFolderId` armazena)
- `driveFolderId` (`varchar`) — ID da pasta **pai** no Drive

Ao longo desta spec, o parâmetro da mutation que identifica a pasta do assistido sempre se chamará `driveFileId`, nunca `driveFolderId`, para evitar ambiguidade.

O campo `assistidos.id` é `serial` (integer), não UUID.

### Normalização de Nomes

Extrair função utilitária `normalizeNameForMatch(name: string): string` para `src/lib/utils/name-matching.ts`:
- Lowercase
- Remove acentos (NFD + replace `/[\u0300-\u036f]/g`)
- Trim de espaços extras

Exemplo: `"Francisco Ferreira Henriques Rabelo"` → `"francisco ferreira henriques rabelo"`

> **Nota**: existem duas implementações de similaridade no codebase que devem ser consolidadas:
> - `calculateSimilarity` em `src/lib/trpc/routers/drive.ts` (linhas 61–91)
> - `calculateSimilarityNormalized` em `src/lib/services/google-drive.ts` (linha ~4179)
>
> Ambas devem ser removidas e substituídas por importações de `name-matching.ts`.

### Critérios de Match

| Tipo | Condição | Ação |
|------|----------|------|
| **Alta confiança** | Nome normalizado exato | Backfill automático |
| **Sugestão** | Score similaridade ≥ 0.8 | Exibe para confirmação do usuário |
| **Sem match** | Score < 0.8 | Picker manual |

### Mutação: `assistidos.linkDriveFolder`

```typescript
input: z.object({
  assistidoId: z.number(),      // serial integer
  driveFileId: z.string(),      // driveFiles.driveFileId da pasta no Drive
})
```

Efeitos (executados em transação):
1. `UPDATE assistidos SET drive_folder_id = $driveFileId WHERE id = $assistidoId`
2. `UPDATE drive_files SET assistido_id = $assistidoId WHERE drive_file_id = $driveFileId`
3. `UPDATE drive_files SET assistido_id = $assistidoId WHERE drive_folder_id = $driveFileId AND assistido_id IS NULL`
   — vincula também os arquivos filhos diretos já sincronizados

> **Nota**: arquivos filhos **não** são automaticamente vinculados apenas pelo efeito 1+2. O efeito 3 é necessário para que a tab Drive exiba os arquivos existentes imediatamente após o vínculo.

### Query: `drive.getSuggestedFolderForAssistido`

```typescript
input: z.object({ assistidoId: z.number() })
output: { driveFileId: string, name: string, webViewLink: string, fileCount: number, score: number } | null
```

Lógica:
1. Busca o assistido para obter `atribuicaoPrimaria` e `nome`
2. Chama `getFolderIdForAtribuicao(assistido.atribuicaoPrimaria)` (utilitário existente em `src/lib/utils/text-extraction.ts` que usa o mapa estático `ATRIBUICAO_FOLDER_IDS`) para obter o Drive file ID da pasta raiz da atribuição (ex: `/JURI`)
3. Busca em `driveFiles` onde `isFolder = true`, `assistidoId IS NULL`, `driveFolderId = <ID retornado no passo 2>`
4. Para cada candidata, calcula `similarityScore(normalizeNameForMatch(candidata.name), normalizeNameForMatch(assistido.nome))`
5. Retorna a candidata de maior score se ≥ 0.8, incluindo `fileCount` (subquery: count de filhos diretos)

> **Nota**: `fileCount` é computado apenas nesta query de UI (lookup único). O backfill não usa esta query — ele não precisa de `fileCount`.

### Endpoint Admin: `drive.backfillAssistidoLinks`

```typescript
input: z.object({ limit: z.number().default(50) })  // paginação por segurança
output: { linked: number, skipped: number, errors: number, hasMore: boolean }
```

Lógica:
1. Busca até `limit` assistidos com `driveFolderId IS NULL`
2. Para cada um, executa match exato normalizado contra `driveFiles` (isFolder=true, assistidoId=null) na pasta raiz da atribuição correspondente
3. Para matches exatos, chama `linkDriveFolder` (incluindo efeito 3 — filhos)
4. Retorna contagens + `hasMore` para indicar se há mais registros a processar

> **Limite padrão de 50 por chamada** para evitar timeout em serverless (Vercel: 30s/60s). A UI admin exibe botão "Continuar" enquanto `hasMore = true`.

---

## Seção 2: UI — Tab Drive do Assistido

### Estado: Sem Vínculo (com sugestão)

```
┌─────────────────────────────────────────────────────┐
│  📁 Pasta Drive                                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 💡 Pasta sugerida encontrada               │   │
│  │  "Francisco Ferreira Henriques Rabelo"      │   │
│  │  em /JURI  · 3 arquivos                    │   │
│  │                                             │   │
│  │  [Confirmar vínculo]  [Escolher outra]      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- **"Confirmar vínculo"**: chama `linkDriveFolder` → tab recarrega com arquivos
- **"Escolher outra"**: abre combobox com pastas disponíveis

### Estado: Sem Vínculo (sem sugestão)

```
┌─────────────────────────────────────────────────────┐
│  Nenhuma pasta Drive vinculada.                     │
│  [Vincular pasta manualmente]                       │
└─────────────────────────────────────────────────────┘
```

### Estado: Com Vínculo

Comportamento já existente (árvore de arquivos), acrescido de:
- Link "Abrir no Drive ↗" no topo (usando `webViewLink` da pasta em `driveFiles`)
- Botão "Alterar pasta" → reabre o combobox (permite corrigir vínculo errado)

### Combobox "Escolher Pasta"

- Lista `driveFiles` onde `isFolder=true`, `assistidoId IS NULL`, agrupadas por atribuição
- Filtragem client-side por nome
- Exibe: nome da pasta + caminho pai + contagem de arquivos
- Confirmar → `linkDriveFolder`

---

## Seção 3: Backfill Admin

Na página `/admin/assistidos`, no painel de ações batch existente:

**"Vincular pastas Drive automaticamente"**
- Chama `drive.backfillAssistidoLinks({ limit: 50 })`
- Loading state durante execução
- Resultado: _"47 assistidos vinculados. 12 sem correspondência — vincule manualmente."_
- Se `hasMore = true`: exibe botão "Continuar" para próximo batch

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/utils/name-matching.ts` | **Novo**: `normalizeNameForMatch`, `similarityScore` (migrado de `drive.ts`) |
| `src/lib/trpc/routers/assistidos.ts` | Adicionar mutation `linkDriveFolder` |
| `src/lib/trpc/routers/drive.ts` | Refatorar `calculateSimilarity` → importar de `name-matching.ts`; adicionar `getSuggestedFolderForAssistido` + `backfillAssistidoLinks` |
| `src/lib/services/google-drive.ts` | Refatorar `calculateSimilarityNormalized` → importar de `name-matching.ts` |
| `src/app/(dashboard)/admin/assistidos/[id]/_components/drive-tab.tsx` (ou equivalente) | UI de sugestão + picker + botão "Alterar pasta" |
| `src/app/(dashboard)/admin/assistidos/page.tsx` | Botão de backfill no painel batch com suporte a `hasMore` |

---

## Fora de Escopo

- Criação automática de novas pastas Drive (já existe em `create()`)
- Mover pastas quando atribuição muda (já existe em `update()`)
- Upload de arquivos para a pasta (já existente na tab Drive)
