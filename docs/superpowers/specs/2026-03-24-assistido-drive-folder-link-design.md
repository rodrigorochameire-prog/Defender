# Design: Vinculação de Assistido à Pasta do Google Drive

**Data**: 2026-03-24
**Status**: Aprovado
**Branch**: feat/sheets-noticias-redesign

---

## Problema

Assistidos possuem uma coluna `driveFolderId` na tabela do banco que frequentemente fica `null`, mesmo quando uma pasta com o mesmo nome já existe no Google Drive e está sincronizada na tabela `driveFiles`. Como resultado, a tab "Drive" na página do assistido aparece vazia, sem nenhum vínculo com os arquivos existentes.

O problema afeta tanto assistidos antigos (criados antes da integração Drive) quanto novos (onde a criação automática da pasta pode falhar silenciosamente).

---

## Solução: Abordagem Híbrida

Auto-match por nome normalizado gera vínculos automáticos para matches de alta confiança. Para os demais, a UI da tab Drive exibe a sugestão com confirmação ou um picker manual.

---

## Seção 1: Dados e Matching

### Normalização de Nomes

Função utilitária `normalizeNameForMatch(name: string): string`:
- Lowercase
- Remove acentos (NFD + replace `/[\u0300-\u036f]/g`)
- Trim de espaços extras

Exemplo: `"Francisco Ferreira Henriques Rabelo"` → `"francisco ferreira henriques rabelo"`

### Critérios de Match

| Tipo | Condição | Ação |
|------|----------|------|
| **Alta confiança** | Nome normalizado exato | Backfill automático |
| **Sugestão** | Score similaridade ≥ 0.8 (Levenshtein) | Exibe para confirmação do usuário |
| **Sem match** | Score < 0.8 | Picker manual |

### Mutação: `assistidos.linkDriveFolder`

```typescript
input: z.object({
  assistidoId: z.string().uuid(),
  driveFolderId: z.string(), // driveFileId da pasta no Drive
})
```

Efeitos:
1. `UPDATE assistidos SET drive_folder_id = $driveFolderId WHERE id = $assistidoId`
2. `UPDATE drive_files SET assistido_id = $assistidoId WHERE drive_file_id = $driveFolderId`
3. Arquivos filhos já na tabela são automaticamente acessíveis via `assistidoId` na hierarquia

### Query: `drive.getSuggestedFolderForAssistido`

```typescript
input: z.object({ assistidoId: z.string().uuid() })
output: { driveFileId, name, webViewLink, fileCount, score } | null
```

Lógica:
1. Busca pastas em `driveFiles` onde `isFolder = true`, `assistidoId IS NULL`
2. Filtra pela pasta pai correspondente à atribuição do assistido (ex: `/JURI`, `/VVD`, `/EP`)
3. Calcula score de similaridade contra o nome do assistido
4. Retorna a melhor sugestão se score ≥ 0.8

### Endpoint Admin: `drive.backfillAssistidoLinks`

```typescript
output: { linked: number, skipped: number, errors: number }
```

Lógica:
1. Busca todos os assistidos com `driveFolderId IS NULL`
2. Para cada um, roda o match exato normalizado contra `driveFiles` (isFolder=true, assistidoId=null)
3. Para matches exatos, chama `linkDriveFolder` automaticamente
4. Retorna contagens para feedback ao usuário

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

- **"Confirmar vínculo"**: chama `linkDriveFolder` com o `driveFolderId` sugerido → tab recarrega com arquivos
- **"Escolher outra"**: abre combobox com todas as pastas não vinculadas da mesma atribuição

### Estado: Sem Vínculo (sem sugestão)

```
┌─────────────────────────────────────────────────────┐
│  Nenhuma pasta Drive vinculada.                     │
│  [Vincular pasta manualmente]                       │
└─────────────────────────────────────────────────────┘
```

- Abre combobox com pastas disponíveis (não vinculadas, da mesma atribuição)

### Estado: Com Vínculo (pós-link)

Comportamento já existente (árvore de arquivos), acrescido de:
- Link "Abrir no Drive ↗" no topo da tab (usando `webViewLink` do `driveFiles`)

### Combobox "Escolher Pasta"

- Lista pastas de `driveFiles` onde `isFolder=true`, `assistidoId IS NULL`, agrupadas por atribuição
- Busca por nome (filtro client-side)
- Exibe: nome da pasta + caminho pai + contagem de arquivos
- Confirmar → `linkDriveFolder`

---

## Seção 3: Backfill Admin

Na página `/admin/assistidos`, no painel de ações batch existente, adicionar:

**"Vincular pastas Drive automaticamente"**
- Chama `drive.backfillAssistidoLinks()`
- Loading state durante execução
- Resultado exibido em toast/badge: _"47 assistidos vinculados automaticamente. 12 sem correspondência — vincule manualmente."_

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/trpc/routers/assistidos.ts` | Adicionar mutation `linkDriveFolder` |
| `src/lib/trpc/routers/drive.ts` | Adicionar query `getSuggestedFolderForAssistido` + mutation `backfillAssistidoLinks` |
| `src/lib/utils/name-matching.ts` | Novo arquivo: `normalizeNameForMatch`, `similarityScore` |
| `src/app/(dashboard)/admin/assistidos/[id]/_components/drive-tab.tsx` (ou equivalente) | UI de sugestão + picker |
| `src/app/(dashboard)/admin/assistidos/page.tsx` | Botão de backfill no painel batch |

---

## Fora de Escopo

- Criação automática de novas pastas Drive (já existe em `create()`)
- Mover pastas quando atribuição muda (já existe em `update()`)
- Upload de arquivos para a pasta (já existente na tab Drive)
