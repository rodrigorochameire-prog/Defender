# Radar Criminal — Visual Refinement

**Data:** 2026-03-21
**Status:** Aprovado para implementação

## Objetivo

Tornar o Radar Criminal mais sofisticado, limpo e organizado. Mix de três referências:
- **Editorial** — tipografia forte, espaço branco, hierarquia clara
- **Data dashboard** — cores semânticas dessaturadas, legibilidade de dados
- **Carta de operações** — denso mas organizado, cor como sinal não decoração

## 1. Sistema de Cores (muted/pastel)

| Grupo | Tipo | Hex Fill | Hex Border |
|-------|------|----------|------------|
| Júri | homicidio / tentativa / feminicidio | `#4ade80` | `#166534` |
| VD | violencia_domestica | `#fbbf24` | `#78350f` |
| EP | execucao_penal | `#60a5fa` | `#1e3a8a` |
| Grave | trafico | `#f87171` | `#7f1d1d` |
| Grave | roubo | `#fb923c` | `#7c2d12` |
| Médio | sexual | `#c084fc` | `#4c1d95` |
| Médio | lesao_corporal | `#f472b6` | `#831843` |
| Médio | porte_arma | `#e879f9` | `#701a75` |
| Leve | furto | `#fdba74` | `#9a3412` |
| Leve | estelionato | `#a78bfa` | `#4c1d95` |
| Base | outros | `#a1a1aa` | `#3f3f46` |

**Lógica**: fill pastel + borda escura da mesma família = marcador "iluminado por dentro".

## 2. Redesign do Mapa

### Marcadores
- Fill = cor pastel, borda = cor escura, sombra `drop-shadow(0 1px 3px rgba(0,0,0,0.18))`
- Júri: círculo 22px + anel externo translúcido (animação 3s, opacity máx 0.4 — sutil)
- VD: losango fill `#fbbf24` borda `#78350f`
- Outros: círculo por tier, fill pastel + borda escura

### Popup
- Header: `#18181b` flat para todos os tipos + dot colorido + label crime
- Corpo: branco, título `14px semibold`, resumo `11px zinc-500`, metadata `10px` sem ícones (separador `·`)
- Botão "Ver detalhes": `zinc-900` bg — neutro, não colorido por crime

### Controles
- Tile switcher: pill com backdrop-blur, borda `zinc-200`, ativo = `zinc-900 font-medium` (sem bloco preto)
- Reset + Fullscreen: pill unificada canto superior direito

### Legenda
- Fundo `rgba(255,255,255,0.95)` + `backdrop-blur-sm`, borda `zinc-100`
- Pontos: 8px fill pastel + borda escura (espelhando marcadores reais)
- Seções separadas por linha `zinc-100` sem texto de seção

### Clusters (donut)
- Fatias = nova paleta pastel
- Centro branco, count em `zinc-800`
- Sombra `drop-shadow(0 2px 6px rgba(0,0,0,0.12))`

## 3. Cards do Feed

### Princípio
- Hierarquia tipográfica carrega a info, cor restrita ao badge-dot
- Data, bairro e tipo sempre visíveis — nunca omitidos
- Sem ícones nas metadata (substituídos por separador `·`)
- Match indicator = dot `emerald-400` no canto, sem MatchTriagem inline

### Modo compact (padrão)
```
┌─────────────────────────────────────────────────────┐
│ ● Tráfico            G1 Bahia           há 2h       │
│ Homem é preso com 2kg de cocaína no Centro…         │
│ Centro  ·  João Silva                               │
└─────────────────────────────────────────────────────┘
```
- Borda esquerda `2px` na cor pastel do crime
- Badge: dot `6px` + label `10px text-zinc-500` sem background colorido
- Título: `13px font-semibold text-zinc-900`
- Metadata: `11px text-zinc-400` separado por `·`
- Data: sempre no canto superior direito, relativa (`há 2h`) ou absoluta (`14 mar`)

### Modo cards/grid
```
┌──────────────────────────┐
│ ● Tráfico                │
│                          │
│ Título em 2 linhas       │
│ Resumo IA breve…         │
│                          │
│ Centro · 14 mar · 2 env. │
└──────────────────────────┘
```
- `border border-zinc-100`, `rounded-xl`, sem sombra agressiva
- Badge: pill `bg-zinc-50 border border-zinc-200`, dot pastel
- Sem imagem thumbnail

### Modo lista
- Row 1 linha: dot (sem texto) + título truncado + `fonte · bairro · data`

## 4. Página — Header, Tabs, Controles

### Header
- Linha única: ícone zinc-500 + título `16px semibold` + count `text-xs zinc-400` + refresh
- Sem badges coloridos de saúde/matches no header

### Tabs
```
Feed  ·  Mapa  ·  Matches (3)  ·  Estatísticas
```
- Flat, sem grupos com separadores
- Ativa = `text-zinc-900 border-b-2 border-zinc-900`
- Badge: `zinc-700` bg, branco texto

### Barra de controles do Feed
```
[Filtros ▾]  [Tipo ▾]  [Bairro ▾]      [↑↓ Mais recentes ▾]  [≡ ⊞]
```
- Ordenação: dropdown permanente e visível (`Mais recentes / Mais antigos / Mais relevantes`)
- View toggle: ícones pequenos à direita
- Filtros ativos: pills `zinc-100` removíveis

### Sidebar
- Expandida: título `11px uppercase tracking-wide text-zinc-400`
- Separação por `border-l border-zinc-100` apenas (sem sombra)
