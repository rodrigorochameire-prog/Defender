#!/usr/bin/env python3
"""
PDF v3 Template — Biblioteca visual DPE-BA (paleta Navy/Steel Soft)
===================================================================
Template reutilizável para gerar PDFs de análises estratégicas.
Ao gerar uma nova análise, copie este arquivo, altere OUTPUT_DIR/OUTPUT_FILE
e preencha a função build_content() com o conteúdo da análise.

Uso: python gerar_pdf_v3_template.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib import colors
import os

# ════════════════════════════════════════════════════════════════
# PALETA v3 — NAVY/STEEL SOFT
# ════════════════════════════════════════════════════════════════
C_NAVY      = HexColor('#1D3461')
C_STEEL     = HexColor('#2E6DA4')
C_STEEL_LT  = HexColor('#D6E8F7')
C_OFF_WHITE = HexColor('#F8FAFB')
C_WHITE     = HexColor('#FFFFFF')
C_GRAY_800  = HexColor('#1F2937')
C_GRAY_600  = HexColor('#4B5563')
C_GRAY_400  = HexColor('#9CA3AF')
C_FOOTER    = HexColor('#4A6F8A')

# Alertas
C_RED_BG    = HexColor('#FEE2E2')
C_RED_TX    = HexColor('#7F1D1D')
C_RED_BD    = HexColor('#EF4444')
C_GREEN_BG  = HexColor('#D1FAE5')
C_GREEN_TX  = HexColor('#065F46')
C_GREEN_BD  = HexColor('#10B981')
C_AMBER_BG  = HexColor('#FEF9C3')
C_AMBER_TX  = HexColor('#713F12')
C_AMBER_BD  = HexColor('#F59E0B')
C_BLUE_BG   = HexColor('#DBEAFE')
C_BLUE_TX   = HexColor('#1E3A8A')
C_BLUE_BD   = HexColor('#3B82F6')
C_LAVANDA_BG = HexColor('#F3F0F8')

W, H = A4
USABLE = W - 4*cm

# ════════════════════════════════════════════════════════════════
# ESTILOS
# ════════════════════════════════════════════════════════════════
styles = getSampleStyleSheet()

styles.add(ParagraphStyle('DocTitle', parent=styles['Title'],
    fontName='Helvetica-Bold', fontSize=16, leading=20,
    textColor=C_NAVY, alignment=TA_CENTER, spaceAfter=4))

styles.add(ParagraphStyle('DocSub', parent=styles['Normal'],
    fontName='Helvetica-Oblique', fontSize=10, leading=13,
    textColor=C_FOOTER, alignment=TA_CENTER, spaceAfter=10))

styles.add(ParagraphStyle('Body', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, leading=13.5,
    textColor=C_GRAY_800, alignment=TA_JUSTIFY, spaceAfter=4,
    firstLineIndent=14))

styles.add(ParagraphStyle('BodyNoIndent', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, leading=13.5,
    textColor=C_GRAY_800, alignment=TA_JUSTIFY, spaceAfter=4))

styles.add(ParagraphStyle('BodyBold', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=9.5, leading=13.5,
    textColor=C_GRAY_800, alignment=TA_JUSTIFY, spaceAfter=4))

styles.add(ParagraphStyle('BulletV3', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, leading=13.5,
    textColor=C_GRAY_800, alignment=TA_LEFT,
    leftIndent=18, bulletIndent=8, spaceAfter=2))

styles.add(ParagraphStyle('Quote', parent=styles['Normal'],
    fontName='Helvetica-Oblique', fontSize=9.5, leading=13.5,
    textColor=C_NAVY, alignment=TA_JUSTIFY,
    leftIndent=18, rightIndent=18, spaceBefore=6, spaceAfter=6,
    borderWidth=0, borderPadding=8, backColor=C_STEEL_LT))

styles.add(ParagraphStyle('AlertRed', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9, leading=12.5,
    textColor=C_RED_TX, alignment=TA_JUSTIFY,
    leftIndent=10, rightIndent=10, spaceBefore=4, spaceAfter=4,
    borderWidth=0.5, borderColor=C_RED_BD, borderPadding=6, backColor=C_RED_BG))

styles.add(ParagraphStyle('AlertBlue', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9, leading=12.5,
    textColor=C_BLUE_TX, alignment=TA_JUSTIFY,
    leftIndent=10, rightIndent=10, spaceBefore=4, spaceAfter=4,
    borderWidth=0.5, borderColor=C_BLUE_BD, borderPadding=6, backColor=C_BLUE_BG))

styles.add(ParagraphStyle('AlertGreen', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9, leading=12.5,
    textColor=C_GREEN_TX, alignment=TA_JUSTIFY,
    leftIndent=10, rightIndent=10, spaceBefore=4, spaceAfter=4,
    borderWidth=0.5, borderColor=C_GREEN_BD, borderPadding=6, backColor=C_GREEN_BG))

styles.add(ParagraphStyle('AlertAmber', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9, leading=12.5,
    textColor=C_AMBER_TX, alignment=TA_JUSTIFY,
    leftIndent=10, rightIndent=10, spaceBefore=4, spaceAfter=4,
    borderWidth=0.5, borderColor=C_AMBER_BD, borderPadding=6, backColor=C_AMBER_BG))

styles.add(ParagraphStyle('SmallNote', parent=styles['Normal'],
    fontName='Helvetica-Oblique', fontSize=7.5, leading=10,
    textColor=C_GRAY_400, alignment=TA_CENTER, spaceAfter=4))

styles.add(ParagraphStyle('TblCell', parent=styles['Normal'],
    fontName='Helvetica', fontSize=8.5, leading=11, textColor=C_GRAY_800))

styles.add(ParagraphStyle('TblHead', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=white))

styles.add(ParagraphStyle('FraseEfeito', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=10, leading=14,
    textColor=C_NAVY, alignment=TA_CENTER,
    spaceBefore=6, spaceAfter=6, leftIndent=24, rightIndent=24))


# ════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════

def header_footer(canvas, doc):
    """Header navy + footer institucional DPE-BA"""
    canvas.saveState()
    # Header — faixa navy fina
    canvas.setFillColor(C_NAVY)
    canvas.rect(0, H - 28, W, 28, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.drawString(2*cm, H - 19, "DEFENSORIA PÚBLICA DO ESTADO DA BAHIA")
    canvas.setFont('Helvetica', 7)
    canvas.drawString(2*cm, H - 26, "7ª Regional — Camaçari  |  Uso Interno — Estratégia de Defesa")
    canvas.setFont('Helvetica', 7)
    canvas.drawRightString(W - 2*cm, H - 19, "CONFIDENCIAL")
    # Linha accent steel abaixo do header
    canvas.setStrokeColor(C_STEEL)
    canvas.setLineWidth(1.5)
    canvas.line(0, H - 28, W, H - 28)
    # Footer
    canvas.setStrokeColor(HexColor('#8FA8C8'))
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.4*cm, W - 2*cm, 1.4*cm)
    canvas.setFillColor(C_FOOTER)
    canvas.setFont('Helvetica', 7)
    canvas.drawString(2*cm, 0.85*cm, "Defensoria Pública do Estado da Bahia — 7ª Regional — Camaçari")
    canvas.drawRightString(W - 2*cm, 0.85*cm, f"Página {doc.page}")
    canvas.restoreState()


def section_heading(title):
    """Faixa soft com borda lateral navy — equivalente ao add_heading() v3"""
    data = [[Paragraph(title, ParagraphStyle('_sh', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=14,
        textColor=C_NAVY, leftIndent=6))]]
    t = Table(data, colWidths=[USABLE])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_STEEL_LT),
        ('LINEBEFOREDECOR', (0,0), (0,-1), 3, C_NAVY),
        ('LINEBEFORE', (0,0), (0,-1), 3, C_NAVY),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
    ]))
    return t


def subsection_heading(title):
    return Paragraph(f"<b>{title}</b>", ParagraphStyle('_ssh', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=10.5, leading=14,
        textColor=C_NAVY, spaceBefore=10, spaceAfter=4))


def subsubsection(title):
    return Paragraph(f"<b>{title}</b>", ParagraphStyle('_sssh', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9.5, leading=13,
        textColor=C_GRAY_600, spaceBefore=6, spaceAfter=3))


def body(text):
    return Paragraph(text, styles['Body'])

def body_ni(text):
    return Paragraph(text, styles['BodyNoIndent'])

def body_bold(text):
    return Paragraph(text, styles['BodyBold'])

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", styles['BulletV3'])

def quote_box(text):
    return Paragraph(text, styles['Quote'])

def alert_red(text):
    return Paragraph(text, styles['AlertRed'])

def alert_blue(text):
    return Paragraph(text, styles['AlertBlue'])

def alert_green(text):
    return Paragraph(text, styles['AlertGreen'])

def alert_amber(text):
    return Paragraph(text, styles['AlertAmber'])

def frase(text):
    return Paragraph(text, styles['FraseEfeito'])

def sp(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=HexColor('#8FA8C8'), spaceBefore=4, spaceAfter=4)


def make_table(headers, rows, col_widths=None):
    """Tabela padrão v3: header navy, linhas alternadas, grid cinza"""
    header_paras = [Paragraph(h, styles['TblHead']) for h in headers]
    data = [header_paras]
    for row in rows:
        data.append([Paragraph(str(c), styles['TblCell']) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_NAVY),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, C_OFF_WHITE]),
        ('GRID', (0,0), (-1,-1), 0.4, HexColor('#D1D5DB')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    return t


def build_pdf(output_path, title, subtitle, content_elements):
    """
    Gera o PDF completo.

    Args:
        output_path: caminho do arquivo PDF de saída
        title: título principal do documento
        subtitle: subtítulo (ex: "Processo nº ...")
        content_elements: lista de flowables (seções, parágrafos, tabelas)
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        topMargin=2.2*cm, bottomMargin=2*cm,
        leftMargin=2*cm, rightMargin=2*cm
    )
    story = []
    story.append(sp(8))
    story.append(Paragraph(title, styles['DocTitle']))
    story.append(Paragraph(subtitle, styles['DocSub']))
    story.append(hr())
    story.append(sp(4))
    story.extend(content_elements)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return output_path


# ════════════════════════════════════════════════════════════════
# EXEMPLO DE USO
# ════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    # Exemplo: gerar PDF de teste para verificar visual
    elements = [
        section_heading("1. Seção de Exemplo"),
        sp(4),
        body("Este é um parágrafo de corpo normal com texto justificado e indentação na primeira linha."),
        bullet("Primeiro item de lista"),
        bullet("Segundo item de lista"),
        sp(4),
        alert_red("<b>⚠ ALERTA:</b> Exemplo de alerta vermelho para riscos processuais."),
        alert_blue("<b>ℹ INFO:</b> Exemplo de alerta azul para informações relevantes."),
        alert_green("<b>✔ PONTO FORTE:</b> Exemplo de alerta verde para pontos favoráveis."),
        sp(4),
        quote_box(""Exemplo de citação de depoimento com formatação em itálico e fundo azul claro." [00:03:20]"),
        sp(4),
        section_heading("2. Tabela de Exemplo"),
        sp(4),
        make_table(
            ["Testemunha", "Delegacia", "Juízo", "Contradição"],
            [
                ["Fulano", "Versão A", "Versão B", "Divergência no horário"],
                ["Ciclano", "Versão C", "Versão D", "Divergência no local"],
            ],
            col_widths=[3*cm, 4*cm, 4*cm, 4*cm]
        ),
    ]
    output = build_pdf(
        "/tmp/teste_v3.pdf",
        "ANÁLISE ESTRATÉGICA — TESTE",
        "Verificação visual da paleta Navy/Steel v3",
        elements
    )
    print(f"PDF gerado: {output}")
