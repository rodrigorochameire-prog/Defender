import { describe, it, expect } from "vitest";
import { mimeToTipo, buildStoragePath, needsHeicConversion, needsCompression, ACCEPTED_MIME, MAX_BYTES } from "../anexo-utils";

describe("mimeToTipo", () => {
  it("imagem para mimes image/*", () => {
    expect(mimeToTipo("image/jpeg")).toBe("imagem");
    expect(mimeToTipo("image/png")).toBe("imagem");
  });
  it("documento para pdf/word", () => {
    expect(mimeToTipo("application/pdf")).toBe("documento");
    expect(mimeToTipo("application/msword")).toBe("documento");
  });
});

describe("buildStoragePath", () => {
  it("gera registros/{id}/{uuid}-{slug}.{ext}", () => {
    const p = buildStoragePath(42, "Foto do Local!.JPG", () => "u123");
    expect(p).toBe("registros/42/u123-foto-do-local.jpg");
  });
  it("usa extensão do mime quando o nome não tem", () => {
    const p = buildStoragePath(7, "scan", () => "abc", "application/pdf");
    expect(p).toBe("registros/7/abc-scan.pdf");
  });
});

describe("needsHeicConversion", () => {
  it("true para heic/heif", () => {
    expect(needsHeicConversion("image/heic")).toBe(true);
    expect(needsHeicConversion("image/heif")).toBe(true);
  });
  it("false para jpeg", () => {
    expect(needsHeicConversion("image/jpeg")).toBe(false);
  });
});

describe("needsCompression", () => {
  it("comprime imagem acima de 1.5MB", () => {
    expect(needsCompression("image/jpeg", 2_000_000)).toBe(true);
    expect(needsCompression("image/jpeg", 500_000)).toBe(false);
  });
  it("nunca comprime documento", () => {
    expect(needsCompression("application/pdf", 9_000_000)).toBe(false);
  });
});

describe("ACCEPTED_MIME / MAX_BYTES", () => {
  it("define limites", () => {
    expect(ACCEPTED_MIME).toContain("application/pdf");
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
