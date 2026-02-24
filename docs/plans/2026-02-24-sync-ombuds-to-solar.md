# Plano: Sync OMBUDS → Solar — Escrita Bidirecional

## Data: 2026-02-24
## Status: Em implementação (discovery pendente)

---

## Contexto

O OMBUDS já lê dados do Solar (movimentações, processos, avisos). Agora queremos **escrever** no Solar: registrar fases processuais, atividades e atendimentos que existem no OMBUDS mas não no Solar.

## Descoberta Crucial

Da wiki da DPE-RO sobre o Solar:
> "Você NÃO deve criar atendimento para inserir no sistema que tomou ciência de um processo ou desempenhou alguma atividade nele — para isso existem as FASES PROCESSUAIS."
> "O atendimento deve ser gerado apenas quando efetivamente um atendimento ocorrer (diálogo entre assistido com servidor ou membro)."

**Implicação**: V1 foca em **Fases Processuais**, não atendimentos.

## Conceitos Solar

| Conceito Solar | Corresponde no OMBUDS | Quando usar |
|---|---|---|
| **Atendimento** | Interação real com assistido | Apenas diálogo presencial/remoto |
| **Fase Processual** | Anotação de atividade no processo | Toda atividade (ciência, petição, audiência) |
| **Processo** | Processo judicial/extrajudicial | Vinculado ao atendimento |

---

## Arquitetura

```
OMBUDS (Next.js / tRPC)
  │ Botão "Sync Solar" → tRPC solar.sincronizarComSolar
  │
  ▼ HTTP POST
Enrichment Engine (Python / FastAPI / Railway)
  │ SolarWriteService.criar_fase_processual()
  │
  ▼ Playwright (AngularJS scope injection)
Solar DPEBA (AngularJS SPA)
  /atendimento/{id}/#/processos → Fases Processuais
```

### Estratégia de Escrita

Solar não tem REST API para escrita. Toda operação write é via **Playwright + AngularJS scope injection**:
1. Navegar para `/atendimento/{id}/#/processos`
2. Clicar "Nova Fase"
3. Preencher formulário (Select2 dropdowns + campos texto)
4. Salvar via scope function
5. Verificar criação

### Select2 Handling

```python
async def _fill_select2(self, page, selector, value):
    """Solar usa Select2 para dropdowns."""
    # 1. Click container .select2-container
    # 2. Digitar no .select2-input
    # 3. Aguardar filtro
    # 4. Selecionar .select2-result
    # 5. Verificar valor no <select> original
```

---

## Fluxo Detalhado

1. **tRPC** recebe `{ assistidoId, tipo: "fase" }`
2. Busca processos do assistido no OMBUDS
3. Busca anotações não-sincronizadas (`solar_synced_at IS NULL`)
4. Para cada processo:
   a. `consultar_processo()` no Solar
   b. Se não existe → `cadastrar_processo_solar()`
   c. Navegar para aba "Processos" → "Fases Processuais"
   d. Para cada anotação pendente:
      - Clicar "Nova Fase"
      - Preencher: tipo_atividade, data, descrição, defensor, defensoria
      - Salvar
      - Verificar criação
      - Marcar `solar_synced_at` e `solar_fase_id` na anotação
5. Retornar resultado

## Schema Changes

```sql
ALTER TABLE anotacoes ADD COLUMN solar_synced_at TIMESTAMP;
ALTER TABLE anotacoes ADD COLUMN solar_fase_id VARCHAR(50);
```

## Mapeamento Tipos

```
OMBUDS tipo_anotacao → Solar tipo_atividade
"atendimento"       → "Atendimento ao Assistido"
"audiencia"         → "Audiência"
"peticao"           → "Elaboração de Petição"
"solar:movimentacao"→ "Análise de Movimentação"
"sigad"             → "Atendimento ao Assistido"
"observacao"        → "Observação"
"outro"             → "Outros"
```

> ⚠️ Nomes exatos dos tipos dependem da discovery Chrome MCP

## Safety Mechanisms

| Mecanismo | Implementação |
|-----------|---------------|
| Idempotência | Hash SHA-256 — não cria duplicatas |
| Dry-run | Flag `dryRun: true` — preenche mas não salva |
| Verificação | Re-lê processo após criar fase |
| Screenshot | Captura antes/depois de "Salvar" |
| Rollback log | `{operação, timestamp, dados, screenshot}` |
| Rate limit | 5s entre escritas |
| Concurrency | Semáforo — 1 escrita por vez |

## Tratamento de Erros

| Cenário | Tratamento |
|---|---|
| Session expirada | Re-autenticar + retry |
| Processo não existe | Auto-criar via `cadastrar_processo_solar()` |
| Formulário mudou | Screenshot + erro parcial |
| Select2 falha | Fallback "Outros" + warning |
| Browser crash | `_reset_browser()` + retry 1x |
| Fase duplicada | Check hash, skip se existe |

## Tipos TypeScript

```typescript
interface SolarSyncToInput {
  assistidoId: number;
  tipo: "fase" | "atendimento";
  dryRun?: boolean;
  anotacaoIds?: number[];  // sync específicas
}

interface SolarSyncToResult {
  success: boolean;
  processos_sincronizados: number;
  fases_criadas: number;
  fases_skipped: number;
  fases_falhadas: number;
  erros: string[];
  detalhes: {
    processo: string;
    anotacao_id: number;
    status: "created" | "skipped" | "failed";
    solar_fase_id?: string;
    error?: string;
  }[];
}
```

## Sequência de Implementação

| Fase | O que | Status |
|------|-------|--------|
| 0. Discovery | Chrome MCP: mapear formulários | ⏳ Bloqueante |
| 1. Schema | `solar_synced_at`, `solar_fase_id` | 🔜 Não-bloqueante |
| 2. Python | `SolarWriteService` base | 🔜 Não-bloqueante |
| 3. TS | Tipos no `enrichment-client.ts` | 🔜 Não-bloqueante |
| 4. tRPC | `solar.sincronizarComSolar` | 🔜 Não-bloqueante |
| 5. Python | `criar_fase_processual()` | ⏳ Depende de #0 |
| 6. UI | Botão + feedback | 🔜 Não-bloqueante |
| 7. Mapping | Tabela tipos OMBUDS→Solar | ⏳ Depende de #0 |

## Arquivos a Modificar/Criar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/db/schema.ts` | +`solarSyncedAt`, `solarFaseId` em anotações |
| `enrichment-engine/services/solar_write_service.py` | **NOVO** — escrita no Solar |
| `enrichment-engine/services/solar_selectors.py` | +FASE_PROCESSUAL selectors |
| `enrichment-engine/routers/solar.py` | +endpoint `/solar/sync-to-solar` |
| `enrichment-engine/models/schemas.py` | +`SolarSyncToInput/Output` |
| `src/lib/services/enrichment-client.ts` | +tipos + método `solarSyncTo()` |
| `src/lib/trpc/routers/solar.ts` | +procedure `sincronizarComSolar` |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | +botão Sync Solar |
