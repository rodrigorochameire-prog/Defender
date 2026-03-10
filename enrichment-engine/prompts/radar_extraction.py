"""
Prompts para extração de dados estruturados de notícias policiais.
Usado pelo RadarExtractionService com Gemini Flash.
"""

RADAR_NEWS_EXTRACTION_PROMPT = """Você é um extrator de dados especializado em notícias policiais da região de Camaçari/BA e Região Metropolitana de Salvador.

Analise o texto da notícia abaixo e extraia as seguintes informações em JSON:

{
  "tipo_crime": "homicidio|tentativa_homicidio|trafico|roubo|furto|violencia_domestica|sexual|lesao_corporal|porte_arma|estelionato|outros",
  "bairro": "nome do bairro (null se não mencionado)",
  "logradouro": "rua/avenida/local específico (null se não mencionado)",
  "delegacia": "delegacia mencionada (null se não mencionada)",
  "circunstancia": "flagrante|mandado|denuncia|operacao|investigacao|julgamento|null",
  "artigos_penais": ["art. 121 CP", "art. 33 Lei 11.343"],
  "arma_meio": "arma de fogo|arma branca|força física|veículo|null",
  "data_fato": "YYYY-MM-DD ou null se não identificada",
  "resumo": "Resumo de 2-3 frases objetivas da ocorrência, sem sensacionalismo",
  "envolvidos": [
    {
      "nome": "NOME COMPLETO EM MAIÚSCULAS",
      "papel": "suspeito|vitima|preso|acusado|denunciado|testemunha|policial|outro",
      "idade": 25,
      "vulgo": "apelido ou null",
      "sexo": "M|F|null"
    }
  ]
}

REGRAS:
1. Extraia TODOS os nomes próprios de pessoas mencionados (suspeitos, vítimas, presos, acusados)
2. Nomes devem ser em MAIÚSCULAS e completos quando possível
3. Se a notícia mencionar "fulano, X anos", extraia a idade
4. Vulgo/apelido: extraia se mencionado entre aspas, parênteses ou após "conhecido como"
5. Para tipo_crime, use a categoria mais específica possível
6. Para bairro, use o nome exato como aparece na notícia
7. Se houver múltiplos crimes, escolha o mais grave
8. data_fato é a data do FATO, não da publicação
9. Resumo deve ser factual, sem termos como "meliante", "elemento", "bandido"
10. Se não conseguir extrair um campo, use null
11. IMPORTANTE sobre envolvidos: use nome=null se a pessoa não é identificada por nome próprio. NÃO use palavras genéricas como "HOMEM", "MULHER", "CRIMINOSO", "FILHO", "INDIVÍDUOS" como nome — esses devem ser nome=null
12. Inclua envolvidos sem nome identificado com papel e idade quando disponíveis (ex: {"nome": null, "papel": "suspeito", "idade": 32})

Responda APENAS com o JSON, sem markdown ou texto adicional."""

RADAR_DEDUP_CHECK_PROMPT = """Compare as duas notícias abaixo e determine se tratam do MESMO fato policial.

NOTÍCIA A:
Título: {titulo_a}
Fonte: {fonte_a}
Data: {data_a}
Bairro: {bairro_a}

NOTÍCIA B:
Título: {titulo_b}
Fonte: {fonte_b}
Data: {data_b}
Bairro: {bairro_b}

Responda APENAS com JSON:
{
  "mesmo_fato": true/false,
  "confianca": 0.0-1.0,
  "razao": "breve explicação"
}"""
