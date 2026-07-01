// @vitest-environment happy-dom
// src/components/ui/__tests__/responsive-dialog.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

const isMobile = vi.fn();
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => isMobile() }));

afterEach(cleanup);
beforeEach(() => isMobile.mockReset());

function renderOpen() {
  return render(
    <ResponsiveDialog open onOpenChange={() => {}}>
      <ResponsiveDialogContent>
        <ResponsiveDialogTitle>Título</ResponsiveDialogTitle>
      </ResponsiveDialogContent>
    </ResponsiveDialog>,
  );
}

describe("ResponsiveDialog", () => {
  it("renders content on desktop", () => {
    isMobile.mockReturnValue(false);
    renderOpen();
    expect(screen.getByText("Título")).toBeInTheDocument();
  });
  it("renders content on mobile (as bottom sheet)", () => {
    isMobile.mockReturnValue(true);
    renderOpen();
    expect(screen.getByText("Título")).toBeInTheDocument();
  });
});
