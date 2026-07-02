"""Download de autos do SEEU (Execução Penal) — Fase 2b.

Contrapartida SEEU do `baixar_pdf_autos` do PJe (varredura_triagem.py): dado o CNJ
de um processo de EP, baixa os documentos (autos) do SEEU e devolve os caminhos em
/tmp, para a lane ai da Fase 2c analisar. READ-ONLY: navega e baixa; nunca clica
ação que altera estado no SEEU.

Mecanismo (mapeado ao vivo 2026-07-02, design §4):
- A timeline "Movimentações" de `visualizacaoProcesso.do` lista os movimentos; os
  com documentos carregam a lista de arquivos por AJAX de
  `/seeu/processo/movimentacaoArquivoDocumento.do?_tj=<token>` (um token por
  movimento; os tokens estão no HTML da página).
- Cada documento tem um link `/seeu/arquivo.do?_tj=<token>` que devolve o PDF
  `application/pdf` inline (Content-Disposition inline — NÃO dispara download do
  browser). Por isso baixamos via `fetch` in-page (cookies da sessão) → bytes.

Funções puras (roteamento, dedup, nomes, tmp dir, parse do fragmento) são
unit-testadas em test_seeu_autos.py e não dependem de browser.
"""
from __future__ import annotations
import base64
import hashlib
import os
import re
import sys
import tempfile
import unicodedata
from pathlib import Path

# Reuso da navegação da Fase 2a (Mesa do Defensor → href visualizacaoProcesso).
# seeu_expediente.py é leve (só `re`); importável sem browser.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import seeu_expediente as se  # noqa: E402

# Teto de segurança: processos de EP são longos (visto ao vivo: 73 docs em 1 caso).
# Mantém os N mais recentes (a timeline vem em ordem decrescente de seq). Excedente
# é logado — nunca truncado em silêncio.
_MAX_DOCS = int(os.environ.get("SEEU_AUTOS_MAX_DOCS", "80"))


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
    seq não-numérico cai no slug (ex.: 'mov-9' → 'mov_9', '155.1' → '155_1').
    Sempre .pdf."""
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


# ───── Coleta + download (mapeado ao vivo — §4) ───────────────────────────────

# JS in-page: acha os tokens das listas de arquivos de cada movimento no HTML da
# página, busca (fetch com cookies da sessão) cada fragmento e parseia o DOM de
# cada um — parse via DOM (não regex) porque o fragmento tem <table> aninhada (menu
# "Versão assinada/original") que separaria o href do seq/Descrição num split cru.
# O menu de contexto fica display:none → innerText já o exclui. Devolve a lista
# achatada de {seq, id, tipo, descricao, arquivo_url}. O menu de contexto usa
# post() em onclick (não href) → só o link principal por documento é colhido.
_JS_COLLECT_DOCS = r"""async () => {
  const pageHtml = document.documentElement.innerHTML;
  const urls = [...new Set((pageHtml.match(
    /\/seeu\/processo\/movimentacaoArquivoDocumento\.do\?_tj=[0-9a-fA-F]+/g) || []))];
  const docs = [];
  for (const u of urls) {
    let html = '';
    try { const r = await fetch(u, {credentials: 'include'}); html = await r.text(); }
    catch (e) { continue; }
    const box = document.createElement('div'); box.innerHTML = html;
    box.querySelectorAll('a[href*="/seeu/arquivo.do"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const idm = href.match(/_tj=([0-9a-fA-F]+)/);
      const row = a.closest('tr');
      const t = row ? (row.innerText || '').replace(/\s+/g, ' ').trim() : '';
      const seqm = t.match(/(\d+\.\d+)/);
      // [^:] em vez de \w* porque JS \w não casa "çã" de "Descrição:".
      const descm = t.match(/Descri[^:]*:\s*(.+?)(?:\s+\d+\.\d+\s+Tipo|\s+Tipo de Documento)/i);
      const tipom = t.match(/Tipo de Documento:\s*(.+?)(?:\s+Ass\.?:|$)/i);
      docs.push({
        seq: seqm ? seqm[1] : null,
        id: idm ? idm[1] : null,
        arquivo_url: href,
        descricao: descm ? descm[1].trim() : null,
        tipo: tipom ? tipom[1].trim() : null,
      });
    });
  }
  return docs;
}"""

# JS in-page: baixa o PDF de um arquivo.do como base64 (o SEEU serve inline, então
# expect_download não dispara; fetch+bytes é o caminho).
_JS_FETCH_BYTES = r"""async (u) => {
  const r = await fetch(u, {credentials: 'include'});
  const bytes = new Uint8Array(await r.arrayBuffer());
  let bin = ''; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return {status: r.status, ct: r.headers.get('content-type'), b64: btoa(bin)};
}"""


async def _coletar_documentos_disponiveis(proc_page) -> list[dict]:
    """Lê a timeline "Movimentações" (já carregada em proc_page) e devolve os
    documentos disponíveis: [{seq, id, tipo, descricao, arquivo_url}]. Busca e
    parseia (via DOM in-page) os fragmentos de arquivos de cada movimento."""
    return await proc_page.evaluate(_JS_COLLECT_DOCS) or []


async def _baixar_documento(proc_page, doc: dict, out_dir: Path) -> str | None:
    """Baixa UM documento (arquivo.do) via fetch in-page e salva em
    out_dir/nome_arquivo_doc(seq, tipo). Devolve o caminho ou None (não-PDF/erro)."""
    arq = doc.get("arquivo_url")
    if not arq:
        return None
    url = arq if arq.startswith("http") else se.ROOT + arq
    res = await proc_page.evaluate(_JS_FETCH_BYTES, url)
    if not res or res.get("status") != 200:
        _log(f"  ⚠ doc {doc.get('seq')}: HTTP {res.get('status') if res else '?'}")
        return None
    data = base64.b64decode(res.get("b64") or "")
    if data[:4] != b"%PDF":
        _log(f"  ⚠ doc {doc.get('seq')}: resposta não é PDF (ct={res.get('ct')})")
        return None
    dest = out_dir / nome_arquivo_doc(doc.get("seq") or doc.get("id") or "doc", doc.get("tipo"))
    dest.write_bytes(data)
    return str(dest)


async def baixar_autos_seeu(ctx, cnj: str) -> list[str]:
    """Baixa os autos (documentos) de um processo de EP no SEEU e devolve os
    caminhos dos PDFs em /tmp. Análogo, em papel, ao `baixar_pdf_autos` do PJe.

    Navegação reusada da Fase 2a: Mesa do Defensor → href visualizacaoProcesso do
    CNJ. Defensivo: um documento que falha é logado e pulado (não aborta o lote).
    READ-ONLY."""
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
        if len(docs) > _MAX_DOCS:
            _log(f"  ⚠ {len(docs)} documentos no processo — baixando os {_MAX_DOCS} "
                 f"mais recentes (SEEU_AUTOS_MAX_DOCS={_MAX_DOCS})")
            docs = docs[:_MAX_DOCS]

        out_dir = tmp_dir_para_cnj(cnj)
        out_dir.mkdir(parents=True, exist_ok=True)

        paths: list[str] = []
        for doc in docs:
            try:
                p = await _baixar_documento(proc_page, doc, out_dir)
                if p:
                    paths.append(p)
            except Exception as e:  # noqa: BLE001
                _log(f"  ⚠ doc {doc.get('seq') or doc.get('id')} falhou: {str(e)[:120]}")
                continue  # documento isolado falhou — pula, segue o lote
        return paths
    finally:
        try:
            await proc_page.close()
        except Exception:
            pass
