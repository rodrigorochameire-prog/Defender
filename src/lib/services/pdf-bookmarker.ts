/**
 * PDF Bookmarker — pdf-lib
 *
 * Insere outline/bookmarks no PDF baseado nas seções classificadas.
 * Permite ao defensor navegar o PDF diretamente no leitor (Adobe, Chrome, etc.)
 */

import { PDFDocument } from "pdf-lib";

export interface BookmarkSection {
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo?: string;
}

export interface BookmarkResult {
  success: boolean;
  pdfBuffer: Buffer;
  bookmarksAdded: number;
  error?: string;
}

const TIPO_LABELS: Record<string, string> = {
  denuncia: "Denúncia",
  sentenca: "Sentença",
  decisao: "Decisão",
  depoimento: "Depoimento",
  alegacoes: "Alegações Finais",
  certidao: "Certidão",
  laudo: "Laudo Pericial",
  inquerito: "Inquérito Policial",
  recurso: "Recurso",
  pronuncia: "Pronúncia",
  resposta_acusacao: "Resposta à Acusação",
  habeas_corpus: "Habeas Corpus",
  diligencias_422: "Diligências (Art. 422 CPP)",
  interrogatorio: "Interrogatório",
  termo_inquerito: "Termo do Inquérito",
  ata_audiencia: "Ata de Audiência",
  alegacoes_mp: "Alegações Finais (MP)",
  alegacoes_defesa: "Alegações Finais (Defesa)",
  laudo_necroscopico: "Laudo Necroscópico",
  laudo_local: "Laudo de Local",
  outros: "Outros",
};

/**
 * Insere bookmarks (outline) no PDF a partir das seções classificadas.
 * Retorna o PDF modificado como Buffer.
 */
export async function addBookmarksToPdf(
  pdfBuffer: Buffer,
  sections: BookmarkSection[]
): Promise<BookmarkResult> {
  try {
    if (sections.length === 0) {
      return {
        success: true,
        pdfBuffer,
        bookmarksAdded: 0,
      };
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      updateMetadata: false,
    });

    const totalPages = pdfDoc.getPageCount();

    // Group sections by tipo for hierarchical outline
    const groupedByTipo = new Map<string, BookmarkSection[]>();
    for (const section of sections) {
      const group = groupedByTipo.get(section.tipo) || [];
      group.push(section);
      groupedByTipo.set(section.tipo, group);
    }

    // Build outline refs for each section
    // pdf-lib doesn't have a direct addOutline API, so we use the low-level
    // PDF dictionary approach to create the document outline.

    const context = pdfDoc.context;

    // Create individual outline item refs first
    const outlineItemRefs: Array<{
      ref: ReturnType<typeof context.nextRef>;
      title: string;
      pageIndex: number;
      children?: Array<{
        ref: ReturnType<typeof context.nextRef>;
        title: string;
        pageIndex: number;
      }>;
    }> = [];

    // Create top-level items grouped by tipo
    for (const [tipo, secs] of groupedByTipo) {
      const label = TIPO_LABELS[tipo] || tipo;

      if (secs.length === 1) {
        // Single section of this type — flat item
        const sec = secs[0];
        const pageIdx = Math.min(sec.paginaInicio - 1, totalPages - 1);
        outlineItemRefs.push({
          ref: context.nextRef(),
          title: sec.titulo || label,
          pageIndex: Math.max(0, pageIdx),
        });
      } else {
        // Multiple sections — parent + children
        const firstPageIdx = Math.min(
          Math.max(0, secs[0].paginaInicio - 1),
          totalPages - 1
        );
        const children = secs.map((sec) => ({
          ref: context.nextRef(),
          title: sec.titulo,
          pageIndex: Math.min(
            Math.max(0, sec.paginaInicio - 1),
            totalPages - 1
          ),
        }));
        outlineItemRefs.push({
          ref: context.nextRef(),
          title: `${label} (${secs.length})`,
          pageIndex: firstPageIdx,
          children,
        });
      }
    }

    if (outlineItemRefs.length === 0) {
      return { success: true, pdfBuffer, bookmarksAdded: 0 };
    }

    // Create the outline dictionary
    const outlineRef = context.nextRef();
    const pages = pdfDoc.getPages();

    // Build outline items as PDF dictionaries
    let bookmarksCount = 0;

    // Flatten all items for prev/next linking at the top level
    for (let i = 0; i < outlineItemRefs.length; i++) {
      const item = outlineItemRefs[i];
      const page = pages[item.pageIndex];
      const pageRef = pdfDoc.getPage(item.pageIndex).ref;
      const pageHeight = page.getHeight();

      const dict: Record<string, any> = {
        Title: context.obj(item.title),
        Parent: outlineRef,
        Dest: context.obj([
          pageRef,
          context.obj("XYZ"),
          context.obj(0),
          context.obj(pageHeight),
          context.obj(0),
        ]),
      };

      if (i > 0) {
        dict.Prev = outlineItemRefs[i - 1].ref;
      }
      if (i < outlineItemRefs.length - 1) {
        dict.Next = outlineItemRefs[i + 1].ref;
      }

      if (item.children && item.children.length > 0) {
        dict.First = item.children[0].ref;
        dict.Last = item.children[item.children.length - 1].ref;
        dict.Count = context.obj(-item.children.length); // negative = collapsed

        // Build children
        for (let j = 0; j < item.children.length; j++) {
          const child = item.children[j];
          const childPage = pages[child.pageIndex];
          const childPageRef = pdfDoc.getPage(child.pageIndex).ref;
          const childPageHeight = childPage.getHeight();

          const childDict: Record<string, any> = {
            Title: context.obj(child.title),
            Parent: item.ref,
            Dest: context.obj([
              childPageRef,
              context.obj("XYZ"),
              context.obj(0),
              context.obj(childPageHeight),
              context.obj(0),
            ]),
          };

          if (j > 0) {
            childDict.Prev = item.children[j - 1].ref;
          }
          if (j < item.children.length - 1) {
            childDict.Next = item.children[j + 1].ref;
          }

          context.assign(child.ref, context.obj(childDict));
          bookmarksCount++;
        }
      }

      context.assign(item.ref, context.obj(dict));
      bookmarksCount++;
    }

    // Create the outline root
    context.assign(
      outlineRef,
      context.obj({
        Type: "Outlines",
        First: outlineItemRefs[0].ref,
        Last: outlineItemRefs[outlineItemRefs.length - 1].ref,
        Count: context.obj(outlineItemRefs.length),
      })
    );

    // Set Outlines on the catalog
    const catalog = pdfDoc.catalog;
    catalog.set(context.obj("Outlines"), outlineRef);

    // Set PageMode to UseOutlines so the bookmark panel opens by default
    catalog.set(context.obj("PageMode"), context.obj("UseOutlines"));

    const modifiedPdf = await pdfDoc.save();

    return {
      success: true,
      pdfBuffer: Buffer.from(modifiedPdf),
      bookmarksAdded: bookmarksCount,
    };
  } catch (error) {
    console.error("[pdf-bookmarker] Error:", error);
    return {
      success: false,
      pdfBuffer,
      bookmarksAdded: 0,
      error: error instanceof Error ? error.message : "Unknown bookmarking error",
    };
  }
}
