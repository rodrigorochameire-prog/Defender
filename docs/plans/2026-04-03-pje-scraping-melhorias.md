# PJe Scraping Pipeline — Melhorias Planejadas

**Data:** 2026-04-03
**Status:** Planejado (para implementacao futura)
**Contexto:** Investigacao do pipeline atual + avaliacao de Apify MCP e Manus AI

---

## Diagnostico atual

O pipeline PJe funciona em 3 fases:
1. **Enfileirar** — `pje_download_v4.sh` (agent-browser, bash)
2. **Baixar PDFs** — `pje_area_download.py` (Playwright sync)
3. **Upload Drive** — `pje_upload_drive_curl.sh` (curl + OAuth)

**Taxa de sucesso estimada:** ~95%
**Pontos fortes:** Separacao de fases, anti-deteccao, fallback strategies, profile persistence
**Pontos frageis:** Sleeps hardcoded, falhas perdidas, sem metricas, sessao sem heartbeat

---

## Melhorias priorizadas

### Prioridade 1: Fila persistente no Supabase
**Impacto:** Alto | **Esforco:** ~2h

Criar tabela `pje_download_queue` + service `PjeDownloadQueue`:

```sql
CREATE TABLE pje_download_queue (
  id serial PRIMARY KEY,
  numero_processo text NOT NULL,
  link_pje text,
  fase text DEFAULT 'enqueue',        -- enqueue | download | upload
  status text DEFAULT 'pending',      -- pending | processing | success | failed
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  error_type text,                    -- not_found | timeout | session_expired | ui_changed
  error_message text,
  file_path text,
  drive_file_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

```python
# enrichment-engine/services/pje_queue_service.py
class PjeDownloadQueue:
    async def enqueue(self, numero_processo, link_pje=None)
    async def get_pending(self, fase, limit=10)
    async def mark_success(self, numero_processo, fase, metadata={})
    async def mark_failure(self, numero_processo, fase, error_type, error_msg)
    async def get_retryable(self, fase)  # retry_count < max_retries AND error_type retryable
```

**Beneficios:**
- Reprocessar apenas falhas, sem rodar batch inteiro
- Rastrear padroes de erro ao longo do tempo
- Sobreviver a crashes/reinicializacoes
- Base para alertas e dashboard

---

### Prioridade 2: Logging estruturado (JSON)
**Impacto:** Alto | **Esforco:** ~2h

Substituir `print()`/`logger.info(texto)` por JSON estruturado em todas as fases:

```python
# Fase 1 (enqueue) - ao final do batch
logger.info(json.dumps({
    "event": "pje_enqueue_batch_complete",
    "batch_id": f"batch-{date}-{seq}",
    "total": 50,
    "queued": 48,
    "not_found": 1,
    "autos_fail": 1,
    "duration_seconds": 3600
}))

# Fase 2 (download) - por processo
logger.info(json.dumps({
    "event": "pje_download_complete",
    "numero_processo": "8015405-36.2022.8.05.0039",
    "status": "success",
    "strategy": "expect_download",  # ou "s3_url" ou "s3_redirect"
    "duration_seconds": 45,
    "file_size_bytes": 2500000
}))

# Fase 3 (upload) - por arquivo
logger.info(json.dumps({
    "event": "pje_upload_complete",
    "numero_processo": "...",
    "drive_file_id": "...",
    "status": "success",
    "duration_seconds": 12
}))
```

**Beneficios:**
- Calcular taxa de sucesso por batch e historicamente
- Identificar gargalos (qual fase demora mais?)
- Detectar anomalias (>10% falha = alerta)

---

### Prioridade 3: Retry com backoff exponencial
**Impacto:** Alto | **Esforco:** ~1h

Decorator reutilizavel para operacoes criticas:

```python
# enrichment-engine/utils/retry.py
import asyncio, functools

def retry_with_backoff(max_attempts=3, initial_delay=2, max_delay=60,
                       retryable_exceptions=(TimeoutError, ConnectionError)):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as e:
                    if attempt == max_attempts:
                        raise
                    logger.warning(f"Attempt {attempt} failed: {e}. Retrying in {delay}s")
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, max_delay)
        return wrapper
    return decorator
```

Aplicar em:
- `pje_area_download.py` — download de PDF
- `pje_upload_drive_curl.sh` (ou versao Python) — upload Drive
- `pje_auth_service.py` — login Keycloak

---

### Prioridade 4: Waits adaptativos (substituir sleeps hardcoded)
**Impacto:** Medio | **Esforco:** ~3h

Atual (fragil):
```bash
sleep 15
ab open "..."
```

Proposto:
```bash
wait_for_element() {
    local pattern="$1"
    local timeout="${2:-30}"
    for i in $(seq 1 $timeout); do
        snap=$(ab snapshot 2>/dev/null)
        if echo "$snap" | grep -q "$pattern"; then
            return 0
        fi
        sleep 1
    done
    return 1
}

# Uso
wait_for_element 'LayoutTable "Peticionar"' 30 || { log_error "timeout"; continue; }
```

**Sleeps a substituir em `pje_download_v4.sh`:**
- `sleep 8` apos login → `wait_for_element "Painel"`
- `sleep 12` apos click login → `wait_for_element "advogado"`
- `sleep 15` click Autos Digitais → `wait_for_element "Cronologia"`
- `sleep 6` confirmacao download → `wait_for_element "sucesso\|fila"`

---

### Prioridade 5: Heartbeat de sessao
**Impacto:** Medio | **Esforco:** ~1h

Checar proativamente se a sessao PJe ainda e valida:

```python
# enrichment-engine/services/pje_auth_service.py
async def check_session_alive(self, page) -> bool:
    """Verifica se sessao PJe ainda e valida sem navegar para fora."""
    indicators_of_logout = [
        "sso.cloud.pje" in page.url,           # Redirecionou pro Keycloak
        await page.query_selector("#username"),  # Tela de login apareceu
        await page.query_selector(".kc-feedback-text"),  # Erro Keycloak
    ]
    return not any(indicators_of_logout)
```

Chamar:
- A cada 10 processos no batch
- Antes de cada download na Fase 2
- Se qualquer operacao retornar resultado inesperado

---

### Prioridade 6: Classificacao de falhas
**Impacto:** Medio | **Esforco:** ~1h

Diferenciar tipos de erro para decidir retry automaticamente:

```python
class PjeErrorType:
    NOT_FOUND = "not_found"           # Processo nao existe → NAO retentar
    TIMEOUT = "timeout"               # Rede lenta → retentar
    SESSION_EXPIRED = "session_expired"  # Login expirou → relogin + retentar
    UI_CHANGED = "ui_changed"         # Seletor nao encontrado → reportar bug
    DRIVE_QUOTA = "drive_quota"       # Quota Drive → esperar + retentar
    DOWNLOAD_CORRUPT = "corrupt"      # Arquivo <10KB → retentar
    S3_EXPIRED = "s3_expired"         # URL S3 expirou → re-enfileirar

RETRYABLE = {PjeErrorType.TIMEOUT, PjeErrorType.SESSION_EXPIRED,
             PjeErrorType.DRIVE_QUOTA, PjeErrorType.DOWNLOAD_CORRUPT,
             PjeErrorType.S3_EXPIRED}
```

---

## Descartados (nao implementar)

### Apify MCP
**Motivo:** PJe requer certificado digital local + CDP granular (Fetch, Target.setAutoAttach). Apify roda em cloud, nao acessa certificado nem expoe CDP de baixo nivel. Custo adicional sem beneficio.

### Manus AI para PJe
**Motivo:** Sandbox cloud nao acessa sessao local do Chrome nem certificado. Util para scraping publico mas nao para PJe autenticado.

### Crawl4AI (adiado)
**Motivo:** Requer reescrita de seletores DOM → extracao LLM. Avaliar apos melhorias 1-6 estarem estaveis. Pode ser util para extrair dados de movimentacoes (texto nao-estruturado).

---

## Evolucao futura (ja planejada)

### Chrome Extension v2
Documentado em `docs/plans/2026-03-25-pje-scraping-escalabilidade.md`.
Eliminaria Playwright inteiro — roda dentro do browser do defensor, usa sessao ja autenticada. Logica DOM portavel para `content-script.js`.

---

## Ordem de implementacao sugerida

| # | Melhoria | Esforco | Depende de |
|---|----------|---------|------------|
| 1 | Fila Supabase | ~2h | — |
| 2 | Logging estruturado | ~2h | — |
| 3 | Retry backoff | ~1h | — |
| 4 | Waits adaptativos | ~3h | — |
| 5 | Heartbeat sessao | ~1h | — |
| 6 | Classificacao falhas | ~1h | #1 (fila) |

Items 1-3 podem ser implementados em paralelo. Item 6 depende da fila (#1).
**Meta:** Elevar taxa de sucesso de ~95% para ~99%+.
