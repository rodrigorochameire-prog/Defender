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

// --- Spawn claude -p and return { code, stdout, stderr } ---
function runClaude(skillPath, prompt) {
  return new Promise((resolvePromise) => {
    const args = ['-p', '--system-prompt-file', skillPath, '--permission-mode', 'auto', prompt]
    const child = spawn(CLAUDE_BIN, args, {
      cwd: PROJECT_DIR,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
    child.on('error', (err) => resolvePromise({ code: -1, stdout: '', stderr: err.message }))
  })
}

// --- Process a single task ---
async function processTask(task) {
  console.log(`${LOG_PREFIX} Processing task ${task.id} (skill: ${task.skill})`)

  // Optimistic lock
  const { data, error: lockErr } = await supabase
    .from('claude_code_tasks')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', task.id)
    .eq('status', 'pending')
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

  // Build prompt
  const basePrompt = task.instrucao_adicional
    ? `${task.prompt}\n\nInstrução adicional: ${task.instrucao_adicional}`
    : task.prompt

  // Periodic etapa updates every 30s — refreshed per run (shared across attempts)
  let etapaIdx = 0
  await supabase.from('claude_code_tasks').update({ etapa: 'Iniciando análise...' }).eq('id', task.id)
  const etapaInterval = setInterval(async () => {
    etapaIdx = Math.min(etapaIdx + 1, ETAPAS.length - 1)
    await supabase.from('claude_code_tasks').update({ etapa: ETAPAS[etapaIdx] }).eq('id', task.id)
  }, 30_000)

  try {
    // --- Attempt 1 ---
    let result = await runClaude(skillPath, basePrompt)

    if (result.code !== 0) {
      const errorMsg = result.stderr || `Process exited with code ${result.code}`
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
      await supabase.from('claude_code_tasks').update({ etapa: 'Retry — corrigindo JSON...' }).eq('id', task.id)

      const retryPrompt = `${basePrompt}

---
IMPORTANTE — RETRY: A resposta anterior não pôde ser parseada como JSON (${parsed.error}).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem blocos \`\`\`json, sem texto antes ou depois, sem comentários.
A primeira caractere da resposta deve ser { e o último deve ser }.`

      result = await runClaude(skillPath, retryPrompt)

      if (result.code !== 0) {
        const errorMsg = result.stderr || `Retry exited with code ${result.code}`
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
  } finally {
    clearInterval(etapaInterval)
  }
}

// --- Catch-up: process all pending tasks ---
async function catchUp() {
  console.log(`${LOG_PREFIX} Running catch-up...`)
  const { data: tasks, error } = await supabase
    .from('claude_code_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`${LOG_PREFIX} Catch-up query failed:`, error.message)
    return
  }

  console.log(`${LOG_PREFIX} Found ${tasks.length} pending task(s).`)
  for (const task of tasks) {
    await processTask(task)
  }
}

// --- Realtime subscription ---
function subscribe() {
  const channel = supabase
    .channel('claude-code-tasks')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'claude_code_tasks' }, (payload) => {
      console.log(`${LOG_PREFIX} New task received: ${payload.new.id}`)
      processTask(payload.new)
    })
    .subscribe(async (status) => {
      console.log(`${LOG_PREFIX} Realtime status: ${status}`)
      if (status === 'SUBSCRIBED') {
        await catchUp()
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

const channel = subscribe()

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

// --- Graceful shutdown ---
function shutdown() {
  console.log(`${LOG_PREFIX} Shutting down...`)
  clearInterval(heartbeatInterval)
  supabase.removeChannel(channel)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
