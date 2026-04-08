# PJe Download Pipeline — V1 (Júri + VVD Camaçari)

**Status:** Draft
**Data:** 2026-04-07
**Owner:** Rodrigo Rocha Meire
**Contexto:** Destravar os 9 processos "sem PDFs" que bloqueiam a feature "Preparar Audiências". O scraping atual está quebrado, espalhado em 10+ scripts, e não integrado ao OMBUDS.

## Problema

Quando o usuário clica "Preparar Audiências" no OMBUDS e o processo não tem PDFs no Drive, o worker de análise (Claude Code) não tem o que analisar e devolve `depoimentos: []`. Hoje isso acontece em 9 das 18 audiências próximas. O downloader existente (Patchright + CDP manual via `pje_area_download.py`) funciona no Mac Mini mas:

- Está espalhado em 10+ scripts com responsabilidades sobrepostas
- Não tem integração com a UI do OMBUDS (precisa rodar manualmente via terminal)
- Credenciais PJe não estão persistidas em lugar nenhum
- Só cobre Júri Camaçari (Fase 2 cross-origin falha nas outras atribuições)
- Não tem idempotência — re-baixa tudo quando rodado de novo

## Escopo V1

**Incluído:**
- Atribuições: **Júri Camaçari** e **VVD Camaçari** (escolhidas por parâmetro em cada execução)
- Fluxo fim-a-fim: botão OMBUDS → fila Supabase → worker Mac Mini → Drive → re-enfileira análise
- Chromium dedicado (patchright install chromium) — não reusa Google Chrome.app
- Credenciais em `~/ombuds-worker/.env` (`PJE_CPF`, `PJE_SENHA`)
- Idempotência: pula processos que já têm PDFs no Drive

**Fora de escopo (V2):**
- Execução Penal e Substituição Criminal (cada atribuição tem URL/seletor diferente no PJe — adiciona custo de debug que não paga agora)
- Download de peças individuais (V1 baixa o PDF consolidado dos autos)
- Agendamento automático (V1 é disparo manual pelo botão)
- Retry automático de jobs falhados

## Arquitetura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  OMBUDS (UI)    │         │  Supabase        │         │  Mac Mini       │
│                 │         │                  │         │                 │
│ [Preparar       │────────▶│ pje_download_    │◀────────│ pje-worker.sh   │
│  Audiências]    │ enqueue │   jobs           │  poll   │                 │
│                 │         │                  │         │ pje_downloader  │
│ Status + retry  │◀────────│ status/progress  │────────▶│    .py          │
└─────────────────┘         └──────────────────┘         │                 │
                                                          │ Chromium        │
                                                          │ (patchright)    │
                                                          │                 │
                                                          │ ↓               │
                                                          │ ~/Meu Drive/    │
                                                          │   .../Processos │
                                                          │   - Júri/       │
                                                          └─────────────────┘
```

### Componentes

**1. `scripts/pje_downloader.py` (novo, consolidado)**

Substitui `pje_scraper.py`, `pje_download_autos.py`, `pje_download_full.py`, `pje_download_pw.py`, `pje_area_download.py`. CLI único com subcomandos:

```bash
python3 pje_downloader.py download \
  --numero 0001234-56.2026.8.05.0044 \
  --atribuicao JURI_CAMACARI \
  --assistido "Nome do Assistido" \
  --out-dir "/path/to/assistido/drive/folder"
```

Fases internas:
- **Fase 1 (same-origin):** login + busca por número de processo + obter URL de autos digitais via Patchright normal
- **Fase 2 (cross-origin):** CDP puro (`Fetch.enable` + `Target.setAutoAttach`) para forçar download do PDF consolidado
- **Pós:** valida que PDF > 10KB, nomeia como `Autos - {numero} - YYYY-MM-DD.pdf`

Atribuição vira parâmetro que define:
- URL base do PJe (Júri vs VVD podem usar perfis diferentes)
- Subfolder do Drive (`Processos - Júri` vs `Processos - VVD (Criminal)`)
- Seletores se divergirem entre atribuições (testar ambos e documentar diferenças)

**2. `pje-worker.sh` (novo, no Mac Mini)**

Segue o mesmo padrão do `worker.sh` existente:
- Polling da tabela `pje_download_jobs` (status=pending)
- Para cada job: marca running → resolve Drive folder do assistido → invoca `pje_downloader.py` → marca completed/failed → se sucesso, enfileira analysis_job para o mesmo processo
- Vive em `~/ombuds-worker/pje-worker.sh`, gerenciado por start/stop scripts paralelos

**3. Tabela `pje_download_jobs` (nova)**

```sql
CREATE TABLE pje_download_jobs (
  id serial PRIMARY KEY,
  processo_id int REFERENCES processos(id),
  numero_processo text NOT NULL,
  atribuicao text NOT NULL,
  assistido_id int REFERENCES assistidos(id),
  status text NOT NULL DEFAULT 'pending',  -- pending|running|completed|failed|skipped
  pdf_path text,
  pdf_bytes int,
  error text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX idx_pje_jobs_status ON pje_download_jobs(status, created_at);
```

**4. tRPC mutation `pje.enqueueDownload`**

Entrada: `{ processoId, atribuicao }`. Lógica:
1. Se já tem PDFs recentes no Drive do assistido → retorna `skipped`
2. Se já tem job pending/running para esse processo → retorna `already_queued`
3. Senão, insere row em `pje_download_jobs`

**5. Integração com "Preparar Audiências" modal**

Hoje o modal detecta `documentsMissing=true` e mostra a caixa explicativa "sem PDFs". Adicionar botão **"Baixar do PJe"** nessa caixa que chama `pje.enqueueDownload`. O polling existente (30s) passa a mostrar também status dos jobs de download — quando completar, o processo automaticamente entra na fila de análise e o fluxo normal segue.

## Fluxo de dados (feliz)

1. Usuário abre modal "Preparar Audiências", vê 3 audiências com badge "sem PDFs"
2. Clica "Baixar do PJe" → enfileira 3 jobs em `pje_download_jobs`
3. `pje-worker.sh` pega job 1, invoca `pje_downloader.py`, salva PDF no Drive do assistido, marca completed, enfileira analysis_job
4. `worker.sh` (análise) pega o analysis_job, lê PDFs do Drive, produz schema rico
5. Polling do modal (30s) re-executa `prepararAudiencia`, detecta novos depoimentos, upserta, mostra "+N novas"
6. Badge "sem PDFs" some, audiência fica pronta para uso

## Tratamento de erros

| Erro | Comportamento |
|---|---|
| Login PJe falha (credenciais inválidas) | Marca job failed com erro claro, não re-tenta automaticamente |
| Processo não encontrado no PJe | Marca job failed com `error: "Processo não encontrado"` |
| Sessão expira no meio do download | Re-login automático 1x, depois falha |
| PDF baixado < 10KB (erro silencioso do PJe) | Marca job failed com `error: "PDF inválido"` |
| Drive folder não existe | Cria folder antes do download |
| `pje-worker.sh` travado | Timeout de 5min por job, kill+failed |

## Testes de aceitação

1. **V1.1** — Disparar download de um processo Júri que já tem PDF → retorna `skipped`, não toca no Drive
2. **V1.2** — Disparar download de um processo Júri novo → PDF aparece no Drive em < 3min, analysis_job é enfileirado
3. **V1.3** — Disparar download de um processo VVD → mesmo comportamento, subfolder correto
4. **V1.4** — Credenciais erradas → job `failed` com mensagem clara, UI mostra erro
5. **V1.5** — Clicar "Baixar do PJe" em 3 audiências → 3 jobs pending, worker processa sequencialmente, modal mostra progresso ao vivo
6. **V1.6** — Matar worker no meio de um download → próxima run pega o job em `running` mais antigo que 5min e reprocessa

## Decisões deliberadas

- **Chromium dedicado (patchright install) em vez de Google Chrome.app**: isolamento, headless, sem brigar com navegação do usuário. Custo: 150MB de download uma vez.
- **Worker separado de `worker.sh`**: isola falha de scraping da análise. Se PJe cair, análise continua funcionando nos processos que já têm PDFs.
- **Fila no Supabase, não in-process**: o botão do OMBUDS (rodando em Vercel ou localhost) não pode invocar o worker diretamente — precisa de fila persistente acessível de ambos os lados.
- **Atribuição como parâmetro explícito**: Júri e VVD podem divergir em URL/seletor. Codificar isso como parâmetro desde o início evita um refactor depois.
- **Idempotência via "tem PDF recente no Drive"**: a forma mais simples de pular duplicata, não precisa de estado extra no banco.
- **Sem retry automático em V1**: simplifica. Se o usuário clicar de novo, enfileira um novo job (idempotência trata).

## O que NÃO estamos fazendo

- Download de movimentações/eventos individuais
- Parse dos PDFs no downloader (isso é job do worker de análise)
- UI de fila de downloads dedicada (reusa o polling do modal)
- Retry exponencial, dead letter queue, alertas
- Suporte a certificado digital (.pfx) — só CPF+senha
- Deploy em Vercel/cloud — Vercel não tem Chromium, scraping fica no Mac Mini

## Plano de migração dos scripts existentes

Após V1 estável, mover os scripts antigos para `scripts/legacy/`:
- `pje_scraper.py`, `pje_download_autos.py`, `pje_download_full.py`, `pje_download_pw.py`, `pje_area_download.py`
- `pje_download_*.sh` (10 variantes)
- `pje_scrape_movimentos.py`

`pje_downloader.py` + `pje-worker.sh` são os únicos pontos de entrada suportados.
