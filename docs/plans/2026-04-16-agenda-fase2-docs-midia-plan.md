# Agenda Fase 2 · Documentos & Mídia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar `DocumentosBlock` (tabs Autos/Assistido + preview iframe + drop upload) e `MidiaBlock` (player áudio + modal vídeo) ao sheet lateral, consumindo tRPC `drive.*` existente. Ativar botão "▶ Áudio" no `DepoenteCardV2` via heurística nome→arquivo.

**Architecture:** Zero mutations novas. Sete componentes novos em `src/components/agenda/sheet/`. Um helper util (base64) + um hook (folder resolver). Integração no `event-detail-sheet.tsx` adiciona 2 CollapsibleSections e 2 chips no ToC.

**Tech Stack:** React 19 · Next.js 15 · tRPC · Radix UI (Dialog, Tabs) · HTML5 `<audio>` · Google Drive preview iframe · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-16-agenda-fase2-docs-midia-design.md`.

---

## File Structure

```
src/
├── components/agenda/sheet/
│   ├── documentos-block.tsx           [new]
│   ├── documentos-item.tsx            [new]
│   ├── drive-preview-iframe.tsx       [new]
│   ├── drop-zone.tsx                  [new]
│   ├── midia-block.tsx                [new]
│   ├── audio-player-inline.tsx        [new]
│   └── video-modal.tsx                [new]
├── lib/agenda/
│   ├── file-to-base64.ts              [new]
│   └── match-depoente-audio.ts        [new]
├── hooks/
│   └── use-drive-folder.ts            [new]
└── components/agenda/event-detail-sheet.tsx  [modify]

__tests__/
├── components/
│   ├── drop-zone.test.tsx             [new]
│   ├── drive-preview-iframe.test.tsx  [new]
│   ├── documentos-item.test.tsx       [new]
│   ├── documentos-block.test.tsx      [new]
│   ├── audio-player-inline.test.tsx   [new]
│   ├── midia-block.test.tsx           [new]
│   └── event-detail-sheet.test.tsx    [modify: +2 cases]
└── unit/
    ├── file-to-base64.test.ts         [new]
    └── match-depoente-audio.test.ts   [new]
```

---

## Task 1: `fileToBase64` util + tests (TDD)

**Files:**
- Create: `src/lib/agenda/file-to-base64.ts`
- Create: `__tests__/unit/file-to-base64.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/file-to-base64.test.ts
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd ~/projetos/Defender && npm run test __tests__/unit/file-to-base64.test.ts`
Expected: FAIL, "Cannot find module".

- [ ] **Step 3: Implement**

```ts
// src/lib/agenda/file-to-base64.ts
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo inválido"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Leitura retornou tipo inesperado"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/unit/file-to-base64.test.ts`
Expected: 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/file-to-base64.ts __tests__/unit/file-to-base64.test.ts
git commit -m "feat(agenda): fileToBase64 helper"
```

---

## Task 2: `useDriveFolder` hook

**Files:**
- Create: `src/hooks/use-drive-folder.ts`

- [ ] **Step 1: Implement**

Resolve folder IDs para upload. Usa procedures existentes `getDriveStatusForProcesso` / `getDriveStatusForAssistido`.

```ts
// src/hooks/use-drive-folder.ts
"use client";

import { trpc } from "@/lib/trpc/client";

export function useDriveFolder(opts: {
  processoId?: number | null;
  assistidoId?: number | null;
}) {
  const processo = trpc.drive.getDriveStatusForProcesso.useQuery(
    { processoId: opts.processoId ?? 0 },
    { enabled: !!opts.processoId, retry: false }
  );
  const assistido = trpc.drive.getDriveStatusForAssistido.useQuery(
    { assistidoId: opts.assistidoId ?? 0 },
    { enabled: !!opts.assistidoId, retry: false }
  );

  return {
    processoFolderId: (processo.data as any)?.folderId ?? null,
    assistidoFolderId: (assistido.data as any)?.folderId ?? null,
    isLoading: processo.isLoading || assistido.isLoading,
    isDriveConnected:
      (processo.data as any)?.linked !== false ||
      (assistido.data as any)?.linked !== false,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 novos erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-drive-folder.ts
git commit -m "feat(agenda): hook useDriveFolder resolve folderIds para upload"
```

---

## Task 3: `DrivePreviewIframe` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/drive-preview-iframe.tsx`
- Create: `__tests__/components/drive-preview-iframe.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/drive-preview-iframe.test.tsx
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
    expect(iframe.loading).toBe("lazy");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/drive-preview-iframe.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/drive-preview-iframe.tsx
"use client";

interface Props {
  driveFileId: string;
  height?: number;
  title?: string;
}

export function DrivePreviewIframe({ driveFileId, height = 480, title = "Preview do arquivo" }: Props) {
  return (
    <iframe
      title={title}
      src={`https://drive.google.com/file/d/${driveFileId}/preview`}
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white"
      style={{ height: `${height}px` }}
    />
  );
}
```

- [ ] **Step 4: Run — expect PASS (3/3)**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/drive-preview-iframe.tsx __tests__/components/drive-preview-iframe.test.tsx
git commit -m "feat(agenda): DrivePreviewIframe embed"
```

---

## Task 4: `DropZone` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/drop-zone.tsx`
- Create: `__tests__/components/drop-zone.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/drop-zone.test.tsx
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
    const bigFile = new File([new Uint8Array(2 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
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
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/drop-zone.tsx
"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  onReject?: (file: File, reason: string) => void;
  maxSizeMB?: number;
  disabled?: boolean;
  accept?: string;
  label?: string;
}

export function DropZone({
  onFiles,
  onReject,
  maxSizeMB = 50,
  disabled = false,
  accept,
  label = "Arraste arquivos aqui ou clique para subir",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (filesList: FileList | File[] | null) => {
    if (!filesList) return;
    const files = Array.from(filesList);
    const accepted: File[] = [];
    for (const f of files) {
      if (f.size > maxSizeMB * 1024 * 1024) {
        onReject?.(f, `Arquivo muito grande (máx ${maxSizeMB} MB)`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) onFiles(accepted);
  };

  return (
    <div
      data-testid="drop-zone"
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-lg border border-dashed px-3 py-3 flex items-center justify-center gap-2 text-[11px] transition-colors cursor-pointer",
        dragging
          ? "border-emerald-500 bg-emerald-50/30 text-emerald-700"
          : "border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <Upload className="w-3.5 h-3.5" />
      <span>{label}</span>
      <label className="sr-only" htmlFor="drop-zone-input">upload</label>
      <input
        id="drop-zone-input"
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 5 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/drop-zone.tsx __tests__/components/drop-zone.test.tsx
git commit -m "feat(agenda): DropZone com drag-and-drop + validação tamanho"
```

---

## Task 5: `DocumentosItem` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/documentos-item.tsx`
- Create: `__tests__/components/documentos-item.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/documentos-item.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DocumentosItem } from "@/components/agenda/sheet/documentos-item";

afterEach(() => cleanup());

const baseFile = {
  driveFileId: "abc123",
  name: "Denuncia.pdf",
  mimeType: "application/pdf",
  fileSize: 245000,
  lastModifiedTime: new Date("2026-03-15T10:00:00Z"),
  webViewLink: "https://drive.google.com/file/d/abc123/view",
};

describe("DocumentosItem", () => {
  it("mostra nome e data no estado fechado", () => {
    render(<DocumentosItem file={baseFile} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText("Denuncia.pdf")).toBeInTheDocument();
    expect(screen.getByText(/15\/mar|15\/03/)).toBeInTheDocument();
  });

  it("expande preview quando aberto", () => {
    render(<DocumentosItem file={baseFile} isOpen={true} onToggle={() => {}} />);
    expect(screen.getByTitle(/preview/i)).toBeInTheDocument();
  });

  it("chama onToggle no click do header", () => {
    const onToggle = vi.fn();
    render(<DocumentosItem file={baseFile} isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /denuncia/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("mostra link para webViewLink quando aberto", () => {
    render(<DocumentosItem file={baseFile} isOpen={true} onToggle={() => {}} />);
    const abrirLink = screen.getByRole("link", { name: /abrir no drive/i });
    expect(abrirLink).toHaveAttribute("href", baseFile.webViewLink);
    expect(abrirLink).toHaveAttribute("target", "_blank");
  });

  it("escolhe ícone apropriado por mimeType", () => {
    const { rerender, container } = render(<DocumentosItem file={baseFile} isOpen={false} onToggle={() => {}} />);
    expect(container.innerHTML).toContain("📄"); // PDF
    rerender(<DocumentosItem file={{ ...baseFile, mimeType: "image/png" }} isOpen={false} onToggle={() => {}} />);
    expect(container.innerHTML).toContain("🖼");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/documentos-item.tsx
"use client";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DrivePreviewIframe } from "./drive-preview-iframe";
import { cn } from "@/lib/utils";

export interface DriveFileLite {
  driveFileId: string;
  name: string;
  mimeType: string;
  fileSize?: number | null;
  lastModifiedTime?: Date | string | null;
  webViewLink?: string | null;
}

interface Props {
  file: DriveFileLite;
  isOpen: boolean;
  onToggle: () => void;
}

function iconFor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function DocumentosItem({ file, isOpen, onToggle }: Props) {
  const dataStr = file.lastModifiedTime
    ? format(new Date(file.lastModifiedTime), "dd/MM", { locale: ptBR })
    : "";
  return (
    <div className={cn(
      "rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden",
      isOpen && "bg-white dark:bg-neutral-900/50"
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
      >
        <span className="text-base">{iconFor(file.mimeType)}</span>
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1 min-w-0 truncate">
          {file.name}
        </span>
        {dataStr && <span className="text-[10px] text-neutral-400 tabular-nums">{dataStr}</span>}
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-neutral-500">
            <span>{file.mimeType}</span>
            {file.fileSize && <span>· {formatSize(file.fileSize)}</span>}
          </div>
          <DrivePreviewIframe driveFileId={file.driveFileId} />
          <div className="flex gap-1.5">
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                <ExternalLink className="w-2.5 h-2.5" /> Abrir no Drive
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 5 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/documentos-item.tsx __tests__/components/documentos-item.test.tsx
git commit -m "feat(agenda): DocumentosItem com preview expansível"
```

---

## Task 6: `DocumentosBlock` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/documentos-block.tsx`
- Create: `__tests__/components/documentos-block.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/documentos-block.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DocumentosBlock } from "@/components/agenda/sheet/documentos-block";

afterEach(() => cleanup());

const autosFiles = [
  { driveFileId: "a1", name: "Denuncia.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-15") },
  { driveFileId: "a2", name: "Laudo.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-20") },
];
const assistidoFiles = [
  { driveFileId: "b1", name: "Procuracao.pdf", mimeType: "application/pdf", lastModifiedTime: new Date("2026-03-10") },
];

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      filesByProcesso: { useQuery: vi.fn(() => ({ data: autosFiles, isLoading: false })) },
      filesByAssistido: { useQuery: vi.fn(() => ({ data: assistidoFiles, isLoading: false })) },
      getDriveStatusForProcesso: { useQuery: vi.fn(() => ({ data: { linked: true, folderId: "folderP" }, isLoading: false })) },
      getDriveStatusForAssistido: { useQuery: vi.fn(() => ({ data: { linked: true, folderId: "folderA" }, isLoading: false })) },
      uploadWithLink: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    useUtils: () => ({
      drive: {
        filesByProcesso: { invalidate: vi.fn() },
        filesByAssistido: { invalidate: vi.fn() },
      },
    }),
  },
}));

describe("DocumentosBlock", () => {
  it("renderiza tab Autos ativa por default com contador", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    expect(screen.getByRole("tab", { name: /autos/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/2/)).toBeInTheDocument(); // count autos
  });

  it("troca pra tab Assistido ao clicar", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    fireEvent.click(screen.getByRole("tab", { name: /assistido/i }));
    expect(screen.getByText("Procuracao.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Denuncia.pdf")).toBeNull();
  });

  it("só 1 item aberto por vez (accordion)", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    fireEvent.click(screen.getByRole("button", { name: /denuncia/i }));
    expect(screen.getAllByTitle(/preview/i)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /laudo/i }));
    expect(screen.getAllByTitle(/preview/i)).toHaveLength(1);
  });

  it("mostra DropZone quando Drive conectado", () => {
    render(<DocumentosBlock processoId={1} assistidoId={2} />);
    expect(screen.getByTestId("drop-zone")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/documentos-block.tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DocumentosItem, type DriveFileLite } from "./documentos-item";
import { DropZone } from "./drop-zone";
import { fileToBase64 } from "@/lib/agenda/file-to-base64";

type TabKey = "autos" | "assistido";

interface Props {
  processoId: number | null;
  assistidoId: number | null;
}

export function DocumentosBlock({ processoId, assistidoId }: Props) {
  const [tab, setTab] = useState<TabKey>("autos");
  const [openId, setOpenId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const autos = trpc.drive.filesByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId }
  );
  const assistido = trpc.drive.filesByAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId }
  );
  const statusProcesso = trpc.drive.getDriveStatusForProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId, retry: false }
  );
  const statusAssistido = trpc.drive.getDriveStatusForAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId, retry: false }
  );

  const upload = trpc.drive.uploadWithLink.useMutation({
    onSuccess: () => {
      toast.success("Arquivo enviado");
      if (processoId) utils.drive.filesByProcesso.invalidate({ processoId });
      if (assistidoId) utils.drive.filesByAssistido.invalidate({ assistidoId });
    },
    onError: (e) => toast.error(e.message ?? "Erro no upload"),
  });

  const autosList: DriveFileLite[] = (autos.data as any) ?? [];
  const assistidoList: DriveFileLite[] = (assistido.data as any) ?? [];
  const activeList = tab === "autos" ? autosList : assistidoList;

  const folderId =
    tab === "autos"
      ? ((statusProcesso.data as any)?.folderId ?? null)
      : ((statusAssistido.data as any)?.folderId ?? null);

  const driveConnected =
    ((statusProcesso.data as any)?.linked ?? null) !== false ||
    ((statusAssistido.data as any)?.linked ?? null) !== false;

  const handleFiles = async (files: File[]) => {
    if (!folderId) {
      toast.error("Pasta do Drive não configurada para esta tab");
      return;
    }
    for (const file of files) {
      try {
        const fileBase64 = await fileToBase64(file);
        upload.mutate({
          folderId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64,
          processoId: tab === "autos" ? processoId ?? undefined : undefined,
          assistidoId: tab === "assistido" ? assistidoId ?? undefined : undefined,
        });
      } catch (err: any) {
        toast.error(err?.message ?? "Erro ao ler arquivo");
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Tabs */}
      <div role="tablist" className="flex gap-0 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "autos"}
          disabled={!processoId}
          onClick={() => { setTab("autos"); setOpenId(null); }}
          className={cn(
            "px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors",
            tab === "autos"
              ? "border-foreground text-foreground"
              : "border-transparent text-neutral-500 hover:text-neutral-700",
            !processoId && "opacity-40 cursor-not-allowed"
          )}
        >
          Autos
          {autosList.length > 0 && (
            <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{autosList.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assistido"}
          disabled={!assistidoId}
          onClick={() => { setTab("assistido"); setOpenId(null); }}
          className={cn(
            "px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors",
            tab === "assistido"
              ? "border-foreground text-foreground"
              : "border-transparent text-neutral-500 hover:text-neutral-700",
            !assistidoId && "opacity-40 cursor-not-allowed"
          )}
        >
          Assistido
          {assistidoList.length > 0 && (
            <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{assistidoList.length}</span>
          )}
        </button>
      </div>

      {/* DropZone */}
      {driveConnected && folderId && (
        <DropZone
          onFiles={handleFiles}
          onReject={(_, reason) => toast.error(reason)}
          disabled={upload.isPending}
          label={upload.isPending ? "Enviando…" : "Arraste ou clique para subir"}
        />
      )}

      {/* Lista */}
      {!driveConnected && (
        <p className="text-[11px] text-neutral-500 italic py-4 text-center">
          Google Drive não conectado.{" "}
          <a href="/admin/configuracoes/drive" className="underline hover:text-neutral-700">Configurar</a>
        </p>
      )}
      {driveConnected && activeList.length === 0 && (
        <p className="text-[11px] text-neutral-400 italic py-4 text-center">
          Nenhum arquivo nesta pasta. Arraste um acima.
        </p>
      )}
      {activeList.length > 0 && (
        <div className="space-y-1.5">
          {activeList.map((f) => (
            <DocumentosItem
              key={f.driveFileId}
              file={f}
              isOpen={openId === f.driveFileId}
              onToggle={() => setOpenId(openId === f.driveFileId ? null : f.driveFileId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 4 PASS**

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 0 novos erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/sheet/documentos-block.tsx __tests__/components/documentos-block.test.tsx
git commit -m "feat(agenda): DocumentosBlock com tabs Autos/Assistido + upload"
```

---

## Task 7: `AudioPlayerInline` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/audio-player-inline.tsx`
- Create: `__tests__/components/audio-player-inline.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/audio-player-inline.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AudioPlayerInline } from "@/components/agenda/sheet/audio-player-inline";

afterEach(() => cleanup());

describe("AudioPlayerInline", () => {
  it("renderiza elemento audio com src correto", () => {
    const { container } = render(
      <AudioPlayerInline driveFileId="audio123" title="Oitiva João" />
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).toBeTruthy();
    expect(audio.src).toContain("audio123");
  });

  it("mostra título", () => {
    render(<AudioPlayerInline driveFileId="x" title="Oitiva Maria" />);
    expect(screen.getByText("Oitiva Maria")).toBeInTheDocument();
  });

  it("atributo controls presente", () => {
    const { container } = render(<AudioPlayerInline driveFileId="x" title="t" />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio.controls).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/audio-player-inline.tsx
"use client";

import { forwardRef } from "react";

interface Props {
  driveFileId: string;
  title: string;
  autoPlay?: boolean;
  className?: string;
}

export const AudioPlayerInline = forwardRef<HTMLAudioElement, Props>(
  ({ driveFileId, title, autoPlay = false, className }, ref) => {
    const src = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    return (
      <div className={className}>
        <div className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 truncate">
          {title}
        </div>
        <audio
          ref={ref}
          controls
          preload="metadata"
          autoPlay={autoPlay}
          src={src}
          className="w-full h-8"
        >
          Seu navegador não suporta áudio HTML5.
        </audio>
      </div>
    );
  }
);

AudioPlayerInline.displayName = "AudioPlayerInline";
```

- [ ] **Step 4: Run — expect 3 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/audio-player-inline.tsx __tests__/components/audio-player-inline.test.tsx
git commit -m "feat(agenda): AudioPlayerInline HTML5"
```

---

## Task 8: `VideoModal`

**Files:**
- Create: `src/components/agenda/sheet/video-modal.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/agenda/sheet/video-modal.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrivePreviewIframe } from "./drive-preview-iframe";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driveFileId: string;
  title: string;
}

export function VideoModal({ open, onOpenChange, driveFileId, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] w-[80vw] h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-sm truncate">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-4 overflow-hidden">
          <DrivePreviewIframe driveFileId={driveFileId} height={window.innerHeight * 0.7} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 novos erros. (Se `window.innerHeight` reclamar no SSR, mudar para `style={{ height: "70vh" }}` em vez de passar via prop.)

- [ ] **Step 3: Commit**

```bash
git add src/components/agenda/sheet/video-modal.tsx
git commit -m "feat(agenda): VideoModal overlay 80% tela"
```

---

## Task 9: `MidiaBlock` (TDD)

**Files:**
- Create: `src/components/agenda/sheet/midia-block.tsx`
- Create: `__tests__/components/midia-block.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/midia-block.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MidiaBlock } from "@/components/agenda/sheet/midia-block";

afterEach(() => cleanup());

const midiasResp = {
  processos: [
    {
      processoId: 1,
      numeroAutos: "0001",
      files: [{
        driveFileId: "m1", name: "Oitiva João.mp3", mimeType: "audio/mp3",
        lastModifiedTime: new Date("2026-04-01"),
      }],
    },
  ],
  ungrouped: [{
    driveFileId: "m2", name: "Video ocorrencia.mp4", mimeType: "video/mp4",
    lastModifiedTime: new Date("2026-03-28"),
  }],
  stats: { total: 2, transcribed: 1, analyzed: 0 },
};

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      midiasByAssistido: { useQuery: vi.fn(() => ({ data: midiasResp, isLoading: false })) },
    },
  },
}));

describe("MidiaBlock", () => {
  it("lista áudio com player", () => {
    const { container } = render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/oitiva joão/i)).toBeInTheDocument();
    expect(container.querySelector("audio")).toBeTruthy();
  });

  it("mostra vídeo com botão play", () => {
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/video ocorrencia/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assistir/i })).toBeInTheDocument();
  });

  it("inclui áudios de atendimentos", () => {
    const atd = [{
      id: 99, data: new Date("2026-03-25"),
      audioDriveFileId: "atd99", transcricaoResumo: "Resumo teste",
    }];
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={atd} />);
    expect(screen.getByText(/atendimento/i)).toBeInTheDocument();
  });

  it("empty state quando sem mídia", () => {
    vi.mocked((await import("@/lib/trpc/client")).trpc.drive.midiasByAssistido.useQuery)
      .mockReturnValueOnce({ data: { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } }, isLoading: false } as any);
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/nenhuma mídia/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/sheet/midia-block.tsx
"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { AudioPlayerInline } from "./audio-player-inline";
import { VideoModal } from "./video-modal";

interface AtendimentoAudio {
  id: number;
  data: Date | string;
  audioDriveFileId: string;
  transcricaoResumo?: string | null;
}

interface Props {
  assistidoId: number | null;
  atendimentosComAudio: AtendimentoAudio[];
}

type MediaItem = {
  key: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  date: Date;
  transcricaoResumo?: string | null;
  kind: "audio" | "video";
};

export function MidiaBlock({ assistidoId, atendimentosComAudio }: Props) {
  const midias = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId: assistidoId ?? 0 },
    { enabled: !!assistidoId }
  );
  const [videoOpen, setVideoOpen] = useState<MediaItem | null>(null);

  const items: MediaItem[] = useMemo(() => {
    const list: MediaItem[] = [];
    const data: any = midias.data;
    const drivFiles = [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ];
    for (const f of drivFiles) {
      const kind: "audio" | "video" = f.mimeType?.startsWith?.("video/") ? "video" : "audio";
      list.push({
        key: `drive-${f.driveFileId}`,
        driveFileId: f.driveFileId,
        name: f.name,
        mimeType: f.mimeType,
        date: f.lastModifiedTime ? new Date(f.lastModifiedTime) : new Date(0),
        kind,
      });
    }
    for (const atd of atendimentosComAudio) {
      list.push({
        key: `atd-${atd.id}`,
        driveFileId: atd.audioDriveFileId,
        name: `Atendimento ${format(new Date(atd.data), "dd/MM/yyyy", { locale: ptBR })}`,
        mimeType: "audio/mpeg",
        date: new Date(atd.data),
        transcricaoResumo: atd.transcricaoResumo ?? null,
        kind: "audio",
      });
    }
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [midias.data, atendimentosComAudio]);

  if (items.length === 0) {
    return (
      <p className="text-[11px] text-neutral-400 italic py-4 text-center">
        Nenhuma mídia vinculada a este assistido.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 p-2.5 bg-white dark:bg-neutral-900/50"
        >
          {item.kind === "audio" ? (
            <>
              <AudioPlayerInline driveFileId={item.driveFileId} title={item.name} />
              {item.transcricaoResumo && (
                <details className="mt-1.5">
                  <summary className="text-[9px] font-medium text-neutral-500 cursor-pointer hover:text-neutral-700">
                    Ver transcrição
                  </summary>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1 whitespace-pre-wrap leading-relaxed">
                    {item.transcricaoResumo}
                  </p>
                </details>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {item.name}
                </div>
                <div className="text-[9px] text-neutral-400">
                  {format(item.date, "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
              <button
                type="button"
                aria-label="Assistir"
                onClick={() => setVideoOpen(item)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Assistir
              </button>
            </div>
          )}
        </div>
      ))}
      {videoOpen && (
        <VideoModal
          open={!!videoOpen}
          onOpenChange={(o) => !o && setVideoOpen(null)}
          driveFileId={videoOpen.driveFileId}
          title={videoOpen.name}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 4 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/midia-block.tsx __tests__/components/midia-block.test.tsx
git commit -m "feat(agenda): MidiaBlock com áudio + vídeo unificados"
```

---

## Task 10: `matchDepoenteAudio` helper (TDD)

**Files:**
- Create: `src/lib/agenda/match-depoente-audio.ts`
- Create: `__tests__/unit/match-depoente-audio.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/unit/match-depoente-audio.test.ts
import { describe, it, expect } from "vitest";
import { matchDepoenteAudio, type MediaFileCandidate } from "@/lib/agenda/match-depoente-audio";

const midias: MediaFileCandidate[] = [
  { driveFileId: "m1", name: "Oitiva João Silva.mp3", mimeType: "audio/mp3" },
  { driveFileId: "m2", name: "depoimento maria.mp3", mimeType: "audio/mp3" },
  { driveFileId: "m3", name: "video-random.mp4", mimeType: "video/mp4" },
];

describe("matchDepoenteAudio", () => {
  it("match exato pelo primeiro nome", () => {
    expect(matchDepoenteAudio("João Silva", midias)).toBe("m1");
  });

  it("match case-insensitive com acentos", () => {
    expect(matchDepoenteAudio("MARIA", midias)).toBe("m2");
  });

  it("retorna null quando não encontra", () => {
    expect(matchDepoenteAudio("Fulano de Tal", midias)).toBeNull();
  });

  it("retorna null para vídeos (só áudio)", () => {
    expect(matchDepoenteAudio("random", midias)).toBeNull();
  });

  it("retorna null para array vazio", () => {
    expect(matchDepoenteAudio("qualquer", [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/agenda/match-depoente-audio.ts
export interface MediaFileCandidate {
  driveFileId: string;
  name: string;
  mimeType: string;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchDepoenteAudio(
  depoenteNome: string,
  candidates: MediaFileCandidate[]
): string | null {
  if (!depoenteNome || candidates.length === 0) return null;
  const nomeNorm = normalize(depoenteNome);
  const tokens = nomeNorm.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  for (const c of candidates) {
    if (!c.mimeType.startsWith("audio/")) continue;
    const nameNorm = normalize(c.name);
    // Match se qualquer token do nome (≥3 chars) aparece no nome do arquivo
    if (tokens.some((t) => nameNorm.includes(t))) return c.driveFileId;
  }
  return null;
}
```

- [ ] **Step 4: Run — expect 5 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/match-depoente-audio.ts __tests__/unit/match-depoente-audio.test.ts
git commit -m "feat(agenda): matchDepoenteAudio heurística nome→arquivo"
```

---

## Task 11: Integrar DocumentosBlock + MidiaBlock no sheet

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Ler o arquivo atual (sanity check)**

Run: `wc -l src/components/agenda/event-detail-sheet.tsx`
Expected: ~449 linhas (após Fase 1).

- [ ] **Step 2: Adicionar imports no topo**

Adicionar logo após a linha `import { DepoenteCardV2 } from "./sheet/depoente-card-v2";`:

```tsx
import { DocumentosBlock } from "./sheet/documentos-block";
import { MidiaBlock } from "./sheet/midia-block";
import { matchDepoenteAudio } from "@/lib/agenda/match-depoente-audio";
```

- [ ] **Step 3: Substituir a CollapsibleSection "documentos" antiga**

Localizar o bloco que renderiza "Pasta do Assistido" e "Autos do Processo" com 2 `<Link>` (seção `id="documentos"`). É o último CollapsibleSection dentro da div `<div className="px-3 pb-4 space-y-2.5">`. Substituir TODO esse bloco por:

```tsx
                <CollapsibleSection id="documentos" label="Documentos" defaultOpen>
                  <DocumentosBlock
                    processoId={typeof processoId === "number" ? processoId : null}
                    assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                  />
                </CollapsibleSection>

                {/* Mídia */}
                <CollapsibleSection id="midia" label="Mídia">
                  <MidiaBlock
                    assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                    atendimentosComAudio={
                      (ctx?.atendimentos ?? [])
                        .filter((a: any) => !!a.audioDriveFileId)
                        .map((a: any) => ({
                          id: a.id,
                          data: a.dataAtendimento ?? a.data ?? new Date(),
                          audioDriveFileId: a.audioDriveFileId,
                          transcricaoResumo: a.transcricaoResumo,
                        }))
                    }
                  />
                </CollapsibleSection>
```

- [ ] **Step 4: Adicionar "midia" no tocSections**

Localizar `tocSections: ToCSection[] = useMemo(...)`. No array, adicionar depois do "documentos":

```tsx
    if (assistidoId || processoId) s.push({ id: "documentos", label: "Docs" });
    if (assistidoId) s.push({ id: "midia", label: "Mídia" });
```

- [ ] **Step 5: Wire up "▶ Áudio" do DepoenteCardV2 com heurística**

Localizar a query que retorna midias (se não existir, adicionar logo após `const { data: ctx, isLoading } = ...`):

```tsx
  const midiasQuery = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId: (ctx?.assistido as any)?.id ?? 0 },
    { enabled: !!(ctx?.assistido as any)?.id && open, retry: false }
  );
```

Adicionar `depoenteAudioMap` antes do return:

```tsx
  const allMediaCandidates = useMemo(() => {
    const data: any = midiasQuery.data;
    return [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ].map((f: any) => ({
      driveFileId: f.driveFileId,
      name: f.name,
      mimeType: f.mimeType,
    }));
  }, [midiasQuery.data]);
```

No map do `DepoenteCardV2`, substituir o `onAbrirAudio={() => toast.info("Em breve (Fase 2)")}` por:

```tsx
                          onAbrirAudio={(id) => {
                            const audioId = matchDepoenteAudio(d.nome ?? "", allMediaCandidates);
                            if (!audioId) {
                              toast.info("Áudio não encontrado para este depoente");
                              return;
                            }
                            const root = scrollContainerRef.current;
                            const target = root?.querySelector('[data-section-id="midia"]');
                            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                            toast.success("Rolando para o áudio…");
                          }}
```

E, no props do `DepoenteCardV2` desse map, adicionar `audioDriveFileId`:

```tsx
                          depoente={{
                            ...d,
                            audioDriveFileId: matchDepoenteAudio(d.nome ?? "", allMediaCandidates),
                          }}
```

Substituir a linha `depoente={d}` pelo spread acima.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: 0 novos erros. Caso `atendimentos` não esteja tipado em ctx, faz cast com `(ctx?.atendimentos as any[] ?? [])`.

- [ ] **Step 7: Rodar TODOS os tests para garantir que nada quebrou**

Run: `npm run test`
Expected: todos passam (Fase 1 regression test ainda OK + novos tests componentes Fase 2 + mutation tests + regressão event-detail-sheet).

- [ ] **Step 8: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): integra DocumentosBlock + MidiaBlock + áudio do depoente"
```

---

## Task 12: Teste de regressão — Mídia section aparece

**Files:**
- Modify: `__tests__/components/event-detail-sheet.test.tsx`

- [ ] **Step 1: Adicionar mock para novas queries + novo teste**

Append ao mock existente `vi.mock("@/lib/trpc/client", ...)`:

```tsx
      filesByProcesso: { useQuery: () => ({ data: [], isLoading: false }) },
      filesByAssistido: { useQuery: () => ({ data: [], isLoading: false }) },
      getDriveStatusForProcesso: { useQuery: () => ({ data: { linked: true, folderId: "folderP" }, isLoading: false }) },
      getDriveStatusForAssistido: { useQuery: () => ({ data: { linked: true, folderId: "folderA" }, isLoading: false }) },
      uploadWithLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      midiasByAssistido: { useQuery: () => ({ data: { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } }, isLoading: false }) },
```

Adicionar novos testes no describe "EventDetailSheet":

```tsx
  it("renderiza bloco Documentos (novo, sem links antigos)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/nenhum arquivo nesta pasta|arraste|autos/i)).toBeInTheDocument();
  });

  it("renderiza bloco Mídia (empty state quando sem midia)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/nenhuma mídia|midia|mídia/i)).toBeInTheDocument();
  });

  it("não mostra mais links externos 'Pasta do Assistido' (regressão Fase 2)", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.queryByText(/pasta do assistido/i)).toBeNull();
    expect(screen.queryByText(/autos do processo/i)).toBeNull();
  });
```

- [ ] **Step 2: Run**

Run: `npm run test __tests__/components/event-detail-sheet.test.tsx`
Expected: PASS nos novos + o antigo (João Único) continua passando.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/event-detail-sheet.test.tsx
git commit -m "test(agenda): regressão Fase 2 — DocumentosBlock + MidiaBlock integrados"
```

---

## Task 13: Verificação manual

**Files:** nenhum.

- [ ] **Step 1: Subir dev server**

Run: `cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack`
Expected: servidor em `http://localhost:3000`.

- [ ] **Step 2: Checklist**

Em `http://localhost:3000/admin/agenda` abra um evento que tenha processoId + assistidoId com pastas Drive vinculadas:

- [ ] Bloco Documentos abre por default, tab Autos ativa com contador
- [ ] Clicar em um arquivo PDF → preview iframe carrega em < 3s
- [ ] Só 1 item aberto por vez (clicar outro fecha o anterior)
- [ ] Tab Assistido: click troca a lista, mostra arquivos da pasta do assistido
- [ ] DropZone visível: arrastar um PDF de teste → progress toast → sucesso → arquivo aparece na lista
- [ ] Upload de arquivo > 50MB rejeitado com toast
- [ ] Bloco Mídia: se existir áudio vinculado → player toca inline
- [ ] Se existir vídeo → clicar "Assistir" → modal 80% abre com player
- [ ] Atendimento com transcricaoResumo → "Ver transcrição" colapsável aparece abaixo do player
- [ ] DepoenteCardV2 aberto: botão "▶ Áudio" ativo se heurística achou áudio com nome parecido → clique rola sheet pra bloco Mídia
- [ ] Chips "Docs" e "Mídia" aparecem no ToC do topo
- [ ] Tests automatizados (`npm run test`) todos verdes

- [ ] **Step 3: Commit final de marcação**

```bash
git commit --allow-empty -m "chore(agenda): Fase 2 validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Tabs Autos/Assistido com contador | Task 6 |
| Preview iframe inline | Task 3, Task 5 |
| Accordion (1 item aberto) | Task 5, Task 6 |
| Filtros PDF/Imagem/Outros | **NÃO incluído** — simplificação: filtros ficam para follow-up; não é bloqueante para Fase 2 |
| DropZone drag OR click | Task 4 |
| Upload > 50MB rejeitado | Task 4 |
| Bloco Mídia áudio + vídeo | Task 9 |
| Player áudio HTML5 | Task 7 |
| VideoModal 80% tela | Task 8 |
| Transcrição colapsável | Task 9 |
| Botão "▶ Áudio" heurístico | Task 10, Task 11 |
| Empty states Drive não conectado / pasta vazia | Task 6 |
| Seção antiga (2 links) removida | Task 11 |
| Zero mutations novas | confirmado em todas as tasks |
| Unit tests dos novos componentes | Tasks 1, 3, 4, 5, 6, 7, 9, 10 |
| Regressão Fase 2 | Task 12 |
| Manual verification | Task 13 |

**Placeholders:** nenhum "TBD/TODO/similar to above". Todo código está escrito. (Filtros por tipo foram removidos do escopo — explicitado acima.)

**Type consistency:**
- `DriveFileLite` definido em Task 5 e usado em Task 6.
- `MediaFileCandidate` em Task 10 e consumido pela heurística em Task 11.
- `AtendimentoAudio` em Task 9 consumido pela integração em Task 11.
- Props de `DropZone` (Task 4) batem com uso em Task 6.
- Assinatura `AudioPlayerInline` (Task 7) bate com uso em Task 9.

Plano coerente e executável. Scope: 13 tasks, ~12 commits esperados.
