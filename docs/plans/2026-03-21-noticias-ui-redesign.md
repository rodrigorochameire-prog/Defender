# Notícias UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesenhar a página de Notícias Jurídicas com layout split-pane dinâmico, cards minimalistas (estilo Linear/Notion) e reader editorial de alta qualidade.

**Architecture:** Lista ocupa full-width por padrão; ao clicar numa notícia, o painel direito desliza e a lista encolhe (~380px). Cards são linhas de leitura flat (sem borda lateral, sem summary, sem tags — apenas dot colorido + título). Header com toolbar unificada.

**Tech Stack:** Next.js 15, React, Tailwind CSS, shadcn/ui, tRPC, date-fns

---

## Contexto de Design

### O que muda

| Antes | Depois |
|---|---|
| Card com borda lateral colorida + summary + impacto IA + tags | Card flat: dot colorido + fonte + tempo + título (2 linhas máx) |
| Reader como Sheet drawer overlay de 75vw | Split-pane inline: lista encolhe, reader aparece à direita |
| Busca e filtro de fonte em linhas separadas | Toolbar unificada no header |
| Header com ícone de jornal + pills + ações fragmentadas | Header limpo: pills à esquerda, busca inline + ações à direita |
| Cards com `rounded-xl`, shadow, translate no hover | Cards flat, `border-b border-zinc-100`, hover `bg-zinc-50` apenas |
| Bloco IA `bg-emerald-50` no card | IA só no reader — mais limpo no feed |

### Princípios visuais
- **Zinc é o tom** — emerald apenas em acentos pontuais
- **Tipografia domina** — o título é o card
- **Zero ornamento** — sem shadows, sem rounded excessivo, sem translate
- **Selecionado = `border-l-2 border-emerald-500 bg-zinc-50`**
- **Hover = `bg-zinc-50`** (muito sutil)

---

## Task 1: NoticiaCard — redesenho completo

**Arquivo:** `src/components/noticias/noticias-card.tsx`

**O que implementar:**
- Remover borda lateral colorida (`absolute left-0 w-[3px]`)
- Remover `rounded-xl`, `shadow`, `hover:-translate-y-px`, `overflow-hidden`
- Adicionar `border-b border-zinc-100 dark:border-zinc-800` como separador
- Linha 1: `● [cor da fonte]` + nome da fonte + `·` + categoria + `·` + tempo
- Linha 2: título `text-sm font-medium line-clamp-2`
- Badge `✦ IA` sutil se `analise !== null`
- Star sempre visível quando favoritado; ghost no resto
- Menu `···` no hover: paperclip, pasta, external link
- **Remover**: resumo, impacto prático, tags, `rounded-xl`
- Estado selecionado: `border-l-2 border-emerald-500 bg-zinc-50 dark:bg-zinc-800/50`

```tsx
// Estrutura do novo card
<div className={cn(
  "group relative cursor-pointer border-b border-zinc-100 dark:border-zinc-800",
  "px-4 py-3 transition-colors",
  isSelected
    ? "bg-zinc-50 dark:bg-zinc-800/50 border-l-2 border-l-emerald-500"
    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
)} onClick={onClick}>
  {/* Linha 1: meta */}
  <div className="flex items-center gap-1.5 mb-1.5">
    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: corFonte }} />
    <span className="text-[11px] text-zinc-400 font-medium">{nomeFonte}</span>
    <span className="text-zinc-200 dark:text-zinc-700">·</span>
    <span className="text-[11px] text-zinc-400 capitalize">{nomeCategoria}</span>
    <span className="text-zinc-200 dark:text-zinc-700">·</span>
    <span className="text-[11px] text-zinc-400">{tempo}</span>
    {analise && (
      <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">✦ IA</span>
    )}
    {/* Star + menu no ml-auto */}
    <div className="ml-auto flex items-center gap-0.5">
      <StarButton />
      <HoverMenu /> {/* paperclip, pasta, external */}
    </div>
  </div>

  {/* Linha 2: título */}
  <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2
    group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
    {titulo}
  </h3>
</div>
```

**Commit:** `feat(noticias): cards minimalistas — dot colorido, flat, sem summary`

---

## Task 2: NoticiasFeed — toolbar unificada e lista flat

**Arquivo:** `src/components/noticias/noticias-feed.tsx`

**O que implementar:**
- **Remover** a toolbar interna do feed (busca + dropdown de fonte) — ela sobe para o header da página
- **Expor props** `busca`, `setBusca`, `fonteFilter`, `setFonteFilter` para receber do parent
- **Manter** a sidebar de pastas à esquerda (w-44 em vez de w-52)
- **Remover** espaçamento `space-y-3` entre cards — agora são separados por `border-b`
- **Remover** `p-4` do container — padding fica por conta do card
- **Skeleton** atualizado: linhas flat sem rounded-xl
- **Empty state** com mais respiração: `py-24`
- **Load more** como texto link sutil, não botão outline

```tsx
// Novo skeleton card
<div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 animate-pulse">
  <div className="flex items-center gap-2 mb-2">
    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
    <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
    <div className="h-3 w-10 bg-zinc-100 dark:bg-zinc-800 rounded ml-auto" />
  </div>
  <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded mb-1" />
  <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded" />
</div>
```

**Interface atualizada:**
```tsx
interface NoticiasFeedProps {
  categoria: CategoriaFeed;
  selectedNoticiaId?: number;
  busca: string;
  fonteFilter: string | undefined;
  onOpenReader?: (noticia: NoticiaJuridica, list: NoticiaJuridica[]) => void;
  onOpenSalvarCaso?: (noticia: NoticiaJuridica) => void;
}
```

**Commit:** `feat(noticias): feed flat — toolbar extraída, cards sem gap`

---

## Task 3: page.tsx — split-pane dinâmico e header unificado

**Arquivo:** `src/app/(dashboard)/admin/noticias/page.tsx`

**O que implementar:**

### Header unificado
```tsx
<div className="border-b bg-background shrink-0 px-4 h-11 flex items-center gap-2">
  {/* Pills de categoria */}
  <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
    {CATEGORIA_PILLS.map(...)}
  </div>

  {/* Separador */}
  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />

  {/* Busca inline */}
  <div className="relative w-48 shrink-0">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
    <Input value={busca} onChange={...} placeholder="Buscar..." className="pl-8 h-7 text-xs w-full" />
  </div>

  {/* Filtro de fonte como pill */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fonteCorAtiva }} />
        {fonteNomeAtiva ?? "Fonte"}
        <ChevronDown className="h-3 w-3" />
      </Button>
    </DropdownMenuTrigger>
    ...
  </DropdownMenu>

  {/* Ações */}
  <div className="ml-auto flex items-center gap-1 shrink-0">
    {pendentesCount > 0 && <TriagemBadge />}
    <EnriquecerButton />
    <BuscarButton />
  </div>
</div>
```

### Split-pane dinâmico
```tsx
{/* Body */}
<div className="flex flex-1 overflow-hidden">
  {/* Lista — encolhe quando reader está aberto */}
  <div className={cn(
    "transition-all duration-300 ease-out overflow-y-auto border-r border-zinc-100 dark:border-zinc-800",
    readerOpen ? "w-[380px] shrink-0" : "flex-1"
  )}>
    <NoticiasFeed ... />
  </div>

  {/* Reader — aparece quando notícia selecionada */}
  {readerOpen && (
    <div className="flex-1 overflow-y-auto min-w-0">
      <NoticiaReaderPanel ... />
    </div>
  )}
</div>
```

- **Remover** `<Sheet>` e `<SheetContent>` — reader agora é div inline
- **Manter** estado `noticiaReader`, `noticiasList`, `readerIndex`
- **Adicionar** estados `busca` e `fonteFilter` — gerenciados na page, passados para feed
- **`readerOpen`** = `noticiaReader !== null && categoria !== "relatorios"`

**Commit:** `feat(noticias): split-pane dinâmico — reader inline, header unificado`

---

## Task 4: NoticiaReaderPanel — bloco IA mais limpo

**Arquivo:** `src/components/noticias/noticias-reader-panel.tsx`

**O que implementar:**
- Bloco IA: `bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700` (não mais verde)
- Labels IA: manter `text-[10px] font-semibold uppercase tracking-widest text-zinc-400`
- Impacto prático: `bg-white dark:bg-zinc-900 border border-zinc-200` com ícone `⚡ text-emerald-500` — mais discreto
- Ratio decidendi: manter `border-l-2 border-blue-200`
- **Dot colorido** no header em vez de `Badge` com borda colorida
- Título: `text-lg font-semibold` (era `text-xl font-bold`)
- Padding lateral: `px-6` (era `px-8`) — mais compacto

```tsx
{/* Header do reader */}
<div className="px-6 pt-4 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
  <div className="flex items-center gap-2 mb-3">
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: corFonte }} />
    <span className="text-xs text-zinc-400">{nomeFonte}</span>
    <span className="text-zinc-200">·</span>
    <span className="text-xs text-zinc-400 capitalize">{nomeCategoria}</span>
    <span className="text-zinc-200">·</span>
    <span className="text-xs text-zinc-400">{tempo}</span>
    <div className="ml-auto flex items-center gap-0.5">
      <NavButtons /> <StarButton /> <ExternalLink /> <CloseButton />
    </div>
  </div>
  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
    {titulo}
  </h2>
</div>

{/* Bloco IA */}
<div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
  <button className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 ...">
    <Sparkles className="h-3.5 w-3.5 text-zinc-400" /> {/* não mais emerald */}
    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
      Análise IA
    </span>
  </button>
  ...
</div>
```

**Commit:** `feat(noticias): reader panel — zinc-50 IA block, dot header, padding compacto`

---

## Ordem de execução recomendada

1. **Task 1** (card) — isolada, sem dependências
2. **Task 4** (reader panel) — isolada, sem dependências
3. **Task 2** (feed) — depende do novo card
4. **Task 3** (page) — integra tudo, depende de feed + reader

## Teste manual após cada task

```bash
npm run dev
# Acessar: http://localhost:3000/admin/noticias
```

- Task 1: cards aparecem flat, sem borda lateral, com dot colorido
- Task 2: busca e fonte no header; lista sem gaps entre cards
- Task 3: clicar numa notícia → lista encolhe, reader aparece à direita
- Task 4: bloco IA com fundo zinc-50, sem verde no container
