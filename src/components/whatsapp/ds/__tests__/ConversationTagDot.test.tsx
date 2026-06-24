// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ConversationTagDot } from "../ConversationTagDot";

afterEach(() => cleanup());

describe("ConversationTagDot", () => {
  it("expõe o rótulo da tag como nome acessível", () => {
    render(<ConversationTagDot tag="urgente" />);
    expect(screen.getByRole("img", { name: "Urgente" })).toBeInTheDocument();
  });

  it("usa a cor semântica da tag no dot", () => {
    render(<ConversationTagDot tag="urgente" />);
    expect(screen.getByRole("img", { name: "Urgente" }).className).toMatch(/bg-red-500/);
  });

  it("não renderiza texto visível (apenas dot)", () => {
    render(<ConversationTagDot tag="juri" />);
    expect(screen.queryByText("Júri")).not.toBeInTheDocument();
  });
});
