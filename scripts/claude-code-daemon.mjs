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
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
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

// --- Skill map ---
const SKILL_MAP = {
  'analise-autos': 'analise-audiencias',
  'preparar-audiencia': 'analise-audiencias',
  'gerar-peca': 'dpe-ba-pecas',
  'analise-juri': 'juri',
  'feedback-estagiario': 'analise-audiencias',
}

const ETAPAS = [
  'Processando...',
  'Analisando documentos...',
  'Identificando teses...',
  'Gerando relatório...',
]

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

  // Resolve skill path
  const skillDir = SKILL_MAP[task.skill] || task.skill
  const skillPath = resolve(PROJECT_DIR, `.claude/skills-cowork/${skillDir}/SKILL.md`)

  // Build prompt
  const prompt = task.instrucao_adicional
    ? `${task.prompt}\n\nInstrução adicional: ${task.instrucao_adicional}`
    : task.prompt

  // Update etapa
  await supabase.from('claude_code_tasks').update({ etapa: 'Iniciando análise...' }).eq('id', task.id)

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

    // Periodic etapa updates every 30s
    let etapaIdx = 0
    const etapaInterval = setInterval(async () => {
      etapaIdx = Math.min(etapaIdx + 1, ETAPAS.length - 1)
      await supabase.from('claude_code_tasks').update({ etapa: ETAPAS[etapaIdx] }).eq('id', task.id)
    }, 30_000)

    child.on('close', async (code) => {
      clearInterval(etapaInterval)

      if (code === 0) {
        // Parse result: try JSON.parse, then regex extract
        let resultado = null
        try {
          resultado = JSON.parse(stdout)
        } catch {
          const match = stdout.match(/\{[\s\S]*\}/)
          if (match) {
            try { resultado = JSON.parse(match[0]) } catch { /* ignore */ }
          }
        }

        await supabase.from('claude_code_tasks').update({
          status: resultado ? 'completed' : 'needs_review',
          resultado: resultado || { raw: stdout },
          etapa: 'Concluído',
          completed_at: new Date().toISOString(),
        }).eq('id', task.id)

        console.log(`${LOG_PREFIX} Task ${task.id} completed.`)
      } else {
        const errorMsg = stderr || `Process exited with code ${code}`
        await supabase.from('claude_code_tasks').update({
          status: 'failed',
          erro: errorMsg.slice(0, 2000),
          etapa: 'Erro',
          completed_at: new Date().toISOString(),
        }).eq('id', task.id)

        console.error(`${LOG_PREFIX} Task ${task.id} failed: ${errorMsg.slice(0, 200)}`)
      }
      resolvePromise()
    })

    child.on('error', async (err) => {
      clearInterval(etapaInterval)
      await supabase.from('claude_code_tasks').update({
        status: 'failed',
        erro: err.message,
        etapa: 'Erro',
        completed_at: new Date().toISOString(),
      }).eq('id', task.id)
      console.error(`${LOG_PREFIX} Task ${task.id} spawn error: ${err.message}`)
      resolvePromise()
    })
  })
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

const channel = subscribe()

// --- Graceful shutdown ---
function shutdown() {
  console.log(`${LOG_PREFIX} Shutting down...`)
  supabase.removeChannel(channel)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
