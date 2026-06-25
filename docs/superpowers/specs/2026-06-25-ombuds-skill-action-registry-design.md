# OMBUDS — Action Registry de Skills + Motor do Daemon

**Data:** 2026-06-25
**Status:** Design aprovado (aguardando revisão final do spec)
**Autor:** Rodrigo (Defensor Público) + Claude Code

## Problema

O OMBUDS tem **30 skills jurídicas** (`.claude/skills-cowork/`) processadas por um daemon `claude -p` (conta Max, sem API paga), mas só **~5 estão acionáveis por botão na UI**. A causa não é falta de botões — é que **cada skill é cabeada à mão** em componentes específicos, então expor uma skill nova exige código de UI dedicado. Resultado: 17 skills de alto valor ficam invisíveis (`pergunte-ao-auto`, `analise-acordao`, `transcrever-*`, `noticias`, `revisar-minutas`, peças de `vvd`/`execucao-penal`/`criminal-comum`).

Além disso, o motor do daemon não tem roteamento de modelo (tudo no default Max), relê o system prompt do disco a cada task, e não expõe métricas de latência/falha.

O Defensor pediu: deixar a funcionalidade **perfeita, super eficiente e com mais usos**, incluindo usos novos: investigação OSINT do fato da denúncia, ofício de pagamento de substituição, e formulação dinâmica de perguntas conforme o estado do caso — e que **adicionar usos futuros seja barato** ("e outros usos").

## Objetivo

1. **Escalabilidade:** transformar "expor uma skill" de "escrever um componente" em "adicionar uma linha num catálogo declarativo".
2. **Eficiência:** roteamento de modelo por skill, cache de system prompt, e observabilidade (p95, taxa de falha, idade da fila).
3. **Mais usos:** acender skills ocultas de maior valor diário, começando por um piloto ponta-a-ponta.

Não-objetivos: reescrever o daemon (está validado — testes 13/13, login Max, E2E, KeepAlive); mexer na lane `browser`; refatorações não relacionadas.

## Arquitetura — três camadas isoladas

```
┌─ Action Registry (NOVO) — src/lib/skills/action-registry.ts
│     catálogo declarativo: 1 entrada por uso. Fonte única de verdade.
│
├─ UI Surfaces — <SkillActionBar surface=… context=…/>
│     lê o registry, mostra só ações válidas no contexto, dispara, renderiza
│
└─ Engine (daemon) — scripts/claude-code-daemon.mjs
      roteamento de modelo + cache de prompt + métricas
```

### Camada 1 — Action Registry

Módulo TS novo `src/lib/skills/action-registry.ts`. Cada uso é uma entrada:

```ts
type Surface = 'assistido' | 'processo' | 'audiencia' | 'registro' | 'dashboard'
type ContextNeed =
  | 'assistidoId' | 'processoId' | 'casoId'
  | 'audienciaId' | 'registroId' | 'audioDriveFileId'
  | 'freeText' | 'acordaoText'
type ResultKind =
  | 'analise-blocks' | 'qa-citacoes' | 'documento'
  | 'relatorio-md' | 'transcricao' | 'radar'

interface SkillAction {
  id: string                       // 'pergunte-ao-auto'
  skill: string                    // alias mandado ao daemon
  label: string
  description: string
  icon: LucideIcon
  surfaces: Surface[]              // onde aparece
  requires: ContextNeed[]          // gating: desabilita se faltar
  input?: 'none' | 'text' | 'file' // pede pergunta? anexa acórdão?
  result: ResultKind               // qual renderer usa
  model?: 'haiku' | 'sonnet' | 'opus'
  atribuicao?: Atribuicao[]        // restringe a júri/vvd/ep/criminal (opcional)
}
```

Helper puro:

```ts
function actionsFor(surface: Surface, context: ActionContext): SkillAction[]
```

Filtra por `surfaces.includes(surface)`, por `requires` (todo `ContextNeed` presente no `context`) e por `atribuicao` (se definida). Função pura → testável sem UI nem banco.

**Exemplo (piloto):**

```ts
{
  id: 'pergunte-ao-auto', skill: 'pergunte-ao-auto',
  label: 'Pergunte aos autos', description: 'Pergunta livre sobre o processo, com citação de página',
  icon: MessageCircleQuestion,
  surfaces: ['processo', 'assistido'],
  requires: ['processoId'],
  input: 'text',
  result: 'qa-citacoes',
  model: 'sonnet',
}
```

### Camada 2 — UI Surfaces

Componente genérico `<SkillActionBar surface context />`:

1. Chama `actionsFor(surface, context)`.
2. Renderiza no visual atual (`src/components/shared/cowork-action-button.tsx`), desabilitando com tooltip as ações sem contexto ("requer áudio no registro").
3. Ao clicar: se `input` é `text`/`file`, abre dialog pequeno; senão dispara direto.
4. Dispara via `useSkillTask` (`src/hooks/use-skill-task.ts`) → `analise.criarTask` (`src/lib/trpc/routers/analise.ts`), passando skill + contexto + (input).
5. Acompanha status pelo Realtime já existente.
6. Ao concluir, roteia `resultado` (jsonb) para o renderer conforme `result`.

**Pontos de montagem (telas existentes):**

| Surface | Tela | Ações de exemplo |
|---|---|---|
| `processo`/`assistido` | página assistido/processo | pergunte-aos-autos, análise, investigar-fato, perguntas dinâmicas |
| `audiencia` | detalhe de audiência | transcrever-audiência, preparar-audiência |
| `registro` | registro de atendimento | transcrever-atendimento |
| `dashboard` | painel | radar de notícias, ofício de substituição |

**Renderers de resultado:**
- `analise-blocks` → **reusa** `analise-tab.tsx` (já existe).
- `qa-citacoes` → **novo, pequeno** (Fase 1): resposta + citações com página + selo de confiança. Schema da skill `pergunte-ao-auto`: `{ resposta, citacoes[], confianca, encontrado }`.
- `documento` → **reusa** padrão `SkillResult` (link .docx no Drive).
- `relatorio-md` / `transcricao` / `radar` → Fase 2, conforme acendemos os usos.

### Camada 3 — Engine (daemon)

`scripts/claude-code-daemon.mjs`:

1. **Roteamento de modelo** — mapa `MODEL_ROUTING` por skill dir; `runClaude` (linha ~196) adiciona `--model` quando mapeado. **Opt-in e conservador**: skills de classificação/extração de baixa complexidade (ex.: `classify-document`, `numeracao-oficios`) → `haiku`; peças/análises de alta complexidade (`juri`, `vvd`, `criminal-comum`, `execucao-penal`) → `opus`; resto → sem flag (default Max). Skill não mapeada = comportamento atual (zero regressão). Cada entrada do mapa é validada por uma task real antes de virar default.
2. **Cache de system prompt** — memoiza `buildSystemPromptFile` (linha ~139) por skill, invalidado por mtime do diretório; escreve o temp 1× por skill (não por task) e limpa temps antigos no boot.
3. **Métricas** — nova procedure `system.daemonMetrics` (`src/lib/trpc/routers/system.ts`): p95 de latência por skill (`completed_at - started_at`), taxa de falha por skill, idade da fila pendente mais antiga, retry rate. Exibidas em `/admin/daemon` (`src/app/(dashboard)/admin/daemon/page.tsx`). Migração: coluna `attempt_count int default 1` em `claude_code_tasks` (`src/lib/db/schema/casos.ts`).

## Fluxo de dados (ponta a ponta)

```
clique na ação → (dialog de input opcional) → analise.criarTask({skill, contexto, prompt})
  → INSERT claude_code_tasks → daemon (Realtime) → MODEL_ROUTING escolhe modelo
  → claude -p (system prompt em cache) → JSON → status=completed
  → Realtime UPDATE → SkillActionBar roteia resultado → renderer por `result`
```

## Tratamento de erro

- Reusa o existente: `failed`/`needs_review`, retry-once de JSON (linha ~336), reaper de zumbis (15min).
- Ações sem contexto mínimo: desabilitadas com tooltip (nunca disparam task inválida).
- Ações com `input`: validam antes de inserir.
- **Investigação OSINT:** o renderer marca o resultado como **"indícios a verificar"**, nunca como fato; a skill é instruída a citar fontes/links e a distinguir hipótese de confirmação.

## Testes

- **Unit:** `actionsFor()` (gating por surface/contexto/atribuição — pura); resolução do `MODEL_ROUTING`; shape de `daemonMetrics`.
- **E2E:** task real do piloto pelo daemon (padrão do healthcheck já usado: INSERT → completed → JSON parseado). Cheap skills primeiro.
- Não re-testa o que já está validado (lifecycle, KeepAlive, login Max).

## Faseamento

**Fase 1 — Fundação + motor (prova o caminho inteiro):**
- `action-registry.ts` + `actionsFor` + testes.
- `<SkillActionBar>` + renderer `qa-citacoes`.
- Roteamento de modelo + cache de prompt + cleanup de temp.
- Migração `attempt_count` + `system.daemonMetrics` + cards no `/admin/daemon`.
- **Piloto E2E: "Pergunte aos autos"** (maior valor diário, saída JSON simples).

**Fase 2 — Acender usos (cada um = entrada no registry + renderer se inédito):**
- Transcrições (audiência/atendimento/depoimento).
- Análise de acórdão (`input: 'file'|'text'`).
- Investigação OSINT do fato (web search → relatório, "indícios a verificar").
- Ofício de pagamento de substituição (`oficio-gratificacao`, surface `dashboard`).
- Perguntas dinâmicas conforme estado do caso (variação de `preparar-audiencia`).

## Riscos e mitigação

- **Qualidade do roteamento de modelo:** opt-in por skill; default mantém o comportamento atual; fácil reverter por entrada.
- **OSINT — precisão/privacidade:** resultado sempre rotulado como indício; foco no fato da denúncia, com fontes; sem afirmações categóricas sobre pessoas.
- **Auto-commit hook do repo:** trabalho vai direto para `main` (ver memória); commits atômicos e descritivos por fatia.

## Arquivos afetados (estimativa)

- Novos: `src/lib/skills/action-registry.ts`, `src/components/shared/skill-action-bar.tsx`, `src/components/shared/result-renderers/qa-citacoes.tsx`, testes.
- Editados: `claude-code-daemon.mjs` (routing + cache), `system.ts` (métricas), `casos.ts` (coluna), `daemon/page.tsx` (cards), telas que montam o `SkillActionBar`.
