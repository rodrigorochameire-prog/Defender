# Plano: Daemon de Duas Lanes + Browser Broker (CDP + Patchright + Chromium)

## Data: 2026-06-21
## Status: Fases 0 e 1 implementadas (2026-06-21) — pendente deploy no Mac Mini. Próxima: Fase 2 (browser broker com Chromium quente)

---

## 1. Contexto e Problema

Hoje o OMBUDS tem **dois planos de execução desconexos**:

| Plano | Runtime | Disparo | Observabilidade | Reuso de sessão |
|-------|---------|---------|-----------------|-----------------|
| **Análise IA** (juri, vvd, classify-document, peças) | daemon → `claude -p` | fila `claude_code_tasks`, autônomo | `/admin/daemon` | n/a |
| **Automação de browser** (PJe download/intimações/triagem, Solar read/write) | scripts Python avulsos | **humano roda na mão** | nenhuma | login frio a cada run |

O daemon (`scripts/claude-code-daemon.mjs`) só sabe despachar `claude -p` — `processTask()` (linha 211) é hardcoded no fluxo de IA. Toda a engenharia de confiabilidade já existe e é reaproveitável: lock otimista, reaper de zumbis (15 min), heartbeat, Realtime com reconnect/backoff, catch-up de 60s.

Os scrapers (`scripts/pje_area_download.py`, `.claude/skills/varredura-triagem/scripts/varredura_triagem.py`, `enrichment-engine/services/solar_*.py`) **já usam CDP + Patchright + Chromium**. O `varredura_triagem.py` inclusive já tem `--modo cdp` que anexa a um Chromium em `:9222`. Falta só **quem mantém esse Chromium vivo** e **quem enfileira/observa** essas tarefas — hoje é um humano abrindo janela e rodando script.

### Objetivo

Dar ao daemon uma **segunda lane** (`browser`) que despacha tarefas de automação contra uma **sessão Chromium persistente e quente** (Patchright, perfil persistente, CDP em `:9222`), gerenciada como serviço. Com isso:

1. Scraping vira **enfileirável, agendável e observável** no dashboard que já existe.
2. Sessão **não esfria** — sem re-login frio a cada run (menos eventos de auth no Keycloak = menos suspeita de bot, não mais).
3. **Fecha o loop OMBUDS → Solar**: anotação criada no OMBUDS → tarefa `solar-write` → broker registra Fase Processual → marca `anotacoes.solarSyncedAt`. O serviço (`solar_write_service.py`) e as colunas já existem; falta o gatilho autônomo.

> As duas perguntas que originaram este plano ("integração com o Solar" e "daemon ativando skill via CDP+Patchright+Chromium") **colapsam na mesma arquitetura**: a integração Solar-write é a primeira skill que a lane `browser` executa.

---

## 2. Estado Atual (verificado no código)

- **Solar READ**: implementado — `enrichment-engine/services/solar_scraper_service.py` (Playwright + injeção de scope AngularJS).
- **Solar WRITE**: especificado em `docs/plans/2026-02-24-sync-ombuds-to-solar.md`, serviço base em `solar_write_service.py`. Bloqueante declarado: **discovery dos formulários** (Fase 0 daquele plano). Colunas `anotacoes.solar_synced_at` / `solar_fase_id` já no schema.
- **PJe**: `pje_area_download.py` usa `new_cdp_session` para diálogos JSF cross-origin; perfil persistente em `~/.pje-playwright-profile`. Relogin a cada 8 processos (ViewState).
- **Triagem**: `varredura_triagem.py` com `--modo cdp` (anexa a `:9222`) / `--modo direct` (headless com login programático).
- **Daemon**: serial (um `activeChild` por vez), `claude_code_tasks` com colunas `skill`, `prompt`, `instrucao_adicional`, `status`, `etapa`, `resultado`, `erro`, `started_at`. Reaper em `src/lib/daemon/task-lifecycle.mjs` (`selectZombieIds`, `ZOMBIE_TIMEOUT_MS`).

---

## 3. Arquitetura Proposta

```
                       claude_code_tasks  (fila existente + coluna `lane`)
                                  │
           ┌──────────────────────┴──────────────────────────┐
           │                                                  │
      lane = "ai"                                       lane = "browser"
   daemon-ai (atual)                              daemon-browser (NOVO)
   claude -p  (inalterado)                        │ spawn worker Python
                                                  │ (anexa via CDP, sem re-login)
                                                  ▼
                              ┌───────────────────────────────────────────┐
                              │  BROWSER BROKER  (processo do daemon-browser)│
                              │  1 Chromium quente — Patchright              │
                              │  perfil persistente, --remote-debugging-port │
                              │  =9222, sessão Keycloak mantida viva         │
                              │  contexto-A: PJe     contexto-B: Solar       │
                              └───────────────────────────────────────────┘
```

### 3.1 Por que duas lanes e não uma fila só

O daemon atual é **estritamente serial** (`activeChild`, um child). Downloads de autos chegam a 183 MB e levam minutos; se compartilhassem o mesmo loop, **matariam a vazão das tarefas de IA** (e vice-versa). Solução: **dois consumidores independentes da mesma tabela**, cada um filtrando por `lane`, cada um serial *dentro de si*.

- `daemon-ai`: `...where status='pending' AND lane='ai'` — é o daemon de hoje, com filtro adicional.
- `daemon-browser`: `...where status='pending' AND lane='browser'` — novo processo que **também** é o broker (lança o Chromium no startup, mantém vivo, e a cada tarefa faz spawn de um worker Python que anexa via CDP).

Ambos assinam o mesmo canal Realtime; o lock otimista (`UPDATE ... WHERE id=X AND status='pending'`) já impede processamento duplo, então a checagem de `lane` em `processTask` basta. Heartbeats separados (`claude-code-daemon` e `browser-broker`) para o dashboard distinguir os dois.

### 3.2 Broker = consumidor + dono do Chromium (mesmo processo)

O `daemon-browser`:
1. No startup, lança **um** Chromium via Patchright (`launch_persistent_context`, perfil dedicado, `--remote-debugging-port=9222`). Headed (menos detectável; gov system).
2. Mantém **dois contextos isolados** — PJe e Solar — para que um crash não derrube a sessão do outro.
3. A cada tarefa `browser`, faz spawn de um **worker Python curto** que **anexa via CDP** ao Chromium quente (reusa o `--modo cdp` que `varredura_triagem.py` já tem) — em vez de lançar browser novo e re-logar.
4. Roda um **session-health check** periódico; quando o token Keycloak expira e o re-auth precisa de 2FA, **expõe estado `needs-login` no `/admin/daemon`** em vez de falhar em silêncio.

### 3.3 Fronteira de linguagem (decisão: manter Python)

Daemon é Node; scrapers são Python. **Não reescrever**. O `daemon-browser` (Node) faz `spawn` do worker Python exatamente como o daemon atual faz `spawn` do `claude` (mesmo padrão `runClaude` → `runBrowserWorker`). Reuso de 100% dos scripts existentes; a persistência do browser vive no processo Node que segura o handle do Chromium e expõe a porta CDP que o worker Python consome.

---

## 4. Mudanças de Schema

```sql
-- Lane de execução (default 'ai' = comportamento atual, zero-migração-de-dados)
ALTER TABLE claude_code_tasks ADD COLUMN lane TEXT NOT NULL DEFAULT 'ai';
CREATE INDEX claude_code_tasks_lane_status_idx ON claude_code_tasks (lane, status);
```

Drizzle (`src/lib/db/schema/casos.ts`, tabela `claudeCodeTasks`):
```ts
lane: text("lane").notNull().default("ai"),   // 'ai' | 'browser'
```

`anotacoes.solar_synced_at` / `solar_fase_id` **já existem** — sem mudança.

---

## 5. Fases de Implementação

| Fase | Entrega | Esforço | Bloqueia? |
|------|---------|---------|-----------|
| **0. Lane na fila** ✅ | coluna `lane` + guard em `processTask` + `daemon-ai` filtra `lane='ai'` (lock, catch-up, reaper, Realtime) — **feito 2026-06-21** | ~1 dia | — |
| **1. daemon-browser básico** ✅ | `scripts/browser-broker-daemon.mjs` — consumidor `lane='browser'` que faz spawn dos scrapers Python via registry de skills (`varredura-triagem` + `__selftest`); heartbeat `browser-broker`; reaper com timeout 35min; plist própria. **feito 2026-06-21** (deploy no Mac Mini pendente) | ~1–2 dias | depende de 0 |
| **2. Browser broker** | Chromium quente gerenciado (Patchright, perfil persistente, CDP :9222, launchd KeepAlive) + session-health no `/admin/daemon` + estado `needs-login` | ~2–3 dias | depende de 1 |
| **3. Solar write-back** | enfileira `solar-write` ao criar anotação → broker roda `solar_write_service.py` → marca `solarSyncedAt`. **Fecha o loop.** Requer discovery de formulários (Fase 0 do plano 2026-02-24) | ~2–3 dias | depende de 2 + discovery |
| **4. Agendamento** | cron enfileira `pje-intimacoes` + `varredura-triagem` à noite → triagem pré-classificada antes do defensor abrir o app | ~1 dia | depende de 1 |

### 5.1 Timeout por lane

O reaper hoje usa `ZOMBIE_TIMEOUT_MS` global (15 min). Browser precisa de timeout maior (download de autos). Parametrizar: `selectZombieIds(rows, now, timeoutByLane)` — `ai: 15min`, `browser: 30–45min`. Manter o reaper rodando no startup + a cada 5 min para ambas as lanes.

---

## 6. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| **ToS / bloqueio de conta** (PJe e Solar são sistemas oficiais) | Headed; throttle em cadência humana (Solar já tem rate-limit 5s/escrita); Patchright stealth; sessão quente = menos eventos de login |
| **Chromium órfão segurando sessão gov** | Contextos PJe/Solar isolados; launchd `KeepAlive`; shutdown handler mata o Chromium (espelhar `activeChild.kill` do daemon atual) |
| **Expiração Keycloak / 2FA** | session-health check; estado `needs-login` visível no dashboard; **nunca falhar em silêncio** |
| **Solar AngularJS 1.x (EOL 2021) frágil** | `solar_selectors.py` com self-test no startup do broker; fallback "Outros" + warning (já previsto no plano 2026-02-24); screenshot antes/depois de Salvar |
| **Duas lanes competindo pelo Chromium** | Browser é serial por contexto por natureza (JSF/AngularJS — uma navegação por vez); semáforo de 1 escrita já existe no design Solar |
| **Lock duplo entre daemon-ai e daemon-browser** | Lock otimista já é atômico; checagem de `lane` em `processTask` evita pegar tarefa da outra lane |

---

## 7. Arquivos a Criar / Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/db/schema/casos.ts` | + coluna `lane` em `claudeCodeTasks` + índice |
| `drizzle/` (migration) | `ALTER TABLE ... ADD COLUMN lane` + índice |
| `scripts/claude-code-daemon.mjs` | `processTask`: branch por `lane`; `catchUp`/subscribe filtram `lane='ai'` |
| `scripts/browser-broker-daemon.mjs` | **NOVO** — consumidor `lane='browser'` + dono do Chromium quente + `runBrowserWorker` (spawn Python) |
| `src/lib/daemon/task-lifecycle.mjs` | `selectZombieIds` com timeout por lane |
| `scripts/launchd/com.ombuds.browser-broker.plist` | **NOVO** — KeepAlive do broker |
| `src/lib/db/schema/system.ts` | heartbeat `browser-broker` (reusa `system_heartbeat`) |
| `src/lib/trpc/routers/system.ts` | `daemonStatus`: incluir lane + estado `needs-login` do broker |
| `src/app/(dashboard)/admin/daemon/page.tsx` | exibir as duas lanes + sessão do browser |
| `.claude/skills/varredura-triagem/scripts/varredura_triagem.py` | aceitar params via stdin/JSON quando spawnado pelo broker (modo CDP já existe) |
| `enrichment-engine/services/solar_write_service.py` | completar `criar_fase_processual()` (Fase 3, depende de discovery) |

---

## 8. Critérios de Aceite (alto nível)

- [ ] Tarefa com `lane='browser'` é pega só pelo `daemon-browser`; `lane='ai'` só pelo `daemon-ai`.
- [ ] Reaper recupera zumbi de browser com timeout estendido (não 15 min).
- [ ] `/admin/daemon` mostra as duas lanes, heartbeat de cada uma e estado de sessão do browser.
- [ ] Broker mantém Chromium vivo entre tarefas (sem re-login frio) e expõe `needs-login` quando a sessão cai.
- [ ] `solar-write` enfileirada ao criar anotação fecha o loop e marca `solarSyncedAt` (idempotente via hash, como no plano 2026-02-24).

---

## 8.1 Deploy — Topologia Multi-Máquina (descoberta 2026-06-21)

O daemon **não roda no checkout de dev** (`~/Defender`). Ele roda no **Mac Mini**, checkout `~/Projetos/Defender`, via launchd (`com.ombuds.daemon`), e faz `git pull --ff-only` no startup — a fonte da verdade é o repo. Ambas as máquinas assinam o **mesmo** Supabase Realtime.

**Consequência prática (verificada):** enquanto o daemon de IA no Mac Mini roda **código antigo (sem filtro de lane)**, ele continua pegando tarefas `lane='browser'` e falhando ("SKILL.md not found"). A separação de lanes só passa a valer depois de:

1. **Commit + push** das mudanças das Fases 0/1 (o daemon dá `git pull` no restart).
2. **Restart do `com.ombuds.daemon`** no Mac Mini (passa a filtrar `lane='ai'`).
3. **Carregar `com.ombuds.browser-broker`** no Mac Mini (`npm run browser-broker` valida antes; depois `launchctl load`).

Por isso o teste end-to-end da lane browser **não fecha no dev local** — o Mac Mini vence o lock otimista primeiro. Verificação local feita em isolamento: dispatch do worker, parsing de resultado, resolução de paths (venv + scraper), `node --check`, e conexão `SUBSCRIBED` ao Supabase.

> **Bug lateral achado e contornado:** a `.env.local` do checkout de dev traz `NEXT_PUBLIC_SUPABASE_URL="...supabase.co\n"` (escape literal antes da aspa), o que dava "Invalid API key". O `loadEnv` do broker foi endurecido para tolerar isso (`.replace(/\\[rn]+$/g,'')`). O `claude-code-daemon.mjs` tem a mesma fragilidade latente no loader — backport opcional, não-urgente (o `.env.local` do Mac Mini é limpo).

## 9. Decisão Pendente

A **Fase 3 (Solar write-back)** depende da discovery dos formulários Solar (Fase 0 do plano `2026-02-24-sync-ombuds-to-solar.md`), que continua marcada como bloqueante. Recomendação: **fazer a discovery via o próprio broker na Fase 2** (já teremos Chromium quente logado no Solar) — economiza uma sessão manual e valida o broker num caso real de leitura antes de escrever.
