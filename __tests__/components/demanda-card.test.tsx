// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// O card monta um modal de encaminhamento que depende de contexto tRPC.
// Fora do escopo deste teste (layout do nome) — stubamos para um no-op.
vi.mock("@/components/cowork/encaminhamentos/NovoEncaminhamentoModal", () => ({
  NovoEncaminhamentoModal: () => null,
}));

import { DemandaCard } from "@/components/demandas-premium/DemandaCard";

// Polyfills mínimos p/ Radix/menus rodarem em happy-dom (ver demanda-card-actions.test.tsx).
beforeAll(() => {
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
  (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
  (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = vi.fn();
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => cleanup());

const NOME_LONGO = "Joaquina Aparecida de Souza Albuquerque Cavalcanti dos Santos Filho";

function setup(over: Record<string, unknown> = {}) {
  const props = {
    demanda: {
      id: "demanda-1",
      assistido: NOME_LONGO,
      assistidoId: null,
      status: "Triagem",
      prazo: "",
      data: "01/06/2026",
      processos: [{ tipo: "AP", numero: "0000000-00.2026.8.05.0000" }],
      ato: "Resposta à Acusação",
      providencias: "",
      atribuicao: "Tribunal do Júri",
    },
    borderColor: "#22c55e",
    atribuicaoIcons: {},
    atribuicaoColors: { "Tribunal do Júri": "text-green-500" },
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
    copyToClipboard: vi.fn(),
    ...over,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<DemandaCard {...(props as any)} />);
}

describe("DemandaCard — nome do assistido (mobile)", () => {
  it("renderiza o nome do assistido como âncora de leitura (primeiro heading do header)", () => {
    setup();
    // O nome aparece (mobile + desktop). Pegamos os headings de nível 4 (mobile usa <h4>).
    const nomes = screen.getAllByRole("heading", { level: 4, name: NOME_LONGO });
    expect(nomes.length).toBeGreaterThan(0);
    const h4 = nomes[0];
    expect(h4).toHaveTextContent(NOME_LONGO);
    // Âncora de leitura: peso forte (font-bold).
    expect(h4.className).toContain("font-bold");
  });

  it("a linha de cabeçalho mobile que envolve o nome carrega flex-1 e min-w-0 (guard estrutural)", () => {
    const { container } = setup();
    // Header mobile vive dentro do bloco `block md:hidden`.
    const mobileBlock = container.querySelector(".block.md\\:hidden");
    expect(mobileBlock).not.toBeNull();

    const h4 = within(mobileBlock as HTMLElement).getByRole("heading", {
      level: 4,
      name: NOME_LONGO,
    });
    // A linha imediata que contém o nome (e os badges) precisa restringir o layout
    // em viewports estreitos — sem flex-1/min-w-0 o nome colapsa e renderiza vazio.
    const nameRow = h4.parentElement as HTMLElement;
    expect(nameRow.className).toContain("flex-1");
    expect(nameRow.className).toContain("min-w-0");
  });
});
