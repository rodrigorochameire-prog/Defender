// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DocumentosItem } from "@/components/agenda/sheet/documentos-item";

afterEach(() => cleanup());

const baseFile = {
  driveFileId: "abc123",
  name: "Denuncia.pdf",
  mimeType: "application/pdf",
  fileSize: 245000,
  lastModifiedTime: new Date("2026-03-15T10:00:00Z"),
  webViewLink: "https://drive.google.com/file/d/abc123/view",
};

describe("DocumentosItem", () => {
  it("mostra nome e data no estado fechado", () => {
    render(<DocumentosItem file={baseFile} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText("Denuncia.pdf")).toBeInTheDocument();
    expect(screen.getByText(/15\/mar|15\/03/)).toBeInTheDocument();
  });

  it("expande preview quando aberto", () => {
    render(<DocumentosItem file={baseFile} isOpen={true} onToggle={() => {}} />);
    expect(screen.getByTitle(/preview/i)).toBeInTheDocument();
  });

  it("chama onToggle no click do header", () => {
    const onToggle = vi.fn();
    render(<DocumentosItem file={baseFile} isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /denuncia/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("mostra link para webViewLink quando aberto", () => {
    render(<DocumentosItem file={baseFile} isOpen={true} onToggle={() => {}} />);
    const abrirLink = screen.getByRole("link", { name: /abrir no drive/i });
    expect(abrirLink).toHaveAttribute("href", baseFile.webViewLink);
    expect(abrirLink).toHaveAttribute("target", "_blank");
  });

  it("escolhe ícone apropriado por mimeType", () => {
    const { rerender, container } = render(<DocumentosItem file={baseFile} isOpen={false} onToggle={() => {}} />);
    expect(container.innerHTML).toContain("📄");
    rerender(<DocumentosItem file={{ ...baseFile, mimeType: "image/png" }} isOpen={false} onToggle={() => {}} />);
    expect(container.innerHTML).toContain("🖼");
  });
});
