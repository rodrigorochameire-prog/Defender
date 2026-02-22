"""
Prompt para extração semântica de movimentações processuais do Solar.
Usado apenas para movimentações significativas (sentenças, decisões, intimações).
"""

from prompts.base import build_prompt

SOLAR_MOVIMENTACAO_SCHEMA = """{
    "tipo_movimentacao": "sentenca | decisao | despacho | intimacao | certidao | acordao | outro",
    "resumo": "string (max 200 chars) — resumo objetivo da movimentação",
    "resultado": "string | null — condenatório, absolutório, parcialmente procedente, deferido, indeferido, etc",
    "pena": {
        "tipo": "string | null — privativa, restritiva, multa",
        "quantum": "string | null — ex: 5 anos e 4 meses",
        "regime_inicial": "string | null — fechado, semiaberto, aberto"
    },
    "prazo": {
        "tipo": "string | null — manifestação, recurso, cumprimento, pagamento",
        "dias": "number | null",
        "data_limite": "string | null — YYYY-MM-DD"
    },
    "urgencia": "low | medium | high | critical",
    "pessoas_mencionadas": [
        {
            "nome": "string",
            "papel": "juiz | promotor | reu | vitima | defensor | perito | outro"
        }
    ],
    "impacto_defesa": "string — o que o defensor deve fazer com base nesta movimentação",
    "tipo_fato": "controverso | incontroverso | tese",
    "confidence": 0.0
}"""

SOLAR_MOVIMENTACAO_PROMPT = build_prompt(
    """
TAREFA: Extrair dados estruturados de uma movimentação processual obtida do
Sistema Solar da Defensoria Pública do Estado da Bahia (DPEBA).

A movimentação pode ser de diferentes tipos:
- Sentença: condenatória/absolutória, pena, regime
- Decisão interlocutória: deferimento/indeferimento de pedidos
- Despacho: determinações do juiz
- Intimação: prazos, notificações
- Certidão: confirmações processuais
- Acórdão: decisão de segunda instância

INSTRUÇÕES:
1. Identifique o tipo exato da movimentação
2. Extraia um resumo objetivo (max 200 caracteres)
3. Se for sentença/decisão: extraia resultado, pena, regime
4. Se for intimação: extraia tipo de prazo, dias, data limite
5. Identifique URGÊNCIA para a defesa:
   - critical: sentença condenatória, prisão decretada
   - high: intimação com prazo curto (≤5 dias), decisão desfavorável
   - medium: despacho com determinação, intimação prazo normal
   - low: certidão, despacho de mero expediente
6. Identifique pessoas mencionadas e seus papéis
7. Descreva o IMPACTO para a defesa: o que o defensor deve fazer?
8. Classifique o fato: controverso, incontroverso, ou tese defensiva
""",
    SOLAR_MOVIMENTACAO_SCHEMA,
)
