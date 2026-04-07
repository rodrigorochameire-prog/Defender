#!/usr/bin/env python3
"""
Preparação de Audiência — PDF Generator
========================================
Gera o PDF de preparação de audiência com paleta institucional baseada na
atribuição (Júri verde, VVD âmbar, EP azul, Substituição neutro).

Uso:
    python3 preparacao_audiencia_pdf.py <input.json> <output.pdf>

input.json schema:
{
  "atribuicao": "JURI_CAMACARI|VVD_CAMACARI|EXECUCAO_PENAL|SUBSTITUICAO",
  "assistido": "Nome do Assistido",
  "processo": "0000000-00.0000.0.00.0000",
  "audiencia": {
    "data": "ISO string",
    "tipo": "INSTRUCAO|JURI|...",
    "local": "Vara X"
  },
  "resumo_caso": "string opcional",
  "depoentes": [
    {
      "nome": "...",
      "tipo": "DEFESA|ACUSACAO|VITIMA|INFORMANTE|PERITO|COMUM",
      "endereco": "...",
      "resumo": "...",
      "perguntas_sugeridas": "...",
      "pontos_favoraveis": "...",
      "pontos_desfavoraveis": "...",
      "observacoes": "..."
    }
  ]
}
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)


# ════════════════════════════════════════════════════════════════
# PALETAS POR ATRIBUIÇÃO
# ════════════════════════════════════════════════════════════════
PALETTES = {
    "JURI_CAMACARI": {
        "name": "Júri",
        "primary":   "#1A5C36",
        "accent":    "#2D8B57",
        "light":     "#D1FAE5",
        "soft_bg":   "#F0FFF4",
        "footer_tx": "#3B7C5C",
    },
    "VVD_CAMACARI": {
        "name": "Violência Doméstica",
        "primary":   "#6B4D2B",
        "accent":    "#C8A84E",
        "light":     "#FEF3C7",
        "soft_bg":   "#FAF8F2",
        "footer_tx": "#8B6B3A",
    },
    "EXECUCAO_PENAL": {
        "name": "Execução Penal",
        "primary":   "#1E3A8A",
        "accent":    "#3B82F6",
        "light":     "#DBEAFE",
        "soft_bg":   "#EFF6FF",
        "footer_tx": "#3B5BA0",
    },
    "SUBSTITUICAO": {
        "name": "Substituição Criminal",
        "primary":   "#334155",
        "accent":    "#64748B",
        "light":     "#E2E8F0",
        "soft_bg":   "#F8FAFC",
        "footer_tx": "#475569",
    },
}

DEFAULT_PALETTE = PALETTES["SUBSTITUICAO"]

C_GRAY_800 = HexColor("#1F2937")
C_GRAY_600 = HexColor("#4B5563")
C_GRAY_400 = HexColor("#9CA3AF")
C_OFF_WHITE = HexColor("#F8FAFB")

W, H = A4
USABLE = W - 4 * cm


# ════════════════════════════════════════════════════════════════
# TIPO → BADGE LABEL
# ════════════════════════════════════════════════════════════════
TIPO_LABEL = {
    "DEFESA": "Testemunha de Defesa",
    "ACUSACAO": "Testemunha de Acusação",
    "VITIMA": "Vítima",
    "INFORMANTE": "Informante",
    "PERITO": "Perito",
    "COMUM": "Testemunha",
}


def fmt_data_pt(iso: str | None) -> str:
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return iso
    meses = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ]
    return f"{dt.day:02d} de {meses[dt.month - 1]} de {dt.year} — {dt.hour:02d}h{dt.minute:02d}"


def build_styles(palette: dict) -> dict:
    primary = HexColor(palette["primary"])
    accent = HexColor(palette["accent"])
    light = HexColor(palette["light"])
    footer_tx = HexColor(palette["footer_tx"])

    base = getSampleStyleSheet()
    s: dict[str, ParagraphStyle] = {}

    s["title"] = ParagraphStyle(
        "DocTitle", parent=base["Title"],
        fontName="Helvetica-Bold", fontSize=16, leading=20,
        textColor=primary, alignment=TA_CENTER, spaceAfter=4,
    )
    s["sub"] = ParagraphStyle(
        "DocSub", parent=base["Normal"],
        fontName="Helvetica-Oblique", fontSize=10, leading=13,
        textColor=footer_tx, alignment=TA_CENTER, spaceAfter=10,
    )
    s["body"] = ParagraphStyle(
        "Body", parent=base["Normal"],
        fontName="Helvetica", fontSize=9.5, leading=13.5,
        textColor=C_GRAY_800, alignment=TA_JUSTIFY, spaceAfter=4,
    )
    s["body_indent"] = ParagraphStyle(
        "BodyIndent", parent=s["body"], firstLineIndent=14,
    )
    s["bullet"] = ParagraphStyle(
        "Bullet", parent=base["Normal"],
        fontName="Helvetica", fontSize=9.5, leading=13.5,
        textColor=C_GRAY_800, alignment=TA_LEFT,
        leftIndent=18, bulletIndent=8, spaceAfter=2,
    )
    s["section"] = ParagraphStyle(
        "Section", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=11, leading=14,
        textColor=primary, leftIndent=6,
    )
    s["card_title"] = ParagraphStyle(
        "CardTitle", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=11, leading=14,
        textColor=primary,
    )
    s["card_label"] = ParagraphStyle(
        "CardLabel", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=8, leading=11,
        textColor=accent,
    )
    s["card_value"] = ParagraphStyle(
        "CardValue", parent=base["Normal"],
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=C_GRAY_800,
    )
    s["badge"] = ParagraphStyle(
        "Badge", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=8, leading=10,
        textColor=white, alignment=TA_CENTER,
    )
    s["small_note"] = ParagraphStyle(
        "Small", parent=base["Normal"],
        fontName="Helvetica-Oblique", fontSize=7.5, leading=10,
        textColor=C_GRAY_400, alignment=TA_CENTER, spaceAfter=4,
    )
    s["meta"] = ParagraphStyle(
        "Meta", parent=base["Normal"],
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=C_GRAY_600,
    )
    s["meta_bold"] = ParagraphStyle(
        "MetaBold", parent=s["meta"], fontName="Helvetica-Bold", textColor=primary,
    )
    return s


def make_header_footer(palette: dict):
    primary = HexColor(palette["primary"])
    accent = HexColor(palette["accent"])
    footer_tx = HexColor(palette["footer_tx"])

    def header_footer(canvas, doc):
        canvas.saveState()
        # Header band
        canvas.setFillColor(primary)
        canvas.rect(0, H - 28, W, 28, fill=1, stroke=0)
        canvas.setFillColor(white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(2 * cm, H - 19, "DEFENSORIA PÚBLICA DO ESTADO DA BAHIA")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(2 * cm, H - 26, f"7ª Regional — Camaçari  |  Preparação de Audiência — {palette['name']}")
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(W - 2 * cm, H - 19, "USO INTERNO")
        # Accent line
        canvas.setStrokeColor(accent)
        canvas.setLineWidth(1.5)
        canvas.line(0, H - 28, W, H - 28)
        # Footer
        canvas.setStrokeColor(accent)
        canvas.setLineWidth(0.5)
        canvas.line(2 * cm, 1.4 * cm, W - 2 * cm, 1.4 * cm)
        canvas.setFillColor(footer_tx)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(2 * cm, 0.85 * cm, "Defensoria Pública do Estado da Bahia — 7ª Regional — Camaçari")
        canvas.drawRightString(W - 2 * cm, 0.85 * cm, f"Página {doc.page}")
        canvas.restoreState()

    return header_footer


def section_heading(title: str, palette: dict, styles: dict):
    primary = HexColor(palette["primary"])
    light = HexColor(palette["light"])
    data = [[Paragraph(title, styles["section"])]]
    t = Table(data, colWidths=[USABLE])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light),
        ("LINEBEFORE", (0, 0), (0, -1), 3, primary),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def info_card(audiencia: dict, processo: str, palette: dict, styles: dict):
    primary = HexColor(palette["primary"])
    light = HexColor(palette["light"])

    rows = [
        [Paragraph("PROCESSO", styles["card_label"]),
         Paragraph(processo or "—", styles["card_value"])],
        [Paragraph("DATA / HORA", styles["card_label"]),
         Paragraph(fmt_data_pt(audiencia.get("data")), styles["card_value"])],
        [Paragraph("TIPO", styles["card_label"]),
         Paragraph(audiencia.get("tipo", "—"), styles["card_value"])],
        [Paragraph("LOCAL", styles["card_label"]),
         Paragraph(audiencia.get("local", "—"), styles["card_value"])],
    ]
    t = Table(rows, colWidths=[3.5 * cm, USABLE - 3.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor(palette["soft_bg"])),
        ("LINEBEFORE", (0, 0), (0, -1), 3, primary),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def depoente_card(idx: int, dep: dict, palette: dict, styles: dict):
    primary = HexColor(palette["primary"])
    accent = HexColor(palette["accent"])
    light = HexColor(palette["light"])

    nome = dep.get("nome", "—")
    tipo = (dep.get("tipo") or "COMUM").upper()
    badge_label = TIPO_LABEL.get(tipo, tipo.title())

    # Header line: number + name + badge
    badge_table = Table(
        [[Paragraph(badge_label, styles["badge"])]],
        colWidths=[5 * cm],
    )
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    head = Table(
        [[Paragraph(f"<b>{idx}. {nome}</b>", styles["card_title"]), badge_table]],
        colWidths=[USABLE - 5 * cm, 5 * cm],
    )
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    body_rows = []

    def add_field(label: str, value: str | None):
        if not value or not str(value).strip():
            return
        body_rows.append([
            Paragraph(label, styles["card_label"]),
            Paragraph(str(value).replace("\n", "<br/>"), styles["card_value"]),
        ])

    add_field("ENDEREÇO", dep.get("endereco"))
    add_field("RESUMO", dep.get("resumo"))
    add_field("PONTOS FAVORÁVEIS", dep.get("pontos_favoraveis"))
    add_field("PONTOS DESFAVORÁVEIS", dep.get("pontos_desfavoraveis"))
    add_field("PERGUNTAS SUGERIDAS", dep.get("perguntas_sugeridas"))
    add_field("OBSERVAÇÕES", dep.get("observacoes"))

    if not body_rows:
        body_rows.append([
            Paragraph("", styles["card_label"]),
            Paragraph("<i>Sem dados enriquecidos. Análise pendente.</i>", styles["card_value"]),
        ])

    body_table = Table(body_rows, colWidths=[3.5 * cm, USABLE - 3.5 * cm])
    body_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 0), (-1, -1), HexColor(palette["soft_bg"])),
    ]))

    wrapper = Table(
        [[head], [body_table]],
        colWidths=[USABLE],
    )
    wrapper.setStyle(TableStyle([
        ("LINEBEFORE", (0, 0), (0, -1), 3, primary),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, light),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, light),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return KeepTogether([wrapper, Spacer(1, 8)])


def build_pdf(input_data: dict, output_path: str) -> str:
    atribuicao = (input_data.get("atribuicao") or "SUBSTITUICAO").upper()
    palette = PALETTES.get(atribuicao, DEFAULT_PALETTE)
    styles = build_styles(palette)

    assistido = input_data.get("assistido", "—")
    processo = input_data.get("processo", "—")
    audiencia = input_data.get("audiencia") or {}
    resumo_caso = (input_data.get("resumo_caso") or "").strip()
    depoentes = input_data.get("depoentes") or []

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=2.2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
        title=f"Preparação de Audiência — {assistido}",
        author="OMBUDS / DPE-BA",
    )

    story = []
    story.append(Spacer(1, 8))
    story.append(Paragraph("PREPARAÇÃO DE AUDIÊNCIA", styles["title"]))
    story.append(Paragraph(f"<b>{assistido}</b>", styles["sub"]))
    story.append(HRFlowable(
        width="100%", thickness=0.6,
        color=HexColor(palette["accent"]),
        spaceBefore=4, spaceAfter=8,
    ))

    # Info card (processo / data / tipo / local)
    story.append(info_card(audiencia, processo, palette, styles))
    story.append(Spacer(1, 12))

    if resumo_caso:
        story.append(section_heading("Síntese do Caso", palette, styles))
        story.append(Spacer(1, 4))
        story.append(Paragraph(resumo_caso, styles["body_indent"]))
        story.append(Spacer(1, 10))

    story.append(section_heading(
        f"Depoentes — {len(depoentes)} pessoa(s) arrolada(s)",
        palette, styles,
    ))
    story.append(Spacer(1, 6))

    if not depoentes:
        story.append(Paragraph(
            "<i>Nenhum depoente extraído da análise. Rode a skill "
            "<b>preparar-audiencia</b> para popular este relatório.</i>",
            styles["body"],
        ))
    else:
        for i, dep in enumerate(depoentes, start=1):
            story.append(depoente_card(i, dep, palette, styles))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')} — OMBUDS / Defender",
        styles["small_note"],
    ))

    header_footer = make_header_footer(palette)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return output_path


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: preparacao_audiencia_pdf.py <input.json> <output.pdf>", file=sys.stderr)
        return 2
    in_path, out_path = sys.argv[1], sys.argv[2]
    with open(in_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = build_pdf(data, out_path)
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
