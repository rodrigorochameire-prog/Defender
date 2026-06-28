# Especialização do classify — Execução Penal + Júri

**Data:** 2026-06-28
**Base:** acervo real de peças do defensor ("Petições por assunto") + conhecimento jurídico.
**Princípio:** No Invention — atos confirmados pelo usuário + presentes no acervo.

## Fonte (fluxo real observado no acervo de peças)
- **EP:** extinção da punibilidade (prescrição/pena cumprida), impugnação à reconversão de
  regime, impugnação à rescisão de ANPP, alteração de condição do SURSIS, permissão de
  saída/saída temporária, início de execução/prisão domiciliar, transferência dos autos,
  progressão, livramento, remição, indulto, relaxamento por excesso de prazo, agravo em execução.
- **Júri:** pós-pronúncia → diligências do art. 422 + rol de testemunhas p/ plenário; dispensa
  de interrogatório; impronúncia → avaliar RESE (e contrarrazões se o MP recorrer); sessão de
  plenário designada → preparação.

## Unidade 1 — referência de fluxo (novo arquivo)
`.claude/skills/varredura-triagem/references/fluxo-atos-por-atribuicao.md` — documenta o mapa
intimação→ato por atribuição (EP, Júri, VVD), p/ o classify e a skill IA consultarem.

## Unidade 2 — atos canônicos de EP (config)
`src/config/atos-por-atribuicao.ts` — adicionar à "Execução Penal" (e ao ATO_PRIORITY) os atos
que faltam (não duplicar os existentes: Requerimento de progressão, Manifestação contra
reconversão, Manifestação contra regressão, Indulto, Agravo em Execução, Transferência de unidade,
Designação de justificação/admonitória, Cumprimento ANPP):
- "Extinção da punibilidade" (rank ~30)
- "Impugnação à rescisão de ANPP" (rank ~16, recurso/defesa)
- "Alteração de condição do SURSIS" (rank ~33)
- "Permissão de saída" (rank ~37)
- "Saída temporária" (rank ~37)
- "Prisão domiciliar" (rank ~23)
- "Livramento condicional" (rank ~30)
- "Remição de pena" (rank ~37)
- "Relaxamento por excesso de prazo" (rank ~21)
`tsc --noEmit` limpo; sem duplicatas.

## Unidade 3 — classify EP + Júri (worker)
`.claude/skills/varredura-triagem/scripts/varredura_triagem.py`
- `classify()` ganha parâmetro `atribuicao: str | None = None`; o worker passa `atrib_alvo`
  na chamada do loop.
- Novo `RULES_EP` (lista de tuplas como RULES_BASE), aplicado ANTES de RULES_BASE **quando
  `atribuicao` é Execução Penal** (`"EXECUCAO_PENAL" in (atribuicao or "")`). Padrões → ato
  (texto normalizado, primeira regra vence). Atos DEVEM existir na config (Unidade 2):
  - `r"extin(c|ç).{0,20}punibilidade|pena.{0,10}cumprida|prescri(c|ç)"` → "Extinção da punibilidade" (ciencia/diligencia, prazo 5)
  - `r"reconvers"` → "Manifestação contra reconversão" (diligencia, 5)
  - `r"regress.{0,20}regime|falta grave"` → "Manifestação contra regressão" (diligencia, 5, URGENTE)
  - `r"rescis.{0,20}anpp|descumpr.{0,20}anpp"` → "Impugnação à rescisão de ANPP" (diligencia, 5)
  - `r"sursis"` → "Alteração de condição do SURSIS" (diligencia, 5)
  - `r"livramento condicional"` → "Livramento condicional" (diligencia, 5)
  - `r"remi(c|ç)"` → "Remição de pena" (diligencia, 5)
  - `r"progress.{0,20}regime|requisit.{0,20}progress|calculo.{0,15}pena|atestado.{0,15}pena"` → "Requerimento de progressão" (diligencia, 5)
  - `r"sa(i|í)da tempor"` → "Saída temporária" (diligencia, 5)
  - `r"permiss.{0,15}sa(i|í)da"` → "Permissão de saída" (diligencia, 5)
  - `r"prisao domiciliar|domiciliar"` → "Prisão domiciliar" (diligencia, 5, URGENTE)
  - `r"indulto|comuta(c|ç)"` → "Indulto" (diligencia, 5)
  - `r"transfer.{0,20}(unidade|autos|presidio)"` → "Transferência de unidade" (diligencia, 5)
  - fallback EP: `r"\bdecisao\b"` → "Analisar decisão"; senão None → RULES_BASE.
- Júri (em RULES_BASE ou um RULES_JURI aplicado quando atribuição é Júri): adicionar antes das
  regras genéricas:
  - `r"(preclu|transitad).{0,40}pronuncia|art\.?\s*422|fase.{0,15}422|diligencias.{0,20}(plenario|422)"` → "Diligências do 422" (diligencia, 5)
  - `r"rol.{0,20}testemunhas.{0,20}plenario|prepara.{0,20}plenario"` → "Diligências do 422" (diligencia, 5)
  - impronúncia já vira "Ciência da impronúncia" (favorável) — manter; NÃO forçar RESE (o réu
    não recorre da própria impronúncia; só contrarrazões se o MP recorrer).
- Idempotência e trava anti-ciência intactas. `py_compile` limpo.

## Verificação
- `py_compile` do worker; `tsc --noEmit` limpo; self-tests dos parsers seguem passando.
- Revisor: todo ato gerado pelo classify EP/Júri existe na config (sem órfãos); regras EP só
  disparam p/ atribuição EP; sem regressão nas regras VVD/base.
