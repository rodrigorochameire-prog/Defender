"""
Serviço de transcrição: Whisper (OpenAI) + pyannote (diarização de speakers).
Fallback: Gemini 2.5 Flash para transcrição quando Whisper não está disponível
ou quando o arquivo excede o limite de 25MB do Whisper.

Fluxo:
1. Recebe URL ou bytes de arquivo de áudio/vídeo
2. Baixa o arquivo (se URL)
3. Tenta transcrever com Whisper (se OPENAI_API_KEY configurada e arquivo <= 25MB)
4. Fallback: Gemini 2.5 Flash (suporta arquivos até 2GB, inclui diarização nativa)
5. Opcionalmente: diariza speakers com pyannote (apenas Whisper path)
6. Combina transcrição + speakers em output formatado
"""

import json
import logging
import re
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx

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
    """Serviço de transcrição com Whisper + pyannote, fallback Gemini."""

    def __init__(self) -> None:
        settings = get_settings()

        # Whisper (OpenAI)
        self.openai_client = None
        if settings.openai_api_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=settings.openai_api_key)
            except ImportError:
                logger.warning("openai package not installed, Whisper unavailable")

        self.whisper_model = settings.whisper_model
        self.max_file_size_mb = settings.whisper_max_file_size_mb
        self.language = settings.transcription_language
        self.diarization_enabled = settings.diarization_enabled
        self.hf_token = settings.hf_token
        self._diarization_pipeline = None

        # Gemini (fallback)
        self.gemini_api_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model
        self._gemini_client = None

    def _get_gemini_client(self):
        """Lazy init do Gemini client."""
        if self._gemini_client is None:
            from google import genai
            self._gemini_client = genai.Client(api_key=self.gemini_api_key)
            logger.info("Gemini client initialized for transcription")
        return self._gemini_client

    @property
    def whisper_available(self) -> bool:
        return self.openai_client is not None

    @property
    def gemini_available(self) -> bool:
        return bool(self.gemini_api_key)

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
        auth_header: str | None = None,
    ) -> dict[str, Any]:
        """
        Transcreve um arquivo de áudio/vídeo.

        Prioridade:
        1. Whisper + pyannote (se OPENAI_API_KEY configurada e arquivo <= 25MB)
        2. Gemini 2.5 Flash (fallback, suporta até 2GB, diarização nativa)
        """
        start = time.time()
        lang = language or self.language

        if not self.whisper_available and not self.gemini_available:
            raise RuntimeError(
                "Nenhum serviço de transcrição configurado. "
                "Configure OPENAI_API_KEY (Whisper) ou GEMINI_API_KEY (Gemini)."
            )

        # 1. Obter arquivo local
        tmp_path = await self._get_audio_file(file_url, file_bytes, file_name, auth_header)

        try:
            # 2. Decidir qual backend usar
            file_size_mb = tmp_path.stat().st_size / (1024 * 1024)
            use_gemini = False

            if not self.whisper_available:
                logger.info("Whisper não disponível, usando Gemini")
                use_gemini = True
            elif file_size_mb > self.max_file_size_mb:
                # Tentar converter MP4→MP3 para reduzir tamanho
                audio_path = self._ensure_compatible_format(tmp_path)
                audio_size_mb = audio_path.stat().st_size / (1024 * 1024)
                if audio_size_mb > self.max_file_size_mb:
                    if self.gemini_available:
                        logger.info(
                            "Arquivo %.1fMB (áudio %.1fMB) excede limite Whisper de %dMB, usando Gemini",
                            file_size_mb, audio_size_mb, self.max_file_size_mb,
                        )
                        use_gemini = True
                        # Cleanup audio_path convertido — Gemini processa o original
                        if audio_path != tmp_path:
                            audio_path.unlink(missing_ok=True)
                    else:
                        raise ValueError(
                            f"Arquivo muito grande: {audio_size_mb:.1f}MB "
                            f"(máximo Whisper: {self.max_file_size_mb}MB). "
                            f"Configure GEMINI_API_KEY para arquivos grandes."
                        )

            if use_gemini:
                result = await self._transcribe_with_gemini(
                    tmp_path, file_name, lang, diarize, expected_speakers
                )
            else:
                result = await self._transcribe_with_whisper(
                    tmp_path, file_name, lang, diarize, expected_speakers
                )

            elapsed = time.time() - start
            logger.info(
                "Transcrição concluída | backend=%s | duration=%.1fs | segments=%d | speakers=%d",
                "gemini" if use_gemini else "whisper",
                elapsed,
                len(result["segments"]),
                len(result["speakers"]),
            )

            return result

        finally:
            tmp_path.unlink(missing_ok=True)

    # ==========================================
    # WHISPER PATH
    # ==========================================

    async def _transcribe_with_whisper(
        self,
        tmp_path: Path,
        file_name: str,
        lang: str,
        diarize: bool,
        expected_speakers: int | None,
    ) -> dict[str, Any]:
        """Transcrição via Whisper + pyannote."""
        # Converter para formato compatível
        audio_path = self._ensure_compatible_format(tmp_path)

        try:
            # Verificar tamanho
            file_size_mb = audio_path.stat().st_size / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                raise ValueError(
                    f"Arquivo muito grande: {file_size_mb:.1f}MB "
                    f"(máximo: {self.max_file_size_mb}MB)"
                )

            # Transcrever com Whisper
            logger.info(
                "Transcrevendo com Whisper | file=%s | size=%.1fMB | lang=%s",
                file_name, file_size_mb, lang,
            )
            whisper_result = self._transcribe_whisper(audio_path, lang)

            # Diarizar speakers (se habilitado)
            speakers_result = None
            if diarize and self.diarization_enabled and self.hf_token:
                logger.info("Diarizando speakers com pyannote | expected=%s", expected_speakers)
                try:
                    speakers_result = self._diarize_speakers(audio_path, expected_speakers)
                except Exception as e:
                    logger.warning("Diarização falhou (continuando sem speakers): %s", e)

            # Combinar transcrição + speakers
            return self._merge_transcription_and_speakers(whisper_result, speakers_result)

        finally:
            if audio_path != tmp_path:
                audio_path.unlink(missing_ok=True)

    # ==========================================
    # GEMINI PATH
    # ==========================================

    async def _transcribe_with_gemini(
        self,
        file_path: Path,
        file_name: str,
        lang: str,
        diarize: bool,
        expected_speakers: int | None,
    ) -> dict[str, Any]:
        """
        Transcrição via Gemini 2.5 Flash.
        Suporta arquivos até 2GB via File API.
        Inclui diarização nativa (sem pyannote).
        """
        from google.genai import types

        client = self._get_gemini_client()
        file_size_mb = file_path.stat().st_size / (1024 * 1024)

        logger.info(
            "Transcrevendo com Gemini | file=%s | size=%.1fMB | lang=%s | diarize=%s",
            file_name, file_size_mb, lang, diarize,
        )

        # 1. Upload do arquivo para Gemini File API
        logger.info("Fazendo upload do arquivo para Gemini File API...")
        uploaded_file = client.files.upload(
            file=file_path,
            config=types.UploadFileConfig(
                display_name=file_name,
            ),
        )
        logger.info("Upload concluído: %s (state=%s)", uploaded_file.name, uploaded_file.state)

        # 2. Aguardar processamento (vídeos grandes podem demorar)
        import time as _time
        max_wait = 300  # 5 minutos
        waited = 0
        while uploaded_file.state.name == "PROCESSING" and waited < max_wait:
            _time.sleep(5)
            waited += 5
            uploaded_file = client.files.get(name=uploaded_file.name)
            if waited % 30 == 0:
                logger.info("Aguardando processamento Gemini... (%ds)", waited)

        if uploaded_file.state.name == "FAILED":
            raise RuntimeError(f"Gemini file processing failed: {uploaded_file.state}")

        if uploaded_file.state.name != "ACTIVE":
            raise RuntimeError(
                f"Gemini file not ready after {max_wait}s (state={uploaded_file.state.name})"
            )

        try:
            # 3. Prompt de transcrição
            speaker_instruction = ""
            if diarize:
                speaker_hint = ""
                if expected_speakers:
                    speaker_hint = f" Há aproximadamente {expected_speakers} pessoas falando."
                speaker_instruction = f"""
Identifique cada pessoa que fala e atribua um identificador (SPEAKER_0, SPEAKER_1, etc.).{speaker_hint}
Para cada troca de speaker, marque o timestamp e o speaker.
Se não conseguir distinguir speakers, use SPEAKER_0 para tudo."""

            prompt = f"""Transcreva o áudio/vídeo a seguir em português brasileiro (pt-BR).

INSTRUÇÕES:
1. Transcreva TUDO que é falado, palavra por palavra, sem resumir ou omitir.
2. Inclua timestamps aproximados no formato [HH:MM:SS] ou [MM:SS] a cada troca de fala ou a cada ~30 segundos.
3. Use pontuação adequada (pontos, vírgulas, interrogações).
4. Preserve nomes próprios, termos jurídicos e gírias como falados.
5. Se houver trechos inaudíveis, marque como [inaudível].
{speaker_instruction}

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{{
  "transcript_plain": "texto corrido completo sem timestamps",
  "segments": [
    {{
      "start": 0.0,
      "end": 15.5,
      "text": "texto do segmento",
      "speaker": "SPEAKER_0"
    }}
  ],
  "speakers": ["SPEAKER_0", "SPEAKER_1"],
  "duration_estimate": 120.0,
  "language": "pt"
}}

Regras para segments:
- "start" e "end" em segundos (float)
- Cada segment deve ter no máximo ~30 segundos de fala
- Se não conseguir estimar timestamps precisos, distribua proporcionalmente
- Não omita nenhuma fala — a transcrição deve ser COMPLETA"""

            # 4. Chamar Gemini
            response = client.models.generate_content(
                model=self.gemini_model,
                contents=[
                    types.Content(
                        parts=[
                            types.Part.from_uri(
                                file_uri=uploaded_file.uri,
                                mime_type=uploaded_file.mime_type or "video/mp4",
                            ),
                            types.Part.from_text(text=prompt),
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=65536,  # Transcrições longas
                ),
            )

            # 5. Parse response
            result = self._parse_gemini_transcription(response.text, diarize)
            return result

        finally:
            # 6. Cleanup — deletar arquivo do Gemini File API
            try:
                client.files.delete(name=uploaded_file.name)
                logger.info("Arquivo deletado do Gemini File API")
            except Exception as e:
                logger.warning("Falha ao deletar arquivo do Gemini: %s", e)

    def _parse_gemini_transcription(self, response_text: str, diarize: bool) -> dict[str, Any]:
        """Parse da resposta JSON do Gemini para o formato padrão."""
        try:
            # Tentar parse direto
            data = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # Tentar extrair JSON de markdown code block
            json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", response_text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(1).strip())
            else:
                # Fallback: tratar como texto puro
                logger.warning("Gemini retornou texto não-JSON, criando transcrição simples")
                return {
                    "transcript": response_text.strip(),
                    "transcript_plain": response_text.strip(),
                    "segments": [{
                        "start": 0,
                        "end": 0,
                        "text": response_text.strip(),
                        "speaker": "SPEAKER_0",
                    }],
                    "speakers": ["SPEAKER_0"],
                    "duration": 0,
                    "language": "pt",
                    "confidence": 0.70,
                    "diarization_applied": False,
                }

        # Normalizar segmentos
        segments = data.get("segments", [])
        unique_speakers = set()
        for seg in segments:
            speaker = seg.get("speaker", "SPEAKER_0")
            unique_speakers.add(speaker)
            seg["speaker"] = speaker

        # Formatar transcrição com timestamps + speakers
        formatted_lines = []
        for seg in segments:
            ts = self._format_timestamp(seg.get("start", 0))
            speaker = seg.get("speaker", "SPEAKER_0")
            text = seg.get("text", "")
            if diarize:
                formatted_lines.append(f"[{ts}] {speaker}: {text}")
            else:
                formatted_lines.append(f"[{ts}] {text}")

        formatted_transcript = "\n".join(formatted_lines)

        speakers_list = sorted(unique_speakers) if unique_speakers else ["SPEAKER_0"]
        duration = data.get("duration_estimate", 0) or data.get("duration", 0)

        return {
            "transcript": formatted_transcript,
            "transcript_plain": data.get("transcript_plain", ""),
            "segments": segments,
            "speakers": speakers_list,
            "duration": duration,
            "language": data.get("language", "pt"),
            "confidence": 0.85,
            "diarization_applied": diarize and len(speakers_list) > 1,
        }

    # ==========================================
    # INTERNAL: Download / Format
    # ==========================================

    async def _get_audio_file(
        self,
        file_url: str | None,
        file_bytes: bytes | None,
        file_name: str,
        auth_header: str | None = None,
    ) -> Path:
        """Baixa ou salva arquivo em temp."""
        if file_url:
            headers = {}
            if auth_header:
                headers["Authorization"] = auth_header
            async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
                response = await client.get(file_url, headers=headers)
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

        # Converter para MP3 (baixo bitrate para speech — economiza tamanho)
        logger.info("Convertendo %s para MP3 (64kbps speech)", suffix)
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(str(path))
            mp3_path = path.with_suffix(".mp3")
            audio.export(str(mp3_path), format="mp3", bitrate="64k")
            mp3_size = mp3_path.stat().st_size / (1024 * 1024)
            logger.info("Conversão concluída: %.1fMB → %.1fMB (MP3 64kbps)",
                        path.stat().st_size / (1024 * 1024), mp3_size)
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

        # Calcular confiança média
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
