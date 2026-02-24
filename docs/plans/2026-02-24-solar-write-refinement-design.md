# Design: Refinamento Solar Write — Piloto Controlado

> Data: 2026-02-24
> Status: Aprovado
> Cenário: Piloto controlado com conta rodrigo.meire (admin)
> Escopo: Fase Processual + Anotação + Verificação pós-escrita

## Contexto

O SolarWriteService tem discovery completa (263 tipos, formulários mapeados)
mas falta: verificação pós-escrita, retry, endpoint de anotação, e teste E2E.

## Seção 1: Verificação Pós-Escrita (Write-then-Read)

### Problema
O serviço assume sucesso quando o modal fecha, mas não confirma que
a fase realmente apareceu no Solar.

### Solução
Método `_verificar_fase_criada()` que após salvar:
1. Navega para lista de fases do processo
2. Busca fase recém-criada (tipo + data + prefix descrição)
3. Extrai solar_fase_id para rastreabilidade
4. Retorna {verified: bool, solar_fase_id: str | None}

Para Anotações: verifica topo da timeline do Histórico.

**Custo**: +3-5s por operação (1 navegação extra + leitura)

## Seção 2: Retry com Recovery

### Problema
Se Playwright falha no meio (timeout, rede), erro imediato sem retry.

### Solução
Wrapper `_with_retry()`:
- Max 2 tentativas (1 original + 1 retry)
- Entre tentativas: fecha modal, navega de volta, screenshot, wait 5s
- Retry apenas para erros recuperáveis:
  - TimeoutError, modal_nao_abriu, botao_nao_encontrado
- NÃO retry para:
  - validacao_solar, permissao_negada

## Seção 3: Endpoint de Anotação + Router

### Novos Endpoints
1. `POST /solar/criar-anotacao`
   - Input: atendimento_id, texto, qualificacao_id?, dry_run?
   - Output: success, message, hash

2. `POST /solar/sync-to-solar` atualizado
   - Novo campo: `modo: "fase" | "anotacao" | "auto"`
   - "auto" decide baseado no tipo:
     - audiencia, peticao, sentenca, recurso → Fase Processual
     - nota, observacao, lembrete, sigad → Anotação

### Schemas Pydantic
- SolarCriarAnotacaoInput, SolarCriarAnotacaoOutput

### tRPC
- solar.criarAnotacao

## Seção 4: Script de Teste (Piloto)

### Fase 1 — Smoke Test (dry-run)
1. Login Solar (rodrigo.meire)
2. Navega a processo 8000189-30.2025.8.05.0039
3. Abre "Nova Fase", preenche tipo 52, NÃO salva
4. Abre "Anotação", preenche qualif 302, NÃO salva
5. Screenshots para validação visual

### Fase 2 — Write Real
1. Cria Fase Processual (tipo 52, "Teste piloto OMBUDS")
2. Verifica: relê lista de fases, confirma
3. Cria Anotação (qualif 302, "Piloto OMBUDS")
4. Verifica: relê timeline

### Fase 3 — Relatório
- JSON com resultados
- Screenshots em /tmp/solar_pilot_*
- PASS/FAIL

**Execução**: `python3 test_solar_write_pilot.py --dry-run` ou `--real`

## Ordem de Implementação

1. _verificar_fase_criada() e _verificar_anotacao_criada()
2. _with_retry() wrapper
3. Endpoint POST /solar/criar-anotacao + schemas + tRPC
4. Modo "auto" no sync-to-solar
5. test_solar_write_pilot.py
