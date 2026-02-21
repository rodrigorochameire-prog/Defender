"""
Prompt para classificar tipo de documento jurídico.
Primeiro passo antes de aplicar prompt específico.
"""

from prompts.base import build_prompt

CLASSIFIER_SCHEMA = """{
  "document_type": "sentenca | decisao | laudo | certidao | peticao | denuncia | acordao | ato_ordinatorio | despacho | outro",
  "sub_type": "string ou null (ex: 'condenatória', 'absolutória', 'interlocutória')",
  "area": "JURI | VD | EP | CRIMINAL | CIVEL | INFANCIA | null",
  "confidence": 0.0
}"""

CLASSIFIER_PROMPT = build_prompt(
    """
TAREFA: Classificar o tipo de documento jurídico abaixo.

Analise o texto (Markdown convertido de PDF/DOCX) e identifique:
1. **document_type**: Tipo principal do documento
   - sentenca: decisão final do juiz (condenatória, absolutória, extintiva)
   - decisao: decisão interlocutória (prisão, liberdade, medida cautelar)
   - laudo: laudo pericial (médico, toxicológico, necroscópico, balístico)
   - certidao: certidão de antecedentes, óbito, nascimento, etc
   - peticao: petição, recurso, contrarrazões, memorial
   - denuncia: denúncia do MP (peça acusatória)
   - acordao: decisão de tribunal (recurso julgado)
   - ato_ordinatorio: ato de cartório (intimação, certidão de prazo)
   - despacho: despacho judicial (mero expediente)
   - outro: não classificável

2. **sub_type**: Subtipo mais específico (ex: "condenatória", "absolutória", "progressão de regime")

3. **area**: Área de atuação da Defensoria que lida com este tipo de documento

4. **confidence**: Quão certo você está da classificação (0.0 a 1.0)
""",
    CLASSIFIER_SCHEMA,
)
