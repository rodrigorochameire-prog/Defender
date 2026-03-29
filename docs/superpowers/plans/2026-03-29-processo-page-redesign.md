# Processo Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a página do processo de 917 linhas monolíticas para componentes isolados com Padrão Defender v2 — clean, organizado, hierarquia clara, Análise como hub central.

**Architecture:** Extrair header, tabs, e cada aba em componentes isolados dentro de `src/components/processo/`. A página principal vira um orquestrador leve (~100 linhas). Design tokens centralizados. Análise com 6 subabas.

**Tech Stack:** React, shadcn/ui (Tabs, Card, Badge), Tailwind CSS, Lucide icons, tRPC

---

## Arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `src/lib/config/design-tokens.ts` | Criar | Tokens: tipografia, espaçamento, cores semânticas |
| `src/components/processo/processo-header.tsx` | Criar | Cabeçalho: número, assistidos, vara, próxima audiência, botões Cowork |
| `src/components/processo/processo-tabs.tsx` | Criar | 5 abas principais (Análise, Demandas, Agenda, Documentos, Vinculados) |
| `src/components/processo/analise-hub.tsx` | Criar | Container com 6 subabas pills |
| `src/components/processo/analise-resumo.tsx` | Criar | Radar, KPIs, crime, resumo, estratégia, achados, saneamento |
| `src/components/processo/analise-partes.tsx` | Criar | Pessoas agrupadas por papel (acusados, vítima, testemunhas) |
| `src/components/processo/analise-depoimentos.tsx` | Criar | Depoimentos com contradições e perguntas sugeridas |
| `src/components/processo/analise-timeline.tsx` | Criar | Cronologia unificada (fatos + movimentações) |
| `src/components/processo/analise-teses.tsx` | Criar | Teses, nulidades, matriz de guerra |
| `src/components/processo/analise-mapa.tsx` | Criar | Mapa simples + modo investigativo (placeholder v1) |
| `src/components/processo/vinculados-cards.tsx` | Criar | Cards de processos vinculados com contexto |
| `src/app/(dashboard)/admin/processos/[id]/page.tsx` | Reescrever | Orquestrador leve usando os novos componentes |

---

### Task 1: Design Tokens

**Files:**
- Create: `src/lib/config/design-tokens.ts`

- [ ] **Step 1: Criar design tokens**

```typescript
// src/lib/config/design-tokens.ts

/**
 * Padrão Defender v2 — Design Tokens
 * Tipografia, espaçamento, cores semânticas.
 * REGRA: nada abaixo de 11px. Headers nunca abaixo de 16px.
 */

// Tipografia
export const TYPO = {
  h1: "text-2xl font-bold tracking-tight",           // 24px — número do processo
  h2: "text-xl font-semibold",                        // 20px — título de seção
  h3: "text-base font-semibold",                      // 16px — subtítulo
  body: "text-sm leading-relaxed",                    // 14px — texto geral
  small: "text-xs",                                   // 12px — metadados, pills
  caption: "text-[11px] text-muted-foreground",       // 11px — datas, versão
  mono: "text-sm font-mono tabular-nums",             // 14px mono — números de processo
  label: "text-xs font-semibold uppercase tracking-wide text-muted-foreground", // 12px — labels de seção
} as const;

// Espaçamento (grid de 8px)
export const SPACE = {
  xs: "gap-1",    // 4px
  sm: "gap-2",    // 8px
  md: "gap-3",    // 12px
  lg: "gap-4",    // 16px
  xl: "gap-6",    // 24px
  "2xl": "gap-8", // 32px
} as const;

// Abas principais
export const TAB_STYLE = {
  bar: "flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 px-6",
  item: "py-3 text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border-b-2 border-transparent transition-colors cursor-pointer",
  active: "text-zinc-900 dark:text-zinc-100 border-emerald-500",
} as const;

// Subabas (pills)
export const PILL_STYLE = {
  bar: "flex items-center gap-1.5 mb-4",
  item: "px-3 py-1 text-xs rounded-full text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
  active: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
} as const;

// Cards
export const CARD_STYLE = {
  base: "rounded-lg border border-zinc-200 dark:border-zinc-800 p-4",
  highlight: "rounded-lg border-l-4 p-4",
} as const;

// Cores semânticas
export const COLORS = {
  primary: { border: "border-emerald-200", bg: "bg-emerald-50/50 dark:bg-emerald-950/10", text: "text-emerald-600" },
  danger: { border: "border-red-200", bg: "bg-red-50/50 dark:bg-red-950/10", text: "text-red-600" },
  warning: { border: "border-amber-200", bg: "bg-amber-50/50 dark:bg-amber-950/10", text: "text-amber-600" },
  info: { border: "border-blue-200", bg: "bg-blue-50/50 dark:bg-blue-950/10", text: "text-blue-600" },
  violet: { border: "border-violet-200", bg: "bg-violet-50/50 dark:bg-violet-950/10", text: "text-violet-600" },
  neutral: { border: "border-zinc-200", bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600" },
} as const;

// Urgência do radar
export function urgencyColor(level: string) {
  switch (level) {
    case "ALTA": return COLORS.danger;
    case "MEDIA": return COLORS.warning;
    default: return COLORS.primary;
  }
}

// Status prisional
export function prisaoColor(preso: boolean) {
  return preso ? COLORS.danger : COLORS.primary;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/config/design-tokens.ts
git commit -m "feat(redesign): add Padrão Defender v2 design tokens"
```

---

### Task 2: Processo Header

**Files:**
- Create: `src/components/processo/processo-header.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// src/components/processo/processo-header.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TYPO, COLORS, prisaoColor } from "@/lib/config/design-tokens";
import { CoworkActionGroup } from "@/components/shared/cowork-action-button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Assistido {
  id: number;
  nome: string;
  statusPrisional: string | null;
}

interface Audiencia {
  id: number;
  tipo: string;
  data: string;
}

interface ProcessoHeaderProps {
  id: number;
  numeroAutos: string;
  assistidos: Assistido[];
  atribuicao: string;
  vara: string | null;
  comarca: string | null;
  proximaAudiencia: Audiencia | null;
  classeProcessual: string | null;
}

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"];

export function ProcessoHeader({
  id,
  numeroAutos,
  assistidos,
  atribuicao,
  vara,
  comarca,
  proximaAudiencia,
  classeProcessual,
}: ProcessoHeaderProps) {
  const router = useRouter();

  const diasAteAudiencia = proximaAudiencia
    ? differenceInDays(new Date(proximaAudiencia.data), new Date())
    : null;

  const audienciaUrgency =
    diasAteAudiencia !== null && diasAteAudiencia < 3 ? "ALTA" :
    diasAteAudiencia !== null && diasAteAudiencia < 7 ? "MEDIA" : "BAIXA";

  const atribuicaoLabel: Record<string, string> = {
    JURI_CAMACARI: "Júri",
    VVD_CAMACARI: "VVD",
    EXECUCAO_PENAL: "EP",
    SUBSTITUICAO: "Substituição",
  };

  return (
    <div className="px-6 pt-4 pb-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      {/* Número do processo */}
      <h1 className={`${TYPO.mono} text-xl`}>{numeroAutos}</h1>

      {/* Assistidos como chips */}
      <div className="flex flex-wrap gap-2">
        {assistidos.map((a) => {
          const preso = PRESOS.includes(a.statusPrisional ?? "");
          const colors = prisaoColor(preso);
          return (
            <Link key={a.id} href={`/admin/assistidos/${a.id}`}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                ${preso ? "border-red-200 dark:border-red-800" : "border-zinc-200 dark:border-zinc-700"}
                hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors`}>
                <span className="text-sm font-medium">{a.nome}</span>
                <Badge variant={preso ? "danger" : "success"} className="text-[10px]">
                  {preso ? "Preso" : "Solto"}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Vara · Comarca · Atribuição */}
      <p className={TYPO.body + " text-muted-foreground"}>
        {atribuicaoLabel[atribuicao] ?? atribuicao}
        {vara ? ` · ${vara}` : ""}
        {comarca ? ` · ${comarca}` : ""}
      </p>

      {/* Próxima audiência */}
      {proximaAudiencia && diasAteAudiencia !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          audienciaUrgency === "ALTA" ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400" :
          audienciaUrgency === "MEDIA" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
          "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
        }`}>
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">{proximaAudiencia.tipo}</span>
          <span className="text-sm">
            — {format(new Date(proximaAudiencia.data), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
          <span className="text-xs text-muted-foreground">
            (em {diasAteAudiencia} dia{diasAteAudiencia !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* Botões Cowork */}
      <CoworkActionGroup
        assistidoNome={assistidos[0]?.nome ?? ""}
        numeroAutos={numeroAutos}
        classeProcessual={classeProcessual ?? ""}
        vara={vara ?? ""}
        atribuicao={atribuicao}
        drivePath=""
        actions={
          atribuicao === "JURI_CAMACARI"
            ? ["analise-autos", "gerar-peca", "preparar-audiencia", "analise-juri", "feedback-estagiario"]
            : ["analise-autos", "gerar-peca", "preparar-audiencia", "feedback-estagiario"]
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processo/processo-header.tsx
git commit -m "feat(redesign): add ProcessoHeader component — clean, chips, audiência urgency"
```

---

### Task 3: Processo Tabs + Análise Hub

**Files:**
- Create: `src/components/processo/processo-tabs.tsx`
- Create: `src/components/processo/analise-hub.tsx`

- [ ] **Step 1: Criar processo-tabs.tsx**

```typescript
// src/components/processo/processo-tabs.tsx
"use client";

import { Brain, ListTodo, Calendar, FolderOpen, Link2 } from "lucide-react";
import { TAB_STYLE } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

export type MainTab = "analise" | "demandas" | "agenda" | "documentos" | "vinculados";

const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
  { key: "analise", label: "Análise", icon: Brain },
  { key: "demandas", label: "Demandas", icon: ListTodo },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "documentos", label: "Documentos", icon: FolderOpen },
  { key: "vinculados", label: "Vinculados", icon: Link2 },
];

interface ProcessoTabsProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  counts?: Partial<Record<MainTab, number>>;
}

export function ProcessoTabs({ active, onChange, counts }: ProcessoTabsProps) {
  return (
    <div className={TAB_STYLE.bar}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(TAB_STYLE.item, active === tab.key && TAB_STYLE.active)}
        >
          <div className="flex items-center gap-1.5">
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {counts?.[tab.key] !== undefined && counts[tab.key]! > 0 && (
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded-full">
                {counts[tab.key]}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Criar analise-hub.tsx**

```typescript
// src/components/processo/analise-hub.tsx
"use client";

import { useState } from "react";
import { PILL_STYLE } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";
import { AnaliseResumo } from "./analise-resumo";
import { AnalisePartes } from "./analise-partes";
import { AnaliseDepoimentos } from "./analise-depoimentos";
import { AnaliseTimeline } from "./analise-timeline";
import { AnaliseTeses } from "./analise-teses";
import { AnaliseMapa } from "./analise-mapa";

export type AnaliseSubTab = "resumo" | "partes" | "depoimentos" | "timeline" | "teses" | "mapa";

const SUB_TABS: { key: AnaliseSubTab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "partes", label: "Partes" },
  { key: "depoimentos", label: "Depoimentos" },
  { key: "timeline", label: "Timeline" },
  { key: "teses", label: "Teses & Nulidades" },
  { key: "mapa", label: "Mapa" },
];

interface AnaliseHubProps {
  analysisData: any;
  pessoas: any[];
  depoimentos: any[];
  cronologia: any[];
  teses: any;
  nulidades: any[];
  matrizGuerra: any[];
  locais: any[];
  radarLiberdade: any;
  saneamento: any;
  kpis: any;
  resumo: string;
  crimePrincipal: string;
  estrategia: string;
  achados: string[];
  recomendacoes: string[];
  inconsistencias: string[];
}

export function AnaliseHub(props: AnaliseHubProps) {
  const [subTab, setSubTab] = useState<AnaliseSubTab>("resumo");

  return (
    <div className="px-6 py-4">
      {/* Pills */}
      <div className={PILL_STYLE.bar}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(PILL_STYLE.item, subTab === tab.key && PILL_STYLE.active)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === "resumo" && (
        <AnaliseResumo
          radarLiberdade={props.radarLiberdade}
          kpis={props.kpis}
          resumo={props.resumo}
          crimePrincipal={props.crimePrincipal}
          estrategia={props.estrategia}
          achados={props.achados}
          recomendacoes={props.recomendacoes}
          inconsistencias={props.inconsistencias}
          saneamento={props.saneamento}
        />
      )}
      {subTab === "partes" && <AnalisePartes pessoas={props.pessoas} />}
      {subTab === "depoimentos" && <AnaliseDepoimentos depoimentos={props.depoimentos} />}
      {subTab === "timeline" && <AnaliseTimeline cronologia={props.cronologia} />}
      {subTab === "teses" && (
        <AnaliseTeses teses={props.teses} nulidades={props.nulidades} matrizGuerra={props.matrizGuerra} />
      )}
      {subTab === "mapa" && <AnaliseMapa locais={props.locais} />}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/processo/processo-tabs.tsx src/components/processo/analise-hub.tsx
git commit -m "feat(redesign): add ProcessoTabs (5 main) and AnaliseHub (6 sub-pills)"
```

---

### Task 4: Subaba Resumo

**Files:**
- Create: `src/components/processo/analise-resumo.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/processo/analise-resumo.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Shield, Target, Zap, Lightbulb, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, Users, Scale, FileText,
} from "lucide-react";
import { TYPO, CARD_STYLE, urgencyColor } from "@/lib/config/design-tokens";

interface AnaliseResumoProps {
  radarLiberdade: { status: string; detalhes: string; urgencia: string } | null;
  kpis: { totalPessoas?: number; totalAcusacoes?: number; totalDocumentosAnalisados?: number; totalEventos?: number; totalNulidades?: number } | null;
  resumo: string;
  crimePrincipal: string;
  estrategia: string;
  achados: string[];
  recomendacoes: string[];
  inconsistencias: string[];
  saneamento: { pendencias: string[]; status: string } | null;
}

export function AnaliseResumo({
  radarLiberdade, kpis, resumo, crimePrincipal,
  estrategia, achados, recomendacoes, inconsistencias, saneamento,
}: AnaliseResumoProps) {
  return (
    <div className="space-y-6">
      {/* Radar Liberdade */}
      {radarLiberdade && (
        <div className={`${CARD_STYLE.highlight} border-l-${
          radarLiberdade.urgencia === "ALTA" ? "red" :
          radarLiberdade.urgencia === "MEDIA" ? "amber" : "emerald"
        }-500 ${urgencyColor(radarLiberdade.urgencia).bg}`}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4" />
            <span className={TYPO.h3}>Radar Liberdade</span>
            <Badge variant={radarLiberdade.urgencia === "ALTA" ? "danger" : "default"} className="text-xs">
              {radarLiberdade.status}
            </Badge>
          </div>
          <p className={TYPO.body + " text-muted-foreground"}>{radarLiberdade.detalhes}</p>
        </div>
      )}

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Pessoas", value: kpis.totalPessoas, icon: Users },
            { label: "Acusações", value: kpis.totalAcusacoes, icon: Scale },
            { label: "Documentos", value: kpis.totalDocumentosAnalisados, icon: FileText },
            { label: "Eventos", value: kpis.totalEventos, icon: Clock },
            { label: "Nulidades", value: kpis.totalNulidades, icon: AlertTriangle },
          ].filter(k => k.value !== undefined && k.value > 0).map((kpi) => (
            <div key={kpi.label} className={`${CARD_STYLE.base} text-center py-3`}>
              <kpi.icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{kpi.value}</p>
              <p className={TYPO.small + " text-muted-foreground"}>{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Crime + Resumo */}
      {(crimePrincipal || resumo) && (
        <div className={CARD_STYLE.base + " space-y-2"}>
          {crimePrincipal && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              <span className={TYPO.h3}>{crimePrincipal}</span>
            </div>
          )}
          {resumo && <p className={TYPO.body + " text-muted-foreground"}>{resumo}</p>}
        </div>
      )}

      {/* Estratégia */}
      {estrategia && (
        <div className={`${CARD_STYLE.base} border-emerald-200 dark:border-emerald-800 space-y-1`}>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span className={TYPO.h3}>Estratégia</span>
          </div>
          <p className={TYPO.body + " text-muted-foreground"}>{estrategia}</p>
        </div>
      )}

      {/* Achados · Recomendações · Inconsistências */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achados.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Achados-Chave</p>
            <ul className="space-y-1.5">
              {achados.map((a, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <Lightbulb className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recomendacoes.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Recomendações</p>
            <ul className="space-y-1.5">
              {recomendacoes.map((r, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {inconsistencias.length > 0 && (
          <div>
            <p className={TYPO.label + " mb-2"}>Inconsistências</p>
            <ul className="space-y-1.5">
              {inconsistencias.map((inc, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body} text-muted-foreground`}>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Saneamento */}
      {saneamento && saneamento.pendencias?.length > 0 && (
        <div className={`${CARD_STYLE.base} border-orange-200 dark:border-orange-800`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className={TYPO.h3}>Pendências Processuais</span>
            <Badge variant="default" className="text-xs">{saneamento.status}</Badge>
          </div>
          <ul className="space-y-1">
            {saneamento.pendencias.map((p: string, i: number) => (
              <li key={i} className={`${TYPO.body} text-muted-foreground flex items-start gap-2`}>
                <span className="text-orange-500">•</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processo/analise-resumo.tsx
git commit -m "feat(redesign): add AnaliseResumo — radar, KPIs, crime, estratégia, achados"
```

---

### Task 5: Subabas Partes + Depoimentos + Timeline + Teses + Mapa

**Files:**
- Create: `src/components/processo/analise-partes.tsx`
- Create: `src/components/processo/analise-depoimentos.tsx`
- Create: `src/components/processo/analise-timeline.tsx`
- Create: `src/components/processo/analise-teses.tsx`
- Create: `src/components/processo/analise-mapa.tsx`

- [ ] **Step 1: Criar analise-partes.tsx**

```typescript
// src/components/processo/analise-partes.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { User, MessageSquare, AlertTriangle } from "lucide-react";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface Pessoa {
  nome: string;
  tipo: string;
  papel: string;
  preso?: boolean | null;
  perguntas_sugeridas?: string[];
  contradicoes?: string[];
}

interface AnalisePartesProps {
  pessoas: Pessoa[];
}

const GRUPO_ORDER = ["REU", "VITIMA", "TESTEMUNHA", "FAMILIAR", "PERITO"];
const GRUPO_LABELS: Record<string, string> = {
  REU: "Acusados",
  VITIMA: "Vítimas",
  TESTEMUNHA: "Testemunhas",
  FAMILIAR: "Familiares",
  PERITO: "Peritos",
};

export function AnalisePartes({ pessoas }: AnalisePartesProps) {
  const grupos = GRUPO_ORDER
    .map(tipo => ({
      tipo,
      label: GRUPO_LABELS[tipo] ?? tipo,
      items: pessoas.filter(p => p.tipo?.toUpperCase() === tipo),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo.tipo}>
          <h3 className={TYPO.label + " mb-3"}>{grupo.label}</h3>
          <div className="space-y-3">
            {grupo.items.map((p, i) => (
              <div key={i} className={CARD_STYLE.base + " space-y-2"}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className={TYPO.h3}>{p.nome}</span>
                  {p.preso === true && <Badge variant="danger" className="text-xs">Preso</Badge>}
                  {p.preso === false && <Badge variant="success" className="text-xs">Solto</Badge>}
                </div>
                {p.papel && <p className={TYPO.body + " text-muted-foreground"}>{p.papel}</p>}
                {p.perguntas_sugeridas && p.perguntas_sugeridas.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className={TYPO.small + " text-blue-600"}>{p.perguntas_sugeridas.length} perguntas sugeridas</span>
                  </div>
                )}
                {p.contradicoes && p.contradicoes.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className={TYPO.small + " text-amber-600"}>{p.contradicoes.length} contradição(ões)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {pessoas.length === 0 && (
        <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
          Nenhuma pessoa identificada. Execute uma análise para extrair partes do caso.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar analise-depoimentos.tsx**

```typescript
// src/components/processo/analise-depoimentos.tsx
"use client";

import { AlertTriangle, MessageSquare } from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";
import { Badge } from "@/components/ui/badge";

interface Depoimento {
  nome: string;
  tipo: string;
  resumo: string;
  favoravel_defesa: boolean | null;
  contradicoes: string[];
  perguntas_sugeridas?: string[];
}

interface AnaliseDepoimentosProps {
  depoimentos: Depoimento[];
}

export function AnaliseDepoimentos({ depoimentos }: AnaliseDepoimentosProps) {
  if (depoimentos.length === 0) {
    return (
      <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
        Nenhum depoimento analisado. Execute uma análise para extrair depoimentos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {depoimentos.map((dep, i) => (
        <div key={i} className={CARD_STYLE.base + " space-y-3"}>
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={TYPO.h3}>{dep.nome}</span>
            <Badge variant="default" className="text-xs capitalize">{dep.tipo}</Badge>
            {dep.favoravel_defesa === true && <Badge variant="success" className="text-xs">Favorável</Badge>}
            {dep.favoravel_defesa === false && <Badge variant="danger" className="text-xs">Desfavorável</Badge>}
          </div>

          {/* Resumo */}
          <p className={TYPO.body + " text-muted-foreground"}>{dep.resumo}</p>

          {/* Contradições */}
          {dep.contradicoes.length > 0 && (
            <div className={`rounded-lg p-3 ${COLORS.warning.bg} space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className={TYPO.h3 + " text-amber-700 dark:text-amber-400"}>Contradições</span>
              </div>
              {dep.contradicoes.map((c, j) => (
                <p key={j} className={TYPO.body + " text-amber-800 dark:text-amber-300"}>• {c}</p>
              ))}
            </div>
          )}

          {/* Perguntas sugeridas */}
          {dep.perguntas_sugeridas && dep.perguntas_sugeridas.length > 0 && (
            <div className={`rounded-lg p-3 ${COLORS.info.bg} space-y-1.5`}>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className={TYPO.h3 + " text-blue-700 dark:text-blue-400"}>Perguntas Sugeridas</span>
              </div>
              <ol className="list-decimal list-inside space-y-1">
                {dep.perguntas_sugeridas.map((q, j) => (
                  <li key={j} className={TYPO.body + " text-blue-800 dark:text-blue-300"}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Criar analise-timeline.tsx**

```typescript
// src/components/processo/analise-timeline.tsx
"use client";

import { TYPO } from "@/lib/config/design-tokens";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  data: string;
  evento: string;
  fonte?: string;
}

interface AnaliseTimelineProps {
  cronologia: Evento[];
}

export function AnaliseTimeline({ cronologia }: AnaliseTimelineProps) {
  const sorted = [...cronologia].sort((a, b) => a.data.localeCompare(b.data));
  const now = new Date().toISOString().split("T")[0];

  if (sorted.length === 0) {
    return (
      <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
        Nenhum evento na cronologia. Execute uma análise para extrair a timeline.
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Linha vertical */}
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />

      <div className="space-y-4">
        {sorted.map((ev, i) => {
          const futuro = ev.data > now;
          return (
            <div key={i} className="relative flex items-start gap-4">
              {/* Dot */}
              <div className={`absolute -left-3.5 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                futuro
                  ? "border-amber-400 bg-amber-100 dark:bg-amber-900"
                  : "border-emerald-400 bg-emerald-100 dark:bg-emerald-900"
              }`} />

              {/* Content */}
              <div>
                <p className={TYPO.small + " text-muted-foreground font-mono"}>
                  {format(new Date(ev.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  {futuro && <span className="ml-2 text-amber-500">(futuro)</span>}
                </p>
                <p className={TYPO.body + (futuro ? " text-muted-foreground italic" : "")}>{ev.evento}</p>
                {ev.fonte && <p className={TYPO.caption}>{ev.fonte}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Criar analise-teses.tsx**

```typescript
// src/components/processo/analise-teses.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Scale, AlertTriangle, Swords } from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

interface Nulidade {
  tipo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  fundamentacao?: string;
}

interface MatrizItem {
  ponto: string;
  tipo: "forte" | "fraco";
  categoria?: string;
}

interface AnaliseTesesProps {
  teses: { principal?: string; subsidiarias?: string[] } | string[] | null;
  nulidades: Nulidade[];
  matrizGuerra: MatrizItem[];
}

export function AnaliseTeses({ teses, nulidades, matrizGuerra }: AnaliseTesesProps) {
  const teseLista = Array.isArray(teses)
    ? teses
    : teses
    ? [teses.principal, ...(teses.subsidiarias ?? [])].filter(Boolean) as string[]
    : [];

  return (
    <div className="space-y-6">
      {/* Teses */}
      {teseLista.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-blue-500" />
            <h3 className={TYPO.h2}>Teses Defensivas</h3>
          </div>
          <div className="space-y-3">
            {teseLista.map((tese, i) => (
              <div key={i} className={CARD_STYLE.base}>
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 font-bold text-lg shrink-0">{i + 1}.</span>
                  <div>
                    <p className={TYPO.body}>{tese}</p>
                    {i === 0 && <Badge variant="default" className="text-xs mt-1">Principal</Badge>}
                    {i > 0 && <Badge variant="outline" className="text-xs mt-1">Subsidiária</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nulidades */}
      {nulidades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className={TYPO.h2}>Nulidades / Ilegalidades</h3>
          </div>
          <div className="space-y-3">
            {nulidades.map((n, i) => (
              <div key={i} className={`${CARD_STYLE.highlight} ${
                n.severidade === "alta" ? "border-l-red-500 " + COLORS.danger.bg :
                n.severidade === "media" ? "border-l-amber-500 " + COLORS.warning.bg :
                "border-l-zinc-300 " + COLORS.neutral.bg
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={n.severidade === "alta" ? "danger" : n.severidade === "media" ? "warning" : "default"} className="text-xs">
                    {n.severidade}
                  </Badge>
                  <span className={TYPO.h3}>{n.tipo}</span>
                </div>
                <p className={TYPO.body + " text-muted-foreground"}>{n.descricao}</p>
                {n.fundamentacao && (
                  <p className={TYPO.caption + " italic mt-1"}>{n.fundamentacao}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matriz de Guerra */}
      {matrizGuerra.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-5 w-5 text-violet-500" />
            <h3 className={TYPO.h2}>Matriz de Guerra</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={TYPO.label + " mb-2 text-emerald-600"}>Pontos Fortes</p>
              <ul className="space-y-1.5">
                {matrizGuerra.filter(m => m.tipo === "forte").map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span className="text-muted-foreground">{m.ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={TYPO.label + " mb-2 text-red-600"}>Pontos Fracos</p>
              <ul className="space-y-1.5">
                {matrizGuerra.filter(m => m.tipo === "fraco").map((m, i) => (
                  <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                    <span className="text-red-500 shrink-0">✗</span>
                    <span className="text-muted-foreground">{m.ponto}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {teseLista.length === 0 && nulidades.length === 0 && matrizGuerra.length === 0 && (
        <p className={TYPO.body + " text-muted-foreground text-center py-8"}>
          Nenhuma tese ou nulidade identificada. Execute uma análise para extrair argumentos defensivos.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Criar analise-mapa.tsx (placeholder v1)**

```typescript
// src/components/processo/analise-mapa.tsx
"use client";

import { MapPin, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface Local {
  tipo: string;
  descricao: string;
  endereco?: string;
  coordenadas?: { lat: number; lng: number };
  pessoa_relacionada?: string;
}

interface AnaliseMapaProps {
  locais: Local[];
}

const TIPO_ICONS: Record<string, string> = {
  FATO: "📍",
  RESIDENCIA: "🏠",
  TESTEMUNHA: "👤",
  CAMERA: "📹",
  ROTA: "🚗",
  OUTRO: "📌",
};

export function AnaliseMapa({ locais }: AnaliseMapaProps) {
  if (locais.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className={TYPO.body + " text-muted-foreground"}>
          Nenhum local identificado no caso.
        </p>
        <p className={TYPO.small + " text-muted-foreground"}>
          Execute uma análise com a skill Cowork para extrair locais dos autos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Placeholder do mapa — v2 terá integração com Mapbox/Leaflet */}
      <div className={`${CARD_STYLE.base} bg-zinc-50 dark:bg-zinc-900 h-64 flex items-center justify-center`}>
        <div className="text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className={TYPO.body + " text-muted-foreground"}>
            Mapa interativo (em desenvolvimento)
          </p>
          <p className={TYPO.small + " text-muted-foreground"}>
            {locais.length} local(is) identificado(s)
          </p>
        </div>
      </div>

      {/* Lista de locais */}
      <div className="space-y-2">
        <p className={TYPO.label}>Locais do Caso</p>
        {locais.map((local, i) => (
          <div key={i} className={CARD_STYLE.base + " flex items-start gap-3"}>
            <span className="text-lg shrink-0">{TIPO_ICONS[local.tipo] ?? "📌"}</span>
            <div>
              <p className={TYPO.h3}>{local.descricao}</p>
              {local.endereco && <p className={TYPO.body + " text-muted-foreground"}>{local.endereco}</p>}
              {local.pessoa_relacionada && (
                <p className={TYPO.small + " text-muted-foreground"}>Relacionado: {local.pessoa_relacionada}</p>
              )}
              {local.coordenadas && (
                <p className={TYPO.caption + " font-mono"}>
                  {local.coordenadas.lat.toFixed(4)}, {local.coordenadas.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/processo/analise-partes.tsx src/components/processo/analise-depoimentos.tsx src/components/processo/analise-timeline.tsx src/components/processo/analise-teses.tsx src/components/processo/analise-mapa.tsx
git commit -m "feat(redesign): add 5 Análise sub-tab components (partes, depoimentos, timeline, teses, mapa)"
```

---

### Task 6: Vinculados Cards

**Files:**
- Create: `src/components/processo/vinculados-cards.tsx`

- [ ] **Step 1: Criar componente**

```typescript
// src/components/processo/vinculados-cards.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Users } from "lucide-react";
import Link from "next/link";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface ProcessoVinculado {
  id: number;
  numeroAutos: string;
  classeProcessual: string | null;
  atribuicao: string;
  status?: string;
  countDocs?: number;
  countDepoimentos?: number;
}

interface VinculadosCardsProps {
  processos: ProcessoVinculado[];
}

const CLASSE_LABELS: Record<string, string> = {
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  "Medidas Protetivas de Urgência": "MPU",
  "Execução da Pena": "EP",
  "Ação Penal": "AP",
  "Ação Penal de Competência do Júri": "AP Júri",
  "Incidente de Insanidade Mental": "IIM",
};

export function VinculadosCards({ processos }: VinculadosCardsProps) {
  if (processos.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className={TYPO.body + " text-muted-foreground"}>Nenhum processo vinculado.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <p className={TYPO.label}>{processos.length} processo(s) vinculado(s)</p>
      <div className="space-y-3">
        {processos.map((p) => {
          const classeAbrev = CLASSE_LABELS[p.classeProcessual ?? ""] ?? p.classeProcessual ?? "Processo";
          return (
            <div key={p.id} className={CARD_STYLE.base + " space-y-2"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">{classeAbrev}</Badge>
                  <span className={TYPO.mono + " text-sm"}>{p.numeroAutos}</span>
                </div>
                <Link href={`/admin/processos/${p.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Button>
                </Link>
              </div>
              {p.classeProcessual && (
                <p className={TYPO.body + " text-muted-foreground"}>{p.classeProcessual}</p>
              )}
              <div className="flex items-center gap-4">
                {p.countDocs !== undefined && p.countDocs > 0 && (
                  <span className={TYPO.small + " text-muted-foreground flex items-center gap-1"}>
                    <FileText className="h-3.5 w-3.5" /> {p.countDocs} docs
                  </span>
                )}
                {p.countDepoimentos !== undefined && p.countDepoimentos > 0 && (
                  <span className={TYPO.small + " text-muted-foreground flex items-center gap-1"}>
                    <Users className="h-3.5 w-3.5" /> {p.countDepoimentos} depoimentos
                  </span>
                )}
              </div>
              <p className={TYPO.caption}>
                Dados integrados na aba Análise
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/processo/vinculados-cards.tsx
git commit -m "feat(redesign): add VinculadosCards with context badges and doc counts"
```

---

### Task 7: Reescrever Página do Processo

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

- [ ] **Step 1: Reescrever a página**

A página atual (917 linhas) será reescrita como orquestrador leve (~150 linhas). Os componentes pesados ficam nos arquivos que criamos.

IMPORTANTE: Ler o arquivo atual PRIMEIRO para entender:
- Como o tRPC query funciona (`trpc.processos.getById`)
- Quais campos estão disponíveis no `data`
- Quais componentes existentes são reutilizados (IntelligenceTab, DriveTabEnhanced, ProcessoTimeline)
- O loading/error state

A nova estrutura:

```typescript
"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessoHeader } from "@/components/processo/processo-header";
import { ProcessoTabs, type MainTab } from "@/components/processo/processo-tabs";
import { AnaliseHub } from "@/components/processo/analise-hub";
import { VinculadosCards } from "@/components/processo/vinculados-cards";
import { DriveTabEnhanced } from "@/components/drive/DriveTabEnhanced";

export default function ProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<MainTab>("analise");

  const { data, isLoading } = trpc.processos.getById.useQuery({ id: Number(id) });

  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <div className="p-6">Processo não encontrado</div>;

  // Extract analysis data from processo
  const ad = (data as any).analysisData ?? {};
  const payload = ad.payload ?? {};

  // Próxima audiência
  const proximaAudiencia = data.audiencias
    ?.filter(a => new Date(a.data) > new Date())
    ?.sort((a, b) => a.data.localeCompare(b.data))?.[0] ?? null;

  return (
    <div className="flex flex-col h-full">
      <ProcessoHeader
        id={data.id}
        numeroAutos={data.numeroAutos}
        assistidos={data.assistidos ?? []}
        atribuicao={data.atribuicao}
        vara={data.vara}
        comarca={data.comarca}
        proximaAudiencia={proximaAudiencia}
        classeProcessual={(data as any).classeProcessual}
      />

      <ProcessoTabs
        active={tab}
        onChange={setTab}
        counts={{
          demandas: data.demandas?.length,
          documentos: data.driveFiles?.length,
          vinculados: data.processosVinculados?.length,
          agenda: data.audiencias?.length,
        }}
      />

      {tab === "analise" && (
        <AnaliseHub
          analysisData={ad}
          pessoas={payload.pessoas ?? ad.pessoas ?? []}
          depoimentos={payload.depoimentos ?? []}
          cronologia={payload.cronologia ?? ad.cronologia ?? []}
          teses={ad.teses ?? ad.tesesCompleto ?? null}
          nulidades={ad.nulidades ?? []}
          matrizGuerra={ad.matrizGuerra ?? payload.matriz_guerra ?? []}
          locais={payload.locais ?? []}
          radarLiberdade={ad.radarLiberdade ?? null}
          saneamento={ad.saneamento ?? null}
          kpis={ad.kpis ?? null}
          resumo={ad.resumo ?? ""}
          crimePrincipal={ad.crimePrincipal ?? ""}
          estrategia={ad.estrategia ?? ""}
          achados={ad.achadosChave ?? []}
          recomendacoes={ad.recomendacoes ?? []}
          inconsistencias={ad.inconsistencias ?? []}
        />
      )}

      {tab === "demandas" && (
        <div className="px-6 py-4">
          {/* Reutilizar componente de demandas existente */}
          {/* Será refatorado em sprint futura */}
        </div>
      )}

      {tab === "agenda" && (
        <div className="px-6 py-4">
          {/* Audiências — reutilizar existente */}
        </div>
      )}

      {tab === "documentos" && (
        <div className="px-6 py-4">
          <DriveTabEnhanced processoId={data.id} driveFolderId={data.driveFolderId} />
        </div>
      )}

      {tab === "vinculados" && (
        <VinculadosCards processos={data.processosVinculados ?? []} />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

NOTE: Ler o arquivo existente para mapear exatamente os nomes dos campos do tRPC query. Os nomes acima (`data.assistidos`, `data.demandas`, `data.audiencias`, `data.driveFiles`, `data.processosVinculados`) devem ser verificados contra o resultado real.

As abas Demandas e Agenda devem reutilizar os componentes existentes da página antiga — extrair o JSX relevante.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/admin/processos/[id]/page.tsx"
git commit -m "feat(redesign): rewrite processo page — 5 tabs, Análise hub with 6 sub-tabs, clean header

BREAKING: Page restructured from 917-line monolith to component-based architecture
- ProcessoHeader: assistidos as chips, next hearing with urgency
- ProcessoTabs: 5 main tabs (Análise, Demandas, Agenda, Documentos, Vinculados)
- AnaliseHub: 6 sub-tabs as pills (Resumo, Partes, Depoimentos, Timeline, Teses, Mapa)
- Design tokens: Padrão Defender v2 typography and spacing"
```

---

## Ordem de Execução

| Task | Dependência | Pode paralelizar |
|------|-------------|------------------|
| Task 1 (Design Tokens) | Nenhuma | — |
| Task 2 (Header) | Task 1 | Task 3, 4, 5, 6 |
| Task 3 (Tabs + Hub) | Task 1 | Task 2, 4, 5, 6 |
| Task 4 (Resumo) | Task 1 | Task 2, 3, 5, 6 |
| Task 5 (5 subabas) | Task 1 | Task 2, 3, 4, 6 |
| Task 6 (Vinculados) | Task 1 | Task 2, 3, 4, 5 |
| Task 7 (Rewrite page) | Todas | — |

**Onda 1:** Task 1 (tokens)
**Onda 2:** Tasks 2, 3, 4, 5, 6 (todos em paralelo)
**Onda 3:** Task 7 (rewrite usando tudo)
