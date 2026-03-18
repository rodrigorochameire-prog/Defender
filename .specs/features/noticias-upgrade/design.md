# Design: Noticias Upgrade — Triagem, Categorização e Cobertura

## Componentes Modificados

| Componente/Arquivo | Mudanças |
|-------------------|---------|
| `src/components/noticias/noticias-triagem.tsx` | Resumo inline, navegação ↑↓, foco automático no primeiro |
| `src/lib/noticias/enricher.ts` | Adicionar `categoriaIA` no prompt e resposta JSON |
| `src/lib/trpc/routers/noticias.ts` | Aplicar `categoriaIA` ao aprovar |
| `src/lib/noticias/google-news-scraper.ts` | Novo arquivo — fetcher Google News RSS |
| `src/lib/noticias/scraper.ts` | Integrar Google News scraper na pipeline |
| `src/components/noticias/noticias-feed.tsx` | Adicionar novas fontes nos mapas |
| `src/components/noticias/noticias-card.tsx` | Adicionar novas fontes nos mapas (se existir mapa local) |

## ADR-01: Triagem UX — Resumo Inline + Navegação por Teclado

**Status:** Aceita

**Contexto:** Usuário precisa clicar para expandir antes de poder decidir. Atalho A/D só funciona se item estiver expandido.

**Decisão:**
1. Exibir `analiseIa.resumoExecutivo` (ou `resumo` como fallback) diretamente na linha colapsada, com `line-clamp-2`
2. Estado `focusedIndex` (número) em vez de `expandedId` (id) — desacopla foco de expansão
3. Teclas `↑`/`↓` movem `focusedIndex` e auto-expandem o item ativo
4. `A`/`D` operam no item focado (não no expandido) — funcionam sem clique prévio
5. Primeiro item começa com `focusedIndex = 0` (auto-foco na montagem)
6. Após aprovar/descartar, foco avança para o próximo item automaticamente

**Estrutura do estado:**
```tsx
const [focusedIndex, setFocusedIndex] = useState(0);

// Derivado:
const focusedItem = filteredItems[focusedIndex];

// Keyboard handler:
↑ → setFocusedIndex(prev => Math.max(0, prev - 1))
↓ → setFocusedIndex(prev => Math.min(items.length - 1, prev + 1))
A → handleAprovar(focusedItem.id); setFocusedIndex(prev => Math.min(items.length - 2, prev))
D → handleDescartar(focusedItem.id); setFocusedIndex(prev => Math.min(items.length - 2, prev))
```

**Card colapsado com resumo:**
```tsx
// Linha do resumo (sempre visível, sem precisar expandir)
{(analise?.resumoExecutivo || item.resumo) && (
  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
    {analise?.resumoExecutivo ?? item.resumo}
  </p>
)}
```

**Hint sempre visível:**
```tsx
// No header, sempre (não só quando expandido):
<span className="text-xs text-zinc-400">↑↓ navegar · A aprovar · D descartar</span>
```

**Consequências:**
- Triagem de 20 itens possível em menos de 1 minuto (apenas teclado)
- Card focado mostra detalhes completos (impacto, ações), demais mostram resumo inline
- Compatível com "Aprovar todos" existente

---

## ADR-02: Categorização por IA no Enriquecimento

**Status:** Aceita

**Contexto:** O classifier keyword-based cai em "artigo" quando nenhuma palavra-chave bate. A IA já analisa o texto completo na hora do enriquecimento — pode classificar com muito mais precisão.

**Decisão:** Adicionar `categoriaIA` ao JSON de resposta do `buildPrompt` / `enriquecerNoticia`:

```typescript
// Instrução adicional no prompt:
"categoriaIA": "legislativa | jurisprudencial | artigo — escolha baseado no conteúdo real"

// Parsing do resultado:
const categoriaIA = parsed.categoriaIA as "legislativa" | "jurisprudencial" | "artigo" | undefined;

// Após enriquecimento, se diferente:
if (categoriaIA && categoriaIA !== noticia.categoria) {
  await db.update(noticiasJuridicas)
    .set({ categoria: categoriaIA })
    .where(eq(noticiasJuridicas.id, noticiaId));
}
```

**Sem novo campo no schema** — sobrescreve `categoria` existente. A IA decide com mais contexto.

**Consequências:**
- Custo adicional mínimo (adiciona ~20 tokens ao prompt)
- Notícias classificadas erradas pelo keyword system são corrigidas automaticamente
- Não re-processa notícias já enriquecidas (cache existente)

---

## ADR-03: Novas Fontes RSS Diretas

**Status:** Aceita

**Fontes a adicionar:**

| Fonte | Slug | RSS URL | Cor |
|-------|------|---------|-----|
| Migalhas | `migalhas` | `https://www.migalhas.com.br/rss` | `#e07b00` |
| Canal Ciências Criminais | `canal-ciencias-criminais` | `https://canalcienciascriminais.com.br/feed/` | `#7c2d12` |
| Empório do Direito | `emporio-do-direito` | `https://emporiododireito.com.br/feed/` | `#4338ca` |
| TRF-1 | `trf1` | `https://portal.trf1.jus.br/portaltrf1/noticias/noticias.rss` | `#1e40af` |
| TRF-5 | `trf5` | `https://www.trf5.jus.br/noticias/noticias.rss` | `#1e3a8a` |
| DPEBA | `dpeba` | `https://www.defensoria.ba.def.br/feed/` | `#065f46` |

**Insert SQL:**
```sql
INSERT INTO noticias_fontes (nome, url_base, url_feed, tipo, cor, ativo)
VALUES
  ('Migalhas', 'https://www.migalhas.com.br', 'https://www.migalhas.com.br/rss', 'rss', '#e07b00', true),
  ('Canal Ciências Criminais', 'https://canalcienciascriminais.com.br', 'https://canalcienciascriminais.com.br/feed/', 'rss', '#7c2d12', true),
  ('Empório do Direito', 'https://emporiododireito.com.br', 'https://emporiododireito.com.br/feed/', 'rss', '#4338ca', true),
  ('TRF-1', 'https://portal.trf1.jus.br', 'https://portal.trf1.jus.br/portaltrf1/noticias/noticias.rss', 'rss', '#1e40af', true),
  ('TRF-5', 'https://www.trf5.jus.br', 'https://www.trf5.jus.br/noticias/noticias.rss', 'rss', '#1e3a8a', true),
  ('DPEBA', 'https://www.defensoria.ba.def.br', 'https://www.defensoria.ba.def.br/feed/', 'rss', '#065f46', true)
ON CONFLICT DO NOTHING;
```

**UI — mapas de cor/nome (adicionar nas constantes existentes em cada arquivo):**
```typescript
// noticias-feed.tsx — COR_FONTE e NOME_FONTE e FONTES_DISPONIVEIS
"migalhas": "#e07b00",
"canal-ciencias-criminais": "#7c2d12",
"emporio-do-direito": "#4338ca",
"trf1": "#1e40af",
"trf5": "#1e3a8a",
"dpeba": "#065f46",

// NOME_FONTE
"migalhas": "Migalhas",
"canal-ciencias-criminais": "Canal CC",
"emporio-do-direito": "Empório",
"trf1": "TRF-1",
"trf5": "TRF-5",
"dpeba": "DPEBA",

// FONTES_DISPONIVEIS — adicionar ao array
"migalhas", "canal-ciencias-criminais", "emporio-do-direito", "trf1", "trf5", "dpeba"
```

**Consequências:**
- Fontes já aparecem no filter dropdown e com borda colorida correta
- Canal Ciências Criminais e Empório do Direito já tinham cor nos mapas — garantir consistência

---

## ADR-04: Google News RSS como Meta-Fonte

**Status:** Aceita

**Contexto:** Google News indexa centenas de fontes jurídicas não monitoradas. O RSS público (sem API key) retorna artigos recentes para queries específicas.

**URL Pattern:**
```
https://news.google.com/rss/search?q={query}&hl=pt-BR&gl=BR&ceid=BR:pt
```

**Queries a usar (3 especializadas):**
```typescript
const GOOGLE_NEWS_QUERIES = [
  // Jurisprudência penal
  '"habeas corpus" OR "STJ decidiu" OR "STF fixou" OR "tese fixada" "processo penal"',
  // Legislação criminal
  '"lei penal" OR "código penal" OR "CPP" OR "execução penal" reforma',
  // Defensoria / assistidos
  '"defensoria pública" OR "assistência jurídica" OR "presídio" OR "preso" direito',
];
```

**Resolução de redirects:**
Links do Google News têm formato `https://news.google.com/rss/articles/CBMi...`. Precisam de `fetch()` com `redirect: "follow"` para obter a URL real:

```typescript
async function resolveGoogleNewsUrl(googleUrl: string): Promise<string> {
  try {
    const res = await fetch(googleUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "OmbudsBot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    return res.url !== googleUrl ? res.url : googleUrl;
  } catch {
    return googleUrl; // fallback: manter URL do Google
  }
}
```

**Extração do slug da fonte real:**
```typescript
function extractFonteSlug(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const known: Record<string, string> = {
      "migalhas.com.br": "migalhas",
      "conjur.com.br": "conjur",
      "jota.info": "jota",
      "stj.jus.br": "stj-noticias",
      "stf.jus.br": "stf-noticias",
      "canalcienciascriminais.com.br": "canal-ciencias-criminais",
      "emporiododireito.com.br": "emporio-do-direito",
      "trf1.jus.br": "trf1",
      "trf5.jus.br": "trf5",
    };
    return known[hostname] ?? hostname.split(".")[0];
  } catch {
    return "google-news";
  }
}
```

**Integração no scraper:**
Criar `src/lib/noticias/google-news-scraper.ts` com função `scrapeGoogleNews(): Promise<ScrapedItem[]>`.
Chamar no final de `scrapeAllFontes()` (após fontes diretas), com deduplicação por URL.

**Consequências:**
- Cobertura ampliada sem manutenção de lista de fontes
- Notícias de fontes desconhecidas chegam com slug derivado do domínio
- Duplicatas com fontes diretas são descartadas pela constraint `UNIQUE(url_original)`

---

## Parallelização para Subagentes

```
Subagente A: T-01 — Triagem UX (noticias-triagem.tsx)
Subagente B: T-02 — AI categorização (enricher.ts + router)
Subagente C: T-03 — Novas fontes RSS (DB seed + UI maps em feed/card)
Subagente D: T-04 — Google News scraper (novo arquivo + scraper.ts)
```

Sem conflitos de arquivos entre subagentes.
