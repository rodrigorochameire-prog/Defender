"""
Prompt para triagem de mensagens WhatsApp.
Detecção rápida de urgência + extração de informações relevantes.
"""

from prompts.base import build_prompt

WHATSAPP_SCHEMA = """{
  "urgency_level": "low | medium | high | critical",
  "urgency_reason": "string ou null",
  "subject": "pedido_informacao | relato_fato | documentacao | agendamento | emergencia | reclamacao | agradecimento | outro",
  "extracted_info": {
    "nome_mencionado": "string ou null",
    "numero_processo": "string ou null",
    "data_mencionada": "YYYY-MM-DD ou null",
    "local_mencionado": "string ou null",
    "pedido_especifico": "string ou null"
  },
  "resumo": "string (max 100 chars)",
  "requer_resposta": true,
  "suggested_response": "string ou null (sugestão de resposta curta)"
}"""

WHATSAPP_PROMPT = build_prompt(
    """
TAREFA: Triagem rápida de mensagem WhatsApp de assistido da Defensoria Pública.

Analise a mensagem e determine:

1. **Urgência**:
   - critical: "preso", "prenderam", "delegacia AGORA", "audiência amanhã", "mandado"
   - high: "prazo vencendo", "preciso urgente", "risco de prisão"
   - medium: "preciso de informação", "quando é a audiência", "documentos"
   - low: "obrigado", "tudo bem", informações gerais

2. **Assunto**: Classificar o motivo do contato
3. **Informações**: Extrair dados mencionados (nomes, processos, datas)
4. **Resposta**: Se requer resposta e sugestão de texto

REGRAS:
- Mensagens de assistidos são frequentemente informais e com erros de português
- "Doutô" = Doutor, "advogado" = defensor
- Gírias e abreviações são comuns
- Se mencionar prisão/delegacia/flagrante → SEMPRE critical
- Áudios transcritos podem ter erros — interpretar com flexibilidade
""",
    WHATSAPP_SCHEMA,
)
