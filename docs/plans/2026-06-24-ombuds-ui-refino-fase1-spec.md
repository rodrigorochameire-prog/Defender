# OMBUDS — Refino UI/UX Fase 1 (Acabamento de Design System)

> Spec-driven + TDD. Cada fase = uma worktree lane = um PR. CI é o gate.
> Origem: varredura externa (Claude for Chrome) + ground-truth no código (2026-06-24).
> Doutrina transversal: `docs/plans/2026-06-24-ombuds-redesign-doutrina.md`.

## Princípio orientador

A varredura externa diagnosticou os **sintomas** corretamente, mas errou a **causa**: concluiu que faltam sistemas (tokens de atribuição, escala de criticidade). O código mostra que os sistemas **já existem** — o que falta é **enforcement/consolidação**. Portanto esta fase **não cria scaffolding novo**; ela arrasta o que está fora para dentro do que já existe e tranca a porta com lint.

- Registry de atribuição: `src/lib/config/atribuicoes.ts` (+ `src/lib/config/tipologia/`) — usado por ~18 superfícies, ignorado por 8.
- Badge de prazo canônico: `calcularPrazoBadge()` em `src/components/demandas-premium/sheet/prazo-badge.ts` — já mapeia `diff < 0 → red`; ignorado por ~7 implementações ad-hoc.
- Tokens CSS: `src/app/globals.css` + map em `tailwind.config.ts`. **Não criar `--attr-*`** — o idioma do código é registry TS → classes Tailwind; CSS custom properties iriam contra a grão e não resolvem a divergência (a divergência é por não-importação, não por formato).

## Convenções de execução

- Uma worktree por lane (lição [[worktree-isolation]]); nunca `git add -A` (lição [[git-add-pathspec]]).
- TDD: teste vermelho primeiro, depois implementação até verde, depois refactor.
- Um PR por fase; CI verde é condição de merge.
- Runner: o do repo (`__tests__/components/*.test.tsx`, happy-dom). Subagente confirma o comando exato (`npm test` / vitest) antes de escrever.

---

## F0 — Semântica de tokens (success ≠ primary; contraste CNJ)

**Problema (verificado).** `--success` é idêntico a `--primary` em ambos os temas (light `162 63% 35%`, dark `162 70% 50%`). Um botão de ação e um selo "Deferido" ficam indistinguíveis. Além disso, o número CNJ usa classes neutras inconsistentes (`text-neutral-600` na expandida `DemandaCard.tsx:420`, `text-neutral-500` na compacta `:712`) em vez de `text-muted-foreground`.

**Mudança.**
- `globals.css`: diferenciar `--success` para um verde de **estado** (sugestão `152 60% 40%` light / `152 55% 48%` dark — calibrar), mantendo `--primary` como verde de **ação**. `--success-foreground` permanece legível.
- Padronizar CNJ em `text-muted-foreground` nas duas vistas do `DemandaCard`.
- (Opcional, mesma PR) revisar `--muted-foreground` light (`0 0% 45%`) para garantir ≥ 4.5:1 sobre `--background` se a medição reprovar; manter discreto.

**Testes (vermelho primeiro).**
- `success-token.test.ts`: lê `globals.css`, falha se `--success` == `--primary` em qualquer tema.
- Regressão grep: `DemandaCard.tsx` não usa `text-neutral-500|600` para o nó do número de processo (usa `text-muted-foreground`).

**Aceite.** Botão primário e selo de sucesso lado a lado são visualmente distintos; CNJ usa o mesmo token nas duas vistas; CI verde.

---

## F1 — Consolidação de cor de atribuição (8 stragglers → registry)

**Problema (verificado).** 8 arquivos declaram seu próprio `ATRIBUICAO_COLORS` em vez de importar o registry, e **divergem**. Execução Penal sozinha tem 4 azuis: `#60a5fa` (registry), `#0284c7` (floating-*), `#6A9EC5` (charts), `blue-600` (benefícios).

Stragglers:
- `src/app/(dashboard)/admin/beneficios/page.tsx` (`text-blue-600`, `bg-blue-600`)
- `src/app/(dashboard)/admin/settings/enrichment/page.tsx`
- `src/app/(dashboard)/admin/settings/drive/auto-vincular/page.tsx`
- `src/components/shared/floating-demandas.tsx` (hex)
- `src/components/shared/floating-agenda.tsx` (hex)
- `src/components/casos/case-card.tsx`
- `src/components/cadastro/cadastro-mapa.tsx` (hex — consumidor não-Tailwind)
- `src/components/demandas-premium/dynamic-charts.tsx` (hex — consumidor não-Tailwind)

**Mudança.** Todos consomem `getAtribuicaoColors` / `SOLID_COLOR_MAP`. Se faltar um shape (ex.: hex puro para charts/map), **estender o registry** com um único helper (ex.: `getAtribuicaoHex(key)`) — uma fonte, vários formatos derivados. Execução Penal passa a ter **um** azul em todo lugar.

**Testes.**
- `atribuicao-consolidation.test.ts` (arquitetural/grep): falha se qualquer arquivo fora de `src/lib/config/` declarar `ATRIBUICAO_COLORS` ou literais de cor de atribuição (`blue-600`, `#0284c7`, `#6A9EC5`, etc.).
- `atribuicao-registry.test.ts`: assert que a cor de cada atribuição é única e estável (snapshot do registry); Execução Penal resolve para um único hex em todos os helpers.

**Aceite.** Grep por `ATRIBUICAO_COLORS` fora de `config/` retorna zero; Benefícios renderiza o azul do registry; CI verde.

---

## F2 — Consolidação de criticidade de prazo (7 impls → canônico)

**Problema (verificado).** O badge canônico já acerta (`diff < 0 → red`), mas convivem ~7 implementações com thresholds e cores divergentes (algumas rose-outline, VVD com buckets próprios). A claim externa "141d aparece âmbar" é **falsa no canônico**, mas a fragmentação é real. A claim "280 dias verde é incoerente" é **rejeitada** (280 dias no futuro = baixa urgência, verde correto).

Implementações a unificar (entre outras): `admin/vvd/page.tsx`, `admin/vvd/intimacoes/page.tsx`, `admin/vvd/medidas/page.tsx`, `admin/prazos/page.tsx`, vistas compactas/tabela de Demandas, `assistido-utils.ts`.

**Mudança.** Elevar `calcularPrazoBadge()` (ou extrair para `src/lib/prazo.ts`) como **fonte única**; todas as vistas consomem. Documentar a **regra de canais de cor** (atribuição governa identidade: borda/ícone/tag; severidade governa urgência: badge de prazo/fundo crítico) em uma página do design system. Ordenação por severidade decrescente onde já não houver.

**Testes.**
- `prazo.test.ts`: tabela de thresholds — `-141 → red`, `0 → red`, `1–3 → amber`, `4–7 → green`, `8+ → gray` (ou os buckets finais definidos); cobre limites.
- Regressão grep: nenhuma lógica de cor de prazo (`dias < 0`, `diasRestantes`) define cor fora do módulo canônico.

**Aceite.** Item 141d vermelho forte em light e dark; um único caminho para renderizar prazo; CI verde.

---

## F3 — Bug do nome em branco no card mobile

**Problema (verificado).** `DemandaCard.tsx:328` (linha de cabeçalho mobile) não tem `flex-1 min-w-0`; a versão desktop (`:550`) tem. Sem isso o nome do assistido não é constrangido/quebra e renderiza como linha em branco no mobile — perda da identificação primária. É **regressão de dado**, prioridade alta.

**Mudança.** Adicionar `flex-1 min-w-0` à linha mobile; garantir nome como **primeiro** elemento renderizado (peso forte), tipo do ato como subtítulo, número do processo rebaixado a metadado. Não há teste do `DemandaCard` ainda (só `demanda-card-actions.test.tsx`).

**Testes (vermelho primeiro).**
- `demanda-card.test.tsx`: renderiza `DemandaCard` com nome longo; assert que o nó do nome existe e é o primeiro filho significativo do cabeçalho; assert presença de `flex-1`/`min-w-0` na linha mobile (regressão estrutural).

**Aceite.** Nome visível e primário no mobile com nomes longos; desktop sem regressão; CI verde.

---

## F4 — Higiene de vocabulário (enum cru, acentos, dicionário de área)

**Problema (verificado).**
- Enum cru: `admin/assistidos/[id]/demandas/page.tsx:56-58` renderiza `{d.status}` (ex.: `7_SEM_ATUACAO`) sem mapear; o Kanban usa `getStatusConfig`. Dicionário central existe em `src/config/demanda-status.ts`.
- Acentos: `Juri`→`Júri`, `Execucao Penal`→`Execução Penal`, `Familia`→`Família`, `Civel`→`Cível` em `oficios/templates/novo`, `processos/[id]/editar`, `assistidos/[id]/editar`, `settings/enrichment`.
- Sem dicionário central de **rótulos de área** (cada form repete labels).

**Mudança.**
- Trocar `{d.status}` por `getStatusConfig(d.status).label`.
- Criar/usar um dicionário único de rótulos de área (acentuados) e consumir nos forms (eliminar labels inline).
- Camada de apresentação para strings de tribunal/vara (capitalização natural + acento na exibição; código bruto fica em detalhe/tooltip).
- Decisão de glossário: padronizar "Cadastro" vs "Ficha" (recomendo manter **"Ficha"** se for o termo de domínio; decidir 1 e aplicar). PO decide.

**Testes.**
- `vocab-regression.test.ts`: grep-suite que falha em (a) render de `*.status` sem `getStatusConfig` na aba demandas; (b) labels `"Juri"|"Execucao Penal"|"Familia"|"Civel"` sem acento em `src/app`.
- Render test: aba demandas do perfil mostra "Sem atuação", nunca `7_SEM_ATUACAO`.

**Aceite.** Zero enum cru na UI; labels de área acentuados e centralizados; CI verde.

---

## F5 — Tooltips universais em botões só-ícone

**Problema.** Ícones de ação/atribuição têm `aria-label` (acessibilidade ok) mas faltam tooltips visuais no hover. Custo baixo, reaproveita o texto existente.

**Mudança.** Envolver botões só-ícone num `Tooltip` reaproveitando `aria-label`/label do registry. Eliminar duplicação de glifo (dois "pessoas", dois "alvo") — um conceito, um ícone canônico.

**Testes.** `icon-tooltip.test.tsx`: botões só-ícone das toolbars expõem tooltip/label acessível; sem glifo duplicado para conceitos distintos (inventário fixo).

**Aceite.** 100% dos ícones de ação com tooltip no hover; CI verde.

---

## F6 — Header variante B (perfil compartilha a métrica do Demandas)

**Problema (verificado).** Demandas e Assistidos-lista já compartilham `CollapsiblePageHeader`. O perfil do assistido (`assistidos/[id]/layout.tsx`) rola um header **próprio** (avatar 40px, nome `font-serif 17px/600`). Já é contido — o ganho não é encolher, é **compartilhar a métrica** (altura-base, espaçamentos, posição de busca/ações) para a transição lista→entidade parecer contínua e a faixa "Atenção Imediata" ganhar protagonismo.

**Mudança.** Definir duas variantes oficiais de um mesmo sistema: **A — header de lista/módulo** (matriz = Demandas) e **B — header de entidade** (perfil, layout horizontal: nome serifado + CPF/status como metadados ao lado). Migrar o header do perfil para herdar a métrica do `CollapsiblePageHeader`. Avaliar enxugar a barra sticky secundária de Assistidos.

**Testes.** `entity-header.test.tsx`: estrutura/altura-base do header de entidade alinhada à do `CollapsiblePageHeader`; nome serifado preservado; metadados horizontais.

**Aceite.** Perfil herda métrica/ritmo do header de Demandas sem perder o nome serifado; CI verde.

---

## F7 — Lint guard (sela a fase)

**Problema.** Sem trava, a divergência volta.

**Mudança.** Regra ESLint/stylelint que **falha o build** ao introduzir (a) cor de atribuição/severidade crua fora da camada de registry/token; (b) `ATRIBUICAO_COLORS` declarado fora de `config/`; (c) cálculo de cor de prazo fora do módulo canônico.

**Depende de:** F1, F2 consolidados.

**Aceite.** CI quebra ao introduzir cor hardcoded de atribuição/severidade ou enum cru; verde no estado consolidado.

---

## Grafo de dependências / paralelização

| Lane | Depende de | Risco | ROI | Paralelizável |
|------|-----------|-------|-----|---------------|
| F0 token | — | baixo | alto | sim |
| F1 atribuição | — | médio | alto | sim |
| F2 prazo | — | médio | alto | sim |
| F3 mobile bug | — | baixo | alto (regressão) | sim |
| F4 vocab | — | baixo | médio | sim |
| F5 tooltips | — | baixo | médio | sim |
| F6 header B | — | médio-alto | médio | sim (maior) |
| F7 lint | F1, F2 | baixo | alto (trava) | não |

**Onda 1 (segura, independente):** F0, F3, F4.
**Onda 2:** F1, F2 (consolidações maiores), depois F5.
**Onda 3:** F6 (header), F7 (lint, após F1/F2).

Cada lane: worktree isolado → branch `feat/refino-fX-...` → testes vermelhos → implementação → verde → diff revisado → PR.
