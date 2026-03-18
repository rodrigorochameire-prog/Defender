# Design: Polimento Visual da Central de Notícias

## Componentes Modificados

| Componente | Arquivo | Mudanças |
|------------|---------|----------|
| NoticiaCard | `src/components/noticias/noticias-card.tsx` | Badge refinado, highlight selecionado, título decodificado |
| NoticiaReaderPanel | `src/components/noticias/noticias-reader-panel.tsx` | Título decodificado |
| NoticiasFeed | `src/components/noticias/noticias-feed.tsx` | Skeleton melhorado, max-width na coluna de cards |

## Sem alterações de backend ou schema.

---

## ADR-01: Decodificação de entidades HTML

**Status:** Aceita

**Contexto:** Títulos vindos do scraper contêm entidades HTML (`&#8216;`, `&#8217;`, `&amp;`, etc.) que renderizam como texto literal em nós de texto React.

**Decisão:** Criar utilitário `decodeHtmlEntities(str: string): string` usando `DOMParser` no browser:

```typescript
// src/lib/utils.ts (adicionar)
export function decodeHtmlEntities(str: string): string {
  if (typeof window === "undefined") return str;
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent ?? str;
}
```

**Consequências:**
- Seguro: DOMParser retorna `textContent`, nunca renderiza HTML
- SSR-safe: guard `typeof window === "undefined"` retorna string original no servidor
- Aplicar em: `NoticiaCard` (título), `NoticiaReaderPanel` (título no header)

---

## ADR-02: Badge de categoria neutro

**Status:** Aceita

**Antes:**
```tsx
<span style={{ color: corFonte, backgroundColor: `${corFonte}18` }}>
  {nomeCategoria.toUpperCase()}
</span>
```

**Depois:**
```tsx
<span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded capitalize">
  {nomeCategoria}
</span>
```

A borda lateral esquerda permanece como único sinalizador de cor da fonte.

---

## ADR-03: Coluna de leitura max-width

**Status:** Aceita

No `NoticiasFeed`, a `div` dos cards recebe `max-w-3xl`:

```tsx
<div className="flex-1 min-w-0 space-y-4 max-w-3xl">
```

Isso cria uma coluna de leitura elegante (~768px) sem afetar a sidebar ou o drawer.

---

## ADR-04: Skeleton em forma de card

**Status:** Aceita

Substituir retângulos genéricos por skeleton que imita a estrutura real do card:

```tsx
// Skeleton de um card
<div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-200 dark:bg-zinc-700 rounded-l-xl" />
  <div className="pl-5 pr-4 py-4 space-y-3">
    {/* Meta */}
    <div className="flex gap-2">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
    {/* Título */}
    <Skeleton className="h-5 w-full" />
    <Skeleton className="h-5 w-3/4" />
    {/* Síntese */}
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    {/* Impacto */}
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
</div>
```

---

## ADR-05: Highlight de card selecionado

**Status:** Aceita

**Antes:** `border-emerald-400 shadow-md ring-1 ring-emerald-400/30`

**Depois:** `bg-zinc-50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-600`

Sutil, neutro, não compete com a borda colorida da fonte.
