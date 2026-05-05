# Action Card — Layout & Default — Design

**Data:** 2026-05-05
**Autor:** Rodrigo Rocha Meire (com Claude)
**Status:** Aprovado para implementação
**Branch:** `feat/action-card-layout`

## Objetivo

Polir o `RegistroEditor` (card "REGISTROS" da demanda) para reduzir cliques no caminho mais comum, melhorar a clareza visual e abrir espaço para os 12 tipos sem layout quebrado em duas linhas.

## Estado atual

- Componente: `src/components/registros/registro-editor.tsx`
- Renderiza **todos os 12 tipos** num `flex-wrap` — em viewports estreitas (e no quick-preview) quebra em 2 linhas desbalanceadas (ex.: 5+3 ou 6+6).
- Default da demanda: `tipoDefault="providencia"` hardcoded em `DemandaQuickPreview.tsx:1005`.
- Padrão "selected expand" já implementado (ativo mostra ícone + label, inativos icon-only com `title`).
- Sem atalhos de teclado, sem overflow, sem modificadores.

## Mudanças

### 1. Default Ciência

`DemandaQuickPreview.tsx:1005` → `tipoDefault="ciencia"`. Outros consumidores (`registro-audiencia/tab-anotacoes.tsx` continua "anotacao") não mudam.

### 2. Tipos primários × overflow "Mais ▾"

| Visíveis (7) | No "Mais ▾" (5) |
|---|---|
| Ciência (default) | Pesquisa |
| Providência | Elaboração |
| Diligência | Busca |
| Atendimento | Investigação |
| Delegação | Transferência |
| Anotação | |
| Petição | |

Implementação no `RegistroEditor`:
- Nova prop opcional `tiposPrimarios?: TipoRegistro[]` — se omitida, mostra todos (compatibilidade com chamadas atuais).
- `DemandaQuickPreview` passa os 7 primários; o restante vai num popover acionado por chip "Mais ▾".
- Quando o usuário escolhe um tipo do "Mais", ele **substitui** o chip "Mais" pela seleção expandida, mantendo um único linha.
- `tiposPermitidos` continua existindo e tem precedência (caso queiram restringir).

### 3. Atalhos de teclado

Quando o editor está focado (textarea ou container):
- `1`–`7`: alterna entre os 7 tipos primários (na ordem da tabela acima).
- `⌘↵` / `Ctrl↵`: salva (se `conteudo.trim()` não vazio).
- `Esc`: cancela (chama `onCancel` se fornecido).

Listener via `useEffect` no editor — não afeta inputs digitados (verifica `e.metaKey/ctrlKey` para o save; para 1–7, só dispara se `(e.target as HTMLElement).tagName !== "INPUT" && !== "TEXTAREA"`).

### 4. UX polish

- Foco automático no `<textarea>` quando o editor abre (a maioria das vezes você já sabe o tipo, quer digitar).
- Botão Salvar muda visualmente conforme estado: enabled = bg `cfg.color`; disabled = neutro com 40% opacidade. Hoje usa `disabled:opacity-50` mas sem feedback de cor por tipo.
- Tooltip dos chips inativos passa a mostrar também o atalho: `"Ciência (1)"`, `"Providência (2)"`, etc.

## Não inclui (YAGNI)

- **Modificadores em footer separado** (sigilo, anexo, @mencionar, 📍local) — não existem hoje no schema, ficam para PR próprio depois de definir o modelo de dados.
- Customização da ordem dos primários por usuário.
- Persistir o "último tipo usado" como default por demanda — default fixo é mais previsível.
- Drag-and-drop dos chips.

## Critérios de aceite

- [ ] Default ao abrir editor numa demanda = **Ciência** (chip cyan expandido).
- [ ] Card mostra 7 chips em uma única linha em qualquer viewport ≥ 320 px.
- [ ] Botão "Mais ▾" abre popover com os 5 tipos restantes; clicar substitui a seleção primária.
- [ ] Atalhos `1`–`7` trocam o tipo quando o foco não está num input/textarea.
- [ ] `⌘↵` / `Ctrl↵` salva quando há conteúdo.
- [ ] `Esc` cancela quando `onCancel` está disponível.
- [ ] Tooltip mostra "label (atalho)" para os chips inativos primários.
- [ ] Foco automático no textarea ao abrir.
- [ ] Type-check (`pnpm typecheck`) e build passam.
- [ ] Vercel preview renderiza sem regressão visual em outros pontos de uso (`registro-audiencia/tab-anotacoes.tsx`).

## Self-review

**Placeholder scan:** sem TBD/TODO no spec.
**Internal consistency:** mudanças (1)–(4) tocam apenas `RegistroEditor` + um consumidor (`DemandaQuickPreview`). Não há ondas em outros pontos.
**Scope:** PR pequena, ~150 linhas alteradas estimado. Cabe em plano único.
**Ambiguity:** ordem dos primários no Mais ▾ definida (mantém ordem alfabética dos labels: Busca, Elaboração, Investigação, Pesquisa, Transferência).
