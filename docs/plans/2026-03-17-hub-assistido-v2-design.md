# Hub Assistido v2 — Design Document

> Brainstorming realizado em 2026-03-17. Design aprovado pelo usuário seção por seção.

## Problema

A página do assistido sofre de quatro problemas simultâneos:
- **Fragmentação** — informação espalhada entre 9 abas, sem visão geral imediata
- **Navegação lenta** — muitos cliques para chegar em informação crítica
- **Contexto perdido** — ao abrir processo/demanda, sai da página do assistido
- **Dados insuficientes** — não agrega informações críticas de forma proativa

## Solução

Layout em três camadas:
1. **Header** — identidade + KPI crítico (próxima audiência) + botão sheet lateral
2. **Overview Panel** — 4 cards sempre visíveis acima das tabs
3. **Tabs reorganizadas** — ordenadas por frequência, overflow para raras, badges de urgência

Padrão de interação unificado: clicar em qualquer item abre **sheet lateral** em vez de navegar para outra página.

---

## Seção 1: Layout Geral

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Avatar + Nome + Status + KPI crítico + [⊞]    │
├─────────────────────────────────────────────────────────┤
│  OVERVIEW PANEL (sempre visível, colapsável)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Próxima  │ │ Demanda  │ │  Dados   │ │ Processos│  │
│  │Audiência │ │ Urgente  │ │ Pessoais │ │  (fase)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  TABS: [Processos] [Demandas] [Audiências] [Drive]      │
│         [Mídias] [Ofícios] [Inteligência] [+]           │
├─────────────────────────────────────────────────────────┤
│  CONTEÚDO DA TAB ATIVA                                  │
└─────────────────────────────────────────────────────────┘
                                    ← Sheet lateral (toggle)
```

**Mudanças no header:**
- Botão `[⊞]` abre o sheet lateral (ficha + ações)
- Mini KPIs mostram **próxima audiência** (data real) em vez de contagens genéricas
- Badge de alerta vermelho pulsante se houver prazo vencido
- Ações Solar/IA saem do header e vão para o sheet lateral

---

## Seção 2: Overview Panel (4 cards)

```
┌─────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                              [colapsar] │
│                                                                  │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│ │ 📅 PRÓX. AUDIÊNCIA│ │ ⚡ DEMANDA CRÍTICA│ │ 👤 DADOS RÁPIDOS │  │
│ │                  │ │                  │ │                  │  │
│ │  28/mar · 14h    │ │  Alegações Finais│ │  (11) 9 9999-    │  │
│ │  Júri · Sala 3   │ │  vence em 3 dias │ │  CPF: 000.000... │  │
│ │                  │ │  → [ver demanda] │ │  Preso: 14 meses │  │
│ │  [+ Audiência]   │ │                  │ │  Penitenciária X │  │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ ⚖️ PROCESSOS ATIVOS                                          │  │
│ │  0001234-56.2024 · Júri · Instrução · Vara Criminal 1  →   │  │
│ │  0009876-12.2023 · Exec. Penal · Execução · VEP        →   │  │
│ └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Card 1 — Próxima Audiência:**
- Se não houver: alerta amarelo "Sem audiência agendada" + botão direto para agendar
- Mostra tipo, local, sala

**Card 2 — Demanda Crítica:**
- Prioridade: 1_URGENTE > 2_VENCER > 3_PROXIMO
- Se nenhuma: "Nenhuma demanda urgente" em zinc

**Card 3 — Dados Rápidos:**
- Telefone clicável (`tel:`), CPF copiável ao clicar
- Tempo preso calculado em tempo real

**Card 4 — Processos Ativos (row full-width):**
- Lista inline, cada linha clicável abre sheet de detalhe sem sair da página

---

## Seção 3: Sheet Lateral (ficha + ações + vínculos)

```
┌────────────────────────────────────────┐
│  SHEET LATERAL (desliza da direita)    │
│  ─────────────────────────────────── │
│  FICHA COMPLETA                        │
│  Nome: FULANO DA SILVA                 │
│  CPF: 000.000.000-00  [copiar]         │
│  RG: 0000000          [copiar]         │
│  Nasc.: 01/01/1990 (34 anos)           │
│  Mãe: MARIA DA SILVA                   │
│  Naturalidade: Salvador/BA             │
│  Endereço: Rua X, 123 — Camaçari      │
│  ─────────────────────────────────── │
│  CONTATO                               │
│  (71) 9 9999-9999  [ligar] [whatsapp]  │
│  Contato: João (pai) · (71) 9 8888-    │
│  ─────────────────────────────────── │
│  AÇÕES                                 │
│  [☀ Exportar Solar]  [☀ Sync Solar]   │
│  [🧠 Analisar com IA]  [📁 Drive]      │
│  ─────────────────────────────────── │
│  CORRÉUS E VÍNCULOS                    │
│  • Pedro Souza → mesmo proc. 0001234  │
│  • Ana Lima → mesma VEP               │
│  ─────────────────────────────────── │
│  ASSISTIDOS RELACIONADOS               │
│  • João Silva (irmão mencionado)       │
│  • Carla Souza (vítima · proc. 0002)   │
│  ─────────────────────────────────── │
│  [✏ Editar ficha completa]             │
└────────────────────────────────────────┘
```

**Comportamentos:**
- Telefone/WhatsApp: links nativos `tel:` e `https://wa.me/`
- **Corréus** — detectados via `assistidos_processos` (mesmo `processoId`)
- **Assistidos relacionados** — links manuais futuros + auto-detecção por IA
- Sheet persiste ao trocar de tab

---

## Seção 4: Tabs Reorganizadas + Sheet de Detalhe Inline

```
TABS (ordem por frequência de uso):
[Processos 3] [Demandas 2⚡] [Audiências 1] [Drive 12] [Mídias 2] [Ofícios 4] [Inteligência] [+ ▾]
                                                                                               └→ Timeline
                                                                                                  Radar
```

**Regras:**
- Badge colorido apenas com urgência: Demandas vermelho se `1_URGENTE` ou vencido, âmbar se `2_VENCER`
- Timeline e Radar no overflow `[+]`
- Tab ativa persiste em `localStorage` por assistido

**Sheet de Detalhe Inline (ao clicar em processo/demanda/audiência):**
```
┌─────────────────────────────────────────────┐
│  ← PROCESSO 0001234-56.2024           [✏]  │
│  Área: Júri · Fase: Instrução               │
│  Vara: 1ª Vara Criminal de Camaçari         │
│  Assunto: Homicídio Qualificado             │
│  ─────────────────────────────────────────  │
│  DEMANDAS DESTE PROCESSO                    │
│  • Alegações Finais · vence 28/mar ⚡       │
│  AUDIÊNCIAS                                 │
│  • 28/mar 14h · Júri · Sala 3              │
│  NULIDADES (IA)                             │
│  • Cerceamento de defesa — alta confiança   │
│  ─────────────────────────────────────────  │
│  [Abrir processo completo →]                │
└─────────────────────────────────────────────┘
```

---

## Resumo das Mudanças

| Antes | Depois |
|-------|--------|
| 9 tabs planas sem urgência visual | Tabs ordenadas por uso + badges urgência + overflow |
| Ações Solar/IA poluindo o header | Ações no sheet lateral |
| Navegar para ver detalhes de processo | Sheet inline sem sair da página |
| Nenhuma visão de corréus | Vínculos automáticos no sheet lateral |
| Header com contagens genéricas | Overview com próxima audiência, demanda crítica, dados pessoais |
| CPF/telefone só na tela de edição | Dados rápidos copiáveis/clicáveis no overview e sheet |
