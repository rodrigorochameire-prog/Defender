#!/bin/bash
source "$HOME/ombuds-worker/.env"

# PJe Download Worker
# Polls pje_download_jobs and invokes scripts/pje_downloader.py per job.
# On success, enqueues an analysis_jobs row so the analysis worker picks up
# the newly-downloaded PDFs for the same processo.

set -euo pipefail

SUPABASE_URL="${OMBUDS_SUPABASE_URL:-https://hxfvlaeqhkmelvyzgfqp.supabase.co}"
SUPABASE_KEY="${OMBUDS_SUPABASE_SERVICE_KEY:?OMBUDS_SUPABASE_SERVICE_KEY is required}"
POLL_INTERVAL="${OMBUDS_PJE_POLL_INTERVAL:-20}"
DRIVE_PATH="${OMBUDS_DRIVE_PATH:-$HOME/Meu Drive/1 - Defensoria 9ª DP}"
REPO_PATH="${OMBUDS_REPO_PATH:-$HOME/projetos/Defender}"
JOB_TIMEOUT="${OMBUDS_PJE_JOB_TIMEOUT:-300}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [pje-worker] $*"
}

supabase_get() {
  curl -s \
    "${SUPABASE_URL}/rest/v1/$1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}"
}

supabase_patch() {
  curl -s -X PATCH \
    "${SUPABASE_URL}/rest/v1/$1?$2" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$3"
}

supabase_post() {
  curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/$1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$2"
}

py_extract() {
  local json="$1"
  local key="$2"
  echo "$json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if isinstance(d, list) and d:
    v = d[0].get('${key}', '')
    print(v if v is not None else '')
elif isinstance(d, dict):
    v = d.get('${key}', '')
    print(v if v is not None else '')
else:
    print('')
"
}

py_is_empty() {
  echo "$1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
sys.exit(0 if (isinstance(d, list) and len(d) == 0) else 1)
"
}

now_iso() {
  python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())"
}

SUBFOLDER_MAP_PY='
import sys
m = {
  "JURI_CAMACARI": "Processos - Júri",
  "VVD_CAMACARI": "Processos - VVD (Criminal)",
  "EXECUCAO_PENAL": "Processos - Execução Penal",
  "SUBSTITUICAO": "Processos - Substituição criminal",
}
print(m.get(sys.argv[1], "Processos"))
'

resolve_assistido_dir() {
  local assistido_id="$1"
  local atribuicao="$2"
  if [[ -z "$assistido_id" ]]; then
    echo ""
    return
  fi
  local assist_json
  assist_json="$(supabase_get "assistidos?id=eq.${assistido_id}&select=nome")"
  local nome
  nome="$(py_extract "$assist_json" "nome")"
  if [[ -z "$nome" ]]; then
    echo ""
    return
  fi
  local subfolder
  subfolder="$(python3 -c "$SUBFOLDER_MAP_PY" "$atribuicao")"
  local parent="${DRIVE_PATH}/${subfolder}"

  # Exact match first
  if [[ -d "${parent}/${nome}" ]]; then
    echo "${parent}/${nome}"
    return
  fi

  # Fuzzy match (NFD normalization), create folder if nothing matches
  python3 - "$parent" "$nome" <<'PY'
import os, sys, unicodedata
parent, target = sys.argv[1], sys.argv[2]
def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().strip()
target_n = norm(target)
try:
    for name in os.listdir(parent):
        full = os.path.join(parent, name)
        if os.path.isdir(full) and norm(name) == target_n:
            print(full)
            break
    else:
        os.makedirs(os.path.join(parent, target), exist_ok=True)
        print(os.path.join(parent, target))
except FileNotFoundError:
    os.makedirs(os.path.join(parent, target), exist_ok=True)
    print(os.path.join(parent, target))
PY
}

process_job() {
  local job_json="$1"

  local job_id processo_id numero atribuicao assistido_id
  job_id="$(py_extract "$job_json" "id")"
  processo_id="$(py_extract "$job_json" "processo_id")"
  numero="$(py_extract "$job_json" "numero_processo")"
  atribuicao="$(py_extract "$job_json" "atribuicao")"
  assistido_id="$(py_extract "$job_json" "assistido_id")"

  if [[ -z "$job_id" ]]; then
    log "ERROR: could not extract job id"
    return 1
  fi

  log "Starting job $job_id | processo=$numero | atribuicao=$atribuicao"

  supabase_patch "pje_download_jobs" "id=eq.${job_id}" \
    "{\"status\":\"running\",\"started_at\":\"$(now_iso)\"}" > /dev/null

  local out_dir
  out_dir="$(resolve_assistido_dir "$assistido_id" "$atribuicao")"

  if [[ -z "$out_dir" ]]; then
    log "Could not resolve Drive dir for assistido_id=$assistido_id"
    supabase_patch "pje_download_jobs" "id=eq.${job_id}" \
      "{\"status\":\"failed\",\"completed_at\":\"$(now_iso)\",\"error\":\"Drive folder not resolved\"}" > /dev/null
    return 1
  fi

  log "Drive dir: $out_dir"

  set +e
  local output exit_code
  # macOS has no `timeout` built-in; use background+kill pattern
  local tmp_out
  tmp_out="$(mktemp)"
  (
    source "${PJE_VENV}/bin/activate"
    export PJE_CPF="${PJE_CPF}"
    export PJE_SENHA="${PJE_SENHA}"
    python3 "${REPO_PATH}/scripts/pje_downloader.py" download \
      --numero "${numero}" \
      --atribuicao "${atribuicao}" \
      --out-dir "${out_dir}"
  ) > "$tmp_out" 2>&1 &
  local child_pid=$!
  (
    sleep "${JOB_TIMEOUT}"
    kill "$child_pid" 2>/dev/null
  ) &
  local watchdog_pid=$!
  wait "$child_pid"
  exit_code=$?
  kill "$watchdog_pid" 2>/dev/null || true
  output="$(cat "$tmp_out")"
  rm -f "$tmp_out"
  set -e

  # Parse the last JSON line from the downloader's stdout
  local status_json
  status_json="$(echo "$output" | tail -1)"

  local status
  status="$(echo "$status_json" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('status', 'failed'))
except Exception:
    print('failed')
")"

  if [[ "$status" == "completed" ]]; then
    local pdf_path pdf_bytes
    pdf_path="$(echo "$status_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pdf_path', ''))")"
    pdf_bytes="$(echo "$status_json" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pdf_bytes', 0))")"
    # Escape pdf_path for JSON
    local pdf_path_escaped
    pdf_path_escaped="$(python3 -c "import json, sys; print(json.dumps(sys.argv[1]))" "$pdf_path")"
    supabase_patch "pje_download_jobs" "id=eq.${job_id}" \
      "{\"status\":\"completed\",\"completed_at\":\"$(now_iso)\",\"pdf_path\":${pdf_path_escaped},\"pdf_bytes\":${pdf_bytes}}" > /dev/null
    log "Job $job_id completed ($pdf_bytes bytes)"

    if [[ -n "$processo_id" ]]; then
      supabase_post "analysis_jobs" \
        "{\"processo_id\":${processo_id},\"skill\":\"preparar-audiencia\",\"prompt\":\"Analisar autos recém-baixados do PJe. Extraia depoimentos e estratégia.\",\"status\":\"pending\"}" > /dev/null
      log "Enqueued analysis_job for processo $processo_id"
    fi

  elif [[ "$status" == "skipped" ]]; then
    supabase_patch "pje_download_jobs" "id=eq.${job_id}" \
      "{\"status\":\"skipped\",\"completed_at\":\"$(now_iso)\"}" > /dev/null
    log "Job $job_id skipped (pdf already exists)"

  else
    local error_msg
    error_msg="$(echo "$output" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()[:1000]))")"
    supabase_patch "pje_download_jobs" "id=eq.${job_id}" \
      "{\"status\":\"failed\",\"completed_at\":\"$(now_iso)\",\"error\":${error_msg}}" > /dev/null
    log "Job $job_id FAILED (exit $exit_code): ${output:0:200}"
  fi
}

# Main loop
log "PJe Download Worker starting (poll=${POLL_INTERVAL}s, timeout=${JOB_TIMEOUT}s)"
log "Drive: $DRIVE_PATH"
log "Repo:  $REPO_PATH"
log "Venv:  $PJE_VENV"

while true; do
  # Reap stuck jobs: anything in 'running' older than JOB_TIMEOUT*2 -> failed
  cutoff="$(python3 -c "from datetime import datetime, timezone, timedelta; print((datetime.now(timezone.utc) - timedelta(seconds=${JOB_TIMEOUT}*2)).isoformat())")"
  supabase_patch "pje_download_jobs" "status=eq.running&started_at=lt.${cutoff}" \
    "{\"status\":\"failed\",\"error\":\"worker_timeout\"}" > /dev/null || true

  job_response="$(supabase_get "pje_download_jobs?status=eq.pending&order=created_at.asc&limit=1")"

  if py_is_empty "$job_response" 2>/dev/null; then
    sleep "${POLL_INTERVAL}"
    continue
  fi

  process_job "$job_response"
  sleep 2
done
