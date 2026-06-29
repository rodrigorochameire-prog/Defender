// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroCard } from "../registro-card";

// Mock tRPC — registro-card calls trpc.useUtils() unconditionally
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      registros: { anexos: { list: { invalidate: vi.fn() } } },
    }),
  },
}));

// Mock AnexoDropzone (passthrough wrapper — no tRPC, but keep DOM clean)
vi.mock("../anexos/anexo-dropzone", () => ({
  AnexoDropzone: ({ children }: { children: any }) => <>{children}</>,
}));

// Mock AnexoList — uses tRPC internally; returns null in tests
vi.mock("../anexos/anexo-list", () => ({
  AnexoList: () => null,
}));

// Mock useAnexoUpload — depends on browser fetch & heavy libs
vi.mock("../anexos/use-anexo-upload", () => ({
  useAnexoUpload: () => ({ items: [], upload: vi.fn(), reset: vi.fn() }),
}));

// Stub ResizeObserver in case happy-dom version doesn't include it
beforeAll(() => {
  if (typeof ResizeObserver === "undefined") {
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
  }
});

afterEach(() => cleanup());

const base = {
  id: 1, tipo: "diligencia", status: "agendado", prazo: "2026-07-11",
  dataRegistro: "2026-06-29T12:00:00Z", titulo: "Resposta à Acusação",
  conteudo: "Defensoria nomeada. Confirmar termo inicial no PJe.",
  autor: { id: 1, name: "Rodrigo", email: "" },
};

describe("RegistroCard", () => {
  it("renders the tipo badge, title and a content preview", () => {
    render(<RegistroCard registro={base as any} />);
    expect(screen.getByText("Resposta à Acusação")).toBeInTheDocument();
    expect(screen.getByText(/Diligência/i)).toBeInTheDocument();
    expect(screen.getByText(/Defensoria nomeada/)).toBeInTheDocument();
  });
  it("shows a prazo badge when prazo is set", () => {
    render(<RegistroCard registro={base as any} showPrazo />);
    expect(screen.getByText(/11\/07/)).toBeInTheDocument();
  });
});
