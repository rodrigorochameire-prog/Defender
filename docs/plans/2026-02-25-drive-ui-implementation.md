# Drive UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `/admin/drive` from a monolithic 1433-line page into a Hub + File Manager with sidebar, content area, detail panel, command palette, and IA-ready sections.

**Architecture:** Split the existing page into ~15 focused components. Use React Context for shared Drive state (selectedFolder, breadcrumbs, viewMode, selection, filters). Keep tRPC for server state. Preserve all existing functionality while adding: collapsible sidebar with lazy-loaded tree, grid/list toggle, detail panel with preview + juridical context, command palette (Ctrl+K), batch actions, drag & drop, keyboard shortcuts, and IA placeholder sections.

**Tech Stack:** Next.js 15, React 19, tRPC, Tailwind CSS, shadcn/ui, Lucide icons, cmdk (already installed), date-fns

**Design Doc:** `docs/plans/2026-02-25-drive-ui-redesign.md`

---

## Task 1: Drive State Context

**Files:**
- Create: `src/components/drive/DriveContext.tsx`

**What:** Create a React Context that replaces the 13 `useState` hooks in the current page. This is the foundation for all other components to share state.

**Step 1: Create DriveContext with all state**

```tsx
// src/components/drive/DriveContext.tsx
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface BreadcrumbItem {
  id: string;        // driveFileId or folderId
  name: string;
  isRoot?: boolean;
}

export interface DriveFilters {
  type: string | null;        // mimeType filter
  dateRange: string | null;   // "today" | "week" | "month" | null
  enrichmentStatus: string | null;
}

interface DriveState {
  // Navigation
  selectedAtribuicao: string | null;        // "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | null
  selectedFolderId: string | null;           // current folder driveId
  breadcrumbPath: BreadcrumbItem[];

  // View
  viewMode: "grid" | "list";
  searchQuery: string;
  filters: DriveFilters;

  // Selection
  selectedFileIds: Set<number>;
  detailPanelFileId: number | null;          // file.id (DB) open in detail panel

  // Actions
  setSelectedAtribuicao: (atribuicao: string | null) => void;
  navigateToFolder: (folderId: string, folderName: string) => void;
  navigateBack: () => void;
  navigateToBreadcrumb: (index: number) => void;
  resetNavigation: () => void;
  setViewMode: (mode: "grid" | "list") => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<DriveFilters>) => void;
  toggleFileSelection: (fileId: number) => void;
  selectAllFiles: (fileIds: number[]) => void;
  clearSelection: () => void;
  openDetailPanel: (fileId: number) => void;
  closeDetailPanel: () => void;
}

const DriveContext = createContext<DriveState | null>(null);

export function useDriveContext() {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error("useDriveContext must be used within DriveProvider");
  return ctx;
}

export function DriveProvider({ children }: { children: ReactNode }) {
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);
  const [viewMode, setViewModeState] = useState<"grid" | "list">(
    () => (typeof window !== "undefined" ? (localStorage.getItem("drive-view-mode") as "grid" | "list") || "grid" : "grid")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFiltersState] = useState<DriveFilters>({ type: null, dateRange: null, enrichmentStatus: null });
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [detailPanelFileId, setDetailPanelFileId] = useState<number | null>(null);

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    setBreadcrumbPath(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
    setSearchQuery("");
  }, []);

  const navigateBack = useCallback(() => {
    setBreadcrumbPath(prev => {
      if (prev.length <= 1) {
        setSelectedFolderId(null);
        return [];
      }
      const newPath = prev.slice(0, -1);
      setSelectedFolderId(newPath[newPath.length - 1].id);
      return newPath;
    });
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    setBreadcrumbPath(prev => {
      const newPath = prev.slice(0, index + 1);
      setSelectedFolderId(newPath[newPath.length - 1].id);
      return newPath;
    });
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
  }, []);

  const resetNavigation = useCallback(() => {
    setSelectedFolderId(null);
    setBreadcrumbPath([]);
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
    setSearchQuery("");
  }, []);

  const setViewMode = useCallback((mode: "grid" | "list") => {
    setViewModeState(mode);
    if (typeof window !== "undefined") localStorage.setItem("drive-view-mode", mode);
  }, []);

  const setFilters = useCallback((partial: Partial<DriveFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const toggleFileSelection = useCallback((fileId: number) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const selectAllFiles = useCallback((fileIds: number[]) => {
    setSelectedFileIds(new Set(fileIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const openDetailPanel = useCallback((fileId: number) => {
    setDetailPanelFileId(fileId);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setDetailPanelFileId(null);
  }, []);

  const handleSetAtribuicao = useCallback((atribuicao: string | null) => {
    setSelectedAtribuicao(atribuicao);
    resetNavigation();
  }, [resetNavigation]);

  return (
    <DriveContext.Provider value={{
      selectedAtribuicao, selectedFolderId, breadcrumbPath,
      viewMode, searchQuery, filters,
      selectedFileIds, detailPanelFileId,
      setSelectedAtribuicao: handleSetAtribuicao,
      navigateToFolder, navigateBack, navigateToBreadcrumb, resetNavigation,
      setViewMode, setSearchQuery, setFilters,
      toggleFileSelection, selectAllFiles, clearSelection,
      openDetailPanel, closeDetailPanel,
    }}>
      {children}
    </DriveContext.Provider>
  );
}
```

**Step 2: Build and verify**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/drive/DriveContext.tsx
git commit -m "feat(drive): add DriveContext for shared state management"
```

---

## Task 2: Drive Constants & Utilities

**Files:**
- Create: `src/components/drive/drive-constants.ts`

**What:** Extract constants from the monolithic page into a shared file. Includes atribuicao mappings, file icons, colors, document tags, and utility functions.

**Step 1: Create constants file**

```ts
// src/components/drive/drive-constants.ts
import {
  Scale, Shield, Lock, Zap,
  FileText, FileImage, FileAudio, FileVideo,
  File, FolderOpen, FileSpreadsheet, FileCode,
  Inbox, BookOpen,
} from "lucide-react";

// Import actual folder IDs from text-extraction
import { ATRIBUICAO_FOLDER_IDS, SPECIAL_FOLDER_IDS } from "@/lib/utils/text-extraction";

export const DRIVE_ATRIBUICOES = [
  {
    key: "JURI",
    label: "Juri",
    icon: Scale,
    folderId: ATRIBUICAO_FOLDER_IDS.JURI,
    color: "emerald",
    bgClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  {
    key: "VVD",
    label: "VVD",
    icon: Shield,
    folderId: ATRIBUICAO_FOLDER_IDS.VVD,
    color: "rose",
    bgClass: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    dotClass: "bg-rose-500",
  },
  {
    key: "EP",
    label: "Execucao Penal",
    icon: Lock,
    folderId: ATRIBUICAO_FOLDER_IDS.EP,
    color: "amber",
    bgClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    dotClass: "bg-amber-500",
  },
  {
    key: "SUBSTITUICAO",
    label: "Substituicao",
    icon: Zap,
    folderId: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO,
    color: "sky",
    bgClass: "bg-sky-500/10 border-sky-500/30 text-sky-400",
    dotClass: "bg-sky-500",
  },
] as const;

export const SPECIAL_FOLDERS = [
  {
    key: "DISTRIBUICAO",
    label: "Distribuicao",
    icon: Inbox,
    folderId: SPECIAL_FOLDER_IDS.DISTRIBUICAO,
    color: "violet",
  },
  {
    key: "JURISPRUDENCIA",
    label: "Jurisprudencia",
    icon: BookOpen,
    folderId: SPECIAL_FOLDER_IDS.JURISPRUDENCIA,
    color: "cyan",
  },
] as const;

export const FILE_ICON_MAP: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "application/msword": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
  "application/vnd.google-apps.document": FileText,
  "application/vnd.google-apps.spreadsheet": FileSpreadsheet,
  "application/vnd.google-apps.folder": FolderOpen,
  "image/jpeg": FileImage,
  "image/png": FileImage,
  "image/gif": FileImage,
  "audio/mpeg": FileAudio,
  "audio/mp3": FileAudio,
  "audio/wav": FileAudio,
  "audio/ogg": FileAudio,
  "video/mp4": FileVideo,
  "text/plain": FileCode,
};

export function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  return FILE_ICON_MAP[mimeType] || File;
}

export function getFileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return "Arquivo";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Imagem";
  if (mimeType.includes("audio")) return "Audio";
  if (mimeType.includes("video")) return "Video";
  if (mimeType.includes("folder")) return "Pasta";
  if (mimeType.includes("document") || mimeType.includes("word")) return "Documento";
  if (mimeType.includes("spreadsheet")) return "Planilha";
  return "Arquivo";
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getEnrichmentBadge(status: string | null) {
  switch (status) {
    case "completed": return { label: "Extraido", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "processing": return { label: "Processando", class: "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse" };
    case "pending": return { label: "Pendente", class: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
    case "failed": return { label: "Falhou", class: "bg-red-500/10 text-red-400 border-red-500/30" };
    case "unsupported": return { label: "N/A", class: "bg-zinc-800/50 text-zinc-500 border-zinc-700/30" };
    default: return { label: "", class: "" };
  }
}
```

**Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/drive/drive-constants.ts
git commit -m "feat(drive): extract constants and utilities to shared file"
```

---

## Task 3: DriveSidebar Component

**Files:**
- Create: `src/components/drive/DriveSidebar.tsx`

**What:** The left-side navigation tree with atribuicoes, special folders, and quick access. Uses lazy loading for subfolders via tRPC `drive.files`.

**Step 1: Create DriveSidebar**

The sidebar renders:
- Section "ATRIBUICOES" with 4 expandable items (JURI, VVD, EP, SUBSTITUICAO)
- Each item shows folder count from `drive.statsDetailed`
- Clicking expands to show subfolder list (assistido folders) via `drive.files`
- Section "ESPECIAIS" with Distribuicao (badge count) + Jurisprudencia
- Section "ACESSO RAPIDO" with Recentes (localStorage) + Favoritos (localStorage)
- Collapsible via chevron button
- Active item has zinc-800 bg + emerald left border
- Each atribuicao has its own color theme

Key behavior:
- Use `trpc.drive.files.useQuery({ folderId, parentFileId: null })` for subfolders (lazy on expand)
- Store expanded state per atribuicao in local component state
- Call `ctx.setSelectedAtribuicao` + `ctx.navigateToFolder` on click
- Mobile: render as Sheet/Drawer from shadcn

Approximate size: 250-350 lines

Reference the `DRIVE_ATRIBUICOES` and `SPECIAL_FOLDERS` from `drive-constants.ts`.
Use `useDriveContext()` for all navigation actions.
Import `trpc` from `@/lib/trpc/client`.

**Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/drive/DriveSidebar.tsx
git commit -m "feat(drive): add DriveSidebar with lazy tree navigation"
```

---

## Task 4: DriveTopBar Component

**Files:**
- Create: `src/components/drive/DriveTopBar.tsx`

**What:** Top bar with: search input (local), sync status indicator, sync button, upload button, view toggle (grid/list).

Key elements:
- Left: Search input with magnifying glass icon, filters search in current folder
- Center/Right: Sync health indicator (dot + text), Sync button (RefreshCw icon), Upload button, Grid/List toggle
- Health indicator uses `trpc.drive.healthStatus.useQuery()` — shows green/amber/red dot
- Last sync time from `trpc.drive.syncFolders.useQuery()` — picks most recent lastSyncAt
- Clicking health dot shows Popover with details (expired channels, stale folders, recent errors)
- Upload button opens existing FileUploadWithLink dialog
- Grid/List toggle calls `ctx.setViewMode()`

Approximate size: 150-200 lines

Use `useDriveContext()` for viewMode and searchQuery.

**Step 2: Build and verify**

Run: `npx next build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/drive/DriveTopBar.tsx
git commit -m "feat(drive): add DriveTopBar with sync health and view toggle"
```

---

## Task 5: DriveBreadcrumbs Component

**Files:**
- Create: `src/components/drive/DriveBreadcrumbs.tsx`

**What:** Breadcrumb navigation bar showing current path. Clickable segments to navigate back.

Key elements:
- Renders: `Atribuicao > Pasta1 > Pasta2 > ...`
- Each segment is clickable via `ctx.navigateToBreadcrumb(index)`
- Last segment is non-clickable (current location)
- Back button (ChevronLeft) calls `ctx.navigateBack()`
- Separator: `/` or `>` in zinc-600
- Truncate long names with ellipsis

Approximate size: 50-80 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveBreadcrumbs.tsx
git commit -m "feat(drive): add DriveBreadcrumbs navigation"
```

---

## Task 6: DriveFileGrid + DriveFileList Components

**Files:**
- Create: `src/components/drive/DriveFileGrid.tsx`
- Create: `src/components/drive/DriveFileList.tsx`

**What:** Two view modes for file listing. Grid shows cards with thumbnails; List shows rows in a table.

### DriveFileGrid (200-250 lines)
- Renders files as cards in a responsive grid (2 cols mobile, 3 md, 4 lg, 5 xl)
- Each card shows: icon/thumbnail, name (truncated), size, enrichment badge
- Folders show child count
- Checkbox in top-left corner for selection
- Click on folder: `ctx.navigateToFolder()`
- Click on file: `ctx.openDetailPanel()`
- Hover: border-emerald-500/30 transition
- Drag handle for drag & drop (future)
- Uses `getFileIcon()`, `formatFileSize()`, `getEnrichmentBadge()` from constants

### DriveFileList (150-200 lines)
- Table layout with columns: checkbox, icon, name, size, modified date, enrichment status
- Click on row: `ctx.openDetailPanel()` for files, `ctx.navigateToFolder()` for folders
- Sortable columns (name, size, date) — local sort in component state
- Same selection/hover behavior as grid

Both components receive `files` array as prop (from parent query).

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveFileGrid.tsx src/components/drive/DriveFileList.tsx
git commit -m "feat(drive): add DriveFileGrid and DriveFileList view modes"
```

---

## Task 7: DriveFilters + DriveBatchActions Components

**Files:**
- Create: `src/components/drive/DriveFilters.tsx`
- Create: `src/components/drive/DriveBatchActions.tsx`

### DriveFilters (100-130 lines)
- Row of filter dropdowns: Type (PDF/Imagem/Audio/Pasta/GDocs), Date (Hoje/Semana/Mes), Enrichment (Concluido/Pendente/Processando/Falhou)
- Active filters shown as removable badges
- "Limpar filtros" button
- Uses `ctx.setFilters()` and `ctx.filters`

### DriveBatchActions (120-150 lines)
- Appears when `ctx.selectedFileIds.size > 0`
- Sticky bar at bottom or top of content area
- Shows: "N selecionados" + action buttons
- Actions: Vincular (opens search modal), Extrair com IA (calls retryEnrichment), Excluir (with confirmation AlertDialog)
- Uses tRPC mutations: `drive.linkFileToEntity`, `drive.retryEnrichment`, `drive.deleteFile`
- "Limpar selecao" button calls `ctx.clearSelection()`

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveFilters.tsx src/components/drive/DriveBatchActions.tsx
git commit -m "feat(drive): add DriveFilters and DriveBatchActions"
```

---

## Task 8: DriveOverviewDashboard Component

**Files:**
- Create: `src/components/drive/DriveOverviewDashboard.tsx`

**What:** Dashboard shown when no folder is selected. Shows atribuicao cards with metrics, special folders, activity feed, and enrichment stats.

Key elements:
- 4 atribuicao cards in a row (responsive grid) with: icon, name, doc count, assistido count, sync status
- Click on card: `ctx.setSelectedAtribuicao(key)` + navigate to root
- Special folders row: Distribuicao (with pending badge), Jurisprudencia
- Enrichment card: extracted %, processing, failed, pending, "Processar pendentes" button
- Metricas row: total docs, vinculados %, last sync time
- Uses `trpc.drive.stats`, `trpc.drive.statsDetailed`, `trpc.drive.syncFolders`

Approximate size: 250-300 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveOverviewDashboard.tsx
git commit -m "feat(drive): add DriveOverviewDashboard with metrics cards"
```

---

## Task 9: DriveContentArea Component (Orchestrator)

**Files:**
- Create: `src/components/drive/DriveContentArea.tsx`

**What:** Main content area that orchestrates: breadcrumbs, filters, file grid/list, batch actions, overview, and drop zone. This is the central orchestrator component.

Logic:
- If no `selectedFolderId` and no `selectedAtribuicao`: show `DriveOverviewDashboard`
- If `selectedAtribuicao` but no `selectedFolderId`: navigate to atribuicao root folder
- If `selectedFolderId`: query files with `trpc.drive.files` and render grid/list

```tsx
// Simplified structure
function DriveContentArea() {
  const ctx = useDriveContext();

  // Determine which folderId to query
  const activeFolderId = ctx.selectedFolderId || getAtribuicaoFolderId(ctx.selectedAtribuicao);

  const { data, isLoading } = trpc.drive.files.useQuery(
    { folderId: activeFolderId!, parentFileId: null, search: ctx.searchQuery },
    { enabled: !!activeFolderId }
  );

  // Apply local filters
  const filteredFiles = useMemo(() => applyFilters(data?.files, ctx.filters), [data, ctx.filters]);

  if (!activeFolderId) return <DriveOverviewDashboard />;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <DriveBreadcrumbs />
      <DriveFilters />
      {isLoading ? <Skeletons /> : (
        ctx.viewMode === "grid"
          ? <DriveFileGrid files={filteredFiles} />
          : <DriveFileList files={filteredFiles} />
      )}
      <DriveBatchActions />
      <DriveDropZone folderId={activeFolderId} />
    </div>
  );
}
```

Approximate size: 150-200 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveContentArea.tsx
git commit -m "feat(drive): add DriveContentArea orchestrator component"
```

---

## Task 10: DriveDetailPanel Component

**Files:**
- Create: `src/components/drive/DriveDetailPanel.tsx`

**What:** Right-side panel showing file preview, metadata, juridical context, enrichment info, and IA placeholders.

Key sections:
1. **Header**: File name, close button (X)
2. **Preview**: iframe for PDFs (webViewLink + `/preview`), img for images, audio player for audio
3. **Actions**: Download, Open in Drive, Rename (inline), Favorite (localStorage)
4. **Metadata**: Type, size, dates, checksum (font-mono)
5. **Enrichment**: Status badge, detected type, confidence, re-process button
6. **Extracted Data**: JSON display of enrichmentData from driveFiles record (if exists)
7. **Juridical Context**: Uses `trpc.drive.getAssistidoByFolderName` to get linked assistido info — shows name, status prisional, processos, demandas with prazo badges
8. **IA Insights (placeholder)**: "Jurisprudencia relacionada" section with "Nao analisado" state + "Analisar" button (disabled). "Analise do caso" section similarly placeholder.
9. **Link Actions**: Vincular a processo (search), Vincular a assistido (search), Tags input

Gets file data from `trpc.drive.fileInfo` query using `ctx.detailPanelFileId`.
Slide-in animation from right. On mobile: bottom sheet via Sheet component.

Approximate size: 400-500 lines (largest component)

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveDetailPanel.tsx
git commit -m "feat(drive): add DriveDetailPanel with preview and juridical context"
```

---

## Task 11: DriveCommandPalette Component

**Files:**
- Create: `src/components/drive/DriveCommandPalette.tsx`

**What:** Ctrl+K command palette for global search across all atribuicoes + quick actions.

Key behavior:
- Uses `cmdk` library (already installed as `@/components/ui/command.tsx`)
- Opens on Ctrl+K / Cmd+K via keyboard event listener
- Search across files: `trpc.drive.files` with search param across all atribuicao folder IDs
- Search across assistidos: `trpc.drive.searchAssistidosForLink`
- Search across processos: `trpc.drive.searchProcessosForLink`
- Quick actions: Sincronizar, Upload, Ver estatisticas
- Results grouped: ARQUIVOS, ASSISTIDOS, PROCESSOS, ACOES
- On select: navigate to the item (set atribuicao, navigate to folder, open detail)
- Debounce search at 300ms

Uses CommandDialog from shadcn/ui.

Approximate size: 200-250 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveCommandPalette.tsx
git commit -m "feat(drive): add DriveCommandPalette with Ctrl+K global search"
```

---

## Task 12: DriveDropZone Component

**Files:**
- Create: `src/components/drive/DriveDropZone.tsx`

**What:** Drag & drop overlay for file uploads. Covers the content area when dragging files from desktop.

Key behavior:
- Listens for `dragenter`, `dragleave`, `drop` events on content area
- Shows overlay with dashed border and "Solte para enviar" text
- On drop: opens FileUploadWithLink dialog pre-filled with dropped file
- Visual: semi-transparent zinc-900 overlay with emerald dashed border
- Accepts: any file type (validation in upload dialog)

Approximate size: 80-120 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/DriveDropZone.tsx
git commit -m "feat(drive): add DriveDropZone for drag-and-drop uploads"
```

---

## Task 13: Keyboard Shortcuts Hook

**Files:**
- Create: `src/components/drive/useKeyboardShortcuts.ts`

**What:** Custom hook that registers keyboard shortcuts for the Drive interface.

Shortcuts:
- `Ctrl+K`: Open command palette (handled by DriveCommandPalette)
- `Backspace`: Navigate back (ctx.navigateBack)
- `Space`: Toggle detail panel (open/close)
- `/`: Focus search input
- `Escape`: Close detail panel, clear selection
- `Ctrl+A`: Select all visible files
- `Delete`: Show delete confirmation for selected
- `g` then `l` (chord): Toggle grid/list

Uses `useEffect` with `keydown` listener. Checks for `event.target` to avoid conflicts with input fields.

Approximate size: 80-100 lines

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/useKeyboardShortcuts.ts
git commit -m "feat(drive): add keyboard shortcuts hook"
```

---

## Task 14: Update Barrel Export

**Files:**
- Modify: `src/components/drive/index.ts`

**What:** Export all new components from the barrel file.

Add exports for: DriveProvider, useDriveContext, DriveSidebar, DriveTopBar, DriveBreadcrumbs, DriveFileGrid, DriveFileList, DriveFilters, DriveBatchActions, DriveOverviewDashboard, DriveContentArea, DriveDetailPanel, DriveCommandPalette, DriveDropZone, useKeyboardShortcuts, and all constants/utilities.

**Step 2: Build and verify, commit**

```bash
git add src/components/drive/index.ts
git commit -m "feat(drive): update barrel exports for all new components"
```

---

## Task 15: Rewrite Main Drive Page

**Files:**
- Modify: `src/app/(dashboard)/admin/drive/page.tsx`

**What:** Replace the monolithic 1433-line page with the new component composition. This is the final assembly step.

The new page should be ~50-80 lines:

```tsx
"use client";

import { DriveProvider } from "@/components/drive/DriveContext";
import { DriveSidebar } from "@/components/drive/DriveSidebar";
import { DriveTopBar } from "@/components/drive/DriveTopBar";
import { DriveContentArea } from "@/components/drive/DriveContentArea";
import { DriveDetailPanel } from "@/components/drive/DriveDetailPanel";
import { DriveCommandPalette } from "@/components/drive/DriveCommandPalette";
import { useKeyboardShortcuts } from "@/components/drive/useKeyboardShortcuts";
import { useDriveContext } from "@/components/drive/DriveContext";

function DrivePageInner() {
  useKeyboardShortcuts();
  const { detailPanelFileId } = useDriveContext();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <DriveTopBar />
      <div className="flex flex-1 min-h-0">
        <DriveSidebar />
        <DriveContentArea />
        {detailPanelFileId && <DriveDetailPanel />}
      </div>
      <DriveCommandPalette />
    </div>
  );
}

export default function DrivePage() {
  return (
    <DriveProvider>
      <DrivePageInner />
    </DriveProvider>
  );
}
```

**IMPORTANT:** Before rewriting, move the old page to `page.tsx.bak` as safety backup. After verifying the new page works, delete the backup.

**Step 1: Backup old page**
```bash
cp src/app/(dashboard)/admin/drive/page.tsx src/app/(dashboard)/admin/drive/page.tsx.bak
```

**Step 2: Rewrite page with new composition**

**Step 3: Build and verify**
Run: `npx next build 2>&1 | tail -10`

**Step 4: Commit**
```bash
git add src/app/(dashboard)/admin/drive/page.tsx
git commit -m "feat(drive): rewrite main page with Hub + File Manager layout"
```

---

## Task 16: Verify All Atribuicoes Functional

**What:** Manual verification that all 4 atribuicoes + 2 special folders load correctly.

**Step 1: Check sync folders are registered**
Run SQL or tRPC to verify all 6 folders exist in `driveSyncFolders`:
- JURI: `1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-`
- VVD: `1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti`
- EP: `1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q`
- SUBSTITUICAO: `1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU`
- DISTRIBUICAO: `1dw8Hfpt_NLtLZ8DYDIcgjauo_xtM1nH4`
- JURISPRUDENCIA: `1Dvpn1r6b5nZ3bALst9_YEbZHlRDSPw7S`

**Step 2: Force sync all folders**
Trigger `drive.syncAll` mutation to ensure all have current file listings.

**Step 3: Browser test each atribuicao**
Navigate through each atribuicao in the sidebar, verify files load, breadcrumbs work, detail panel opens.

**Step 4: Commit any fixes**

---

## Task 17: Update DriveStatusBar + DriveTabEnhanced references

**Files:**
- Modify: Components that import old Drive components from assistido/processo pages

**What:** The old `DriveStatusBar` and `DriveTabEnhanced` are used in assistido/processo detail pages. These should continue working — they are independent of the main Drive page redesign. Verify they still render correctly after the refactor.

Check:
- `src/app/(dashboard)/admin/processos/[id]/page.tsx` — imports DriveStatusBar, DriveTabEnhanced
- `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` — imports DriveStatusBar, DriveTabEnhanced

These components should NOT be broken by the refactor since they are separate components. Just verify imports still resolve.

**Step 1: Build and verify**
**Step 2: Commit if any import fixes needed**

---

## Task 18: Final Build + Push

**Step 1: Full build**
Run: `npx next build`
Expected: Clean build with 0 errors

**Step 2: Push to main**
```bash
git push origin main
```

**Step 3: Delete backup**
```bash
rm src/app/(dashboard)/admin/drive/page.tsx.bak
```

---

## Summary

| Task | Component | Lines (est.) | Dependencies |
|------|-----------|-------------|--------------|
| 1 | DriveContext | 150 | None |
| 2 | drive-constants | 120 | None |
| 3 | DriveSidebar | 300 | Tasks 1, 2 |
| 4 | DriveTopBar | 180 | Tasks 1, 2 |
| 5 | DriveBreadcrumbs | 70 | Task 1 |
| 6 | DriveFileGrid + DriveFileList | 400 | Tasks 1, 2 |
| 7 | DriveFilters + DriveBatchActions | 250 | Task 1 |
| 8 | DriveOverviewDashboard | 280 | Tasks 1, 2 |
| 9 | DriveContentArea | 180 | Tasks 5-8 |
| 10 | DriveDetailPanel | 450 | Tasks 1, 2 |
| 11 | DriveCommandPalette | 230 | Task 1 |
| 12 | DriveDropZone | 100 | Task 1 |
| 13 | useKeyboardShortcuts | 90 | Task 1 |
| 14 | Barrel export | 30 | All above |
| 15 | Main page rewrite | 60 | All above |
| 16 | Verify atribuicoes | 0 | Task 15 |
| 17 | Verify external refs | 0 | Task 15 |
| 18 | Final build + push | 0 | All above |

**Total estimated new code:** ~2,900 lines across 15 new files
**Replaced:** 1,433-line monolithic page
**Net gain:** Modular, maintainable, IA-ready architecture
