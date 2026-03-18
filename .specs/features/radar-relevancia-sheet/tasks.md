# Tasks: Radar — Relevância de Notícias + Sheet Redesign

## Organização em Grupos Paralelos

As tasks são agrupadas por **arquivo-alvo** — cada grupo pode ser executado por um subagente independente sem conflito.

---

## Grupo 1 — DB/Schema (bloqueante para Grupo 3)

| ID | Tarefa | Arquivo | Status |
|----|--------|---------|--------|
| T-01 | Adicionar `relevancia_score integer` ao schema Drizzle | `src/lib/db/schema/radar.ts` | ⬜ |
| T-02 | Criar migration SQL `20260318_radar_relevancia_score.sql` | `supabase/migrations/` | ⬜ |
| T-03 | Aplicar migration via Supabase MCP | banco | ⬜ |

**Notas:**
- T-01: adicionar `relevanciaScore: integer("relevancia_score").default(0).notNull()` após `contentHash`
- T-02: `ALTER TABLE radar_noticias ADD COLUMN IF NOT EXISTS relevancia_score integer NOT NULL DEFAULT 0;` + índice
- T-03: bloqueia T-09 (tRPC precisa do campo)

---

## Grupo 2 — Python Backend (independente)

| ID | Tarefa | Arquivo | Status |
|----|--------|---------|--------|
| T-04 | Implementar `_calculate_relevancia_score(titulo, corpo) -> int` | `radar_scraper_service.py` | ⬜ |
| T-05 | Integrar score na lógica de `_scrape_article()`: rejeitar <35, salvar score no dict | `radar_scraper_service.py` | ⬜ |
| T-06 | Implementar `_pretriagem_ia(titulo, trecho) -> dict` com Claude | `radar_scraper_service.py` | ⬜ |
| T-07 | Reforçar `_is_camacari_region()`: fontes `local` exigem score ≥35, `regional` ≥50 | `radar_scraper_service.py` | ⬜ |

**Notas T-04:**
```python
def _calculate_relevancia_score(self, titulo: str, corpo: str | None) -> int:
    score = 0
    titulo_lower = titulo.lower()
    corpo_trecho = (corpo or "")[:500].lower()
    if any(kw in titulo_lower for kw in ["camaçari", "camacari", "camaçarí"]):
        score += 35
    elif any(kw in titulo_lower for kw in KEYWORDS_CAMACARI_REGIAO):
        score += 25
    if any(kw in corpo_trecho for kw in ["camaçari", "camacari"]):
        score += 15
    if any(kw in (titulo_lower + " " + corpo_trecho) for kw in ["18ª delegacia", "delegacia de camaçari", "26ª cipm", "31ª cipm"]):
        score += 15
    if any(kw in titulo_lower for kw in ["homicídio", "homicidio", "tráfico", "trafico", "baleado", "preso em flagrante", "assassinado"]):
        score += 10
    return min(score, 100)
```

**Notas T-05:** Em `_scrape_article()`, após extrair título e corpo:
```python
relevancia_score = self._calculate_relevancia_score(titulo, corpo)
if relevancia_score < 35:
    logger.debug("Score baixo (%d), rejeitando: %s", relevancia_score, titulo[:80])
    return None
if 35 <= relevancia_score < 60:
    ajuste = await self._pretriagem_ia(titulo, corpo[:200] if corpo else "")
    relevancia_score = max(0, min(100, relevancia_score + ajuste))
    if relevancia_score < 35:
        return None
# Adicionar ao dict retornado:
return { ..., "relevancia_score": relevancia_score }
```

**Notas T-06:** Usar `anthropic` client (já disponível no env). Timeout 5s. Retornar `int` ajuste (-10 a +10).

---

## Grupo 3 — tRPC Router (depende de T-01)

| ID | Tarefa | Arquivo | Status |
|----|--------|---------|--------|
| T-08 | Incluir `relevanciaScore` no select de `radar.list` e `radar.getById` | `src/lib/trpc/routers/radar.ts` | ⬜ |
| T-09 | Adicionar filtro opcional `relevanciaMin?: number` ao input de `radar.list` | `src/lib/trpc/routers/radar.ts` | ⬜ |
| T-10 | Adicionar breakdown por relevância ao `radar.stats` (confirmadas/prováveis/possíveis) | `src/lib/trpc/routers/radar.ts` | ⬜ |

---

## Grupo 4 — Sheet Redesign (independente de T-01, mas fica melhor com T-08)

| ID | Tarefa | Arquivo | Status |
|----|--------|---------|--------|
| T-11 | Reestruturar SheetContent para `flex flex-col p-0` com sticky header/footer | `radar-noticia-sheet.tsx` | ⬜ |
| T-12 | Implementar sticky header: badges, StatusPill animado, título line-clamp-2, botões | `radar-noticia-sheet.tsx` | ⬜ |
| T-13 | Implementar sticky footer: "Abrir fonte", "Re-analisar", "Copiar resumo" | `radar-noticia-sheet.tsx` | ⬜ |
| T-14 | Substituir seção Resumo IA por card `bg-zinc-50` com Sparkles + skeleton shimmer | `radar-noticia-sheet.tsx` | ⬜ |
| T-15 | Substituir grid Localização por chips inline `rounded-full` | `radar-noticia-sheet.tsx` | ⬜ |
| T-16 | Adicionar avatares com iniciais coloridas por papel na seção Envolvidos | `radar-noticia-sheet.tsx` | ⬜ |
| T-17 | Substituir `<details>` por Accordion shadcn nos matches DPE + barra de progresso score | `radar-noticia-sheet.tsx` | ⬜ |

**Notas T-11:** SheetContent atual tem `className="w-full sm:max-w-lg overflow-y-auto"`. Mudar para `"w-full sm:max-w-lg flex flex-col p-0 gap-0"`. Header e footer são `div shrink-0`. Body é `div flex-1 overflow-y-auto px-6 py-4 space-y-5`.

**Notas T-12 (StatusPill):**
```tsx
function StatusPill({ status }: { status: string }) {
  if (status === "pending") return (
    <span className="flex items-center gap-1 text-xs text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Analisando
    </span>
  );
  if (status === "completed") return (
    <span className="flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 className="h-3 w-3" /> Analisado
    </span>
  );
  if (status === "failed") return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <XCircle className="h-3 w-3" /> Falha
    </span>
  );
  return null;
}
```

**Notas T-16 (Avatar):**
```tsx
function EnvolvidoAvatar({ nome, papel }: { nome: string | null; papel: string }) {
  const initials = (nome || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const colorClass = avatarColors[papel] || "bg-zinc-100 text-zinc-600";
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", colorClass)}>
      {initials}
    </div>
  );
}
```

**Notas T-17:** Importar `Accordion, AccordionContent, AccordionItem, AccordionTrigger` de `@/components/ui/accordion`. `defaultValue` array com IDs dos matches score ≥ 80.

---

## Grupo 5 — Feed (chip de relevância no card)

| ID | Tarefa | Arquivo | Status |
|----|--------|---------|--------|
| T-18 | Adicionar chip Confirmada/Provável/Possível ao `RadarNoticiaCard` | `radar-noticia-card.tsx` | ⬜ |
| T-19 | Adicionar filtro de relevância ao `RadarFiltros` + estado na página principal | `radar-filtros.tsx` + `page.tsx` | ⬜ |

**Notas T-18:** Adicionar após badge de crime existente. Usar dados de `relevanciaScore` do item.
```tsx
function RelevanciaChip({ score }: { score: number }) {
  if (score >= 85) return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Confirmada</Badge>;
  if (score >= 60) return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Provável</Badge>;
  if (score >= 35) return <Badge className="bg-zinc-100 text-zinc-600 text-[10px]">Possível</Badge>;
  return null;
}
```

---

## Ordem de Execução com Subagentes

```
Round 1 (paralelo):
  Agente A → T-01 + T-02 + T-03   (DB/Schema/Migration)
  Agente B → T-04 + T-05 + T-06 + T-07  (Python backend)
  Agente C → T-11 + T-12 + T-13   (Sheet estrutura + header + footer)
  Agente D → T-14 + T-15          (Sheet Resumo IA + Localização chips)

Round 2 (paralelo, após Round 1):
  Agente E → T-08 + T-09 + T-10   (tRPC — depende T-01)
  Agente F → T-16 + T-17          (Sheet Envolvidos + Matches accordion)
  Agente G → T-18 + T-19          (Feed chip + filtro)
```

## Legendas
- ⬜ Pendente
- 🔄 Em progresso
- ✅ Completo
- ❌ Bloqueado
