# Claude Code ↔ OMBUDS Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OMBUDS enfileira análises no Supabase, Mac Mini worker processa via Claude Code CLI (grátis) e grava resultado direto no banco.

**Architecture:** Tabela `analysis_jobs` como fila. Worker bash no Mac Mini poll 30s, spawna `claude -p`, grava em `processos.analysis_data` via Supabase REST API. Frontend poll 10s para exibir resultado.

**Tech Stack:** Drizzle ORM, PostgreSQL/Supabase, Next.js API routes, Bash worker, LaunchAgent macOS, Claude Code CLI

**Spec:** `docs/superpowers/specs/2026-04-01-claude-code-ombuds-integration-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/db/schema/core.ts` | Modify | Add `analysisJobs` table definition |
| `drizzle/XXXX_analysis_jobs.sql` | Create (generated) | Migration SQL |
| `src/app/api/analyze/route.ts` | Create | New API route: INSERT job na fila |
| `src/app/api/cowork/analyze/route.ts` | Modify | Deprecar, redirecionar para `/api/analyze` |
| `src/components/shared/cowork-action-button.tsx` | Modify | Chamar `/api/analyze` em vez de `/api/cowork/analyze` |
| `src/components/analysis/analysis-panel.tsx` | Modify | Adicionar badge de status (queued/running) |
| `worker/worker.sh` | Create | Worker bash para Mac Mini |
| `worker/com.ombuds.analysis-worker.plist` | Create | LaunchAgent para Mac Mini |
| `worker/install.sh` | Create | Script de instalação do worker |

---

### Task 1: Schema — tabela `analysis_jobs`

**Files:**
- Modify: `src/lib/db/schema/core.ts`

- [ ] **Step 1: Adicionar tabela `analysisJobs` no schema**

No final de `src/lib/db/schema/core.ts`, antes do fechamento, adicionar:

```typescript
export const analysisJobs = pgTable("analysis_jobs", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id),
  skill: varchar("skill", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("analysis_jobs_status_idx").on(table.status),
  processoIdx: index("analysis_jobs_processo_idx").on(table.processoId),
}));
```

- [ ] **Step 2: Gerar migration**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run db:generate`
Expected: Migration file criado em `drizzle/`

- [ ] **Step 3: Aplicar migration**

Run: `npm run db:push`
Expected: Tabela `analysis_jobs` criada no Supabase

- [ ] **Step 4: Verificar no Supabase**

Run: `npx drizzle-kit studio` ou verificar via Supabase Dashboard
Expected: Tabela visível com colunas corretas

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema/core.ts drizzle/
git commit -m "feat: add analysis_jobs queue table for Claude Code worker"
```

---

### Task 2: API route — `/api/analyze`

**Files:**
- Create: `src/app/api/analyze/route.ts`

- [ ] **Step 1: Criar a nova API route**

```typescript
import { NextResponse } from "next/server";
import { db } from "~/lib/db";
import { processos, assistidos, analysisJobs } from "~/lib/db/schema/core";
import { eq } from "drizzle-orm";

const SKILL_PROMPTS: Record<string, { coworkSkill: string; instruction: string }> = {
  "analise-autos": {
    coworkSkill: "analise-audiencias",
    instruction: "Analise os autos do processo de forma estratégica, identificando pontos-chave, contradições, nulidades e teses defensivas.",
  },
  "preparar-audiencia": {
    coworkSkill: "analise-audiencias",
    instruction: "Prepare um briefing para audiência, com perguntas estratégicas por testemunha e orientação ao assistido.",
  },
  "gerar-peca": {
    coworkSkill: "dpe-ba-pecas",
    instruction: "Gere a peça processual adequada com base nos autos e na fase processual.",
  },
  "analise-juri": {
    coworkSkill: "juri",
    instruction: "Realize análise estratégica completa para o Tribunal do Júri, incluindo teses, quesitos e preparação de plenário.",
  },
};

export async function POST(req: Request) {
  try {
    const { processoId, skill = "analise-autos" } = await req.json();

    if (!processoId) {
      return NextResponse.json({ error: "processoId é obrigatório" }, { status: 400 });
    }

    const processo = await db.query.processos.findFirst({
      where: eq(processos.id, processoId),
    });

    if (!processo) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    const assistido = processo.assistidoId
      ? await db.query.assistidos.findFirst({
          where: eq(assistidos.id, processo.assistidoId),
        })
      : null;

    const skillConfig = SKILL_PROMPTS[skill] || SKILL_PROMPTS["analise-autos"];
    const assistidoNome = assistido?.nome || "Assistido não identificado";

    const prompt = [
      skillConfig.instruction,
      "",
      `Processo: ${processo.numeroAutos}`,
      `Assistido: ${assistidoNome}`,
      `Atribuição: ${processo.atribuicao || "não informada"}`,
      `Vara: ${processo.vara || "não informada"}`,
      `Classe: ${processo.classeProcessual || "não informada"}`,
      "",
      `Busque os autos e transcrições na pasta do assistido no Drive: Processos - Júri/${assistidoNome}/ ou Processos/${assistidoNome}/`,
      "",
      `IMPORTANTE: Ao final da análise, grave o resultado no banco de dados executando via Supabase MCP:`,
      `UPDATE processos SET`,
      `  analysis_data = '<JSON com resumo, teses, nulidades, kpis, etc>',`,
      `  analysis_status = 'completed',`,
      `  analyzed_at = NOW(),`,
      `  analysis_version = COALESCE(analysis_version, 0) + 1`,
      `WHERE id = ${processoId};`,
    ].join("\n");

    // Enfileirar job
    await db.insert(analysisJobs).values({
      processoId,
      skill,
      prompt,
      status: "pending",
    });

    // Marcar processo como queued
    await db
      .update(processos)
      .set({ analysisStatus: "queued" })
      .where(eq(processos.id, processoId));

    return NextResponse.json({
      success: true,
      message: `Análise enfileirada para ${assistidoNome}`,
      skill,
      processo: processo.numeroAutos,
    });
  } catch (error) {
    console.error("Erro ao enfileirar análise:", error);
    return NextResponse.json(
      { error: "Erro interno ao enfileirar análise" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Testar localmente**

Run: `curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"processoId": 1, "skill": "analise-autos"}'`
Expected: `{"success": true, "message": "Análise enfileirada para ..."}`

- [ ] **Step 3: Verificar job no banco**

Run: Verificar no Supabase que `analysis_jobs` tem um registro com `status = 'pending'`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/analyze/route.ts
git commit -m "feat: add /api/analyze route with job queue"
```

---

### Task 3: Atualizar botão do OMBUDS

**Files:**
- Modify: `src/components/shared/cowork-action-button.tsx`

- [ ] **Step 1: Atualizar chamada API no botão**

Em `cowork-action-button.tsx`, na função de click handler, substituir a chamada ao endpoint antigo:

Trocar:
```typescript
const res = await fetch("/api/cowork/analyze", {
```

Por:
```typescript
const res = await fetch("/api/analyze", {
```

- [ ] **Step 2: Remover restrição de localhost**

Remover o check `window.location.hostname === "localhost"` para que o botão funcione em qualquer ambiente (a fila funciona de qualquer lugar).

Trocar o bloco condicional que checa localhost por chamada direta:

```typescript
try {
  setLoading(true);
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ processoId, skill: action }),
  });

  if (res.ok) {
    const data = await res.json();
    toast.success(data.message || "Análise enfileirada!");
    return;
  }
} catch (error) {
  console.error("Erro ao enfileirar:", error);
}

// Fallback: clipboard (se API falhar)
// ... manter lógica de clipboard existente
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/cowork-action-button.tsx
git commit -m "feat: update action button to use job queue API"
```

---

### Task 4: Badge de status no AnalysisPanel

**Files:**
- Modify: `src/components/analysis/analysis-panel.tsx`

- [ ] **Step 1: Adicionar estados visuais para queued/running**

No header do AnalysisPanel (seção que renderiza o status badge), adicionar tratamento para os novos status:

```typescript
function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;

  const config: Record<string, { label: string; className: string }> = {
    queued: { label: "Na fila...", className: "bg-amber-100 text-amber-700" },
    running: { label: "Analisando...", className: "bg-blue-100 text-blue-700 animate-pulse" },
    completed: { label: "Concluída", className: "bg-emerald-100 text-emerald-700" },
    failed: { label: "Erro", className: "bg-red-100 text-red-700" },
  };

  const c = config[status] || { label: status, className: "bg-zinc-100 text-zinc-600" };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
```

Substituir o badge de status existente no header pela chamada `<StatusBadge status={analysisStatus} />`.

- [ ] **Step 2: Commit**

```bash
git add src/components/analysis/analysis-panel.tsx
git commit -m "feat: add queued/running status badges to analysis panel"
```

---

### Task 5: Worker para Mac Mini

**Files:**
- Create: `worker/worker.sh`
- Create: `worker/com.ombuds.analysis-worker.plist`
- Create: `worker/install.sh`

- [ ] **Step 1: Criar worker.sh**

```bash
#!/bin/bash
# OMBUDS Analysis Worker — Roda no Mac Mini
# Poll analysis_jobs no Supabase, executa via Claude Code CLI

set -euo pipefail

# Config
SUPABASE_URL="${OMBUDS_SUPABASE_URL:-https://hxfvlaeqhkmelvyzgfqp.supabase.co}"
SUPABASE_KEY="${OMBUDS_SUPABASE_SERVICE_KEY}"
POLL_INTERVAL="${OMBUDS_POLL_INTERVAL:-30}"
DRIVE_PATH="${OMBUDS_DRIVE_PATH:-$HOME/Meu Drive/1 - Defensoria 9ª DP}"
SKILLS_PATH="${DRIVE_PATH}/_harmonizacao"
LOG_FILE="${OMBUDS_LOG_FILE:-$HOME/ombuds-worker/logs/worker.log}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Worker iniciado. Polling a cada ${POLL_INTERVAL}s"

while true; do
  # Buscar próximo job pendente (mais antigo primeiro)
  RESPONSE=$(curl -sf \
    "${SUPABASE_URL}/rest/v1/analysis_jobs?status=eq.pending&order=created_at.asc&limit=1" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Accept: application/json" \
    2>/dev/null || echo "[]")

  JOB_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null || echo "")

  if [ -n "$JOB_ID" ]; then
    PROMPT=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['prompt'])")
    SKILL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['skill'])")
    PROCESSO_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['processo_id'])")

    log "Job $JOB_ID encontrado (skill=$SKILL, processo=$PROCESSO_ID). Iniciando..."

    # Marcar como running
    curl -sf -X PATCH \
      "${SUPABASE_URL}/rest/v1/analysis_jobs?id=eq.${JOB_ID}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"status\": \"running\", \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
      >/dev/null 2>&1

    # Atualizar status do processo
    curl -sf -X PATCH \
      "${SUPABASE_URL}/rest/v1/processos?id=eq.${PROCESSO_ID}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d '{"analysis_status": "running"}' \
      >/dev/null 2>&1

    # Executar Claude Code CLI
    CLAUDE_OUTPUT=$(claude -p "${PROMPT}" \
      --add-dir "${DRIVE_PATH}" \
      --add-dir "${SKILLS_PATH}" \
      2>&1) || true

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
      log "Job $JOB_ID completado com sucesso"

      # Marcar job como completed
      curl -sf -X PATCH \
        "${SUPABASE_URL}/rest/v1/analysis_jobs?id=eq.${JOB_ID}" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"status\": \"completed\", \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
        >/dev/null 2>&1
    else
      ERROR_MSG=$(echo "$CLAUDE_OUTPUT" | tail -3 | head -1)
      log "Job $JOB_ID falhou: $ERROR_MSG"

      # Marcar job como failed
      ESCAPED_ERROR=$(echo "$ERROR_MSG" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
      curl -sf -X PATCH \
        "${SUPABASE_URL}/rest/v1/analysis_jobs?id=eq.${JOB_ID}" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"status\": \"failed\", \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"error\": ${ESCAPED_ERROR}}" \
        >/dev/null 2>&1

      # Atualizar processo como failed
      curl -sf -X PATCH \
        "${SUPABASE_URL}/rest/v1/processos?id=eq.${PROCESSO_ID}" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d '{"analysis_status": "failed"}' \
        >/dev/null 2>&1
    fi
  fi

  sleep "$POLL_INTERVAL"
done
```

- [ ] **Step 2: Criar LaunchAgent plist**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ombuds.analysis-worker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/rodrigorochameire/ombuds-worker/worker.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>/Users/rodrigorochameire</string>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/rodrigorochameire/ombuds-worker/logs/worker.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/rodrigorochameire/ombuds-worker/logs/worker-error.log</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
```

- [ ] **Step 3: Criar install.sh**

```bash
#!/bin/bash
# Instala o OMBUDS Analysis Worker no Mac Mini
set -euo pipefail

WORKER_DIR="$HOME/ombuds-worker"
PLIST_NAME="com.ombuds.analysis-worker"
PLIST_DIR="$HOME/Library/LaunchAgents"

echo "=== OMBUDS Analysis Worker Installer ==="

# Criar diretórios
mkdir -p "$WORKER_DIR/logs"

# Copiar arquivos
cp worker.sh "$WORKER_DIR/worker.sh"
chmod +x "$WORKER_DIR/worker.sh"

# Configurar variáveis de ambiente
if [ ! -f "$WORKER_DIR/.env" ]; then
  cat > "$WORKER_DIR/.env" << 'ENVEOF'
# Preencha com sua service_role key do Supabase
export OMBUDS_SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
export OMBUDS_SUPABASE_SERVICE_KEY="PREENCHA_AQUI"
export OMBUDS_DRIVE_PATH="$HOME/Meu Drive/1 - Defensoria 9ª DP"
export OMBUDS_POLL_INTERVAL=30
ENVEOF
  echo "⚠️  Edite $WORKER_DIR/.env com sua SUPABASE_SERVICE_KEY"
fi

# Adicionar source .env no worker.sh
if ! grep -q "source.*\.env" "$WORKER_DIR/worker.sh"; then
  sed -i '' '3i\
source "$HOME/ombuds-worker/.env"
' "$WORKER_DIR/worker.sh"
fi

# Instalar LaunchAgent
cp "$PLIST_NAME.plist" "$PLIST_DIR/$PLIST_NAME.plist"

# Carregar
launchctl unload "$PLIST_DIR/$PLIST_NAME.plist" 2>/dev/null || true
launchctl load "$PLIST_DIR/$PLIST_NAME.plist"

echo ""
echo "✅ Worker instalado!"
echo "   Logs: $WORKER_DIR/logs/worker.log"
echo "   Status: launchctl list | grep ombuds"
echo "   Parar: launchctl unload $PLIST_DIR/$PLIST_NAME.plist"
echo "   Iniciar: launchctl load $PLIST_DIR/$PLIST_NAME.plist"
```

- [ ] **Step 4: Commit**

```bash
git add worker/
git commit -m "feat: add Mac Mini analysis worker with LaunchAgent"
```

---

### Task 6: Deprecar rota antiga

**Files:**
- Modify: `src/app/api/cowork/analyze/route.ts`

- [ ] **Step 1: Redirecionar rota antiga para nova**

Substituir todo o conteúdo de `src/app/api/cowork/analyze/route.ts` por:

```typescript
import { NextResponse } from "next/server";

// DEPRECATED: Use /api/analyze instead
// This route redirects for backward compatibility
export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(new URL("/api/analyze", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cowork/analyze/route.ts
git commit -m "refactor: deprecate /api/cowork/analyze, redirect to /api/analyze"
```

---

### Task 7: Teste end-to-end

- [ ] **Step 1: Iniciar dev server**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npm run dev`

- [ ] **Step 2: Testar enfileiramento via API**

Run:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"processoId": 1, "skill": "analise-juri"}'
```

Expected: `{"success": true, "message": "Análise enfileirada para ..."}`

- [ ] **Step 3: Verificar job na tabela**

Verificar no Supabase Dashboard que `analysis_jobs` contém o job com `status = 'pending'`

- [ ] **Step 4: Testar worker manualmente**

Run (no Mac Mini ou local):
```bash
cd /Users/rodrigorochameire/Projetos/Defender/worker
export OMBUDS_SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
export OMBUDS_SUPABASE_SERVICE_KEY="<sua_key>"
bash worker.sh
```

Expected: Worker detecta job pending, marca running, executa Claude Code, grava no banco

- [ ] **Step 5: Verificar resultado no OMBUDS**

Abrir o processo no OMBUDS (localhost ou produção). O AnalysisPanel deve exibir a análise com badge "Concluída".

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat: complete Claude Code ↔ OMBUDS integration via job queue"
```
