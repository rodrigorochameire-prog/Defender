#!/usr/bin/env node
/**
 * Fase 5 — Create system_heartbeat table (one-shot, idempotent).
 *
 * Used by scripts/claude-code-daemon.mjs to report liveness, and by
 * /admin/daemon page to render status.
 */
import { readFileSync } from 'fs'
import postgres from 'postgres'

const env = {}
for (const line of readFileSync('/Users/rodrigorochameire/projetos/Defender/.env.local', 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const url = env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_URL_NON_POOLING
if (!url) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

const sql = postgres(url, { prepare: false, max: 1 })

try {
  await sql`
    CREATE TABLE IF NOT EXISTS system_heartbeat (
      name text PRIMARY KEY,
      last_seen timestamptz NOT NULL DEFAULT now(),
      metadata jsonb
    )
  `
  console.log('[ok] system_heartbeat table ready')

  const rows = await sql`SELECT name, last_seen FROM system_heartbeat`
  console.log('Current rows:', rows.length)
  for (const r of rows) console.log(`  - ${r.name} @ ${r.last_seen}`)
} finally {
  await sql.end()
}
