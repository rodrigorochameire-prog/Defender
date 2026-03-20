"""
Radar Criminal — Scraper de perfis Instagram oficiais de segurança pública.
Usa Instaloader para coletar posts recentes de perfis públicos (@12bpmcamacari, etc.)
Sem autenticação — só perfis públicos.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger("enrichment-engine.radar-instagram")

# Score base para posts de órgãos oficiais de segurança pública
SCORE_INSTAGRAM_OFICIAL = 65


class RadarInstagramService:
    """Coleta posts recentes de perfis Instagram públicos de segurança de Camaçari."""

    def __init__(self) -> None:
        try:
            import instaloader  # noqa: F401
            self._available = True
        except ImportError:
            logger.error("instaloader não instalado. Execute: pip install instaloader")
            self._available = False

    def _generate_url(self, shortcode: str) -> str:
        return f"https://www.instagram.com/p/{shortcode}/"

    def _generate_hash(self, handle: str, post_id: str) -> str:
        return hashlib.sha256(f"instagram:{handle}:{post_id}".encode()).hexdigest()

    def scrape_perfil(
        self, handle: str, fonte_nome: str, fonte_id: int | None, max_posts: int = 20
    ) -> list[dict[str, Any]]:
        """Coleta posts recentes de um perfil Instagram público (síncrono)."""
        if not self._available:
            return []

        import instaloader

        handle = handle.lstrip("@")
        loader = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
        )

        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        noticias: list[dict[str, Any]] = []

        try:
            profile = instaloader.Profile.from_username(loader.context, handle)
        except Exception as exc:
            logger.warning("Perfil @%s não encontrado ou inacessível: %s", handle, exc)
            return []

        count = 0
        for post in profile.get_posts():
            if count >= max_posts:
                break

            post_date = post.date_utc.replace(tzinfo=timezone.utc)
            if post_date < cutoff:
                break  # posts são ordenados do mais novo ao mais antigo

            caption = post.caption or ""
            if len(caption.strip()) < 20:
                count += 1
                continue

            url = self._generate_url(post.shortcode)
            content_hash = self._generate_hash(handle, str(post.mediaid))

            # Primeira linha da legenda como título (limitado a 120 chars)
            titulo = caption.split("\n")[0][:120]

            noticias.append({
                "url": url,
                "fonte": fonte_nome,
                "fonte_id": fonte_id,
                "titulo": titulo,
                "corpo": caption,
                "data_publicacao": post_date.isoformat(),
                "imagem_url": post.url if post.typename == "GraphImage" else None,
                "enrichment_status": "pending",
                "relevancia_score": SCORE_INSTAGRAM_OFICIAL,
                "content_hash": content_hash,
            })
            count += 1

        logger.info("Instagram @%s: %d posts coletados", handle, len(noticias))
        return noticias

    def scrape_all_instagram_fontes(self) -> list[dict[str, Any]]:
        """Scrape todos os perfis Instagram ativos no banco."""
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        result = (
            client_db.table("radar_fontes")
            .select("*")
            .eq("tipo", "instagram")
            .eq("ativo", True)
            .execute()
        )
        fontes = result.data or []

        if not fontes:
            logger.info("Nenhuma fonte Instagram ativa")
            return []

        # Buscar hashes já existentes para deduplicação
        existing = client_db.table("radar_noticias").select("content_hash").execute()
        existing_hashes = {
            r["content_hash"]
            for r in (existing.data or [])
            if r.get("content_hash")
        }

        all_noticias: list[dict[str, Any]] = []
        for fonte in fontes:
            handle = fonte.get("url", "")  # armazenado como "@handle"
            if not handle:
                continue
            try:
                posts = self.scrape_perfil(handle, fonte["nome"], fonte.get("id"))
                novos = [p for p in posts if p["content_hash"] not in existing_hashes]
                all_noticias.extend(novos)
                existing_hashes.update(p["content_hash"] for p in novos)

                client_db.table("radar_fontes").update(
                    {"ultima_coleta": datetime.now(timezone.utc).isoformat()}
                ).eq("id", fonte["id"]).execute()

            except Exception as exc:
                logger.error("Falha ao scraper Instagram @%s: %s", handle, exc)

        return all_noticias
