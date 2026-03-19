# Legislação — Interface Unificada: Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refatorar o hub de legislação de 3 modos separados para interface unificada de 3 colunas, expandindo de 15 para 28 leis.

**Architecture:** Interface unificada com `LegislacaoUnified` (3 colunas), `LeiSelectorPanel` (colapsável), `LegislacaoTree` melhorado com busca inline e persistência localStorage. Leis novas adicionadas como arquivos de dados TypeScript.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, localStorage para persistência, `loadLegislacao()` para lazy loading.

**Design doc:** `docs/plans/2026-03-19-legislacao-unified-interface-design.md`

---

## Task 1: Adicionar 13 novas leis ao registro

**Files:**
- Modify: `src/config/legislacao/index.ts`

**Step 1: Adicionar as 13 entradas à array `LEGISLACOES`**

Adicionar após a entrada `lce26-bahia` (linha 163):

```typescript
  {
    id: "jecrim",
    nome: "Lei dos Juizados Especiais Criminais",
    nomeAbreviado: "JECRIM",
    referencia: "L 9.099/1995",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#10b981",
  },
  {
    id: "crimes-hediondos",
    nome: "Lei dos Crimes Hediondos",
    nomeAbreviado: "LCH",
    referencia: "L 8.072/1990",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l8072compilado.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#dc2626",
  },
  {
    id: "interceptacao",
    nome: "Lei de Interceptação Telefônica",
    nomeAbreviado: "LIT",
    referencia: "L 9.296/1996",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9296.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#7c3aed",
  },
  {
    id: "organizacao-criminosa",
    nome: "Lei de Organização Criminosa",
    nomeAbreviado: "LORC",
    referencia: "L 12.850/2013",
    fonte: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#1d4ed8",
  },
  {
    id: "ctb-crimes",
    nome: "Código de Trânsito Brasileiro — Crimes",
    nomeAbreviado: "CTB",
    referencia: "L 9.503/1997 — Cap. XIX",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#d97706",
  },
  {
    id: "tortura",
    nome: "Lei de Tortura",
    nomeAbreviado: "LT",
    referencia: "L 9.455/1997",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9455.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#991b1b",
  },
  {
    id: "racismo",
    nome: "Lei do Racismo e Discriminação",
    nomeAbreviado: "LR",
    referencia: "L 7.716/1989",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l7716.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#065f46",
  },
  {
    id: "crimes-ambientais",
    nome: "Lei de Crimes Ambientais",
    nomeAbreviado: "LCA",
    referencia: "L 9.605/1998",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#15803d",
  },
  {
    id: "estatuto-idoso",
    nome: "Estatuto do Idoso — Capítulo Penal",
    nomeAbreviado: "EI",
    referencia: "L 10.741/2003",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#0369a1",
  },
  {
    id: "lavagem-dinheiro",
    nome: "Lei de Lavagem de Dinheiro",
    nomeAbreviado: "LLD",
    referencia: "L 9.613/1998",
    fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9613.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#6b21a8",
  },
  {
    id: "identificacao-criminal",
    nome: "Lei de Identificação Criminal",
    nomeAbreviado: "LIC",
    referencia: "L 12.037/2009",
    fonte: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12037.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#0f766e",
  },
  {
    id: "crimes-ciberneticos",
    nome: "Lei de Crimes Cibernéticos",
    nomeAbreviado: "LCC",
    referencia: "L 12.737/2012 + L 14.155/2021",
    fonte: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12737.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#1e40af",
  },
  {
    id: "antiterrorismo",
    nome: "Lei Antiterrorismo",
    nomeAbreviado: "LAT",
    referencia: "L 13.260/2016",
    fonte: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13260.htm",
    dataUltimaAtualizacao: "",
    totalArtigos: 0,
    cor: "#7f1d1d",
  },
```

**Step 2: Commit**
```bash
git add src/config/legislacao/index.ts
git commit -m "feat(legislacao): adicionar 13 novas leis ao registro (28 total)"
```

---

## Task 2: Criar arquivos de dados para as 13 novas leis

Esta task é a mais trabalhosa — criar 13 arquivos TypeScript com o texto completo de cada lei no formato `Legislacao`. Usar os arquivos existentes como referência de formato (ex: `prisao-temporaria.ts`).

**Files a criar:**
- `src/config/legislacao/data/jecrim.ts`
- `src/config/legislacao/data/crimes-hediondos.ts`
- `src/config/legislacao/data/interceptacao.ts`
- `src/config/legislacao/data/organizacao-criminosa.ts`
- `src/config/legislacao/data/ctb-crimes.ts`
- `src/config/legislacao/data/tortura.ts`
- `src/config/legislacao/data/racismo.ts`
- `src/config/legislacao/data/crimes-ambientais.ts`
- `src/config/legislacao/data/estatuto-idoso.ts`
- `src/config/legislacao/data/lavagem-dinheiro.ts`
- `src/config/legislacao/data/identificacao-criminal.ts`
- `src/config/legislacao/data/crimes-ciberneticos.ts`
- `src/config/legislacao/data/antiterrorismo.ts`

**Formato padrão de cada arquivo:**

```typescript
import type { Legislacao } from "../types";

const data: Legislacao = {
  id: "<id>",
  nome: "<nome completo>",
  nomeAbreviado: "<sigla>",
  referencia: "<referência>",
  fonte: "<url planalto>",
  dataUltimaAtualizacao: "2026-03-19",
  estrutura: [
    {
      tipo: "titulo" as const,
      nome: "<nome do título>",
      filhos: [
        {
          tipo: "artigo" as const,
          id: "<sigla>:art-<numero>",
          numero: "<numero>",
          caput: "<texto do caput>",
          rubrica: "<rubrica opcional>",
          paragrafos: [
            {
              id: "<sigla>:art-<n>-p<n>",
              numero: "<n>",
              texto: "<texto>",
              alineas: [],
            }
          ],
          incisos: [
            {
              id: "<sigla>:art-<n>-inc-<romano>",
              numero: "<romano>",
              texto: "<texto>",
              alineas: [],
            }
          ],
          referencias: [],
          historico: [],
        },
      ],
    },
  ],
};

export default data;
```

**Regras de IDs:**
- Prefixo = sigla em lowercase (ex: `jecrim`, `lch`, `lit`, `lorc`, `ctb`, `lt`, `lr`, `lca`, `ei`, `lld`, `lic`, `lcc`, `lat`)
- Artigo: `{prefixo}:art-{numero}` (ex: `jecrim:art-76`)
- Parágrafo: `{prefixo}:art-{n}-p{n}` (ex: `jecrim:art-76-p1`)
- Inciso: `{prefixo}:art-{n}-inc-{romano}` (ex: `jecrim:art-76-inc-I`)
- Alínea: `{prefixo}:art-{n}-inc-{romano}-{letra}` (ex: `jecrim:art-76-inc-I-a`)

**Conteúdo de cada lei — artigos obrigatórios:**

### jecrim.ts — Lei 9.099/1995
Estrutura: TÍTULO I - Disposições Gerais | TÍTULO II - Juizado Especial Cível | TÍTULO III - Juizado Especial Criminal
- Arts. 1-5 (disposições gerais)
- Arts. 60-76 (JECRIM: competência, transação penal, arquivamento)
- Arts. 77-83 (procedimento sumaríssimo)
- Arts. 84-92 (recursos, execução)
- Art. 89 (sursis processual) — CRÍTICO
- Art. 76 (transação penal) — CRÍTICO
- Art. 74 (composição civil) — CRÍTICO

### crimes-hediondos.ts — Lei 8.072/1990
Estrutura: Disposições (sem divisão em títulos)
- Arts. 1-10 (rol, vedação de benefícios, prazo, regime)
- Art. 1º (rol dos crimes) — CRÍTICO
- Art. 2º (vedações) — CRÍTICO
- Art. 7º (delação premiada)

### interceptacao.ts — Lei 9.296/1996
Estrutura: Disposições
- Arts. 1-10 (requisitos, prazo, sigilo, crime de violação)
- Art. 2º (vedações) — CRÍTICO
- Art. 10 (crime de violação) — CRÍTICO

### organizacao-criminosa.ts — Lei 12.850/2013
Estrutura: CAPÍTULO I - Organização Criminosa | CAPÍTULO II - Investigação e Meios de Prova | CAPÍTULO III - Disposições Finais
- Art. 1º (definição) — CRÍTICO
- Art. 2º (pena) — CRÍTICO
- Arts. 3-7 (meios de prova: colaboração, captação ambiental, infiltração)
- Art. 4º (colaboração premiada) — CRÍTICO
- Arts. 8-11 (sigilo, prazo, financiamento)

### ctb-crimes.ts — Lei 9.503/1997 (Cap. XIX, arts. 291-312)
Estrutura: Capítulo XIX - Dos Crimes de Trânsito
- Art. 291 (aplicação do CP e CPP) — CRÍTICO
- Art. 302 (homicídio culposo) — CRÍTICO
- Art. 303 (lesão corporal culposa) — CRÍTICO
- Art. 304 (omissão de socorro)
- Art. 305 (fuga do local)
- Art. 306 (embriaguez ao volante) — CRÍTICO
- Arts. 307-312 (outros crimes)

### tortura.ts — Lei 9.455/1997
Estrutura: Disposições
- Arts. 1-5 (tipos penais, penas, vedações)
- Art. 1º (tipos) — CRÍTICO
- Art. 1º §4 e §5 (causas de aumento) — CRÍTICO

### racismo.ts — Lei 7.716/1989
Estrutura: Disposições
- Arts. 1-20 (tipos penais por discriminação)
- Art. 1º (definição) — CRÍTICO
- Arts. 3-8 (discriminação em serviços e emprego)
- Art. 20 (praticar, induzir racismo) — CRÍTICO

### crimes-ambientais.ts — Lei 9.605/1998
Estrutura: CAPÍTULO I - Disposições Gerais | CAPÍTULO V - Crimes contra o Meio Ambiente
- Arts. 1-3 (responsabilidade)
- Arts. 29-69-A (crimes: flora, fauna, poluição, ordenamento urbano, patrimônio cultural)
- Art. 29 (fauna) — CRÍTICO
- Art. 38 (flora) — CRÍTICO
- Art. 54 (poluição) — CRÍTICO

### estatuto-idoso.ts — Lei 10.741/2003 (apenas Título VII - Crimes)
Estrutura: Título VII - Dos Crimes
- Arts. 95-108 (crimes contra idoso)
- Art. 96 (discriminação) — CRÍTICO
- Art. 99 (abandono) — CRÍTICO
- Art. 100 (subtração patrimonial) — CRÍTICO

### lavagem-dinheiro.ts — Lei 9.613/1998
Estrutura: Disposições
- Arts. 1-12 (tipo penal, efeitos, colaboração, financiamento)
- Art. 1º (lavagem) — CRÍTICO
- Art. 1º §5 (colaboração) — CRÍTICO
- Art. 4º (medidas assecuratórias) — CRÍTICO

### identificacao-criminal.ts — Lei 12.037/2009
Estrutura: Disposições
- Arts. 1-9 (identificação civil suficiente, casos obrigatórios, banco de dados)
- Art. 3º (casos de identificação obrigatória) — CRÍTICO
- Art. 7º-A (banco de perfis genéticos)

### crimes-ciberneticos.ts — Lei 12.737/2012 + L 14.155/2021
Estrutura: Disposições
- Art. 154-A CP (invasão de dispositivo) — CRÍTICO (inserido no CP)
- Art. 154-B CP (ação penal)
- Arts. 2-6 da L 12.737 (alterações)
- Arts. 1-7 da L 14.155 (fraudes cibernéticas) — CRÍTICO

### antiterrorismo.ts — Lei 13.260/2016
Estrutura: Disposições
- Arts. 1-12 (definição, atos preparatórios, financiamento, investigação)
- Art. 2º (definição de terrorismo) — CRÍTICO
- Art. 3º (atos preparatórios)
- Art. 5º (financiamento) — CRÍTICO

**Step: Criar os 13 arquivos com conteúdo completo das leis**

Para cada arquivo, usar o texto oficial atualizado do Planalto. Seguir exatamente o formato de `prisao-temporaria.ts` como referência.

**Step: Verificar que cada arquivo exporta `default data`**

```typescript
export default data;
```

**Step: Commit**
```bash
git add src/config/legislacao/data/
git commit -m "feat(legislacao): adicionar dados completos de 13 novas leis (JECRIM, LCH, LIT, LORC, CTB, LT, LR, LCA, EI, LLD, LIC, LCC, LAT)"
```

---

## Task 3: Criar `LeiSelectorPanel`

**Files:**
- Create: `src/components/legislacao/lei-selector-panel.tsx`

**Comportamento:**
- Prop `selectedLeiId: string`
- Prop `onSelect: (id: string) => void`
- Prop `collapsed: boolean`
- Prop `onToggleCollapse: () => void`
- Expandida: mostra bolinha colorida + sigla + nome abreviado
- Colapsada: mostra só bolinhas coloridas com tooltip no hover
- Usar `Tooltip` do shadcn/ui para tooltips no estado colapsado
- Usar `ScrollArea` para lista de 28 leis

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";

interface LeiSelectorPanelProps {
  selectedLeiId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function LeiSelectorPanel({ selectedLeiId, onSelect, collapsed, onToggleCollapse }: LeiSelectorPanelProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200",
        collapsed ? "w-10" : "w-44"
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end border-b border-zinc-200 dark:border-zinc-800 p-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Law list */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          <TooltipProvider delayDuration={300}>
            {LEGISLACOES.map((lei) => {
              const isSelected = lei.id === selectedLeiId;
              if (collapsed) {
                return (
                  <Tooltip key={lei.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelect(lei.id)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer",
                          isSelected ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0 transition-transform",
                            isSelected && "ring-2 ring-offset-1"
                          )}
                          style={{
                            backgroundColor: lei.cor,
                            ringColor: lei.cor,
                          }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {lei.nomeAbreviado} — {lei.nome}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <button
                  key={lei.id}
                  type="button"
                  onClick={() => onSelect(lei.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer",
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: lei.cor }}
                  />
                  <span
                    className="font-semibold shrink-0 text-[11px]"
                    style={{ color: isSelected ? lei.cor : undefined }}
                  >
                    {lei.nomeAbreviado}
                  </span>
                  <span className="truncate text-zinc-500 dark:text-zinc-400 text-[10px]">
                    {lei.nome}
                  </span>
                </button>
              );
            })}
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step: Commit**
```bash
git add src/components/legislacao/lei-selector-panel.tsx
git commit -m "feat(legislacao): criar LeiSelectorPanel colapsável com 28 leis"
```

---

## Task 4: Melhorar `LegislacaoTree` com busca inline e persistência

**Files:**
- Modify: `src/components/legislacao/legislacao-tree.tsx`

**Mudanças:**

### 4.1 — Remover o Select de lei do componente

O `LegislacaoTree` não vai mais gerenciar a seleção de lei — recebe `selectedLeiId` como prop do pai.

Adicionar props:
```typescript
interface LegislacaoTreeProps {
  selectedLeiId: string;
  onSelectLei?: (id: string) => void; // não usado internamente, mas pode ser útil
}
```

Remover o bloco do `<Select>` (linhas 332-351 do arquivo atual).

### 4.2 — Adicionar busca inline no topo da coluna 2

Logo acima do `<ScrollArea>` da árvore, adicionar:

```tsx
import { X } from "lucide-react";

// Estado
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<Artigo[]>([]);
const [isFiltering, setIsFiltering] = useState(false);

// Effect para busca
useEffect(() => {
  if (!lei) return;
  const q = searchQuery.trim().toLowerCase();
  if (!q) {
    setIsFiltering(false);
    return;
  }
  setIsFiltering(true);

  // Busca por número de artigo (ex: "89", "121")
  const isNumeric = /^\d+/.test(q);
  if (isNumeric) {
    setSearchResults(allArtigos.filter(a => a.numero.startsWith(q)));
    return;
  }

  // Busca por texto com debounce (via setTimeout no useEffect)
  const timer = setTimeout(() => {
    setSearchResults(
      allArtigos.filter(a =>
        a.caput.toLowerCase().includes(q) ||
        a.paragrafos.some(p => p.texto.toLowerCase().includes(q)) ||
        a.incisos.some(i => i.texto.toLowerCase().includes(q))
      )
    );
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, lei, allArtigos]);
```

JSX da busca no topo da coluna 2:

```tsx
<div className="border-b border-zinc-200 dark:border-zinc-800 p-2">
  <div className="relative">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
    <input
      type="text"
      placeholder="Artigo ou texto..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
    />
    {searchQuery && (
      <button
        type="button"
        onClick={() => { setSearchQuery(""); setIsFiltering(false); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
      >
        <X className="h-3 w-3 text-zinc-400 hover:text-zinc-600" />
      </button>
    )}
  </div>
  {/* "Buscar em todas as leis" link */}
  <button
    type="button"
    onClick={onOpenGlobalSearch}
    className="mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer w-full text-right"
  >
    Buscar em todas as leis →
  </button>
</div>
```

Quando `isFiltering`, exibir lista achatada em vez da árvore:

```tsx
{isFiltering ? (
  <div className="p-2 space-y-0.5">
    {searchResults.length === 0 ? (
      <p className="text-center text-xs text-zinc-400 py-4">Nenhum artigo encontrado</p>
    ) : (
      searchResults.map(artigo => (
        <button
          key={artigo.id}
          type="button"
          onClick={() => handleSelectArtigo(artigo.id)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer",
            selectedArtigoId === artigo.id
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}
        >
          <FileText className="h-3 w-3 shrink-0 text-zinc-400" />
          <span className="font-medium">Art. {artigo.numero}</span>
          {artigo.rubrica && (
            <span className="truncate text-[10px] text-zinc-400">{artigo.rubrica}</span>
          )}
        </button>
      ))
    )}
  </div>
) : (
  /* Árvore hierárquica existente */
  <div className="p-2">...existing tree...</div>
)}
```

### 4.3 — Persistência de estado em localStorage

```typescript
// Chave de persistência por lei
const STORAGE_KEY_ARTIGO = "legislacao:artigoId";
const STORAGE_KEY_EXPANDED = (leiId: string) => `legislacao:expanded:${leiId}`;

// Ao carregar uma lei, restaurar estado expandido
useEffect(() => {
  if (!selectedLeiId) return;
  let cancelled = false;
  setLoading(true);
  setSearchQuery("");

  // Restaurar artigo selecionado
  const savedArtigoId = localStorage.getItem(STORAGE_KEY_ARTIGO);

  // Restaurar nós expandidos
  const savedExpanded = localStorage.getItem(STORAGE_KEY_EXPANDED(selectedLeiId));
  const initialExpanded = savedExpanded ? new Set<string>(JSON.parse(savedExpanded)) : new Set<string>();

  loadLegislacao(selectedLeiId).then((data) => {
    if (cancelled) return;
    setLei(data);
    setExpandedNodes(initialExpanded);
    if (savedArtigoId) setSelectedArtigoId(savedArtigoId);
    setLoading(false);
  });

  return () => { cancelled = true; };
}, [selectedLeiId]);

// Salvar artigo selecionado
useEffect(() => {
  if (selectedArtigoId) {
    localStorage.setItem(STORAGE_KEY_ARTIGO, selectedArtigoId);
  }
}, [selectedArtigoId]);

// Salvar nós expandidos
useEffect(() => {
  if (selectedLeiId) {
    localStorage.setItem(
      STORAGE_KEY_EXPANDED(selectedLeiId),
      JSON.stringify(Array.from(expandedNodes))
    );
  }
}, [expandedNodes, selectedLeiId]);
```

### 4.4 — Corrigir "Proximo" → "Próximo"

Linha 453: `"Proximo"` → `"Próximo"`

### 4.5 — Adicionar prop `onOpenGlobalSearch`

```typescript
interface LegislacaoTreeProps {
  selectedLeiId: string;
  onOpenGlobalSearch: () => void;
}
```

**Step: Commit**
```bash
git add src/components/legislacao/legislacao-tree.tsx
git commit -m "feat(legislacao): busca inline, persistência localStorage, typo Próximo"
```

---

## Task 5: Criar `LegislacaoUnified` — componente principal

**Files:**
- Create: `src/components/legislacao/legislacao-unified.tsx`

Este componente monta o layout de 3 colunas e gerencia o estado global (lei ativa, sidebar colapsada, modal de busca global aberta).

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { LeiSelectorPanel } from "./lei-selector-panel";
import { LegislacaoTree } from "./legislacao-tree";
import { LegislacaoSearch } from "./legislacao-search";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEGISLACOES } from "@/config/legislacao";

const STORAGE_KEY_LEI = "legislacao:leiId";
const STORAGE_KEY_COLLAPSED = "legislacao:sidebarCollapsed";

export function LegislacaoUnified() {
  const [selectedLeiId, setSelectedLeiId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_LEI) ?? LEGISLACOES[0]?.id ?? "";
    }
    return LEGISLACOES[0]?.id ?? "";
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_COLLAPSED) === "true";
    }
    return false;
  });

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  // Persistir lei selecionada
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEI, selectedLeiId);
  }, [selectedLeiId]);

  // Persistir estado colapsado
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleSearchResultClick = useCallback((leiId: string, _artigoId: string) => {
    setSelectedLeiId(leiId);
    setGlobalSearchOpen(false);
    // artigoId será selecionado pelo LegislacaoTree via localStorage ou prop futura
  }, []);

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Coluna 1 — Lei Selector */}
      <LeiSelectorPanel
        selectedLeiId={selectedLeiId}
        onSelect={setSelectedLeiId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      {/* Colunas 2 + 3 — Árvore + Artigo */}
      <LegislacaoTree
        selectedLeiId={selectedLeiId}
        onOpenGlobalSearch={() => setGlobalSearchOpen(true)}
      />

      {/* Modal de busca global */}
      <Dialog open={globalSearchOpen} onOpenChange={setGlobalSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Buscar em todas as leis</DialogTitle>
          </DialogHeader>
          <LegislacaoSearch onResultClick={handleSearchResultClick} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step: Commit**
```bash
git add src/components/legislacao/legislacao-unified.tsx
git commit -m "feat(legislacao): criar LegislacaoUnified — 3 colunas + modal busca global"
```

---

## Task 6: Simplificar `page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/admin/legislacao/page.tsx`

Remover todo o code de mode switcher. Usar `LegislacaoUnified` diretamente.

```tsx
"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Scale, Bookmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegislacaoUnified } from "@/components/legislacao/legislacao-unified";
import { DestaquesSheet } from "@/components/legislacao/destaques-sheet";
import { UpdateModal } from "@/components/legislacao/update-modal";

export default function LegislacaoPage() {
  const [destaquesOpen, setDestaquesOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="px-6 py-4">
          <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Legislação" }]} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Legislação</h1>
                <p className="text-sm text-zinc-500">28 leis — consulta rápida com navegação hierárquica</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDestaquesOpen(true)} className="gap-2">
                <Bookmark className="w-4 h-4" />
                Meus Destaques
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUpdateOpen(true)} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Interface unificada */}
      <div className="flex-1 overflow-hidden p-4">
        <LegislacaoUnified />
      </div>

      {/* Panels */}
      <DestaquesSheet
        open={destaquesOpen}
        onOpenChange={setDestaquesOpen}
        onNavigate={(leiId, artigoId) => {
          // Persistir no localStorage para que LegislacaoTree restaure ao abrir
          localStorage.setItem("legislacao:leiId", leiId);
          localStorage.setItem("legislacao:artigoId", artigoId);
          setDestaquesOpen(false);
        }}
      />
      <UpdateModal open={updateOpen} onOpenChange={setUpdateOpen} />
    </div>
  );
}
```

**Step: Commit**
```bash
git add src/app/(dashboard)/admin/legislacao/page.tsx
git commit -m "refactor(legislacao): simplificar page.tsx — usar LegislacaoUnified"
```

---

## Task 7: Deprecar `LegislacaoTabs`

**Files:**
- Delete (ou manter sem uso): `src/components/legislacao/legislacao-tabs.tsx`

O `LegislacaoTabs` não é mais usado. Pode ser deletado ou deixado sem importação para limpeza posterior.

```bash
git rm src/components/legislacao/legislacao-tabs.tsx
git commit -m "chore(legislacao): remover LegislacaoTabs (substituído por interface unificada)"
```

---

## Task 8: Testar e verificar

**Step 1: Iniciar servidor de desenvolvimento**
```bash
npm run dev
```

**Step 2: Verificar que não há erros de TypeScript**
```bash
npx tsc --noEmit
```

**Step 3: Abrir `/admin/legislacao` e verificar:**
- [ ] 3 colunas visíveis
- [ ] Coluna 1 mostra as 28 leis
- [ ] Toggle de colapso funciona
- [ ] Tooltip ao hover no estado colapsado
- [ ] Trocar de lei carrega nova árvore
- [ ] Busca por número filtra artigos
- [ ] Busca por texto mostra resultados
- [ ] Limpar busca restaura a árvore
- [ ] "Buscar em todas as leis" abre modal
- [ ] Artigo abre no painel direito ao clicar
- [ ] Anterior/Próximo (com acento) funciona
- [ ] Estado expandido persiste ao voltar para a mesma lei
- [ ] "Meus Destaques" ainda abre o sheet

**Step 4: Commit final**
```bash
git add -A
git commit -m "feat(legislacao): interface unificada 3 colunas, 28 leis, busca inline, persistência"
```
