import fitz
def recortar(pdf_path, busca, out_png, zoom=2.3, pad=5, linhas_abaixo=0, linhas_acima=0):
    """Acha 'busca', recorta o parágrafo que a contém. Se linhas_abaixo/acima>0,
    força uma faixa de largura da coluna cobrindo a frase multi-linha."""
    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            rects = page.search_for(busca)
            if not rects:
                continue
            r = rects[0]
            lh = max(r.height, 9)
            blocks = page.get_text("blocks")
            if linhas_abaixo or linhas_acima:
                # faixa pela coluna de texto (min/max x dos blocos da página)
                xs0 = min((b[0] for b in blocks), default=r.x0)
                xs1 = max((b[2] for b in blocks), default=r.x1)
                clip = fitz.Rect(xs0, r.y0 - lh*linhas_acima - pad,
                                 xs1, r.y1 + lh*linhas_abaixo + pad)
            else:
                # maior bloco que contém o match (o parágrafo)
                cont = [b for b in blocks if b[0]-1<=r.x0 and b[1]-1<=r.y0 and b[2]+1>=r.x1 and b[3]+1>=r.y1]
                cont.sort(key=lambda b:(b[3]-b[1]), reverse=True)
                bb = cont[0] if cont else (r.x0,r.y0,r.x1,r.y1)
                clip = fitz.Rect(bb[0],bb[1],bb[2],bb[3]) + (-pad,-pad,pad,pad)
            clip = clip & page.rect
            page.get_pixmap(clip=clip, matrix=fitz.Matrix(zoom,zoom)).save(out_png)
            return True
        return False
    finally:
        doc.close()
