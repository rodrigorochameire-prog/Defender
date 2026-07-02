# Header Redesign — Vidro em duas camadas + overflow automático

**Data:** 2026-07-01
**Status:** Aprovado (brainstorm com mockups no visual companion)
**Escopo:** Top bar / header de todas as páginas do dashboard OMBUDS. Desktop primeiro, com regras de colapso que cobrem larguras menores. A bottom nav mobile (Fase 0) não muda.

## 1. Problema

O header atual tem três defeitos estruturais:

1. **Não existe "um header".** O `CollapsiblePageHeader` é uma casca; cada página (Agenda, Demandas, Assistidos) monta seu próprio cluster de ações via `children`/`bottomRow` e reimplementa responsividade com classes `hidden md:flex` ad-hoc. A zona central é `overflow-x-auto`, então em larguras intermediárias os ícones do switch de atribuições truncam e aparece scrollbar (sem regra de colapso — vazamento).
2. **Duplicação manual de ações.** Cada página repete os botões escondidos dentro do menu "…" com classes `lg:hidden`, que dessincroniza. Em algumas larguras aparecem dois "…" (um da página, um global).
3. **Visual chapado.** Bloco sólido `#464649` onde todos os controles são pills escuras do mesmo peso, sem agrupamento nem hierarquia. O badge vermelho "9+" do sino gera ansiedade sem informar urgência real.

O que o usuário quer preservar: o switch de atribuições (`AtribuicaoPills` iconOnly), os botões Refresh / PJe / + Novo (todos de uso diário), o sino (útil) e a paleta cinza.

## 2. Decisões de design (validadas visualmente)

### 2.1 Estrutura — primitivo compartilhado com overflow automático

Um novo primitivo de header com **zonas fixas**, na mesma ordem em toda página:

```
[ toggle sidebar + título + stats ] [ switch de atribuições ] [ ações da página → overflow ] [ + Novo ] [ … ] 
```

- As páginas **declaram ações** (id, ícone, rótulo, prioridade, handler); o primitivo decide o que fica visível e o que colapsa no "…" por **medição de largura** (ResizeObserver), não por breakpoint manual.
- **Nada trunca, nada some sem endereço**: toda ação removida da barra aparece no menu "…". Existe **um único "…"** por header.
- O switch de atribuições **nunca trunca**: quando falta espaço, o grupo colapsa para um dropdown compacto (ícone da atribuição ativa + chevron).

### 2.2 Visual — vidro flutuante em duas camadas internas

Um único bloco de vidro (rounded-xl, `backdrop-blur`, fundo translúcido) flutuando sobre o conteúdo, contendo duas faixas:

- **Faixa utilitária** (~26px, tom mais fundo `bg-black/20`, hairline embaixo): breadcrumb, indicador online, data, **sino**. Pode recolher ao rolar, sobrando só a faixa de trabalho.
- **Faixa de trabalho** (~48px): toggle sidebar, título + stats, poço do switch, ações, + Novo, "…".

Tratamentos:

- **Poço do switch**: os pills de atribuição vivem num "poço" rebaixado (`bg-black/25`, sombra interna, rounded) — leitura imediata de "isto é um grupo de filtro".
- **Botões fantasma**: Refresh, PJe e demais ações são ghost (transparente, hover sutil). **+ Novo é o único botão sólido** (emerald), preservando-o como primário.
- **Sino**: badge vermelho "9+" substituído por **ponto discreto** (rose). Vermelho/contagem só para urgência real (prazo/audiência, lógica `temAlerta` existente); contagem completa dentro do popover.
- **Tokens (claro/escuro)**: vidro claro `rgba(48,48,51,.82)` + `border-white/[0.09]`; escuro `rgba(23,23,25,.78)` sobre `neutral-950`. Sombra flutuante `0 8px 24px rgba(0,0,0,.22)`.
- **Fallback**: onde `backdrop-filter` não estiver disponível ou com `prefers-reduced-transparency`, fundo sólido equivalente (sem blur). `prefers-reduced-motion` desativa transições de recolhimento.

### 2.3 Cor da atribuição — acento pontual, só ícone

- O pill **ativo** no poço ganha a cor da atribuição: fundo `<cor>/20`, ícone na cor, ring interno `<cor>/35`. **Sem rótulo expandido** — só o ícone, como hoje.
- Cores vindas do config existente (`getAtribuicaoHex` / `SOLID_COLOR_MAP`): VVD amber, Júri emerald, EP blue, Criminal slate etc.
- **Sem tint ambiente**: o restante do header permanece neutro em todas as atribuições.
- No modo colapsado (dropdown), o trigger mostra o ícone ativo já colorido + chevron.

## 3. Arquitetura

Novos arquivos em `src/components/layouts/header/`:

| Componente | Responsabilidade |
|---|---|
| `GlassHeaderShell` | O bloco de vidro com as duas faixas, sticky, comportamento de scroll (recolher faixa utilitária), fallbacks de blur/motion. Registra presença via `PageHeaderProvider` (mecanismo atual). |
| `HeaderActionsBar` | Recebe `actions: HeaderAction[]`; mede largura disponível (ResizeObserver) e decide visíveis vs. overflow por `priority`. Renderiza o "…" único (DropdownMenu portal). |
| `HeaderAction` (tipo) | `{ id, icon, label, priority, onSelect?, render?, group? }` — `render` para casos ricos (ex.: ImportDropdown do PJe); `group` para separadores no overflow. |
| `AtribuicaoSwitchWell` | Wrapper do `AtribuicaoPills` no poço; prop `collapsed` troca para dropdown compacto. Reusa ícones/cores/config existentes. |

Integração e migração:

- `GlassHeaderShell` passa a ser o caminho novo; `CollapsiblePageHeader` continua existindo durante a migração (as três variantes atuais — `mergeUtilityRow`, default, `seamless` — convergem para o shell novo).
- `HeaderUtilityRow` standalone (páginas sem header próprio) é substituído pelo shell com faixa de trabalho mínima (só título).
- `NotificationsPopover`: mudar badge para ponto; vermelho/contagem apenas quando `temAlerta`.
- `design-tokens.ts` (`HEADER_STYLE`): novos tokens do vidro; os antigos permanecem até o fim da migração.
- Ordem de migração: **1) primitivo + shell, 2) Agenda, 3) Demandas, 4) Assistidos, 5) varredura das demais páginas** (que hoje usam o `HeaderUtilityRow` standalone). Remover as duplicações `lg:hidden` dos menus "…" de cada página ao migrar.

Fora de escopo: bottom nav mobile (permanece como está), `ContextControl` da sidebar, `AssignmentSwitcher` (consolidação dos três switchers é dívida separada), conteúdo dos popovers (notificações, command palette).

## 4. Comportamento responsivo (regras de colapso)

Prioridade de sobrevivência na barra, da última à primeira coisa a colapsar:

1. Toggle sidebar, título (título encurta: stats somem primeiro)
2. **+ Novo** (sempre visível; em telas muito estreitas vira só o ícone `+`)
3. Switch de atribuições (colapsa para dropdown, nunca some)
4. PJe → entra no "…"
5. Refresh → entra no "…"
6. Ações secundárias da página → já nascem no "…" se não couberem

A faixa utilitária esconde itens na ordem: online → breadcrumb intermediário → data. O sino nunca some.

## 5. Testes

- **Unit**: lógica de overflow por prioridade (dado um array de larguras e um container, quais ids ficam visíveis/overflow) — extraída pura para ser testável sem DOM.
- **Visual/manual**: 375 / 768 / 1024 / 1440 px nas três páginas migradas; conferir que nenhuma ação fica inacessível, que só existe um "…", e que não há scroll horizontal no header.
- **Regressão**: fluxos existentes dos botões (importar PJe, refresh/varredura, + Novo, sino) seguem funcionando após cada página migrada.
- **A11y**: focus visível nos pills do poço, `aria-label` nos icon-only, contraste ≥ 4.5:1 dos ícones sobre o vidro.

## 6. Referências

- Mockups aprovados: `.superpowers/brainstorm/88626-1782942693/content/` (`visual-style.html`, `visual-style-v2.html`, `atribuicao-tint.html`, `final-consolidado.html`)
- Componentes atuais: `src/components/layouts/collapsible-page-header.tsx`, `src/components/layouts/header-utility-row.tsx`, `src/components/demandas-premium/AtribuicaoPills.tsx`, `src/components/notifications-popover.tsx`, `src/lib/config/design-tokens.ts`
