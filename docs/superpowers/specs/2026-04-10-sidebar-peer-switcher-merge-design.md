# Design: Fusão do DefensorSwitcher no ContextControl

**Data:** 2026-04-10
**Autor:** Rodrigo (com brainstorming assistido)
**Status:** Aprovado, pronto para implementação

---

## Contexto

Hoje a sidebar do OMBUDS renderiza **dois seletores de contexto** empilhados no topo:

1. `<ContextControl />` (`src/components/layout/context-control.tsx`) — popover "PERFIL ATIVO" que lista Rodrigo e Juliane (titulares do Júri/VVD/EP) como botões principais, mais Danilo e Cristiane numa seção colapsada "Outros defensores — varas criminais". Os dados vêm do arquivo estático `src/config/defensores.ts` via `ProfissionalContext`.
2. `<DefensorSwitcher />` (`src/components/layout/defensor-switcher.tsx`) — popover com ícone de olho que lista *todos* os usuários aprovados do workspace via `trpc.users.workspaceDefensores` (hoje, os defensores da 7ª Regional / RMS).

Essa duplicação tem dois problemas:

- **Redundância visual:** dois slots no topo da sidebar com ícones parecidos e propósitos sobrepostos.
- **Ambiguidade semântica:** Danilo e Cristiane aparecem no ContextControl como "profissionais que o Rodrigo pode virar" (trocando `profissionalAtivo`), mas também podem existir no `workspaceDefensores` como usuários reais do banco. O mesmo humano representado de duas formas diferentes, com comportamentos diferentes ao clicar.

Na prática, o caso de uso do recurso "ver outros defensores" **não é coordenação judicial** — é o Rodrigo, **como criador do OMBUDS**, acompanhando adoção: "a Paula está usando? como a Roberta navegou? o Ramon cadastrou assistidos?". É telemetria de produto, não substituição processual.

## Objetivo

Fundir os dois seletores em um único popover (o do `ContextControl`), eliminando a duplicação visual e conceitual, gateando a nova seção por `role === "admin"`, e tornando o "ver como colega" um modo **read-only** com bloqueio de escrita no backend.

## Decisões aprovadas no brainstorming

| # | Decisão | Escolha |
|---|---|---|
| 1 | Quem vê a opção "visualizar como colega" | Apenas `role === "admin"` (reaproveitar o role existente, sem flag nova) |
| 2 | Gate mecânico | `sessionUser?.role === "admin"` no render, mais middleware tRPC no backend |
| 3 | Indicação do modo "vendo como" | Sutil + **read-only forçado** (botões de ação desabilitados, mutations bloqueadas) |
| 4 | Layout | Seção colapsável dentro do popover do ContextControl, abaixo do PERFIL ATIVO |
| 5 | Danilo/Cristiane | Sair de `profissionaisConfigs` — Rodrigo confirmou que não usa mais o clique neles para "virar profissional" |
| 6 | Agrupamento da nova seção | Subgrupos "Camaçari" e "RMS" (cosmético, ambos consomem `workspaceDefensores`) |
| 7 | Rename do botão "Ver todos os colegas" | Para "Visão agregada" — elimina ambiguidade com a nova seção |

## Mudanças estruturais

### a) Remoção

- `src/components/layouts/admin-sidebar.tsx:1683` — remover o render `<DefensorSwitcher collapsed={isCollapsed} />`.
- `src/components/layout/defensor-switcher.tsx` — deletar o arquivo; nenhum outro lugar usa o componente.
- `src/config/defensores.ts` — remover as entradas `"danilo"` e `"cristiane"` do `DEFENSORES_CONFIG`. Os helpers `getDefensorByUserName` e `listarDefensores` continuam funcionando, só que com dois registros a menos.

### b) Alteração no ContextControl

`src/components/layout/context-control.tsx` — dentro do `ContextPopoverContent`:

- A seção atual "Outros defensores" colapsável (`varasCriminaisDefensores`) é **removida**. Com Danilo/Cristiane fora do `DEFENSORES_CONFIG`, essa lista ficaria vazia naturalmente, mas ainda assim o bloco deve ser apagado para limpar o código.
- O botão "Ver todos os colegas" é **renomeado** para "Visão agregada". Comportamento inalterado (ainda aponta para `id="GERAL"`).
- Abaixo da "Visão agregada", e **apenas se `sessionUser?.role === "admin"`**, renderiza uma nova seção colapsável **"Outros defensores"**, fechada por padrão.

### c) Nova seção "Outros defensores" (admin-only)

Estrutura do bloco:

```
┌─ Outros defensores ────────────── [chevron] ┐   <- CollapsibleTrigger
│                                              │
│  Camaçari                                    │   <- subheader
│   [D] Danilo    [C] Cristiane                │   <- peer buttons
│                                              │
│  RMS                                         │   <- subheader
│   [P] Paula    [R] Ramon    [R] Raquel       │
│   [R] Rebeca   [R] Renan    [R] Renata       │
│   [R] Roberta   ...                          │
│                                              │
│  ── Voltar ao meu perfil ──                  │   <- visible only when isViewingAsPeer
└──────────────────────────────────────────────┘
```

**Fonte de dados:** `trpc.users.workspaceDefensores.useQuery()` — uma única chamada, já existente. A lista retornada é particionada no cliente em dois subgrupos via `comarcaId` (ou campo equivalente no schema `users`); se o schema ainda não tiver esse campo, o agrupamento cai em uma lista flat única rotulada "Colegas" (decisão: feature incremental — não bloquear o merge por isso).

**Clique em um peer:** atualiza `selectedDefensorId` no `DefensorContext` para o `id` daquele usuário. O popover fecha.

### d) Modo "ver como peer" (read-only)

**Estado derivado.** Adicionar um hook `useIsViewingAsPeer()` em `src/hooks/use-is-viewing-as-peer.ts`:

```ts
export function useIsViewingAsPeer() {
  const { selectedDefensorId } = useDefensor();
  const { user } = usePermissions();
  return selectedDefensorId !== null && selectedDefensorId !== user?.id;
}
```

**Enforcement no backend.** Criar `src/lib/trpc/middlewares/block-when-viewing-as-peer.ts`:

- Middleware tRPC que lê o `selectedDefensorId` da request. O canal é um header HTTP `x-defensor-scope` enviado pelo cliente via tRPC link sempre que o `DefensorContext` tiver um `selectedDefensorId` diferente de `null`. O plano de implementação precisa verificar se hoje já existe esse header (ou algum equivalente enviado pelo `DefensorContext` ao backend) e reaproveitar; se não existir, adicionar o link customizado é parte do plano.
- Se o header estiver presente E o valor for diferente do `ctx.user.id` → lança `TRPCError({ code: "FORBIDDEN", message: "Modo somente-leitura: você está visualizando como outro defensor" })`.
- Aplicado nas procedures de mutação críticas: `assistidos.create`, `assistidos.update`, `assistidos.archive`, `processos.create`, `processos.update`, `casos.*`, `demandas.*`, `documentos.upload`, `drive.*`, e qualquer outra mutation de escrita em dados de assistido/processo/caso/demanda. A lista exata é mapeada no plano de implementação (grep por `mutation(`).
- **Não aplicado** a: `auth.*`, `users.me`, configurações pessoais do admin, ou qualquer leitura (`query`).

**Enforcement no frontend (cosmético + preventivo).** Os componentes de ação consomem o hook `useIsViewingAsPeer()` e aplicam:

- `disabled={isViewingAsPeer}` nos botões de salvar/editar/arquivar/criar/deletar.
- `className` adicional (`cursor-not-allowed opacity-60`).
- Tooltip "Somente leitura — você está visualizando como [nome do peer]".

O frontend é apenas UX preventiva; o backend é a barreira real.

**Saída do modo.** Três formas de voltar ao próprio perfil:

1. Clicar no próprio avatar principal do ContextControl (Rodrigo) — já funciona naturalmente porque zera `selectedDefensorId` ao trocar de profissional interno.
2. Botão explícito "Voltar ao meu perfil" que aparece no fim da seção "Outros defensores" **apenas quando** `isViewingAsPeer === true`.
3. `setSelectedDefensorId(null)` em qualquer outro ponto.

## Fluxo de dados

```
[Sidebar]
   └─ ContextControl (popover)
        ├─ PERFIL ATIVO         <- profissionaisConfigs (Rodrigo/Juliane)
        │                           via ProfissionalContext
        ├─ Visão agregada       <- id="GERAL" local do ContextControl
        ├─ Outros defensores    <- trpc.users.workspaceDefensores
        │    (admin only,           via DefensorContext
        │     colapsada)            ao clicar: setSelectedDefensorId(peer.id)
        └─ Visão Integrada      <- toggle local (inalterado)

[Qualquer mutation do app]
   └─ tRPC client envia request
        └─ middleware blockWhenViewingAsPeer
             ├─ ctx.user.id === selectedDefensorId → passa
             └─ selectedDefensorId !== null && !== ctx.user.id → FORBIDDEN
```

## O que explicitamente NÃO muda

- Lógica do `PERFIL ATIVO` (Rodrigo/Juliane como botões principais + troca de `profissionalAtivo`).
- `ProfissionalContext`, `AssignmentContext`, `DefensorContext` — todos existentes, continuam como estão.
- Schema do banco — nenhuma migration.
- O toggle "Visão Integrada" — continua onde está.
- `trpc.users.workspaceDefensores` — já existe, não é alterado.
- Qualquer query de leitura — `selectedDefensorId` continua sendo usado normalmente pelos routers que filtram por defensor.

## Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Código fora do ContextControl referencia `"danilo"` ou `"cristiane"` como string hardcoded (relatórios, mock data, testes) | Fluxo quebrado em lugares não-óbvios | Sweep obrigatório antes de mexer: `grep -rn '"danilo"\|"cristiane"' src/ __tests__/` — primeiro passo do plano de implementação. Todas as referências encontradas viram item explícito do plano. |
| `comarcaId` não existe no schema `users` | Subgrupos "Camaçari" / "RMS" ficam vazios | Fallback: lista flat única rotulada "Colegas", sem agrupamento. Não bloqueia o merge; vira melhoria incremental quando a coluna existir. |
| Middleware de escrita bloqueia uma mutation que não deveria ser bloqueada (ex: o admin mudando configuração pessoal dele enquanto tem um peer selecionado) | Falso positivo frustra o admin | Lista de allowlist explícita de procedures (ou namespace) que ignoram o middleware: `users.updateSelf`, `auth.*`, `settings.personal.*`. Documentar no próprio middleware. |
| Peer selecionado persiste no localStorage e admin esquece que está no modo ao voltar no dia seguinte | Confusão + frustração | O `DefensorContext` **não** persiste `selectedDefensorId` entre sessões — reset ao fazer login ou ao recarregar a página. Se já persiste hoje, adicionar limpeza no mount. |
| Remoção de `<DefensorSwitcher />` sem antes migrar alguma dependência dele que eu não vi | Import quebrado, build falha | O arquivo será deletado apenas após `grep -rn "DefensorSwitcher" src/` confirmar que só existia o uso em `admin-sidebar.tsx`. |
| **Danilo e Cristiane podem não existir como usuários no banco** (`users` table). Se removermos do `DEFENSORES_CONFIG` sem verificar, eles somem do UI por completo. | Regressão: a lista "Outros defensores" fica sem eles, contrariando o intento do design. | **Primeiro passo do plano de implementação**, antes de qualquer edição de código: rodar `SELECT id, name, email, role, approval_status FROM users WHERE name ILIKE '%danilo%' OR name ILIKE '%cristiane%'`. Três cenários possíveis: (1) já existem aprovados → seguir o plano como está; (2) existem mas não aprovados → aprovar manualmente como parte do plano; (3) não existem → criar como novos usuários (sem login ativo, só presença no workspace) OU manter Danilo/Cristiane no `DEFENSORES_CONFIG` por enquanto e marcar como "virtuais" no render, aceitando que o clique neles seja no-op até que tenham contas reais. A decisão entre criar ou manter vira uma escolha no plano, não neste spec. |

## Critérios de aceitação

1. `admin-sidebar.tsx` renderiza apenas `<ContextControl />` no topo, sem `<DefensorSwitcher />`.
2. Para um usuário não-admin (ex: Juliane), o popover do ContextControl **não mostra** a seção "Outros defensores".
3. Para Rodrigo (admin), o popover mostra a seção "Outros defensores" colapsada por padrão; expandir revela Danilo, Cristiane e todos os colegas da RMS em subgrupos (ou flat, dependendo do schema).
4. Clicar em um peer atualiza o avatar principal do ContextControl para o peer, e todos os botões de ação de escrita ficam desabilitados com tooltip explicando.
5. Tentar chamar qualquer mutation de escrita via tRPC retorna `FORBIDDEN` quando `selectedDefensorId !== ctx.user.id`.
6. Clicar em "Voltar ao meu perfil" (ou no próprio avatar) restaura o estado normal, reabilita os botões, e nenhuma chamada de escrita é bloqueada.
7. Danilo e Cristiane não aparecem mais no `DEFENSORES_CONFIG` nem em qualquer lookup hardcoded por string no código.
8. `npm run build` e `npm run lint` passam.

## Escopo fora deste design (follow-ups futuros)

- **Dashboard de adoção:** o caso de uso real ("acompanhar a minha aplicação") pede mais do que "ver como" — pede métricas agregadas (última atividade, qtd. de assistidos criados, features usadas por peer). Vira uma página `/admin/adocao` em design separado.
- **Coluna `comarcaId` em `users`:** se ainda não existir, vira um design próprio — adicionar, popular, RLS.
- **Generalização para coordenadores não-admin:** quando aparecer o primeiro Defensor Público-Chefe não-admin que precise desta visão, criar a flag `canViewPeers` e trocar o gate. Hoje é YAGNI.

## Plano de implementação

A ser criado via skill `writing-plans` em `docs/superpowers/plans/` após aprovação deste spec pelo usuário.
