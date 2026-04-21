// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CronologiaTab } from "@/app/(dashboard)/admin/processos/[id]/_components/cronologia-tab";

afterEach(() => cleanup());

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    cronologia: {
      getCronologiaCompleta: {
        useQuery: () => ({
          data: {
            marcos: [{ id: 1, tipo: "fato", data: "2025-01-15", documentoReferencia: null }],
            prisoes: [],
            cautelares: [],
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      createMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteMarco: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      createPrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updatePrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deletePrisao: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      createCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteCautelar: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("CronologiaTab", () => {
  it("renderiza 3 seções com counts corretos", () => {
    render(<CronologiaTab processoId={1} />);
    expect(screen.getByText(/Marcos \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Prisões \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cautelares \(0\)/)).toBeInTheDocument();
  });
});
