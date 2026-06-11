/**
 * Dispatcher — fila de tarefas com cap de concorrência + prioridade.
 *
 * Puro (sem I/O): recebe `run(item)` e despacha respeitando `maxConcurrent`,
 * escolhendo sempre a tarefa de menor `priority` (desempate por `created_at`
 * crescente — strings ISO ordenam por tempo). Dedup por `item.id`.
 *
 * Usado pelo claude-code-daemon: tanto o INSERT do Realtime quanto o catch-up
 * empurram para a MESMA fila via `enqueue`, em vez de chamar `run` direto —
 * assim o cap vale para as duas fontes e nada estoura RAM/cota.
 */
export function createDispatcher({ maxConcurrent = 3, run }) {
  if (typeof run !== "function") throw new TypeError("createDispatcher: run deve ser função");
  const max = Math.max(1, Number(maxConcurrent) || 1);

  let active = 0;
  const queued = new Map(); // id -> item (aguardando slot)
  const known = new Set(); // ids na fila ou ativos (dedup)

  function pick() {
    let best = null;
    for (const it of queued.values()) {
      if (!best) {
        best = it;
        continue;
      }
      const bp = best.priority ?? 100;
      const ip = it.priority ?? 100;
      if (ip < bp) {
        best = it;
      } else if (ip === bp && (it.created_at ?? "") < (best.created_at ?? "")) {
        best = it;
      }
    }
    return best;
  }

  function pump() {
    while (active < max && queued.size > 0) {
      const item = pick();
      queued.delete(item.id);
      active++;
      Promise.resolve()
        .then(() => run(item))
        .catch(() => {}) // erros são tratados dentro de run; não derrubar o loop
        .finally(() => {
          active--;
          known.delete(item.id);
          pump();
        });
    }
  }

  function enqueue(item) {
    if (item == null || item.id == null) return false;
    if (known.has(item.id)) return false; // dedup
    known.add(item.id);
    queued.set(item.id, item);
    pump();
    return true;
  }

  return {
    enqueue,
    get active() {
      return active;
    },
    get pending() {
      return queued.size;
    },
    get maxConcurrent() {
      return max;
    },
  };
}
