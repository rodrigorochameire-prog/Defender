"""
Prompt para análise de transcrições de atendimento.
Extrai pontos-chave, fatos, pessoas, contradições e providências.
"""

from prompts.base import build_prompt

TRANSCRIPT_SCHEMA = """{
  "key_points": ["string (pontos principais do relato, max 10)"],
  "facts": [
    {
      "descricao": "string",
      "tipo": "controverso | incontroverso",
      "confidence": 0.0,
      "data_fato": "YYYY-MM-DD ou null",
      "relevancia": "string (por que este fato importa para a defesa)"
    }
  ],
  "persons_mentioned": [
    {
      "nome": "string",
      "papel": "testemunha | correu | vitima | familiar | policial | perito | outro",
      "descricao": "string (o que foi dito sobre esta pessoa)",
      "util_para_defesa": true
    }
  ],
  "versao_do_assistido": "string (resumo da versão dos fatos pelo assistido, max 300 chars)",
  "contradictions": ["string (contradições com versões anteriores ou internas)"],
  "suggested_actions": [
    "string (ex: 'Ouvir testemunha X que pode confirmar álibi')"
  ],
  "teses_possiveis": ["string (teses defensivas sugeridas pelo relato)"],
  "urgency_level": "low | medium | high | critical",
  "urgency_reason": "string ou null (motivo da urgência)",
  "resumo_para_prontuario": "string (resumo profissional para o prontuário, max 500 chars)"
}"""

TRANSCRIPT_PROMPT = build_prompt(
    """
TAREFA: Analisar transcrição de atendimento da Defensoria Pública.

Esta é uma conversa entre defensor(a) e assistido(a). Extraia:

1. **Pontos-chave**: Os 5-10 pontos mais importantes do relato
2. **Fatos**: Cada fato narrado, classificado como:
   - controverso: versão do assistido que pode ser contestada
   - incontroverso: fato que ambas as partes concordam
3. **Pessoas mencionadas**: Testemunhas, corréus, vítima, familiares, policiais
   - Para cada pessoa: se é útil para a defesa e por quê
4. **Versão do assistido**: Resumo da narrativa do assistido
5. **Contradições**: Inconsistências no relato ou com informações anteriores
6. **Providências sugeridas**: Ações concretas que o defensor deve tomar
7. **Teses possíveis**: Teses defensivas sugeridas pelo relato
   (legítima defesa, negativa de autoria, desclassificação, atipicidade, etc)

URGÊNCIA:
- critical: assistido preso, audiência em < 48h, prisão iminente
- high: prazo processual próximo, réu ameaçado
- medium: providência necessária sem urgência imediata
- low: atendimento de rotina

ATENÇÃO:
- O assistido pode estar mentindo — marque como "controverso" quando apropriado
- Identifique testemunhas de defesa potenciais
- Busque elementos de álibi
- Se o assistido relatar abuso policial, marcar como ponto crítico
""",
    TRANSCRIPT_SCHEMA,
)
