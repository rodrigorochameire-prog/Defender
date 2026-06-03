# Preview de importação PJe — classificação ágil

**Data:** 2026-06-03
**Escopo:** `inline-dropdown.tsx`, `pje-review-table.tsx`, `pje-import-modal.tsx`
**Fora de escopo:** funcionalidade "Escanear" (jobs `scan_intimacoes_jobs`), parser PJe, importação em si.

## Problema

Ao importar intimações (ex.: pauta VVD), o usuário quer classificar tudo já na etapa de
pré-visualização ("revisar") — hoje isso é lento:

1. **Bug:** o dropdown de ato não scrolla dentro do modal. O portal do `InlineDropdown`
   é montado em `document.body`; o `react-remove-scroll` do Radix Dialog cancela eventos
   de wheel/touch fora do conteúdo do dialog (mesma família do bug de clique do PR #68).
   A navegação por teclado também não acompanha o item destacado (sem `scrollIntoView`).
2. O ato sugerido por regex (`ato-suggestion.ts`) calcula confiança mas não preenche o
   campo — o usuário digita tudo manualmente.
3. Não há ações em lote — pautas com N intimações iguais exigem N edições.
4. O type-ahead do dropdown é invisível até digitar; atos frequentes ficam soterrados em
   listas de 30–50 opções.
5. Não há fluxo de teclado entre linhas.

## Design

### 1. Fix do scroll no `InlineDropdown` (beneficia todos os usos)

- `onWheel` no portal: `stopPropagation()` + scroll programático
  (`el.scrollTop += e.deltaY`). O scroll-lock impede o scroll nativo, não o via JS.
- `scrollIntoView({ block: "nearest" })` no item destacado quando `highlightedIndex`
  muda (navegação ↑↓ e type-ahead).

### 2. Pré-preencher ato sugerido

No `pje-import-modal.tsx`, na montagem das `PjeReviewRow` (hoje ~linhas 425–487):

- Confiança **high** ou **medium** → preenche `row.ato` com a sugestão e deriva o prazo
  (mesma lógica que o scan usa ao completar).
- Confiança **low** → campo continua vazio.
- O pontinho de confiança permanece como guia visual (verde = conferir, amarelo = olhar,
  vazio = classificar).

### 3. Ações em lote

- Coluna de seleção (checkbox), independente do checkbox "excluir", + "selecionar todas"
  no header.
- Barra de ações quando ≥1 selecionada: aplicar **ato**, **status**, **estado prisional**
  e **prazo** às linhas selecionadas. Reusa `InlineDropdown`/`InlineDatePicker`.
- Aplicar ato em lote recalcula prazo por linha (mesma derivação do item 2), exceto se a
  linha tem `prazoManual`.

### 4. Dropdown de ato melhor

- **Barra de busca visível** no topo do painel — presentacional (mostra o
  type-ahead existente + placeholder "Digite para filtrar…"). Um `<input>` real
  brigaria com o focus-trap do Radix Dialog (portal fora do conteúdo do dialog).
- **Grupo "Frequentes" primeiro:** lista curada de ~8 atos por atribuição em
  `atos-por-atribuicao.ts` (`ATOS_FREQUENTES_POR_ATRIBUICAO`), renderizada como primeiro
  grupo das opções no preview. Itens duplicam (aparecem em Frequentes e no grupo
  original); seleção é por valor, indiferente à origem.

### 5. Fluxo de teclado linha a linha

- Ao confirmar um ato (Enter ou clique), o foco avança para a **próxima linha sem ato**
  e abre o dropdown de ato dela automaticamente.
- Esc fecha sem avançar. Sem linhas pendentes → não faz nada (foco fica onde está).
- Implementação: callback `onAtoCommitted(index)` na tabela; a linha alvo expõe um ref
  para abrir o dropdown programaticamente (prop `openSignal`/ref imperativo no
  `InlineDropdown`).

## Abordagem escolhida

Evolução cirúrgica dos componentes existentes. Alternativa descartada: migrar o
`InlineDropdown` para Radix Popover/Select (resolveria o scroll nativamente, mas o
componente é usado em vários pontos do app e a migração tem risco/raio de mudança
desproporcionais ao bug).

## Erros e bordas

- Wheel manual deve respeitar `maxHeight` atual (scroll clampa nos limites do conteúdo).
- Linhas excluídas (checkbox "excluir") ficam fora do "selecionar todas" e do avanço de
  teclado.
- Pré-preenchimento nunca sobrescreve ato já definido pelo usuário (só roda na montagem
  inicial das rows).
- Em lote: aplicar campo X não toca nos demais campos da linha.

## Testes

- Unit: derivação de prazo no pré-preenchimento e no lote (respeitando `prazoManual`);
  helper "próxima linha pendente" (pula excluídas e já classificadas).
- Manual (browser): scroll do dropdown dentro do modal de importação (wheel + teclado),
  fluxo completo colar → revisar → classificar com teclado → importar.
