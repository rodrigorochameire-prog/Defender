"""
Prompt para extração de dados de DENÚNCIAS.
Peça acusatória — analisar imputação, provas e pontos fracos.
"""

from prompts.base import build_prompt

DENUNCIA_SCHEMA = """{
  "tipo_acao": "publica_incondicionada | publica_condicionada | privada | privada_subsidiaria",
  "orgao_acusador": "string (ex: Ministério Público do Estado da Bahia)",
  "promotor": "string ou null",
  "data_denuncia": "YYYY-MM-DD ou null",
  "data_recebimento": "YYYY-MM-DD ou null",
  "reus": [
    {
      "nome": "string",
      "alcunha": "string ou null",
      "qualificacao_resumida": "string ou null (ex: brasileiro, solteiro, desempregado)",
      "reu_preso": true
    }
  ],
  "vitimas": ["string"],
  "crimes_imputados": [
    {
      "tipo_penal": "string (ex: Roubo Majorado)",
      "artigos": ["art. 157, §2°, I e II, CP"],
      "qualificadoras": ["string"],
      "causas_aumento": ["string"],
      "tentativa": false,
      "concurso": "material | formal | continuado | null"
    }
  ],
  "fatos_narrados": [
    {
      "descricao": "string (max 200 chars)",
      "data_fato": "YYYY-MM-DD ou null",
      "local_fato": "string ou null"
    }
  ],
  "narrativa_resumo": "string (max 500 chars — resumo da narrativa acusatória)",
  "provas_mencionadas": [
    {
      "tipo": "testemunhal | documental | pericial | material | digital",
      "descricao": "string"
    }
  ],
  "pedidos": ["string (ex: condenação, prisão preventiva, medidas cautelares)"],
  "pontos_fracos": [
    {
      "descricao": "string (vulnerabilidade identificada na denúncia)",
      "fundamento": "string (base legal ou lógica para questionamento)"
    }
  ],
  "nulidades_identificaveis": [
    {
      "tipo": "string (ex: inépcia, falta de justa causa, prescrição)",
      "descricao": "string",
      "fundamento_legal": "string ou null"
    }
  ],
  "numero_processo": "string ou null",
  "vara": "string ou null",
  "observacoes_defesa": ["string (estratégias iniciais para defesa)"],
  "confidence": 0.0
}"""

DENUNCIA_PROMPT = build_prompt(
    """
TAREFA: Extrair dados estruturados de uma DENÚNCIA penal.

A denúncia é a peça que DEFINE a acusação. Extraia com visão estratégica da DEFESA:

1. **Tipo de ação**: Pública incondicionada, condicionada, privada
2. **Réus**: TODOS os denunciados com qualificação e status prisional
3. **Vítimas**: Nomes quando disponíveis
4. **Crimes imputados**: CADA crime separadamente com artigos, qualificadoras, aumento/diminuição
5. **Fatos narrados**: Descrição cronológica dos fatos segundo a acusação
6. **Narrativa resumida**: Síntese da tese acusatória (max 500 chars)
7. **Provas mencionadas**: O que o MP alega ter como prova
8. **Pedidos**: O que o MP pede (condenação, medidas, etc)
9. **Pontos fracos**: Vulnerabilidades na narrativa ou provas
10. **Nulidades**: Vícios que podem invalidar parcial ou totalmente

VISÃO DA DEFESA — ANÁLISE CRÍTICA:
- INÉPCIA da denúncia: falta de descrição individualizada da conduta de cada réu
  (art. 41 CPP — descrever o fato criminoso com todas as suas circunstâncias)
- Falta de JUSTA CAUSA: provas insuficientes para sustentar a acusação
- PRESCRIÇÃO: verificar datas do fato vs denúncia vs recebimento
- Denúncia GENÉRICA em crimes societários/concurso de agentes
- Provas obtidas ilicitamente mencionadas na denúncia (art. 5°, LVI, CF)
- Bis in idem: mesmos fatos em crimes diferentes sem concurso real
- Ausência de representação (crimes condicionados)
- Tipificação excessiva: MP imputa crime mais grave sem suporte fático
- Crime impossível, desistência voluntária, arrependimento eficaz
- Coautoria sem demonstração de liame subjetivo
""",
    DENUNCIA_SCHEMA,
)
