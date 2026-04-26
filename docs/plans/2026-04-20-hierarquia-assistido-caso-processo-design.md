# Hierarquia Assistido → Caso → Processo · Design

**Data:** 2026-04-20
**Escopo:** Reformar a UX do OMBUDS pra expor a entidade `casos` (já existente no schema mas oculta) como nível intermediário. Eliminar duplicação de dados, reorganizar abas por nível correto, condicionar abas por area do caso.
**Esforço estimado total:** 7-10 dias (execução sequencial em 4 sub-fases)

---

## Visão

Hoje a UI trata `processos` como raiz: `/admin/assistidos/[id]` com 15+ abas tenta ser hub de tudo, e `/admin/processos/[id]` cria uma segunda navegação paralela. Muita coisa duplica (drive, audiências, atendimentos), a navegação é profunda, algumas abas aparecem hardcoded quando deveriam ser condicionais (institutos/atos-infracionais/medidas).

O banco já modela corretamente: existe `casos` com FK `assistidoId`, e os dados operacionais (audiências, atendimentos, demandas, ofícios, case_facts, diligências, documentos, analises_ia, depoimentos_analise) todos referenciam `caso_id`. A UI precisa **expor esse nível** e redistribuir abas entre 3 níveis semânticos.

**Contexto de domínio (Rodrigo):**
- Um assistido pode ter múltiplos casos (ex: cliente com processo de VVD + alimentos).
- Um caso é a unidade operacional de trabalho — a "agenda" do defensor.
- Um caso agrupa vários processos relacionados: **ação penal** (referência, em geral) + acessórios (APF, IP, execução). Exceção: em VVD, a **MPU** é a referência.
- Um processo pode ter múltiplos assistidos (co-réus), embora seja raro na prática.

## Princípios

1. **Caso é o nível operacional.** 80%+ das abas funcionais vivem aqui (audiências, atendimentos, demandas, ofícios, cronologia, documentos, mídias, análise).
2. **Assistido é a pessoa** — abas desse nível são identidade pessoal + visões cross-caso (timeline global, radar de bairro).
3. **Processo é metadata legal** — número CNJ, vara, juiz, andamentos próprios. Vista técnica útil pra deep-link mas raramente usada em fluxo normal.
4. **Condicionais por area** — Institutos (ANPP) só em penal elegível; MPU só em VVD; Atos Infracionais só em INFANCIA_JUVENTUDE; Execução Penal só em EXECUCAO_PENAL. Nada hardcoded.
5. **Deep-link preserva compatibilidade.** `/admin/processos/[id]` continua funcional. Links existentes não quebram.
6. **Source of truth única.** Edit de cada item vive em um lugar só; visualizações cross-level são read-only.

## Modelo Conceitual

```
Assistido (identidade da pessoa)
  └─ Caso 1 (hub operacional — 1 área, pode ter vários processos)
  │    ├─ Processo referência (ação penal, ou MPU em VVD)
  │    ├─ Processo APF (acessório)
  │    ├─ Processo IP (acessório)
  │    └─ Processo execução (se aplicável)
  └─ Caso 2 (opcional — outro caso operacional do mesmo assistido)
       └─ Processos...
```

Relações existentes no schema:
- `casos.assistidoId` → FK assistido
- `casos.casoConexoId` → autoreferência pra casos conexos (não usada ainda)
- `processos.caso_id` → FK caso
- `audiencias.caso_id`, `atendimentos.caso_id`, `anotacoes.caso_id`, `demandas.caso_id`, `diligencias.caso_id`, `documentos.caso_id`, `depoimentos_analise.caso_id`, `analises_ia.caso_id`, `case_facts.caso_id`, `case_personas.caso_id`, `claude_code_tasks.caso_id` — todos já existem.

---

## Arquitetura de URL

**Nova** estrutura:
```
/admin/assistidos/[id]                         → hub do assistido (Nível 1)
                                                  auto-seleciona primeiro caso ativo
/admin/assistidos/[id]/caso/[casoId]            → hub do caso (Nível 2)
                                                  renderiza abas do nível 2 + lista processos
/admin/assistidos/[id]/caso/[casoId]?aba=X      → aba específica do caso
/admin/assistidos/[id]/caso/[casoId]/processo/[procId]  → vista técnica de 1 processo (Nível 3)
```

**Legado (mantido como deep-link):**
```
/admin/processos/[id]  → resolver internamente:
                          1. Load processo → caso → assistido
                          2. Redirect pra /admin/assistidos/[ass]/caso/[caso]/processo/[id]
                         Se processo não tem caso/assistido (dados antigos), mantém vista atual
                         enxuta temporariamente.
```

**Justificativa rota aninhada sobre query params:**
- `/assistidos/[id]/caso/[N]` é semanticamente mais clara
- Melhor pra analytics (URL = hierarquia)
- Permite layout aninhado (Next.js App Router: parent layout renderiza header assistido, child renderiza header caso)

---

## Taxonomia de Abas — Mapeamento Completo

### Nível 1 — Assistido (sempre visível, independente de caso)

| Aba | O que mostra |
|---|---|
| Geral | Dados pessoais (nome, CPF, data nasc, endereço, telefone, WhatsApp, foto, notas pessoais) |
| Casos | Lista de casos do assistido — card por caso com tipo, status, última atividade. Click entra no caso (Nível 2). **Esta é a tab default** |
| Timeline | Histórico agregado cross-casos — todas as interações do defensor com o assistido |
| Radar | Notícias do bairro onde o assistido mora (indep. de caso) |

### Nível 2 — Caso selecionado (contextualizadas no caso; condicionais por area)

**Sempre visíveis** (qualquer area):

| Aba | Fonte de dados | Obs |
|---|---|---|
| Geral | `casos` (teoria fatos/provas/direito, foco, tags, status, fase) | Edit do caso |
| Análise | `analises_ia` (jsonb) | Briefing AI + skills |
| Processos | Lista de `processos` do caso | Nível 3 entra daqui |
| Pessoas | `participacoes_processo` agregadas do caso | Já implementado em I-B — migra do processo pro caso |
| Cronologia | `marcos_processuais` + `prisoes` + `cautelares` agregadas de todos processos do caso | Implementado em IV-A no nível processo — **migra pro nível caso** |
| Documentos | `documentos` do caso + links Drive | Hoje duplicado; unifica aqui |
| Audiências | `audiencias` do caso | Hoje em 2 lugares; fonte única aqui |
| Atendimentos | `atendimentos` do caso | Hoje no assistido; move pra cá |
| Mídias | `drive_files` / midias relacionadas ao caso | Hoje em 2 lugares; unifica aqui |
| Demandas | `demandas` do caso | Hoje no assistido; move pra cá |
| Ofícios | `oficios` (se existir `caso_id`) | Hoje no assistido; move pra cá |
| Investigação | board/quadro de investigação do caso | Hoje no assistido; move pra cá |

**Condicionais por `area`** (derivada do processo referência ou mais frequente do caso):

| Aba | JURI | VVD | EXECUCAO_PENAL | INFANCIA_JUVENTUDE | ANPP-elegível* | CRIMINAL | outras |
|---|---|---|---|---|---|---|---|
| Delitos/Tipificações | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Institutos (ANPP, SURSIS, SUSPROC) | ✓ | — | — | — | ✓ | ✓ | — |
| MPU (Medida Protetiva) | — | ✓ | — | — | — | — | — |
| Execução Penal (PEC, indulto, regressão) | — | — | ✓ | — | — | — | — |
| Atos Infracionais | — | — | — | ✓ | — | — | — |

*ANPP-elegível: derivado. Caso tem Institutos quando `processo.area ∈ {JURI, CRIMINAL, SUBSTITUICAO}` e tipo penal permite (pena mínima ≤ 4 anos, etc). Em X-β implementamos inferência simples (por area); inferência rigorosa (por tipo penal) fica pra Fase III (Delitos/Tipificações) quando tivermos dado estruturado.

### Nível 3 — Processo específico (vista técnica)

| Aba | O que mostra |
|---|---|
| Dados CNJ | Número CNJ completo, vara, juiz titular, classe, assunto, valor da causa |
| Andamentos | Movimentações específicas daquele autos (se integramos PJe) |
| Documentos do processo | Arquivos ligados a esse autos específico (subset filtrado do Drive do caso) |

Página enxuta (~300 linhas). Default: redireciona ao nível 2 a menos que `?raw=1` no URL.

---

## Componentes Novos

### `AssistidoLayout` (parent layout Nível 1)

Next.js App Router parent layout em `src/app/(dashboard)/admin/assistidos/[id]/layout.tsx`:

- Header do assistido (nome, foto, CPF, contato) — **collapse-on-scroll**
- Tab-bar Nível 1 (Geral, Casos, Timeline, Radar)
- `<Outlet />` pra renderizar children (seja hub ou `caso/[casoId]`)
- Loader data: assistido + lista resumida de casos do assistido (pra switcher)

### `CasoLayout` (nested layout Nível 2)

`src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/layout.tsx`:

- Sub-header do caso (título, área badge, fase, prioridade) — menor que o header do assistido
- **Switcher de caso** (se assistido tem >1 caso) — dropdown/tabs secundárias ao lado do título
- Tab-bar Nível 2 (abas sempre + condicionais por area)
- `<Outlet />` pra aba ativa

### `ProcessoTecnicoLayout` (nested layout Nível 3)

`src/app/(dashboard)/admin/assistidos/[id]/caso/[casoId]/processo/[procId]/layout.tsx`:

- Mini-header do processo (número CNJ, vara, juiz)
- Tab-bar Nível 3 (Dados CNJ, Andamentos, Documentos do processo)

### `CaseSwitcher`

Dropdown componente:
- Mostra caso ativo (título + badge de area + status)
- Lista outros casos do assistido ao abrir
- Inclui "+ Novo caso" no rodapé

### `useVisibleCasoTabs(area: Area | Area[])`

Hook puro. Retorna lista de abas visíveis no nível 2 baseado na area do caso. Inferência de `area` a partir dos processos do caso:
- Se há processo referência com area definida → usa
- Senão: usa area mais frequente dos processos do caso
- Default: `SUBSTITUICAO`

Testável isoladamente.

---

## Schema — o que muda

**Mínimo.** Todo o trabalho é de UI + reorganização de código. Única adição considerada:

- `casos.area_inferida` (opcional) — campo calculado via trigger/view pra acelerar queries de condicionais. **Decisão: não adicionar**; computar on-the-fly via join com `processos`. YAGNI.

Se descobrir performance gargalo durante implementação, adicionar é trivial.

---

## 4 Sub-fases

### X-α · Expor `casos` como entidade primária na UI (~2-3d)

**Entregáveis:**
- Rota nova `/admin/assistidos/[id]/caso/[casoId]/` com `CasoLayout`
- `AssistidoLayout` com tab-bar Nível 1 e `<Outlet />`
- `CaseSwitcher` dropdown
- `/admin/assistidos/[id]` (antes era ela mesma com 15 abas) vira redirect pra `/caso/[casoId mais-recente-ativo]` ou tela "escolha um caso" se 0 casos
- Processos do caso listados como sub-items (ainda não fragmentados em Nível 3)
- Abas do caso ainda em placeholders (migração de conteúdo em X-β)

**Migração compatível:**
- `/admin/assistidos/[id]` ainda funciona (redirect automático)
- `/admin/processos/[id]` ainda funciona (redirect pra /assistidos/.../caso/.../processo/[id])
- Nenhuma aba deletada ainda

### X-β · Reorganizar abas entre níveis (~3-4d)

**Entregáveis:**
- Migrar conteúdo das abas entre níveis:
  - `Demandas`, `Ofícios`, `Atendimentos`, `Investigação` → do assistido pro caso
  - `Audiências`, `Drive/Documentos`, `Mídias` → unificar, source única no caso
  - `Pessoas`, `Cronologia` (hoje em `processos/[id]`) → migram pro caso (agregação multi-processo)
  - `Delitos`, `Institutos`, `Atos Infracionais`, `Medidas` (MPU), `Execução Penal` → do processo pro caso, com **gate condicional** por `area`
- Hook `useVisibleCasoTabs(area)` implementado
- Testes: 5+ testes verificando condicionalidade (JURI → sem MPU; VVD → com MPU; INFANCIA → só Atos Infracionais; etc)
- `ProcessoTabs` (componente antigo em 7 abas) removido ou reduzido

**Inferência de area:**
- Função pura `inferCasoArea(processos[])`:
  - Se algum processo tem flag `isReferencia=true` (a ser adicionado) usa essa
  - Senão: moda das areas dos processos
  - Default: `SUBSTITUICAO`

*Decisão:* adicionar `processos.is_referencia: boolean default false` — migration leve. Determinação manual pelo user no Nível 3 (botão "Marcar como processo referência").

### X-γ · Reformar `/admin/processos/[id]` como vista técnica (~1-2d)

**Entregáveis:**
- Página enxuta (~300 linhas) com abas Nível 3 (Dados CNJ, Andamentos, Documentos específicos)
- Por default: redireciona pro Nível 2 (`/admin/assistidos/[a]/caso/[c]/processo/[p]`)
- Flag `?raw=1` mantém vista técnica standalone (pra deep-link técnico)
- ProcessoLegado tests: smoke test de que URLs antigas ainda funcionam

### X-δ · Integrar Cronologia no caso (read-only cross-processo) (~1d)

**Entregáveis:**
- Aba "Cronologia" no Nível 2 chama `trpc.cronologia.getCronologiaCompleta` agregando marcos+prisões+cautelares **de todos os processos do caso**.
- Visualização ordenada por data — bloco vermelho destaca prisões ativas.
- Read-only no Nível 2; edit continua no Nível 3 (source of truth no processo).
- Bloco "Situação atual" no topo do caso: se há prisão ativa, mostra "Preso desde X (tipo)"; se há cautelares ativas, lista. Silent quando nada ativo.

**Requer nova tRPC procedure:**
- `cronologia.getCronologiaDoCaso({ casoId })` — agrega os 3 tipos por todos processos do caso. ~30 linhas.

---

## Migração de Rotas — Tabela

| URL atual | Novo comportamento |
|---|---|
| `/admin/assistidos/[id]` | Mantém URL. Renderiza `AssistidoLayout` com aba "Casos" default. Se há 1 caso ativo, auto-seleciona e redireciona pra `/caso/[casoId]`. |
| `/admin/assistidos/[id]?tab=demandas` | Redireciona pra `/caso/[casoId]/demandas` do caso mais recente (ou tela "escolha caso" se N>1). |
| `/admin/processos/[id]` | Busca `caso_id` + `assistido_id`. Redireciona pra `/assistidos/[a]/caso/[c]/processo/[id]`. Se `?raw=1`, fica na vista técnica standalone. |

**Persistência de `casoId` ativo:** localStorage `ombuds:assistido-<id>:caso-ativo` pra retomar onde parou (30 dias TTL). Quando user troca no `CaseSwitcher`, atualiza local.

---

## Componentes a Remover/Reduzir

- `src/components/processo/processo-tabs.tsx` — reduz pra 3 abas Nível 3 (ou remove se nível 3 usar componente próprio)
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` — refactoring grande (1058 linhas → ~200-300 linhas distribuídas entre layout+page+components)
- Código duplicado de drive/audiências/atendimentos em dois lugares — unifica

## Componentes a Manter Intocados (respeita escopo)

- `EventDetailSheet` (agenda) — funciona; continua
- `/admin/pessoas/*`, `/admin/lugares/*`, `/admin/atendimentos/*` (páginas laterais) — não tocadas
- Sidebar — não mexe
- Routers tRPC existentes — não quebram APIs

---

## Testes (~40 novos)

**Layouts:**
- `AssistidoLayout.test.tsx` — 3 testes (renderiza tab-bar, outlet presente, header colapsa)
- `CasoLayout.test.tsx` — 4 testes (switcher de caso, tab-bar condicional por area, outlet)
- `ProcessoTecnicoLayout.test.tsx` — 2 testes

**Hook:**
- `use-visible-caso-tabs.test.ts` — 8 testes (1 por area, todas as combinações de condicionais)

**Componentes:**
- `CaseSwitcher.test.tsx` — 3 testes (single case oculta, multi mostra, click troca)
- Tests de migração de abas: 5+ testes verificando conteúdo certo aparece no nível certo

**tRPC:**
- `cronologia.getCronologiaDoCaso` — 2 testes (agrega múltiplos processos; ACL caso workspace)

**E2E ligth:**
- Fluxo: entrar em `/admin/assistidos/[id]` → auto-redirect pra primeiro caso → trocar de caso → abrir processo técnico → voltar. Manual + 1 smoke test.

**Regressão:**
- `/admin/assistidos/[id]` antigo com `?tab=demandas` funciona (redirect)
- `/admin/processos/[id]` antigo funciona (redirect)
- URLs existentes em bookmarks, whatsapp templates, emails de notificação — não quebram

---

## LGPD

Sem mudança estrutural. ACL continua por `workspace_id` via `casos.workspace_id` e `assistidos.workspace_id`. Todas as queries novas filtram por workspace do `ctx.user`.

Auditoria opcional em acesso ao caso pode vir depois (escopo futuro).

---

## Entregáveis Consolidados

1. 2 layouts Next.js App Router (`AssistidoLayout`, `CasoLayout`) + 1 para nível 3
2. `CaseSwitcher` componente
3. Hook `useVisibleCasoTabs(area)` com testes
4. 4 sub-pastas de abas novas em `/admin/assistidos/[id]/caso/[casoId]/_components/`
5. Migração de conteúdo: ~12 abas reorganizadas entre níveis
6. Migration leve: `processos.is_referencia boolean default false`
7. tRPC `cronologia.getCronologiaDoCaso` (+ testes)
8. Rota redirecionada `/admin/processos/[id]` (preserva deep-link)
9. `/admin/assistidos/[id]/page.tsx` refatorado de 1058 → ~300 linhas
10. Remoção de código duplicado de drive/audiências/atendimentos
11. ~40 testes (layouts, hook, componentes, tRPC, regressão)

## Fora de Escopo

- **Fase III (Delitos/Tipificações)** — inferência rigorosa de ANPP-elegível baseada em pena mínima exige schema delitos estruturado. Até lá, condicional "Institutos" é só por area (JURI/CRIMINAL/SUBSTITUICAO).
- **Integração PJe** em aba "Andamentos" do Nível 3 — mantém stub ou placeholder.
- **Auditoria estrutural de acesso a caso** — LGPD por workspace é suficiente.
- **Layout mobile dedicado** — responsivo mantém, mas refinamento fica pra depois.
- **Upload massivo de documentos** — mantém fluxo atual do drive.
- **Casos conexos** (`caso_conexo_id`) — schema existe mas UI não explora; fica pra fase dedicada.
- **Assistidos múltiplos num mesmo caso** (co-réus) — UX de "este caso tem 3 assistidos" fica como feature futura; por ora, mostra só o assistido de contexto.

---

## Sequência de Implementação Sequencial

Um único spec, um único plan grande. Sub-fases executadas em ordem:

1. **X-α** (3d): rotas + layouts + CaseSwitcher + placeholders — sistema navegável mas abas vazias de conteúdo novo
2. **X-β** (4d): migra conteúdo de abas entre níveis, aplica condicionais por area, adiciona `is_referencia`
3. **X-γ** (2d): vista técnica de processo
4. **X-δ** (1d): cronologia agregada + bloco "Situação atual"

Total: ~10 dias. Cada sub-fase fecha com commit marcador + testes passando. Não precisa verificação manual entre sub-fases (só ao final), mas Rodrigo pode pausar e validar se quiser.
