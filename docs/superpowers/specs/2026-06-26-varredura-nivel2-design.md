# Spec — Varredura Nível 2 (leitura profunda + gatilho 1-clique)

Data: 2026-06-26. Objetivo: cada demanda em Triagem ganha **ato preciso + fase +
motivo + registro + audiência** lendo o CORPO do documento no PJe, acionável por
um botão na Triagem (roda no broker interativo local, como o import).

## Divisão de trabalho
- **Parte 1 — Scraper (ao vivo, feito pelo humano-no-loop, NÃO subagente):** endurecer
  `varredura_triagem.py` para navegar até a vara antes de localizar/ler os docs. Subagente
  não itera com PJe real/CDP serial.
- **Parte 2 — Integração OMBUDS (subagentes):** tRPC de gatilho + UI + panorama.

## Parte 1 — Scraper (contrato de saída inalterado)
Hoje `varredura()` chama `find_in_panel(page, ...)` assumindo o painel já em
EXPEDIENTES → vara. Falha (0/3) quando o browser está na raiz. Correção:
- Portar do worker de import a navegação em árvore validada (`_wait_text`,
  `_navigate_to_unidade`, `ATRIB_UNIDADE`, `SITUACAO_PADRAO`, stabilização por
  contagem + palavra-chave da vara) para o `varredura_triagem.py`.
- Em `varredura()` (modo cdp/direct), ANTES do loop, navegar `page` até a vara da
  atribuição (derivada de `args.atribuicao` ou de `demandas[0].processos.atribuicao`).
- Depois, `find_in_panel` acha cada doc por `pje_documento_id` na tabela populada e
  `read_doc_content` lê o corpo (timeline). Classificação (`classify`) já é madura.
- Validar ao vivo numa leva pequena (3–5 demandas) antes de soltar nas 42.

A saída (o que o worker escreve) NÃO muda: `demandas.ato/tipo_ato/prioridade/prazo`
(nunca `status`), `registros` (ciencia/diligencia/anotacao), `audiencias` (+GCal) e,
em MPU, `processos_vvd.fase_procedimento` + `motivo_ultima_intimacao`.

## Parte 2 — Integração (subagentes, arquivos DISJUNTOS)
### A (back): `src/lib/trpc/routers/intimacoes.ts`
- `criarVarreduraJob({ atribuicoes: (VVD_CAMACARI|JURI_CAMACARI)[], since?, limit? })`
  → enfileira `claude_code_tasks` (skill="varredura-triagem", lane="browser",
  instrucaoAdicional JSON {atribuicao, since, limit, modo:"cdp"}). Espelha
  `criarImportJob` (dedup de job ativo da mesma skill). Uma atribuição por job
  (o worker recebe `--atribuicao` singular) — se vier várias, enfileira uma por atribuição.
- `statusVarredura({ jobId })` → status/etapa/resultado do claude_code_tasks (para a UI acompanhar).

### B (front): botão/modal de gatilho — `src/components/demandas-premium/` (componente próprio NOVO + fio no header da Triagem)
- Botão "Analisar triagem" → modal pequeno (atribuição + since opcional) → chama
  `criarVarreduraJob` → toast + acompanha `statusVarredura` (poll) → ao concluir,
  invalida a query de demandas (kanban atualiza). Padrão Defender, sem poluição.

### C (front): panorama no card de Triagem — `src/components/demandas-premium/kanban-premium.tsx`
- No card (coluna Triagem), exibir de forma discreta: **prioridade** (cor só p/ URGENTE/ALTA),
  **motivo** (curto), e indicador de **registro** quando houver. O card já mostra `ato`.
  Mudança aditiva e cirúrgica (arquivo grande).

## Verificação
tsc/eslint nos arquivos tocados; vitest dos suites de intimacoes. Scraper: rodada
real pequena com OK > 0 (não "não no painel").

## Não-regredir
Import e sua revisão; kanban; varredura modo manual-review.
