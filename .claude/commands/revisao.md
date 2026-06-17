---
name: revisao
description: Revisar peça/minuta elaborada por estagiário(a) — aponta para a engine única `revisar-minutas`.
---

# Revisão de Peça/Minuta (estagiário/analista)

Este comando agora delega para a **engine única de revisão**: a skill
`revisar-minutas` (skills-cowork). `/revisao` e `/revisar-minuta` rodam o mesmo
fluxo.

Acionar a skill `revisar-minutas` quando o usuário disser: "revisa a peça",
"minuta do estagiário", "revisão", "revisar as minutas".

## O que a engine faz (resumo)
1. **Intake** — lote (varre `1 - Protocolar/1 - Revisões`) ou avulso (1 caso
   indicado).
2. **Dossiê** — autos da última semana (senão scraping PJe) + processos
   associados + documentos + atendimentos (transcrevendo mídia sem transcrição).
3. **Revisão** — rubric de 9 dimensões, veredito Manter/Ajustar/Substituir,
   equilibrando aproveitar a peça × padrão de qualidade.
4. **Saída em duas camadas** — Layer 1 (avaliação detalhada p/ o Defensor) +
   Layer 2 (retorno curto, não-cara-de-IA, p/ a estagiária no WhatsApp/kanban).
5. **Finalização (após OK)** — pdf + rename `(Revisado)` + mover p/ Protocolar +
   arquivar o original + gravar Layer 2 no kanban OMBUDS.

Detalhes, rubric e templates: skill `revisar-minutas`
(`.claude/skills-cowork/revisar-minutas/`).
