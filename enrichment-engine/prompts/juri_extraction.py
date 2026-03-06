"""
Prompts para extração de dados de documentos de Tribunal do Júri.
Três tipos: Quesitos (folha de votação), Sentença (dosimetria) e Ata da Sessão.
"""

from prompts.base import build_prompt

# ---------------------------------------------------------------------------
# 1) QUESITOS — Folha de votação do Júri
# ---------------------------------------------------------------------------

QUESITOS_SCHEMA = """{
  "quesitos": [
    {
      "numero": 1,
      "texto": "texto completo do quesito",
      "tipo": "materialidade | autoria | absolvicao | qualificadora | privilegio | causa_aumento | causa_diminuicao | custom",
      "resultado": "sim | nao | prejudicado",
      "ordem_votacao": 1
    }
  ]
}"""

PROMPT_QUESITOS = build_prompt(
    """
TAREFA: Extrair TODOS os quesitos (perguntas ao júri) da folha/planilha de votação.

CONTEXTO — TRIBUNAL DO JÚRI BRASILEIRO:
No Júri brasileiro, os jurados respondem SIM ou NÃO a uma sequência de quesitos (CPP, art. 483):
1. **Materialidade**: "O acusado... praticou o fato descrito na denúncia?" (o fato existiu?)
2. **Autoria**: "O acusado concorreu para a prática do fato?" (foi ele?)
3. **Absolvição genérica** (obrigatório): "O jurado absolve o acusado?" (art. 483, §2° — se 4+ SIM, absolve sem especificar razão)
4. **Qualificadoras**: uma pergunta por qualificadora (motivo torpe, fútil, meio cruel, etc.)
5. **Privilégio**: violenta emoção, relevante valor moral/social (art. 121, §1°)
6. **Causas de aumento**: se houve (ex: contra menor de 14 anos, feminicídio com certos agravantes)
7. **Causas de diminuição**: tentativa, participação de menor importância, etc.

REGRAS:
- Se o resultado de um quesito anterior prejudica o seguinte, marque "prejudicado".
- "SIM" por maioria = 4 ou mais jurados votaram SIM (dos 7 jurados).
- A ordem de votação pode diferir do número sequencial — capturar ambos se informados.
- Se o documento não informar a ordem de votação, usar o número sequencial.
- Tipo "custom" para quesitos fora das categorias padrão.

ATENÇÃO ESPECIAL:
- Documentos de quesitos podem ser manuscritos/carimbados → texto pode ter ruídos de OCR.
- Quesitos prejudicados NÃO são votados — resultado é sempre "prejudicado".
- Se houver mais de um réu, identificar a qual réu se refere cada bloco de quesitos.
""",
    QUESITOS_SCHEMA,
)

# ---------------------------------------------------------------------------
# 2) SENTENÇA — Dosimetria pós-júri
# ---------------------------------------------------------------------------

SENTENCA_JURI_SCHEMA = """{
  "dosimetria": {
    "pena_base": "texto da pena base (ex: '12 anos de reclusão')",
    "circunstancias_judiciais": [
      {
        "nome": "culpabilidade | antecedentes | conduta_social | personalidade | motivos | circunstancias | consequencias | comportamento_vitima",
        "valoracao": "favoravel | desfavoravel | neutra",
        "fundamentacao": "texto resumido da fundamentação"
      }
    ],
    "agravantes": [
      {
        "artigo": "art. 61, II, 'a', CP",
        "descricao": "texto da agravante",
        "quantum_aplicado": "fração ou meses se informado ou null"
      }
    ],
    "atenuantes": [
      {
        "artigo": "art. 65, III, 'd', CP",
        "descricao": "texto da atenuante",
        "quantum_aplicado": "fração ou meses se informado ou null"
      }
    ],
    "causas_aumento": [
      {
        "artigo": "artigo e lei",
        "descricao": "descrição",
        "fracao": "1/3, 1/2, 2/3 etc."
      }
    ],
    "causas_diminuicao": [
      {
        "artigo": "artigo e lei",
        "descricao": "descrição",
        "fracao": "1/3, 1/6, etc."
      }
    ],
    "pena_total_meses": 0,
    "regime_inicial": "fechado | semiaberto | aberto",
    "tipo_penal": "homicidio_simples | homicidio_qualificado | homicidio_privilegiado | homicidio_privilegiado_qualificado | homicidio_tentado | feminicidio | latrocinio | outro",
    "qualificadoras": ["motivo torpe", "meio cruel", "recurso que impossibilitou defesa da vítima"],
    "data_fato": "YYYY-MM-DD ou null",
    "data_sentenca": "YYYY-MM-DD ou null",
    "juiz_presidente": "nome do juiz ou null",
    "numero_processo": "formato CNJ ou null",
    "reu_nome": "nome do réu",
    "vitima_nome": "nome da vítima ou null",
    "detencao_provisoria_descontada": true,
    "observacoes": ["notas relevantes"]
  }
}"""

PROMPT_SENTENCA = build_prompt(
    """
TAREFA: Extrair a dosimetria COMPLETA de uma sentença pós-júri.

CONTEXTO — DOSIMETRIA PENAL BRASILEIRA:
A dosimetria segue sistema trifásico (art. 68, CP):
1ª FASE — Pena-base: Circunstâncias judiciais (art. 59 CP — 8 vetores)
2ª FASE — Agravantes e atenuantes (arts. 61-66 CP)
3ª FASE — Causas de aumento e diminuição (frações)

CIRCUNSTÂNCIAS JUDICIAIS (art. 59):
- Culpabilidade, Antecedentes, Conduta social, Personalidade
- Motivos, Circunstâncias do crime, Consequências, Comportamento da vítima

REGRAS DE EXTRAÇÃO:
- Calcular pena_total_meses corretamente (converter anos + meses).
- Regime: fechado (pena > 8 anos), semiaberto (4-8 anos), aberto (< 4 anos) — salvo reincidência.
- Se a sentença for de DESCLASSIFICAÇÃO para crime doloso não contra vida, anotar em observações.
- Capturar se houve desconto de prisão provisória.
- tipo_penal: usar "outro" e detalhar em observações se fora das categorias listadas.
- Se houver concurso de crimes, extrair CADA crime separadamente se possível.

ATENÇÃO ESPECIAL:
- Sentenças de júri são LONGAS — foque na seção "DOSIMETRIA" ou "DA PENA".
- Qualificadoras reconhecidas pelo júri devem estar nos quesitos — verificar coerência.
- Em caso de tentativa, a fração de diminuição (1/3 a 2/3) deve estar nas causas_diminuicao.
""",
    SENTENCA_JURI_SCHEMA,
)

# ---------------------------------------------------------------------------
# 3) ATA DA SESSÃO — Registro da audiência de júri
# ---------------------------------------------------------------------------

ATA_SCHEMA = """{
  "ata": {
    "juiz_presidente": "nome completo do juiz ou null",
    "promotor": "nome do promotor ou null",
    "defensor": "nome do defensor ou null",
    "reu_nome": "nome do réu",
    "vitima_nome": "nome da vítima ou null",
    "numero_processo": "formato CNJ ou null",
    "horario_inicio": "HH:MM ou null",
    "horario_fim": "HH:MM ou null",
    "duracao_minutos": 0,
    "data_sessao": "YYYY-MM-DD ou null",
    "testemunhas_acusacao": [
      { "nome": "nome", "ouvida": true }
    ],
    "testemunhas_defesa": [
      { "nome": "nome", "ouvida": true }
    ],
    "testemunhas_ouvidas_total": 0,
    "usou_algemas": false,
    "reu_presente": true,
    "sessao_publica": true,
    "incidentes": ["descrição de incidentes processuais"],
    "diligencias_em_plenario": ["diligências realizadas durante a sessão"],
    "local_fato": "local do crime se mencionado ou null",
    "tese_acusacao_resumo": "resumo da tese acusatória ou null",
    "tese_defesa_resumo": "resumo da tese defensiva ou null",
    "resultado": "condenado | absolvido | dissolvido | adiado | desclassificado | null",
    "observacoes": ["notas relevantes"]
  }
}"""

PROMPT_ATA = build_prompt(
    """
TAREFA: Extrair informações-chave da ATA DE SESSÃO do Tribunal do Júri.

CONTEXTO — ATA DE SESSÃO DE JÚRI:
A ata registra formalmente tudo que aconteceu durante o julgamento:
- Composição da mesa (juiz, promotor, defensor)
- Sorteio e compromisso dos jurados
- Testemunhas ouvidas (acusação e defesa)
- Incidentes processuais (contraditas, desistências, dissoluções)
- Debates (acusação e defesa, réplica e tréplica se houver)
- Votação dos quesitos (se registrado na ata)
- Leitura da sentença

REGRAS DE EXTRAÇÃO:
- Horários: formato HH:MM (24h). Calcular duração se início e fim estiverem presentes.
- Testemunhas: listar TODAS com indicação se foram efetivamente ouvidas ou desistidas/ausentes.
- Algemas: verificar se há menção a uso de algemas (relevante para Súmula Vinculante 11 STF).
- Incidentes: qualquer fato processual relevante (recusa de jurado, contradita, pedido de dissolução, uso de prova ilícita, aparelho celular em plenário, etc.).
- Se a sessão foi DISSOLVIDA (não chegou a veredicto), registrar resultado como "dissolvido".
- Se o júri foi ADIADO antes de iniciar, registrar como "adiado".

ATENÇÃO ESPECIAL:
- Atas podem ser muito formais e repetitivas — foque nos dados FACTUAIS.
- O horário de início/fim é ESSENCIAL (sessões > 12h podem ser nulidade).
- Identificar se o réu estava PRESENTE e se estava ALGEMADO.
""",
    ATA_SCHEMA,
)
