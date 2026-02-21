"""
Prompt para extração profunda de intimações PJe.
O texto vem do copy-paste do PJe — formato irregular, cada expediente aparece 2x.
"""

from prompts.base import build_prompt

PJE_SCHEMA = """{
  "intimacoes": [
    {
      "numero_processo": "string (formato CNJ completo)",
      "vara": "string",
      "comarca": "string",
      "atribuicao": "JURI | VD | EP | CRIMINAL | CIVEL | INFANCIA",
      "intimado": "string (nome da pessoa sendo intimada — pode ser corréu, não necessariamente o réu principal)",
      "reu_principal": "string ou null (nome do réu na linha 'X')",
      "correus": ["string"],
      "vitima": "string ou null",
      "parte_autora": "string (MP, DH, Coord.Polícia, etc)",
      "crime": "string (tipo penal por extenso)",
      "artigos": ["string (artigos com lei)"],
      "qualificadoras": ["string"],
      "fase_processual": "inquerito | denuncia | instrucao | alegacoes_finais | sentenca | recurso | execucao | cumprimento",
      "tipo_documento": "Intimação | Sentença | Decisão | Despacho | Certidão | Ato Ordinatório | Termo | Edital",
      "tipo_expedicao": "Expedição eletrônica | Diário Eletrônico | Edital",
      "tipo_prazo": "ciencia | peticionar | audiencia | cumprimento | outro",
      "data_limite": "YYYY-MM-DD ou null",
      "dias_prazo": 0,
      "reu_preso": false,
      "texto_expediente": "string (resumo do conteúdo do expediente, max 200 chars)",
      "urgencia": "low | medium | high | critical",
      "confidence": 0.0
    }
  ],
  "total_encontradas": 0,
  "resumo": "string (visão geral das intimações)"
}"""

PJE_PROMPT = build_prompt(
    """
TAREFA: Extrair TODAS as intimações de um texto copiado do PJe (Processo Judicial Eletrônico).

FORMATO DO PJe:
- Cada expediente aparece DUAS vezes (resumo colapsado + detalhe expandido)
- NÃO duplique — cada processo é UMA intimação
- O nome ACIMA do tipo de documento (ex: "FULANO\nDecisão (12345)") é o INTIMADO
- O INTIMADO pode ser diferente do réu principal na linha "X"
- Em casos com "e outros (N)", o intimado é um corréu específico

PADRÕES DE PARTES:
- "MINISTÉRIO PÚBLICO X RÉUNAME" → MP é autor, réu é o nome
- "RÉUNAME X MINISTÉRIO PÚBLICO" → Liberdade provisória (réu é autor)
- "DELEGACIA/COORD.POLÍCIA X RÉUNAME" → Inquérito policial
- "DH (DEFENSORIA) X RÉUNAME" → HC ou ação da defensoria
- "NOME X NOME" → Pode ser cível, insanidade, etc

PADRÕES DE VARA:
- "/VARA DO", "/VARA DE", "/VARA DA", "/1ª V", "/2ª V" etc

CRIME/ASSUNTO:
- Pode estar na MESMA linha que o tipo do processo OU na PRÓXIMA linha
- Ex: "Ação Penal - Procedimento Ordinário\nRoubo Majorado"

LINHAS A IGNORAR:
- "Último movimento:", "Data limite prevista", "Você tomou ciência"
- "O sistema registrou", nomes de dias da semana isolados

CLASSIFICAÇÃO DE URGÊNCIA:
- critical: réu preso + prazo vencendo
- high: réu preso OU prazo < 3 dias
- medium: prazo < 10 dias
- low: prazo > 10 dias ou ciência simples

DETECÇÃO DE RÉU PRESO:
- Buscar: "preso", "prisão", "flagrante", "preventiva", "custodiado"
- Se encontrar qualquer menção, reu_preso = true

ATRIBUIÇÃO (classificar com base em):
- JURI: crimes dolosos contra a vida (homicídio, tentativa homicídio, infanticídio)
- VD: Lei Maria da Penha, violência doméstica, medida protetiva
- EP: execução penal, progressão, benefício, saída temporária, livramento condicional
- CRIMINAL: tráfico, roubo, furto, receptação, porte/posse arma, estelionato, etc
- INFANCIA: ato infracional, ECA, menor
- CIVEL: ação cível, alimentos, guarda, etc
""",
    PJE_SCHEMA,
)
