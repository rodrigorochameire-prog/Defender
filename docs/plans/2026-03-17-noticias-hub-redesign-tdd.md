# TDD - Central de Notícias Jurídicas (Redesign)

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigo |
| Status | Aprovado |
| Criado | 2026-03-17 |
| Atualizado | 2026-03-17 |

---

## Contexto

O OMBUDS já possui uma página de notícias jurídicas funcional com scraping de fontes como STF, STJ, CONJUR, JOTA, Dizer o Direito, IBCCrim e Empório do Direito. O sistema faz enriquecimento com IA (síntese, impacto prático, ratio decidendi), organiza por pastas temáticas, vincula automaticamente a processos e envia digest semanal via WhatsApp.

Porém, a experiência atual é puramente funcional — sem cuidado com tipografia, densidade visual, modo de leitura ou fluidez de triagem. O resultado é que uma feature poderosa é subutilizada porque a navegação não é prazerosa.

O objetivo deste redesign é transformar a página em uma **central de formação jurídica integrada**, onde o defensor lê com prazer, decide com rapidez e aprende de forma contínua.

**Domínio**: Conhecimento / Atualização Jurídica
**Stakeholders**: Defensores Públicos (uso diário de atualização)

---

## Definição do Problema

### Problemas que Estamos Resolvendo

- **Problema 1**: Cards do feed sem hierarquia visual — título, resumo e metadados competem entre si
  - Impacto: usuário não sabe onde focar, abandona rapidamente
- **Problema 2**: Modo de leitura inadequado — o sheet lateral atual é estreito e não exibe o artigo completo com boa tipografia
  - Impacto: defensor precisa abrir a fonte original para ler, quebrando o fluxo
- **Problema 3**: Triagem de pendentes exige clicar em cada card para decidir — lento e frustrante com 20+ pendentes diários
  - Impacto: backlog de pendentes acumula, curation deixa de ser feita

### Por Que Agora?

O pipeline de scraping e enriquecimento está maduro e estável. Não faz sentido ter um motor excelente com uma interface ruim. Este é o momento de investir na camada de apresentação.

### Impacto de NÃO Resolver

- **Defensores**: continuam abrindo fontes externas em vez de usar o OMBUDS
- **Sistema**: a feature de notícias se torna irrelevante apesar do investimento no backend

---

## Escopo

### ✅ Dentro do Escopo (V1)

- Novo layout de três zonas: sidebar pastas + feed + reader panel
- Redesign completo dos cards (hierarquia: título → síntese → impacto prático → tags)
- Reader panel imersivo (65% da tela) com artigo completo + resumo IA colapsável
- Modo triagem com inline expand via hover e ações sem abrir outra tela
- Navegação por categoria como pills horizontais (não abas)
- Atalhos de teclado: J/K, S, Esc no reader; A/D/↑↓ na triagem
- Scroll independente entre feed e reader

### ❌ Fora do Escopo (V1)

- Mudanças no backend / routers tRPC (apenas UI)
- Novos scrapers ou fontes
- Modo mobile dedicado (responsivo básico apenas)
- Exportação de notícias para PDF

### 🔮 Considerações Futuras (V2+)

- Modo leitura offline / download de artigos
- Highlight e anotações inline no artigo
- Recomendação personalizada baseada em histórico de leitura

---

## Solução Técnica

### Visão Geral da Arquitetura

Redesign puramente frontend. Nenhuma mudança em schema, routers ou serviços. Todos os dados já existem — o trabalho é na camada de apresentação (`src/app/(dashboard)/admin/noticias/` e `src/components/noticias/`).

**Componentes a criar ou reescrever**:

| Componente | Arquivo | Ação |
|-----------|---------|------|
| Layout três zonas | `noticias-layout.tsx` | Criar |
| Card redesenhado | `noticias-card.tsx` | Reescrever |
| Reader panel | `noticias-reader-panel.tsx` | Reescrever (era sheet) |
| Modo triagem | `noticias-triagem.tsx` | Reescrever |
| Pills de categoria | `noticias-categoria-pills.tsx` | Criar |
| Caixa impacto IA | `noticias-ia-box.tsx` | Criar |

### Layout de Três Zonas

```
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar 220px]  │  [Feed flex-1]  │  [Reader 65% ou fechado] │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamento dinâmico**:
- `readerOpen === false` → Feed ocupa `flex-1` (100% da área útil)
- `readerOpen === true` → Feed encolhe para `w-[35%]`, Reader aparece com `w-[65%]`
- Transição: `transition-all duration-300 ease-in-out`
- Estado gerenciado por `useState<string | null>(selectedNoticiaId)`

### Design dos Cards

```
┌─────────────────────────────────────────────────────┐
│ ▌ [CATEGORIA] · [FONTE] · [tempo]           [★]    │
│                                                      │
│   [Título — text-lg font-semibold, 2 linhas max]    │
│                                                      │
│   Síntese                                            │
│   [2-3 linhas text-sm text-zinc-600]                │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⚡ Impacto prático: [1 linha emerald-800]    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [tag] [tag] [tag]                      ⏱ X min    │
└─────────────────────────────────────────────────────┘
```

**Tokens de design**:
- Borda esquerda 3px por fonte (STF=blue-500, CONJUR=zinc-400, Dizer o Direito=emerald-500, JOTA=violet-500, IBCCrim=orange-500)
- Hover: `shadow-md -translate-y-px transition-all duration-150`
- Impacto IA: `bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-3 py-2 text-sm`
- Tags: `bg-zinc-100 text-zinc-500 text-xs rounded-full px-2 py-0.5`

### Reader Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Voltar]   [pasta ▾]   [★ Salvar]   [⋯ Mais]              │
├─────────────────────────────────────────────────────────────────┤
│  [CATEGORIA · FONTE · data]                                     │
│  [Título — text-2xl font-bold]                                 │
│                                                                  │
│  ┌─ Resumo IA (colapsável) ──────────────────────────────────┐  │
│  │  Síntese: ...                                              │  │
│  │  ⚡ Impacto: ...                                           │  │
│  │  📋 Ratio decidendi: ...                                   │  │
│  │  ⚖️ Casos aplicáveis: ...                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ─── Artigo completo ───                                        │
│  [prose prose-zinc max-w-none leading-relaxed]                  │
│                                                                  │
│  [Processos vinculados]  [+ Vincular processo]                  │
│  [🔗 Fonte]  [📤 Compartilhar]  [🔄 Re-analisar]               │
└─────────────────────────────────────────────────────────────────┘
```

**Detalhes técnicos**:
- Scroll: `overflow-y-auto` independente do feed
- Tipografia do artigo: `@tailwindcss/typography` (prose) com `prose-zinc`
- Caixa IA: colapsável com `<details>` nativo ou estado `useState<boolean>`
- Atalhos via `useEffect` + `addEventListener('keydown')`:
  - `J` → próxima notícia, `K` → anterior
  - `S` → toggle salvar/favorito
  - `Esc` → fechar reader

### Modo Triagem

Overlay sobre o feed, acessado por botão no header com badge de contagem.

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Sair]          N pendentes          [Aprovar todos]        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──── Card colapsado (padrão) ──────────────────────────────┐  │
│  │ ▌ CATEGORIA · FONTE · tempo                               │  │
│  │   Título da notícia...                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──── Card expandido (hover/focus) ─────────────────────────┐  │
│  │ ▌ CATEGORIA · FONTE · tempo                               │  │
│  │   Título da notícia...                                    │  │
│  │                                                            │  │
│  │   Síntese: ...                                            │  │
│  │   ⚡ Impacto: ...                                         │  │
│  │                                                            │  │
│  │   [✓ Aprovar]  [✗ Descartar]  [→ Abrir completo]         │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamento**:
- Um único `expandedId` no estado — só um card expandido por vez
- Aprovar: chama `noticias.aprovar`, fade-out do card, remove da lista local
- Descartar: chama `noticias.descartar`, slide-left + remove
- Abrir completo: abre reader sem sair da triagem
- Atalhos: `A` aprovar card em foco, `D` descartar, `↑↓` navegar

### Categoria Pills

```tsx
const categorias = ['Todas', 'Legislativa', 'Jurisprudencial', 'Artigo', 'Salvos']

// Estilo ativo:  bg-zinc-900 text-white
// Estilo padrão: bg-transparent text-zinc-500 hover:text-zinc-900
```

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Status |
|------|--------|-----------|--------|
| **1 - Layout** | Layout três zonas | `noticias-layout.tsx` com sidebar + feed + reader | ⬜ |
| | Pills de categoria | Substituir abas por pills | ⬜ |
| **2 - Card** | Redesenho do card | Nova hierarquia visual + borda fonte + impacto IA | ⬜ |
| | Caixa impacto IA | Componente isolado `noticias-ia-box.tsx` | ⬜ |
| **3 - Reader** | Reader panel | Novo painel 65% com prose + resumo colapsável | ⬜ |
| | Atalhos de teclado | J/K/S/Esc via useEffect | ⬜ |
| **4 - Triagem** | Triagem inline | Hover expand + aprovar/descartar sem modal | ⬜ |
| | Animações de saída | Fade-out e slide-left nos cards | ⬜ |
| **5 - Polish** | Transições | `transition-all` no layout, hover suave nos cards | ⬜ |
| | Responsivo básico | Sidebar colapsável em < 1024px | ⬜ |

---

## Considerações de Segurança

- Sem mudanças no backend — mesmas `protectedProcedure` já existentes
- Nenhum dado novo exposto; apenas renderização diferente dos dados atuais
- Artigo completo vem do campo `conteudo` já armazenado (sem nova requisição externa no frontend)

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Artigo sem `conteudo` preenchido | Médio | Fallback: mostrar `resumo` + link para fonte original |
| Artigo sem análise IA | Baixo | Caixa IA oculta se `analiseIa` for null |
| Performance com muitos cards | Médio | Manter paginação existente (já implementada) |
| Scroll do reader conflitar com page scroll | Baixo | Isolar com `overflow-hidden` no container pai |

---

## Métricas de Sucesso

- Triagem diária passa a ser feita (hoje é ignorada)
- Defensor lê artigos completos dentro do OMBUDS (não abre fonte externa)
- Tempo médio na página aumenta (indicador de engajamento real)

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Triagem** | Processo de aprovar/descartar notícias pendentes antes de entrarem no feed |
| **Feed** | Lista principal de notícias aprovadas |
| **Reader panel** | Painel lateral direito que exibe o artigo completo |
| **Enriquecimento IA** | Processo de síntese e análise de impacto feito pelo Claude |
| **Pastas** | Organização temática das notícias (Criminal Comum, Júri, etc.) |
