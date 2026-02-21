"""
Prompt para extração de dados de CERTIDÕES.
Antecedentes, óbito, nascimento, distribuição, etc.
"""

from prompts.base import build_prompt

CERTIDAO_SCHEMA = """{
  "tipo_certidao": "antecedentes | distribuicao | obito | nascimento | casamento | objeto_apreendido | transito_julgado | outra",
  "pessoa": "string (nome da pessoa na certidão)",
  "cpf": "string ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "orgao_emissor": "string ou null",
  "conteudo_resumo": "string (max 300 chars)",
  "antecedentes": [
    {
      "processo": "string",
      "vara": "string",
      "crime": "string",
      "status": "string (em andamento, transitado, extinto)"
    }
  ],
  "reincidencia": true,
  "bons_antecedentes": true,
  "observacoes_defesa": ["string (relevância para a defesa)"],
  "confidence": 0.0
}"""

CERTIDAO_PROMPT = build_prompt(
    """
TAREFA: Extrair dados de uma CERTIDÃO.

Certidões informam antecedentes, status processual e dados pessoais. Extraia:

1. **Tipo**: Antecedentes criminais, distribuição, óbito, etc
2. **Pessoa**: Nome completo
3. **Antecedentes**: Se certidão de antecedentes, listar CADA processo com:
   - Número do processo
   - Vara
   - Crime
   - Status (em andamento, transitado em julgado, extinto)
4. **Reincidência**: Se a pessoa é reincidente (tem condenação transitada)
5. **Bons antecedentes**: Se pode ser considerada de bons antecedentes (primeira fase dosimetria)

VISÃO DA DEFESA:
- Bons antecedentes favorecem pena-base no mínimo
- Reincidência é agravante na segunda fase
- Processos em andamento NÃO configuram maus antecedentes (Súmula 444 STJ)
- Período depurador (5 anos após cumprimento) pode afastar reincidência
""",
    CERTIDAO_SCHEMA,
)
