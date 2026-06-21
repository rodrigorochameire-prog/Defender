# Spec — Confiabilidade do Daemon (tarefas zumbi + dedup)

> Track A. Spec-driven + TDD. Lógica pura em `src/lib/daemon/task-lifecycle.mjs`
> (única fonte da verdade, importada pelo daemon `.mjs` e pelo router `.ts`).

## Problema

O daemon (`scripts/claude-code-daemon.mjs`) processa `claude_code_tasks` adquirindo um
lock otimista (`status: pending → processing`). Se o daemon morre, reinicia, ou o
`claude` CLI estoura o timeout de 10 min, a tarefa fica **presa em `processing` para
sempre**. Duas consequências:

1. **Bloqueio do assistido** — o dedup em `analise.criarTask`
   (`inArray(status, ["pending","processing"])`) considera a tarefa morta como "em
   andamento" e **recusa qualquer nova análise** daquele assistido/caso, sem aviso.
2. **Lixo acumulado** — não há limpeza; a fila enche de `processing` órfãos.

## Decisão

Uma tarefa em `processing` há mais que `ZOMBIE_TIMEOUT_MS` (15 min — folga sobre o
timeout de 10 min do CLI) é **zumbi**. Zumbis:

- **NÃO bloqueiam** o dedup (o assistido volta a poder pedir análise).
- São **recuperados** (marcados `failed`, etapa "Recuperado") por um *reaper* periódico
  no daemon e também na inicialização (recupera de crash/reboot).

Tarefas `pending` nunca são zumbis — só estão na fila aguardando o daemon.

## Contrato (`task-lifecycle.mjs`)

| Função | Retorno | Regra |
|---|---|---|
| `ZOMBIE_TIMEOUT_MS` | `number` | `15 * 60 * 1000` |
| `toEpoch(v)` | `number \| null` | `Date`/ISO string/null → epoch ms ou null |
| `isZombie(task, now, timeoutMs?)` | `boolean` | `status==='processing'` **e** `now - ref > timeoutMs`, onde `ref = startedAt ?? createdAt`. Sem `ref` datável → `false` (conservador). |
| `activeBlockers(tasks, now, timeoutMs?)` | `Task[]` | tarefas que ainda bloqueiam o dedup (não-zumbis) |
| `selectZombieIds(tasks, now, timeoutMs?)` | `number[]` | ids para o reaper marcar `failed` |

## Wiring

- **`analise.criarTask`**: buscar candidatas (`id, status, startedAt, createdAt`),
  calcular `activeBlockers`. Se houver bloqueador vivo → retorna o existente. Senão →
  cria nova tarefa (mesmo que exista um zumbi).
- **Daemon**: `reapZombies()` periódico (5 min) + 1x no startup; marca zumbis `failed`
  com `erro: 'Timeout — tarefa zumbi recuperada (>15min em processing)'`.
- **Daemon (robustez)**: rastrear o `child` ativo e `kill()` no shutdown; tratar erro
  dos updates de etapa (log em vez de falha silenciosa).

## Aceite

- [ ] `task-lifecycle.test.ts` cobre: pending nunca zumbi; processing recente não-zumbi;
      processing antigo zumbi; fallback `createdAt` quando `startedAt` nulo; sem datas →
      não-zumbi; `activeBlockers`/`selectZombieIds` particionam corretamente.
- [ ] dedup deixa criar nova tarefa quando o único existente é zumbi.
- [ ] daemon recupera zumbis no startup e a cada 5 min; updates de etapa não quebram.
