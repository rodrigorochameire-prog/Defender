#!/usr/bin/env node
/**
 * Browser Broker Daemon — processa a lane `browser` da fila claude_code_tasks.
 *
 * Irmão do claude-code-daemon.mjs (lane `ai`). Em vez de rodar `claude -p`, faz
 * spawn dos scrapers Python existentes (PJe / triagem / Solar) — que dirigem o
 * Chromium via CDP + Patchright. Reaproveita a mesma infra de confiabilidade:
 * lock otimista, catch-up, reaper de zumbis, heartbeat, Realtime com reconnect.
 *
 * Fase 1 (este arquivo): consumidor que faz spawn dos scripts. O Chromium é
 * aberto na mão (CDP :9222) ou via perfil persistente do próprio script. A
 * sessão Chromium quente gerenciada pelo daemon é a Fase 2.
 *
 * Ver docs/plans/2026-06-21-daemon-browser-lane-design.md
 *
 * Uso:
 *   node scripts/browser-broker-daemon.mjs
 *   npm run browser-broker
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { selectZombieIds } from '../src/lib/daemon/task-lifecycle.mjs'
import { resolveChromiumBin, BrowserSession } from '../src/lib/daemon/browser-session.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, '..')
const LOG_PREFIX = '[BrowserBroker]'
const LANE = 'browser'
const HEARTBEAT_NAME = 'browser-broker'

// Browser tasks (download de autos 183MB, varredura de dezenas de expedientes)
// levam muito mais que análise IA. Timeout do worker e janela de zumbi maiores.
const WORKER_TIMEOUT_MS = 30 * 60 * 1000 // 30 min — default; cada skill pode sobrescrever
const ZOMBIE_TIMEOUT_MS = 35 * 60 * 1000 // 35 min — folga sobre o maior worker

// --- Env parsing (manual, no dotenv dependency) — espelha o claude daemon ---
function loadEnv() {
  const env = {}
  const lines = readFileSync(resolve(PROJECT_DIR, '.env.local'), 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    // Tolera valor entre aspas E uma sequência de escape literal no fim (\n, \r) —
    // a .env.local deste checkout traz NEXT_PUBLIC_SUPABASE_URL="...co\n", o que
    // corrompia o host e dava "Invalid API key". Sanear aqui evita editar segredos.
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\\[rn]+$/g, '')
      .trim()
    env[key] = val
  }
  return env
}

const ENV = loadEnv()
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${LOG_PREFIX} Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Interpretador Python com Patchright. O scraper de triagem usa
// `from patchright.async_api import ...`, que vive no venv da enrichment-engine.
const VENV_PYTHON = ENV.BROWSER_VENV_PYTHON || resolve(PROJECT_DIR, 'enrichment-engine/.venv/bin/python')

// --- Sessão Chromium quente (Fase 2) ---
// Mantém UM Chromium vivo na porta CDP (:9222 por padrão, que os scrapers
// `--modo cdp` já usam) com perfil persistente — sessão Keycloak não esfria.
// adopt-or-launch: convive com um Chromium aberto na mão. Ver browser-session.mjs.
const HOME = process.env.HOME || ''
const CDP_PORT = Number(ENV.BROWSER_CDP_PORT || process.env.BROWSER_CDP_PORT || 9222)
const PROFILE_DIR = ENV.BROWSER_PROFILE_DIR || process.env.BROWSER_PROFILE_DIR || resolve(HOME || PROJECT_DIR, '.ombuds-browser-profile')
const HEADLESS = (ENV.BROWSER_HEADLESS || process.env.BROWSER_HEADLESS) === 'true'
// Broker interativo: roda skills que exigem login manual (2FA no PJe), ou seja,
// a MÁQUINA DO DEFENSOR, onde ele abre o Chromium e digita senha+código. Brokers
// de servidor (Mac Mini) deixam INTERACTIVE=false (default) e PULAM essas skills,
// dando prioridade determinística à máquina local. Ver pje-intimacoes-import.
const INTERACTIVE = (ENV.BROWSER_INTERACTIVE || process.env.BROWSER_INTERACTIVE) === 'true'
const session = new BrowserSession({
  chromiumBin: resolveChromiumBin(ENV, HOME),
  profileDir: PROFILE_DIR,
  port: CDP_PORT,
  headless: HEADLESS,
  // Ao LANÇAR um Chromium novo, abre já no painel do PJe p/ facilitar o login
  // manual (perfil sem sessão). Adoção de Chromium existente não é afetada.
  initialUrl: ENV.BROWSER_INITIAL_URL || process.env.BROWSER_INITIAL_URL
    || 'https://pje.tjba.jus.br/pje/Painel/painel_usuario/advogado.seam',
  log: (m) => console.log(`${LOG_PREFIX} [browser] ${m}`),
})

// --- Registry: skill → como montar o worker (interpreter + argv + timeout) ---
// Cada `build(meta)` recebe os metadados parseados de instrucao_adicional (JSON)
// e devolve o comando a rodar. Adicionar uma skill = adicionar uma entrada aqui.
const SKILL_REGISTRY = {
  // Varredura de expedientes em triagem. Self-contained: escreve no banco via
  // Supabase REST. Modo CDP anexa a um Chromium logado em :9222 (preferido).
  'varredura-triagem': {
    label: 'Varredura de triagem (PJe)',
    // Exige PJe logado (CDP :9222) — só roda no broker interativo (máquina do
    // defensor). Sem isto, o Mac Mini (servidor) rouba o job e roda sem sessão.
    interactive: true,
    build: (meta) => ({
      interpreter: VENV_PYTHON,
      argv: [
        resolve(PROJECT_DIR, '.claude/skills/varredura-triagem/scripts/varredura_triagem.py'),
        '--modo', meta.modo || 'cdp',
        ...(meta.atribuicao ? ['--atribuicao', String(meta.atribuicao)] : []),
        ...(meta.since ? ['--since', String(meta.since)] : []),
        ...(meta.limit ? ['--limit', String(meta.limit)] : []),
        ...(meta.defensorId ? ['--defensor-id', String(meta.defensorId)] : []),
      ],
      timeoutMs: 30 * 60_000,
    }),
  },

  // Importação de intimações PJe para staging (pje_import_staging).
  // Requer --job-id (id da claude_code_tasks), --atribuicoes CSV e flags opcionais.
  'pje-intimacoes-import': {
    label: 'Importar intimações PJe (staging)',
    // Exige login manual no PJe (Keycloak + 2FA) → só roda em broker interativo
    // (máquina do defensor). Brokers de servidor ignoram sem travar o lock.
    interactive: true,
    build: (meta) => {
      if (!meta.atribuicoes?.length) throw new Error('meta.atribuicoes é obrigatório para pje-intimacoes-import');
      return {
        interpreter: VENV_PYTHON,
        argv: [
          resolve(PROJECT_DIR, '.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py'),
          '--job-id', String(meta.jobId),
          '--atribuicoes', meta.atribuicoes.join(','),
          ...(meta.since  ? ['--since',  String(meta.since)]  : []),
          ...(meta.until  ? ['--until',  String(meta.until)]  : []),
          ...(meta.limit  ? ['--limit',  String(meta.limit)]  : []),
          '--modo', meta.modo || 'cdp',
        ],
        timeoutMs: 30 * 60_000,
      };
    },
  },

  // Smoke test da lane — não abre browser. Prova queue→spawn→result sem credenciais.
  __selftest: {
    label: 'Self-test (sem browser)',
    build: () => ({
      interpreter: 'python3',
      argv: ['-c', 'import json; print(json.dumps({"ok": True, "msg": "browser lane alive"}))'],
      timeoutMs: 30_000,
    }),
  },
}

// Aliases UI-facing → chave do registry (espelha o padrão do claude daemon).
const SKILL_ALIASES = {
  triagem: 'varredura-triagem',
  'pje-triagem': 'varredura-triagem',
}

function resolveSkill(skill) {
  const key = SKILL_ALIASES[skill] || skill
  return { key, entry: SKILL_REGISTRY[key] }
}

// --- Worker em execução (no máximo 1 — processamento serial por lane) ---
let activeChild = null

// --- Spawn do worker Python; resolve com { code, stdout, stderr, timedOut } ---
function runWorker(interpreter, argv, timeoutMs) {
  return new Promise((resolvePromise) => {
    if (!existsSync(interpreter) && interpreter.includes('/')) {
      return resolvePromise({ code: -1, stdout: '', stderr: `Interpreter not found: ${interpreter}`, timedOut: false })
    }
    const child = spawn(interpreter, argv, {
      cwd: PROJECT_DIR,
      maxBuffer: 20 * 1024 * 1024,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    activeChild = child
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const done = (payload) => {
      if (activeChild === child) activeChild = null
      resolvePromise(payload)
    }
    child.stdout.on('data', (c) => { stdout += c.toString() })
    child.stderr.on('data', (c) => { stderr += c.toString() })
    child.on('close', (code) => done({ code, stdout, stderr, timedOut }))
    child.on('error', (err) => {
      // 'timeout' do spawn dispara SIGTERM → close; marcamos para a mensagem de erro.
      if (err.code === 'ETIMEDOUT') timedOut = true
      done({ code: -1, stdout, stderr: err.message, timedOut })
    })
  })
}

// Browser scripts fazem efeito colateral (download/scrape→DB) e logam texto; alguns
// emitem um JSON de resumo no fim. NÃO exigimos JSON: sucesso = exit 0. Se houver
// um objeto JSON no stdout, guardamos como resultado estruturado; senão, um resumo.
function buildResultado(stdout) {
  const tail = stdout.slice(-4000)
  const match = stdout.match(/\{[\s\S]*\}\s*$/)
  if (match) {
    try {
      return { ok: true, parsed: JSON.parse(match[0]), stdoutTail: tail }
    } catch {
      /* não era JSON válido — cai no resumo abaixo */
    }
  }
  return { ok: true, stdoutTail: tail }
}

// --- Processa uma tarefa ---
async function processTask(task) {
  // Lane guard: este daemon só processa a lane 'browser'.
  if (task.lane !== LANE) return

  // Gate de skill interativa (ANTES do lock): skills que exigem login manual só
  // rodam num broker interativo. Um broker não-interativo retorna SEM travar o
  // lock, deixando a tarefa para a máquina do defensor — prioridade local.
  const preSkill = resolveSkill(task.skill)
  if (preSkill.entry?.interactive && !INTERACTIVE) {
    console.log(`${LOG_PREFIX} Task ${task.id} (skill: ${task.skill}) é interativa e este broker não é interativo — ignorando (prioridade p/ a máquina do defensor)`)
    return
  }

  console.log(`${LOG_PREFIX} Processing task ${task.id} (skill: ${task.skill})`)

  // Lock otimista — trava status E lane p/ não competir com o daemon de IA.
  const { data, error: lockErr } = await supabase
    .from('claude_code_tasks')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'pending')
    .eq('lane', LANE)
    .select()

  if (lockErr || !data?.length) {
    console.log(`${LOG_PREFIX} Task ${task.id} already claimed, skipping.`)
    return
  }

  // Resolve a skill no registry
  const { key, entry } = resolveSkill(task.skill)
  if (!entry) {
    await supabase.from('claude_code_tasks').update({
      status: 'failed',
      erro: `Skill '${task.skill}' não registrada na lane browser (registry: ${Object.keys(SKILL_REGISTRY).join(', ')})`,
      etapa: 'Erro',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    console.error(`${LOG_PREFIX} Task ${task.id} skill não registrada: ${task.skill}`)
    return
  }

  // Metadados do worker vêm de instrucao_adicional (JSON) — atribuicao/since/modo/etc.
  let meta = {}
  try { meta = task.instrucao_adicional ? JSON.parse(task.instrucao_adicional) : {} } catch { /* sem metadata */ }

  let cmd
  try {
    cmd = entry.build({ ...meta, jobId: task.id })
  } catch (err) {
    await supabase.from('claude_code_tasks').update({
      status: 'failed',
      erro: `Falha ao montar comando da skill '${key}': ${err.message}`,
      etapa: 'Erro',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    console.error(`${LOG_PREFIX} Task ${task.id} build falhou: ${err.message}`)
    return
  }

  const setEtapa = (etapa) =>
    supabase.from('claude_code_tasks').update({ etapa }).eq('id', task.id).then(({ error }) => {
      if (error) console.warn(`${LOG_PREFIX} Task ${task.id} etapa update falhou: ${error.message}`)
    })

  await setEtapa(`Executando ${entry.label}...`)
  console.log(`${LOG_PREFIX} Task ${task.id} → ${cmd.interpreter} ${cmd.argv.join(' ')}`)

  const result = await runWorker(cmd.interpreter, cmd.argv, cmd.timeoutMs ?? WORKER_TIMEOUT_MS)

  if (result.code !== 0) {
    const why = result.timedOut ? 'Timeout do worker' : `Worker exited with code ${result.code}`
    const errorMsg = `${why}\n${(result.stderr || result.stdout || '').slice(-1900)}`
    await supabase.from('claude_code_tasks').update({
      status: 'failed',
      erro: errorMsg.slice(0, 2000),
      etapa: 'Erro',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    console.error(`${LOG_PREFIX} Task ${task.id} failed: ${why}`)
    return
  }

  await supabase.from('claude_code_tasks').update({
    status: 'completed',
    resultado: buildResultado(result.stdout),
    etapa: 'Concluído',
    completed_at: new Date().toISOString(),
  }).eq('id', task.id)
  console.log(`${LOG_PREFIX} Task ${task.id} completed.`)
}

// --- Catch-up: processa todos os pendentes da lane browser (safety net) ---
let catchUpRunning = false
async function catchUp(reason = 'manual') {
  if (catchUpRunning) return
  catchUpRunning = true
  try {
    const { data: tasks, error } = await supabase
      .from('claude_code_tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('lane', LANE)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`${LOG_PREFIX} Catch-up query failed:`, error.message)
      return
    }
    if (tasks.length > 0) {
      console.log(`${LOG_PREFIX} Catch-up (${reason}): found ${tasks.length} pending browser task(s).`)
    }
    for (const task of tasks) {
      await processTask(task)
    }
  } finally {
    catchUpRunning = false
  }
}

// --- Reaper: recupera zumbis da lane browser (timeout estendido) ---
async function reapZombies(reason = 'periodic') {
  const { data: tasks, error } = await supabase
    .from('claude_code_tasks')
    .select('id, status, started_at, created_at')
    .eq('status', 'processing')
    .eq('lane', LANE)

  if (error) {
    console.error(`${LOG_PREFIX} Reaper query failed:`, error.message)
    return
  }

  const rows = (tasks ?? []).map((t) => ({
    id: t.id, status: t.status, startedAt: t.started_at, createdAt: t.created_at,
  }))
  const zombieIds = selectZombieIds(rows, Date.now(), ZOMBIE_TIMEOUT_MS)
  if (zombieIds.length === 0) return

  console.warn(`${LOG_PREFIX} Reaper (${reason}): recuperando ${zombieIds.length} tarefa(s) zumbi: ${zombieIds.join(', ')}`)
  const { error: updErr } = await supabase
    .from('claude_code_tasks')
    .update({
      status: 'failed',
      erro: `Timeout — tarefa zumbi recuperada (>${Math.round(ZOMBIE_TIMEOUT_MS / 60000)}min em processing)`,
      etapa: 'Recuperado',
      completed_at: new Date().toISOString(),
    })
    .in('id', zombieIds)
  if (updErr) console.error(`${LOG_PREFIX} Reaper update failed:`, updErr.message)
}

// --- Realtime (auto-reconnect com backoff) — espelha o claude daemon ---
let channel = null
let reconnectTimer = null
let reconnectAttempts = 0
let shuttingDown = false

function scheduleReconnect(reason) {
  if (shuttingDown || reconnectTimer) return
  reconnectAttempts++
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempts, 5))
  console.warn(`${LOG_PREFIX} Realtime caiu (${reason}); reconectando em ${delay / 1000}s (tentativa ${reconnectAttempts})`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    subscribe()
  }, delay)
}

function subscribe() {
  if (channel) {
    try { supabase.removeChannel(channel) } catch {}
    channel = null
  }
  channel = supabase
    .channel('browser-broker-tasks')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'claude_code_tasks' }, (payload) => {
      if (payload.new.lane !== LANE) return // ignora lane 'ai'
      console.log(`${LOG_PREFIX} New browser task received: ${payload.new.id}`)
      processTask(payload.new)
    })
    .subscribe(async (status) => {
      console.log(`${LOG_PREFIX} Realtime status: ${status}`)
      if (status === 'SUBSCRIBED') {
        reconnectAttempts = 0
        await catchUp('subscribed')
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        scheduleReconnect(status)
      }
    })
  return channel
}

// --- Startup ---
console.log(`${LOG_PREFIX} Starting browser broker...`)
console.log(`${LOG_PREFIX} Project: ${PROJECT_DIR}`)
console.log(`${LOG_PREFIX} Python: ${VENV_PYTHON}${existsSync(VENV_PYTHON) ? '' : ' (NÃO ENCONTRADO — só __selftest funcionará)'}`)
console.log(`${LOG_PREFIX} Skills: ${Object.keys(SKILL_REGISTRY).join(', ')}`)
console.log(`${LOG_PREFIX} CDP port: ${CDP_PORT} | profile: ${PROFILE_DIR} | headless: ${HEADLESS}`)
console.log(`${LOG_PREFIX} Interativo: ${INTERACTIVE ? 'SIM (roda skills de login manual, ex. pje-intimacoes-import)' : 'não (pula skills interativas — máquina de servidor)'}`)

await reapZombies('startup')
await session.start()
subscribe()

// --- Heartbeat (separado do claude daemon) ---
async function sendHeartbeat() {
  const { error } = await supabase
    .from('system_heartbeat')
    .upsert(
      {
        name: HEARTBEAT_NAME,
        last_seen: new Date().toISOString(),
        metadata: {
          pid: process.pid,
          node: process.version,
          lane: LANE,
          skills: Object.keys(SKILL_REGISTRY).length,
          browser: session.state, // { up, adopted, managed, port } — p/ o dashboard
        },
      },
      { onConflict: 'name' },
    )
  if (error) console.warn(`${LOG_PREFIX} heartbeat failed: ${error.message}`)
}
await sendHeartbeat()
const heartbeatInterval = setInterval(sendHeartbeat, 30_000)

const catchUpInterval = setInterval(() => catchUp('poll'), 60_000)
const reaperInterval = setInterval(() => reapZombies('periodic'), 5 * 60_000)

// --- Health loop do Chromium: probe CDP a cada 30s; relança se o gerenciado caiu ---
await session.refreshHealth()
const healthInterval = setInterval(() => session.refreshHealth(), 30_000)

// --- Graceful shutdown ---
function shutdown() {
  console.log(`${LOG_PREFIX} Shutting down...`)
  shuttingDown = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  clearInterval(heartbeatInterval)
  clearInterval(catchUpInterval)
  clearInterval(reaperInterval)
  clearInterval(healthInterval)
  session.stop() // mata só o Chromium que NÓS lançamos (não derruba um adotado)
  if (activeChild) {
    try { activeChild.kill('SIGTERM') } catch {}
    activeChild = null
  }
  if (channel) supabase.removeChannel(channel)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
