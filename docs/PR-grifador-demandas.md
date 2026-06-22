# PR — Leitor premium, confiabilidade do daemon e Demandas premium

> Branch: `feat/grifador-premium-daemon-ux` → `main`
> 8 commits · 43 arquivos · +2519/−55 · 16 módulos de teste novos (122 testes verdes)
> Spec-driven + TDD. Typecheck sem novos erros (57 pré-existentes, nenhum nesta branch).

## Resumo

Onze aprimoramentos no leitor de autos, no daemon e na tela de Demandas — cada um com
spec em `docs/specs/`, núcleo de lógica pura testado e wiring verificado (app sobe,
testes verdes, typecheck limpo).

## Leitor de PDF / grifador

- **Grifador colapsável (GoodNotes):** a barra de anotação minimiza para uma pílula
  flutuante que não empurra o PDF; o grifo continua ativo colapsado.
- **Caneta livre (ink):** novo tipo de anotação à mão livre (pointer events, traços
  normalizados, SVG), persistido no mesmo modelo dos grifos.
- **Caderno de citações por categoria:** "Exportar por categoria" agrupa os grifos por
  cor/categoria (Fatos, Teses, Provas…) com ref. de página; busca no painel de notas.
- Correção: id otimista de anotação trocado por contador monotônico (chave React
  duplicada ao desenhar dois traços no mesmo ms).

## Daemon (confiabilidade)

- **Tarefas zumbi:** uma tarefa presa em `processing` (daemon morto/CLI travado)
  bloqueava o assistido para sempre no dedup. Agora zumbis (>15min) não bloqueiam e são
  recuperados por um reaper (startup + 5min). Kill do child no shutdown; log nos updates
  de etapa. Lógica única em `task-lifecycle.mjs` (13 testes).

## Demandas

- **Cockpit de prazos:** barra fixa com Atrasados/Vencem hoje/Esta semana/Sem prazo
  (contagem sempre à vista, clique filtra). Destaca "N exigem ação".
- **Busca global (⌘K / "/"):** paleta que busca em todas as demandas (nome, processo por
  dígitos, ato) e abre o sheet — sem mexer nos filtros.
- **Recolher/expandir tudo** no sheet.
- **WIP no kanban:** badge da coluna muda de tom ao passar do limite saudável.
- **Vincular a Caso inline** no sheet (sem migration — coluna já existia).
- **Nota interna privada** por demanda (migration aditiva `nota_privada`; não entra em
  ofício/export).
- UX: validação de CNJ (ISO 7064) no editar/vincular; debounce nas buscas; feedback de
  erro na criação de pasta do Drive.

## Banco de dados

- Migration aditiva e idempotente aplicada: `ALTER TABLE demandas ADD COLUMN IF NOT
  EXISTS nota_privada text` (`drizzle/0055_demandas_nota_privada.sql`). Sem perda de
  dados; coluna verificada antes de aplicar.

## Testes

16 módulos novos (122 testes): `task-lifecycle`, `annotation-toolbar`, `ink-geometry`,
`cnj`, `citation-export`, `prazo-cockpit`, `demanda-search`, `sheet-sections`,
`kanban-wip`, `caso-picker`. As falhas pré-existentes da suíte completa (`.aiox-core/**`,
`e2e/smoke`, alguns component tests) foram confirmadas no commit base — não são regressão.

## Verificação manual sugerida

Leitor: desenhar com a caneta, minimizar o grifador e grifar colapsado, exportar
citações por categoria. Demandas: cockpit (clicar chips), ⌘K, recolher tudo, vincular a
caso, nota privada, ver o badge de WIP mudar de cor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
