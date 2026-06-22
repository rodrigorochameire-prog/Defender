// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DocumentosBlock } from "@/components/agenda/sheet/documentos-block";

afterEach(() => cleanup());

const autosFiles = [
  { driveFileId: "a1", name: "Denuncia.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-15") },
  { driveFileId: "a2", name: "Laudo.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-20") },
];
const assistidoFiles = [
  { driveFileId: "b1", name: "Procuracao.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-10") },
];

// autosDoProcesso agora retorna grupos { desteProcesso, correlacionados, outros }.
const autosGrupos = {
  desteProcesso: autosFiles,
  correlacionados: [] as { cnj: string; classe?: string | null; files: typeof autosFiles }[],
  outros: [] as typeof autosFiles,
};

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      autosDoProcesso: { useQuery: vi.fn(() => ({ data: autosGrupos, isLoading: false })) },
      filesByAssistido: { useQuery: vi.fn(() => ({ data: assistidoFiles, isLoading: false })) },
      sectionsByProcesso: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDriveStatusForProcesso: { useQuery: vi.fn(() => ({ data: { linked: true, folderId: "folderP" }, isLoading: false })) },
      getDriveStatusForAssistido: { useQuery: vi.fn(() => ({ data: { linked: true, folderId: "folderA" }, isLoading: false })) },
      uploadWithLink: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    documentSections: {
      triggerClassification: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    useUtils: () => ({
      drive: {
        autosDoProcesso: { invalidate: vi.fn() },
        filesByAssistido: { invalidate: vi.fn() },
        sectionsByProcesso: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("DocumentosBlock", () => {
  it("renderiza tab Autos ativa por default com contador", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    const tabAutos = screen.getByRole("tab", { name: /autos/i });
    expect(tabAutos).toHaveAttribute("aria-selected", "true");
    // Assertion: autos tab shows count 2, assistido tab shows 1
    expect(tabAutos.textContent).toContain("2");
  });

  it("troca pra tab Assistido ao clicar", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    fireEvent.click(screen.getByRole("tab", { name: /assistido/i }));
    expect(screen.getByText("Procuracao.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Denuncia.pdf")).toBeNull();
  });

  it("só 1 item aberto por vez (accordion)", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    fireEvent.click(screen.getByRole("button", { name: /denuncia/i }));
    expect(screen.getAllByTitle(/preview/i)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /laudo/i }));
    expect(screen.getAllByTitle(/preview/i)).toHaveLength(1);
  });

  it("mostra DropZone quando Drive conectado", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    expect(screen.getByTestId("drop-zone")).toBeInTheDocument();
  });
});
