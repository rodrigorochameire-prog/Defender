import { describe, it, expect } from "vitest";
import { isMpu, type MpuInput } from "@/lib/mpu";

describe("isMpu", () => {
  it("retorna true quando tipoProcesso é 'MPU'", () => {
    const p: MpuInput = { processoVvd: { tipoProcesso: "MPU" } };
    expect(isMpu(p)).toBe(true);
  });

  it("retorna true quando mpuAtiva é true", () => {
    const p: MpuInput = { processoVvd: { mpuAtiva: true } };
    expect(isMpu(p)).toBe(true);
  });

  it("retorna true quando numero começa com 'MPUMP'", () => {
    expect(isMpu({ numero: "MPUMPCrim 8011120-58.2026.8.05.0039" })).toBe(true);
    expect(isMpu({ numero: "MPUMP 0001234-00.2026.8.05.0039" })).toBe(true);
  });

  it("retorna false para processo VVD sem MPU", () => {
    const p: MpuInput = {
      numero: "0001234-56.2026.8.05.0039",
      processoVvd: { tipoProcesso: "AP", mpuAtiva: false },
    };
    expect(isMpu(p)).toBe(false);
  });

  it("retorna false para processo sem dados de MPU", () => {
    expect(isMpu({})).toBe(false);
    expect(isMpu({ numero: "" })).toBe(false);
  });

  it("é tolerante a campos null/undefined em processoVvd", () => {
    expect(isMpu({ processoVvd: { tipoProcesso: null, mpuAtiva: null } })).toBe(false);
    expect(isMpu({ processoVvd: undefined })).toBe(false);
  });

  it("não é falso-positivo com 'MPU' no meio do número", () => {
    expect(isMpu({ numero: "0001234-MPU-2026" })).toBe(false);
  });

  it("é case-sensitive no prefixo (MPUMP exige maiúsculo)", () => {
    expect(isMpu({ numero: "mpump 0001234" })).toBe(false);
  });

  it("prioriza mpuAtiva sobre numero quando ambos presentes", () => {
    const p: MpuInput = {
      numero: "0001234-56.2026.8.05.0039",
      processoVvd: { mpuAtiva: true },
    };
    expect(isMpu(p)).toBe(true);
  });
});
