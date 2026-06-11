/**
 * Testes do dispatcher — rodar: `node scripts/lib/dispatcher.test.mjs`
 * Sem framework: asserts nativos + saída legível.
 */
import assert from "node:assert/strict";
import { createDispatcher } from "./dispatcher.mjs";

let passed = 0;
function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}

async function tick() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

/** run controlável: cada item fica pendente até release(id). releaseAll() solta os que já começaram. */
function deferredRun(onStart) {
  const releases = new Map(); // id -> resolve (apenas tarefas já iniciadas e não liberadas)
  const run = (item) => {
    if (onStart) onStart(item);
    return new Promise((resolve) => {
      releases.set(item.id, () => {
        releases.delete(item.id);
        resolve();
      });
    });
  };
  return {
    run,
    release: (id) => releases.get(id)?.(),
    releaseAll: () => [...releases.values()].forEach((fn) => fn()),
  };
}

async function drain(d, def) {
  let guard = 0;
  while ((d.active > 0 || d.pending > 0) && guard++ < 100) {
    def.releaseAll();
    await tick();
  }
}

// 1. Respeita o cap de concorrência
{
  let maxObserved = 0;
  const def = deferredRun(() => {
    maxObserved = Math.max(maxObserved, dd.active);
  });
  const dd = createDispatcher({ maxConcurrent: 2, run: def.run });
  for (const id of [1, 2, 3, 4, 5]) dd.enqueue({ id, priority: 100, created_at: `t${id}` });
  await tick();
  assert.equal(dd.active, 2, "deve haver 2 ativos (cap)");
  assert.equal(dd.pending, 3, "3 aguardando");
  def.release(1);
  await tick();
  assert.equal(dd.active, 2, "ainda 2 ativos após liberar 1 (próximo entrou)");
  assert.equal(dd.pending, 2, "2 aguardando");
  await drain(dd, def);
  assert.equal(dd.active, 0, "tudo terminou");
  assert.ok(maxObserved <= 2, `nunca passa de 2 simultâneos (observado ${maxObserved})`);
  ok("respeita cap de concorrência");
}

// 2. Ordem por prioridade (menor primeiro), desempate por created_at crescente
{
  const order = [];
  const def = deferredRun((item) => order.push(item.id));
  const d = createDispatcher({ maxConcurrent: 1, run: def.run });
  d.enqueue({ id: "lote-antigo", priority: 100, created_at: "2026-01-01" });
  d.enqueue({ id: "interativo-novo", priority: 10, created_at: "2026-06-01" });
  d.enqueue({ id: "lote-novo", priority: 100, created_at: "2026-02-01" });
  d.enqueue({ id: "interativo-antigo", priority: 10, created_at: "2026-05-01" });
  await drain(d, def);
  // lote-antigo toma o único slot no instante 0 (fila vazia); o resto sai por prioridade/created_at
  assert.equal(order[0], "lote-antigo", "1º foi o único na fila no instante 0");
  assert.ok(order.indexOf("interativo-antigo") < order.indexOf("interativo-novo"), "interativo antigo antes do novo");
  assert.ok(order.indexOf("interativo-novo") < order.indexOf("lote-novo"), "interativo antes de lote");
  ok("ordena por prioridade e created_at");
}

// 3. Dedup por id
{
  let runs = 0;
  const def = deferredRun(() => runs++);
  const d = createDispatcher({ maxConcurrent: 1, run: def.run });
  assert.equal(d.enqueue({ id: 7, priority: 100 }), true, "1º enqueue aceito");
  assert.equal(d.enqueue({ id: 7, priority: 100 }), false, "2º enqueue (mesmo id) rejeitado");
  await tick();
  assert.equal(runs, 1, "rodou só uma vez");
  await drain(d, def);
  ok("dedup por id");
}

// 4. id ausente é ignorado com segurança
{
  const def = deferredRun();
  const d = createDispatcher({ maxConcurrent: 1, run: def.run });
  assert.equal(d.enqueue(null), false, "null ignorado");
  assert.equal(d.enqueue({ priority: 1 }), false, "sem id ignorado");
  assert.equal(d.active, 0);
  ok("entradas inválidas ignoradas");
}

console.log(`\n${passed} teste(s) passaram ✓`);
