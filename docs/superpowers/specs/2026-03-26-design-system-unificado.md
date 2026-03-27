# Design System Unificado OMBUDS

## Decisões

### Header (todas as páginas)
- Icon: 36x36 rounded-[10px] bg-zinc-900 dark:bg-zinc-100
- Título: font-serif text-[17px] font-semibold
- Subtítulo: text-[10px] text-zinc-400
- Padding: px-5 py-2.5
- BG: bg-white dark:bg-zinc-900 border-b

### Cards / Containers
- Flat: sem card wrapper extra
- Itens individuais são os cards (border rounded-xl)
- Fundo da página: bg-zinc-100 dark:bg-[#0f0f11]
- Content padding: px-5 md:px-8 py-3

### Barra de Filtros
- Uma linha: tabs + stats clicáveis + comarca/RMS switch + atribuição pills + presets icons + WhatsApp
- Stats clicáveis (filtram ao clicar)
- Comarca/RMS: pill switch rounded-full
- AtribuicaoPills: cores translúcidas (500/15)
- Smart presets: icon-only com tooltips e badges

### Padrões visuais
- Emerald como accent (hover, active states)
- Zinc neutro para badges sem urgência (Solto, Agendada)
- Rose para alertas (presos, vencidos)
- Amber para warnings (monitorados, urgentes)
- font-serif para títulos, sans para corpo
- tabular-nums para números
- Geist Mono para processos/CPF

## Páginas a padronizar

1. Dashboard — header + layout geral
2. Demandas — header + toolbar consistency
3. Agenda — header + stats
4. Assistidos — já em andamento (referência)
5. Processos — header oversized, reduzir
6. Júri — já ajustado
7. Sidebar links para consistência
