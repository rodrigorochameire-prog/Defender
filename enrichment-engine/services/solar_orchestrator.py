"""
Solar Orchestrator — Coordena: Scraper → Gemini → Supabase → Drive (via base64).
Fluxo completo de sincronização de processos do Solar com OMBUDS.
"""

import asyncio
import base64
import logging
import time
from typing import Any

from config import get_settings
from services.solar_auth_service import get_solar_auth_service
from services.solar_scraper_service import get_solar_scraper_service
from services.gemini_service import get_gemini_service
from services.supabase_service import get_supabase_service
from prompts.solar_movimentacao import SOLAR_MOVIMENTACAO_PROMPT

logger = logging.getLogger("enrichment-engine.solar-orchestrator")

# Tipos de movimentação que merecem extração Gemini
MOVIMENTACOES_SIGNIFICATIVAS = {
    "sentença",
    "sentenca",
    "decisão",
    "decisao",
    "despacho",
    "intimação",
    "intimacao",
    "acórdão",
    "acordao",
}


class SolarOrchestrator:
    """Orquestra sincronização completa de processos do Solar."""

    def __init__(self):
        self.settings = get_settings()
        self.scraper = get_solar_scraper_service()
        self.gemini = get_gemini_service()
        self.supabase = get_supabase_service()
        self._semaphore = asyncio.Semaphore(1)  # Single browser = 1 concurrent

    async def sync_processo(
        self,
        numero_processo: str,
        processo_id: int | None = None,
        assistido_id: int | None = None,
        caso_id: int | None = None,
        download_pdfs: bool = True,
    ) -> dict[str, Any]:
        """
        Fluxo completo de sincronização de um processo.

        1. Resolve IDs no OMBUDS DB se não fornecidos
        2. Scrape Solar → movimentações
        3. Filtra movimentações NOVAS
        4. Gemini extrai dados de movimentações significativas
        5. Grava no Supabase (anotações, case_facts)
        6. Baixa PDFs → retorna base64 para frontend
        """
        start = time.time()
        entities_created = []
        errors = []
        pdfs = []

        logger.info(
            "Sync processo: %s | processo_id=%s assistido_id=%s caso_id=%s",
            numero_processo,
            processo_id,
            assistido_id,
            caso_id,
        )

        async with self._semaphore:
            try:
                # 1. Resolver IDs no OMBUDS se não fornecidos
                if not processo_id:
                    db_processo = await self.supabase.find_processo_by_numero(numero_processo)
                    if db_processo:
                        processo_id = db_processo.get("id")
                        assistido_id = assistido_id or db_processo.get("assistido_id")
                        caso_id = caso_id or db_processo.get("caso_id")
                        logger.info(
                            "Resolved from DB: processo_id=%s assistido_id=%s caso_id=%s",
                            processo_id,
                            assistido_id,
                            caso_id,
                        )

                # 2. Extrair processo + movimentações via aba PJE do Solar
                # Usa AngularJS scope injection para obter dados estruturados
                eproc_data = await self.scraper.extrair_movimentacoes_eproc(numero_processo)
                if not eproc_data.get("found", False):
                    return {
                        "success": False,
                        "numero_processo": numero_processo,
                        "movimentacoes_encontradas": 0,
                        "movimentacoes_novas": 0,
                        "documentos_baixados": 0,
                        "anotacoes_criadas": [],
                        "case_facts_criados": [],
                        "pdfs": [],
                        "errors": [eproc_data.get("error", "Processo não encontrado no Solar")],
                    }

                processo_data = eproc_data.get("processo", {})
                eventos = eproc_data.get("eventos", [])
                total_movimentacoes = len(eventos)

                # 3. Filtrar eventos NOVOS (se temos processo_id, comparar com DB)
                novas = eventos  # Por padrão, tudo é "novo"
                if processo_id:
                    last_date = await self.supabase.get_last_movimentacao_date(processo_id)
                    if last_date:
                        novas = [
                            e for e in eventos
                            if (e.get("data_protocolo", "") or "") > last_date
                        ]
                        logger.info(
                            "Filtered: %d total → %d new (after %s)",
                            total_movimentacoes,
                            len(novas),
                            last_date,
                        )

                # 4. Processar movimentações significativas com Gemini
                for mov in novas:
                    descricao_lower = (mov.get("descricao", "") or "").lower()
                    is_significativa = any(t in descricao_lower for t in MOVIMENTACOES_SIGNIFICATIVAS)

                    if is_significativa and self.gemini.is_configured():
                        try:
                            context = (
                                f"Processo: {numero_processo}\n"
                                f"Evento: {mov.get('numero')}\n"
                                f"Data: {mov.get('data_protocolo')}\n"
                                f"Descrição: {mov.get('descricao')}\n"
                                f"Complementar: {mov.get('descricao_complementar', '')}"
                            )
                            extracted = await self.gemini.extract(
                                SOLAR_MOVIMENTACAO_PROMPT,
                                context,
                            )
                            mov["extracted_data"] = extracted
                        except Exception as e:
                            logger.warning("Gemini extraction failed for evento: %s", e)
                            errors.append(f"Gemini failed: {str(e)[:100]}")

                # 5. Gravar no Supabase
                for mov in novas:
                    try:
                        # Criar anotação para cada movimentação nova
                        conteudo_parts = []
                        data = mov.get("data_protocolo")
                        if data:
                            conteudo_parts.append(f"📅 {data}")
                        descricao = mov.get("descricao") or mov.get("descricao_amigavel", "")
                        if descricao:
                            conteudo_parts.append(f"[{descricao}]")
                        complementar = mov.get("descricao_complementar")
                        if complementar:
                            conteudo_parts.append(complementar)

                        conteudo = " ".join(conteudo_parts)

                        # Determinar urgência baseado na descrição
                        urgencia = "low"
                        descricao_lower = (descricao or "").lower()
                        if "sentença" in descricao_lower or "sentenca" in descricao_lower:
                            urgencia = "high"
                        elif "intimação" in descricao_lower or "intimacao" in descricao_lower:
                            urgencia = "medium"
                        elif "decisão" in descricao_lower or "decisao" in descricao_lower:
                            urgencia = "medium"

                        anotacao = await self.supabase.create_anotacao(
                            assistido_id=assistido_id,
                            processo_id=processo_id,
                            caso_id=caso_id,
                            conteudo=conteudo,
                            tipo="solar:movimentacao",
                            urgencia=urgencia,
                            metadata=mov.get("extracted_data"),
                        )
                        if anotacao:
                            entities_created.append({
                                "type": "anotacao",
                                "id": anotacao.get("id"),
                                "movimentacao_tipo": descricao,
                            })
                    except Exception as e:
                        logger.warning("Failed to create anotacao: %s", e)
                        errors.append(f"Anotacao failed: {str(e)[:100]}")

                    # Criar case_fact para movimentações significativas
                    if mov.get("extracted_data") and caso_id:
                        try:
                            extracted = mov["extracted_data"]
                            resumo = extracted.get("resumo", descricao or "")
                            fact = await self.supabase.create_case_fact(
                                caso_id=caso_id,
                                descricao=resumo,
                                tipo=extracted.get("tipo_fato", "incontroverso"),
                                fonte="solar:movimentacao",
                                confidence=extracted.get("confidence", 0.7),
                            )
                            if fact:
                                entities_created.append({
                                    "type": "case_fact",
                                    "id": fact.get("id"),
                                })
                        except Exception as e:
                            logger.warning("Failed to create case_fact: %s", e)

                # 6. Baixar PDFs dos eventos (via /procapi/)
                docs_baixados = 0
                if download_pdfs:
                    pdf_count = 0
                    for mov in novas:
                        if pdf_count >= self.settings.solar_max_pdfs_per_sync:
                            break
                        docs = mov.get("documentos", [])
                        for doc in docs:
                            if pdf_count >= self.settings.solar_max_pdfs_per_sync:
                                break
                            doc_id = doc.get("documento_id")
                            if not doc_id:
                                continue
                            try:
                                content, filename, mime_type = await self.scraper.baixar_documento(
                                    numero_processo, str(doc_id),
                                )
                                pdfs.append({
                                    "filename": filename,
                                    "content_base64": base64.b64encode(content).decode("utf-8"),
                                    "mime_type": mime_type,
                                    "tipo_documento": doc.get("tipo") or doc.get("nome"),
                                })
                                pdf_count += 1
                                docs_baixados += 1
                            except Exception as e:
                                logger.warning("Failed to download PDF %s: %s", doc_id, e)
                                errors.append(f"PDF download failed: {str(e)[:100]}")

                elapsed = time.time() - start
                logger.info(
                    "Sync complete: %s | movs=%d new=%d docs=%d entities=%d time=%.1fs",
                    numero_processo,
                    total_movimentacoes,
                    len(novas),
                    docs_baixados,
                    len(entities_created),
                    elapsed,
                )

                return {
                    "success": True,
                    "numero_processo": numero_processo,
                    "processo_data": {
                        **processo_data,
                        "assuntos": eproc_data.get("assuntos", []),
                        "partes": eproc_data.get("partes", []),
                        "vinculados": eproc_data.get("vinculados", []),
                    },
                    "movimentacoes_encontradas": total_movimentacoes,
                    "movimentacoes_novas": len(novas),
                    "documentos_baixados": docs_baixados,
                    "anotacoes_criadas": [e for e in entities_created if e["type"] == "anotacao"],
                    "case_facts_criados": [e for e in entities_created if e["type"] == "case_fact"],
                    "pdfs": pdfs,
                    "errors": errors,
                }

            except NotImplementedError as e:
                logger.warning("Solar selectors not mapped: %s", e)
                return {
                    "success": False,
                    "numero_processo": numero_processo,
                    "movimentacoes_encontradas": 0,
                    "movimentacoes_novas": 0,
                    "documentos_baixados": 0,
                    "anotacoes_criadas": [],
                    "case_facts_criados": [],
                    "pdfs": [],
                    "errors": [str(e)],
                }
            except Exception as e:
                logger.error("Sync failed for %s: %s", numero_processo, e)
                return {
                    "success": False,
                    "numero_processo": numero_processo,
                    "movimentacoes_encontradas": 0,
                    "movimentacoes_novas": 0,
                    "documentos_baixados": 0,
                    "anotacoes_criadas": [],
                    "case_facts_criados": [],
                    "pdfs": [],
                    "errors": [str(e)],
                }

    async def sync_batch(
        self,
        processos: list[dict[str, Any]],
        max_concurrent: int = 1,
    ) -> dict[str, Any]:
        """
        Sincroniza múltiplos processos sequencialmente.

        Args:
            processos: Lista de dicts com numero_processo e IDs opcionais
            max_concurrent: Max paralelos (default 1 — Playwright single browser)

        Returns:
            Resultado agregado do batch
        """
        start = time.time()
        results = []
        succeeded = 0
        failed = 0

        logger.info("Starting batch sync: %d processos", len(processos))

        for i, proc in enumerate(processos[:20]):  # Max 20 por batch
            logger.info("Batch progress: %d/%d", i + 1, len(processos))

            result = await self.sync_processo(
                numero_processo=proc.get("numero_processo", ""),
                processo_id=proc.get("processo_id"),
                assistido_id=proc.get("assistido_id"),
                caso_id=proc.get("caso_id"),
                download_pdfs=proc.get("download_pdfs", True),
            )
            results.append(result)

            if result.get("success"):
                succeeded += 1
            else:
                failed += 1

            # Delay entre processos (além do rate limit por página)
            if i < len(processos) - 1:
                await asyncio.sleep(5)

        elapsed = time.time() - start
        logger.info(
            "Batch sync complete: %d succeeded, %d failed, %.1fs",
            succeeded,
            failed,
            elapsed,
        )

        return {
            "total": len(results),
            "succeeded": succeeded,
            "failed": failed,
            "results": results,
        }

    async def check_avisos(self) -> dict[str, Any]:
        """
        Verifica avisos pendentes no Solar.

        Returns:
            Lista de avisos com processos linkados
        """
        try:
            avisos = await self.scraper.listar_avisos_pendentes()

            # Tentar linkar avisos com processos no OMBUDS
            for aviso in avisos:
                numero = aviso.get("numero_processo")
                if numero:
                    try:
                        processo = await self.supabase.find_processo_by_numero(numero)
                        if processo:
                            aviso["ombuds_processo_id"] = processo["id"]
                            aviso["ombuds_assistido_id"] = processo.get("assistido_id")
                    except Exception:
                        pass

            return {
                "avisos": avisos,
                "total": len(avisos),
            }

        except NotImplementedError as e:
            return {
                "avisos": [],
                "total": 0,
                "error": str(e),
            }

    async def sync_por_nome(self, nome: str) -> dict[str, Any]:
        """
        Lista todos os processos de um defensor pelo nome no Solar.

        Usa buscar_processos_por_nome() do scraper que faz busca textual
        no campo filtro.filtro (aceita nome, CPF ou número).

        Args:
            nome: Nome do defensor ex: "rodrigo rocha meire"

        Returns:
            Dict com: success, nome, processos_encontrados, processos[], errors[]
        """
        logger.info("sync_por_nome: buscando processos de '%s'", nome)
        try:
            processos = await self.scraper.buscar_processos_por_nome(nome)
            return {
                "success": True,
                "nome": nome,
                "processos_encontrados": len(processos),
                "processos": processos,
                "errors": [],
            }
        except Exception as e:
            logger.error("sync_por_nome '%s' falhou: %s", nome, e)
            return {
                "success": False,
                "nome": nome,
                "processos_encontrados": 0,
                "processos": [],
                "errors": [str(e)],
            }


# Singleton
_solar_orchestrator: SolarOrchestrator | None = None


def get_solar_orchestrator() -> SolarOrchestrator:
    """Retorna singleton do SolarOrchestrator."""
    global _solar_orchestrator
    if _solar_orchestrator is None:
        _solar_orchestrator = SolarOrchestrator()
    return _solar_orchestrator
