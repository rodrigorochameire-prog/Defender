"""
Prompt para classificar tipo de documento jurídico.
Primeiro passo antes de aplicar prompt específico.
"""

from prompts.base import build_prompt

CLASSIFIER_SCHEMA = """{
  "document_type": "denuncia | sentenca | depoimento_vitima | depoimento_testemunha | depoimento_investigado | decisao | pronuncia | laudo_pericial | laudo_necroscopico | laudo_local | ata_audiencia | interrogatorio | alegacoes_mp | alegacoes_defesa | resposta_acusacao | recurso | habeas_corpus | boletim_ocorrencia | portaria_ip | relatorio_policial | auto_prisao | termo_inquerito | certidao_relevante | diligencias_422 | alegacoes | documento_identidade | outros | burocracia",
  "sub_type": "string ou null (ex: 'condenatória', 'absolutória', 'interlocutória')",
  "area": "JURI | VD | EP | CRIMINAL | CIVEL | INFANCIA | null",
  "confidence": 0.0,
  "relevancia": "critico | alto | medio | baixo | oculto"
}"""

CLASSIFIER_PROMPT = build_prompt(
    """
TAREFA: Classificar o tipo de documento jurídico abaixo.

Analise o texto (Markdown convertido de PDF/DOCX) e identifique:
1. **document_type**: Tipo principal do documento (taxonomy v2 — 27 tipos)

   CRÍTICO (impacto direto na defesa):
   - denuncia: denúncia do MP (peça acusatória)
   - sentenca: decisão final do juiz (condenatória, absolutória, extintiva)
   - depoimento_vitima: depoimento/oitiva de vítima
   - depoimento_testemunha: depoimento/oitiva de testemunha
   - depoimento_investigado: depoimento/oitiva de investigado/indiciado

   ALTO (análise obrigatória):
   - decisao: decisão interlocutória (prisão, liberdade, medida cautelar)
   - pronuncia: decisão de pronúncia (envia para Júri)
   - laudo_pericial: laudo pericial genérico (médico, toxicológico, balístico)
   - laudo_necroscopico: laudo necroscópico / cadavérico
   - laudo_local: laudo de exame de local / perícia de local
   - ata_audiencia: ata ou termo de audiência
   - interrogatorio: interrogatório do réu em juízo
   - alegacoes_mp: alegações finais do MP
   - alegacoes_defesa: alegações finais da defesa
   - resposta_acusacao: resposta à acusação (defesa preliminar)
   - recurso: recurso, apelação, contrarrazões, agravo, embargos
   - habeas_corpus: habeas corpus (impetração ou decisão)

   MÉDIO (contexto investigativo):
   - boletim_ocorrencia: boletim de ocorrência policial
   - portaria_ip: portaria de instauração de inquérito policial
   - relatorio_policial: relatório final do delegado
   - auto_prisao: auto de prisão em flagrante
   - termo_inquerito: termos diversos do inquérito (apreensão, restituição, etc.)
   - certidao_relevante: certidão com conteúdo relevante (antecedentes, óbito, etc.)
   - diligencias_422: diligências requeridas (art. 422 CPP ou análogas)
   - alegacoes: alegações genéricas (sem identificar se MP ou defesa)

   BAIXO (referência):
   - documento_identidade: RG, CPF, certidão de nascimento, comprovante
   - outros: documento não classificável nas categorias acima

   OCULTO (burocracia):
   - burocracia: ato ordinatório, despacho de mero expediente, certidão de prazo, guia, mandado

2. **sub_type**: Subtipo mais específico (ex: "condenatória", "absolutória", "progressão de regime")

3. **area**: Área de atuação da Defensoria que lida com este tipo de documento

4. **confidence**: Quão certo você está da classificação (0.0 a 1.0)

5. **relevancia**: Nível de relevância para a defesa (critico | alto | medio | baixo | oculto)
   Geralmente corresponde à faixa do document_type, mas pode variar pelo conteúdo.
""",
    CLASSIFIER_SCHEMA,
)
