"""
Prompts para extração de dados estruturados de notícias policiais.
Usado pelo RadarExtractionService com Gemini Flash.
"""

RADAR_NEWS_EXTRACTION_PROMPT = """Você é um extrator de dados especializado em notícias policiais da região de Camaçari/BA e Região Metropolitana de Salvador.

BAIRROS DE CAMAÇARI (para referência):
Abrantes, Alto do Cruzeiro, Arembepe, Barra do Jacuípe, Campo Limpo, Catu de Abrantes, Centro, Dois de Julho, Fazenda Mamão, Gleba C, Gleba E, Guarajuba, Imbassaí, Jauá, Lama Preta, Monte Gordo, Nova Esperança, Parafuso, Parque das Mangabas, Phoc I, Phoc II, Piaçaveira, Pólo Petroquímico, Santo Antônio, São Bento, Sucuiu, Vila de Abrantes

Analise o texto da notícia abaixo e extraia as seguintes informações em JSON:

{
  "relevante": true,
  "confianca_local": 95,
  "tipo_crime": "homicidio|tentativa_homicidio|trafico|roubo|furto|violencia_domestica|sexual|lesao_corporal|porte_arma|estelionato|outros",
  "bairro": "nome do bairro (null se não mencionado)",
  "logradouro": "rua/avenida/local específico (null se não mencionado)",
  "delegacia": "delegacia mencionada (null se não mencionada)",
  "circunstancia": "flagrante|mandado|denuncia|operacao|investigacao|julgamento|null",
  "artigos_penais": ["art. 121 CP", "art. 33 Lei 11.343"],
  "arma_meio": "arma de fogo|faca|paulada|sem arma|veículo|veneno|null",
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

GUIA DE CLASSIFICAÇÃO DE TIPO_CRIME:

• "violencia_domestica" — USE para qualquer violência no âmbito familiar/afetivo:
  Padrões comuns: "agrediu a companheira", "espancou a esposa", "ex-namorado agrediu", "violência contra a mulher", "Lei Maria da Penha", "lesão corporal doméstica", "agressão contra cônjuge", "vítima da própria família", "violência doméstica e familiar".

• "porte_arma" — USE quando a posse/porte ilegal de arma for o crime principal:
  Padrões comuns: "encontrado com arma", "preso com revólver", "apreensão de pistola", "portava ilegalmente arma de fogo", "arma sem registro", "posse ilegal de arma", "art. 14 ou art. 16 do Estatuto do Desarmamento".

• "lesao_corporal" — USE para agressões físicas entre pessoas SEM contexto doméstico/familiar e sem resultado morte:
  Inclui: briga de bar, briga de vizinhos, briga de rua, paulada, facada sem morte, espancamento, "vias de fato", rixa.

• "trafico" — USE quando envolver comércio ou porte para venda de drogas:
  Padrões comuns: "drogas apreendidas", "entorpecentes", "pé de maconha", "crack encontrado", "cocaína apreendida", "boca de fumo", "traficante", "art. 33 Lei 11.343/06", "associação para o tráfico".

• "outros" — Use SOMENTE quando o crime realmente não se encaixe em nenhuma das categorias acima (homicidio, tentativa_homicidio, trafico, roubo, furto, violencia_domestica, sexual, lesao_corporal, porte_arma, estelionato). Exemplos legítimos de "outros": crime ambiental, desacato, resistência, corrupção, descaminho. NÃO use "outros" por comodidade — sempre tente encaixar primeiro.

REGRAS:
1. Extraia TODOS os nomes próprios de pessoas mencionados (suspeitos, vítimas, presos, acusados)
2. Nomes devem ser em MAIÚSCULAS e completos quando possível
3. Se a notícia mencionar "fulano, X anos", extraia a idade
4. Vulgo/apelido: extraia se mencionado entre aspas, parênteses ou após "conhecido como"
5. Para tipo_crime, use a categoria mais específica possível — consulte o guia acima antes de usar "outros"
6. Para bairro, use o nome exato como aparece na notícia (consulte a lista de bairros de Camaçari acima)
7. Se houver múltiplos crimes, escolha o mais grave
8. data_fato é a data do FATO, não da publicação
9. Resumo deve ser factual, sem termos como "meliante", "elemento", "bandido"
10. Se não conseguir extrair um campo, use null
11. IMPORTANTE sobre envolvidos: use nome=null se a pessoa não é identificada por nome próprio. NÃO use palavras genéricas como "HOMEM", "MULHER", "CRIMINOSO", "FILHO", "INDIVÍDUOS" como nome — esses devem ser nome=null
12. Inclua envolvidos sem nome identificado com papel e idade quando disponíveis (ex: {"nome": null, "papel": "suspeito", "idade": 32})
13. CAMPO "relevante": defina como false APENAS SE o crime claramente ocorreu em outra cidade/estado (ex: "Rio de Janeiro", "Feira de Santana", "Ceará") ou se NÃO é uma notícia policial (é político, esporte, economia). Se há dúvida, mantenha true.
14. CAMPO "confianca_local": integer de 0 a 100 indicando certeza de que é crime em Camaçari. 90-100: bairro específico de Camaçari mencionado. 70-89: "Camaçari" explícito no texto. 50-69: RMS sem especificar cidade. 0-49: outra cidade/estado identificada.
15. CAMPO "circunstancia": use exatamente um desses valores — flagrante (preso em flagrante), mandado (cumprimento de mandado de prisão/busca), denuncia (MP ofereceu denúncia/indiciamento), operacao (operação policial planejada), investigacao (fase de investigação), julgamento (audiência/julgamento/sentença). Use null se não aplicável.
16. CAMPO "arma_meio": exemplos — "arma de fogo", "faca", "paulada", "sem arma", "veículo", "veneno". Use null se não mencionado.

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
