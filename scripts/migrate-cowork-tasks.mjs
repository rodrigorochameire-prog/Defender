#!/usr/bin/env node
/**
 * Fase 0.2 — Migrate cowork_tasks → claude_code_tasks
 *
 * Moves pending rows from cowork_tasks into claude_code_tasks.
 * Completed rows left in place as history.
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

// Same map used by briefing.coworkAnalise
const FUNC_TO_SKILL = {
  relatorio_juri: 'analise-juri',
  preparar_audiencia: 'preparar-audiencia',
  analise_criminal: 'criminal-comum',
  analise_vvd: 'vvd',
  analise_ep: 'execucao-penal',
  gerar_peca: 'gerar-peca',
  briefing_completo: 'analise-autos',
}

const { data: tasks, error } = await sb
  .from('cowork_tasks')
  .select('*')
  .order('created_at', { ascending: true })

if (error) {
  console.error('Failed to read cowork_tasks:', error.message)
  process.exit(1)
}

console.log(`Found ${tasks.length} rows in cowork_tasks total.`)
const byStatus = tasks.reduce((acc, t) => ((acc[t.status] = (acc[t.status] || 0) + 1), acc), {})
console.log('  by status:', byStatus)

const toMigrate = tasks.filter((t) => t.status === 'pending' || t.status === 'processing')
console.log(`\n${toMigrate.length} row(s) pending/processing need migration.`)

if (toMigrate.length === 0) {
  console.log('Nothing to migrate. cowork_tasks is safe to retire.')
  process.exit(0)
}

let migrated = 0
let skipped = 0
for (const t of toMigrate) {
  const skill = FUNC_TO_SKILL[t.funcionalidade] ?? 'analise-autos'

  // Dedup
  const { data: existing } = await sb
    .from('claude_code_tasks')
    .select('id')
    .eq('processo_id', t.processo_id)
    .in('status', ['pending', 'processing'])
    .limit(1)

  if (existing && existing.length > 0) {
    console.log(`  [skip] cowork ${t.id}: already pending in claude_code_tasks ${existing[0].id}`)
    skipped++
    continue
  }

  const { data: inserted, error: insErr } = await sb
    .from('claude_code_tasks')
    .insert({
      assistido_id: t.assistido_id,
      processo_id: t.processo_id,
      skill,
      prompt: t.briefing ?? '',
      instrucao_adicional: `Funcionalidade: ${t.funcionalidade}`,
      status: 'pending',
      created_by: t.created_by ?? 1,
    })
    .select('id')
    .single()

  if (insErr) {
    console.error(`  [fail] cowork ${t.id}: ${insErr.message}`)
    skipped++
    continue
  }

  await sb.from('cowork_tasks').update({ status: 'migrated' }).eq('id', t.id)
  console.log(`  [ok]   cowork ${t.id} → claude_code_tasks ${inserted.id} (skill ${skill})`)
  migrated++
}

console.log(`\nMigrated: ${migrated}  Skipped: ${skipped}  Total: ${toMigrate.length}`)
