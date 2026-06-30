// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RegistrosPanel } from "../registros-panel";
import { dayLabel } from "../registros-sections";

// ── tRPC mock ─────────────────────────────────────────────────────────────
// RegistrosPanel issues TWO registros.list.useQuery calls (filtered list +
// unfiltered counts) plus update/delete mutations and useUtils. RegistroCard
// (rendered per item) also calls trpc.useUtils(). We back the query by a
// mutable `listData` fixture so both calls resolve to the same deterministic
// array (no filter active by default → both return the full list).
let listData: any[] = [];

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    registros: {
      list: {
        useQuery: () => ({ data: listData, refetch: vi.fn() }),
      },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      anexos: { list: { invalidate: vi.fn() } },
    },
    useUtils: () => ({
      registros: {
        list: { invalidate: vi.fn() },
        anexos: { list: { invalidate: vi.fn() } },
      },
    }),
  },
}));

// Keep RegistroCard's anexo deps inert (same pattern as registro-card.test).
vi.mock("../anexos/anexo-dropzone", () => ({
  AnexoDropzone: ({ children }: { children: any }) => <>{children}</>,
}));
vi.mock("../anexos/anexo-list", () => ({ AnexoList: () => null }));
vi.mock("../anexos/use-anexo-upload", () => ({
  useAnexoUpload: () => ({ items: [], upload: vi.fn(), reset: vi.fn() }),
}));

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

afterEach(() => {
  cleanup();
  listData = [];
});

const diligencia = {
  id: 1,
  tipo: "diligencia",
  status: "agendado",
  prazo: "2026-07-11",
  dataRegistro: "2026-06-29T12:00:00Z",
  titulo: "Confirmar termo inicial",
  conteudo: "Verificar prazo no PJe.",
  autor: { id: 1, name: "Rodrigo", email: "" },
};
const ciencia = {
  id: 2,
  tipo: "ciencia",
  status: null,
  prazo: null,
  dataRegistro: "2026-06-20T09:00:00Z",
  titulo: "Intimação de sentença",
  conteudo: "Sentença condenatória publicada.",
  autor: { id: 1, name: "Rodrigo", email: "" },
};

describe("RegistrosPanel", () => {
  it("splits into pinned Pendências and dated Histórico, shows the composer", () => {
    listData = [diligencia, ciencia];
    render(<RegistrosPanel scope={{ assistidoId: 42 }} />);

    // Pendências section header + the open diligência under it.
    const pendHeader = screen.getByText(/PEND[ÊE]NCIAS/i);
    expect(pendHeader).toBeInTheDocument();
    expect(screen.getByText("Confirmar termo inicial")).toBeInTheDocument();

    // Histórico day label for the ciência's day + its title.
    const cienciaDay = dayLabel("2026-06-20");
    expect(screen.getByText(cienciaDay)).toBeInTheDocument();
    expect(screen.getByText("Intimação de sentença")).toBeInTheDocument();

    // Composer add-bar present (scope has assistidoId).
    expect(
      screen.getByLabelText(/Adicionar registro/i),
    ).toBeInTheDocument();
  });

  it("shows the empty hint and quick-action button when there are no registros", () => {
    listData = [];
    const agendarAudiencia = vi.fn();
    render(
      <RegistrosPanel
        scope={{ assistidoId: 42 }}
        emptyHint="Nada por aqui ainda."
        quickActions={{ agendarAudiencia }}
      />,
    );

    expect(screen.getByText("Nada por aqui ainda.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Agendar audi[êe]ncia/i }),
    ).toBeInTheDocument();
  });

  it("shows the filtered-empty message when a text search matches nothing", () => {
    listData = [diligencia];
    render(<RegistrosPanel scope={{ assistidoId: 42 }} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    fireEvent.change(screen.getByLabelText(/buscar registros/i), {
      target: { value: "zzz-no-match" },
    });
    expect(
      screen.getByText(/Nenhum registro com esse filtro/i),
    ).toBeInTheDocument();
  });
});
