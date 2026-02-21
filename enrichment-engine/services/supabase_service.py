"""
Supabase Service — CRUD de enriquecimentos nas tabelas do OMBUDS.
Usa service_role_key (bypassa RLS) para gravar dados processados.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.supabase")


class SupabaseService:
    """Client Supabase para gravar enriquecimentos do Enrichment Engine."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    def _get_client(self):
        """Lazy init do Supabase client."""
        if self._client is None:
            try:
                from supabase import create_client

                self._client = create_client(
                    self.settings.supabase_url,
                    self.settings.supabase_service_role_key,
                )
                logger.info("Supabase client initialized")
            except ImportError as e:
                logger.error("supabase-py not installed: %s", e)
                raise RuntimeError("Supabase library not available") from e

        return self._client

    # === Enrichment Status ===

    async def update_enrichment_status(
        self,
        table: str,
        record_id: int,
        status: str,
        data: dict | None = None,
    ):
        """
        Atualiza status de enriquecimento de um registro.

        Args:
            table: Nome da tabela (documentos, atendimentos, demandas)
            record_id: ID do registro
            status: pending, processing, enriched, failed
            data: JSON com dados extraídos (se enriched)
        """
        client = self._get_client()

        update_data: dict[str, Any] = {
            "enrichment_status": status,
        }

        if data is not None:
            update_data["enrichment_data"] = data

        if status == "enriched":
            update_data["enriched_at"] = datetime.now(timezone.utc).isoformat()

        try:
            result = (
                client.table(table)
                .update(update_data)
                .eq("id", record_id)
                .execute()
            )
            logger.info(
                "Updated enrichment | table=%s id=%d status=%s",
                table,
                record_id,
                status,
            )
            return result.data
        except Exception as e:
            logger.error(
                "Failed to update enrichment | table=%s id=%d: %s",
                table,
                record_id,
                e,
            )
            raise

    # === Case Facts ===

    async def create_case_fact(
        self,
        caso_id: int,
        descricao: str,
        tipo: str = "incontroverso",
        fonte: str = "enrichment-engine",
        confidence: float = 0.0,
        data_fato: str | None = None,
    ) -> dict:
        """
        Cria um fato no caso (caseFacts).

        Args:
            caso_id: ID do caso
            descricao: Descrição do fato
            tipo: controverso | incontroverso
            fonte: Origem do fato
            confidence: Score de confiança (0-1)
        """
        client = self._get_client()

        fact_data = {
            "caso_id": caso_id,
            "descricao": descricao,
            "tipo": tipo,
            "fonte": fonte,
            "confidence": confidence,
        }
        if data_fato:
            fact_data["data_fato"] = data_fato

        try:
            result = client.table("case_facts").insert(fact_data).execute()
            logger.info("Created case_fact | caso=%d tipo=%s", caso_id, tipo)
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("Failed to create case_fact: %s", e)
            raise

    # === Case Personas ===

    async def create_case_persona(
        self,
        caso_id: int,
        nome: str,
        papel: str,
        descricao: str | None = None,
        fonte: str = "enrichment-engine",
    ) -> dict:
        """
        Cria uma persona vinculada ao caso (casePersonas).

        Args:
            caso_id: ID do caso
            nome: Nome da pessoa
            papel: testemunha, correu, vitima, familiar, policial, perito, outro
            descricao: Informações adicionais
        """
        client = self._get_client()

        persona_data = {
            "caso_id": caso_id,
            "nome": nome,
            "papel": papel,
            "fonte": fonte,
        }
        if descricao:
            persona_data["descricao"] = descricao

        try:
            result = client.table("case_personas").insert(persona_data).execute()
            logger.info("Created case_persona | caso=%d nome=%s papel=%s", caso_id, nome, papel)
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("Failed to create case_persona: %s", e)
            raise

    # === Anotações ===

    async def create_anotacao(
        self,
        assistido_id: int | None = None,
        processo_id: int | None = None,
        caso_id: int | None = None,
        conteudo: str = "",
        tipo: str = "enrichment",
        urgencia: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """
        Cria anotação com dados extraídos.

        Args:
            assistido_id: ID do assistido (opcional)
            processo_id: ID do processo (opcional)
            caso_id: ID do caso (opcional)
            conteudo: Texto da anotação
            tipo: Tipo (enrichment, transcript, whatsapp, etc)
            urgencia: low, medium, high, critical
            metadata: JSON com dados extras
        """
        client = self._get_client()

        anotacao_data: dict[str, Any] = {
            "conteudo": conteudo,
            "tipo": tipo,
        }

        if assistido_id:
            anotacao_data["assistido_id"] = assistido_id
        if processo_id:
            anotacao_data["processo_id"] = processo_id
        if caso_id:
            anotacao_data["caso_id"] = caso_id
        if urgencia:
            anotacao_data["urgencia"] = urgencia
        if metadata:
            anotacao_data["metadata"] = metadata

        try:
            result = client.table("anotacoes").insert(anotacao_data).execute()
            logger.info(
                "Created anotacao | assistido=%s processo=%s tipo=%s",
                assistido_id,
                processo_id,
                tipo,
            )
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("Failed to create anotacao: %s", e)
            raise

    # === Fact Evidence ===

    async def create_fact_evidence(
        self,
        fact_id: int,
        documento_id: int | None = None,
        descricao: str = "",
        tipo_evidencia: str = "documento",
        confidence: float = 0.0,
    ) -> dict:
        """
        Vincula evidência a um fato (factEvidence).

        Args:
            fact_id: ID do caseFact
            documento_id: ID do documento fonte
            descricao: Descrição da evidência
            tipo_evidencia: documento, depoimento, pericia, etc
            confidence: Score de confiança (0-1)
        """
        client = self._get_client()

        evidence_data = {
            "fact_id": fact_id,
            "descricao": descricao,
            "tipo_evidencia": tipo_evidencia,
            "confidence": confidence,
        }
        if documento_id:
            evidence_data["documento_id"] = documento_id

        try:
            result = client.table("fact_evidence").insert(evidence_data).execute()
            logger.info("Created fact_evidence | fact=%d confidence=%.2f", fact_id, confidence)
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error("Failed to create fact_evidence: %s", e)
            raise

    # === Lookup Helpers ===

    async def find_processo_by_numero(self, numero: str) -> dict | None:
        """Busca processo pelo número."""
        client = self._get_client()
        try:
            result = (
                client.table("processos")
                .select("id, numero, assistido_id, caso_id")
                .eq("numero", numero)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to find processo %s: %s", numero, e)
            return None

    async def find_assistido_by_nome(self, nome: str) -> dict | None:
        """Busca assistido pelo nome (busca parcial, case-insensitive)."""
        client = self._get_client()
        try:
            result = (
                client.table("assistidos")
                .select("id, nome")
                .ilike("nome", f"%{nome}%")
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error("Failed to find assistido %s: %s", nome, e)
            return None

    @staticmethod
    def is_configured() -> bool:
        """Verifica se Supabase está configurado."""
        settings = get_settings()
        return bool(settings.supabase_url and settings.supabase_service_role_key)


# Singleton
_supabase_service: SupabaseService | None = None


def get_supabase_service() -> SupabaseService:
    """Retorna singleton do SupabaseService."""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
