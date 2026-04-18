// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BannerInteligencia } from "@/components/pessoas/banner-inteligencia";

afterEach(() => cleanup());
beforeEach(() => localStorage.clear());

const mkSignal = (overrides: any) => ({
  pessoaId: 1, totalCasos: 0, casosRecentes6m: 0, casosRecentes12m: 0,
  papeisCount: {}, papelPrimario: "testemunha", ladoAcusacao: 0, ladoDefesa: 0,
  lastSeenAt: null, firstSeenAt: null, sameComarcaCount: 0, ambiguityFlag: false,
  contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
  ...overrides,
});

const nomeMap = new Map([[1, "Maria"], [2, "João"], [3, "PM Souza"]]);

describe("BannerInteligencia", () => {
  it("não renderiza quando sem sinais que passem threshold", () => {
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 1 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza collapsed quando há sinais de alto valor", () => {
    render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(screen.getByText(/inteligência detectada/i)).toBeInTheDocument();
  });

  it("expande ao clicar em ▾", () => {
    render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /expandir|ver/i }));
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("dispensa e grava em localStorage", () => {
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /dispensar|fechar/i }));
    expect(container.firstChild).toBeNull();
    expect(localStorage.getItem("banner-inteligencia-dismissed-processo-100")).toBeTruthy();
  });

  it("respeita dismiss do localStorage (não renderiza)", () => {
    localStorage.setItem(
      "banner-inteligencia-dismissed-processo-100",
      String(Date.now() + 10 * 86400000),
    );
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
