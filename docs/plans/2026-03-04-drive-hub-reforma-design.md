# Drive Hub — Reforma Visual + Funcional

**Data**: 2026-03-04
**Status**: Aprovado para implementação
**Escopo**: Visual completo (Padrão Defender) + atalhos + funcionalidades

---

## Objetivo

Elevar a página Drive Hub ao "Padrão Defender" — mesma qualidade visual do Dashboard, Assistidos e Demandas. Adicionar funcionalidades úteis: ações rápidas, alertas de saúde e documentos recentes.

## Arquivo principal

`src/components/drive/DriveOverviewDashboard.tsx`

---

## Layout (de cima para baixo)

### 1. Header Padrão Defender

Substituir o header atual (ícone simples + stats inline) pelo padrão usado em Dashboard/Assistidos:

```
Container: relative px-5 md:px-8 py-6 md:py-8 bg-white dark:bg-zinc-900
           border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden
Gradient:  absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent
           to-transparent dark:from-emerald-950/15 pointer-events-none
```

- **Ícone**: `w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white` com `HardDrive`
- **Título**: `font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50`
- **Subtítulo**: "Gestão de documentos e pastas sincronizadas"
- **Stats inline** (à direita do título, 2-3 max):
  - `{total} docs` (FileText icon)
  - `{pct}% vinculados` (Link2 icon, emerald)
  - `há {time}` (Clock icon)
- **Botões de ação** (canto direito):
  - "Sincronizar" — variant outline, emerald hover
  - "Upload" — variant solid, zinc-900

### 2. Alertas/Insights (novo)

Seção de cards horizontais compactos com informações dinâmicas:

```
Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3
Card: px-4 py-3 rounded-xl border flex items-center gap-3
```

Cards dinâmicos baseados em dados:
- **Pendentes de distribuição**: `{count} docs pendentes` — cor amber se > 0
- **Status sync**: "Sync OK" (emerald) ou "Sync falhou em {attr}" (red)
- **Novos extraídos**: `{count} docs extraídos com IA` — cor emerald
- **Docs sem assistido**: `{count} docs não vinculados` — cor zinc (informativo)

Lógica: só mostrar alertas relevantes (count > 0). Se tudo OK, mostrar 1 card "Tudo em dia".

### 3. Atribuições (reformado)

Grid de cards com mini barra de vinculação:

```
Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3
```

Cada card:
```
┌─────────────────────────────────┐
│ ● [ícone] Juri                  │
│                                 │
│   963 arquivos    há 14 horas   │
│   ████████░░░░  59% vinculados  │
└─────────────────────────────────┘
```

- **Status dot**: sync verde/vermelho (já existe)
- **Ícone**: box colorido (já existe, manter)
- **Nome**: text-sm font-semibold
- **Stats**: "N arquivos" + "há X tempo"
- **NEW — Barra de vinculação**: mini progress bar (emerald) + "X% vinculados"
- **Hover**: elevação sutil + borda emerald (manter existente)

Dados para barra: usar `drive.healthStatus` ou query nova para % vinculação por atribuição.

### 4. Pastas Especiais (manter, ajustar estilo)

Grid 2 colunas, mesmo estilo visual dos cards de atribuição.
Ajustes menores: garantir mesmo border-radius, padding e hover.

### 5. Documentos Recentes (novo)

Seção "Recentes" com os últimos 5-8 docs modificados/acessados:

```
Heading: "Atividade Recente" + ícone Clock
Lista compacta em card:
┌─────────────────────────────────────────────┐
│ 📄 Petição_Juri_003.pdf    Juri     há 2h  │
│ 📄 Laudo_VVD_012.pdf       VVD      há 3h  │
│ 📄 Sentença_EP_001.pdf     EP       há 5h  │
│ ...                                         │
│                        Ver todos →          │
└─────────────────────────────────────────────┘
```

Cada item: ícone tipo + nome truncado + atribuição badge + tempo relativo
Click → navegar para o arquivo no Drive

Dados: usar `drive.listFiles` com `orderBy: modifiedTime desc, limit: 8`

### 6. Enriquecimento com IA (reformado)

Card com destaque visual:

```
Container: rounded-xl border-2 border-emerald-200/50 dark:border-emerald-500/20
           bg-gradient-to-br from-emerald-50/50 via-white to-white
           dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900
```

- **Heading**: "Extração com IA" + ícone Sparkles (emerald)
- **Progress bar**: maior (h-2), com animação smooth
- **Stats badges** inline: Extraídos (emerald), Processando (amber, pulse), Pendentes (zinc), Falhas (red)
- **Botão "Processar"**: mais proeminente — `bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2`
- **Sub-text**: "Processar {N} documentos pendentes"

---

## Dados necessários

| Dado | Fonte | Existe? |
|------|-------|---------|
| Total docs | `drive.healthStatus` | Sim |
| % vinculados | `drive.healthStatus` | Sim |
| Última sync | `drive.healthStatus` | Sim |
| Docs por atribuição | Já nos cards | Sim |
| % vinculação por atribuição | Precisa calcular | Novo (client-side ou query) |
| Docs recentes | `drive.listFiles` com sort | Pode usar existente |
| Alertas de distribuição | `drive.diagnoseOrphans` | Parcial |
| Status sync por pasta | `drive.healthStatus.folderDetails` | Sim |

---

## Ordem de implementação

1. **Header** — Aplicar Padrão Defender ao header existente
2. **Alertas** — Criar componente InsightsBar com cards dinâmicos
3. **Cards de atribuição** — Adicionar barra de vinculação
4. **Enrichment** — Reformar visual do painel
5. **Documentos Recentes** — Criar seção nova
6. **Polish** — Espaçamentos, responsividade, hover states

---

## Decisões de design

- **Menos stats no header**: 2-3 inline compactos, não 5 cards separados
- **Cards com barra**: mini progress bar de vinculação em cada atribuição
- **Alertas dinâmicos**: só aparecem quando relevantes (count > 0)
- **Recentes**: lista compacta, não cards grandes
- **Enrichment destacado**: borda emerald + gradiente sutil

## Notas técnicas

- Componente principal: `DriveOverviewDashboard.tsx` (~400 linhas)
- Não criar novos arquivos de componente — tudo inline no mesmo arquivo
- Usar queries tRPC existentes quando possível
- Para % vinculação por atribuição: calcular client-side a partir dos dados de healthStatus
