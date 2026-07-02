---
name: analise-profunda-demanda
description: "Worker BROWSER da Fase 2c. Dado um demandaId de triagem 'cabe peça' (Júri/VVD), baixa os autos completos do PJe (vence sigilo VVD), organiza no Drive e enfileira a análise completa (lane ai, analise-autos). Rodado pelo browser-broker-daemon no daemon do defensor (CDP). Não é interativo p/ o usuário."
---

# Análise Profunda por Demanda (Fase 2c — lane browser)

Executado pelo `browser-broker-daemon` quando `analiseProfunda.criar` enfileira a task.
Recebe `--demanda-id/--processo-id/--assistido-id/--atribuicao/--defensor-id`.

Fluxo: resolve demanda→CNJ → baixa autos (`baixar_pdf_autos`, anti-ciência) → `distribuir-autos`
→ enfileira `analise-autos` (lane ai) com `demandaId` → grava `analise_profunda_status`.

Estados: `baixando_autos → analisando` (aqui) → `concluida` (derivado quando a task ai completa).
Erros → `erro` (re-disparável). Nada destrutivo.
