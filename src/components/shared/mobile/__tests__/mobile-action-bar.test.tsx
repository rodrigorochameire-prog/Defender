// @vitest-environment happy-dom
// src/components/shared/mobile/__tests__/mobile-action-bar.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MobileActionBar } from "@/components/shared/mobile/mobile-action-bar";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

describe("MobileActionBar", () => {
  it("renders nothing on desktop", () => {
    isMobile.mockReturnValue(false);
    const { container } = render(<MobileActionBar><button>Salvar</button></MobileActionBar>);
    expect(container.firstChild).toBeNull();
  });
  it("renders children on mobile", () => {
    isMobile.mockReturnValue(true);
    render(<MobileActionBar><button>Salvar</button></MobileActionBar>);
    expect(screen.getByText("Salvar")).toBeInTheDocument();
  });
});
