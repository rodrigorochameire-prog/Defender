"""Download de autos do SEEU (Execução Penal) — Fase 2b.

Contrapartida SEEU do `baixar_pdf_autos` do PJe (varredura_triagem.py): dado o CNJ
de um processo de EP, baixa os documentos (autos) do SEEU e devolve os caminhos em
/tmp, para a lane ai da Fase 2c analisar. READ-ONLY: navega e baixa; nunca clica
ação que altera estado no SEEU.

A navegação reusa a Mesa do Defensor da Fase 2a (`seeu_expediente`). A COLETA dos
documentos na timeline "Movimentações" (coluna "Ações") e o DOWNLOAD em si são
**live-gated** (§4 do design 2026-07-01-seeu-autos-2b): os seletores/URL exatos só
podem ser mapeados com o SEEU logado ao vivo. Enquanto não mapeados, essas etapas
levantam `SeeuAutosLiveGated` — o worker da 2c captura e fecha o estado como 'erro'
com mensagem clara, sem inventar seletores (Constitution Art. IV — No Invention).

As funções puras (roteamento, dedup, nomes, tmp dir) são unit-testadas em
test_seeu_autos.py e não dependem de browser.
"""
from __future__ import annotations
import hashlib
import re
import sys
import tempfile
import unicodedata
from pathlib import Path

# Reuso da navegação da Fase 2a (Mesa do Defensor → href visualizacaoProcesso).
# seeu_expediente.py é leve (só `re`); importável sem browser.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import seeu_expediente as se  # noqa: E402


class SeeuAutosLiveGated(RuntimeError):
    """A coleta/download de documentos do SEEU ainda não foi mapeada ao vivo
    (design §4). Levantada pelas etapas que dependem dos seletores reais até que
    uma sessão de mapeamento com o SEEU logado feche a primitiva."""


def _log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


# ───── Funções puras (build-ready; testadas) ──────────────────────────────────

def escolhe_fonte_autos(atribuicao: str | None) -> str:
    """Roteamento da 2c: EXECUCAO_PENAL usa o SEEU; o resto (Júri/VVD/Criminal)
    usa o PJe (`baixar_pdf_autos`). Default defensivo: PJe."""
    return "seeu" if (atribuicao or "").strip().upper() == "EXECUCAO_PENAL" else "pje"


def _doc_key(doc: dict) -> str | None:
    """Chave de dedup: id do documento se houver, senão o seq. Sem nenhum dos
    dois → None (nunca deduplica; melhor duplicar que descartar um documento)."""
    ident = doc.get("id")
    if ident:
        return f"id:{ident}"
    seq = doc.get("seq")
    if seq:
        return f"seq:{seq}"
    return None


def dedup_documentos(docs: list[dict]) -> list[dict]:
    """Remove documentos repetidos (por id, com fallback p/ seq), preservando a
    ordem de aparição — o primeiro de cada chave vence. Itens sem chave são
    sempre mantidos."""
    out: list[dict] = []
    vistos: set[str] = set()
    for d in docs:
        k = _doc_key(d)
        if k is None:
            out.append(d)
            continue
        if k in vistos:
            continue
        vistos.add(k)
        out.append(d)
    return out


def _slug(s: str) -> str:
    """Slug ASCII seguro p/ nome de arquivo: sem acentos, minúsculo, [a-z0-9]→_."""
    norm = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    norm = re.sub(r"[^a-zA-Z0-9]+", "_", norm).strip("_").lower()
    return norm


def nome_arquivo_doc(seq: str, tipo: str | None = None) -> str:
    """Nome do PDF de um documento: seq numérico zero-padded (4) + slug do tipo.
    seq não-numérico cai no slug (ex.: 'mov-9' → 'mov_9'). Sempre .pdf."""
    seq = str(seq or "").strip()
    base = seq.zfill(4) if seq.isdigit() else (_slug(seq) or "doc")
    tipo_slug = _slug(tipo) if tipo else ""
    return f"{base}_{tipo_slug}.pdf" if tipo_slug else f"{base}.pdf"


def tmp_dir_para_cnj(cnj: str) -> Path:
    """Diretório de saída determinístico em /tmp, derivado só dos dígitos do CNJ
    (mesma pasta em re-runs → sobrescreve, não acumula lixo)."""
    digits = re.sub(r"\D", "", cnj or "")
    h = hashlib.md5(digits.encode()).hexdigest()[:8]
    return Path(tempfile.gettempdir()) / f"seeu_autos_{h}"


# ───── Coleta + download (LIVE-GATED — §4) ────────────────────────────────────

async def _coletar_documentos_disponiveis(proc_page) -> list[dict]:
    """Lê a timeline "Movimentações" e devolve os documentos disponíveis na
    coluna "Ações": [{seq, id, tipo}]. LIVE-GATED: os seletores exatos (o que na
    coluna "Ações" abre o documento — onclick? href? popup? — e se há paginação
    da timeline) só serão mapeados com o SEEU aberto. NÃO chutar seletores."""
    raise SeeuAutosLiveGated(
        "coleta de documentos do SEEU não mapeada ao vivo — ver design §4 "
        "(mapear a coluna 'Ações' da timeline Movimentações com o SEEU logado)"
    )


async def _baixar_documento(proc_page, ctx, doc: dict, out_dir: Path) -> str | None:
    """Dispara o download de UM documento e salva em out_dir/nome_arquivo_doc(...).
    LIVE-GATED: falta mapear se o clique dispara `expect_download` (PDF direto) ou
    abre um viewer/URL estilo /procapi. NÃO chutar o mecanismo."""
    raise SeeuAutosLiveGated(
        "download de documento do SEEU não mapeado ao vivo — ver design §4 "
        "(mapear expect_download vs. URL de documento com o SEEU logado)"
    )


async def baixar_autos_seeu(ctx, cnj: str) -> list[str]:
    """Baixa os autos (documentos) de um processo de EP no SEEU e devolve os
    caminhos dos PDFs em /tmp. Análogo, em papel, ao `baixar_pdf_autos` do PJe.

    Navegação reusada da Fase 2a: Mesa do Defensor → href visualizacaoProcesso do
    CNJ. A coleta/download são live-gated (levantam SeeuAutosLiveGated) até o mapa
    ao vivo. Defensivo: um documento que falha é logado e pulado (não aborta o
    lote). READ-ONLY."""
    await se._ensure_mesa_cache(ctx)  # reusa a Mesa da 2a (login manual)
    href = se._mesa_cache.get(se._norm_cnj(cnj))
    if not href:
        raise RuntimeError(f"CNJ {cnj} não encontrado na Mesa do SEEU (pendências)")
    url = href if href.startswith("http") else se.ROOT + href

    proc_page = await ctx.new_page()
    try:
        await proc_page.goto(url, wait_until="domcontentloaded", timeout=40000)
        await proc_page.wait_for_timeout(3200)

        docs = dedup_documentos(await _coletar_documentos_disponiveis(proc_page))
        out_dir = tmp_dir_para_cnj(cnj)
        out_dir.mkdir(parents=True, exist_ok=True)

        paths: list[str] = []
        for doc in docs:
            try:
                p = await _baixar_documento(proc_page, ctx, doc, out_dir)
                if p:
                    paths.append(p)
            except SeeuAutosLiveGated:
                raise  # live-gate é do lote inteiro — propaga (não é falha por-doc)
            except Exception as e:  # noqa: BLE001
                _log(f"  ⚠ doc {doc.get('seq') or doc.get('id')} falhou: {str(e)[:120]}")
                continue  # documento isolado falhou — pula, segue o lote
        return paths
    finally:
        try:
            await proc_page.close()
        except Exception:
            pass
