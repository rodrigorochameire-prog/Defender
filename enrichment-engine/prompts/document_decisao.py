"""
Prompt para extração de dados de DECISÕES interlocutórias.
Prisão, liberdade, medidas cautelares, tutelas.
"""

from prompts.base import build_prompt

DECISAO_SCHEMA = """{
  "tipo_decisao": "prisao_preventiva | revogacao_prisao | liberdade_provisoria | medida_cautelar | producao_antecipada_prova | tutela_urgencia | quebra_sigilo | busca_apreensao | interceptacao | outro",
  "resultado": "deferido | indeferido | parcialmente_deferido",
  "reu": {
    "nome": "string",
    "reu_preso": true
  },
  "fundamentacao_resumo": "string (max 300 chars)",
  "recurso_cabivel": "string ou null (HC, RESE, Agravo, etc)",
  "prazo_recurso_dias": 0,
  "medidas_impostas": ["string (ex: monitoramento eletrônico, recolhimento noturno)"],
  "valor_fianca": "string ou null",
  "juiz": "string ou null",
  "vara": "string ou null",
  "data_decisao": "YYYY-MM-DD ou null",
  "numero_processo": "string ou null",
  "urgencia": "low | medium | high | critical",
  "observacoes": ["string"],
  "confidence": 0.0
}"""

DECISAO_PROMPT = build_prompt(
    """
TAREFA: Extrair dados de uma DECISÃO interlocutória.

Foque em:
1. **Tipo**: Prisão preventiva, liberdade, medida cautelar, etc
2. **Resultado**: Deferido/indeferido/parcial
3. **Réu**: Nome e status prisional
4. **Medidas**: Cautelares impostas (se houver)
5. **Recurso**: Qual recurso é cabível e prazo
6. **Urgência**:
   - critical: réu preso ou prisão decretada
   - high: medida cautelar restritiva
   - medium: decisão com prazo
   - low: decisão de mero expediente

ATENÇÃO:
- Decisão de PRISÃO tem urgência CRITICAL — requer HC imediato
- Fiança: extrair valor e condições
- Medidas cautelares: listar TODAS individualmente
""",
    DECISAO_SCHEMA,
)
