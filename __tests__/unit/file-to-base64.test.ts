// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { fileToBase64 } from "@/lib/agenda/file-to-base64";

describe("fileToBase64", () => {
  it("converte File para data URL base64", async () => {
    const content = "hello world";
    const file = new File([content], "test.txt", { type: "text/plain" });
    const result = await fileToBase64(file);
    expect(result).toMatch(/^data:text\/plain;base64,/);
    const base64 = result.split(",")[1];
    expect(Buffer.from(base64, "base64").toString("utf-8")).toBe(content);
  });

  it("rejeita com erro quando file não é válido", async () => {
    await expect(fileToBase64(null as any)).rejects.toThrow();
  });
});
