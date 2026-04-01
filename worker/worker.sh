#!/bin/bash
# OMBUDS Analysis Worker
# Polls analysis_jobs table and runs Claude Code CLI for each pending job.

set -euo pipefail

# ── Environment ──────────────────────────────────────────────────────────────
SUPABASE_URL="${OMBUDS_SUPABASE_URL:-https://hxfvlaeqhkmelvyzgfqp.supabase.co}"
SUPABASE_KEY="${OMBUDS_SUPABASE_SERVICE_KEY:?OMBUDS_SUPABASE_SERVICE_KEY is required}"
POLL_INTERVAL="${OMBUDS_POLL_INTERVAL:-30}"
DRIVE_PATH="${OMBUDS_DRIVE_PATH:-$HOME/Meu Drive/1 - Defensoria 9ª DP}"
SKILLS_PATH="${OMBUDS_SKILLS_PATH:-$HOME/.claude/skills}"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

supabase_get() {
  local path="$1"
  curl -s \
    "${SUPABASE_URL}/rest/v1/${path}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}"
}

supabase_patch() {
  local table="$1"
  local filter="$2"
  local body="$3"
  curl -s -X PATCH \
    "${SUPABASE_URL}/rest/v1/${table}?${filter}" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "${body}"
}

py_extract() {
  # Usage: py_extract "$json" "key"
  local json="$1"
  local key="$2"
  echo "$json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if isinstance(d, list) and d:
    print(d[0].get('${key}', ''))
elif isinstance(d, dict):
    print(d.get('${key}', ''))
"
}

py_is_empty() {
  # Returns 0 (true) if json array is empty
  local json="$1"
  echo "$json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
sys.exit(0 if (isinstance(d, list) and len(d) == 0) else 1)
"
}

now_iso() {
  python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())"
}

# ── Job processing ─────────────────────────────────────────────────────────────
process_job() {
  local job_json="$1"

  local job_id processo_id skill prompt
  job_id="$(py_extract "$job_json" "id")"
  processo_id="$(py_extract "$job_json" "processo_id")"
  skill="$(py_extract "$job_json" "skill")"
  prompt="$(py_extract "$job_json" "prompt")"

  if [[ -z "$job_id" ]]; then
    log "ERROR: could not extract job id from JSON"
    return 1
  fi

  log "Starting job $job_id | processo=$processo_id | skill=$skill"

  # Mark job as running
  local started_at
  started_at="$(now_iso)"
  supabase_patch "analysis_jobs" "id=eq.${job_id}" \
    "{\"status\":\"running\",\"started_at\":\"${started_at}\"}" > /dev/null

  # Mark processo as running
  if [[ -n "$processo_id" ]]; then
    supabase_patch "processos" "id=eq.${processo_id}" \
      "{\"analysis_status\":\"running\"}" > /dev/null
  fi

  # Run Claude Code CLI
  local output exit_code
  set +e
  output="$(claude -p "${prompt}" \
    --add-dir "${DRIVE_PATH}" \
    --add-dir "${SKILLS_PATH}" \
    2>&1)"
  exit_code=$?
  set -e

  local completed_at
  completed_at="$(now_iso)"

  if [[ $exit_code -eq 0 ]]; then
    log "Job $job_id completed successfully"
    supabase_patch "analysis_jobs" "id=eq.${job_id}" \
      "{\"status\":\"completed\",\"completed_at\":\"${completed_at}\"}" > /dev/null
    if [[ -n "$processo_id" ]]; then
      supabase_patch "processos" "id=eq.${processo_id}" \
        "{\"analysis_status\":\"completed\"}" > /dev/null
    fi
  else
    # Escape double quotes and newlines from output for JSON safety
    local error_msg
    error_msg="$(echo "$output" | python3 -c "
import sys, json
print(json.dumps(sys.stdin.read()[:2000]))
" | sed 's/^"//;s/"$//')"

    log "Job $job_id FAILED (exit $exit_code): ${output:0:200}"
    supabase_patch "analysis_jobs" "id=eq.${job_id}" \
      "{\"status\":\"failed\",\"completed_at\":\"${completed_at}\",\"error\":\"${error_msg}\"}" > /dev/null
    if [[ -n "$processo_id" ]]; then
      supabase_patch "processos" "id=eq.${processo_id}" \
        "{\"analysis_status\":\"failed\"}" > /dev/null
    fi
  fi
}

# ── Main loop ──────────────────────────────────────────────────────────────────
log "OMBUDS Analysis Worker starting (poll interval: ${POLL_INTERVAL}s)"
log "Supabase URL : ${SUPABASE_URL}"
log "Drive path   : ${DRIVE_PATH}"
log "Skills path  : ${SKILLS_PATH}"

while true; do
  # Fetch oldest pending job
  job_response="$(supabase_get "analysis_jobs?status=eq.pending&order=created_at.asc&limit=1")"

  if py_is_empty "$job_response" 2>/dev/null; then
    log "No pending jobs. Sleeping ${POLL_INTERVAL}s..."
    sleep "${POLL_INTERVAL}"
    continue
  fi

  process_job "$job_response"

  # Brief pause between jobs to avoid hammering the API
  sleep 2
done
