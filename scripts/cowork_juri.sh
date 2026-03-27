#!/bin/bash
# ================================================================
# COWORK JURI — Análise via Claude Code ($0)
# ================================================================
# Usa `claude -p` (assinatura, sem API paga) com a skill do júri
# para gerar relatório + _analise_ia.json compatível com OMBUDS.
#
# Uso:
#   ./scripts/cowork_juri.sh "Adenilson da Silva"
#   ./scripts/cowork_juri.sh --batch
#   ./scripts/cowork_juri.sh --batch --dry-run
# ================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DRIVE_ROOT="$HOME/Meu Drive/1 - Defensoria 9ª DP/Inteligencia artificial"
JURI_FOLDER="$HOME/Meu Drive/1 - Defensoria 9ª DP/Processos - Júri"
SKILL_FILE="$DRIVE_ROOT/Skills Atualizadas/juri.skill"
SKILL_CACHE="$SCRIPT_DIR/.juri_skill_prompt.md"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[cowork]${NC} $1"; }
ok() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
err() { echo -e "${RED}❌${NC} $1"; }

# ─── Extrair prompt da skill ───
extract_skill_prompt() {
  if [ ! -f "$SKILL_CACHE" ] || [ "$SKILL_FILE" -nt "$SKILL_CACHE" ]; then
    log "Extraindo prompt da skill juri.skill..."
    python3 -c "
import zipfile, sys
with zipfile.ZipFile('$SKILL_FILE', 'r') as z:
    parts = []
    for name in ['skill_src/juri/SKILL.md', 'skill_src/juri/references/analise_para_juri.md', 'skill_src/juri/references/analise_estrategica_juri.md']:
        try:
            with z.open(name) as f:
                parts.append(f.read().decode('utf-8'))
        except KeyError:
            pass
    sys.stdout.write('\n\n---\n\n'.join(parts))
" > "$SKILL_CACHE"
    ok "Prompt extraído ($(wc -c < "$SKILL_CACHE" | tr -d ' ') chars)"
  fi
}

# ─── Encontrar pasta ───
find_pasta() {
  local nome="$1"
  local found=""
  if [ -d "$JURI_FOLDER/$nome" ]; then
    found="$JURI_FOLDER/$nome"
  else
    found=$(find "$JURI_FOLDER" -maxdepth 1 -type d -iname "$nome" 2>/dev/null | head -1)
  fi
  if [ -z "$found" ]; then
    local primeiro=$(echo "$nome" | cut -d' ' -f1)
    local ultimo=$(echo "$nome" | awk '{print $NF}')
    found=$(find "$JURI_FOLDER" -maxdepth 1 -type d -iname "*${primeiro}*" 2>/dev/null | grep -i "$ultimo" | head -1)
  fi
  echo "$found"
}

# ─── Gerar briefing ───
gerar_briefing() {
  local pasta="$1" nome="$2"
  {
    echo "# Briefing OMBUDS — $nome"
    echo "> Gerado em $(date '+%d/%m/%Y às %H:%M')"
    echo ""
    echo "## Arquivos disponíveis"
    for f in "$pasta"/*; do
      [ -f "$f" ] && echo "- $(basename "$f")"
    done
    echo ""
    # Concatenar .md e .txt (exceto gerados)
    for f in "$pasta"/*.md "$pasta"/*.txt; do
      [ -f "$f" ] || continue
      local fname=$(basename "$f")
      [[ "$fname" == _briefing_* || "$fname" == _analise_* || "$fname" == _relatorio_* ]] && continue
      echo "---"
      echo "## Documento: $fname"
      echo ""
      cat "$f"
      echo ""
    done
    # Subpastas
    for d in "$pasta"/*/; do
      [ -d "$d" ] || continue
      for f in "$d"/*.md "$d"/*.txt; do
        [ -f "$f" ] || continue
        echo "---"
        echo "## Documento: $(basename "$d")/$(basename "$f")"
        echo ""
        cat "$f"
        echo ""
      done
    done
  }
}

# ─── Processar assistido ───
processar_assistido() {
  local nome="$1"
  log "━━━ $nome ━━━"

  # 1. Encontrar pasta
  local pasta=$(find_pasta "$nome")
  if [ -z "$pasta" ]; then
    warn "Pasta não encontrada: $nome"
    return 1
  fi
  log "📂 $pasta"

  # 2. Gerar briefing
  local briefing=$(gerar_briefing "$pasta" "$nome")
  local briefing_len=${#briefing}
  log "📝 Briefing: $briefing_len chars"

  if [ "$briefing_len" -lt 200 ]; then
    warn "Sem documentos relevantes para: $nome"
    return 1
  fi

  # Truncar se necessário
  if [ "$briefing_len" -gt 120000 ]; then
    briefing="${briefing:0:120000}

[... truncado ...]"
    warn "Truncado para 120K chars"
  fi

  # 3. Salvar briefing em arquivo temp
  local prompt_file=$(mktemp /tmp/cowork_prompt_XXXXX.md)

  # ─── ETAPA A: Gerar relatório markdown ───
  log "📄 Gerando relatório (claude -p)..."
  cat > "$prompt_file" <<PROMPT_EOF
Analise os autos abaixo para o Tribunal do Júri. Gere o RELATÓRIO COMPLETO conforme suas instruções (todas as seções).

ASSISTIDO: $nome

$briefing
PROMPT_EOF

  local report
  report=$(cat "$prompt_file" | claude -p \
    --system-prompt "$(cat "$SKILL_CACHE")" \
    --output-format text \
    2>/dev/null) || {
    err "Falha ao gerar relatório"
    rm -f "$prompt_file"
    return 1
  }

  # Salvar relatório
  local date_slug=$(date +%Y-%m-%d)
  echo "$report" > "$pasta/_relatorio_juri_${date_slug}.md"
  ok "Relatório salvo: _relatorio_juri_${date_slug}.md ($(echo "$report" | wc -c | tr -d ' ') chars)"

  # ─── ETAPA B: Gerar _analise_ia.json ───
  log "📋 Gerando _analise_ia.json (claude -p)..."
  cat > "$prompt_file" <<JSON_PROMPT_EOF
Com base no relatório abaixo, extraia os dados estruturados no formato JSON especificado.

RELATÓRIO:
$(echo "$report" | head -c 80000)

---

Retorne APENAS um JSON válido com EXATAMENTE esta estrutura (todos os campos obrigatórios):

\`\`\`json
{
  "schema_version": "1.0",
  "tipo": "juri",
  "gerado_em": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "assistido": "$nome",
  "processo": "(extraia do relatório)",

  "resumo_fato": "(síntese factual em 3-5 frases)",
  "tese_defesa": "(tese principal identificada)",
  "estrategia_atual": "(estratégia recomendada)",
  "crime_principal": "(tipo penal principal)",
  "pontos_criticos": ["ponto 1", "ponto 2"],

  "payload": {
    "perguntas_por_testemunha": [
      {"nome": "Nome Completo", "tipo": "ACUSACAO", "perguntas": ["pergunta 1", "pergunta 2"]}
    ],
    "contradicoes": [
      {"testemunha": "Nome", "delegacia": "versão na delegacia", "juizo": "versão em juízo", "contradicao": "descrição"}
    ],
    "orientacao_ao_assistido": "(orientação para interrogatório)",
    "perspectiva_plenaria": "(estratégia para o plenário)",
    "quesitos_criticos": ["quesito 1"]
  }
}
\`\`\`

REGRAS:
- Preencha TODOS os campos. Se não houver dados, use string vazia ou array vazio.
- Nomes de testemunhas devem ser EXATOS como no relatório.
- Retorne APENAS o JSON, sem texto adicional.
JSON_PROMPT_EOF

  local json_result
  json_result=$(cat "$prompt_file" | claude -p \
    --system-prompt "Você é um extrator de dados jurídicos de alta precisão. Extraia APENAS dados factuais do relatório. Retorne APENAS JSON válido, sem explicações." \
    --output-format text \
    2>/dev/null) || {
    warn "Falha ao gerar JSON — relatório salvo sem JSON"
    rm -f "$prompt_file"
    return 0
  }

  rm -f "$prompt_file"

  # Extrair e validar JSON
  local json_clean
  json_clean=$(python3 -c "
import re, sys, json
text = sys.stdin.read()
# Extrair JSON de code blocks
match = re.search(r'\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`', text)
if match:
    text = match.group(1)
else:
    bs = text.find('{')
    be = text.rfind('}')
    if bs >= 0 and be > bs:
        text = text[bs:be+1]

# Cleanup
text = text.strip()
text = re.sub(r',\s*}', '}', text)
text = re.sub(r',\s*]', ']', text)

parsed = json.loads(text)

# Garantir campos obrigatórios
for field in ['schema_version', 'tipo', 'resumo_fato', 'tese_defesa', 'pontos_criticos', 'payload']:
    if field not in parsed:
        if field == 'pontos_criticos':
            parsed[field] = []
        elif field == 'payload':
            parsed[field] = {}
        elif field == 'schema_version':
            parsed[field] = '1.0'
        elif field == 'tipo':
            parsed[field] = 'juri'
        else:
            parsed[field] = ''

print(json.dumps(parsed, ensure_ascii=False, indent=2))
" <<< "$json_result" 2>/dev/null) || {
    warn "JSON inválido — tentando reparo..."
    # Salvar resultado bruto para debug
    echo "$json_result" > "$pasta/_analise_ia_raw.txt"
    warn "Resultado bruto salvo em _analise_ia_raw.txt"
    return 0
  }

  echo "$json_clean" > "$pasta/_analise_ia.json"
  ok "_analise_ia.json salvo ($(echo "$json_clean" | wc -c | tr -d ' ') chars)"

  # Resumir o que foi extraído
  python3 -c "
import json, sys
d = json.load(sys.stdin)
t = d.get('tese_defesa', 'N/A')[:80]
p = len(d.get('payload', {}).get('perguntas_por_testemunha', []))
c = len(d.get('payload', {}).get('contradicoes', []))
print(f'  Tese: {t}')
print(f'  Testemunhas com perguntas: {p}')
print(f'  Contradições mapeadas: {c}')
" <<< "$json_clean" 2>/dev/null || true

  ok "Concluído: $nome"
  echo ""
}

# ─── Main ───
main() {
  local mode="single" dry_run="false" assistido_nome=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --batch) mode="batch"; shift ;;
      --dry-run) dry_run="true"; shift ;;
      --help|-h) echo "Uso: $0 <nome> | --batch [--dry-run]"; exit 0 ;;
      *) assistido_nome="$1"; shift ;;
    esac
  done

  command -v claude >/dev/null 2>&1 || { err "claude CLI não encontrado"; exit 1; }
  [ -f "$SKILL_FILE" ] || { err "Skill: $SKILL_FILE não encontrada"; exit 1; }
  extract_skill_prompt

  if [ "$mode" = "single" ]; then
    [ -z "$assistido_nome" ] && { err "Informe nome do assistido"; exit 1; }
    processar_assistido "$assistido_nome"
  else
    log "🔍 Buscando assistidos com '2 - Analisar' no Júri..."
    local nomes
    nomes=$(python3 -c "
import httpx
env = {}
with open('$PROJECT_DIR/.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip().strip('\"')
url, key = env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}
demandas = httpx.get(f'{url}/rest/v1/demandas', headers=headers, params={
    'select': 'assistido_id', 'substatus': 'eq.2 - Analisar', 'deleted_at': 'is.null'
}, timeout=15).json()
aids = list(set(d['assistido_id'] for d in demandas if d.get('assistido_id')))
if not aids:
    exit(0)
ids_str = ','.join(str(x) for x in aids[:80])
assistidos = httpx.get(f'{url}/rest/v1/assistidos', headers=headers, params={
    'select': 'nome', 'id': f'in.({ids_str})'
}, timeout=15).json()
seen = set()
for a in assistidos:
    n = a['nome']
    if n not in seen:
        seen.add(n)
        print(n)
" 2>/dev/null)

    local total=$(echo "$nomes" | grep -c . || echo 0)
    log "📋 $total assistidos"

    if [ "$dry_run" = "true" ]; then
      echo "$nomes"
      exit 0
    fi

    local success=0 fail=0 i=0
    while IFS= read -r nome; do
      [ -z "$nome" ] && continue
      i=$((i + 1))
      log "━━━ PROCESSANDO $i/$total ━━━"
      if processar_assistido "$nome"; then
        success=$((success + 1))
      else
        fail=$((fail + 1))
      fi
    done <<< "$nomes"

    log ""
    log "════════════════════════════════"
    ok "Sucesso: $success | Falha: $fail | Total: $total"
    log "════════════════════════════════"
    log ""
    log "Para importar no OMBUDS, use o botão 'Importar do Cowork' em cada assistido."
  fi
}

main "$@"
