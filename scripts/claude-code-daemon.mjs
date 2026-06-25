#!/usr/bin/env node
/**
 * Claude Code Daemon — Processa tarefas via Supabase Realtime no Mac Mini.
 *
 * Fluxo:
 *   1. Escuta INSERT em claude_code_tasks via Realtime
 *   2. Lock otimista (UPDATE WHERE status='pending')
 *   3. Roda claude -p com skill + prompt
 *   4. Atualiza etapa periodicamente
 *   5. Salva resultado (JSON) ou erro no banco
 *
 * Uso:
 *   node scripts/claude-code-daemon.mjs
 *   npm run daemon
 */

import { createClient } from '@supabase/supabase-js'
import { execSync, spawn } from 'child_process'
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { selectZombieIds, ZOMBIE_TIMEOUT_MS } from '../src/lib/daemon/task-lifecycle.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_DIR = resolve(__dirname, '..')
const LOG_PREFIX = '[ClaudeCodeDaemon]'

// --- Env parsing (manual, no dotenv dependency) ---
function loadEnv() {
  const env = {}
  const lines = readFileSync(resolve(PROJECT_DIR, '.env.local'), 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
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

// --- Claude CLI resolution ---
let CLAUDE_BIN
try {
  CLAUDE_BIN = execSync('which claude', { encoding: 'utf-8' }).trim()
  console.log(`${LOG_PREFIX} Claude CLI found: ${CLAUDE_BIN}`)
} catch {
  console.error(`${LOG_PREFIX} Claude CLI not found. Install it first.`)
  process.exit(1)
}

// --- Supabase client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- FIREWALL DE CUSTO (conta Max, NUNCA API paga) ---
// O OMBUDS deve usar EXCLUSIVAMENTE a assinatura Max via `claude -p` (login
// claude.ai), que não bilheta por token. Se `ANTHROPIC_API_KEY` (ou chaves de
// Gemini/OpenAI) estiverem no ambiente, o `claude` as usa com PRECEDÊNCIA sobre
// o login Max — e passa a COBRAR a API. Isso foi a causa de cobrança real.
// Removemos essas chaves do ambiente do processo-filho para garantir, por
// construção, que `claude -p` só autentique pela conta Max.
const PAID_API_KEYS = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN',
  'GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
]

function buildMaxOnlyEnv() {
  const e = { ...process.env }
  for (const k of PAID_API_KEYS) delete e[k]
  // ANTI FORK-BOMB: o daemon roda com OMBUDS_ROLE=daemon e spawna `claude -p` no
  // PROJECT_DIR, onde o SessionStart hook (.claude/settings.json) dispara
  // m4-bootstrap. Em modo daemon o bootstrap faria `claude -p "responda apenas: OK"`,
  // que reabre sessão → re-dispara o hook → recursão infinita. Esta marca diz ao
  // m4-bootstrap p/ NÃO rodar o probe nos filhos de tarefa. Ver verifyMaxAuth().
  e.OMBUDS_NO_BOOTSTRAP = '1'
  return e
}

// Ambiente saneado usado em TODO spawn de `claude` (sem chaves pagas).
const CHILD_ENV = buildMaxOnlyEnv()

// Timeout por tarefa. A análise de autos completos (ler PDFs + gerar relatório)
// frequentemente passa de 10min — o default antigo (600s) matava o `claude -p`
// com SIGTERM (exit 143) na última etapa. 30min cobre o caso real; configurável.
const TASK_TIMEOUT_MS = Number(ENV.DAEMON_TASK_TIMEOUT_MS || process.env.DAEMON_TASK_TIMEOUT_MS || 1_800_000)

// Fail-closed contra cobrança: avisa (e, em modo estrito, recusa iniciar) se
// houver chave paga no ambiente. As chaves são sempre removidas do filho — o
// aviso existe para você limpá-las na raiz (.env/shell).
const LEAKED_KEYS = PAID_API_KEYS.filter((k) => process.env[k])
if (LEAKED_KEYS.length > 0) {
  console.warn(
    `${LOG_PREFIX} ⚠ Chaves de API paga presentes no ambiente: ${LEAKED_KEYS.join(', ')}. ` +
    `Foram REMOVIDAS do claude -p (forçando a conta Max, sem custo). ` +
    `Remova-as do .env/shell para eliminar o risco na raiz.`,
  )
  if (ENV.DAEMON_STRICT_NO_API === 'true' || process.env.DAEMON_STRICT_NO_API === 'true') {
    console.error(`${LOG_PREFIX} DAEMON_STRICT_NO_API=true e há chave paga no ambiente — abortando.`)
    process.exit(1)
  }
} else {
  console.log(`${LOG_PREFIX} ✓ Firewall de custo ativo — claude -p usará a conta Max (sem API paga).`)
}

// --- Skill aliases: UI-facing skill names → directory in .claude/skills-cowork/ ---
// Loaded from SKILL_ALIASES.json (versioned) with fallback to hardcoded defaults.
// Any skill name not in the map is tried directly as a directory name.
const SKILLS_ROOT = resolve(PROJECT_DIR, '.claude/skills-cowork')
const ALIASES_FILE = resolve(SKILLS_ROOT, 'SKILL_ALIASES.json')

function loadSkillAliases() {
  const fallback = {
    'analise-autos': 'analise-audiencias',
    'preparar-audiencia': 'analise-audiencias',
    'gerar-peca': 'dpe-ba-pecas',
    'analise-juri': 'juri',
    'feedback-estagiario': 'analise-audiencias',
  }
  if (!existsSync(ALIASES_FILE)) return fallback
  try {
    return { ...fallback, ...JSON.parse(readFileSync(ALIASES_FILE, 'utf-8')) }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to parse SKILL_ALIASES.json, using fallback: ${err.message}`)
    return fallback
  }
}

const SKILL_ALIASES = loadSkillAliases()

// --- System prompt builder: SKILL.md + references/*.md concatenated ---
// Previously the daemon only passed SKILL.md, ignoring the references/ folder that
// holds the bulk of the domain knowledge (juri: 12 refs, vvd: 13 refs, etc.). Now
// we concatenate everything into a temp file and pass it via --system-prompt-file.
const TEMP_DIR = join(tmpdir(), 'ombuds-daemon')
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true })

function buildSystemPromptFile(skillDir, taskId) {
  const dir = resolve(SKILLS_ROOT, skillDir)
  const skillFile = join(dir, 'SKILL.md')
  if (!existsSync(skillFile)) {
    throw new Error(`SKILL.md not found for skill '${skillDir}' at ${skillFile}`)
  }

  const parts = [readFileSync(skillFile, 'utf-8')]

  const refsDir = join(dir, 'references')
  if (existsSync(refsDir) && statSync(refsDir).isDirectory()) {
    const refFiles = readdirSync(refsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
    for (const f of refFiles) {
      const refContent = readFileSync(join(refsDir, f), 'utf-8')
      parts.push(`\n\n---\n\n## Reference: ${f.replace(/\.md$/, '')}\n\n${refContent}`)
    }
    if (refFiles.length) {
      console.log(`${LOG_PREFIX} Skill '${skillDir}' loaded with ${refFiles.length} reference file(s).`)
    }
  }

  const tmpFile = join(TEMP_DIR, `skill-${skillDir}-task${taskId}.md`)
  writeFileSync(tmpFile, parts.join(''), 'utf-8')
  return tmpFile
}

const ETAPAS = [
  'Processando...',
  'Analisando documentos...',
  'Identificando teses...',
  'Gerando relatório...',
]

// --- Parse result: JSON.parse, then regex extraction fallback ---
function tryParseResult(stdout) {
  try {
    return { ok: true, value: JSON.parse(stdout) }
  } catch {
    const match = stdout.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return { ok: true, value: JSON.parse(match[0]) }
      } catch (err) {
        return { ok: false, error: `JSON.parse(match) failed: ${err.message}` }
      }
    }
    return { ok: false, error: 'No JSON object found in stdout' }
  }
}

// --- Limitador de concorrência ---
// O processamento era estritamente serial (1 `claude -p` por vez), então um backlog
// de N tarefas levava ~N × (tempo de cada análise Opus). Agora processamos até
// DAEMON_CONCURRENCY em paralelo. O lock otimista em processTask já garante que a
// mesma task não seja processada duas vezes; o semáforo abaixo é o teto GLOBAL de
// processos `claude` simultâneos (cobre tanto o catch-up quanto o caminho Realtime).
// Default conservador (2) p/ respeitar os limites da assinatura Max.
const MAX_CONCURRENCY = Math.max(
  1,
  parseInt(ENV.DAEMON_CONCURRENCY || process.env.DAEMON_CONCURRENCY || '2', 10) || 2,
)
let runningSlots = 0
const slotWaiters = []
function acquireSlot() {
  if (runningSlots < MAX_CONCURRENCY) {
    runningSlots++
    return Promise.resolve()
  }
  return new Promise((res) => slotWaiters.push(res))
}
function releaseSlot() {
  const next = slotWaiters.shift()
  if (next) next() // transfere o slot ao próximo (mantém o teto, não decrementa)
  else runningSlots--
}

// Children `claude` em execução. Rastreados para serem mortos no shutdown, evitando
// processos órfãos após SIGTERM/SIGINT. Antes era um único `activeChild`, o que sob
// concorrência (ou rajada de INSERTs do Realtime) só matava o último.
const activeChildren = new Set()

// --- Spawn claude -p and return { code, stdout, stderr } ---
async function runClaude(skillPath, prompt) {
  await acquireSlot()
  try {
    return await new Promise((resolvePromise) => {
      // bypassPermissions: worker headless precisa rodar Bash autônomo (rclone,
      // ffmpeg, whisper-cli, node) sem diálogo de aprovação. 'auto'/'acceptEdits'
      // bloqueiam Bash e a skill de transcrição (entre outras) nunca conclui.
      // --strict-mcp-config: nenhuma skill do daemon usa ferramentas MCP (mcp__),
      //   então NÃO subimos os servidores supabase/jira de .claude/mcp.json a cada
      //   invocação — corta o cold-start de conectar 2 MCPs por tarefa.
      // --exclude-dynamic-system-prompt-sections: tira as seções voláteis (cwd, env,
      //   git status) do system prompt → prefixo estável → melhor cache de prompt
      //   entre invocações da mesma skill (TTL ~5 min no servidor da Anthropic).
      const args = [
        '-p',
        '--system-prompt-file', skillPath,
        '--strict-mcp-config',
        '--exclude-dynamic-system-prompt-sections',
        '--permission-mode', 'bypassPermissions',
        prompt,
      ]
      const child = spawn(CLAUDE_BIN, args, {
        cwd: PROJECT_DIR,
        env: CHILD_ENV, // sem chaves pagas → claude usa a conta Max
        maxBuffer: 10 * 1024 * 1024,
        timeout: TASK_TIMEOUT_MS, // #265: 30min cobre análise de autos completos
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      activeChildren.add(child)
      let stdout = ''
      let stderr = ''
      const done = (payload) => {
        activeChildren.delete(child)
        resolvePromise(payload)
      }
      child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('close', (code) => done({ code, stdout, stderr }))
      child.on('error', (err) => done({ code: -1, stdout: '', stderr: err.message }))
    })
  } finally {
    releaseSlot()
  }
}

// --- Ingestão de classificação (#4): skill classify-document ---
// Ao concluir, manda as seções p/ o app salvar (assinatura Max, sem API metered).
// fileId/startPage/endPage vêm em instrucao_adicional (JSON) — metadados de sistema,
// que NÃO são anexados ao prompt p/ essa skill (ver basePrompt abaixo).
const INGEST_URL = ENV.CLASSIFICATION_INGEST_URL
const INGEST_SECRET = ENV.CLASSIFICATION_INGEST_SECRET

async function ingestClassification(task, resultado) {
  if (!INGEST_URL || !INGEST_SECRET) {
    console.warn(`${LOG_PREFIX} classify ingest: CLASSIFICATION_INGEST_URL/SECRET ausentes — pulando POST (task ${task.id})`)
    return
  }
  let meta = {}
  try { meta = task.instrucao_adicional ? JSON.parse(task.instrucao_adicional) : {} } catch { /* sem metadata */ }
  const sections = resultado?.sections ?? resultado
  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ingest-secret': INGEST_SECRET },
      body: JSON.stringify({ fileId: meta.fileId, startPage: meta.startPage, endPage: meta.endPage, sections }),
    })
    const txt = await res.text()
    console.log(`${LOG_PREFIX} classify ingest task ${task.id}: ${res.status} ${txt.slice(0, 160)}`)
  } catch (err) {
    console.error(`${LOG_PREFIX} classify ingest task ${task.id} POST falhou: ${err.message}`)
  }
}

// --- Process a single task ---
async function processTask(task) {
  // Lane guard: este daemon só processa a lane 'ai'. Tarefas 'browser' são do
  // browser-broker (ver docs/plans/2026-06-21-daemon-browser-lane-design.md).
  // `lane` tem default 'ai' NOT NULL, então tarefas legadas/sem-lane caem aqui.
  if (task.lane && task.lane !== 'ai') {
    return
  }

  console.log(`${LOG_PREFIX} Processing task ${task.id} (skill: ${task.skill})`)

  // Optimistic lock (também trava a lane p/ não competir com o broker)
  const { data, error: lockErr } = await supabase
    .from('claude_code_tasks')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'pending')
    .eq('lane', 'ai')
    .select()

  if (lockErr || !data?.length) {
    console.log(`${LOG_PREFIX} Task ${task.id} already claimed, skipping.`)
    return
  }

  // Resolve skill path (SKILL.md + references/ concatenated into temp file)
  const skillDir = SKILL_ALIASES[task.skill] || task.skill
  let skillPath
  try {
    skillPath = buildSystemPromptFile(skillDir, task.id)
  } catch (err) {
    await supabase.from('claude_code_tasks').update({
      status: 'failed',
      erro: `Skill resolution failed: ${err.message}`,
      etapa: 'Erro',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    console.error(`${LOG_PREFIX} Task ${task.id} skill resolution failed: ${err.message}`)
    return
  }

  // Build prompt. Para classify-document, instrucao_adicional carrega metadados de
  // sistema (fileId/páginas) — NÃO é instrução p/ o modelo, então não anexa.
  const isClassify = task.skill === 'classify-document'
  const basePrompt = (task.instrucao_adicional && !isClassify)
    ? `${task.prompt}\n\nInstrução adicional: ${task.instrucao_adicional}`
    : task.prompt

  // Periodic etapa updates every 30s — refreshed per run (shared across attempts).
  // Erros aqui são não-fatais (só afetam o texto de progresso na UI), mas antes
  // falhavam em silêncio — agora são logados para não mascarar quebra do Realtime.
  const updateEtapa = async (etapa) => {
    const { error } = await supabase.from('claude_code_tasks').update({ etapa }).eq('id', task.id)
    if (error) console.warn(`${LOG_PREFIX} Task ${task.id} etapa update falhou: ${error.message}`)
  }
  let etapaIdx = 0
  await updateEtapa('Iniciando análise...')
  const etapaInterval = setInterval(() => {
    etapaIdx = Math.min(etapaIdx + 1, ETAPAS.length - 1)
    updateEtapa(ETAPAS[etapaIdx])
  }, 30_000)

  try {
    // --- Attempt 1 ---
    let result = await runClaude(skillPath, basePrompt)

    if (result.code !== 0) {
      // stderr costuma estar vazio em falha do `claude -p` — anexa a cauda do
      // stdout para o erro deixar de ser um "exit 1" cego e mostrar a causa real.
      const errorMsg =
        (result.stderr && result.stderr.trim()) ||
        (result.stdout && result.stdout.trim().slice(-1500)) ||
        `Process exited with code ${result.code}`
      await supabase.from('claude_code_tasks').update({
        status: 'failed',
        erro: errorMsg.slice(0, 2000),
        etapa: 'Erro',
        completed_at: new Date().toISOString(),
      }).eq('id', task.id)
      console.error(`${LOG_PREFIX} Task ${task.id} failed: ${errorMsg.slice(0, 200)}`)
      return
    }

    let parsed = tryParseResult(result.stdout)

    // --- Attempt 2: retry once if JSON parse failed ---
    // The daemon used to mark this as `needs_review` and move on. Retrying with an
    // explicit corrective prompt rescues ~most cases where the model wrapped the
    // JSON in prose or added a preamble.
    if (!parsed.ok) {
      console.warn(`${LOG_PREFIX} Task ${task.id} attempt 1 failed to parse: ${parsed.error}. Retrying...`)
      await updateEtapa('Retry — corrigindo JSON...')

      const retryPrompt = `${basePrompt}

---
IMPORTANTE — RETRY: A resposta anterior não pôde ser parseada como JSON (${parsed.error}).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem blocos \`\`\`json, sem texto antes ou depois, sem comentários.
A primeira caractere da resposta deve ser { e o último deve ser }.`

      result = await runClaude(skillPath, retryPrompt)

      if (result.code !== 0) {
        const errorMsg =
          (result.stderr && result.stderr.trim()) ||
          (result.stdout && result.stdout.trim().slice(-1500)) ||
          `Retry exited with code ${result.code}`
        await supabase.from('claude_code_tasks').update({
          status: 'failed',
          erro: `Retry failed: ${errorMsg.slice(0, 1900)}`,
          etapa: 'Erro',
          completed_at: new Date().toISOString(),
        }).eq('id', task.id)
        console.error(`${LOG_PREFIX} Task ${task.id} retry failed: ${errorMsg.slice(0, 200)}`)
        return
      }

      parsed = tryParseResult(result.stdout)
    }

    // --- Persist final state ---
    await supabase.from('claude_code_tasks').update({
      status: parsed.ok ? 'completed' : 'needs_review',
      resultado: parsed.ok ? parsed.value : { raw: result.stdout, parseError: parsed.error },
      etapa: parsed.ok ? 'Concluído' : 'Revisão manual',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)

    console.log(
      `${LOG_PREFIX} Task ${task.id} ${parsed.ok ? 'completed' : 'needs_review (both attempts failed to parse)'}.`,
    )

    // #4: ingestão das seções classificadas (skill-gated, não-bloqueante)
    if (isClassify && parsed.ok) {
      await ingestClassification(task, parsed.value)
    }
  } finally {
    clearInterval(etapaInterval)
  }
}

// --- Catch-up: process all pending tasks ---
// Guarda contra execuções sobrepostas (o poll periódico pode disparar enquanto
// o catch-up do SUBSCRIBED ainda roda). O lock otimista em processTask já evita
// processar a mesma task duas vezes; isto só evita varreduras concorrentes.
let catchUpRunning = false
async function catchUp(reason = 'manual') {
  if (catchUpRunning) return
  catchUpRunning = true
  try {
    const { data: tasks, error } = await supabase
      .from('claude_code_tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('lane', 'ai')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`${LOG_PREFIX} Catch-up query failed:`, error.message)
      return
    }

    if (tasks.length > 0) {
      console.log(`${LOG_PREFIX} Catch-up (${reason}): found ${tasks.length} pending task(s). Concorrência: ${MAX_CONCURRENCY}.`)
    }
    // Pool limitado: até MAX_CONCURRENCY tarefas em voo. Antes era serial (for await),
    // o que tornava um backlog ~N× mais lento que o necessário. O semáforo em
    // runClaude é o teto global real; este pool evita disparar todos os processTask
    // (e seus temp-files / intervals de etapa) de uma vez.
    let cursor = 0
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENCY, tasks.length) },
      async () => {
        while (cursor < tasks.length) {
          const task = tasks[cursor++]
          await processTask(task)
        }
      },
    )
    await Promise.all(workers)
  } finally {
    catchUpRunning = false
  }
}

// --- Reaper: recupera tarefas zumbi (presas em 'processing') ---
// Se o daemon morre/reinicia ou o CLI estoura o timeout, a tarefa fica em
// 'processing' para sempre — travando o assistido no dedup e poluindo a fila.
// Marca como 'failed' tudo que passou de ZOMBIE_TIMEOUT_MS. Roda no startup
// (recupera de crash/reboot) e periodicamente. Ver docs/specs/daemon-reliability.md.
async function reapZombies(reason = 'periodic') {
  const { data: tasks, error } = await supabase
    .from('claude_code_tasks')
    .select('id, status, started_at, created_at')
    .eq('status', 'processing')
    .eq('lane', 'ai')

  if (error) {
    console.error(`${LOG_PREFIX} Reaper query failed:`, error.message)
    return
  }

  const rows = (tasks ?? []).map((t) => ({
    id: t.id,
    status: t.status,
    startedAt: t.started_at,
    createdAt: t.created_at,
  }))
  const zombieIds = selectZombieIds(rows, Date.now())
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

// --- Realtime subscription (auto-reconnect) ---
// O cliente supabase-js às vezes deixa o canal em CLOSED/TIMED_OUT após um blip
// de rede e NÃO se reinscreve sozinho. Sem isto o processo fica vivo mas surdo
// (e o KeepAlive do launchd não ajuda, pois o processo não morre). Recriamos o
// canal com backoff exponencial e rodamos catch-up ao voltar.
let channel = null
let reconnectTimer = null
let reconnectAttempts = 0
let shuttingDown = false

function scheduleReconnect(reason) {
  if (shuttingDown || reconnectTimer) return // já agendado / encerrando
  reconnectAttempts++
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(reconnectAttempts, 5)) // 2s→30s cap
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
    .channel('claude-code-tasks')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'claude_code_tasks' }, (payload) => {
      // Ignora tarefas de outra lane no caminho rápido (o guard em processTask
      // também cobre, mas isto evita log/ruído p/ tarefas do browser-broker).
      if (payload.new.lane && payload.new.lane !== 'ai') return
      console.log(`${LOG_PREFIX} New task received: ${payload.new.id}`)
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
console.log(`${LOG_PREFIX} Starting daemon...`)
console.log(`${LOG_PREFIX} Project: ${PROJECT_DIR}`)
console.log(`${LOG_PREFIX} Supabase: ${SUPABASE_URL}`)
console.log(`${LOG_PREFIX} Skills root: ${SKILLS_ROOT}`)
console.log(`${LOG_PREFIX} Loaded ${Object.keys(SKILL_ALIASES).length} skill alias(es)`)

// Sync skills from git before processing (multi-Mac source-of-truth is the repo).
// Non-fatal: if git fails (offline, conflicts), daemon still starts with local state.
try {
  const gitOut = execSync('git pull --ff-only', {
    cwd: PROJECT_DIR,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  console.log(`${LOG_PREFIX} git pull: ${gitOut.trim() || 'up to date'}`)
} catch (err) {
  console.warn(`${LOG_PREFIX} git pull failed (non-fatal): ${err.message.split('\n')[0]}`)
}

// Recupera tarefas zumbi deixadas por uma execução anterior (crash/reboot/timeout)
// antes de abrir a inscrição — assim o catch-up já encontra a fila limpa.
await reapZombies('startup')

subscribe()

// --- Heartbeat: upsert into system_heartbeat every 30s ---
// Allows the /admin/daemon page to show liveness (🟢 ativo / 🔴 parado há Xs).
const HEARTBEAT_NAME = 'claude-code-daemon'
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
          skills: Object.keys(SKILL_ALIASES).length,
        },
      },
      { onConflict: 'name' },
    )
  if (error) console.warn(`${LOG_PREFIX} heartbeat failed: ${error.message}`)
}
await sendHeartbeat()
const heartbeatInterval = setInterval(sendHeartbeat, 30_000)

// --- Periodic catch-up (safety net) ---
// O Realtime é o caminho rápido, mas pode não entregar um INSERT (tabela fora da
// publicação, blip de canal, etc.). Um poll periódico garante que nenhuma task
// fique presa em 'pending' por mais que o intervalo. Barato: 1 SELECT indexado.
const catchUpInterval = setInterval(() => catchUp('poll'), 60_000)

// --- Periodic zombie reaper (a cada 5 min) ---
const reaperInterval = setInterval(() => reapZombies('periodic'), 5 * 60_000)

// --- Graceful shutdown ---
function shutdown() {
  console.log(`${LOG_PREFIX} Shutting down...`)
  shuttingDown = true
  if (reconnectTimer) clearTimeout(reconnectTimer)
  clearInterval(heartbeatInterval)
  clearInterval(catchUpInterval)
  clearInterval(reaperInterval)
  // Mata os `claude` em execução para não deixar processos órfãos após o exit.
  for (const child of activeChildren) {
    try { child.kill('SIGTERM') } catch {}
  }
  activeChildren.clear()
  if (channel) supabase.removeChannel(channel)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
