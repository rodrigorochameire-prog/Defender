import { describe, it, expect } from "vitest";
import { categorizeDocument, CATEGORY_ORDER, CATEGORY_LABEL } from "../document-category";

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
