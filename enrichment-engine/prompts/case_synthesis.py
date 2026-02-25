"""
Prompt para sintese consolidada do caso — agrega dados de multiplos documentos
enriquecidos em uma visao unificada para a defesa.
"""

from prompts.base import build_prompt

CASE_SYNTHESIS_SPECIFIC = """
TAREFA: SINTESE CONSOLIDADA DO CASO

Voce recebera dados previamente extraidos de multiplos documentos de um mesmo caso
criminal. Cada documento ja foi processado individualmente — sua tarefa agora e
CONSOLIDAR tudo em uma visao unificada para o defensor publico.

ETAPAS:
1. RESUMO: Sintetize o caso em max 500 caracteres (quem e acusado, de que, contexto)
2. ACHADOS-CHAVE: Identifique os 5-10 pontos mais relevantes para a DEFESA
3. RECOMENDACOES: Liste 3-5 acoes estrategicas prioritarias
4. INCONSISTENCIAS: Aponte contradicoes entre documentos (depoimentos vs laudos, etc)
5. TESES DEFENSIVAS: Consolide todas as teses possiveis com fundamentacao
6. NULIDADES: Liste nulidades processuais com severidade (alta/media/baixa)
7. PESSOAS: Consolide lista de pessoas com papel no caso
8. CRONOLOGIA: Extraia eventos em ordem cronologica
9. ACUSACOES: Liste crimes/artigos penais imputados

REGRAS:
- Priorize informacoes UTEIS PARA A DEFESA (nao para a acusacao)
- NAO invente dados — use SOMENTE o que esta nos documentos
- Indique confianca (confidence 0.0-1.0) quando houver ambiguidade
- Referencie documentos fonte quando possivel (use o indice do documento)
- Destaque URGENCIAS (reu preso, prazos curtos, audiencias proximas)
- Identifique LACUNAS — o que falta nos autos que seria importante
"""

CASE_SYNTHESIS_SCHEMA = """{
  "resumo": "string (max 500 chars) — sinopse do caso",
  "achados_chave": ["string — pontos relevantes para defesa (max 10)"],
  "recomendacoes": ["string — acoes estrategicas (max 5)"],
  "inconsistencias": ["string — contradicoes entre documentos"],
  "teses": [
    {
      "titulo": "string — nome da tese",
      "fundamentacao": "string — base legal e fatica",
      "confidence": 0.0
    }
  ],
  "nulidades": [
    {
      "tipo": "string — ex: busca_sem_mandado, cadeia_custodia, cerceamento_defesa",
      "descricao": "string",
      "severidade": "alta | media | baixa",
      "fundamentacao": "string — base legal",
      "documento_ref": "string | null — indice do documento fonte"
    }
  ],
  "pessoas": [
    {
      "nome": "string",
      "tipo": "reu | testemunha | vitima | perito | policial | delegado | juiz | familiar | outro",
      "descricao": "string | null — contexto relevante",
      "documentos_ref": ["string — indices dos documentos que mencionam"],
      "relevancia_defesa": "string | null — por que importa para a defesa",
      "confidence": 0.0
    }
  ],
  "cronologia": [
    {
      "data": "YYYY-MM-DD | null",
      "descricao": "string",
      "tipo": "fato | processual | probatorio",
      "documento_ref": "string | null",
      "relevancia": "alta | media | baixa"
    }
  ],
  "acusacoes": [
    {
      "crime": "string — tipo penal",
      "artigos": ["string — ex: art. 157, §2, I, CP"],
      "qualificadoras": ["string"],
      "reu": "string — nome do acusado",
      "status": "string | null — pendente, condenado, absolvido"
    }
  ],
  "lacunas": ["string — informacoes que faltam nos autos"],
  "urgencias": ["string — pontos que requerem acao imediata"],
  "confidence": 0.0
}"""

CASE_SYNTHESIS_PROMPT = build_prompt(CASE_SYNTHESIS_SPECIFIC, CASE_SYNTHESIS_SCHEMA)
