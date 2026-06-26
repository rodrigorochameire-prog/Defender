#!/usr/bin/env node
/**
 * Drip-feed controller para análises órfãs (skill `analise-autos`).
 *
 * POR QUE EXISTE
 * --------------
 * O daemon (claude-code-daemon.mjs) REIVINDICA todas as tasks pending que vê
 * (status→processing) na hora, via Realtime, mas só executa MAX_CONCURRENCY=2
 * `claude` por vez. As demais ficam "processing" PARADAS na fila esperando slot.
 * O detector de zumbis (task-lifecycle.mjs, ZOMBIE_TIMEOUT_MS=35min) marca como
 * falha tudo que está "processing" há >35min — inclusive o que só estava na fila.
 *
 * Resultado de enfileirar muitas de uma vez (ex.: 77): as que esperam >35min por
 * um slot são mortas como falso-zumbi. Numa execução real, 75/77 morreram assim.
 *
 * SOLUÇÃO
 * -------
 * Manter no MÁXIMO TARGET tasks em voo (pending+processing). Com TARGET = nº de
 * slots (2), nenhuma fica parada na fila: cada uma só está "processing" enquanto
 * REALMENTE roda (~18–30min < 35min). Conforme completam, reabastecemos.
 *
 * USO
 * ---
 *   node scripts/drip-analise-orfaos.mjs                 # dry-run (NÃO enfileira; só mostra o plano)
 *   node scripts/drip-analise-orfaos.mjs --go            # roda o drip de verdade (prioritários)
 *   node scripts/drip-analise-orfaos.mjs --go --all      # todos os órfãos (não só prioritários)
 *   node scripts/drip-analise-orfaos.mjs --go --target 3 # mantém 3 em voo (cuidado: >slots = fila)
 *   node scripts/drip-analise-orfaos.mjs --go --interval 120
 *
 * Flags:
 *   --go            executa (sem isso, é dry-run: não insere nada)
 *   --all           escopo "todos os órfãos" (default: prioritários preso/audiência ≤30d)
 *   --target N      máximo em voo (default 2 = MAX_CONCURRENCY; >2 reintroduz risco de zumbi)
 *   --interval S    segundos entre verificações (default 180)
 *   --max-rounds N  teto de rodadas de segurança (default 600 ≈ 30h a 180s)
 *
 * SEGURO: o daemon não é tocado. Este controlador só decide QUANTAS tasks deixar
 * visíveis por vez, reusando scripts/enqueue-analise-orfaos.mjs (que já deduplica
 * por assistido com task pending/processing).
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, "..");
const ENQUEUE = join(PROJECT_DIR, "scripts", "enqueue-analise-orfaos.mjs");

// --- args ---
const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const val = (f, d) => {
  const i = ARGS.indexOf(f);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : d;
};
const GO = has("--go");
const ALL = has("--all");
const TARGET = Math.max(1, parseInt(val("--target", "2"), 10) || 2);
const INTERVAL = Math.max(30, parseInt(val("--interval", "180"), 10) || 180) * 1000;
const MAX_ROUNDS = Math.max(1, parseInt(val("--max-rounds", "600"), 10) || 600);
const SCOPE = ALL ? ["--all"] : ["--priority"];

// --- env ---
function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(PROJECT_DIR, ".env.local"), "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}
const ENV = loadEnv();
const sb = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// nº de analise-autos em voo (pending + processing)
async function inFlight() {
  const { data, error } = await sb
    .from("claude_code_tasks")
    .select("status")
    .eq("skill", "analise-autos")
    .in("status", ["pending", "processing"]);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []).length;
}

// nº elegíveis (via enqueue --dry), exclui quem já tem task pending/processing
function eligibleCount() {
  try {
    const out = execFileSync("node", [ENQUEUE, "--dry", ...SCOPE], {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
    });
    const m = out.match(/Elegíveis[^:]*:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch (e) {
    log(`⚠ enqueue --dry falhou: ${e.message.split("\n")[0]}`);
    return 0;
  }
}

// enfileira até `n` (top-up)
function enqueue(n) {
  if (n <= 0) return 0;
  const out = execFileSync("node", [ENQUEUE, ...SCOPE, "--limit", String(n)], {
    cwd: PROJECT_DIR,
    encoding: "utf-8",
  });
  const m = out.match(/(\d+)\s+task/);
  return m ? parseInt(m[1], 10) : 0;
}

async function main() {
  log(`Drip-feed analise-autos · escopo=${ALL ? "todos" : "prioritários"} · target=${TARGET} em voo · intervalo=${INTERVAL / 1000}s · modo=${GO ? "EXECUÇÃO" : "DRY-RUN"}`);

  const flight0 = await inFlight();
  const elig0 = eligibleCount();
  log(`estado inicial: ${flight0} em voo · ${elig0} elegíveis`);

  if (!GO) {
    const firstWave = Math.max(0, TARGET - flight0);
    log(`DRY-RUN: enfileiraria ${Math.min(firstWave, elig0)} agora e iria reabastecendo até zerar os ${elig0} elegíveis.`);
    log(`Para executar de verdade: node scripts/drip-analise-orfaos.mjs --go${ALL ? " --all" : ""}`);
    return;
  }

  let totalEnqueued = 0;
  let stagnantRounds = 0;
  let lastFlight = -1;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const flight = await inFlight();
    const elig = eligibleCount();

    // condição de término: nada em voo e nada elegível
    if (flight === 0 && elig === 0) {
      log(`✅ CONCLUÍDO — fila vazia e sem elegíveis. Total enfileirado nesta sessão: ${totalEnqueued}.`);
      return;
    }

    // top-up: completa até TARGET, limitado ao que há de elegível
    const room = TARGET - flight;
    if (room > 0 && elig > 0) {
      const n = Math.min(room, elig);
      const got = enqueue(n);
      totalEnqueued += got;
      log(`em voo=${flight} elegíveis=${elig} → +${got} (total ${totalEnqueued})`);
    } else {
      log(`em voo=${flight} elegíveis=${elig} → aguardando slot livre`);
    }

    // detector de estagnação: in-flight cheio e sem mudança por muitas rodadas
    if (flight === lastFlight && flight >= TARGET) {
      stagnantRounds++;
      if (stagnantRounds * (INTERVAL / 60000) >= 50) {
        log(`⚠ ESTAGNADO: ${flight} em voo sem progresso há ~${Math.round((stagnantRounds * INTERVAL) / 60000)}min. Possível slot preso (claude órfão?) ou Max throttle. Verifique o daemon.`);
        stagnantRounds = 0; // reseta o aviso p/ não spammar
      }
    } else {
      stagnantRounds = 0;
    }
    lastFlight = flight;

    await new Promise((r) => setTimeout(r, INTERVAL));
  }
  log(`⏹ atingiu MAX_ROUNDS (${MAX_ROUNDS}). Total enfileirado: ${totalEnqueued}. Rode de novo p/ continuar.`);
}

main().catch((e) => {
  console.error(`drip-feed erro: ${e.message}`);
  process.exit(1);
});
