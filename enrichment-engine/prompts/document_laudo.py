"""
Prompt para extração de dados de LAUDOS PERICIAIS.
Toxicológico, necroscópico, médico-legal, balístico, etc.
"""

from prompts.base import build_prompt

LAUDO_SCHEMA = """{
  "tipo_laudo": "toxicologico | necroscopico | medico_legal | balistico | papiloscopia | local_crime | psiquiatrico | psicologico | contabil | outro",
  "peritos": ["string"],
  "data_pericia": "YYYY-MM-DD ou null",
  "data_laudo": "YYYY-MM-DD ou null",
  "conclusao_resumo": "string (max 500 chars)",
  "conclusao_favoravel_defesa": true,
  "pontos_criticos": ["string (pontos que a defesa deve explorar)"],
  "substancias_encontradas": ["string (para toxicológico)"],
  "causa_mortis": "string ou null (para necroscópico)",
  "instrumento_utilizado": "string ou null (para balístico/necroscópico)",
  "lesoes_descritas": ["string (para médico-legal)"],
  "quesitos_respondidos": [
    {
      "quesito": "string",
      "resposta": "string"
    }
  ],
  "observacoes_defesa": ["string (oportunidades para a defesa)"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}"""

LAUDO_PROMPT = build_prompt(
    """
TAREFA: Extrair dados de um LAUDO PERICIAL.

Laudos são peças técnicas cruciais. Extraia:

1. **Tipo**: Toxicológico, necroscópico, médico-legal, balístico, etc
2. **Peritos**: Nomes dos peritos
3. **Conclusão**: Resumo objetivo da conclusão
4. **Favorável à defesa?**: Se a conclusão ajuda ou prejudica a defesa
5. **Pontos críticos**: Elementos que a defesa DEVE explorar
   - Contradições
   - Ausência de informações
   - Margem de dúvida
   - Cadeia de custódia irregular
6. **Dados específicos**: Substâncias (tox), causa mortis (necro), lesões (ML)
7. **Quesitos**: Se houver quesitos, listar pergunta e resposta

VISÃO DA DEFESA:
- Identifique TUDO que pode ser questionado pela defesa
- Cadeia de custódia é sempre relevante
- Tempo entre fato e perícia pode invalidar resultados
- Ausência de contraprova é ponto a explorar
""",
    LAUDO_SCHEMA,
)
