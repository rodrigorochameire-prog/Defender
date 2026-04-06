"""
POST /pje/scan-intimacoes — Scan de intimacoes PJe via Chrome CDP + Gemini Flash.

Navega ao PJe, extrai conteudo de intimacoes, analisa com Gemini Flash para
identificar ato processual, providencias e audiencias designadas.
Opcionalmente baixa PDF e copia para pasta do assistido no Drive.

NOTA: Funciona apenas localmente. Requer Chrome com --remote-debugging-port=9222.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
import time
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from config import get_settings
from services.pje_scraper_service import get_pje_scraper_service

logger = logging.getLogger("enrichment-engine.pje-scan")
router = APIRouter()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PjeScanIntimacao(BaseModel):
    numero_processo: str
    assistido_nome: str
    atribuicao: str  # "Violencia Domestica", "Juri", etc.
    id_documento: str | None = None


class PjeScanInput(BaseModel):
    intimacoes: list[PjeScanIntimacao]
    drive_base_path: str  # e.g. "/Users/.../Meu Drive/1 - Defensoria 9a DP"


class PjeScanResultado(BaseModel):
    numero_processo: str
    status: str  # "success" | "error"
    ato_sugerido: str | None = None
    ato_confianca: str | None = None  # "high" | "medium"
    providencias: str | None = None
    audiencia_data: str | None = None
    audiencia_hora: str | None = None
    audiencia_tipo: str | None = None
    pdf_path: str | None = None
    conteudo_resumo: str | None = None
    error: str | None = None


class PjeScanOutput(BaseModel):
    resultados: list[PjeScanResultado]
    total_success: int
    total_errors: int


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PJE_CONSULTA_URL = "https://pje.tjba.jus.br/pje/ConsultaProcesso/listView.seam"

PASTA_ATRIBUICAO = {
    "Violência Doméstica": "Processos - VVD (Criminal)",
    "Violencia Domestica": "Processos - VVD (Criminal)",
    "VVD": "Processos - VVD (Criminal)",
    "Júri": "Processos - Júri",
    "Juri": "Processos - Júri",
    "Execução Penal": "Processos - Execução Penal",
    "Execucao Penal": "Processos - Execução Penal",
    "EP": "Processos - Execução Penal",
    "Criminal": "Processos - Criminal",
}

# JS to extract intimation content from processo detail page
JS_EXTRACT_INTIMACAO = """() => {
    var result = { movimentacoes: [], conteudo_decisao: null, documentos: [] };

    // Keywords indicating DPE-relevant movements
    var keywords = ['defensoria', 'defensor', 'intimação', 'intimacao',
                    'decisão', 'decisao', 'despacho', 'sentença', 'sentenca',
                    'audiência', 'audiencia', 'designa'];

    // Extract timeline events
    var currentDate = '';
    var timelineDiv = document.querySelector('[id$="divEventosTimeLine"]');
    if (timelineDiv) {
        var events = timelineDiv.querySelectorAll('.media');
        for (var m = 0; m < events.length; m++) {
            var ev = events[m];

            var dateSpan = ev.querySelector('.data-interna');
            if (dateSpan) {
                currentDate = dateSpan.textContent.trim();
                continue;
            }

            var movSpan = ev.querySelector('.texto-movimento, .texto-movimento-inativo');
            if (movSpan) {
                var descricao = movSpan.textContent.trim();
                var descLower = descricao.toLowerCase();

                // Check if relevant to DPE
                var isRelevant = false;
                for (var k = 0; k < keywords.length; k++) {
                    if (descLower.indexOf(keywords[k]) > -1) {
                        isRelevant = true;
                        break;
                    }
                }

                // Extract attached documents
                var anexos = ev.querySelectorAll('.anexos a');
                var docs = [];
                for (var d = 0; d < anexos.length; d++) {
                    var docText = anexos[d].textContent.trim();
                    var docId = anexos[d].getAttribute('id') || '';
                    if (docText) docs.push({ texto: docText, id: docId });
                }

                result.movimentacoes.push({
                    data: currentDate,
                    descricao: descricao,
                    relevante: isRelevant,
                    documentos: docs
                });

                // Capture the most recent decision/dispatch content
                if (!result.conteudo_decisao && isRelevant) {
                    // Try to get the full text content (expanded)
                    var textoCompleto = ev.querySelector('.conteudo-texto-movimento, .panel-body');
                    if (textoCompleto) {
                        result.conteudo_decisao = textoCompleto.textContent.trim();
                    } else {
                        result.conteudo_decisao = descricao;
                    }
                }
            }
        }
    }

    // Build summary of recent relevant movements (last 5)
    var relevantes = result.movimentacoes.filter(function(m) { return m.relevante; });
    var resumo = relevantes.slice(0, 5).map(function(m) {
        return m.data + ' - ' + m.descricao;
    }).join('\\n');

    result.resumo = resumo || (result.movimentacoes.length > 0
        ? result.movimentacoes[0].data + ' - ' + result.movimentacoes[0].descricao
        : 'Sem movimentacoes encontradas');

    // Extract document list for specific id_documento lookup
    result.movimentacoes.forEach(function(m) {
        (m.documentos || []).forEach(function(doc) {
            result.documentos.push({
                texto: doc.texto,
                id: doc.id,
                data: m.data,
                descricao_movimento: m.descricao
            });
        });
    });

    return result;
}"""

# ---------------------------------------------------------------------------
# Gemini analysis helper
# ---------------------------------------------------------------------------

async def _analyze_with_gemini(content: str) -> dict[str, Any]:
    """Analyze intimacao content using Gemini Flash to identify required actions."""
    settings = get_settings()

    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set, skipping analysis")
        return {}

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""Analise o conteúdo desta intimação judicial e responda em JSON:
{{
  "ato": "nome do ato processual que a Defensoria deve praticar (ex: Resposta à Acusação, Alegações Finais, Contrarrazões, Ciência designação de audiência, Manifestação, etc.)",
  "confianca": "high ou medium",
  "providencias": "resumo de 2-3 frases: o que a DPE foi intimada para fazer + contexto do processo",
  "audiencia_data": "DD/MM/YYYY se houver audiência designada, null caso contrário",
  "audiencia_hora": "HH:MM se houver, null caso contrário",
  "audiencia_tipo": "tipo da audiência se houver (AIJ, Justificação, etc.), null caso contrário"
}}

Conteúdo da intimação:
{content}"""

        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                max_output_tokens=2048,
            ),
        )

        text = response.text.strip()
        return json.loads(text)

    except json.JSONDecodeError as e:
        logger.warning("Gemini returned invalid JSON: %s", e)
        return {}
    except Exception as e:
        logger.error("Gemini analysis failed: %s", e)
        return {}


# ---------------------------------------------------------------------------
# PDF download helper
# ---------------------------------------------------------------------------

async def _try_download_pdf(page, temp_dir: str) -> str | None:
    """Try to download processo PDF from the detail page."""
    try:
        # Look for download/print button on the processo page
        download_btn = await page.query_selector(
            'a[title*="Download"], a[title*="download"], '
            'a[title*="Baixar"], a[title*="baixar"], '
            'button[title*="Download"], '
            '.btn-download, .download-autos, '
            'a[href*="download"], a[onclick*="download"]'
        )

        if not download_btn:
            logger.debug("No download button found on processo page")
            return None

        async with page.expect_download(timeout=60000) as download_info:
            await download_btn.click()

        download = await download_info.value
        pdf_path = os.path.join(temp_dir, download.suggested_filename or "processo.pdf")
        await download.save_as(pdf_path)
        logger.info("Downloaded PDF: %s", pdf_path)
        return pdf_path

    except Exception as e:
        logger.debug("PDF download failed (non-critical): %s", e)
        return None


# ---------------------------------------------------------------------------
# Drive copy helper
# ---------------------------------------------------------------------------

def _copy_to_drive(
    pdf_path: str,
    drive_base_path: str,
    atribuicao: str,
    assistido_nome: str,
    numero_processo: str,
) -> str | None:
    """Copy downloaded PDF to the assistido's folder in Google Drive."""
    pasta = PASTA_ATRIBUICAO.get(atribuicao)
    if not pasta:
        logger.warning("Unknown atribuicao '%s', skipping Drive copy", atribuicao)
        return None

    target_dir = os.path.join(drive_base_path, pasta, assistido_nome)
    os.makedirs(target_dir, exist_ok=True)

    # Sanitize filename
    safe_numero = numero_processo.replace("/", "-").replace("\\", "-")
    target_path = os.path.join(target_dir, f"{safe_numero}-processo.pdf")

    shutil.copy2(pdf_path, target_path)
    logger.info("Copied PDF to Drive: %s", target_path)
    return target_path


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/pje/scan-intimacoes",
    response_model=PjeScanOutput,
    summary="Scan PJe intimacoes — extract content and analyze with Gemini",
    status_code=status.HTTP_200_OK,
)
async def scan_intimacoes(payload: PjeScanInput):
    """
    Scan a batch of PJe intimacoes:
    1. Navigate to each processo in PJe (via Chrome CDP)
    2. Extract intimation content from the timeline
    3. Analyze with Gemini Flash to identify ato processual + providencias
    4. Optionally download PDF and copy to Drive folder

    Processes sequentially with rate limiting. Each failure is isolated.
    """
    scraper = get_pje_scraper_service()
    settings = get_settings()
    resultados: list[PjeScanResultado] = []

    try:
        await scraper._connect()
        context = await scraper._get_context()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Falha ao conectar ao Chrome CDP: {e}. "
            "Verifique se o Chrome está aberto com --remote-debugging-port=9222.",
        )

    logger.info(
        "Starting PJe scan | intimacoes=%d | drive=%s",
        len(payload.intimacoes),
        payload.drive_base_path,
    )

    for i, intimacao in enumerate(payload.intimacoes):
        numero = intimacao.numero_processo
        logger.info("Scanning [%d/%d]: %s", i + 1, len(payload.intimacoes), numero)

        page = None
        try:
            # Rate limit between navigations
            await scraper._rate_limit()

            # --- Step 1: Navigate to processo via search ---
            page = await context.new_page()

            await page.goto(
                PJE_CONSULTA_URL,
                wait_until="domcontentloaded",
                timeout=30000,
            )
            await page.wait_for_timeout(3000)  # JSF render

            # Fill search field with processo number
            # PJe search field IDs vary; try common selectors
            search_input = await page.query_selector(
                'input[id*="numeroProcesso"], '
                'input[id*="numProcesso"], '
                'input[name*="numeroProcesso"], '
                'input[type="text"][id*="fPP:numProcesso"]'
            )

            if not search_input:
                # Fallback: try any text input in the search form
                search_input = await page.query_selector(
                    '#fPP input[type="text"], '
                    'form[id*="Consulta"] input[type="text"]'
                )

            if not search_input:
                raise RuntimeError(
                    f"Campo de busca não encontrado na página de consulta PJe"
                )

            await search_input.fill(numero)
            await page.wait_for_timeout(500)

            # Submit search
            submit_btn = await page.query_selector(
                'input[type="submit"][id*="pesquisar"], '
                'button[id*="pesquisar"], '
                'input[type="button"][value*="Pesquisar"], '
                'a[id*="pesquisar"]'
            )

            if submit_btn:
                await submit_btn.click()
            else:
                # Try pressing Enter on the search field
                await search_input.press("Enter")

            await page.wait_for_timeout(4000)  # Wait for results

            # Click on the process link in results
            processo_link = await page.query_selector(
                'a[href*="Detalhe"], '
                'a[href*="detalhe"], '
                'a.numero-processo, '
                'a[onclick*="Detalhe"]'
            )

            if processo_link:
                await processo_link.click()
                await page.wait_for_timeout(4000)  # JSF detail page render
            else:
                # Maybe the search navigated directly to the detail page
                logger.debug("No process link found in results, checking if already on detail page")

            # --- Step 2: Extract intimation content ---
            extracted = await page.evaluate(JS_EXTRACT_INTIMACAO)

            conteudo = extracted.get("conteudo_decisao") or extracted.get("resumo", "")

            # If id_documento was specified, try to find that specific document
            if intimacao.id_documento and extracted.get("documentos"):
                for doc in extracted["documentos"]:
                    if intimacao.id_documento in (doc.get("id", ""), doc.get("texto", "")):
                        conteudo = (
                            f"Documento {doc['texto']} ({doc['data']})\n"
                            f"Movimento: {doc['descricao_movimento']}\n\n{conteudo}"
                        )
                        break

            if not conteudo or conteudo == "Sem movimentacoes encontradas":
                resultados.append(PjeScanResultado(
                    numero_processo=numero,
                    status="error",
                    error="Nenhuma movimentação relevante encontrada no processo",
                    conteudo_resumo=extracted.get("resumo"),
                ))
                continue

            # --- Step 3: Analyze with Gemini Flash ---
            analysis = await _analyze_with_gemini(conteudo)

            # --- Step 4: Try PDF download (best effort) ---
            pdf_drive_path = None
            with tempfile.TemporaryDirectory() as temp_dir:
                pdf_local = await _try_download_pdf(page, temp_dir)

                # --- Step 5: Copy to Drive ---
                if pdf_local and payload.drive_base_path:
                    pdf_drive_path = _copy_to_drive(
                        pdf_path=pdf_local,
                        drive_base_path=payload.drive_base_path,
                        atribuicao=intimacao.atribuicao,
                        assistido_nome=intimacao.assistido_nome,
                        numero_processo=numero,
                    )

            # Build result
            resultados.append(PjeScanResultado(
                numero_processo=numero,
                status="success",
                ato_sugerido=analysis.get("ato"),
                ato_confianca=analysis.get("confianca"),
                providencias=analysis.get("providencias"),
                audiencia_data=analysis.get("audiencia_data"),
                audiencia_hora=analysis.get("audiencia_hora"),
                audiencia_tipo=analysis.get("audiencia_tipo"),
                pdf_path=pdf_drive_path,
                conteudo_resumo=conteudo[:500] if conteudo else None,
            ))

        except Exception as e:
            logger.error("Error scanning processo %s: %s", numero, e)
            resultados.append(PjeScanResultado(
                numero_processo=numero,
                status="error",
                error=str(e),
            ))

        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass

    total_success = sum(1 for r in resultados if r.status == "success")
    total_errors = sum(1 for r in resultados if r.status == "error")

    logger.info(
        "PJe scan complete | success=%d errors=%d",
        total_success,
        total_errors,
    )

    return PjeScanOutput(
        resultados=resultados,
        total_success=total_success,
        total_errors=total_errors,
    )
