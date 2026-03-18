# Design: Radar — Relevância de Notícias + Sheet Redesign

## ADR-01: Score calculado no scraper, não no enrichment
**Status:** Aceita
**Contexto:** Poderíamos calcular o score no `radar_extraction_service.py` após IA ou no scraper antes de salvar.
**Decisão:** Calcular no scraper (`radar_scraper_service.py`) antes de salvar, para rejeitar logo na entrada.
**Consequências:** Menos dados no banco. Score não usa info extraída pela IA (bairro exato), só keywords estáticas. Aceitável porque é um score de triagem, não de precisão.

## ADR-02: Pré-triagem IA apenas para zona cinzenta (35-59)
**Status:** Aceita
**Contexto:** Chamar IA para todos os artigos seria caro. Chamar só para ≥85 seria inútil.
**Decisão:** IA de pré-triagem apenas para score 35-59. Score <35 rejeita direto. Score ≥60 salva direto.
**Consequências:** Custo controlado. Artigos claramente ruins (< 35) nunca chegam à IA.

## ADR-03: Sheet usa layout flex-col com sticky via CSS, não portal
**Status:** Aceita
**Contexto:** SheetContent já usa `overflow-y-auto`. Sticky header exigiria reestruturar o layout.
**Decisão:** SheetContent recebe `flex flex-col p-0`. Header e footer são divs com `shrink-0`. Body central é `flex-1 overflow-y-auto px-6`.
**Consequências:** Header e footer ficam fixos sem portal. Simples, sem hacks.

---

## Modelo de Dados

### Alterações no Schema Drizzle (`src/lib/db/schema/radar.ts`)
```typescript
relevanciaScore: integer("relevancia_score").default(0).notNull(),
```

### Migration SQL
```sql
-- supabase/migrations/20260318_radar_relevancia_score.sql
ALTER TABLE radar_noticias
  ADD COLUMN IF NOT EXISTS relevancia_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_radar_noticias_relevancia
  ON radar_noticias (relevancia_score);
```

---

## Componentes

### Modificados

| Componente | Mudanças |
|------------|----------|
| `radar-noticia-sheet.tsx` | Sticky header, sticky footer, card Resumo IA, chips localização, avatares envolvidos, Accordion matches |
| `radar-noticia-card.tsx` | Chip de relevância (Confirmada/Provável/Possível) |
| `radar-filtros.tsx` | Filtro por threshold de relevância |
| `radar_scraper_service.py` | Função `_calculate_relevancia_score()`, filtros reforçados, chamada IA zona cinzenta |
| `src/lib/db/schema/radar.ts` | Campo `relevanciaScore` |

### Novos Componentes
Nenhum — todas as mudanças são evoluções dos existentes.

---

## Backend Python: `radar_scraper_service.py`

### Nova função `_calculate_relevancia_score(titulo, corpo) -> int`

```python
def _calculate_relevancia_score(self, titulo: str, corpo: str | None) -> int:
    score = 0
    titulo_lower = titulo.lower()
    corpo_trecho = (corpo or "")[:500].lower()

    # Camaçari explícito no título (+35)
    if any(kw in titulo_lower for kw in ["camaçari", "camacari"]):
        score += 35

    # Bairro/distrito no título (+25)
    elif any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_REGIAO):
        score += 25

    # Camaçari no início do corpo (+15)
    if any(kw in corpo_trecho for kw in ["camaçari", "camacari"]):
        score += 15

    # Delegacia de Camaçari (+15)
    if any(kw in titulo_lower + corpo_trecho for kw in ["18ª delegacia", "delegacia de camaçari", "26ª cipm"]):
        score += 15

    # Crime forte no título (+10)
    if any(kw in titulo_lower for kw in ["homicídio", "homicidio", "tráfico", "trafico", "baleado", "preso"]):
        score += 10

    return min(score, 100)
```

### Lógica de triagem integrada em `_scrape_article()`

```
score = _calculate_relevancia_score(titulo, corpo)

if score < 35:
    → rejeitar, return None

elif 35 <= score < 60:
    → chamar _pretriagem_ia(titulo, corpo[:200])
    → ajustar score com resultado (±10)
    → se score_ajustado < 35: rejeitar

else:  # score >= 60
    → salvar diretamente
```

### Nova função `_pretriagem_ia(titulo, trecho) -> dict`

Prompt:
```
Você é um classificador de notícias policiais de Camaçari-BA.
Título: {titulo}
Trecho: {trecho}
Responda APENAS JSON: {"relevante": true/false, "ajuste": número entre -10 e 10}
Critérios: relevante=true se o crime ocorreu em Camaçari ou municípios limítrofes (Dias d'Ávila, Simões Filho, Lauro de Freitas).
```

---

## API / Backend tRPC

### Procedimento `radar.list` — adicionar campo `relevanciaScore`
Já retorna todos os campos da tabela. Apenas adicionar `relevanciaScore` ao select.

### Procedimento `radar.stats` — adicionar breakdown por relevância
Retornar contagem por faixa: confirmadas (≥85), prováveis (60-84), possíveis (35-59).

---

## UI/UX

### Sheet — estrutura JSX target

```tsx
<SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
  {/* STICKY HEADER */}
  <div className="shrink-0 px-6 pt-5 pb-3 border-b bg-white dark:bg-zinc-950">
    <div className="flex items-center gap-2 flex-wrap">
      <Badge crime />
      <Badge relevancia />  {/* novo */}
      <StatusPill />        {/* novo: animado se pending */}
      <div className="ml-auto flex gap-1">
        <EditButton />
        <SheetClose />
      </div>
    </div>
    <SheetTitle className="mt-2 text-sm font-semibold line-clamp-2" />
    <MetaRow />  {/* fonte · data relativa */}
  </div>

  {/* SCROLLABLE BODY */}
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
    <ImagemHero />
    <CardResumoIA />         {/* bg-zinc-50, Sparkles, skeleton */}
    <SecaoLocalizacao />     {/* chips inline */}
    <SecaoTipificacao />     {/* badges mono + arma */}
    <SecaoEnvolvidos />      {/* avatares com iniciais */}
    <SecaoMatchesDPE />      {/* Accordion shadcn */}
    <SecaoVerTambem />
  </div>

  {/* STICKY FOOTER */}
  <div className="shrink-0 px-6 py-3 border-t bg-white dark:bg-zinc-950 flex gap-2">
    <Button "Abrir fonte" variant="outline" asChild />
    <Button "Re-analisar" variant="ghost" />
    <Button "Copiar resumo" variant="ghost" />
  </div>
</SheetContent>
```

### Chip de relevância — mapeamento

| Score | Label | Classes |
|-------|-------|---------|
| ≥ 85 | Confirmada | `bg-emerald-100 text-emerald-700` |
| 60–84 | Provável | `bg-amber-100 text-amber-700` |
| 35–59 | Possível | `bg-zinc-100 text-zinc-600` |
| 0–34 | (nunca salva) | — |

### Avatar de envolvido — cores por papel

| Papel | Avatar bg | Avatar text |
|-------|-----------|-------------|
| suspeito / preso / acusado | `bg-red-100` | `text-red-700` |
| vitima | `bg-amber-100` | `text-amber-700` |
| testemunha | `bg-blue-100` | `text-blue-700` |
| policial | `bg-sky-100` | `text-sky-700` |
| outro | `bg-zinc-100` | `text-zinc-600` |
