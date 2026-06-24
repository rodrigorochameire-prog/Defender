#!/usr/bin/env bash
# Pipeline completo de preparação de audiências para um dia.
#
# Uso:
#   bash .claude/skills-cowork/preparar-audiencias/scripts/run_all.sh 2026-05-05
#
# Variáveis de controle (env):
#   SKIP_SCRAPING=1   — pular scraping PJe (usa só o que já está no Drive)
#   SKIP_ANALISES=1   — pular análises individuais (usa só dados do banco)
#   DRY_RUN=1         — não persiste nada (mostra plano)

set -euo pipefail

DIA="${1:-$(date +%Y-%m-%d)}"
ROOT="/Users/rodrigorochameire/Projetos/Defender"
SKILL_DIR="$ROOT/.claude/skills-cowork/preparar-audiencias"

cd "$ROOT"

echo "=== preparar-audiencias :: $DIA ==="

echo
echo "[1/8] Buscar pauta…"
npx tsx "$SKILL_DIR/scripts/01_buscar_pauta.ts" "$DIA"

echo
echo "[2/8] Detectar duplicatas…"
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  npx tsx "$SKILL_DIR/scripts/02_dedup.ts" "$DIA" --dry-run
else
  npx tsx "$SKILL_DIR/scripts/02_dedup.ts" "$DIA"
fi

echo
echo "[3/8] Verificar pastas no Drive…"
npx tsx "$SKILL_DIR/scripts/03_verificar_pastas.ts" "$DIA"

if [[ "${SKIP_SCRAPING:-0}" != "1" ]]; then
  echo
  echo "[4/8] Scraping PJe (autos digitais)…"
  HEADLESS_FLAG=""
  if [[ "${HEADLESS:-0}" == "1" ]]; then HEADLESS_FLAG="--headless"; fi
  python3 "$SKILL_DIR/scripts/04_scraping.py" "$DIA" $HEADLESS_FLAG || \
    echo "  ⚠ scraping com erros — conferir logs"

  echo
  echo "[4.5/8] Organizar PDFs baixados…"
  python3 "$SKILL_DIR/scripts/05_organizar.py" "$DIA"
fi

if [[ "${SKIP_ANALISES:-0}" != "1" ]]; then
  echo
  echo "[5/8] Planejar análises individuais…"
  python3 "$SKILL_DIR/scripts/06_planejar_analises.py" "$DIA"
  echo
  echo "  → /tmp/plano-analises-$DIA.json gerado."
  echo "  → A skill master orchestrator deve agora invocar 'analise-vvd' ou"
  echo "    'analise-juri' por audiência (passo executado pelo Claude Code)."
  echo "  → Após cada análise, montar /tmp/registros-$DIA.json e rodar passo [6]."
fi

echo
echo "[6/8] Popular OMBUDS com registros estruturados…"
if [[ -f "/tmp/registros-$DIA.json" ]]; then
  npx tsx "$SKILL_DIR/scripts/07_popular_ombuds.ts" "/tmp/registros-$DIA.json"
else
  echo "  ⚠ /tmp/registros-$DIA.json não existe — passo dependerá da execução"
  echo "    das análises individuais pelo orchestrator."
fi

echo
echo "[7/8] Re-buscar pauta (com registros atualizados)…"
npx tsx "$SKILL_DIR/scripts/01_buscar_pauta.ts" "$DIA"

echo
echo "[8/8] Gerar relatório consolidado…"
python3 "$SKILL_DIR/scripts/08_gerar_relatorio_consolidado.py" "$DIA"

echo
echo "=== concluído ==="
