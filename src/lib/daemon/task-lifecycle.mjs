/**
 * Ciclo de vida das tarefas do daemon — lógica pura, única fonte da verdade.
 *
 * Importado tanto pelo daemon (`scripts/claude-code-daemon.mjs`, node ESM puro)
 * quanto pelo router tRPC (`src/lib/trpc/routers/analise.ts`, TS via bundler).
 * Mantido em `.mjs` justamente para rodar nos dois ambientes sem build.
 *
 * Spec: docs/specs/daemon-reliability.md
 */

/**
 * Tarefa presa em `processing` por mais que isto é tratada como zumbi.
 * DEVE ser MAIOR que o timeout por tarefa do daemon (DAEMON_TASK_TIMEOUT_MS,
 * default 30 min em runClaude) — senão o reaper periódico (a cada 5 min) mataria
 * uma análise legítima ainda em andamento. 35 min dá folga sobre os 30 min.
 * Se você aumentar DAEMON_TASK_TIMEOUT_MS além de 35 min, aumente isto também.
 */
export const ZOMBIE_TIMEOUT_MS = 35 * 60 * 1000;

/**
 * @typedef {Object} TaskLifecycleRow
 * @property {number} id
 * @property {string} status
 * @property {string|Date|null|undefined} [startedAt]
 * @property {string|Date|null|undefined} [createdAt]
 */

/**
 * Converte `Date` | ISO string | null/undefined em epoch ms, ou `null` se não-datável.
 * @param {string|Date|null|undefined} value
 * @returns {number|null}
 */
export function toEpoch(value) {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Uma tarefa é "zumbi" quando está em `processing` e começou (ou, na falta de
 * `startedAt`, foi criada) há mais que `timeoutMs`. Tarefas `pending` (na fila) e
 * terminais (`completed`/`failed`/...) nunca são zumbis. Sem data datável → não-zumbi
 * (conservador: não recupera o que não dá para datar).
 *
 * @param {TaskLifecycleRow} task
 * @param {number} now epoch ms de referência
 * @param {number} [timeoutMs]
 * @returns {boolean}
 */
export function isZombie(task, now, timeoutMs = ZOMBIE_TIMEOUT_MS) {
  if (!task || task.status !== "processing") return false;
  const ref = toEpoch(task.startedAt) ?? toEpoch(task.createdAt);
  if (ref == null) return false;
  return now - ref > timeoutMs;
}

/**
 * Das candidatas do dedup (pending/processing), retorna só as que AINDA bloqueiam —
 * i.e., não são zumbis. Lista vazia ⇒ chamador pode criar nova tarefa.
 *
 * @param {TaskLifecycleRow[]} tasks
 * @param {number} now
 * @param {number} [timeoutMs]
 * @returns {TaskLifecycleRow[]}
 */
export function activeBlockers(tasks, now, timeoutMs = ZOMBIE_TIMEOUT_MS) {
  return (tasks ?? []).filter((t) => !isZombie(t, now, timeoutMs));
}

/**
 * Ids das tarefas zumbis — para o reaper marcar como `failed`.
 *
 * @param {TaskLifecycleRow[]} tasks
 * @param {number} now
 * @param {number} [timeoutMs]
 * @returns {number[]}
 */
export function selectZombieIds(tasks, now, timeoutMs = ZOMBIE_TIMEOUT_MS) {
  return (tasks ?? []).filter((t) => isZombie(t, now, timeoutMs)).map((t) => t.id);
}
