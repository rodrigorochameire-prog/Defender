"""
Prompt para extração de dados de SENTENÇAS.
Tipo mais rico em informações — condenação, pena, regime, fundamentação.
"""

from prompts.base import build_prompt

SENTENCA_SCHEMA = """{
  "tipo_sentenca": "condenatoria | absolutoria | extintiva_punibilidade | desclassificacao | pronuncia | impronuncia | absolvicao_sumaria",
  "resultado": "condenado | absolvido | extinta_punibilidade | desclassificado | pronunciado | impronunciado",
  "reu": {
    "nome": "string",
    "alcunha": "string ou null",
    "reu_preso": true
  },
  "vitima": "string ou null",
  "crime": {
    "tipo_penal": "string (ex: Roubo Majorado)",
    "artigos": ["art. 157, §2°, I e II, CP"],
    "qualificadoras": ["string"],
    "causas_aumento": ["string"],
    "causas_diminuicao": ["string"]
  },
  "pena": {
    "reclusao_anos": 0,
    "reclusao_meses": 0,
    "detencao_anos": 0,
    "detencao_meses": 0,
    "multa_dias": 0,
    "regime_inicial": "fechado | semiaberto | aberto | null",
    "substituicao": "string ou null (restritivas de direitos, multa)",
    "sursis": false,
    "sursis_periodo_anos": 0
  },
  "atenuantes": ["string"],
  "agravantes": ["string"],
  "fundamentacao_resumo": "string (max 500 chars)",
  "juiz": "string ou null",
  "vara": "string ou null",
  "data_sentenca": "YYYY-MM-DD ou null",
  "numero_processo": "string ou null",
  "recurso_cabivel": "string ou null",
  "observacoes": ["string"],
  "confidence": 0.0
}"""

SENTENCA_PROMPT = build_prompt(
    """
TAREFA: Extrair TODOS os dados estruturados de uma SENTENÇA penal.

Este é o documento mais importante para a defesa. Extraia com máxima precisão:

1. **Tipo e resultado**: Condenatória, absolutória, extintiva, pronúncia, etc.
2. **Réu**: Nome completo, alcunha se houver, se está preso
3. **Vítima**: Nome quando mencionado
4. **Crime**: Tipo penal, artigos com lei, qualificadoras, causas de aumento/diminuição
5. **Pena**: Reclusão/detenção (anos e meses), multa (dias-multa), regime inicial
6. **Dosimetria**: Atenuantes e agravantes consideradas
7. **Fundamentação**: Resumo da fundamentação (max 500 chars)
8. **Metadados**: Juiz, vara, data, número do processo

ATENÇÃO ESPECIAL:
- Regime inicial (fechado/semiaberto/aberto) é CRÍTICO para execução penal
- Se houver desclassificação, indicar para qual crime
- Se pronúncia (Júri), indicar os quesitos
- Múltiplos réus: extrair dados de TODOS
- Concurso de crimes: listar TODOS os crimes separadamente
""",
    SENTENCA_SCHEMA,
)
