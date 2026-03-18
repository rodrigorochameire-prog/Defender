# Tasks: Noticias Upgrade — Triagem, Categorização e Cobertura

## Todas as tasks são independentes — paralelizáveis via 4 subagentes.

---

### T-01: Triagem UX — Resumo Inline + Navegação por Teclado
**Arquivo:** `src/components/noticias/noticias-triagem.tsx`
**Subagente:** A | **Status:** ⬜

**O que fazer:**

1. Substituir estado `expandedId: number | null` por `focusedIndex: number` (inicializa em `0`)
2. Derivar `focusedItem = items[focusedIndex]` (não mais por ID)
3. **Card colapsado** — adicionar linha de resumo inline após o título:
```tsx
{(analise?.resumoExecutivo || item.resumo) && (
  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 text-left">
    {analise?.resumoExecutivo ?? item.resumo}
  </p>
)}
```
4. **Card focado** (quando `index === focusedIndex`) mostra painel expandido com impacto + ações (igual ao `isExpanded` atual, mas agora controlado por `focusedIndex`)
5. **Keyboard handler** — substituir lógica existente:
```typescript
↑ → setFocusedIndex(i => Math.max(0, i - 1))
↓ → setFocusedIndex(i => Math.min(items.length - 1, i + 1))
A → handleAprovar(focusedItem.id); avança foco
D → handleDescartar(focusedItem.id); avança foco
// Remover guard "if (!expandedId) return" — atalhos funcionam sempre
```
6. **Header** — hint sempre visível (remover condicional `{expandedId && ...}`):
```tsx
<span className="text-xs text-zinc-400">↑↓ navegar · A aprovar · D descartar</span>
```
7. **Scroll automático**: após mudar `focusedIndex`, chamar `itemRef.current?.scrollIntoView({ block: "nearest" })` via `useEffect`
8. Adicionar novas fontes no mapa `FONTE_CORES` e `LABEL_FONTE`:
```typescript
"migalhas": "#e07b00",
"canal-ciencias-criminais": "#7c2d12",
"emporio-do-direito": "#4338ca",
"trf1": "#1e40af",
"trf5": "#1e3a8a",
"dpeba": "#065f46",
// LABEL_FONTE:
"migalhas": "Migalhas",
"canal-ciencias-criminais": "Canal CC",
"emporio-do-direito": "Empório",
"trf1": "TRF-1",
"trf5": "TRF-5",
"dpeba": "DPEBA",
```

**Critério:** Abrir triagem, sem clicar em nada, teclar `A` aprova o primeiro item e foco vai para o segundo.

---

### T-02: AI Categorização no Enriquecimento
**Arquivos:** `src/lib/noticias/enricher.ts`, `src/lib/trpc/routers/noticias.ts`
**Subagente:** B | **Status:** ⬜

**O que fazer em `enricher.ts`:**

1. Adicionar `categoriaIA` ao formato de resposta no `buildPrompt`:
```typescript
// No return do buildPrompt, adicionar instrução:
`"categoriaIA": "legislativa | jurisprudencial | artigo — classifique baseado no conteúdo real, ignorando a categoria prévia"`,
```
2. O prompt deve incluir os valores válidos e a instrução de ignorar a categoria pré-existente.
3. Adicionar `categoriaIA` ao tipo `AnaliseIA`:
```typescript
export type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
  categoriaIA?: "legislativa" | "jurisprudencial" | "artigo";
  processadoEm: string;
  modeloUsado: string;
};
```
4. No parsing do resultado em `enriquecerNoticia`, extrair `categoriaIA`:
```typescript
const categoriaIA = parsed.categoriaIA as "legislativa" | "jurisprudencial" | "artigo" | undefined;
const analise: AnaliseIA = {
  ...existing fields...,
  categoriaIA,
};
```
5. Após salvar `analiseIa` no banco, se `categoriaIA` existe e difere da `noticia.categoria`, atualizar:
```typescript
const CATEGORIAS_VALIDAS = ["legislativa", "jurisprudencial", "artigo"] as const;
if (categoriaIA && CATEGORIAS_VALIDAS.includes(categoriaIA) && categoriaIA !== noticia.categoria) {
  await db.update(noticiasJuridicas)
    .set({ categoria: categoriaIA, updatedAt: new Date() })
    .where(eq(noticiasJuridicas.id, noticiaId));
}
```

**O que fazer em `noticias.ts` router:**
- Nenhuma mudança necessária no router — `enriquecerNoticia` já é chamado no background do `aprovar`, e agora corrigirá a categoria automaticamente.

**Critério:** Aprovar uma notícia → verificar no banco que `categoria` foi atualizada se IA discordou.

---

### T-03: Novas Fontes RSS + UI Color Maps
**Arquivos:** DB (via tRPC seedFontes ou SQL direto), `src/components/noticias/noticias-feed.tsx`, `src/components/noticias/noticias-card.tsx`
**Subagente:** C | **Status:** ⬜

**O que fazer:**

1. **Adicionar procedure `seedFontes` no router** (ou usar o Supabase MCP para executar SQL diretamente):

Executar via Supabase MCP `execute_sql`:
```sql
INSERT INTO noticias_fontes (nome, url_base, url_feed, tipo, cor, ativo)
VALUES
  ('Migalhas', 'https://www.migalhas.com.br', 'https://www.migalhas.com.br/rss', 'rss', '#e07b00', true),
  ('Canal Ciências Criminais', 'https://canalcienciascriminais.com.br', 'https://canalcienciascriminais.com.br/feed/', 'rss', '#7c2d12', true),
  ('Empório do Direito', 'https://emporiododireito.com.br', 'https://emporiododireito.com.br/feed/', 'rss', '#4338ca', true),
  ('TRF-1', 'https://portal.trf1.jus.br', 'https://portal.trf1.jus.br/portaltrf1/noticias/noticias.rss', 'rss', '#1e40af', true),
  ('TRF-5', 'https://www.trf5.jus.br', 'https://www.trf5.jus.br/noticias/noticias.rss', 'rss', '#1e3a8a', true),
  ('DPEBA', 'https://www.defensoria.ba.def.br', 'https://www.defensoria.ba.def.br/feed/', 'rss', '#065f46', true)
ON CONFLICT (url_feed) DO NOTHING;
```

2. **`src/components/noticias/noticias-feed.tsx`** — adicionar nas constantes existentes:
```typescript
// COR_FONTE — adicionar:
"migalhas": "#e07b00",
"canal-ciencias-criminais": "#7c2d12",
"canal-ciências-criminais": "#7c2d12",
"emporio-do-direito": "#4338ca",
"empório-do-direito": "#4338ca",
"trf1": "#1e40af",
"trf5": "#1e3a8a",
"dpeba": "#065f46",

// NOME_FONTE — adicionar:
"migalhas": "Migalhas",
"canal-ciencias-criminais": "Canal CC",
"emporio-do-direito": "Empório",
"trf1": "TRF-1",
"trf5": "TRF-5",
"dpeba": "DPEBA",

// FONTES_DISPONIVEIS — adicionar ao array:
"migalhas", "canal-ciencias-criminais", "emporio-do-direito", "trf1", "trf5", "dpeba",
```

3. **`src/components/noticias/noticias-card.tsx`** — verificar se tem mapas locais e adicionar as mesmas entradas.

**Critério:** Notícias do Migalhas aparecem com borda laranja (#e07b00) e label "Migalhas" no card e na triagem.

---

### T-04: Google News RSS — Meta-Fonte
**Arquivos:** `src/lib/noticias/google-news-scraper.ts` (novo), `src/lib/noticias/scraper.ts`
**Subagente:** D | **Status:** ⬜

**O que fazer:**

1. **Criar `src/lib/noticias/google-news-scraper.ts`**:

```typescript
// Queries especializadas em direito penal
const GOOGLE_NEWS_QUERIES = [
  '"habeas corpus" OR "STJ decidiu" OR "STF fixou" OR "tese fixada" "processo penal"',
  '"lei penal" OR "código penal" OR "CPP" "execução penal" OR "reforma penal"',
  '"defensoria pública" OR "presídio" OR "preso provisório" direito penal',
];

// Resolve redirect do Google News para URL real
async function resolveGoogleNewsUrl(googleUrl: string): Promise<string>
// Extrai slug da fonte a partir da URL real
function extractFonteSlug(realUrl: string): string
// Função principal — retorna ScrapedItem[] com fonte correta
export async function scrapeGoogleNews(): Promise<Array<{ titulo, url, publicadoEm, fonte }>>
```

O tipo retornado precisa incluir `fonte: string` (slug derivado do domínio real) além dos campos de `ScrapedItem`.

2. **Em `scraper.ts`** — adicionar chamada ao Google News no final de `scrapeAllFontes()`:

```typescript
import { scrapeGoogleNews } from "./google-news-scraper";

// Após processar todas as fontes do DB:
try {
  const googleItems = await scrapeGoogleNews();
  // Processar cada item pelo mesmo pipeline: isIrrelevante → isRelevante → classificar → salvar
  // Usar o campo `item.fonte` do resultado para o campo `fonte` no banco
  // Deduplicação via UNIQUE constraint em urlOriginal (ON CONFLICT DO NOTHING)
} catch (err) {
  console.error("[google-news] Erro no scraping:", err);
  // Não bloquear o resto do scraping
}
```

**Implementação da resolução de redirect:**
```typescript
async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    const res = await fetch(googleUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "OmbudsBot/1.0 (Defensoria Publica BA; legal research)" },
      signal: AbortSignal.timeout(5000),
    });
    const finalUrl = res.url;
    // Se ainda for URL do Google, tentar GET
    if (finalUrl.includes("news.google.com")) {
      const res2 = await fetch(googleUrl, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OmbudsBot/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      return res2.url;
    }
    return finalUrl;
  } catch {
    return googleUrl;
  }
}
```

**Critério:** Chamar `buscarAgora` traz notícias de fontes não monitoradas diretamente (ex: Migalhas, Academia.edu, portais estaduais), com `fonte` derivado do domínio.

---

## Ordem de execução (paralela via 4 subagentes)

```
Subagente A → T-01 (noticias-triagem.tsx)
Subagente B → T-02 (enricher.ts)
Subagente C → T-03 (DB + noticias-feed.tsx + noticias-card.tsx)
Subagente D → T-04 (google-news-scraper.ts + scraper.ts)
```

> Sem overlap de arquivos entre subagentes.
> Subagente C precisa de acesso ao Supabase MCP para executar o INSERT SQL.
