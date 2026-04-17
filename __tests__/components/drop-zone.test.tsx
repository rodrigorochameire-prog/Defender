// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DropZone } from "@/components/agenda/sheet/drop-zone";

afterEach(() => cleanup());

describe("DropZone", () => {
  it("mostra mensagem de drag-and-drop", () => {
    render(<DropZone onFiles={() => {}} />);
    expect(screen.getByText(/arraste|solte|clique/i)).toBeInTheDocument();
  });

  it("dispara onFiles ao selecionar via input", () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);
    const input = screen.getByLabelText(/upload/i, { selector: "input" }) as HTMLInputElement;
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("dispara onFiles ao fazer drop", () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} />);
    const zone = container.querySelector('[data-testid="drop-zone"]') as HTMLElement;
    const file = new File(["x"], "b.pdf", { type: "application/pdf" });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("rejeita arquivo > maxSizeMB com callback onReject", () => {
    const onReject = vi.fn();
    render(<DropZone onFiles={() => {}} onReject={onReject} maxSizeMB={1} />);
    const bigFile = new File([new Blob([new ArrayBuffer(2 * 1024 * 1024)])], "big.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText(/upload/i, { selector: "input" }) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(onReject).toHaveBeenCalledWith(bigFile, expect.stringContaining("grande"));
  });

  it("estado disabled quando disabled=true", () => {
    render(<DropZone onFiles={() => {}} disabled />);
    const input = screen.getByLabelText(/upload/i, { selector: "input" }) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
