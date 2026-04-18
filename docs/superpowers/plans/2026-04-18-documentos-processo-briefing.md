# Documentos do Processo + Matching Expandido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar bloco "Documentos do Processo" na Briefing listando todos os arquivos do Drive com categoria/busca/preview + estender `matchTermoDepoente` para casar áudios/vídeos de depoentes.

**Architecture:** Dois helpers puros em `src/lib/agenda/` (novo `document-category.ts` + ajustes em `match-document.ts`). Um sub-componente novo `DocumentosProcessoBlock` dentro de `tab-briefing.tsx`. Reusa `DocumentPreviewDialog`, `normalizeName` e `previewDoc` state já existentes.

**Tech Stack:** Next.js 15, React, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-18-documentos-processo-briefing.md`

---

## File Structure

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `src/lib/agenda/document-category.ts` | Categorizar arquivo do Drive em 8 categorias | **Novo** |
| `src/lib/agenda/__tests__/document-category.test.ts` | Unit tests | **Novo** |
| `src/lib/agenda/match-document.ts` | `matchTermoDepoente` aceita mídia sem keyword; novo `getTermoKind` | Modify |
| `src/lib/agenda/__tests__/match-document.test.ts` | Adicionar testes para mídia + getTermoKind | Modify |
| `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` | Nova `DocumentosProcessoBlock` sub-componente + botão do termo muda texto/ícone | Modify |

---

## Task 1: `document-category.ts` + testes

**Files:**
- Create: `src/lib/agenda/document-category.ts`
- Test: `src/lib/agenda/__tests__/document-category.test.ts`

- [ ] **Step 1: Criar arquivo de teste**

Create `src/lib/agenda/__tests__/document-category.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { categorizeDocument, CATEGORY_ORDER, CATEGORY_LABEL } from "../document-category";

type F = { driveFileId: string; name: string; mimeType?: string | null };

describe("categorizeDocument", () => {
  it("image PNG → imagem (mime vence nome)", () => {
    const f: F = { driveFileId: "1", name: "IP 8005196.png", mimeType: "image/png" };
    expect(categorizeDocument(f)).toBe("imagem");
  });

  it("audio m4a → midia", () => {
    const f: F = { driveFileId: "1", name: "Silvonei.m4a", mimeType: "audio/mp4" };
    expect(categorizeDocument(f)).toBe("midia");
  });

  it("video mp4 → midia", () => {
    const f: F = { driveFileId: "1", name: "plenario.mp4", mimeType: "video/mp4" };
    expect(categorizeDocument(f)).toBe("midia");
  });

  it("IP no início → inquerito", () => {
    const f: F = { driveFileId: "1", name: "IP 8005196-03.2025.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("inquerito");
  });

  it("inquerito explícito → inquerito", () => {
    const f: F = { driveFileId: "1", name: "Inquerito Policial.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("inquerito");
  });

  it("AP no início → acao-penal", () => {
    const f: F = { driveFileId: "1", name: "AP 8013165-06.2024.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("acao-penal");
  });

  it("apelacao → acao-penal", () => {
    const f: F = { driveFileId: "1", name: "Apelacao criminal.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("acao-penal");
  });

  it("laudo balístico → laudo", () => {
    const f: F = { driveFileId: "1", name: "Laudo Balistico 001.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("laudo");
  });

  it("Termo_Joao → termo", () => {
    const f: F = { driveFileId: "1", name: "Termo_Joao_Silva.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("termo");
  });

  it("Oitiva_Maria → termo", () => {
    const f: F = { driveFileId: "1", name: "Oitiva_Maria.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("termo");
  });

  it("Relatorio_VVD → relatorio", () => {
    const f: F = { driveFileId: "1", name: "Relatorio_VVD_Higor.md", mimeType: "text/markdown" };
    expect(categorizeDocument(f)).toBe("relatorio");
  });

  it("nome sem categoria clara → outros", () => {
    const f: F = { driveFileId: "1", name: "Documento_generico.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("outros");
  });

  it("'ip' dentro de palavra NÃO casa inquérito (ex: recipe)", () => {
    const f: F = { driveFileId: "1", name: "recipe.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("outros");
  });

  it("CATEGORY_ORDER cobre as 8 categorias", () => {
    expect(CATEGORY_ORDER).toEqual([
      "inquerito",
      "acao-penal",
      "laudo",
      "termo",
      "relatorio",
      "midia",
      "imagem",
      "outros",
    ]);
  });

  it("CATEGORY_LABEL tem label em pt-BR para cada categoria", () => {
    CATEGORY_ORDER.forEach((k) => {
      expect(CATEGORY_LABEL[k]).toMatch(/[A-Za-zÀ-ú]/);
    });
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/document-category.test.ts
```

Expected: FAIL (module não existe).

- [ ] **Step 3: Implementar helper**

Create `src/lib/agenda/document-category.ts`:

```ts
import { normalizeName } from "./match-document";

export type DocumentCategory =
  | "inquerito"
  | "acao-penal"
  | "laudo"
  | "termo"
  | "relatorio"
  | "midia"
  | "imagem"
  | "outros";

export const CATEGORY_ORDER: DocumentCategory[] = [
  "inquerito",
  "acao-penal",
  "laudo",
  "termo",
  "relatorio",
  "midia",
  "imagem",
  "outros",
];

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  inquerito: "Inquérito Policial",
  "acao-penal": "Ação Penal",
  laudo: "Laudos/Perícias",
  termo: "Termos/Oitivas",
  relatorio: "Relatórios",
  midia: "Mídia",
  imagem: "Imagens",
  outros: "Outros",
};

interface FileLike {
  name: string;
  mimeType?: string | null;
}

export function categorizeDocument(file: FileLike): DocumentCategory {
  const mime = file.mimeType ?? "";
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("audio/") || mime.startsWith("video/")) return "midia";

  const n = normalizeName(file.name);
  if (/\blaudo\b/.test(n) || /\bpericia\b/.test(n)) return "laudo";
  if (/\btermo\b/.test(n) || /\bdepoimento\b/.test(n) || /\boitiva\b/.test(n)) return "termo";
  if (/\brelatorio\b/.test(n)) return "relatorio";
  if (/\bip\b/.test(n) || /\binquerito\b/.test(n)) return "inquerito";
  if (/\bap\b/.test(n) || /\bapelacao\b/.test(n) || /acao penal/.test(n)) return "acao-penal";

  return "outros";
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/document-category.test.ts
```

Expected: PASS (15 tests).

- [ ] **Step 5: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "document-category" | head -5
```

Expected: empty.

- [ ] **Step 6: Commit**

```bash
cd ~/projetos/Defender
git add src/lib/agenda/document-category.ts src/lib/agenda/__tests__/document-category.test.ts
git commit -m "feat(agenda): categorizeDocument helper + 15 tests (inquerito/ap/laudo/termo/relatorio/midia/imagem/outros)"
```

---

## Task 2: Expandir `matchTermoDepoente` + novo `getTermoKind`

**Files:**
- Modify: `src/lib/agenda/match-document.ts`
- Modify: `src/lib/agenda/__tests__/match-document.test.ts`

- [ ] **Step 1: Adicionar testes novos ao final do test file**

Append ao `src/lib/agenda/__tests__/match-document.test.ts`, importando `getTermoKind` no topo:

```ts
// Update import at top to include getTermoKind:
// import { normalizeName, matchTermoDepoente, matchLaudo, getTermoKind } from "../match-document";
```

Adicionar ao final do arquivo:

```ts
describe("matchTermoDepoente — mídia sem keyword", () => {
  it("casa áudio com nome do depoente mesmo sem keyword termo/depoimento", () => {
    const files = [{ driveFileId: "a", name: "Silvonei.m4a", mimeType: "audio/mp4" }];
    expect(matchTermoDepoente("Silvonei Santos", files)).toBe("a");
  });

  it("casa vídeo com nome do depoente mesmo sem keyword", () => {
    const files = [{ driveFileId: "a", name: "Maria Souza depoimento.mp4", mimeType: "video/mp4" }];
    expect(matchTermoDepoente("Maria Souza", files)).toBe("a");
  });

  it("NÃO casa pdf sem keyword mesmo com nome do depoente", () => {
    const files = [{ driveFileId: "a", name: "Silvonei.pdf", mimeType: "application/pdf" }];
    expect(matchTermoDepoente("Silvonei Santos", files)).toBeNull();
  });

  it("mime null com pdf-like name exige keyword", () => {
    const files = [{ driveFileId: "a", name: "Silvonei.pdf", mimeType: null }];
    expect(matchTermoDepoente("Silvonei Santos", files)).toBeNull();
  });
});

describe("getTermoKind", () => {
  it("audio/mp4 → audio", () => {
    expect(getTermoKind({ driveFileId: "a", name: "x.m4a", mimeType: "audio/mp4" })).toBe("audio");
  });

  it("video/mp4 → video", () => {
    expect(getTermoKind({ driveFileId: "a", name: "x.mp4", mimeType: "video/mp4" })).toBe("video");
  });

  it("application/pdf → documento", () => {
    expect(getTermoKind({ driveFileId: "a", name: "x.pdf", mimeType: "application/pdf" })).toBe("documento");
  });

  it("mime null → documento", () => {
    expect(getTermoKind({ driveFileId: "a", name: "x", mimeType: null })).toBe("documento");
  });
});
```

Atualizar o import no topo do test file (linha 2 aproximadamente):

```ts
import {
  normalizeName,
  matchTermoDepoente,
  matchLaudo,
  getTermoKind,
} from "../match-document";
```

- [ ] **Step 2: Rodar testes — novos devem falhar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/match-document.test.ts
```

Expected: os 4 testes do `matchTermoDepoente — mídia` e os 4 do `getTermoKind` falham. Antigos (12) passam.

- [ ] **Step 3: Atualizar `matchTermoDepoente` + adicionar `getTermoKind`**

Editar `src/lib/agenda/match-document.ts`. Substituir a função `matchTermoDepoente` por:

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

    const mime = f.mimeType ?? "";
    const isMedia = mime.startsWith("audio/") || mime.startsWith("video/");
    if (isMedia) return true;

    const hasTermoKeyword = TERMO_KEYWORDS.some((k) => n.includes(k));
    return hasTermoKeyword;
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}
```

Adicionar ao final do arquivo:

```ts
export type TermoKind = "audio" | "video" | "documento";

export function getTermoKind(file: DriveFile): TermoKind {
  const m = file.mimeType ?? "";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  return "documento";
}
```

- [ ] **Step 4: Rodar testes — todos devem passar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/match-document.test.ts
```

Expected: PASS (12 antigos + 4 novos mídia + 4 novos kind = 20 tests).

- [ ] **Step 5: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "match-document" | head -5
```

Expected: empty.

- [ ] **Step 6: Commit**

```bash
cd ~/projetos/Defender
git add src/lib/agenda/match-document.ts src/lib/agenda/__tests__/match-document.test.ts
git commit -m "feat(agenda): matchTermoDepoente casa mídia sem keyword + novo getTermoKind"
```

---

## Task 3: `DocumentosProcessoBlock` + botão do termo contextual

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx`

- [ ] **Step 1: Adicionar imports**

No topo de `tab-briefing.tsx`, combinar/adicionar:

```ts
// Atualizar import de match-document para incluir getTermoKind:
import { matchTermoDepoente, matchLaudo, getTermoKind } from "@/lib/agenda/match-document";

// Adicionar:
import {
  categorizeDocument,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  type DocumentCategory,
} from "@/lib/agenda/document-category";

// Adicionar ao import existente de lucide-react:
// File, FileAudio, FileVideo, FileImage, Search, Volume2, Video
```

Conferir se `FileText` já foi importado em tasks anteriores. Se não, adicionar.

- [ ] **Step 2: Adicionar helper `iconeArquivo` antes de TabBriefing**

Adicionar antes da exportação `export function TabBriefing`:

```ts
function iconeArquivo(file: { name: string; mimeType?: string | null }): React.ComponentType<{ className?: string }> {
  const m = file.mimeType ?? "";
  if (m.startsWith("audio/")) return FileAudio;
  if (m.startsWith("video/")) return FileVideo;
  if (m.startsWith("image/")) return FileImage;
  if (m === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return FileText;
  return File;
}
```

- [ ] **Step 3: Adicionar sub-componente `DocumentosProcessoBlock`**

Adicionar antes de `export function TabBriefing`:

```tsx
function DocumentosProcessoBlock({
  files,
  onPreview,
}: {
  files: any[];
  onPreview: (p: { id: string; title: string }) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return files.filter((f) =>
      (f.name ?? f.fileName ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [files, query]);

  const grupos = useMemo(() => {
    const map: Record<DocumentCategory, any[]> = {
      inquerito: [],
      "acao-penal": [],
      laudo: [],
      termo: [],
      relatorio: [],
      midia: [],
      imagem: [],
      outros: [],
    };
    filtered.forEach((f) => {
      const cat = categorizeDocument({
        name: f.name ?? f.fileName ?? "",
        mimeType: f.mimeType ?? null,
      });
      map[cat].push(f);
    });
    Object.keys(map).forEach((k) => {
      map[k as DocumentCategory].sort((a, b) => {
        const da = new Date(a.lastModifiedTime ?? 0).getTime();
        const db = new Date(b.lastModifiedTime ?? 0).getTime();
        return db - da;
      });
    });
    return CATEGORY_ORDER.map((k) => ({ key: k, label: CATEGORY_LABEL[k], items: map[k] })).filter(
      (g) => g.items.length > 0,
    );
  }, [filtered]);

  if (files.length === 0) {
    return <EmptyHint text="Processo ainda sem arquivos no Drive." />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
        <input
          type="text"
          placeholder="Buscar documento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
        />
      </div>

      {grupos.length === 0 ? (
        <EmptyHint text="Nenhum arquivo corresponde à busca." />
      ) : (
        <div className="space-y-2">
          {grupos.map((grupo) => (
            <details key={grupo.key} open className="group">
              <summary className="cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
                <span>{grupo.label}</span>
                <span className="text-neutral-400 font-normal">({grupo.items.length})</span>
              </summary>
              <ul className="mt-1.5 space-y-1">
                {grupo.items.map((f: any) => {
                  const fileName = f.name ?? f.fileName ?? "(sem nome)";
                  const Icon = iconeArquivo({ name: fileName, mimeType: f.mimeType });
                  const dataStr = f.lastModifiedTime
                    ? format(new Date(f.lastModifiedTime), "dd/MM/yy", { locale: ptBR })
                    : "";
                  return (
                    <li
                      key={f.driveFileId ?? f.id ?? fileName}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 hover:ring-neutral-300"
                    >
                      <Icon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                      <span className="flex-1 text-xs truncate">{fileName}</span>
                      {dataStr && (
                        <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0">{dataStr}</span>
                      )}
                      {f.driveFileId && (
                        <button
                          type="button"
                          onClick={() => onPreview({ id: f.driveFileId, title: fileName })}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                        >
                          Ver
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Inserir a nova seção na Briefing**

Localizar no JSX da `TabBriefing` o fim da `<CollapsibleSection id="elementos">` (seu `</CollapsibleSection>`). **Imediatamente depois**, adicionar:

```tsx
<CollapsibleSection id="documentos-processo" label="Documentos do Processo" count={driveFiles.length}>
  <DocumentosProcessoBlock files={driveFiles} onPreview={setPreviewDoc} />
</CollapsibleSection>
```

- [ ] **Step 5: Atualizar o botão do termo no DepoentesBlock para usar `getTermoKind`**

Localizar dentro de `DepoentesBlock` (sub-componente já existente no mesmo arquivo) onde é computado `termoId` e renderizado o botão. Substituir:

```tsx
const termoId = matchTermoDepoente(d.nome ?? "", driveFiles);
```

(e o botão subsequente) por:

```tsx
const termoId = matchTermoDepoente(d.nome ?? "", driveFiles);
const termoFile = termoId
  ? driveFiles.find((f: any) => f.driveFileId === termoId)
  : null;
const termoKind = termoFile ? getTermoKind({ driveFileId: termoFile.driveFileId, name: termoFile.name ?? termoFile.fileName ?? "", mimeType: termoFile.mimeType }) : null;
const termoLabel = termoKind === "audio" ? "Ouvir" : termoKind === "video" ? "Ver" : "Termo";
const TermoIcon = termoKind === "audio" ? Volume2 : termoKind === "video" ? Video : FileText;
const termoTitlePrefix = termoKind === "audio" ? "Áudio" : termoKind === "video" ? "Vídeo" : "Termo";
```

E onde renderiza o botão:

```tsx
{termoId && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onPreview({ id: termoId, title: `${termoTitlePrefix} — ${d.nome}` });
    }}
    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
  >
    <TermoIcon className="w-3 h-3" /> {termoLabel}
  </button>
)}
```

E onde passa `onVerTermo` para o DepoenteCard expandido:

```tsx
onVerTermo={termoId ? () => onPreview({ id: termoId, title: `${termoTitlePrefix} — ${d.nome}` }) : undefined}
```

- [ ] **Step 6: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-briefing" | head -15
```

Expected: empty.

- [ ] **Step 7: Smoke test visual**

Dev server já deve estar rodando (se não: `cd ~/projetos/Defender && npx next dev --port 3000 > /tmp/defender-dev.log 2>&1 &` e esperar `Ready`).

```bash
open -a "Google Chrome" "http://localhost:3000/admin/agenda"
```

Abrir audiência de um processo com arquivos (ex: navegar no calendário até um evento do processo 118 ou 244). Clicar "Registrar". Aba Briefing:
- Expandir "Documentos do Processo" — lista completa com categorias.
- Digitar na busca → filtra.
- Clicar "Ver" em um arquivo → preview abre.
- Na seção Depoentes, se tem depoente com áudio matching → botão diz "Ouvir" com ícone de volume.

- [ ] **Step 8: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "feat(agenda): DocumentosProcessoBlock com categorias + busca + botão Ouvir para áudios de depoentes"
```

---

## Task 4: Verificação final + push + memória

- [ ] **Step 1: Rodar todos os testes novos e antigos do agenda**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__ src/components/agenda/registro-audiencia/historico/__tests__ 2>&1 | tail -10
```

Expected: 15 (category) + 20 (match-document) + 11 (count-completude) = 46 testes passando.

- [ ] **Step 2: Typecheck completo dos arquivos tocados**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "document-category|match-document|tab-briefing" | head -10
```

Expected: empty.

- [ ] **Step 3: Smoke test visual completo**

Abrir agenda. Validar por roteiro:
1. Processo com arquivos (118/244): expandir Documentos do Processo → ver categorias ordenadas.
2. Busca: digitar termo do nome de arquivo → filtra.
3. Clicar "Ver" em PDF → preview abre.
4. Clicar "Ver" em áudio/vídeo → preview abre (o iframe do Drive suporta).
5. Depoentes: quando há áudio casado → botão "Ouvir" com ícone volume.
6. Se não há match de áudio, botão não aparece.

- [ ] **Step 4: Push**

```bash
cd ~/projetos/Defender && git log --oneline -8 && git push origin main
```

- [ ] **Step 5: Atualizar memória**

Editar `/Users/rodrigorochameire/.claude/projects/-Users-rodrigorochameire/memory/project_redesign_agenda.md`. No bloco 3 (seção "Bloco 3"), adicionar sub-bloco **3.5**:

```
**Bloco 3.5** (2026-04-18, 4 commits): documentos do processo no cockpit.
- Nova seção "Documentos do Processo" no Briefing: lista todos arquivos do Drive do processo com busca + categorias (Inquérito/Ação Penal/Laudo/Termo/Relatório/Mídia/Imagem/Outros).
- `matchTermoDepoente` agora casa áudios/vídeos (mime audio|video) sem exigir keyword "termo".
- Novo `getTermoKind` + botão do termo muda contexto: "Ouvir" (áudio), "Ver" (vídeo), "Termo" (pdf).
- Helper novo: `src/lib/agenda/document-category.ts` + 15 testes.
- Range: `<primeira>` → `<última>`.
```

Preencher os hashes após o push.

---

## Self-Review

**Spec coverage:**
- ✅ Parte 1 (nova seção Documentos do Processo) → Task 3 Steps 3-4
- ✅ Parte 2 (categorização com 8 categorias + ordem) → Task 1
- ✅ Parte 3 (busca inline com normalizeName) → Task 3 Step 3 (usa inline inline da mesma fórmula)
- ✅ Parte 4 (matching expandido) → Task 2
- ✅ Parte 5 (botão muda conforme tipo) → Task 3 Step 5

**Placeholder scan:** nenhum TBD. Todos os blocos de código completos. Comandos com output esperado.

**Type consistency:**
- `DocumentCategory` definido em `document-category.ts` (Task 1), usado em Task 3 Step 3 via `type DocumentCategory` import.
- `TermoKind` definido em `match-document.ts` (Task 2), consumido em Task 3 Step 5.
- `DriveFile` shape reaproveitado (opcional `mimeType`) — consistente.
- `previewDoc` / `setPreviewDoc` / `driveFiles` estão definidos no bloco 3 anterior no `tab-briefing.tsx` — herança válida.

**Observação de risco:**
- Step 3 do Task 3 mapeia `f.name ?? f.fileName ?? ""` — backwards-compat com o bloco 3 anterior que mapeou `fileName → name`. Os dados vêm da query `trpc.drive.filesByProcesso` (retorna coluna `name` direto). Na prática `f.name` sempre existe; `fileName` é null. Ainda assim o código aceita ambos para robustez.
