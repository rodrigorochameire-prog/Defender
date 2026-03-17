# Notícias Jurídicas — Hub Aprimorado (Design Doc)

> **Sessão de brainstorming:** 2026-03-16
> **Status:** Aprovado pelo usuário — pronto para implementação
> **Plano base:** `2026-03-16-noticias-juridicas-design.md` (Tasks 1–9, infraestrutura)
> **Este doc:** Camadas de enriquecimento — IA, Magazine Layout, Favoritos, Associações, Relatórios

---

## Objetivo

Transformar o feed de notícias jurídicas em um **hub completo** onde o defensor público:
1. Lê resumos com IA em 8 minutos pela manhã (Modo Digest)
2. Pesquisa por tese/conceito jurídico (Modo Pesquisa)
3. Estuda em profundidade com reader focado (Modo Estudo)
4. Vincula notícias a processos e exporta para peças
5. Gera relatórios mensais de jurisprudência por tema

---

## Fase 1 — Enriquecimento com IA (Prioridade Máxima)

### Estratégia: Lazy Enrichment + Batch na Triagem

- **Lazy:** ao expandir um card pela primeira vez, Claude analisa e salva o resultado
- **Streaming:** resposta fluída via streaming — sem espera bloqueante
- **Cache:** resultado salvo em `analise_ia` (jsonb) — nunca reprocesa
- **Batch automático:** ao aprovar notícia na triagem, dispara enriquecimento em background

### Estrutura da Análise IA

Campo `analise_ia` no schema (jsonb):

```typescript
type AnaliseIA = {
  resumoExecutivo: string;       // 3-4 linhas, linguagem direta
  impractoPratico: string;       // "O que muda para a DPE-BA?"
  ratiodecidendi?: string;       // Só para jurisprudencial — tese em 1-2 frases
  casosAplicaveis: string[];     // ["réu preso preventivamente", "tráfico privilegiado", ...]
  processadoEm: string;          // ISO timestamp
  modeloUsado: string;           // "claude-sonnet-4-6"
};
```

### Prompt Claude (estruturado)

```
Você é um assistente jurídico da Defensoria Pública da Bahia (DPE-BA), especializado em direito penal e processual penal.

Analise a notícia jurídica abaixo e responda em JSON com esta estrutura:
{
  "resumoExecutivo": "3-4 frases diretas sobre o que aconteceu",
  "impractoPratico": "O que isso muda na prática para defensores públicos criminais?",
  "ratiodecidendi": "Tese fixada em 1-2 frases (APENAS se for jurisprudência — omitir para legislação e artigos)",
  "casosAplicaveis": ["situação 1", "situação 2", ...]
}

Categoria: {categoria}
Título: {titulo}
Conteúdo: {conteudo_truncado_a_4000_chars}
```

### UI dos 4 Blocos IA

No card expandido, exibidos em accordion ou tabs:

```
╔═ Resumo IA ═══════════════════════════════════════════╗
║ "A 6ª Turma do STJ fixou que decisões de prisão      ║
║  preventiva que se limitam a mencionar reiteração    ║
║  criminal sem indicar fatos concretos são nulas…"   ║
╚═══════════════════════════════════════════════════════╝

╔═ Impacto Prático ═════════════════════════════════════╗
║ "Defensores podem impetrar HC apontando nulidade     ║
║  em decisões cautelares genéricas. Aplicável         ║
║  especialmente em casos com réu preso preventivo…"  ║
╚═══════════════════════════════════════════════════════╝

╔═ Ratio Decidendi ═════════════════════════════════════╗
║ "A fundamentação abstrata de prisão preventiva,      ║
║  sem indicação de elementos concretos do caso,       ║
║  viola o art. 312 do CPP e é passível de nulidade." ║
╚═══════════════════════════════════════════════════════╝

Casos aplicáveis: [réu preso preventivo] [STJ 6ª Turma] [nulidade cautelar]
```

---

## Fase 2 — Magazine Layout

### Estrutura Visual da Página

```
┌─ HEADER ──────────────────────────────────────────────┐
│ [🗞 Notícias Jurídicas]    [Hoje] [Buscar...] [⚙]    │
│ [Legislativas] [Jurisprudenciais] [Artigos] [Salvos]  │
│ [Relatórios]                                           │
└───────────────────────────────────────────────────────┘

┌─ FEATURED (full width) ───────────────────────────────┐
│                                                         │
│  [CONJUR] [JURISPRUDENCIAL]              16/03 · 5min │
│                                                         │
│  STJ invalida prisão preventiva com fundamentação     │
│  genérica mesmo com histórico de reiteração criminal  │
│                                                         │
│  ╔═ IA ══════════════════════════════════════════════╗ │
│  ║ "A 6ª Turma fixou que decisões cautelares devem  ║ │
│  ║  indicar fatos concretos, afastando abstrações…" ║ │
│  ╚══════════════════════════════════════════════════╝ │
│                                                         │
│  [⭐ Salvar] [📎 Caso] [↗ Abrir] [⧉ Copiar Ratio]    │
└───────────────────────────────────────────────────────┘

┌─ GRID 2 COLUNAS ──────────────────────────────────────┐
│ ┌───────────────────┐  ┌───────────────────────────┐  │
│ │ [STJ] [PENAL]     │  │ [IBCCRIM] [ARTIGO]        │  │
│ │ Título da notícia │  │ Título do artigo doutrin. │  │
│ │ Resumo IA preview │  │ Resumo IA preview…        │  │
│ │ [⭐][📎][↗]       │  │ [⭐][📎][↗]               │  │
│ └───────────────────┘  └───────────────────────────┘  │
│ ┌───────────────────┐  ┌───────────────────────────┐  │
│ │ ...               │  │ ...                       │  │
└───────────────────────────────────────────────────────┘
```

### Anatomia do Card Compacto (grid)

- Barra colorida no topo (cor da fonte)
- Badge fonte + badge categoria + data + tempo de leitura
- Título (2 linhas max, `line-clamp-2`)
- Resumo IA preview (2 linhas, fundo `zinc-50 dark:zinc-800/50`, itálico sutil)
- Tags row (máx 3 tags visíveis)
- Ações: ⭐ favorito | 📎 salvar no caso | ↗ abrir original

### Card Featured (primeiro da lista)

- Full width
- Título maior (`text-xl font-semibold`)
- Resumo IA completo (não truncado)
- Ratio decidendi se jurisprudencial
- Todos os 4 blocos IA visíveis sem expandir
- Imagem da notícia se disponível (lado direito)

### Modo Reader (click para expandir)

- Abre como sheet/drawer lateral (não inline) — preserva o feed
- Fundo off-white `zinc-50`, tipografia maior `text-base leading-7`
- 4 blocos IA no topo em cards coloridos
- Conteúdo completo abaixo com `prose` do Tailwind
- Barra lateral direita: destacar trecho | adicionar nota | salvar

---

## Fase 3 — Favoritos

### Schema

```typescript
export const noticiasFavoritos = pgTable("noticias_favoritos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id).notNull(),
  nota: text("nota"),            // anotação pessoal do defensor
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("not_fav_user_idx").on(table.userId),
  index("not_fav_unique").on(table.userId, table.noticiaId), // unique constraint
]);
```

### UX

- Ícone ⭐ em todo card — toggle optimistic update
- Favorito ativo: `text-amber-500 fill-amber-500`
- 4ª aba "Salvos" — só aparece se houver favoritos
- Na aba Salvos: campo "nota" editável inline por card
- Ordenação: mais recente favoritado no topo

### tRPC Endpoints

```
noticias.favoritar({ noticiaId }) → toggle (cria ou remove)
noticias.listFavoritos() → notícias favoritadas do usuário
noticias.updateNotaFavorito({ noticiaId, nota }) → salvar anotação
```

---

## Fase 4 — Associação a Casos/Processos

### Schema

```typescript
export const noticiasProcessos = pgTable("noticias_processos", {
  id: serial("id").primaryKey(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id).notNull(),
  processoId: integer("processo_id").references(() => processos.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("not_proc_noticia_idx").on(table.noticiaId),
  index("not_proc_processo_idx").on(table.processoId),
]);
```

### UX de Vínculo

- Botão "📎 Salvar no Caso" abre **Sheet lateral** com search de processos
- Search: busca por número, nome do réu ou crime
- Click no processo → vincula + toast "Salvo em HC 123456 — FULANO"
- Badge no card: "✓ 2 casos" — click mostra lista dos processos vinculados

### Integração no Processo

- Aba "Inteligência" do processo (`/admin/casos/[id]`) mostra notícias vinculadas
- Cada notícia exibe ratio decidendi + link para o hub

### tRPC Endpoints

```
noticias.vincularProcesso({ noticiaId, processoId, observacao })
noticias.desvincularProcesso({ noticiaId, processoId })
noticias.listByProcesso({ processoId })
noticias.listProcessosByNoticia({ noticiaId })
```

---

## Fase 5 — Relatórios por Tema

### Geração

1. Defensor seleciona: período + temas (checkboxes) + categorias
2. Claude recebe: todas as notícias aprovadas no período para os temas selecionados
3. Retorna: síntese narrativa por tema + lista de notícias com ratio decidendi

### Prompt de Relatório

```
Você é um assistente jurídico da DPE-BA. Gere um relatório de jurisprudência e legislação.

Período: {período}
Tema: {tema}
Notícias ({count}):
{lista de títulos + ratio decidendi de cada uma}

Gere:
1. "síntese": Parágrafo narrativo (5-8 linhas) sobre a tendência jurisprudencial/legislativa do período
2. "destaques": Array com 2-3 decisões/leis mais importantes
3. "alertas": Array com pontos de atenção para a defesa
```

### Layout do Relatório

```
┌─ RELATÓRIO DE JURISPRUDÊNCIA ─────────────────────────┐
│ Período: Março 2026  ·  Gerado em 16/03/2026          │
│ Temas: Direito Penal, Execução Penal                  │
│                                ─────────────────────── │
│ DIREITO PENAL                                          │
│                                                         │
│ Síntese: "Em março de 2026, o STJ consolidou o        │
│ entendimento de que decisões cautelares genéricas      │
│ violam o art. 312 do CPP. Duas turmas julgaram…"      │
│                                                         │
│ Destaques:                                             │
│  ★ STJ HC 123 — fundamentação genérica invalida       │
│  ★ STF RE 456 — progressão especial tráfico           │
│                                                         │
│ ⚠ Alertas para a Defesa:                              │
│  • Monitorar aplicação do HC 123 nas varas locais      │
│                                                         │
│ Notícias referenciadas (8):                           │
│  1. [ConJur] STJ decide que... → ratio decidendi      │
│  2. [STJ] 6ª Turma julga... → ratio decidendi         │
│  ...                                                   │
│                                                         │
│ [📄 Exportar PDF]  [📋 Copiar Tudo]  [💾 Salvar]      │
└───────────────────────────────────────────────────────┘
```

### Modos de Acesso

- Botão "Relatório" no header da página
- 5ª aba "Relatórios" no hub
- Relatórios salvos ficam em histórico

---

## Modos de Uso

| Modo | Trigger | UX |
|------|---------|-----|
| **Manhã — Digest** | Aba "Hoje" | Últimas 24h, ordered by relevância, resumo IA em destaque, ~8 min |
| **Pesquisa — Tese** | Campo de busca semântica | Resultados por conceito, ratio decidendi em destaque, "Copiar" |
| **Estudo — Reader** | Click no card | Sheet fullscreen, tipografia reader, 4 blocos IA + conteúdo completo |

---

## Stack de Implementação

| Componente | Tech |
|------------|------|
| IA Enrichment | Claude Sonnet 4.6 via `@anthropic-ai/sdk`, streaming |
| Relatório PDF | `@react-pdf/renderer` ou `html2pdf.js` |
| Magazine Grid | CSS Grid + `order` para featured card |
| Reader Mode | shadcn Sheet + Tailwind `prose` |
| Favoritos | Optimistic updates via tRPC + React Query |
| Associação | shadcn Sheet + Combobox search de processos |

---

## Resumo de Novas Tasks (adicionais ao plano base)

| # | Task | Dependência |
|---|------|-------------|
| A | Schema: `noticias_favoritos` + `noticias_processos` + `analise_ia` no schema existente | Task 1 base |
| B | tRPC: endpoints de favoritos + vínculos + relatório | Task 5 base |
| C | IA Enrichment: `src/lib/noticias/enricher.ts` + tRPC `enriquecerComIA` | Task 3 base |
| D | Magazine Layout: refatorar `noticias-feed.tsx` com featured + grid | Task 7 base |
| E | Reader Mode: `noticias-reader-sheet.tsx` + 4 blocos IA | Task C |
| F | Favoritos UI: toggle ⭐, aba Salvos, nota editável | Task B |
| G | Associação UI: Sheet "Salvar no Caso" + badge "N casos" | Task B |
| H | Relatórios UI: seletor + geração IA + export | Task B + C |
| I | Integração Processo: aba Inteligência com notícias vinculadas | Task G |
