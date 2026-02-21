"""
Enrichment Orchestrator — Orquestra: Docling → Gemini → Supabase.
Coordena o fluxo completo de enriquecimento para cada tipo de dado.
"""

import logging
import time
from pathlib import Path
from typing import Any

from config import get_settings
from services.docling_service import get_docling_service
from services.gemini_service import get_gemini_service
from services.supabase_service import get_supabase_service
from prompts.document_classifier import CLASSIFIER_PROMPT
from prompts.document_sentenca import SENTENCA_PROMPT
from prompts.document_decisao import DECISAO_PROMPT
from prompts.document_laudo import LAUDO_PROMPT
from prompts.document_certidao import CERTIDAO_PROMPT
from prompts.pje_extraction import PJE_PROMPT
from prompts.transcript_analysis import TRANSCRIPT_PROMPT
from prompts.audiencia_parsing import AUDIENCIA_PROMPT
from prompts.whatsapp_triage import WHATSAPP_PROMPT

logger = logging.getLogger("enrichment-engine.orchestrator")

# Mapeamento tipo de documento → prompt especializado
DOCUMENT_PROMPTS = {
    "sentenca": SENTENCA_PROMPT,
    "decisao": DECISAO_PROMPT,
    "laudo": LAUDO_PROMPT,
    "certidao": CERTIDAO_PROMPT,
}


class EnrichmentOrchestrator:
    """Orquestra o fluxo completo de enriquecimento."""

    def __init__(self):
        self.docling = get_docling_service()
        self.gemini = get_gemini_service()
        self.supabase = get_supabase_service()

    # === Document Enrichment ===

    async def enrich_document(
        self,
        file_url: str,
        mime_type: str,
        assistido_id: int | None = None,
        processo_id: int | None = None,
        caso_id: int | None = None,
        defensor_id: str = "",
    ) -> dict[str, Any]:
        """
        Fluxo completo: Download → Docling → Classificar → Extrair → Gravar.
        """
        start = time.time()
        entities_created = []

        try:
            # 1. Download do arquivo
            file_path, detected_mime = await self.docling.download_file(file_url)
            logger.info("Downloaded file: %s", file_path.name)

            # 2. Docling: parse para Markdown
            markdown = self.docling.parse_to_markdown(file_path)
            logger.info("Parsed to Markdown: %d chars", len(markdown))

            # 3. Classificar tipo de documento
            classification = await self.gemini.extract(CLASSIFIER_PROMPT, markdown)
            doc_type = classification.get("document_type", "outro")
            area = classification.get("area")
            logger.info(
                "Classified as: %s (area=%s, confidence=%.2f)",
                doc_type,
                area,
                classification.get("confidence", 0),
            )

            # 4. Extrair dados com prompt especializado
            specific_prompt = DOCUMENT_PROMPTS.get(doc_type)
            extracted_data = {}
            if specific_prompt:
                extracted_data = await self.gemini.extract(specific_prompt, markdown)
            else:
                # Documento genérico — usar classificação como dados
                extracted_data = classification

            confidence = extracted_data.get("confidence", classification.get("confidence", 0))

            # 5. Gravar no Supabase
            # 5a. Atualizar documento com enriquecimento
            # (ID do documento será fornecido quando integrado com Next.js)

            # 5b. Criar caseFacts se houver caso
            if caso_id and extracted_data:
                facts = self._extract_facts_from_document(extracted_data, doc_type)
                for fact in facts:
                    try:
                        result = await self.supabase.create_case_fact(
                            caso_id=caso_id,
                            descricao=fact["descricao"],
                            tipo=fact.get("tipo", "incontroverso"),
                            fonte=f"enrichment:document:{doc_type}",
                            confidence=fact.get("confidence", confidence),
                        )
                        if result:
                            entities_created.append({"type": "case_fact", "id": result.get("id")})
                    except Exception as e:
                        logger.warning("Failed to save case_fact to Supabase: %s", e)

            # 5c. Criar anotação
            if assistido_id or processo_id:
                try:
                    anotacao = await self.supabase.create_anotacao(
                        assistido_id=assistido_id,
                        processo_id=processo_id,
                        caso_id=caso_id,
                        conteudo=f"[Enrichment] Documento {doc_type} processado automaticamente",
                        tipo="enrichment",
                        metadata={
                            "document_type": doc_type,
                            "area": area,
                            "confidence": confidence,
                        },
                    )
                    if anotacao:
                        entities_created.append({"type": "anotacao", "id": anotacao.get("id")})
                except Exception as e:
                    logger.warning("Failed to save document anotacao to Supabase: %s", e)

            elapsed = time.time() - start
            logger.info(
                "Document enrichment complete | type=%s time=%.1fs entities=%d",
                doc_type,
                elapsed,
                len(entities_created),
            )

            return {
                "document_type": doc_type,
                "extracted_data": extracted_data,
                "entities_created": entities_created,
                "confidence": confidence,
                "markdown_preview": markdown[:500],
            }

        except Exception as e:
            logger.error("Document enrichment failed: %s", e)
            raise
        finally:
            # Limpar arquivo temporário
            if "file_path" in locals():
                file_path.unlink(missing_ok=True)

    def _extract_facts_from_document(
        self, data: dict, doc_type: str
    ) -> list[dict]:
        """Extrai fatos de dados de documento para caseFacts."""
        facts = []

        if doc_type == "sentenca":
            resultado = data.get("resultado", "")
            crime = data.get("crime", {})
            pena = data.get("pena", {})

            if resultado:
                facts.append({
                    "descricao": f"Sentença {resultado} — {crime.get('tipo_penal', 'crime não identificado')}",
                    "tipo": "incontroverso",
                    "confidence": data.get("confidence", 0.8),
                })

            if pena and pena.get("regime_inicial"):
                facts.append({
                    "descricao": f"Regime inicial: {pena['regime_inicial']}",
                    "tipo": "incontroverso",
                    "confidence": 0.9,
                })

        elif doc_type == "laudo":
            conclusao = data.get("conclusao_resumo", "")
            if conclusao:
                facts.append({
                    "descricao": f"Laudo: {conclusao}",
                    "tipo": "incontroverso",
                    "confidence": data.get("confidence", 0.8),
                })

            pontos = data.get("pontos_criticos", [])
            for ponto in pontos:
                facts.append({
                    "descricao": f"Ponto crítico do laudo: {ponto}",
                    "tipo": "controverso",
                    "confidence": 0.7,
                })

        elif doc_type == "decisao":
            resultado = data.get("resultado", "")
            tipo = data.get("tipo_decisao", "")
            if resultado:
                facts.append({
                    "descricao": f"Decisão ({tipo}): {resultado}",
                    "tipo": "incontroverso",
                    "confidence": data.get("confidence", 0.8),
                })

        return facts

    # === PJe Enrichment ===

    async def enrich_pje_text(
        self,
        raw_text: str,
        defensor_id: str,
    ) -> dict[str, Any]:
        """Extrai intimações profundas de texto PJe."""
        start = time.time()

        result = await self.gemini.extract(PJE_PROMPT, raw_text)

        intimacoes = result.get("intimacoes", [])

        # Gravar no Supabase: buscar processos existentes
        processos_atualizados = []
        for intimacao in intimacoes:
            numero = intimacao.get("numero_processo")
            if numero:
                try:
                    processo = await self.supabase.find_processo_by_numero(numero)
                    if processo:
                        processos_atualizados.append(processo["id"])
                except Exception as e:
                    logger.warning("Failed to find processo %s in Supabase: %s", numero, e)

        elapsed = time.time() - start
        logger.info(
            "PJe enrichment complete | intimacoes=%d time=%.1fs",
            len(intimacoes),
            elapsed,
        )

        return {
            "intimacoes": intimacoes,
            "processos_atualizados": processos_atualizados,
            "demandas_criadas": [],
            "assistidos_identificados": [],
            "total_processadas": len(intimacoes),
        }

    # === Transcript Enrichment ===

    async def enrich_transcript(
        self,
        transcript: str,
        assistido_id: int,
        processo_id: int | None = None,
        caso_id: int | None = None,
        context: str | None = None,
    ) -> dict[str, Any]:
        """Extrai inteligência de transcrição de atendimento."""
        start = time.time()
        entities_created = []

        # Adicionar contexto se houver
        full_text = transcript
        if context:
            full_text = f"CONTEXTO ANTERIOR:\n{context}\n\n---\n\nTRANSCRIÇÃO ATUAL:\n{transcript}"

        result = await self.gemini.extract(TRANSCRIPT_PROMPT, full_text)

        # Gravar caseFacts
        if caso_id:
            for fact in result.get("facts", []):
                try:
                    fact_result = await self.supabase.create_case_fact(
                        caso_id=caso_id,
                        descricao=fact.get("descricao", ""),
                        tipo=fact.get("tipo", "incontroverso"),
                        fonte="enrichment:transcript",
                        confidence=fact.get("confidence", 0.5),
                    )
                    if fact_result:
                        entities_created.append({"type": "case_fact", "id": fact_result.get("id")})
                except Exception as e:
                    logger.warning("Failed to save transcript case_fact to Supabase: %s", e)

            # Gravar casePersonas
            for person in result.get("persons_mentioned", []):
                try:
                    persona_result = await self.supabase.create_case_persona(
                        caso_id=caso_id,
                        nome=person.get("nome", ""),
                        papel=person.get("papel", "outro"),
                        descricao=person.get("descricao", ""),
                    )
                    if persona_result:
                        entities_created.append({"type": "case_persona", "id": persona_result.get("id")})
                except Exception as e:
                    logger.warning("Failed to save case_persona to Supabase: %s", e)

        # Gravar anotação com resumo
        resumo = result.get("resumo_para_prontuario", "")
        if resumo:
            try:
                anotacao = await self.supabase.create_anotacao(
                    assistido_id=assistido_id,
                    processo_id=processo_id,
                    caso_id=caso_id,
                    conteudo=resumo,
                    tipo="enrichment:transcript",
                    urgencia=result.get("urgency_level", "low"),
                    metadata={
                        "key_points": result.get("key_points", []),
                        "teses_possiveis": result.get("teses_possiveis", []),
                    },
                )
                if anotacao:
                    entities_created.append({"type": "anotacao", "id": anotacao.get("id")})
            except Exception as e:
                logger.warning("Failed to save transcript anotacao to Supabase: %s", e)

        elapsed = time.time() - start
        logger.info(
            "Transcript enrichment complete | facts=%d persons=%d time=%.1fs",
            len(result.get("facts", [])),
            len(result.get("persons_mentioned", [])),
            elapsed,
        )

        result["entities_created"] = entities_created
        return result

    # === Audiência Enrichment ===

    async def enrich_audiencia(
        self,
        pauta_text: str,
        defensor_id: str,
    ) -> dict[str, Any]:
        """Extrai audiências de pauta PJe."""
        start = time.time()

        result = await self.gemini.extract(AUDIENCIA_PROMPT, pauta_text)

        audiencias = result.get("audiencias", [])
        processos_vinculados = []

        for aud in audiencias:
            numero = aud.get("numero_processo")
            if numero:
                try:
                    processo = await self.supabase.find_processo_by_numero(numero)
                    if processo:
                        processos_vinculados.append(processo["id"])
                except Exception as e:
                    logger.warning("Failed to find processo %s in Supabase: %s", numero, e)

        elapsed = time.time() - start
        logger.info(
            "Audiencia enrichment complete | audiencias=%d time=%.1fs",
            len(audiencias),
            elapsed,
        )

        return {
            "audiencias": audiencias,
            "audiencias_criadas": [],
            "processos_vinculados": processos_vinculados,
        }

    # === WhatsApp Enrichment ===

    async def enrich_whatsapp(
        self,
        message: str,
        contact_id: str,
        assistido_id: int | None = None,
    ) -> dict[str, Any]:
        """Triagem de mensagem WhatsApp."""
        start = time.time()
        entities_created = []

        result = await self.gemini.extract(WHATSAPP_PROMPT, message)

        # Gravar anotação se urgente ou se assistido identificado
        urgency = result.get("urgency_level", "low")
        if urgency in ("high", "critical") or assistido_id:
            try:
                anotacao = await self.supabase.create_anotacao(
                    assistido_id=assistido_id,
                    conteudo=result.get("resumo", message[:200]),
                    tipo="enrichment:whatsapp",
                    urgencia=urgency,
                    metadata={
                        "contact_id": contact_id,
                        "subject": result.get("subject"),
                        "extracted_info": result.get("extracted_info", {}),
                    },
                )
                if anotacao:
                    entities_created.append({"type": "anotacao", "id": anotacao.get("id")})
            except Exception as e:
                logger.warning("Failed to save WhatsApp anotacao to Supabase: %s", e)

        elapsed = time.time() - start
        logger.info(
            "WhatsApp enrichment complete | urgency=%s time=%.1fs",
            urgency,
            elapsed,
        )

        result["entities_created"] = entities_created
        return result


# Singleton
_orchestrator: EnrichmentOrchestrator | None = None


def get_orchestrator() -> EnrichmentOrchestrator:
    """Retorna singleton do EnrichmentOrchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = EnrichmentOrchestrator()
    return _orchestrator
