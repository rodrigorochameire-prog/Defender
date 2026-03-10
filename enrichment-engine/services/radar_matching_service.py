"""
Radar Criminal — Serviço de Matching com Assistidos DPE
Compara envolvidos extraídos das notícias com a base de assistidos da Defensoria.
Usa pg_trgm para fuzzy matching de nomes.
Score: nome (40%) + bairro (20%) + tipo_crime (20%) + proximidade temporal (20%)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from config import get_settings

logger = logging.getLogger("enrichment-engine.radar-matching")

# Tipos de crime que a DPE mais atende (peso maior no score)
CRIME_TYPES_DPE = {
    "homicidio", "tentativa_homicidio", "trafico", "roubo",
    "violencia_domestica", "lesao_corporal", "porte_arma",
}


class RadarMatchingService:
    """Matching de envolvidos em notícias com assistidos da DPE via pg_trgm."""

    def __init__(self):
        self.settings = get_settings()

    async def match_batch(self, limit: int = 20) -> int:
        """Processa batch de notícias extraídas para matching."""
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        # Buscar notícias com status 'extracted' (já têm envolvidos)
        result = (
            client_db.table("radar_noticias")
            .select("id, titulo, tipo_crime, bairro, data_fato, envolvidos, created_at")
            .eq("enrichment_status", "extracted")
            .not_.is_("envolvidos", "null")
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )

        noticias = result.data or []
        if not noticias:
            logger.info("Nenhuma notícia pendente para matching")
            return 0

        total_matches = 0

        for noticia in noticias:
            try:
                matches = await self._match_noticia(noticia, client_db)
                total_matches += len(matches)

                # Atualizar status
                new_status = "matched" if matches else "extracted"
                client_db.table("radar_noticias").update({
                    "enrichment_status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", noticia["id"]).execute()

                if matches:
                    logger.info(
                        "Matched | noticia_id=%d matches=%d melhor_score=%d",
                        noticia["id"],
                        len(matches),
                        max(m["score_confianca"] for m in matches),
                    )
            except Exception as e:
                logger.error("Erro no matching notícia id=%d: %s", noticia["id"], str(e))
                continue

        logger.info("Batch concluído: %d matches em %d notícias", total_matches, len(noticias))
        return total_matches

    async def _match_noticia(
        self, noticia: dict[str, Any], client_db: Any
    ) -> list[dict[str, Any]]:
        """Faz matching de uma notícia contra assistidos."""
        envolvidos_raw = noticia.get("envolvidos")
        if not envolvidos_raw:
            return []

        # Parse envolvidos (pode ser string JSON ou lista)
        if isinstance(envolvidos_raw, str):
            try:
                envolvidos = json.loads(envolvidos_raw)
            except (json.JSONDecodeError, TypeError):
                return []
        else:
            envolvidos = envolvidos_raw

        if not isinstance(envolvidos, list):
            return []

        matches = []

        for envolvido in envolvidos:
            nome = envolvido.get("nome", "").strip()
            if not nome or len(nome) < 5:
                continue

            # Buscar assistidos com nome similar via pg_trgm
            candidatos = await self._search_assistidos_trgm(nome, client_db)

            for candidato in candidatos:
                score = self._calculate_score(
                    envolvido=envolvido,
                    candidato=candidato,
                    noticia=noticia,
                    trgm_similarity=candidato.get("similarity", 0),
                )

                if score < 50:
                    continue  # Score muito baixo, descartar

                status = "auto_confirmado" if score >= 80 else "possivel"

                match_data = {
                    "noticia_id": noticia["id"],
                    "assistido_id": candidato["id"],
                    "nome_encontrado": nome,
                    "score_confianca": score,
                    "status": status,
                    "dados_extraidos": json.dumps({
                        "envolvido": envolvido,
                        "similarity_trgm": candidato.get("similarity", 0),
                        "score_breakdown": {
                            "nome": round(candidato.get("similarity", 0) * 40),
                            "bairro": self._bairro_score(noticia, candidato) * 20,
                            "crime": self._crime_score(noticia) * 20,
                            "temporal": self._temporal_score(noticia) * 20,
                        },
                    }, ensure_ascii=False),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }

                # Tentar vincular a processo/caso se o assistido tiver
                processo = await self._find_processo(candidato["id"], client_db)
                if processo:
                    match_data["processo_id"] = processo.get("id")
                    match_data["caso_id"] = processo.get("caso_id")

                # Inserir match
                try:
                    client_db.table("radar_matches").insert(match_data).execute()
                    matches.append(match_data)
                except Exception as e:
                    logger.debug("Erro ao inserir match: %s", str(e))

        return matches

    async def _search_assistidos_trgm(
        self, nome: str, client_db: Any
    ) -> list[dict[str, Any]]:
        """Busca assistidos por similaridade de nome usando pg_trgm."""
        # Usar RPC para chamar função pg_trgm diretamente
        # Fallback: busca com ILIKE se RPC não existir
        try:
            # Tentar busca com similarity() do pg_trgm via raw SQL
            # A query usa similarity() que retorna 0.0-1.0
            result = client_db.rpc(
                "search_assistidos_trgm",
                {"search_name": nome, "min_similarity": 0.3, "max_results": 5},
            ).execute()

            if result.data:
                return result.data
        except Exception:
            pass

        # Fallback: busca ILIKE com partes do nome
        try:
            parts = nome.upper().split()
            if len(parts) >= 2:
                # Buscar pelo primeiro e último nome
                first = parts[0]
                last = parts[-1]
                result = (
                    client_db.table("assistidos")
                    .select("id, nome, endereco, cpf")
                    .is_("deleted_at", "null")
                    .ilike("nome", f"%{first}%{last}%")
                    .limit(5)
                    .execute()
                )
                if result.data:
                    # Calcular similarity manual simplificada
                    for r in result.data:
                        r["similarity"] = self._simple_similarity(
                            nome.upper(), (r.get("nome") or "").upper()
                        )
                    return [r for r in result.data if r["similarity"] >= 0.3]
        except Exception as e:
            logger.debug("Fallback search falhou: %s", str(e))

        return []

    def _simple_similarity(self, a: str, b: str) -> float:
        """Similaridade simples baseada em tokens compartilhados."""
        if not a or not b:
            return 0.0

        tokens_a = set(a.upper().split())
        tokens_b = set(b.upper().split())

        if not tokens_a or not tokens_b:
            return 0.0

        intersection = tokens_a & tokens_b
        union = tokens_a | tokens_b

        return len(intersection) / len(union) if union else 0.0

    def _calculate_score(
        self,
        envolvido: dict,
        candidato: dict,
        noticia: dict,
        trgm_similarity: float,
    ) -> int:
        """
        Calcula score de confiança 0-100.
        Pesos: nome (40%) + bairro (20%) + tipo_crime (20%) + temporal (20%)
        """
        # Nome: 0-40 pontos (baseado em trgm_similarity)
        nome_score = round(min(trgm_similarity, 1.0) * 40)

        # Bairro: 0-20 pontos
        bairro_score = round(self._bairro_score(noticia, candidato) * 20)

        # Tipo de crime: 0-20 pontos (crimes típicos DPE valem mais)
        crime_score = round(self._crime_score(noticia) * 20)

        # Proximidade temporal: 0-20 pontos
        temporal_score = round(self._temporal_score(noticia) * 20)

        total = nome_score + bairro_score + crime_score + temporal_score
        return min(total, 100)

    def _bairro_score(self, noticia: dict, candidato: dict) -> float:
        """Score de matching por bairro (0.0-1.0).
        Assistidos têm 'endereco' (texto livre), notícias têm 'bairro'.
        """
        noticia_bairro = (noticia.get("bairro") or "").lower().strip()
        candidato_endereco = (candidato.get("endereco") or "").lower().strip()

        if not noticia_bairro or not candidato_endereco:
            return 0.5  # Neutro se não tem info

        # Verificar se o bairro da notícia aparece no endereço do assistido
        if noticia_bairro in candidato_endereco:
            return 1.0

        # Verificar se alguma parte do bairro aparece
        bairro_parts = noticia_bairro.split()
        matches = sum(1 for part in bairro_parts if part in candidato_endereco and len(part) > 3)
        if matches > 0:
            return 0.7

        return 0.0

    def _crime_score(self, noticia: dict) -> float:
        """Score baseado no tipo de crime (0.0-1.0)."""
        tipo = noticia.get("tipo_crime", "")
        if tipo in CRIME_TYPES_DPE:
            return 1.0  # Crime típico DPE
        if tipo:
            return 0.5  # Crime existe mas não típico
        return 0.3  # Sem classificação

    def _temporal_score(self, noticia: dict) -> float:
        """Score baseado na proximidade temporal (0.0-1.0)."""
        data_fato = noticia.get("data_fato")
        if not data_fato:
            return 0.5  # Neutro

        try:
            if isinstance(data_fato, str):
                # Tentar parse ISO
                dt = datetime.fromisoformat(data_fato.replace("Z", "+00:00"))
            else:
                dt = data_fato

            now = datetime.now(timezone.utc)
            days_ago = (now - dt).days if hasattr(dt, "days") else abs((now - dt).days)

            if days_ago <= 7:
                return 1.0  # Última semana
            elif days_ago <= 30:
                return 0.8  # Último mês
            elif days_ago <= 90:
                return 0.6  # Último trimestre
            elif days_ago <= 365:
                return 0.4  # Último ano
            else:
                return 0.2  # Mais de 1 ano
        except (ValueError, TypeError):
            return 0.5

    async def _find_processo(self, assistido_id: int, client_db: Any) -> dict | None:
        """Busca processo mais recente do assistido."""
        try:
            result = (
                client_db.table("processos")
                .select("id, caso_id")
                .eq("assistido_id", assistido_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except Exception:
            return None


# Singleton
_radar_matching: RadarMatchingService | None = None


def get_radar_matching_service() -> RadarMatchingService:
    global _radar_matching
    if _radar_matching is None:
        _radar_matching = RadarMatchingService()
    return _radar_matching
