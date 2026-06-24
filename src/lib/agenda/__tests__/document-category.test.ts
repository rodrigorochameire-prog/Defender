import { describe, it, expect } from "vitest";
import { categorizeDocument, CATEGORY_ORDER, CATEGORY_LABEL, agruparPorCategoria } from "../document-category";

describe("agruparPorCategoria", () => {
  it("agrupa por categoria na ordem canônica, só grupos não-vazios", () => {
    const grupos = agruparPorCategoria([
      { name: "Laudo necroscópico.pdf" },
      { name: "Apelacao.pdf" },
      { name: "Termo de oitiva.pdf" },
      { name: "arquivo qualquer.pdf" },
    ]);
    // ordem: acao-penal < laudo < termo < outros (conforme CATEGORY_ORDER)
    expect(grupos.map((g) => g.category)).toEqual(["acao-penal", "laudo", "termo", "outros"]);
    expect(grupos[0].label).toBe(CATEGORY_LABEL["acao-penal"]);
  });

  it("preserva a ordem de entrada dentro do grupo", () => {
    const grupos = agruparPorCategoria([
      { name: "Laudo A.pdf" },
      { name: "Laudo B.pdf" },
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].files.map((f) => f.name)).toEqual(["Laudo A.pdf", "Laudo B.pdf"]);
  });

  it("usa mimeType para imagem/mídia", () => {
    const grupos = agruparPorCategoria([
      { name: "foto.jpg", mimeType: "image/jpeg" },
      { name: "audio.mp3", mimeType: "audio/mpeg" },
    ]);
    expect(grupos.map((g) => g.category).sort()).toEqual(["imagem", "midia"]);
  });

  it("lista vazia → sem grupos", () => {
    expect(agruparPorCategoria([])).toEqual([]);
  });
});

type F = { driveFileId: string; name: string; mimeType?: string | null };

describe("categorizeDocument", () => {
  it("image PNG → imagem (mime vence nome)", () => {
    const f: F = { driveFileId: "1", name: "IP 8005196.png", mimeType: "image/png" };
    expect(categorizeDocument(f)).toBe("imagem");
  });

  it("audio m4a → midia", () => {
    const f: F = { driveFileId: "1", name: "Silvonei.m4a", mimeType: "audio/mp4" };
    expect(categorizeDocument(f)).toBe("midia");
  });

  it("video mp4 → midia", () => {
    const f: F = { driveFileId: "1", name: "plenario.mp4", mimeType: "video/mp4" };
    expect(categorizeDocument(f)).toBe("midia");
  });

  it("IP no início → inquerito", () => {
    const f: F = { driveFileId: "1", name: "IP 8005196-03.2025.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("inquerito");
  });

  it("inquerito explícito → inquerito", () => {
    const f: F = { driveFileId: "1", name: "Inquerito Policial.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("inquerito");
  });

  it("AP no início → acao-penal", () => {
    const f: F = { driveFileId: "1", name: "AP 8013165-06.2024.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("acao-penal");
  });

  it("apelacao → acao-penal", () => {
    const f: F = { driveFileId: "1", name: "Apelacao criminal.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("acao-penal");
  });

  it("laudo balístico → laudo", () => {
    const f: F = { driveFileId: "1", name: "Laudo Balistico 001.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("laudo");
  });

  it("Termo_Joao → termo", () => {
    const f: F = { driveFileId: "1", name: "Termo_Joao_Silva.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("termo");
  });

  it("Oitiva_Maria → termo", () => {
    const f: F = { driveFileId: "1", name: "Oitiva_Maria.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("termo");
  });

  it("Relatorio_VVD → relatorio", () => {
    const f: F = { driveFileId: "1", name: "Relatorio_VVD_Higor.md", mimeType: "text/markdown" };
    expect(categorizeDocument(f)).toBe("relatorio");
  });

  it("nome sem categoria clara → outros", () => {
    const f: F = { driveFileId: "1", name: "Documento_generico.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("outros");
  });

  it("'ip' dentro de palavra NÃO casa inquérito (ex: recipe)", () => {
    const f: F = { driveFileId: "1", name: "recipe.pdf", mimeType: "application/pdf" };
    expect(categorizeDocument(f)).toBe("outros");
  });

  it("CATEGORY_ORDER cobre as 8 categorias", () => {
    expect(CATEGORY_ORDER).toEqual([
      "inquerito",
      "acao-penal",
      "laudo",
      "termo",
      "relatorio",
      "midia",
      "imagem",
      "outros",
    ]);
  });

  it("CATEGORY_LABEL tem label em pt-BR para cada categoria", () => {
    CATEGORY_ORDER.forEach((k) => {
      expect(CATEGORY_LABEL[k]).toMatch(/[A-Za-zÀ-ú]/);
    });
  });
});
