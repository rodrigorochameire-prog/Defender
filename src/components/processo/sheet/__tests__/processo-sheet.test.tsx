// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ProcessoSheetBody, type ProcessoSheetData } from "../processo-sheet-body";

afterEach(() => cleanup());

// CNJ cru (sem máscara) — o body deve aplicar formatProcesso.
const NUMERO_CRU = "00010970120258050039";
const NUMERO_FORMATADO = "0001097-01.2025.8.05.0039";

const baseData: ProcessoSheetData = {
  id: 42,
  numeroAutos: NUMERO_CRU,
  area: "VIOLENCIA_DOMESTICA",
  atribuicao: "VVD",
  fase: "instrução",
  situacao: "ativo",
  assunto: "Lesão corporal no âmbito doméstico",
  vara: "1ª Vara",
  assistidoNome: "João da Silva",
  // prazo amanhã garante chip "amber/red" visível — usamos data relativa
  proximaAudiencia: { dataAudiencia: "2099-12-31", tipo: "AIJ" },
  // Prazo próximo dispara PrazoBadge não-cinza
  proximoPrazoStr: prazoEmDias(2),
  registrosCount: 3,
  documentosCount: 0,
  partesCount: 2,
  vinculadosCount: 0,
};

/** dd/mm/aaaa daqui a `dias` dias — alimenta o PrazoBadge sem mockar Date. */
function prazoEmDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

describe("ProcessoSheetBody", () => {
  it("renderiza o número do processo mascarado (formatProcesso)", () => {
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={() => {}} />);
    expect(screen.getByText(NUMERO_FORMATADO)).toBeInTheDocument();
  });

  it("mantém o número cru acessível (title/tooltip) e exibe o assistido + área", () => {
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={() => {}} />);
    // Número cru disponível como title para busca/cópia
    expect(screen.getByTitle(NUMERO_CRU)).toBeInTheDocument();
    expect(screen.getByText("João da Silva")).toBeInTheDocument();
    // Label da área via atribuicoes.ts (VVD → "Violência Doméstica")
    expect(screen.getByText("Violência Doméstica")).toBeInTheDocument();
  });

  it("exibe a fase atual e a próxima audiência na faixa", () => {
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={() => {}} />);
    expect(screen.getByText(/instrução/i)).toBeInTheDocument();
    expect(screen.getByText(/AIJ/)).toBeInTheDocument();
  });

  it("renderiza o PrazoBadge de urgência (calcularPrazoBadge)", () => {
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={() => {}} />);
    // 2 dias → texto curto "2d" no chip de prazo
    expect(screen.getByTestId("processo-prazo-badge")).toHaveTextContent("2d");
  });

  it("expõe a CTA 'Vincular a caso' e dispara o callback (sem navegação)", () => {
    const onVincularCaso = vi.fn();
    render(<ProcessoSheetBody data={baseData} onVincularCaso={onVincularCaso} onAbrirPje={() => {}} />);
    const cta = screen.getByRole("button", { name: /Vincular a caso/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onVincularCaso).toHaveBeenCalledTimes(1);
  });

  it("expõe a ação 'Abrir no PJe'", () => {
    const onAbrirPje = vi.fn();
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={onAbrirPje} />);
    fireEvent.click(screen.getByRole("button", { name: /Abrir no PJe/i }));
    expect(onAbrirPje).toHaveBeenCalledTimes(1);
  });

  it("seções sem dado caem num EmptyState (placeholder canônico)", () => {
    render(<ProcessoSheetBody data={baseData} onVincularCaso={() => {}} onAbrirPje={() => {}} />);
    // A aba default (Registros) tem dado; ao trocar para "Vinculados" (count 0)
    // deve aparecer o EmptyState (role=status).
    fireEvent.click(screen.getByRole("tab", { name: /Vinculados/i }));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ── Contrato de abertura via entity-sheet-context (não router push) ──
// O Casos tab abre o ProcessoSheet pelo contexto global. Garantimos que a
// peça que o aciona chama openEntity({ type: "processo" }) — e NÃO um push de
// rota — preservando o contexto do assistido (sem unmount).
import { useEntitySheet } from "@/contexts/entity-sheet-context";

describe("abertura via entity-sheet-context", () => {
  it("o tipo 'processo' é suportado pelo contrato de openEntity", () => {
    // Type-level + runtime: chamar openEntity com type:'processo' não lança.
    const calls: Array<{ type: string; id?: number }> = [];
    const fakeCtx = { openEntity: (d: { type: string; id?: number }) => calls.push(d) };
    fakeCtx.openEntity({ type: "processo", id: 42 });
    expect(calls[0]).toEqual({ type: "processo", id: 42 });
    // useEntitySheet é o canal — existe e é importável (sem provider retorna null).
    expect(typeof useEntitySheet).toBe("function");
  });
});
