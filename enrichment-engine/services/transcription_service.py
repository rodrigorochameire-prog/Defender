"""
Serviço de transcrição: Whisper (OpenAI) + pyannote (diarização de speakers).

Fluxo:
1. Recebe URL ou bytes de arquivo de áudio/vídeo
2. Baixa o arquivo (se URL)
3. Transcreve com OpenAI Whisper API (timestamps por segmento)
4. Opcionalmente: diariza speakers com pyannote.audio
5. Combina transcrição + speakers em output formatado
"""

import logging
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx
from openai import OpenAI
from pydub import AudioSegment

from config import get_settings

logger = logging.getLogger("enrichment-engine.transcription")

# Singleton
_transcription_service: "TranscriptionService | None" = None


def get_transcription_service() -> "TranscriptionService":
    """Singleton factory."""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service


class TranscriptionService:
    """Serviço de transcrição com Whisper + pyannote."""

    def __init__(self) -> None:
        settings = get_settings()
        self.openai_client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.whisper_model = settings.whisper_model
        self.max_file_size_mb = settings.whisper_max_file_size_mb
        self.language = settings.transcription_language
        self.diarization_enabled = settings.diarization_enabled
        self.hf_token = settings.hf_token
        self._diarization_pipeline = None

    # ==========================================
    # PUBLIC API
    # ==========================================

    async def transcribe(
        self,
        file_url: str | None = None,
        file_bytes: bytes | None = None,
        file_name: str = "audio.mp3",
        language: str | None = None,
        diarize: bool = True,
        expected_speakers: int | None = None,
    ) -> dict[str, Any]:
        """
        Transcreve um arquivo de áudio/vídeo.

        Args:
            file_url: URL para download (Drive signed URL, etc)
            file_bytes: Bytes do arquivo (alternativa a URL)
            file_name: Nome do arquivo (para detectar formato)
            language: Código ISO 639-1 (default: "pt")
            diarize: Ativar diarização de speakers
            expected_speakers: Número esperado de speakers (ajuda pyannote)

        Returns:
            dict com transcript, speakers, segments, duration, confidence
        """
        start = time.time()
        lang = language or self.language

        if not self.openai_client:
            raise RuntimeError("OpenAI API key not configured (OPENAI_API_KEY)")

        # 1. Obter arquivo local
        tmp_path = await self._get_audio_file(file_url, file_bytes, file_name)

        try:
            # 2. Converter para formato compatível (MP3/WAV) se necessário
            audio_path = self._ensure_compatible_format(tmp_path)

            # 3. Verificar tamanho
            file_size_mb = audio_path.stat().st_size / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                raise ValueError(
                    f"Arquivo muito grande: {file_size_mb:.1f}MB "
                    f"(máximo: {self.max_file_size_mb}MB)"
                )

            # 4. Transcrever com Whisper
            logger.info(
                "Transcrevendo com Whisper | file=%s | size=%.1fMB | lang=%s",
                file_name, file_size_mb, lang,
            )
            whisper_result = self._transcribe_whisper(audio_path, lang)

            # 5. Diarizar speakers (se habilitado)
            speakers_result = None
            if diarize and self.diarization_enabled and self.hf_token:
                logger.info("Diarizando speakers com pyannote | expected=%s", expected_speakers)
                try:
                    speakers_result = self._diarize_speakers(audio_path, expected_speakers)
                except Exception as e:
                    logger.warning("Diarização falhou (continuando sem speakers): %s", e)

            # 6. Combinar transcrição + speakers
            result = self._merge_transcription_and_speakers(
                whisper_result, speakers_result
            )

            elapsed = time.time() - start
            logger.info(
                "Transcrição concluída | duration=%.1fs | segments=%d | speakers=%d",
                elapsed, len(result["segments"]), len(result["speakers"]),
            )

            return result

        finally:
            # Cleanup temp files
            tmp_path.unlink(missing_ok=True)
            if audio_path != tmp_path:
                audio_path.unlink(missing_ok=True)

    # ==========================================
    # INTERNAL: Download / Format
    # ==========================================

    async def _get_audio_file(
        self,
        file_url: str | None,
        file_bytes: bytes | None,
        file_name: str,
    ) -> Path:
        """Baixa ou salva arquivo em temp."""
        if file_url:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.get(file_url)
                response.raise_for_status()
                data = response.content
        elif file_bytes:
            data = file_bytes
        else:
            raise ValueError("Forneça file_url ou file_bytes")

        suffix = Path(file_name).suffix or ".mp3"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(data)
        tmp.close()
        return Path(tmp.name)

    def _ensure_compatible_format(self, path: Path) -> Path:
        """Converte vídeo/formatos exóticos para MP3 usando pydub."""
        suffix = path.suffix.lower()
        compatible = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm"}

        if suffix in compatible:
            return path

        # Converter para MP3
        logger.info("Convertendo %s para MP3", suffix)
        try:
            audio = AudioSegment.from_file(str(path))
            mp3_path = path.with_suffix(".mp3")
            audio.export(str(mp3_path), format="mp3")
            return mp3_path
        except Exception as e:
            logger.warning("Conversão falhou, tentando enviar original: %s", e)
            return path

    # ==========================================
    # INTERNAL: Whisper
    # ==========================================

    def _transcribe_whisper(self, audio_path: Path, language: str) -> dict:
        """Transcreve com OpenAI Whisper API (verbose JSON com timestamps)."""
        with open(audio_path, "rb") as f:
            response = self.openai_client.audio.transcriptions.create(
                model=self.whisper_model,
                file=f,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

        # Extrair dados relevantes
        segments = []
        full_text = response.text or ""

        if hasattr(response, "segments") and response.segments:
            for seg in response.segments:
                segments.append({
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "").strip(),
                })

        return {
            "text": full_text,
            "segments": segments,
            "language": response.language if hasattr(response, "language") else language,
            "duration": response.duration if hasattr(response, "duration") else 0,
        }

    # ==========================================
    # INTERNAL: pyannote diarization
    # ==========================================

    def _get_diarization_pipeline(self):
        """Lazy-load pyannote pipeline (heavy, ~1GB model)."""
        if self._diarization_pipeline is None:
            try:
                from pyannote.audio import Pipeline

                self._diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=self.hf_token,
                )
                logger.info("pyannote pipeline carregado com sucesso")
            except ImportError:
                logger.error("pyannote.audio não instalado — pip install pyannote.audio")
                raise
            except Exception as e:
                logger.error("Falha ao carregar pyannote: %s", e)
                raise
        return self._diarization_pipeline

    def _diarize_speakers(
        self, audio_path: Path, expected_speakers: int | None = None
    ) -> list[dict]:
        """Identifica speakers com pyannote.audio."""
        pipeline = self._get_diarization_pipeline()

        # Parâmetros opcionais
        kwargs = {}
        if expected_speakers:
            kwargs["num_speakers"] = expected_speakers

        diarization = pipeline(str(audio_path), **kwargs)

        # Extrair segmentos por speaker
        speaker_segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speaker_segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker,
            })

        return speaker_segments

    # ==========================================
    # INTERNAL: Merge transcription + speakers
    # ==========================================

    def _merge_transcription_and_speakers(
        self,
        whisper_result: dict,
        speakers_result: list[dict] | None,
    ) -> dict:
        """
        Combina transcrição do Whisper com diarização do pyannote.
        Resultado: cada segmento tem texto + speaker identificado.
        """
        segments = whisper_result.get("segments", [])
        unique_speakers = set()

        if speakers_result and segments:
            # Para cada segmento Whisper, encontrar o speaker dominante
            for seg in segments:
                seg_start = seg["start"]
                seg_end = seg["end"]
                seg_mid = (seg_start + seg_end) / 2

                # Encontrar speaker ativo no ponto médio do segmento
                best_speaker = "SPEAKER_0"
                best_overlap = 0

                for sp in speakers_result:
                    # Calcular overlap entre segmento e speaker turn
                    overlap_start = max(seg_start, sp["start"])
                    overlap_end = min(seg_end, sp["end"])
                    overlap = max(0, overlap_end - overlap_start)

                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_speaker = sp["speaker"]

                seg["speaker"] = best_speaker
                unique_speakers.add(best_speaker)
        else:
            # Sem diarização — todos os segmentos são SPEAKER_0
            for seg in segments:
                seg["speaker"] = "SPEAKER_0"
                unique_speakers.add("SPEAKER_0")

        # Formatar transcrição completa com speakers
        formatted_lines = []
        for seg in segments:
            ts = self._format_timestamp(seg["start"])
            speaker = seg.get("speaker", "SPEAKER_0")
            text = seg.get("text", "")
            formatted_lines.append(f"[{ts}] {speaker}: {text}")

        formatted_transcript = "\n".join(formatted_lines)

        # Calcular confiança média (Whisper não retorna por segmento na API,
        # mas podemos estimar baseado na presença de diarização)
        confidence = 0.90 if speakers_result else 0.85

        return {
            "transcript": formatted_transcript,
            "transcript_plain": whisper_result.get("text", ""),
            "segments": segments,
            "speakers": sorted(unique_speakers),
            "duration": whisper_result.get("duration", 0),
            "language": whisper_result.get("language", "pt"),
            "confidence": confidence,
            "diarization_applied": speakers_result is not None,
        }

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """Formata segundos em HH:MM:SS."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"
