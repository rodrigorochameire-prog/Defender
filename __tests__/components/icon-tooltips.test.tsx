// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Users } from "lucide-react";
import {
  AtribuicaoPills,
  ATRIBUICAO_PILL_ICONS,
  MUTIRAO_PROTEGE_ICON,
} from "@/components/demandas-premium/AtribuicaoPills";

// Polyfills mínimos p/ o Radix Tooltip rodar em happy-dom.
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

const OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Execução Penal", label: "Execução Penal" },
  { value: "Mutirão", label: "Mutirão" },
];

function renderPills(extra: Partial<Parameters<typeof AtribuicaoPills>[0]> = {}) {
  // AtribuicaoPills auto-provê o TooltipProvider no modo iconOnly.
  return render(
    <AtribuicaoPills
      variant="dark"
      iconOnly
      options={OPTIONS}
      selectedValues={[]}
      onToggle={vi.fn()}
      onClear={vi.fn()}
      {...extra}
    />,
  );
}

describe("F5 — tooltips universais em botões só-ícone (AtribuicaoPills)", () => {
  it("cada pill só-ícone expõe um nome acessível igual ao rótulo (reaproveita o label)", () => {
    renderPills();
    // O botão "Todas" e cada atribuição precisam de accessible name — sem isso
    // o ícone é mudo para leitor de tela e não tem tooltip visual reaproveitável.
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tribunal do Júri" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Execução Penal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mutirão" })).toBeInTheDocument();
  });

  it("focar uma pill só-ícone revela um tooltip visual (Radix) com o rótulo", async () => {
    renderPills();
    // Radix Tooltip abre por foco de forma confiável em happy-dom (hover depende
    // de PointerEvent). Sem o wrapper <Tooltip>, nenhum content surge no DOM.
    fireEvent.focus(screen.getByRole("button", { name: "Tribunal do Júri" }));
    await waitFor(() => {
      // O content é renderizado em portal quando aberto; pode haver cópia visível
      // + cópia acessível (sr-only). Basta existir ao menos uma ocorrência.
      expect(screen.getAllByText("Tribunal do Júri").length).toBeGreaterThan(1);
    });
  });
});

describe("F5 — sem glifo duplicado para conceitos distintos", () => {
  it("o ícone de Mutirão (grupo/atribuição) difere do Users genérico (pessoa/lista)", () => {
    // Users é o glifo genérico de pessoa/lista/testemunha usado em várias superfícies.
    // Mutirão é uma atribuição distinta — não pode colidir no mesmo glifo.
    expect(ATRIBUICAO_PILL_ICONS["Mutirão"]).toBeTruthy();
    expect(ATRIBUICAO_PILL_ICONS["Mutirão"]).not.toBe(Users);
    expect(MUTIRAO_PROTEGE_ICON).not.toBe(Users);
  });
});
