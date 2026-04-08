#!/usr/bin/env node
/**
 * Fase 0.1 — Migrate analysis_jobs → claude_code_tasks
 *
 * Moves pending/running rows from analysis_jobs into claude_code_tasks so the
 * new daemon picks them up. Completed/failed rows are left in place (history).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = {}
for (const line of readFileSync('/Users/rodrigorochameire/projetos/Defender/.env.local', 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Default user: Rodrigo (id=1) — confirmed earlier as CRON_DEFENSOR_ID
const DEFAULT_CREATED_BY = 1

// 1. Inspect analysis_jobs
const { data: jobs, error: jobsErr } = await sb
  .from('analysis_jobs')
  .select('*')
  .order('created_at', { ascending: true })

if (jobsErr) {
  console.error('Failed to read analysis_jobs:', jobsErr.message)
  process.exit(1)
}

console.log(`Found ${jobs.length} rows in analysis_jobs total.`)
const byStatus = jobs.reduce((acc, j) => ((acc[j.status] = (acc[j.status] || 0) + 1), acc), {})
console.log('  by status:', byStatus)

const toMigrate = jobs.filter((j) => j.status === 'pending' || j.status === 'running')
console.log(`\n${toMigrate.length} row(s) are pending/running and need migration.`)

if (toMigrate.length === 0) {
  console.log('Nothing to migrate. Safe to disable the analysis-worker launchd.')
  process.exit(0)
}

// 2. For each, look up assistidoId from processo and insert into claude_code_tasks
let migrated = 0
let skipped = 0
for (const job of toMigrate) {
  const { data: proc, error: procErr } = await sb
    .from('processos')
    .select('id, assistido_id, caso_id')
    .eq('id', job.processo_id)
    .single()

  if (procErr || !proc) {
    console.warn(`  [skip] job ${job.id}: processo ${job.processo_id} not found`)
    skipped++
    continue
  }

  // Dedup: is there already a claude_code_task pending/processing for this processo?
  const { data: existing } = await sb
    .from('claude_code_tasks')
    .select('id')
    .eq('processo_id', proc.id)
    .in('status', ['pending', 'processing'])
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`  [skip] job ${job.id}: claude_code_task ${existing[0].id} already pending for processo ${proc.id}`)
    skipped++
    continue
  }

  const { data: inserted, error: insErr } = await sb
    .from('claude_code_tasks')
    .insert({
      assistido_id: proc.assistido_id,
      processo_id: proc.id,
      caso_id: proc.caso_id ?? null,
      skill: job.skill,
      prompt: job.prompt,
      status: 'pending',
      created_by: DEFAULT_CREATED_BY,
    })
    .select('id')
    .single()

  if (insErr) {
    console.error(`  [fail] job ${job.id}: ${insErr.message}`)
    skipped++
    continue
  }

  // Mark the old analysis_jobs row as "migrated" so worker.sh won't pick it up if it's still running
  await sb.from('analysis_jobs').update({ status: 'migrated', error: `Migrated to claude_code_tasks.id=${inserted.id}` }).eq('id', job.id)

  console.log(`  [ok]   job ${job.id} → claude_code_tasks ${inserted.id} (processo ${proc.id}, skill ${job.skill})`)
  migrated++
}

console.log(`\nMigrated: ${migrated}  Skipped: ${skipped}  Total pending: ${toMigrate.length}`)
