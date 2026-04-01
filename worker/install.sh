#!/bin/bash
# OMBUDS Analysis Worker — Installation script
# Run once on the Mac Mini to set up the worker as a macOS LaunchAgent.

set -euo pipefail

WORKER_DIR="$HOME/ombuds-worker"
LOGS_DIR="$WORKER_DIR/logs"
ENV_FILE="$WORKER_DIR/.env"
WORKER_SCRIPT="$WORKER_DIR/worker.sh"
PLIST_NAME="com.ombuds.analysis-worker.plist"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

# ── 1. Create directories ──────────────────────────────────────────────────────
echo "==> Creating $LOGS_DIR"
mkdir -p "$LOGS_DIR"

# ── 2. Copy worker script ──────────────────────────────────────────────────────
echo "==> Copying worker.sh to $WORKER_SCRIPT"
SRC_WORKER="$(cd "$(dirname "$0")" && pwd)/worker.sh"
cp "$SRC_WORKER" "$WORKER_SCRIPT"

# Prepend env sourcing at the top of the installed copy (after shebang line)
python3 - "$WORKER_SCRIPT" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    lines = f.readlines()

shebang = lines[0] if lines[0].startswith('#!') else ''
rest    = lines[1:] if shebang else lines

source_line = 'source "$HOME/ombuds-worker/.env"\n\n'

# Only add if not already present
if source_line.strip() not in ''.join(rest):
    new_content = shebang + source_line + ''.join(rest)
else:
    new_content = ''.join(lines)

with open(path, 'w') as f:
    f.write(new_content)
PYEOF

chmod +x "$WORKER_SCRIPT"
echo "    Done. Script is executable."

# ── 3. Create .env template if not exists ─────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Creating $ENV_FILE template"
  cat > "$ENV_FILE" <<'ENV'
# OMBUDS Analysis Worker — Environment
# Fill in the values below and re-run install.sh (or restart the LaunchAgent).

OMBUDS_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co
OMBUDS_SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE
OMBUDS_POLL_INTERVAL=30
OMBUDS_DRIVE_PATH=/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP
# OMBUDS_SKILLS_PATH=$HOME/.claude/skills
ENV
  chmod 600 "$ENV_FILE"
  echo "    Created. Edit $ENV_FILE and add your service key before starting the worker."
else
  echo "==> $ENV_FILE already exists — skipping template creation."
fi

# ── 4. Copy plist ─────────────────────────────────────────────────────────────
echo "==> Copying plist to $PLIST_DEST"
mkdir -p "$HOME/Library/LaunchAgents"
cp "$PLIST_SRC" "$PLIST_DEST"
echo "    Done."

# ── 5. Load LaunchAgent ────────────────────────────────────────────────────────
echo "==> Loading LaunchAgent"

# Unload first if already loaded (ignore errors)
launchctl unload "$PLIST_DEST" 2>/dev/null || true

if launchctl load "$PLIST_DEST"; then
  echo "    LaunchAgent loaded successfully."
else
  echo "    WARNING: launchctl load returned a non-zero exit code."
  echo "    Try: launchctl load $PLIST_DEST"
fi

# ── 6. Status & instructions ──────────────────────────────────────────────────
echo ""
echo "==========================================="
echo "  OMBUDS Worker installation complete"
echo "==========================================="
echo ""
echo "  Worker dir  : $WORKER_DIR"
echo "  Logs        : $LOGS_DIR/worker.log"
echo "  Error log   : $LOGS_DIR/worker-error.log"
echo "  .env file   : $ENV_FILE"
echo ""
echo "  IMPORTANT: Make sure OMBUDS_SUPABASE_SERVICE_KEY is set in:"
echo "    $ENV_FILE"
echo ""
echo "  To check status:"
echo "    launchctl list | grep ombuds"
echo ""
echo "  To view live logs:"
echo "    tail -f $LOGS_DIR/worker.log"
echo ""
echo "  To stop the worker:"
echo "    launchctl unload $PLIST_DEST"
echo ""
echo "  To restart the worker:"
echo "    launchctl unload $PLIST_DEST && launchctl load $PLIST_DEST"
echo ""
