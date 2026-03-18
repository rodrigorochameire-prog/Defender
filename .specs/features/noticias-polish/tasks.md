# Tasks: Polimento Visual da Central de Notícias

## Todas as tasks são independentes — paralelizáveis via subagentes.

---

### T-01: Decodificação de entidades HTML nos títulos
**Arquivo:** `src/lib/utils.ts`, `src/components/noticias/noticias-card.tsx`, `src/components/noticias/noticias-reader-panel.tsx`
**Estimativa:** 20min | **Dependências:** nenhuma | **Status:** ⬜

**O que fazer:**
1. Adicionar `decodeHtmlEntities(str)` em `src/lib/utils.ts` usando DOMParser (com guard SSR)
2. Em `NoticiaCard`: aplicar `decodeHtmlEntities(noticia.titulo)` no `<h3>`
3. Em `NoticiaReaderPanel`: aplicar `decodeHtmlEntities(noticia.titulo)` no `<h2>` do header

**Critério:** Títulos como `Habermas: o último &#8216;mandarim&#8217;` renderizam como `Habermas: o último 'mandarim'`

---

### T-02: Badge de categoria neutro no card
**Arquivo:** `src/components/noticias/noticias-card.tsx`
**Estimativa:** 10min | **Dependências:** nenhuma | **Status:** ⬜

**O que fazer:**
Substituir o badge colorido por versão neutra:

```tsx
// ANTES
<span
  className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
  style={{ color: corFonte, backgroundColor: `${corFonte}18` }}
>
  {nomeCategoria}
</span>

// DEPOIS
<span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded capitalize">
  {nomeCategoria}
</span>
```

**Critério:** Badge sem cor da fonte, lowercase, neutro. Borda lateral continua colorida.

---

### T-03: Coluna de leitura max-width no feed
**Arquivo:** `src/components/noticias/noticias-feed.tsx`
**Estimativa:** 5min | **Dependências:** nenhuma | **Status:** ⬜

**O que fazer:**
Na div que contém os cards (linha ~162), adicionar `max-w-3xl`:

```tsx
// ANTES
<div className="flex-1 min-w-0 space-y-4">

// DEPOIS
<div className="flex-1 min-w-0 space-y-4 max-w-3xl">
```

**Critério:** Cards não se esticam além de ~768px, coluna de leitura elegante.

---

### T-04: Skeleton em forma de card real
**Arquivo:** `src/components/noticias/noticias-feed.tsx`
**Estimativa:** 20min | **Dependências:** nenhuma | **Status:** ⬜

**O que fazer:**
Substituir o bloco de loading (função que retorna `<div className="p-4 flex gap-4">`) por skeletons com forma de card real. Cada skeleton deve ter:
- Container `relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden`
- Faixa lateral `absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-200 dark:bg-zinc-700`
- Padding `pl-5 pr-4 py-4 space-y-3`
- Linha de meta: dois Skeleton pills (w-20, w-16)
- Título: dois Skeletons (w-full, w-3/4)
- Síntese: três Skeletons (w-full, w-full, w-2/3)
- Caixa impacto: Skeleton h-14 rounded-lg w-full

Renderizar 5 desses skeletons.

**Critério:** Loading state visualmente idêntico em estrutura ao card real.

---

### T-05: Highlight de card selecionado refinado
**Arquivo:** `src/components/noticias/noticias-card.tsx`
**Estimativa:** 5min | **Dependências:** nenhuma | **Status:** ⬜

**O que fazer:**
Substituir o estado `isSelected` do card:

```tsx
// ANTES
isSelected
  ? "border-emerald-400 shadow-md ring-1 ring-emerald-400/30"
  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 ..."

// DEPOIS
isSelected
  ? "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-600"
  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 ..."
```

**Critério:** Card selecionado tem fundo levemente diferenciado, sem cor emerald intrusiva.

---

## Ordem de execução (paralela via subagentes)

```
Subagente A: T-01 (decode HTML) + T-05 (highlight)  → noticias-card.tsx + noticias-reader-panel.tsx + utils.ts
Subagente B: T-02 (badge) + T-03 (max-width) + T-04 (skeleton) → noticias-card.tsx + noticias-feed.tsx
```

> ⚠️ T-01 e T-02 tocam no mesmo arquivo (`noticias-card.tsx`).
> Separar em subagentes diferentes para evitar conflito de edição.
> Subagente A faz T-01 (só o título), Subagente B faz T-02 (só o badge).
