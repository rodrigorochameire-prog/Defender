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

import asyncio
import json
import logging
import re
import tempfile
import time
from pathlib import Path
from typing import Any

import httpx

from config import get_settings

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore[assignment,misc]

logger = logging.getLogger("enrichment-engine.transcription")

# Singleton
_transcription_service: "TranscriptionService | None" = None

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------
AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm"}
VIDEO_EXTENSIONS = {".mp4", ".mpeg", ".mov", ".avi", ".mkv", ".mpga"}
SKIP_EXTRACTION_MAX_MB = 10


def get_transcription_service() -> "TranscriptionService":
    """Singleton factory."""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service


class TranscriptionService:
    """Serviço de transcrição com Whisper + pyannote, fallback Gemini."""

    MAX_DOWNLOAD_BYTES = 600 * 1024 * 1024  # 600MB hard limit

    def __init__(self) -> None:
        settings = get_settings()

        # Whisper (OpenAI)
        self.openai_client = None
        if settings.openai_api_key:
            if OpenAI is None:
                logger.warning("openai package not installed, Whisper unavailable")
            else:
                self.openai_client = OpenAI(api_key=settings.openai_api_key)

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
            use_chunked_whisper = False
            audio_path = tmp_path

            if not self.whisper_available:
                logger.info("Whisper não disponível, usando Gemini")
                use_gemini = True
            elif file_size_mb > self.max_file_size_mb:
                # Extrair áudio comprimido (MP3 mono 32kbps) — remove vídeo e reduz tamanho
                audio_path = self._extract_compressed_audio(tmp_path)
                audio_size_mb = audio_path.stat().st_size / (1024 * 1024)
                if audio_size_mb > self.max_file_size_mb:
                    # Ainda acima do limite — usar chunking com Whisper
                    logger.info(
                        "Arquivo %.1fMB (áudio %.1fMB) excede Whisper %dMB — usando chunked Whisper",
                        file_size_mb, audio_size_mb, self.max_file_size_mb,
                    )
                    use_chunked_whisper = True
                else:
                    use_chunked_whisper = False
                    # audio_path agora cabe no Whisper, será usado no path normal
                    if audio_path != tmp_path:
                        tmp_path.unlink(missing_ok=True)
                        tmp_path = audio_path

            if use_gemini:
                result = await self._transcribe_with_gemini(
                    tmp_path, file_name, lang, diarize, expected_speakers
                )
                backend_name = "gemini"
            elif use_chunked_whisper:
                result = await self._transcribe_chunked_whisper(
                    audio_path, file_name, lang, diarize, expected_speakers
                )
                backend_name = "whisper_chunked"
                # Cleanup audio_path convertido
                if audio_path != tmp_path:
                    audio_path.unlink(missing_ok=True)
            else:
                result = await self._transcribe_with_whisper(
                    tmp_path, file_name, lang, diarize, expected_speakers
                )
                backend_name = "whisper"

            elapsed = time.time() - start
            logger.info(
                "Transcrição concluída | backend=%s | duration=%.1fs | segments=%d | speakers=%d",
                backend_name,
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
    # CHUNKED WHISPER PATH (large files)
    # ==========================================

    async def _transcribe_chunked_whisper(
        self,
        audio_path: Path,
        file_name: str,
        lang: str,
        diarize: bool,
        expected_speakers: int | None,
    ) -> dict[str, Any]:
        """
        Transcrição via Whisper em chunks para arquivos que excedem 25MB.
        Divide o áudio em pedaços de ~20min, transcreve cada um com Whisper,
        e recombina os segmentos com timestamps ajustados.
        """
        from pydub import AudioSegment

        audio = AudioSegment.from_file(str(audio_path))
        duration_seconds = len(audio) / 1000.0

        # ~20 minutos por chunk (MP3 32kbps mono ≈ ~4.7MB por 20min)
        chunk_duration_ms = 20 * 60 * 1000

        chunks: list[tuple[float, AudioSegment]] = []
        for start_ms in range(0, len(audio), chunk_duration_ms):
            end_ms = min(start_ms + chunk_duration_ms, len(audio))
            chunks.append((start_ms / 1000.0, audio[start_ms:end_ms]))

        logger.info(
            "Chunked Whisper | file=%s | duration=%.0fs | chunks=%d",
            file_name, duration_seconds, len(chunks),
        )

        all_segments: list[dict] = []
        full_text_parts: list[str] = []

        for i, (offset_seconds, chunk) in enumerate(chunks):
            chunk_path = Path(tempfile.mktemp(suffix=".mp3"))
            try:
                chunk.export(str(chunk_path), format="mp3", bitrate="32k")
                chunk_size_mb = chunk_path.stat().st_size / (1024 * 1024)
                logger.info(
                    "Transcrevendo chunk %d/%d | offset=%.0fs | size=%.1fMB",
                    i + 1, len(chunks), offset_seconds, chunk_size_mb,
                )

                if chunk_size_mb > self.max_file_size_mb:
                    logger.warning(
                        "Chunk %d excede limite Whisper (%.1fMB) — pulando",
                        i + 1, chunk_size_mb,
                    )
                    continue

                chunk_result = self._transcribe_whisper(chunk_path, lang)

                # Ajustar timestamps com offset do chunk
                for seg in chunk_result.get("segments", []):
                    seg["start"] += offset_seconds
                    seg["end"] += offset_seconds
                    all_segments.append(seg)

                full_text_parts.append(chunk_result.get("text", ""))

            except Exception as e:
                logger.error("Erro no chunk %d/%d: %s", i + 1, len(chunks), str(e))
            finally:
                chunk_path.unlink(missing_ok=True)

        if not full_text_parts:
            raise RuntimeError(
                f"Nenhum chunk foi transcrito com sucesso para '{file_name}'"
            )

        full_text = " ".join(full_text_parts)

        # Diarização no arquivo de áudio completo (se habilitado)
        speakers_result = None
        if diarize and self.diarization_enabled and self.hf_token:
            logger.info(
                "Diarizando speakers com pyannote (arquivo completo) | expected=%s",
                expected_speakers,
            )
            try:
                speakers_result = self._diarize_speakers(audio_path, expected_speakers)
            except Exception as e:
                logger.warning("Diarização falhou (continuando sem speakers): %s", e)

        whisper_result = {
            "text": full_text,
            "segments": all_segments,
            "language": lang,
            "duration": duration_seconds,
        }

        return self._merge_transcription_and_speakers(whisper_result, speakers_result)

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
        # Sanitizar display_name para evitar problemas de encoding
        safe_name = file_name.encode("ascii", errors="replace").decode("ascii")
        logger.info("Fazendo upload do arquivo para Gemini File API... (%s)", safe_name)
        uploaded_file = client.files.upload(
            file=file_path,
            config=types.UploadFileConfig(
                display_name=safe_name,
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
            # 3. Prompt de transcrição — otimizado para contexto jurídico
            speaker_instruction = ""
            if diarize:
                speaker_hint = ""
                if expected_speakers:
                    speaker_hint = f" Há aproximadamente {expected_speakers} pessoas falando."
                speaker_instruction = f"""
IDENTIFICAÇÃO DE INTERLOCUTORES:
Identifique cada pessoa pelo seu PAPEL no contexto jurídico:{speaker_hint}
- Se alguém faz perguntas formais (conduz o depoimento) → "DELEGADO" ou "JUIZ" ou "MP"
- Se alguém responde perguntas sobre fatos → "DEPOENTE" ou "TESTEMUNHA"
- Se alguém intervém mencionando direitos do acusado → "DEFENSOR"
- Se não conseguir identificar o papel → use "INTERLOCUTOR_N" (N = número sequencial)
- Atribua o papel logo na primeira fala e mantenha consistente.
- Se mais de uma pessoa tem o mesmo papel, diferencie: "TESTEMUNHA_1", "TESTEMUNHA_2"."""

            prompt = f"""Transcreva o áudio/vídeo a seguir em português brasileiro (pt-BR).
Este é um arquivo de contexto JURÍDICO-CRIMINAL (depoimento, audiência, interrogatório ou atendimento).

INSTRUÇÕES:
1. Transcreva TUDO que é falado, palavra por palavra, sem resumir ou omitir.
2. Inclua timestamps aproximados no formato [HH:MM:SS] ou [MM:SS] a cada troca de fala ou a cada ~30 segundos.
3. Use pontuação adequada (pontos, vírgulas, interrogações).
4. Preserve nomes próprios, termos jurídicos e gírias como falados.
5. Se houver trechos inaudíveis, marque como [inaudível].
6. IMPORTANTE: Quando o áudio acabar, PARE. NÃO repita ou invente conteúdo. NÃO gere loops de palavras repetidas.
{speaker_instruction}

FORMATO DE SAÍDA — responda APENAS com JSON válido:
{{
  "transcript_plain": "texto corrido completo sem timestamps",
  "segments": [
    {{
      "start": 0.0,
      "end": 15.5,
      "text": "texto do segmento",
      "speaker": "DELEGADO"
    }}
  ],
  "speakers": ["DELEGADO", "DEPOENTE"],
  "duration_estimate": 120.0,
  "language": "pt"
}}

Regras para segments:
- "start" e "end" em segundos (float)
- Cada segment deve ter no máximo ~30 segundos de fala
- Se não conseguir estimar timestamps precisos, distribua proporcionalmente
- Não omita nenhuma fala — a transcrição deve ser COMPLETA
- Quando o áudio acabar, PARE IMEDIATAMENTE. Não gere texto adicional."""

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

    @staticmethod
    def _clean_repetition(text: str) -> str:
        """Remove repetições artificiais geradas por Gemini no final do texto.
        Ex: 'ele, ele, ele, ele, ele, ele' ou 'né, né, né, né'."""
        if not text or len(text) < 100:
            return text

        # Detectar padrão repetitivo no final (últimos 20% do texto)
        cutoff = int(len(text) * 0.8)
        tail = text[cutoff:]

        # Padrão: mesma palavra/frase curta repetida 5+ vezes seguidas
        # Matches: "ele, ele, ele, ele" or "né né né né" or "ele ele ele"
        repetition_pattern = re.compile(
            r'(?:,?\s*)(\b\w{1,15}\b)(?:(?:,\s*|\s+)\1){4,}[\s,]*$',
            re.IGNORECASE
        )
        match = repetition_pattern.search(tail)
        if match:
            # Encontrou repetição — cortar no início do padrão
            cut_pos = cutoff + match.start()
            cleaned = text[:cut_pos].rstrip(' ,;.')
            # Adicionar ponto final se não tem
            if cleaned and cleaned[-1] not in '.!?':
                cleaned += '.'
            logger.info(
                "Repetição removida | cortou %d chars do final | palavra repetida: '%s'",
                len(text) - len(cleaned), match.group(1)
            )
            return cleaned

        # Padrão 2: frases curtas idênticas repetidas (com ou sem pontuação)
        # Ex: "Isso mesmo. Isso mesmo. Isso mesmo."
        phrase_pattern = re.compile(
            r'(.{5,40}?)\s*(?:\.\s*\1\s*){3,}\.?\s*$',
            re.IGNORECASE
        )
        match2 = phrase_pattern.search(tail)
        if match2:
            cut_pos = cutoff + match2.start()
            cleaned = text[:cut_pos].rstrip(' ,;.')
            if cleaned and cleaned[-1] not in '.!?':
                cleaned += '.'
            logger.info(
                "Repetição de frase removida | cortou %d chars | frase: '%s'",
                len(text) - len(cleaned), match2.group(1)[:50]
            )
            return cleaned

        return text

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

        # Limpar repetições artificiais do Gemini
        plain_text = self._clean_repetition(data.get("transcript_plain", ""))
        formatted_transcript = self._clean_repetition(formatted_transcript)

        # Remover segments repetitivos no final
        if segments and len(segments) > 3:
            # Detectar se últimos N segments têm texto quase idêntico
            last_texts = [s.get("text", "").strip().lower() for s in segments[-5:]]
            if len(set(last_texts)) == 1 and last_texts[0]:
                # Últimos 5 segments são idênticos → manter apenas 1
                logger.info("Removendo %d segments repetitivos no final", 4)
                segments = segments[:-4]

        return {
            "transcript": formatted_transcript,
            "transcript_plain": plain_text,
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
        """Baixa ou salva arquivo em temp. Download em streaming — RAM constante O(64KB)."""
        suffix = Path(file_name).suffix or ".mp3"
        suffix = suffix.encode("ascii", errors="replace").decode("ascii")

        if file_bytes:
            tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
            tmp.write(file_bytes)
            tmp.close()
            logger.info("Saved %d bytes from file_bytes to %s", len(file_bytes), tmp.name)
            return Path(tmp.name)

        if not file_url:
            raise ValueError("Forneça file_url ou file_bytes")

        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header.strip()

        logger.info("Streaming download from URL (%d chars)...", len(file_url))

        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp_path = Path(tmp.name)

        try:
            async with httpx.AsyncClient(timeout=300, follow_redirects=True) as client:
                async with client.stream("GET", file_url, headers=headers) as response:
                    response.raise_for_status()

                    content_length_raw = response.headers.get("content-length", "0").strip()
                    content_length = int(content_length_raw) if content_length_raw.isdigit() else 0
                    if content_length > self.MAX_DOWNLOAD_BYTES:
                        raise ValueError(
                            f"Arquivo declarado ({content_length / 1e6:.0f}MB) "
                            f"excede limite de {self.MAX_DOWNLOAD_BYTES // (1024*1024)}MB"
                        )

                    downloaded = 0
                    async for chunk in response.aiter_bytes(65536):  # 64KB chunks
                        downloaded += len(chunk)
                        if downloaded > self.MAX_DOWNLOAD_BYTES:
                            raise ValueError(
                                f"Download excedeu limite de "
                                f"{self.MAX_DOWNLOAD_BYTES // (1024*1024)}MB"
                            )
                        tmp.write(chunk)

            logger.info(
                "Streaming download complete: %d bytes → %s", downloaded, tmp_path
            )
            return tmp_path

        except Exception:
            tmp_path.unlink(missing_ok=True)
            raise
        finally:
            tmp.close()

    def _ensure_compatible_format(self, path: Path) -> Path:
        """Converte vídeo/formatos exóticos para MP3 usando pydub."""
        suffix = path.suffix.lower()
        compatible = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga"}

        if suffix in compatible:
            return path

        # Converter para MP3 (baixo bitrate para speech — economiza tamanho)
        logger.info("Convertendo %s para MP3 (32kbps mono speech)", suffix)
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(str(path))
            # Mono + 32kbps é suficiente para voz (reduz ~60% vs 64kbps stereo)
            audio = audio.set_channels(1)
            mp3_path = path.with_suffix(".mp3")
            audio.export(str(mp3_path), format="mp3", bitrate="32k")
            mp3_size = mp3_path.stat().st_size / (1024 * 1024)
            logger.info("Conversão concluída: %.1fMB → %.1fMB (MP3 32kbps mono)",
                        path.stat().st_size / (1024 * 1024), mp3_size)
            return mp3_path
        except Exception as e:
            logger.warning("Conversão falhou, tentando enviar original: %s", e)
            return path

    def _extract_compressed_audio(self, path: Path) -> Path:
        """
        Extrai áudio comprimido de qualquer arquivo (vídeo ou áudio).
        SEMPRE converte para MP3 mono 32kbps — ideal para speech.
        Diferente de _ensure_compatible_format que retorna MP4/MP3 como estão,
        este método FORÇA a conversão para reduzir tamanho ao máximo.
        Usado antes do chunked Whisper para remover stream de vídeo.
        """
        original_size = path.stat().st_size / (1024 * 1024)
        logger.info(
            "Extraindo áudio comprimido de %s (%.1fMB)",
            path.name, original_size,
        )
        try:
            from pydub import AudioSegment

            audio = AudioSegment.from_file(str(path))
            audio = audio.set_channels(1)  # Mono
            mp3_path = Path(tempfile.mktemp(suffix=".mp3"))
            audio.export(str(mp3_path), format="mp3", bitrate="32k")
            mp3_size = mp3_path.stat().st_size / (1024 * 1024)
            logger.info(
                "Áudio extraído: %.1fMB → %.1fMB (MP3 mono 32kbps, redução %.0f%%)",
                original_size, mp3_size,
                (1 - mp3_size / original_size) * 100 if original_size > 0 else 0,
            )
            return mp3_path
        except Exception as e:
            logger.warning("Extração de áudio falhou, tentando original: %s", e)
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
                # OpenAI SDK retorna TranscriptionSegment (Pydantic), não dict
                segments.append({
                    "start": getattr(seg, "start", 0) if not isinstance(seg, dict) else seg.get("start", 0),
                    "end": getattr(seg, "end", 0) if not isinstance(seg, dict) else seg.get("end", 0),
                    "text": (getattr(seg, "text", "") if not isinstance(seg, dict) else seg.get("text", "")).strip(),
                })

        return {
            "text": full_text,
            "segments": segments,
            "language": response.language if hasattr(response, "language") else language,
            "duration": response.duration if hasattr(response, "duration") else 0,
        }

    async def _whisper_with_retry(self, audio_path: Path, language: str) -> dict:
        """
        Transcreve com Whisper, com retry em erros transientes.
        - RateLimitError / 5xx → retry com backoff: 0s, 5s, 15s
        - 4xx (input inválido) → falha imediata, sem retry
        """
        import openai

        delays = [0, 5, 15]
        last_exc: Exception | None = None

        for attempt, delay in enumerate(delays):
            if delay:
                await asyncio.sleep(delay)
            try:
                return self._transcribe_whisper(audio_path, language)
            except openai.RateLimitError as e:
                last_exc = e
                logger.warning(
                    "Whisper RateLimitError (tentativa %d/3) — aguardando %ds",
                    attempt + 1,
                    delays[attempt + 1] if attempt + 1 < len(delays) else 0,
                )
            except openai.APIStatusError as e:
                if e.status_code >= 500:
                    last_exc = e
                    logger.warning(
                        "Whisper servidor %d (tentativa %d/3): %s",
                        e.status_code, attempt + 1, str(e)[:100],
                    )
                else:
                    raise  # 4xx = bug de input, não vale retry
            except Exception:
                raise  # erros inesperados propagam direto

        raise last_exc  # type: ignore[misc]

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

    # ==========================================
    # QUALITY & VALIDATION
    # ==========================================

    def _validate_output_quality(self, result: dict, duration_s: float) -> dict:
        """
        Valida se o output é proporcional à duração do arquivo.
        Heurística: 80–200 palavras/minuto de fala típica pt-BR.
        """
        text = result.get("transcript_plain", "")
        words = len(text.split())
        duration_min = max(duration_s / 60, 0.1)  # evitar divisão por zero

        expected_min = duration_min * 80
        expected_max = duration_min * 200

        if words < expected_min * 0.3:
            logger.warning(
                "Output suspeito: %d palavras para %.1fmin de áudio "
                "(esperado ~%d–%d). Possível falha silenciosa.",
                words, duration_min, int(expected_min), int(expected_max),
            )
            result["quality_warning"] = "output_too_short"

        elif words > expected_max * 2:
            logger.warning(
                "Output suspeito: %d palavras para %.1fmin "
                "(esperado ~%d–%d). Possível loop — limpando.",
                words, duration_min, int(expected_min), int(expected_max),
            )
            result["transcript_plain"] = self._clean_repetition_aggressive(
                result["transcript_plain"]
            )
            result["quality_warning"] = "output_too_long_cleaned"

        return result

    def _clean_repetition_aggressive(self, text: str) -> str:
        """
        Versão agressiva de _clean_repetition: varre o texto inteiro
        procurando por loops (não apenas os últimos 20%).
        Remove a partir do primeiro loop detectado.
        """
        if not text or len(text) < 50:
            return text

        # Padrão 1: palavra repetida 6+ vezes em qualquer ponto do texto
        pattern1 = re.compile(
            r'(?:^|[\s,;.])(\b\w{1,20}\b)(?:(?:[,\s]+)\1){5,}',
            re.IGNORECASE,
        )
        match = pattern1.search(text)
        if match:
            cut = match.start()
            cleaned = text[:cut].rstrip(" ,;.")
            if cleaned and cleaned[-1] not in ".!?":
                cleaned += "."
            logger.info(
                "_clean_repetition_aggressive: cortou %d chars na posição %d (palavra: '%s')",
                len(text) - len(cleaned), cut, match.group(1),
            )
            return cleaned

        # Padrão 2: frase curta idêntica repetida 4+ vezes
        pattern2 = re.compile(
            r'(.{8,60}?)\s*(?:[.!?]\s*\1\s*){3,}',
            re.IGNORECASE,
        )
        match2 = pattern2.search(text)
        if match2:
            cut = match2.start()
            cleaned = text[:cut].rstrip(" ,;.")
            if cleaned and cleaned[-1] not in ".!?":
                cleaned += "."
            logger.info(
                "_clean_repetition_aggressive: frase repetida cortada %d chars na posição %d",
                len(text) - len(cleaned), cut,
            )
            return cleaned

        # Fallback: delega para o método original
        return self._clean_repetition(text)

    @staticmethod
    def _is_already_compressed_audio(path: Path) -> bool:
        """
        Retorna True se o arquivo já é áudio comprimido pequeno
        e pode ser enviado direto ao Whisper sem re-extração.
        Condições: extensão de áudio (não vídeo) E tamanho ≤ 10MB.
        """
        suffix = path.suffix.lower()
        size_mb = path.stat().st_size / (1024 * 1024)

        if suffix in VIDEO_EXTENSIONS:
            return False  # sempre extrair de vídeo
        if suffix in AUDIO_EXTENSIONS and size_mb <= SKIP_EXTRACTION_MAX_MB:
            return True
        return False  # áudio grande — extrair para comprimir

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """Formata segundos em HH:MM:SS."""
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"
