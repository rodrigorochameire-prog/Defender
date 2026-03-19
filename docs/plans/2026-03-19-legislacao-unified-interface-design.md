# Legislação — Interface Unificada: Design

## Contexto

O hub de legislação atual tem 3 modos separados (Busca Global, Por Lei, Árvore) com um mode switcher no header. O fluxo de uso dominante do defensor é: **saber qual artigo precisa e ir direto**, com buscas por conceito como caso secundário. A interface unificada elimina a fricção de trocar de modo.

## Layout: 3 Colunas

```
┌─────────────────┬──────────────────────┬─────────────────────────────┐
│  Leis (1)       │  Árvore + Busca (2)  │  Conteúdo do artigo (3)     │
│  160px          │  260px               │  flex-1                     │
│  (colapsável)   │                      │                             │
│                 │  [🔍 busca inline ]  │  CP › Título I › Cap. I     │
│  ● CP           │                      │  Art. 121 — Homicídio       │
│  ● CPP          │  ▼ Título I          │                             │
│  ● LEP          │    ▼ Capítulo I      │  Matar alguém:              │
│  ● LMP          │      Art. 121 ●      │  Pena — reclusão...         │
│  ...            │      Art. 122        │                             │
│                 │    ▷ Capítulo II     │  [★][◀ Anterior] [Próximo ▶]│
└─────────────────┴──────────────────────┴─────────────────────────────┘
```

### Coluna 1 — Lei Selector (colapsável)

- Lista das 28 leis com cor + sigla + nome abreviado
- Lei ativa destacada com cor da lei
- Toggle de colapso: expandida mostra nome completo; colapsada mostra só bolinhas coloridas
- Tooltip no hover quando colapsada
- Clique troca a lei exibida na coluna 2

### Coluna 2 — Árvore + Busca Inline

- Campo de busca fixo no topo
- **Busca por número** (`"121"`) → filtra artigos instantaneamente
- **Busca por texto** (`"flagrante"`) → debounce 300ms, lista achatada de resultados
- Ao limpar → volta para a árvore hierárquica, preservando estado expandido
- Botão `"Buscar em todas as leis"` → abre modal com `LegislacaoSearch` atual
- Estado expandido persiste por sessão (localStorage por lei)

### Coluna 3 — Conteúdo

- Mesmo `ArtigoRenderer` atual
- Breadcrumb clicável (segmentos clicáveis expandem o nó na árvore)
- Navegação Anterior/Próximo no footer (com acento correto)
- Destaques, notas e favoritos sem mudança

## Persistência (localStorage)

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `legislacao:leiId` | `"codigo-penal"` | Última lei selecionada |
| `legislacao:artigoId` | `"cp:art-121"` | Último artigo aberto |
| `legislacao:expanded:{leiId}` | `["path1","path2"]` | Nós expandidos por lei |
| `legislacao:sidebarCollapsed` | `"true"/"false"` | Estado da coluna 1 |

## Leis — De 15 para 28

**Existentes (15):** CP, CPP, LEP, LMP, LD, ECA, LAA, CF/88, LCP, ED, LPT, LPTe, LMF, LC80, LCE26

**A adicionar (13):**

| ID | Sigla | Lei | Cor |
|----|-------|-----|-----|
| `jecrim` | JECRIM | Lei 9.099/1995 | `#10b981` |
| `crimes-hediondos` | LCH | Lei 8.072/1990 | `#dc2626` |
| `interceptacao` | LIT | Lei 9.296/1996 | `#7c3aed` |
| `organizacao-criminosa` | LORC | Lei 12.850/2013 | `#1d4ed8` |
| `ctb-crimes` | CTB | Lei 9.503/1997 (cap. XIX) | `#d97706` |
| `tortura` | LT | Lei 9.455/1997 | `#991b1b` |
| `racismo` | LR | Lei 7.716/1989 | `#065f46` |
| `crimes-ambientais` | LCA | Lei 9.605/1998 | `#15803d` |
| `estatuto-idoso` | EI | Lei 10.741/2003 (cap. penal) | `#0369a1` |
| `lavagem-dinheiro` | LLD | Lei 9.613/1998 | `#6b21a8` |
| `identificacao-criminal` | LIC | Lei 12.037/2009 | `#0f766e` |
| `crimes-ciberneticos` | LCC | Lei 12.737/2012 + 14.155/2021 | `#1e40af` |
| `antiterrorismo` | LAT | Lei 13.260/2016 | `#7f1d1d` |

## O que some

- Mode switcher (tabs "Busca Global / Por Lei / Árvore") do header
- `LegislacaoTabs` component — substituído pela interface unificada
- `LegislacaoSearch` vira modal (componente mantido, só muda onde é renderizado)

## Correções de Bugs incluídas

- "Proximo" → "Próximo" (`legislacao-tree.tsx:453`)
- `handleSearchResultClick` → abre na árvore (não em "tabs")
- `totalArtigos` preenchido dinamicamente
- Breadcrumb clicável
- Estado expandido não resetado ao navegar

## Componentes

| Componente | Ação | Arquivo |
|------------|------|---------|
| `LeiSelectorPanel` | Criar | `src/components/legislacao/lei-selector-panel.tsx` |
| `LegislacaoUnified` | Criar | `src/components/legislacao/legislacao-unified.tsx` |
| `LegislacaoTree` | Modificar — adicionar busca inline + persistência | existente |
| `LegislacaoSearch` | Modificar — wrapper modal | existente |
| `page.tsx` | Simplificar — usar `LegislacaoUnified` | existente |
| `index.ts` | Adicionar 13 leis | existente |
| `data/*.ts` | Criar 13 arquivos | novos |
