#!/bin/bash
source "$HOME/ombuds-worker/.env"

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

  # Strip the "gravar via Supabase MCP" / "Responda com a análise" trailing instruction
  local clean_prompt
  clean_prompt="$(echo "$prompt" | python3 -c "
import sys, re
text = sys.stdin.read()
text = re.sub(r'(IMPORTANTE: Ao final da análise|Responda com a análise completa).*', '', text, flags=re.DOTALL).strip()
print(text)
")"

  # Fetch assistido name for Drive folder lookup
  local assistido_nome=""
  if [[ -n "$processo_id" ]]; then
    local proc_json
    proc_json="$(supabase_get "processos?id=eq.${processo_id}&select=assistido_id,atribuicao")"
    local assistido_id atribuicao
    assistido_id="$(py_extract "$proc_json" "assistido_id")"
    atribuicao="$(py_extract "$proc_json" "atribuicao")"
    if [[ -n "$assistido_id" ]]; then
      local assist_json
      assist_json="$(supabase_get "assistidos?id=eq.${assistido_id}&select=nome")"
      assistido_nome="$(py_extract "$assist_json" "nome")"
    fi

    # Map atribuicao to Drive subfolder
    local drive_subfolder="Processos"
    case "$atribuicao" in
      JURI_CAMACARI) drive_subfolder="Processos - Júri" ;;
      VVD_CAMACARI) drive_subfolder="Processos - VVD (Criminal)" ;;
      EXECUCAO_PENAL) drive_subfolder="Processos - Execução Penal" ;;
      SUBSTITUICAO) drive_subfolder="Processos - Substituição criminal" ;;
    esac

    log "Assistido: $assistido_nome | Atribuição: $atribuicao | Subfolder: $drive_subfolder"
  fi

  # Find the assistido's specific Drive folder.
  # Drive folder names may differ from DB names by accents/case, so try exact
  # first, then fall back to a fuzzy match (accent + case insensitive).
  local assistido_drive_dir=""
  if [[ -n "$assistido_nome" ]]; then
    local search_dir="${DRIVE_PATH}/${drive_subfolder}/${assistido_nome}"
    if [[ -d "$search_dir" ]]; then
      assistido_drive_dir="$search_dir"
      log "Found Drive folder (exact): $assistido_drive_dir"
    else
      # Fuzzy match: strip accents and lowercase, then compare basenames
      local parent_dir="${DRIVE_PATH}/${drive_subfolder}"
      if [[ -d "$parent_dir" ]]; then
        local match
        match="$(python3 - "$parent_dir" "$assistido_nome" <<'PY'
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
except FileNotFoundError:
    pass
PY
)"
        if [[ -n "$match" && -d "$match" ]]; then
          assistido_drive_dir="$match"
          log "Found Drive folder (fuzzy): $assistido_drive_dir"
        else
          log "Drive folder not found (tried exact + fuzzy): $search_dir"
        fi
      else
        log "Parent dir does not exist: $parent_dir"
      fi
    fi
  fi

  # Read Drive documents and embed content in the prompt
  local docs_content=""
  if [[ -n "$assistido_drive_dir" ]]; then
    log "Reading Drive documents..."
    docs_content="$(python3 "$HOME/ombuds-worker/read_drive_docs.py" "$assistido_drive_dir" 2>> "$HOME/ombuds-worker/logs/worker.log")" || true
    log "Documents reading complete"
  fi

  # Build the prompt with embedded documents
  local full_prompt="${clean_prompt}"
  if [[ -n "$docs_content" ]]; then
    full_prompt="${full_prompt}

DOCUMENTOS DO CASO (lidos do Drive):
${docs_content}

Use TODOS os documentos acima para embasar sua análise. Extraia fatos, contradições, nomes e estratégias dos documentos."
  fi

  full_prompt="${full_prompt}

FORMATO DE SAÍDA OBRIGATÓRIO: Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem texto antes/depois). O JSON deve ter esta estrutura:
{
  \"resumo\": \"Síntese do caso em 2-3 parágrafos\",
  \"achadosChave\": [\"achado 1\", \"achado 2\"],
  \"recomendacoes\": [\"recomendação 1\", \"recomendação 2\"],
  \"inconsistencias\": [\"inconsistência 1\"],
  \"depoimentos\": [
    {
      \"nome\": \"Nome completo\",
      \"papel\": \"testemunha_acusacao|testemunha_defesa|vitima|policial_condutor|perito|informante\",
      \"resumo\": \"resumo do depoimento ou do papel se ainda não depôs\",
      \"endereco\": \"endereço se constar nos autos (rua, número, bairro, cidade)\",
      \"telefones\": [\"telefones se constarem\"],
      \"observacoes\": \"qualquer observação relevante sobre essa pessoa (relação com o caso, motivação, etc.)\",
      \"perguntas\": [
        \"Pergunta estratégica 1 que a defesa deve fazer a esse depoente\",
        \"Pergunta estratégica 2\",
        \"Pergunta 3 (entre 4 e 8 perguntas dirigidas, focadas em fragilidades da acusação ou no fortalecimento da tese defensiva)\"
      ],
      \"pontos_favoraveis\": [
        \"Ponto do depoimento (ou do papel) que beneficia a defesa\",
        \"Outro ponto favorável\"
      ],
      \"pontos_desfavoraveis\": [
        \"Ponto do depoimento (ou do papel) que prejudica a defesa\",
        \"Outro ponto desfavorável\"
      ]
    }
  ],
  \"pessoas\": [
    { \"nome\": \"Nome completo\", \"papel\": \"defendido|vitima|testemunha_acusacao|testemunha_defesa|perito|delegado|policial_condutor|familiar|outro\", \"endereco\": \"endereço se constar nos autos\", \"telefones\": [], \"observacoes\": \"\" }
  ],
  \"kpis\": {
    \"totalPessoas\": 0,
    \"totalAcusacoes\": 0,
    \"totalDocumentosAnalisados\": 0,
    \"totalEventos\": 0,
    \"totalNulidades\": 0,
    \"totalRelacoes\": 0
  },
  \"versaoModelo\": \"claude-code-worker-v2\",
  \"fonte\": \"${skill}\"
}

REGRAS CRÍTICAS:

1. depoimentos[] — extraia TODAS as pessoas arroladas como testemunhas (defesa e acusação), a vítima, e os policiais que conduziram a prisão/investigação. Mesmo que ainda não tenham depoido, liste-os com o papel correto. NUNCA inclua o defendido (réu/assistido) nesta lista. Esse campo é a base da preparação da audiência.

2. perguntas[] — para CADA depoente, gere entre 4 e 8 perguntas estratégicas que a defesa deve fazer em audiência. As perguntas devem ser dirigidas, específicas ao papel da pessoa, e focadas em explorar contradições, lacunas probatórias ou fortalecer a tese defensiva. Não use perguntas genéricas tipo 'O que aconteceu?'.

3. pontos_favoraveis[] e pontos_desfavoraveis[] — sintetize 1 a 3 pontos POR depoente. Mesmo que a pessoa ainda não tenha depoido, antecipe com base no papel processual (ex: 'PM condutor — testemunha hostil, pode embelezar a abordagem').

4. endereco/telefones — só inclua se REALMENTE constarem nos autos. Não invente. Se não há, deixe string vazia / array vazio.

5. NUNCA inclua nomes-placeholder como 'Vítima a confirmar', 'Equipe a identificar', 'Testemunhas não identificadas'. Se a pessoa não foi nomeada nos autos, simplesmente NÃO a inclua."

  # Build --add-dir flags
  local add_dirs=("--add-dir" "${DRIVE_PATH}")
  if [[ -n "$assistido_drive_dir" ]]; then
    add_dirs+=("--add-dir" "${assistido_drive_dir}")
  fi

  # Run Claude Code CLI
  local output exit_code
  set +e
  output="$(claude -p "${full_prompt}" \
    "${add_dirs[@]}" \
    --output-format json \
    2>&1)"
  exit_code=$?
  set -e

  local completed_at
  completed_at="$(now_iso)"

  if [[ $exit_code -eq 0 ]]; then
    log "Job $job_id completed successfully"

    # Extract the analysis JSON from Claude's output
    local analysis_json
    analysis_json="$(echo "$output" | python3 -c "
import sys, json

raw = sys.stdin.read()

# claude --output-format json wraps in {result: '...'}
try:
    wrapper = json.loads(raw)
    text = wrapper.get('result', raw)
except:
    text = raw

# Try to parse the text as JSON directly
try:
    data = json.loads(text)
    print(json.dumps(data, ensure_ascii=False))
except:
    # Try to extract JSON from markdown fences or surrounding text
    import re
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        try:
            data = json.loads(m.group())
            print(json.dumps(data, ensure_ascii=False))
        except:
            # Fallback: store raw text as resumo
            print(json.dumps({'resumo': text[:4000], 'fonte': 'raw-text', 'versaoModelo': 'claude-code-worker-v1'}, ensure_ascii=False))
    else:
        print(json.dumps({'resumo': text[:4000], 'fonte': 'raw-text', 'versaoModelo': 'claude-code-worker-v1'}, ensure_ascii=False))
" 2>/dev/null)"

    # Mark job as completed
    supabase_patch "analysis_jobs" "id=eq.${job_id}" \
      "{\"status\":\"completed\",\"completed_at\":\"${completed_at}\"}" > /dev/null

    # Save analysis_data to processo
    if [[ -n "$processo_id" ]]; then
      local patch_body
      patch_body="$(echo "$analysis_json" | python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
patch = {
    'analysis_data': data,
    'analysis_status': 'completed',
    'analyzed_at': '${completed_at}'
}
print(json.dumps(patch, ensure_ascii=False))
")"
      supabase_patch "processos" "id=eq.${processo_id}" "$patch_body" > /dev/null
      log "Saved analysis_data to processo $processo_id"
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
