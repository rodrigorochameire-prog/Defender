---
name: analise-profunda-demanda
description: "Worker BROWSER da Fase 2c. Dado um demandaId de triagem 'cabe peça' (Júri/VVD/EP), baixa os autos — PJe para Júri/VVD (vence sigilo VVD) ou SEEU para Execução Penal (Fase 2b) — organiza no Drive e enfileira a análise completa (lane ai, analise-autos). Rodado pelo browser-broker-daemon no daemon do defensor (CDP). Não é interativo p/ o usuário."
---

# Análise Profunda por Demanda (Fase 2c — lane browser)

Executado pelo `browser-broker-daemon` quando `analiseProfunda.criar` enfileira a task.
Recebe `--demanda-id/--processo-id/--assistido-id/--atribuicao/--defensor-id`.

Fluxo: resolve demanda→CNJ → baixa autos → `distribuir-autos` → enfileira `analise-autos`
(lane ai) com `demandaId` → grava `analise_profunda_status`.

Fonte dos autos por atribuição (`escolhe_fonte_autos`):
- **Júri/VVD/Criminal → PJe:** `baixar_pdf_autos` (autos completos, anti-ciência) — 1 PDF.
- **EXECUCAO_PENAL → SEEU (Fase 2b):** `seeu_autos.baixar_autos_seeu` — coleta os documentos
  da timeline Movimentações (`movimentacaoArquivoDocumento.do`) e baixa cada um inline
  (`arquivo.do`, via fetch) — vários PDFs. NUNCA toca o PJe SSO (preserva a sessão do SEEU).

Estados: `baixando_autos → analisando` (aqui) → `concluida` (derivado quando a task ai completa).
Erros → `erro` (re-disparável). Nada destrutivo.
