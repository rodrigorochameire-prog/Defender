// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RunsList } from "./RunsList";

afterEach(() => cleanup());

describe("RunsList", () => {
  it("mostra skill amigável, quem, contadores", () => {
    render(
      <RunsList
        runs={[
          {
            id: 1352,
            skill: "varredura-triagem",
            status: "completed",
            quem: "Rodrigo",
            completedAt: new Date().toISOString(),
            resultado: { parsed: { total: 5, ok: 3 } },
          } as any,
        ]}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText(/Varredura/i)).toBeInTheDocument();
    expect(screen.getByText("Rodrigo")).toBeInTheDocument();
  });
});
