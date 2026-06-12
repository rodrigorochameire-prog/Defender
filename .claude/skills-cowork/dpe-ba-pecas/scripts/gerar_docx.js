// Gerador de peça DPE-BA (TEMPLATE) — header/footer institucional via biblioteca `docx`.
//
// Modelo genérico, sem dados de assistido. O corpo abaixo é um esqueleto editável:
// preencha o endereçamento, a epígrafe, a qualificação e as seções conforme o caso.
//
// Uso: node gerar_docx.js [caminho_de_saida.docx]
// A logo institucional é lida de ../assets/dpe_logo.png (relativa a este script).

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Header, Footer, BorderStyle, ImageRun
} = require("docx");

const logoData = fs.readFileSync(path.join(__dirname, "..", "assets", "dpe_logo.png"));
const OUTPUT_PATH = process.argv[2] || path.join(process.cwd(), "peca.docx");

const FONT = "Verdana";
const SIZE = 24; // 12pt

const bold = (t) => new TextRun({ text: t, bold: true, font: FONT, size: SIZE });
const normal = (t) => new TextRun({ text: t, font: FONT, size: SIZE });
const italic = (t) => new TextRun({ text: t, italics: true, font: FONT, size: SIZE });

// Standard body paragraph: justified, indented, 1.5 line spacing, spacing after 200
const para = (children, opts = {}) => new Paragraph({
  spacing: { after: 200, before: 0, line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  indent: { firstLine: opts.noIndent ? undefined : 720 },
  children: Array.isArray(children) ? children : [children],
});

// Section title: justified, bold, no indent, spacing before/after
const title = (text) => new Paragraph({
  spacing: { after: 300, before: 400, line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  children: [bold(text)],
});

// Empty line
const empty = () => new Paragraph({
  spacing: { line: 360 },
  alignment: AlignmentType.JUSTIFIED,
  indent: { firstLine: 720 },
  children: [],
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FONT, size: SIZE },
        paragraph: { spacing: { line: 360 } }
      }
    }
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 2835, right: 1134, bottom: 1134, left: 1701, header: 454, footer: 454 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new ImageRun({
                type: "png",
                data: logoData,
                transformation: { width: 190, height: 118 },
                altText: { title: "DPE-BA", description: "Logo Defensoria Publica da Bahia", name: "logo" },
              }),
            ],
          }),
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "000000", space: 1 } },
            spacing: { after: 0, before: 0, line: 240 },
            indent: { right: 363 },
            children: [
              new TextRun({ text: "Defensoria Pública do Estado da Bahia", font: "Arial Narrow", size: 16, color: "000000" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0, before: 0, line: 240 },
            indent: { right: 363 },
            children: [
              new TextRun({ text: "7ª Regional da DPE – Camaçari – Bahia.", font: "Arial Narrow", size: 16, color: "000000" }),
            ]
          }),
        ]
      })
    },
    children: [
      // ENDEREÇAMENTO - justified, bold, no indent, after 600
      new Paragraph({
        spacing: { after: 600, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          bold("AO JUÍZO DE DIREITO DA [VARA] DA COMARCA DE [COMARCA] – ESTADO DA BAHIA"),
        ],
      }),

      // EPÍGRAFE - justified, bold, no indent, after 600
      new Paragraph({
        spacing: { after: 600, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          bold("Autos nº [NÚMERO DO PROCESSO]"),
        ],
      }),

      // Linha em branco
      empty(),

      // QUALIFICAÇÃO + TIPO DA PEÇA (inline, mesmo parágrafo)
      para([
        bold("[NOME DO ASSISTIDO]"),
        normal(", [qualificação: nacionalidade, estado civil, profissão, RG, CPF, já qualificado nos autos], vem, perante Vossa Excelência, por intermédio da "),
        bold("DEFENSORIA PÚBLICA DO ESTADO DA BAHIA"),
        normal(", no exercício de sua missão constitucional (art. 134 da CF/88), respeitosamente apresentar o presente "),
        bold("[TIPO DA PEÇA]"),
        normal(" (fundamento legal), com fundamento nos fatos e razões de direito a seguir expostos."),
      ]),

      // Linha em branco
      empty(),

      // I - DOS FATOS
      title("I – DOS FATOS"),
      para([
        normal("[Descrever sucintamente os fatos relevantes do caso.]"),
      ]),

      // II - DO DIREITO
      title("II – DO DIREITO"),
      para([
        normal("[Desenvolver a fundamentação jurídica da tese defensiva, com citação de dispositivos legais e precedentes.]"),
      ]),

      // III - DOS PEDIDOS
      title("III – DOS PEDIDOS"),
      para([
        normal("[Formular os pedidos, em ordem principal e subsidiária.]"),
      ]),

      // FECHO
      para([
        normal("Nesses termos, pede deferimento."),
      ]),

      // === FINAL: CENTRALIZADO, SEM ESPAÇAMENTO EXTRA ===

      // DATA - centralizada
      new Paragraph({
        spacing: { after: 0, before: 400, line: 360 },
        alignment: AlignmentType.CENTER,
        children: [normal("Camaçari – BA, [DATA].")],
      }),

      // Linha em branco
      new Paragraph({
        spacing: { after: 0, line: 360 },
        alignment: AlignmentType.CENTER,
        children: [],
      }),

      // Nome - centralizado, bold, sem espaçamento
      new Paragraph({
        spacing: { after: 0, line: 276 },
        alignment: AlignmentType.CENTER,
        children: [bold("Rodrigo Rocha Meire")],
      }),

      // Cargo - centralizado, bold, sem espaçamento
      new Paragraph({
        spacing: { after: 0, line: 276 },
        alignment: AlignmentType.CENTER,
        children: [bold("Defensor Público")],
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log("OK: " + OUTPUT_PATH);
});
