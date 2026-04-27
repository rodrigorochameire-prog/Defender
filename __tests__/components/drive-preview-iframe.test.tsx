// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DrivePreviewIframe } from "@/components/agenda/sheet/drive-preview-iframe";

afterEach(() => cleanup());

describe("DrivePreviewIframe", () => {
  it("renderiza iframe com URL drive.google.com/.../preview", () => {
    render(<DrivePreviewIframe driveFileId="abc123" />);
    const iframe = screen.getByTitle(/preview/i) as HTMLIFrameElement;
    expect(iframe.src).toBe("https://drive.google.com/file/d/abc123/preview");
  });

  it("aplica altura customizada", () => {
    render(<DrivePreviewIframe driveFileId="xyz" height={600} />);
    const iframe = screen.getByTitle(/preview/i) as HTMLIFrameElement;
    expect(iframe.style.height).toBe("600px");
  });

  it("usa loading=lazy", () => {
    render(<DrivePreviewIframe driveFileId="abc" />);
    const iframe = screen.getByTitle(/preview/i) as HTMLIFrameElement;
    // happy-dom does not implement HTMLIFrameElement.loading property; check attribute instead
    expect(iframe.getAttribute("loading")).toBe("lazy");
  });
});
