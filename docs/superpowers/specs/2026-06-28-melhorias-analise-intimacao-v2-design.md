# Melhorias da análise de intimação v2

**Data:** 2026-06-28
**Status:** Spec para implementação (spec-driven + subagentes)
**Base:** estende `2026-06-27-analise-profunda-intimacao-design.md` (v1 entregue)

## Escopo (4 unidades independentes, arquivos distintos)

Excluído desta rodada (deferido pelo usuário p/ "as outras atribuições"): especialização
do `classify()` para Júri/EP (pronúncia/plenário/progressão/livramento/falta grave).

### Unidade A — IA sugere/corrige o `ato` + resumo estruturado
**Arquivos:** `.claude/skills-cowork/analise-intimacao/{SKILL.md, scripts/fetch_pending.py, scripts/write_analise.py}`
- A IA passa a retornar `ato_sugerido` (do vocabulário canônico da atribuição) e
  `ato_confianca` ("alta|media|baixa"). `write_analise.py` atualiza `demandas.ato`
  **somente** quando: confiança alta E o ato atual é genérico ("Analisar decisão/
  sentença/acórdão", "Ciência", "Cumprir despacho") — nunca sobrescreve ato específico
  já definido. Registra a correção no corpo da anotação ("Ato ajustado: X → Y").
- `fetch_pending.py` passa a incluir `atribuicao` + o `ato` atual no payload (p/ a IA
  decidir do vocabulário certo e saber se é genérico).
- Resumo ESTRUTURADO na anotação "Resumo e providências": seções curtas
  **Objeto · O que foi decidido · Providência/Prazo** (+ "Cabe recurso? (preliminar)").
- Vocabulário: a IA escolhe `ato_sugerido` da lista de `src/config/atos-por-atribuicao.ts`
  para a atribuição (ler o arquivo); fora da lista → não sugere.
- "cabe recurso" continua SEMPRE preliminar.

### Unidade B — atos genéricos de documento nas demais atribuições
**Arquivo:** `src/config/atos-por-atribuicao.ts` (apenas dados + ATO_PRIORITY)
- Replicar os 5 atos genéricos de tipo-de-documento — "Ciência de ata de audiência",
  "Ciência de edital", "Ciência de mandado", "Ciência de petição", "Cumprir ato
  ordinatório" — nas atribuições que ainda não os têm: Tribunal do Júri, Execução
  Penal, Substituição Criminal, Curadoria, Curadoria Especial, Grupo Especial do Júri.
- Não duplicar onde já existem (VVD já tem). Ranks já existem no ATO_PRIORITY (não
  recriar). `tsc --noEmit` limpo.

### Unidade C — medidas MPU: status (revogação/modulação)
**Arquivo:** `.claude/skills/varredura-triagem/scripts/varredura_triagem.py`
- `mpu_parse` já detecta `revogacao_total` e `medidas_revogadas`. Em `_aplicar_medidas_mpu`:
  - Revogação total → marcar TODAS as medidas ativas do `processo_vvd_id` como
    `status='revogada'` (+ `data_revogacao`=hoje) em `medidas_mpu`, em vez de só inserir.
  - `medidas_revogadas` (códigos específicos) → marcar essas como `revogada`.
  - Idempotente; não rebaixa medidas já revogadas. Novo helper Supabase
    `revogar_medidas_mpu(processo_vvd_id, codigos|None)`.
- Registro visível "Medidas protetivas — revogação" quando houver revogação.

### Unidade D (investigação, read-only) — "não no painel" cresce entre rodadas
**Sem edição de arquivo.** Investigar se abrir os autos (`listProcessoCompletoAdvogado.seam`)
efetiva ciência (removendo o expediente da prateleira "Pendentes de ciência") — comparar
contagem da prateleira antes/depois de uma leitura; checar logs/colunas de ciência.
Entregar diagnóstico + recomendação (sem alterar comportamento ainda).

## Verificação (fase final)
- `python3 -m py_compile` dos scripts; `npx tsc --noEmit` limpo; self-tests dos parsers
  (`designacao_parse.py`, `mpu_parse.py`) passam; `echo '[]' | write_analise.py` ok.
- Revisor adversarial: confere que A não sobrescreve ato específico; que B não duplica;
  que C não rebaixa revogadas; idempotência preservada.

## Princípios
- Idempotência em tudo (re-rodar não duplica/regride).
- Trava anti-ciência preservada.
- `ato_sugerido` restrito ao vocabulário canônico (No Invention).
- Arquivos distintos por unidade → paralelizável sem conflito.
