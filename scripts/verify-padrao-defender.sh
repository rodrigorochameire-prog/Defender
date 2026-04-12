#!/usr/bin/env bash
# verify-padrao-defender.sh — TDD gate for Padrão Defender v5 rollout
# Usage: ./scripts/verify-padrao-defender.sh
# Exit: 0 = all checks pass, 1 = one or more violations

set -euo pipefail

ERRORS=0
PASS="✓"
FAIL="✗"

# Coloring (safe fallback if no tty)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN=''
  RED=''
  YELLOW=''
  BOLD=''
  NC=''
fi

pass() { echo -e "${GREEN}${PASS}${NC} $1"; }
fail() { echo -e "${RED}${FAIL}${NC} $1"; ERRORS=$((ERRORS + 1)); }
header() { echo -e "\n${BOLD}$1${NC}"; }

echo -e "${BOLD}Padrão Defender v5 — Verification Script${NC}"
echo "────────────────────────────────────────"

# ════════════════════════════════════════════
# CHECK 1 — Design Tokens
# ════════════════════════════════════════════
header "Check 1: Design tokens (src/lib/config/design-tokens.ts)"

TOKENS_FILE="src/lib/config/design-tokens.ts"

if [ ! -f "$TOKENS_FILE" ]; then
  fail "File not found: $TOKENS_FILE"
else
  # 1a — container token
  if grep -qF 'container: "rounded-xl bg-[#414144]"' "$TOKENS_FILE"; then
    pass "container: \"rounded-xl bg-[#414144]\" present"
  else
    fail "container token missing or incorrect (expected: container: \"rounded-xl bg-[#414144]\")"
  fi

  # 1b — utilityRow token
  if grep -qF 'utilityRow: "bg-[#464649] border-b border-white/[0.08]"' "$TOKENS_FILE"; then
    pass "utilityRow: \"bg-[#464649] border-b border-white/[0.08]\" present"
  else
    fail "utilityRow token missing or incorrect (expected: utilityRow: \"bg-[#464649] border-b border-white/[0.08]\")"
  fi

  # 1c — collapsedBar token (prefix match)
  if grep -qF 'collapsedBar: "bg-[#464649]' "$TOKENS_FILE"; then
    pass "collapsedBar: \"bg-[#464649]...\" present (prefix match)"
  else
    fail "collapsedBar token missing or does not start with bg-[#464649]"
  fi

  # 1d — shellShadow key
  if grep -q 'shellShadow:' "$TOKENS_FILE"; then
    pass "shellShadow: key present"
  else
    fail "shellShadow: key missing in $TOKENS_FILE"
  fi
fi

# ════════════════════════════════════════════
# CHECK 2 — Sidebar CSS
# ════════════════════════════════════════════
header "Check 2: Sidebar CSS (src/app/globals.css)"

GLOBALS_FILE="src/app/globals.css"

if [ ! -f "$GLOBALS_FILE" ]; then
  fail "File not found: $GLOBALS_FILE"
else
  # 2a — light sidebar
  if grep -q 'background: #3e3e41' "$GLOBALS_FILE"; then
    pass "background: #3e3e41 present (light sidebar)"
  else
    fail "background: #3e3e41 missing in globals.css (light sidebar)"
  fi

  # 2b — dark sidebar
  if grep -q 'background: #232324' "$GLOBALS_FILE"; then
    pass "background: #232324 present (dark sidebar)"
  else
    fail "background: #232324 missing in globals.css (dark sidebar)"
  fi

  # 2c — medium body
  if grep -q 'background-color: #f5f5f5' "$GLOBALS_FILE"; then
    pass "background-color: #f5f5f5 present (medium body)"
  else
    fail "background-color: #f5f5f5 missing in globals.css (medium body)"
  fi
fi

# ════════════════════════════════════════════
# CHECK 3 — No forbidden hexes in admin pages
# ════════════════════════════════════════════
header "Check 3: No forbidden hexes in src/app/(dashboard)/admin/"

ADMIN_DIR="src/app/(dashboard)/admin"

if [ ! -d "$ADMIN_DIR" ]; then
  fail "Admin directory not found: $ADMIN_DIR"
else
  # Forbidden hexes: old page bgs + old shell + blue experiment
  FORBIDDEN_HEXES=(
    "f0f0f0"
    "f0f0ee"
    "f2f1ef"
    "fafafa"
    "383838"
    "3a3a3a"
    "424242"
    "3e3e3e"
    "33373d"
    "3a3e46"
    "3c4049"
    "41454d"
    "1f2229"
    "24272e"
    "f6f7f9"
  )

  CHECK3_ERRORS=0
  for HEX in "${FORBIDDEN_HEXES[@]}"; do
    # grep for bg-[#HEX] — escape brackets for grep -E
    MATCHES=$(grep -rE "bg-\[#${HEX}\]" "$ADMIN_DIR" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" -l 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      fail "Forbidden hex bg-[#${HEX}] found in:"
      echo "$MATCHES" | while IFS= read -r f; do
        echo "    → $f"
      done
      CHECK3_ERRORS=$((CHECK3_ERRORS + 1))
    fi
  done

  if [ $CHECK3_ERRORS -eq 0 ]; then
    pass "No forbidden hexes found in admin pages"
  fi
fi

# ════════════════════════════════════════════
# CHECK 4 — AtribuicaoPills — no bg-emerald-500
# ════════════════════════════════════════════
header "Check 4: AtribuicaoPills.tsx — no bg-emerald-500"

PILLS_FILE="src/components/demandas-premium/AtribuicaoPills.tsx"

if [ ! -f "$PILLS_FILE" ]; then
  fail "File not found: $PILLS_FILE"
else
  if grep -q 'bg-emerald-500' "$PILLS_FILE"; then
    OFFENDING=$(grep -n 'bg-emerald-500' "$PILLS_FILE" | head -5)
    fail "bg-emerald-500 still present in AtribuicaoPills.tsx (emerald underline NOT reverted):"
    echo "$OFFENDING" | while IFS= read -r line; do
      echo "    → $line"
    done
  else
    pass "bg-emerald-500 NOT present in AtribuicaoPills.tsx"
  fi
fi

# ════════════════════════════════════════════
# CHECK 5 — Kanban status badge pattern
# ════════════════════════════════════════════
header "Check 5: Kanban badge pattern (kanban-premium.tsx)"

KANBAN_FILE="src/components/demandas-premium/kanban-premium.tsx"

if [ ! -f "$KANBAN_FILE" ]; then
  fail "File not found: $KANBAN_FILE"
else
  # Check for subtle fill pattern: ${groupColor}14
  if grep -qE '\$\{groupColor\}14' "$KANBAN_FILE"; then
    pass "\${groupColor}14 (subtle fill) pattern found"
  else
    fail "\${groupColor}14 subtle fill pattern NOT found in kanban-premium.tsx"
  fi

  # Check for visible border pattern: borderColor: ...groupColor...40
  if grep -qE 'borderColor.*groupColor.*40' "$KANBAN_FILE"; then
    pass "borderColor: \${groupColor}40 (visible border) pattern found"
  else
    fail "borderColor: \${groupColor}40 visible border pattern NOT found in kanban-premium.tsx"
  fi
fi

# ════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════
echo ""
echo "────────────────────────────────────────"
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed. Padrão Defender v5 compliant.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}${ERRORS} check(s) failed.${NC} See details above."
  exit 1
fi
