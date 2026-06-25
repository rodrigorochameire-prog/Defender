// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VarrerTriagemButton } from "@/components/shared/varrer-triagem-button";

afterEach(() => cleanup());

const mutateMock = vi.fn();
let pending = false;

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    analise: {
      enqueueVarredura: {
        useMutation: () => ({ mutate: mutateMock, isPending: pending }),
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

describe("VarrerTriagemButton", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    pending = false;
  });

  it("renders the sweep button", () => {
    render(<VarrerTriagemButton />);
    expect(screen.getByRole("button", { name: /varrer triagem/i })).toBeInTheDocument();
  });

  it("enqueues a sweep for the given attribution on click", () => {
    render(<VarrerTriagemButton atribuicao="VVD_CAMACARI" />);
    fireEvent.click(screen.getByRole("button", { name: /varrer triagem/i }));
    expect(mutateMock).toHaveBeenCalledWith({ atribuicao: "VVD_CAMACARI" });
  });

  it("enqueues a global sweep (no attribution) when none is given", () => {
    render(<VarrerTriagemButton />);
    fireEvent.click(screen.getByRole("button", { name: /varrer triagem/i }));
    expect(mutateMock).toHaveBeenCalledWith({});
  });

  it("disables while a sweep is being enqueued", () => {
    pending = true;
    render(<VarrerTriagemButton />);
    expect(screen.getByRole("button", { name: /varrer/i })).toBeDisabled();
  });
});
