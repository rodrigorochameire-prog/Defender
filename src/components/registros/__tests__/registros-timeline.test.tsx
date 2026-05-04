// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroTipoChip } from "../registro-tipo-chip";
import {
  REGISTRO_TIPOS,
  TIPO_KEYS,
  type TipoRegistro,
} from "../registro-tipo-config";

afterEach(() => cleanup());

describe("RegistroTipoChip", () => {
  it("renders correct shortLabel for atendimento", () => {
    render(<RegistroTipoChip tipo="atendimento" />);
    expect(screen.getByText("Atend.")).toBeInTheDocument();
  });

  it("renders every tipo without throwing", () => {
    TIPO_KEYS.forEach((t) => {
      const { unmount } = render(<RegistroTipoChip tipo={t} />);
      expect(screen.getByText(REGISTRO_TIPOS[t].shortLabel)).toBeInTheDocument();
      unmount();
    });
  });

  it("supports xs size variant", () => {
    const { container } = render(
      <RegistroTipoChip tipo="diligencia" size="xs" />,
    );
    expect(container.firstElementChild?.className ?? "").toMatch(/text-\[10px\]/);
  });
});

describe("registro-tipo-config", () => {
  it("includes the 9 canonical tipos", () => {
    expect(TIPO_KEYS).toEqual(
      expect.arrayContaining([
        "atendimento",
        "diligencia",
        "anotacao",
        "ciencia",
        "providencia",
        "delegacao",
        "pesquisa",
        "elaboracao",
        "peticao",
      ]),
    );
    expect(TIPO_KEYS).toHaveLength(9);
  });

  it("each tipo has all required fields including a real hex color", () => {
    TIPO_KEYS.forEach((t) => {
      const cfg = REGISTRO_TIPOS[t];
      expect(cfg.label).toBeTruthy();
      expect(cfg.shortLabel).toBeTruthy();
      expect(cfg.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(cfg.bg).toBeTruthy();
      expect(cfg.text).toBeTruthy();
      expect(cfg.Icon).toBeTruthy();
    });
  });
});
