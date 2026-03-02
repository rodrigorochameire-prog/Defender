"""
Prompt para extração de dados de DEPOIMENTOS.
Inquérito, juízo, vítima, testemunha, informante — peça fundamental para defesa.
"""

from prompts.base import build_prompt

DEPOIMENTO_SCHEMA = """{
  "depoente": {
    "nome": "string",
    "qualificacao": "reu | vitima | testemunha_acusacao | testemunha_defesa | informante | policial | perito | correu",
    "profissao": "string ou null",
    "relacao_com_reu": "string ou null (ex: vizinho, namorada, colega de trabalho)"
  },
  "fase": "inquerito | instrucao | plenario_juri | reconhecimento | acareacao | outro",
  "data_depoimento": "YYYY-MM-DD ou null",
  "local": "string ou null (delegacia, fórum, etc)",
  "sob_compromisso": true,
  "fatos_narrados": [
    {
      "descricao": "string (fato narrado, max 200 chars)",
      "pagina": 0,
      "relevancia_defesa": "favoravel | desfavoravel | neutro"
    }
  ],
  "versao_resumida": "string (max 500 chars — resumo do depoimento)",
  "hora_fato_mencionada": "string ou null (ex: 'por volta das 22h', 'de madrugada')",
  "local_fato_mencionado": "string ou null",
  "reconheceu_reu": true,
  "forma_reconhecimento": "string ou null (ex: pessoal, fotográfico, em juízo)",
  "contradicoes_internas": ["string (contradições DENTRO do próprio depoimento)"],
  "trechos_chave": [
    {
      "trecho": "string (citação literal ou paráfrase próxima)",
      "pagina": 0,
      "relevancia": "string (por que este trecho importa)"
    }
  ],
  "menciona_violencia_policial": true,
  "menciona_coacao": true,
  "credibilidade": {
    "score": 0,
    "justificativa": "string (max 300 chars — por que este score)"
  },
  "observacoes_defesa": ["string (oportunidades para a defesa)"],
  "numero_processo": "string ou null",
  "confidence": 0.0
}"""

DEPOIMENTO_PROMPT = build_prompt(
    """
TAREFA: Extrair dados estruturados de um DEPOIMENTO (inquérito ou judicial).

Depoimentos são a ESPINHA DORSAL da prova penal. Extraia com máxima atenção:

1. **Depoente**: Nome, qualificação, profissão, relação com réu
2. **Fase**: Inquérito, instrução, plenário (Júri), reconhecimento, acareação
3. **Fatos narrados**: CADA fato relevante com indicação de página e relevância para defesa
4. **Versão resumida**: Síntese objetiva do depoimento (max 500 chars)
5. **Referências temporais e espaciais**: Hora e local do fato mencionados — CRUCIAIS para contradições
6. **Reconhecimento**: Se reconheceu o réu, por qual método (pessoal, foto, show-up)
7. **Contradições internas**: Dentro do MESMO depoimento, onde se contradiz
8. **Trechos-chave**: Citações literais ou paráfrases próximas mais importantes
9. **Credibilidade**: Score 0-100 com justificativa objetiva

VISÃO DA DEFESA — ATENÇÃO MÁXIMA:
- Contradição entre depoimento em inquérito vs juízo é OURO para defesa
- Reconhecimento fotográfico sem alinhamento de suspeitos é NULO (STJ)
- Testemunha única como base de condenação → fragilidade probatória
- Depoente que não presenciou diretamente = ouvir dizer (hearsay) → não vale como prova
- Policial como única testemunha: verificar se relato é genérico/padronizado
- Menção a violência policial ou coação INVALIDA confissão/reconhecimento
- Tempo entre fato e depoimento: quanto maior, menor a confiabilidade
- Depoimentos colhidos em grupo (delegacia) podem ter contaminação
- Declarações da vítima são prova, mas contradições minam credibilidade
""",
    DEPOIMENTO_SCHEMA,
)
