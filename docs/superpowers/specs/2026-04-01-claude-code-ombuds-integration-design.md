# Claude Code ↔ OMBUDS Integration — Direct Database Architecture

**Data:** 2026-04-01
**Status:** Aprovado
**Autor:** Rodrigo + Claude

## Problema

O pipeline atual (OMBUDS → Cowork → Drive → Inngest → banco) é frágil, lento, e depende de intermediários desnecessários (JSON no Drive, Drive sync, Inngest polling). O Cowork worker (`claude -p` com `--system-prompt-file`) foi descontinuado.

## Solução

Claude Code CLI grava análises **direto no Supabase**, sem intermediários. Um Mac Mini funciona como worker dedicado 24/7, processando jobs de análise enfileirados pelo OMBUDS em produção.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    OMBUDS (qualquer ambiente)            │
│                                                         │
│  Botão "Analisar" → INSERT analysis_jobs (pending)      │
│  UI polling → mostra status → exibe AnalysisPanel       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                              │
│                                                         │
│  analysis_jobs (fila)  │  processos.analysis_data       │
│  - id, processo_id     │  - jsonb com resultado         │
│  - skill, prompt       │  - analysis_status             │
│  - status (pending/    │  - analyzed_at                 │
│    running/completed/  │  - analysis_version            │
│    failed)             │                                │
│  - created_at          │                                │
│  - started_at          │                                │
│  - completed_at        │                                │
│  - error               │                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    MAC MINI (worker 24/7)                │
│                                                         │
│  worker.sh (LaunchAgent)                                │
│    → Poll analysis_jobs a cada 30s                      │
│    → Job pending? Marca running, spawna claude -p       │
│    → Claude Code lê Drive, analisa, grava no Supabase   │
│    → Marca job completed                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    MACBOOK PRO (terminal)                │
│                                                         │
│  Claude Code direto → Supabase MCP → analysis_data      │
│  (sem fila, instantâneo)                                │
└─────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Migration: tabela `analysis_jobs`

```sql
CREATE TABLE analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES processos(id),
  skill VARCHAR(50) NOT NULL,           -- 'juri', 'criminal-comum', 'vvd', etc
  prompt TEXT NOT NULL,                  -- prompt completo com contexto do caso
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
  result JSONB,                         -- resultado da análise (opcional, grava direto em processos)
  error TEXT,                           -- mensagem de erro se failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)  -- quem solicitou
);

CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status) WHERE status = 'pending';
```

### 2. Worker script (Mac Mini)

```bash
#!/bin/bash
# worker.sh — Analysis job worker
# Roda como LaunchAgent no Mac Mini

SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
SUPABASE_KEY="<service_role_key>"
POLL_INTERVAL=30
DRIVE_PATH="$HOME/Meu Drive/1 - Defensoria 9ª DP"
SKILLS_PATH="$DRIVE_PATH/_harmonizacao"

while true; do
  # Buscar próximo job pendente
  JOB=$(curl -s "$SUPABASE_URL/rest/v1/analysis_jobs?status=eq.pending&order=created_at.asc&limit=1" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY")

  JOB_ID=$(echo "$JOB" | jq -r '.[0].id // empty')

  if [ -n "$JOB_ID" ]; then
    PROMPT=$(echo "$JOB" | jq -r '.[0].prompt')
    SKILL=$(echo "$JOB" | jq -r '.[0].skill')
    PROCESSO_ID=$(echo "$JOB" | jq -r '.[0].processo_id')

    # Marcar como running
    curl -s -X PATCH "$SUPABASE_URL/rest/v1/analysis_jobs?id=eq.$JOB_ID" \
      -H "apikey: $SUPABASE_KEY" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"status\": \"running\", \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

    # Executar Claude Code CLI
    RESULT=$(claude -p "$PROMPT

Ao final da análise, grave o resultado no banco executando UPDATE via Supabase MCP:
UPDATE processos SET analysis_data = '<JSON da análise>', analysis_status = 'completed', analyzed_at = NOW(), analysis_version = COALESCE(analysis_version, 0) + 1 WHERE id = '$PROCESSO_ID';" \
      --add-dir "$DRIVE_PATH" \
      --add-dir "$SKILLS_PATH" \
      2>&1)

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
      # Marcar como completed
      curl -s -X PATCH "$SUPABASE_URL/rest/v1/analysis_jobs?id=eq.$JOB_ID" \
        -H "apikey: $SUPABASE_KEY" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"status\": \"completed\", \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    else
      # Marcar como failed
      ERROR=$(echo "$RESULT" | tail -5 | jq -Rs .)
      curl -s -X PATCH "$SUPABASE_URL/rest/v1/analysis_jobs?id=eq.$JOB_ID" \
        -H "apikey: $SUPABASE_KEY" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"status\": \"failed\", \"completed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"error\": $ERROR}"
    fi
  fi

  sleep $POLL_INTERVAL
done
```

### 3. LaunchAgent (Mac Mini — inicia no boot)

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
        <string>/Users/rodrigo/ombuds-worker/worker.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/rodrigo/ombuds-worker/logs/worker.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/rodrigo/ombuds-worker/logs/worker-error.log</string>
</dict>
</plist>
```

### 4. API route atualizada (OMBUDS)

`/api/analyze/route.ts` — substitui `/api/cowork/analyze`

```typescript
// POST /api/analyze
// Enfileira job de análise — funciona em qualquer ambiente
export async function POST(req: Request) {
  const { processoId, skill } = await req.json();

  // Buscar contexto do processo no banco
  const processo = await db.query.processos.findFirst({
    where: eq(processos.id, processoId),
    with: { assistido: true }
  });

  // Montar prompt com contexto
  const prompt = buildAnalysisPrompt(processo, skill);

  // INSERT na fila
  await db.insert(analysisJobs).values({
    processoId,
    skill,
    prompt,
    status: 'pending',
    createdBy: session.userId,
  });

  // Atualizar status do processo
  await db.update(processos)
    .set({ analysisStatus: 'queued' })
    .where(eq(processos.id, processoId));

  return Response.json({ status: 'queued' });
}
```

### 5. UI de status no OMBUDS

O AnalysisPanel já existe. Adicionar:
- Badge "Analisando..." quando `analysis_status = 'queued' | 'running'`
- Polling a cada 10s para detectar `completed`
- Toast de notificação quando análise fica pronta

## Plano de implementação (ordem)

1. **Migration** — criar tabela `analysis_jobs`
2. **API route** — `/api/analyze` com INSERT na fila
3. **Worker script** — `worker.sh` com polling + spawn Claude Code
4. **LaunchAgent** — configurar no Mac Mini
5. **UI** — badge de status + polling no AnalysisPanel
6. **Teste** — botão no OMBUDS produção → Mac Mini processa → resultado aparece

## Decisões

- **Sem JSON no Drive**: resultado grava direto no `processos.analysis_data`
- **Sem Inngest**: polling simples no worker (30s), polling simples no frontend (10s)
- **Sem custo de API**: tudo via Claude Code CLI (grátis)
- **Mac Mini = worker 24/7**: LaunchAgent garante uptime
- **Fallback**: se Mac Mini estiver off, job fica pending na fila até ligar
