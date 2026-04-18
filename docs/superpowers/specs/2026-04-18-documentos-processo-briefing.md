# Documentos do Processo + Matching Expandido (Briefing bloco 3.5)

**Data:** 2026-04-18
**Autor:** Rodrigo + Claude
**Escopo:** nova seção "Documentos do Processo" na Briefing do cockpit de audiência, listando todos os arquivos do Drive com categoria e preview. Expandir matching para casar áudios/vídeos de depoentes mesmo sem keyword "termo".

## Contexto

No bloco 3 (commits `4a80bc8c` → `b565d7b0`) foi adicionado preview de termos/laudos via matching heurístico. Investigação mostrou que o matching falha na maioria dos processos:
- Nomes reais de arquivos não seguem o padrão `"Termo de Depoimento - FULANO.pdf"`.
- São majoritariamente: `IP 8005196-...pdf` (inquérito inteiro), `AP ...pdf`, `Silvonei.m4a` (áudio de oitiva sem keyword), `Relatorio_VVD_...pdf`, screenshots.
- Caso Garrido (proc 832) nem tem arquivos — zero matches.

Resultado: botão "Ver termo" quase nunca aparece. Rodrigo precisa de uma forma direta de consultar qualquer documento do processo, independente de matching.

## Problema

1. Cockpit da audiência não dá acesso direto aos documentos-fonte do processo.
2. Matching heurístico atual é teórico demais — exige keyword que raros arquivos têm.

## Não-objetivos

- Persistir vínculos arquivo↔depoente/laudo em schema (fase 4 futura).
- Fallback manual "Vincular documento" dentro do card do depoente (fase 4).
- Resumo IA de documentos (fase 4).
- Integrar arquivos do assistido (pasta pessoal) — fica só processo agora.

## Design

### Parte 1 — Nova seção "Documentos do Processo"

**Arquivo:** `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx`

Adicionar `<CollapsibleSection id="documentos-processo" label="Documentos do Processo" count={N}>` logo após a seção "Elementos" e antes de "Versão do Acusado".

**Ordem lógica justificada:** documentos são insumos para os elementos probatórios — ficam próximos.

**Estrutura interna:**

```tsx
<DocumentosProcessoBlock
  files={driveFiles}
  onPreview={setPreviewDoc}
/>
```

Novo componente `DocumentosProcessoBlock` (dentro de `tab-briefing.tsx` como sub-componente, já que compartilha state `setPreviewDoc` e é específico da Briefing):

- **Input de busca** no topo (`text-xs`, filtro por `normalizeName` do nome).
- **Lista de grupos categorizados** usando `<details open>` nativo (mesmo padrão de Depoentes).
- Cada grupo tem header com nome + count, e dentro lista de arquivos.
- Cada arquivo é uma linha com:
  - Ícone por mime-type (FileText para PDF, FileImage para imagens, FileAudio, FileVideo, File para outros)
  - Nome (truncate)
  - Data (`lastModifiedTime` formatada `dd/MM/yy`)
  - Botão "Ver" → `setPreviewDoc({ id: driveFileId, title: name })`

**Empty state:** `"Processo ainda sem arquivos no Drive."`

### Parte 2 — Categorização

Helper puro `categorizeDocument(file): Category`. Priority order:

```ts
type DocumentCategory =
  | "inquerito"
  | "acao-penal"
  | "laudo"
  | "termo"
  | "relatorio"
  | "midia"
  | "imagem"
  | "outros";
```

Lógica (primeira que bate, na ordem):
1. `mime_type.startsWith("image/")` → `imagem`
2. `mime_type.startsWith("audio/")` OU `mime_type.startsWith("video/")` → `midia`
3. Normalized name contém `laudo` ou `pericia` → `laudo`
4. Normalized name contém `termo`, `depoimento`, ou `oitiva` → `termo`
5. Normalized name contém `relatorio` (ex.: `Relatorio_VVD_...`) → `relatorio`
6. Normalized name contém token isolado `ip` ou palavra `inquerito` → `inquerito`
7. Normalized name contém token isolado `ap`, `apelacao` ou `acao penal` → `acao-penal`
8. Fallback → `outros`

> **Detecção de "token isolado" para `ip`/`ap`**: regex `\bip\b` e `\bap\b` no nome normalizado (espaços como separadores). Evita falsos positivos em palavras como "relatorio" ou "recipe".

Ordem de exibição dos grupos: `inquerito → acao-penal → laudo → termo → relatorio → midia → imagem → outros`. Grupos vazios ocultos.

Labels em PT-BR:
- `inquerito` → "Inquérito Policial"
- `acao-penal` → "Ação Penal"
- `laudo` → "Laudos/Perícias"
- `termo` → "Termos/Oitivas"
- `relatorio` → "Relatórios"
- `midia` → "Mídia"
- `imagem` → "Imagens"
- `outros` → "Outros"

Helper vai em `src/lib/agenda/document-category.ts` + testes em `src/lib/agenda/__tests__/document-category.test.ts`.

### Parte 3 — Busca inline

Estado local `const [query, setQuery] = useState("")` no `DocumentosProcessoBlock`. Filtra arquivos por `normalizeName(file.name).includes(normalizeName(query))`. Reusa `normalizeName` de `match-document.ts` (export já existe).

Input compacto: `<input type="text" placeholder="Buscar documento..." value={query} onChange={...} className="w-full text-xs px-2 py-1 rounded border border-neutral-200 bg-white" />`

### Parte 4 — Matching expandido em `matchTermoDepoente`

**Arquivo:** `src/lib/agenda/match-document.ts`

Mudança na função `matchTermoDepoente`:

```ts
export function matchTermoDepoente(
  depoenteNome: string,
  files: DriveFile[],
): string | null {
  const nome = normalizeName(depoenteNome);
  if (!nome) return null;
  const tokens = nome.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const allTokensMatch = tokens.every((t) => n.includes(t));
    if (!allTokensMatch) return false;

    // Se é mídia (áudio/vídeo), nome do depoente no filename já basta.
    const isMedia = (f.mimeType ?? "").startsWith("audio/") || (f.mimeType ?? "").startsWith("video/");
    if (isMedia) return true;

    // Documento texto: exige keyword termo/depoimento/oitiva.
    const hasTermoKeyword = TERMO_KEYWORDS.some((k) => n.includes(k));
    return hasTermoKeyword;
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}
```

Função adicional para o botão saber que tipo exibir:

```ts
export function getTermoKind(file: DriveFile): "audio" | "video" | "documento" {
  const m = file.mimeType ?? "";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return "documento";
}
```

### Parte 5 — Botão "Termo" muda conforme tipo

**Arquivo:** `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (dentro de `DepoentesBlock`)

Atualmente o botão diz sempre "Termo". Agora:
- Áudio → **"Ouvir"** com ícone `Volume2`
- Vídeo → **"Ver"** com ícone `Video`
- Documento → **"Termo"** com ícone `FileText`

Precisa descobrir o tipo do arquivo matched. O `matchTermoDepoente` retorna `driveFileId`, não o objeto. Para economizar busca, mudar a chamada no componente para encontrar o objeto completo:

```ts
const termoId = matchTermoDepoente(d.nome ?? "", driveFiles);
const termoFile = termoId ? driveFiles.find((f) => f.driveFileId === termoId) : null;
const termoKind = termoFile ? getTermoKind(termoFile) : null;
```

Mapear `termoKind` para label/ícone no botão.

Título no preview ajusta: `"Áudio — ${d.nome}"` / `"Vídeo — ${d.nome}"` / `"Termo — ${d.nome}"`.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/agenda/document-category.ts` | **Novo** — helper `categorizeDocument` |
| `src/lib/agenda/__tests__/document-category.test.ts` | **Novo** — ~12 testes |
| `src/lib/agenda/match-document.ts` | `matchTermoDepoente` aceita mídia sem keyword; novo `getTermoKind` |
| `src/lib/agenda/__tests__/match-document.test.ts` | Adicionar 2-3 testes cobrindo mídia + getTermoKind |
| `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` | Nova `DocumentosProcessoBlock` + uso do `getTermoKind` no botão de termo |

Não toca: mutations, schema, tRPC, DepoenteCard (prop `onVerTermo` já existe; label é do botão do bloco, não do card).

## Testes

**`document-category.test.ts` (12 casos):**
- Image PNG → imagem
- Audio m4a → midia
- Video mp4 → midia
- Nome `IP 8005196-...pdf` → inquerito
- Nome `AP 8013165-...pdf` → acao-penal
- Nome `Laudo Balistico.pdf` → laudo
- Nome `Termo_Joao_Silva.pdf` → termo
- Nome `Oitiva_Maria.pdf` → termo
- Nome `Relatorio_VVD_....md` → relatorio
- Nome sem categoria clara → outros
- `ip` dentro de palavra (ex: `recipe.pdf`) NÃO casa inquérito
- Imagem com "IP" no nome → imagem (mime vence nome)

**`match-document.test.ts` — adicionar:**
- `matchTermoDepoente` casa `Silvonei.m4a` com depoente Silvonei (sem keyword, mime audio)
- `matchTermoDepoente` NÃO casa `Silvonei.pdf` sem keyword (não é mídia)
- `getTermoKind` retorna `audio`/`video`/`documento` correto

**Smoke test manual:**
- Abrir audiência com processo com arquivos (ex: proc 118 ou 244).
- Expandir "Documentos do Processo" — todos os arquivos aparecem agrupados.
- Busca filtra.
- Clicar "Ver" em qualquer um abre preview.
- Na seção Depoentes: depoentes com áudio ganham botão "Ouvir" (não mais "Termo").

## Rollout

Sem migration, sem feature flag, sem env var. Deploy direto em main.

## Fora de escopo (bloco 4 futuro)

- Fallback manual "Vincular documento" no card do depoente.
- Resumo IA on-demand em documentos.
- Integração com arquivos do assistido (pasta pessoal do assistido).
- Persistência de vínculos em schema.
- Nome de assistidos/vítimas compostos com sobrenomes que aparecem em múltiplos arquivos (disambiguation UI).
