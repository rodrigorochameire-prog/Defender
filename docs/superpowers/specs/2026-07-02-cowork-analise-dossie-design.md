# Design — Enriquecer coworkAnalise (manual) com o dossiê do assistido

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado (modo autônomo — usuário dormindo; abordagem de-riscada pela exploração)
**Escopo:** Follow-up do C2.2 (paridade do caminho manual). Branch: `feat/cowork-analise-dossie` (do `main` @ `a8598d09`).

---

## 1. Contexto

O C2.2 enriqueceu a análise **automática** (Fase 2c, worker Python) com um "dossiê do assistido" (resumos de Drive + atendimentos + análises anteriores). O botão **manual** "Análise profunda" (`coworkAnalise` em `briefing.ts:1207`) monta só um briefing leve (nome/CPF/status, processos, demandas abertas) e **NÃO** injeta Drive/atendimentos/análises. Esta fatia dá paridade: injeta um dossiê no prompt manual também.

**Achado (exploração):** `consolidateForAssistido` **NÃO é reutilizável** — é um consolidador pesado que chama **LLM pago** (Gemini) + escreve no banco + pode pular. Logo, build fresco e enxuto (query própria + formatter puro), **append-only** e **guardado por try/catch**.

## 2. Decisões (modo autônomo)

| Decisão | Escolha |
|---|---|
| Reusar `consolidateForAssistido`? | **NÃO** (LLM pago + side-effects) |
| Abordagem | módulo novo `dossie-assistido.ts`: formatter PURO + fetch guardado; `coworkAnalise` faz append |
| Conteúdo | Drive (`driveDocumentSections` resumo) + análises anteriores (`analysisData.resumo` de assistido+processos) |
| Atendimentos? | **fora nesta fatia** (o formatter aceita, mas o fetch inicial cobre Drive+análises; registros = follow-up) para manter o build enxuto |
| Caps | espelhar C2.2: `SECTION_CAP=2000`, `MAX_SECTIONS=30`, `MAX_DOSSIE_CHARS=18000`; resumo-preferido |
| Erro/vazio | `fetchDossieMarkdown` try/catch → `""`; append só se não-vazio (degrada ao briefing de hoje) |
| Extrair o briefing atual? | **NÃO** (append-only = menor blast radius; não toco no builder existente) |

## 3. Design

### 3.1 `src/lib/services/dossie-assistido.ts`

**`buildDossieMarkdown(sections, priorAnalyses)` (PURO, testável):**
```ts
export interface DossieSection { tipo?: string|null; titulo?: string|null; resumo?: string|null; textoExtraido?: string|null; }
const SECTION_CAP = 2000, MAX_SECTIONS = 30, MAX_DOSSIE_CHARS = 18000;
export function buildDossieMarkdown(sections: DossieSection[], priorAnalyses: string[]): string {
  const parts: string[] = [];
  const drive = (sections ?? []).slice(0, MAX_SECTIONS).map(s => {
    const titulo = s.titulo || s.tipo || "documento";
    let txt = (s.resumo ?? "").trim();
    if (!txt) txt = (s.textoExtraido ?? "").trim().slice(0, SECTION_CAP);
    return txt ? `- **${titulo}**: ${txt.slice(0, SECTION_CAP)}` : "";
  }).filter(Boolean);
  if (drive.length) parts.push("### Documentos no Drive (resumos)\n" + drive.join("\n"));
  const an = (priorAnalyses ?? []).map(a => (a ?? "").trim()).filter(Boolean).map(a => `- ${a.slice(0, SECTION_CAP)}`);
  if (an.length) parts.push("### Análises anteriores\n" + an.join("\n"));
  if (!parts.length) return "";
  let body = "## Dossiê do assistido (contexto além dos autos)\n\n" + parts.join("\n\n");
  if (body.length > MAX_DOSSIE_CHARS) body = body.slice(0, MAX_DOSSIE_CHARS) + "\n\n[…dossiê truncado]";
  return body;
}
```

**`fetchDossieMarkdown(assistidoId, processoIds)` (I/O guardado; nunca lança):**
```ts
export async function fetchDossieMarkdown(assistidoId: number, processoIds: number[]): Promise<string> {
  try {
    const sections = await db.select({
        tipo: driveDocumentSections.tipo, titulo: driveDocumentSections.titulo,
        resumo: driveDocumentSections.resumo, textoExtraido: driveDocumentSections.textoExtraido,
      }).from(driveDocumentSections)
      .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
      .where(and(eq(driveFiles.assistidoId, assistidoId), ne(driveDocumentSections.reviewStatus, "rejected")))
      .orderBy(desc(driveDocumentSections.updatedAt)).limit(MAX_SECTIONS);
    const prior: string[] = [];
    const [aRow] = await db.select({ analysisData: assistidos.analysisData }).from(assistidos).where(eq(assistidos.id, assistidoId)).limit(1);
    const aResumo = (aRow?.analysisData as any)?.resumo; if (aResumo) prior.push(String(aResumo));
    if (processoIds.length) {
      const pRows = await db.select({ analysisData: processos.analysisData }).from(processos).where(inArray(processos.id, processoIds));
      for (const p of pRows) { const r = (p.analysisData as any)?.resumo; if (r) prior.push(String(r)); }
    }
    return buildDossieMarkdown(sections, prior);
  } catch { return ""; }
}
```

### 3.2 Wire em `coworkAnalise` (`briefing.ts`, ~L1266)
```ts
const briefing = lines.join("\n");
const dossie = await fetchDossieMarkdown(input.assistidoId, processosDb.map((p) => p.id));
const promptFinal = dossie ? `${briefing}\n\n${dossie}` : briefing;
// ...usar promptFinal no `prompt:` do insert (era `briefing`)
```
Só troca `prompt: briefing` → `prompt: promptFinal`; nada mais muda. Se `fetchDossieMarkdown` falhar → `""` → prompt = briefing de hoje.

## 4. Tratamento de erro / blast radius
- `fetchDossieMarkdown` try/catch → `""`. Uma query que lance não quebra o `coworkAnalise` (degrada ao briefing atual).
- Append-only: o builder de briefing existente, o dedup guard, o skill mapping e o insert ficam intactos (só o valor de `prompt` muda).
- Token bloat controlado pelos caps (≤18000).

## 5. Testes (TDD)
- **`buildDossieMarkdown` (puro):** vazio (sem sections/análises) → `""`; renderiza Drive + análises; resumo-preferido (usa `resumo`, cai p/ `textoExtraido[:2000]`); cap por seção 2000; top 30 seções; bound total 18000 c/ marcador; None-safe (campos null).
- `fetchDossieMarkdown` — I/O (Drizzle); a lógica pura está no builder; o guard try/catch→"" é a garantia. (Verificação viva do fetch = deferida; a query espelha `drive.sectionsByAssistido` já testado em prod.)
- `next build` limpo (é código de app).

## 6. Critérios de aceitação
1. `buildDossieMarkdown` puro, testado (vazio/render/caps/preferência/bound/null-safe).
2. `fetchDossieMarkdown` nunca lança (try/catch → "").
3. `coworkAnalise` usa `promptFinal` (briefing + dossiê) e degrada ao briefing se o dossiê vier vazio; nada mais no fluxo muda.
4. `tsc` + `next build` limpos.
5. Sem migração, sem daemon/skill, sem `consolidateForAssistido`.

## 7. Deferidos
- Atendimentos/`registros` no dossiê manual (o auto já tem via C2.2; o manual pode ganhar depois).
- Extrair `buildBriefingMarkdown` puro (travar o comportamento atual) — refactor separado.
- Embeddings rank-select. Verificação viva.
