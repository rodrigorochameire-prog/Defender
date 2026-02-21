"""
Prompt para parsing de pautas de audiência do PJe.
Extrai dados estruturados de cada audiência na pauta.
"""

from prompts.base import build_prompt

AUDIENCIA_SCHEMA = """{
  "audiencias": [
    {
      "tipo": "instrucao | JAM | juri | admonicao | justificacao | conciliacao | custodia | leitura_sentenca | outro",
      "numero_processo": "string (formato CNJ)",
      "reu": "string",
      "vitima": "string ou null",
      "crime": "string ou null",
      "juiz": "string ou null",
      "promotor": "string ou null",
      "data": "YYYY-MM-DD",
      "hora": "HH:MM",
      "sala": "string ou null",
      "vara": "string ou null",
      "reu_preso": false,
      "observacoes": "string ou null",
      "confidence": 0.0
    }
  ],
  "total_encontradas": 0,
  "data_pauta": "YYYY-MM-DD ou null"
}"""

AUDIENCIA_PROMPT = build_prompt(
    """
TAREFA: Extrair audiências de uma PAUTA do PJe (Agenda de Audiências).

Para CADA audiência na pauta, extraia:

1. **Tipo de audiência**:
   - instrucao: oitiva de testemunhas + interrogatório
   - JAM: Justiça ao Alcance de Mão (audiência rápida)
   - juri: sessão do Tribunal do Júri
   - admonicao: advertência em execução penal
   - justificacao: justificação de falta em EP
   - conciliacao: tentativa de acordo
   - custodia: audiência de custódia (preso em flagrante)
   - leitura_sentenca: leitura de sentença

2. **Processo**: Número CNJ, vara
3. **Partes**: Réu, vítima, juiz, promotor
4. **Data e hora**: Quando será a audiência
5. **Réu preso**: Se o réu está preso (informação CRÍTICA)

ATENÇÃO:
- Audiência de custódia = réu preso, urgência máxima
- Sessão de júri = preparação especial necessária
- Audiência de instrução = preparar testemunhas de defesa
""",
    AUDIENCIA_SCHEMA,
)
