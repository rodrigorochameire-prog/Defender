// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AnexoDropzone } from "../anexo-dropzone";

function dropFiles(el: Element, files: File[]) {
  fireEvent.drop(el, { dataTransfer: { files, items: files.map((f) => ({ kind: "file", type: f.type })), types: ["Files"] } });
}

describe("AnexoDropzone", () => {
  it("entrega só arquivos com mime aceito", () => {
    const onFiles = vi.fn();
    const { getByTestId } = render(<AnexoDropzone onFiles={onFiles}><div>z</div></AnexoDropzone>);
    const zone = getByTestId("anexo-dropzone");
    const ok = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const bad = new File(["x"], "a.exe", { type: "application/x-msdownload" });
    dropFiles(zone, [ok, bad]);
    expect(onFiles).toHaveBeenCalledWith([ok]);
  });
});
