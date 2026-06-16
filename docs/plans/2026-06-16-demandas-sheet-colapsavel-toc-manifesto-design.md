# Sheet de Demandas — seções colapsáveis + ToC + manifesto

**Data:** 2026-06-16
**Componente alvo:** `src/components/demandas-premium/DemandaQuickPreview.tsx`
**Branch:** `feat/demandas-sheet-colapsavel`

## Contexto e objetivo

O sheet lateral de Demandas (`DemandaQuickPreview`) é rico em edição inline (ato, status,
atribuição, tipo de processo, nº do processo, nome do assistido, status prisional, prazo),
mas é uma **rolagem longa e sempre-expandida**: todos os blocos aparecem de uma vez, sem
navegação. O sheet da Agenda (`event-detail-sheet.tsx`) resolveu isso com três peças que
queremos espelhar:

1. **`CollapsibleSection`** — seções abre/fecha com estado persistido em localStorage.
2. **`SheetToC`** — índice fixo (sticky) com scroll-spy (IntersectionObserver) e "pular para".
3. **Manifesto de seções** (`secoes-manifest.ts`) — um array ordenado de ids define a ordem e a
   visibilidade; **ToC e corpo derivam da mesma fonte**, então nunca divergem.

Objetivo: tornar o sheet de Demandas navegável e com disclosure progressivo, reusando o que a
Agenda já tem, **sem regressão** na edição inline existente.

## Não-objetivos (camadas futuras, fora deste spec)

- Doca de autos rica (`AutosModalViewer` com PDF/Texto/OCR/grifar) — fica para depois.
- Footer de captura rápida (`SheetActionFooter`) + detecção de evento em anotações.
- Sinais de pessoas (`BannerInteligencia` / `PessoaChip`).
- Manifestos por atribuição (v1 usa um único default; deixamos o gancho pronto).
- Remover `@ts-nocheck` do arquivo.

## Arquitetura — manifesto + `secoesMap` (fonte única)

Espelha o padrão validado da Agenda ([[reference_sheet_resumo_por_subtipo]]).

- Novo `src/components/demandas-premium/sheet/secoes-manifest.ts`:
  - `type SecaoId = "registros" | "proxima-audiencia" | "identificacao" | "cronologia" | "oficio" | "autos" | "recursos"`.
  - `SECOES_DEMANDA: SecaoId[]` — ordem default do corpo.
  - `resolverManifesto(/* futuro: atribuição */): SecaoId[]` — v1 retorna `SECOES_DEMANDA`.
- No `DemandaQuickPreview`, montar `secoesMap: Record<SecaoId, { label: string; temDado: boolean; count?: number; node: React.ReactNode }>`.
  - **`Record` completo (não `Partial`)** → o compilador força um `node` para todo `SecaoId`.
  - **ToC e corpo derivam de `SECOES_DEMANDA.filter(id => secoesMap[id].temDado)`** — fim da
    divergência ToC×corpo. Mover/ocultar seção = editar o array, não a JSX.

## Componentes (reuso + 1 ajuste) — nota de trabalho concorrente

⚠️ `event-detail-sheet.tsx` e `sheet-toc.tsx` têm alterações **não commitadas** de outro
worktree (polimento da Agenda). Para **não conflitar**, este trabalho NÃO move nem renomeia
esses arquivos e NÃO altera imports da Agenda.

- **`SheetToC`** (`components/agenda/sheet/sheet-toc.tsx`): consumido **como está** (props
  `sections`/`activeId`/`onJump`). Não é modificado. Demandas importa de lá.
- **`CollapsibleSection`** (`components/agenda/sheet/collapsible-section.tsx`): arquivo **não**
  está em alteração concorrente; será estendido de forma **retrocompatível**:
  - `storageKey?: string` (default `"agenda-sheet-sections-open"`) → Demandas passa
    `"demandas-sheet-sections-open"` (namespace próprio de persistência, sem colisão de ids).
  - `open?: boolean` + `onOpenChange?` opcionais (modo controlado) → necessário para o ToC
    abrir a seção ao "pular". Sem esses props, o componente segue não-controlado como hoje;
    a Agenda não muda de comportamento.
  - **Propriedade da persistência:** em modo **controlado** (`open` definido), o
    `CollapsibleSection` NÃO lê nem escreve o localStorage — a persistência é do **parent**
    (que detém o `Record<SecaoId,boolean>` e grava sob `storageKey`). Em modo não-controlado
    (Agenda), continua lendo/escrevendo internamente como hoje. Isso evita escrita dupla.
- **`useSheetWidthResize`** já é usado no sheet (doca de autos) — sem mudança.

> Coupling cross-feature (Demandas importando de `agenda/sheet/`) é assumido como **interino**.
> Extrair `CollapsibleSection`/`SheetToC` para `components/shared/sheet/` fica para quando o
> branch de polimento da Agenda assentar (evita conflito agora).

## Estado fixo × colapsável

**Fixo (sempre visível), sem mudança de comportamento:**
- Nav header (título, prev/next, fechar).
- Hero card (avatar, nome, badges preso/urgente, pills **ato/status** editáveis, **processo**
  copiável/editável, ações: dar ciência, ver assistido, abrir Drive).
- Pipeline stepper (com popover de substatus).
- **ToC sticky** — inserido logo abaixo do pipeline stepper.
- Linha compacta de **Ações Rápidas** (Agendar audiência · Adicionar prazo · Abrir no PJe),
  fixa acima da barra inferior.
- Barra inferior (Resolver · Timeline · Arquivar · Deletar).

## Seções colapsáveis — ordem, default, visibilidade, count

| ordem | `SecaoId` | label | default open | `temDado` (aparece se…) | `count` |
|---|---|---|---|---|---|
| 1 | `registros` | Registros | **aberto** | sempre (se sem `assistidoId`, mostra hint "vincular assistido") | nº de registros |
| 2 | `proxima-audiencia` | Próxima audiência | **aberto** | `proximaAudiencia` existe | — |
| 3 | `identificacao` | Identificação | fechado | sempre | — |
| 4 | `cronologia` | Cronologia & Prazo | fechado | sempre | — |
| 5 | `oficio` | Ofício sugerido | fechado | `oficioSugerido != null` | — |
| 6 | `autos` | Autos & Documentos | fechado | `previewFiles.length > 0` OU pasta Drive existe | nº de autos |
| 7 | `recursos` | Recursos | fechado | `midiasFlat.length > 0` OU `pdfFiles.length > 0` | mídias + pdfs |

Defaults aplicados só na 1ª vez (sem valor persistido); depois, o estado por seção vem do
localStorage (`demandas-sheet-sections-open`).

Conteúdo de cada seção = exatamente os blocos atuais, **realocados** (sem perder edição inline):
- `registros` → `RegistrosTimeline` + botão Adicionar + `RegistroEditor`/`RegistroComAutosDialog`.
- `proxima-audiencia` → bloco de próxima audiência (hoje sticky perto do rodapé) movido para cá.
- `identificacao` → Bloco A (Assistido editável, Atribuição, Tipo, Status prisional, Vara).
- `cronologia` → Bloco B (Expedição, Prazo editável + badge, Importado, Atualizado, Providências).
- `oficio` → card de Ofício sugerido + "Gerar Ofício".
- `autos` → Autos em destaque + `SectionsViewer` (Atos) + Documentos do Drive (upload incluso).
- `recursos` → strips de mídias + PDFs.

## ToC + scroll-spy + jump-to-open

- `IntersectionObserver` no container de rolagem do sheet observa `[data-section-id]`
  (atributo que o `CollapsibleSection` já emite) e atualiza `activeId`
  (rootMargin `-10% 0px -70% 0px`, igual à Agenda).
- `onJump(id)`: (1) garante a seção aberta (set no estado controlado), (2)
  `scrollIntoView({ behavior: "smooth", block: "start" })` no nó `[data-section-id=id]`.
- O estado aberto/fechado por seção é mantido no parent (`Record<SecaoId, boolean>`,
  inicializado do localStorage via mesma chave do `CollapsibleSection`), passado a cada seção
  como `open`/`onOpenChange` — assim o ToC consegue abrir ao pular.

## Organização de arquivos

O `DemandaQuickPreview` tem ~2110 linhas e `@ts-nocheck`. Para reduzir e isolar, extrair as
seções mais pesadas para `src/components/demandas-premium/sheet/secoes/`:
- `IdentificacaoSecao.tsx`, `CronologiaSecao.tsx`, `AutosSecao.tsx`, `RecursosSecao.tsx`.
- Seções leves (`registros`, `proxima-audiencia`, `oficio`) podem permanecer inline no
  `secoesMap` ou extrair também, conforme o tamanho.
- Cada seção recebe só os props/handlers de que precisa (unidades focadas, testáveis).

Estrutura resultante:
```
src/components/demandas-premium/sheet/
├── secoes-manifest.ts
└── secoes/
    ├── IdentificacaoSecao.tsx
    ├── CronologiaSecao.tsx
    ├── AutosSecao.tsx
    └── RecursosSecao.tsx
```

## Estados-limite

- **Sem `assistidoId`:** `registros` mostra hint; `recursos`/`autos` por assistido ficam ocultas
  (sem dado); edição de nome/prisional indisponível (já é o comportamento atual).
- **Sem `processoId`:** `autos`/`proxima-audiencia`/`oficio` tendem a não ter dado → ocultas.
- **Todas as seções de dado vazias:** ToC mostra apenas `registros` + `identificacao` +
  `cronologia` (as "sempre"). Sheet nunca fica sem ToC.
- **Mobile (< sm):** ToC sticky com scroll horizontal (já é o comportamento do `SheetToC`).

## Verificação

- `npm run typecheck` (o arquivo é `@ts-nocheck`, mas os novos arquivos de seção/manifesto NÃO
  serão — devem tipar limpo) e `npm run build`.
- Teste manual no app (dev server):
  1. Abrir demanda → Registros (e Próxima audiência, se houver) abertos; resto fechado.
  2. Colapsar/expandir seções; recarregar → estado persiste por seção.
  3. Clicar nas pills do ToC → rola e abre a seção; `activeId` acompanha o scroll.
  4. Demanda sem ofício/mídia/autos → essas seções somem (ToC enxuto).
  5. Edição inline (ato/status/atribuição/tipo/nº/nome/prisional/prazo) intacta dentro das seções.
  6. Doca de autos (resize) e modais (RegistroComAutos, DocumentPreview) seguem funcionando.

## Riscos

- **Realocação de muita JSX** num arquivo `@ts-nocheck` grande: mitigar extraindo seções para
  arquivos próprios (tipados) e migrando bloco a bloco, validando no app a cada seção.
- **Persistência colidir com a Agenda:** mitigado pelo `storageKey` próprio.
- **Conflito com trabalho concorrente:** mitigado por não tocar `event-detail-sheet.tsx` nem
  `sheet-toc.tsx` (só estender `collapsible-section.tsx`, que está limpo).
