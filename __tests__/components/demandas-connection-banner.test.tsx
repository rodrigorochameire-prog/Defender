// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DemandasConnectionBanner } from "@/components/demandas-premium/DemandasConnectionBanner";

afterEach(() => cleanup());

describe("DemandasConnectionBanner", () => {
  it("offline: avisa que está exibindo dados salvos localmente", () => {
    render(<DemandasConnectionBanner isOffline />);
    expect(screen.getByRole("status")).toHaveTextContent(/salvas localmente/);
  });

  it("cache (online): avisa que está exibindo cache", () => {
    render(<DemandasConnectionBanner isFromCache />);
    expect(screen.getByRole("status")).toHaveTextContent(/em cache/);
  });

  it("offline tem prioridade sobre cache", () => {
    render(<DemandasConnectionBanner isOffline isFromCache />);
    expect(screen.getByRole("status")).toHaveTextContent(/salvas localmente/);
    expect(screen.queryByText(/em cache/)).not.toBeInTheDocument();
  });

  it("conectado e com dados frescos: não renderiza nada", () => {
    const { container } = render(<DemandasConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
