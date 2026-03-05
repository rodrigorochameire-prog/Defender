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
  rootSyncFolderId: string | null;           // root sync folder driveId (stays constant during subfolder nav)
  breadcrumbPath: BreadcrumbItem[];

  // View
  viewMode: "grid" | "list" | "compact";
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
  setViewMode: (mode: "grid" | "list" | "compact") => void;
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
  const [rootSyncFolderId, setRootSyncFolderId] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);
  const [viewMode, setViewModeState] = useState<"grid" | "list" | "compact">(
    () => (typeof window !== "undefined" ? (localStorage.getItem("drive-view-mode") as "grid" | "list" | "compact") || "grid" : "grid")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFiltersState] = useState<DriveFilters>({ type: null, dateRange: null, enrichmentStatus: null });
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [detailPanelFileId, setDetailPanelFileId] = useState<number | null>(null);

  const navigateToFolder = useCallback((folderId: string, folderName: string) => {
    setSelectedFolderId(folderId);
    // First navigation sets the root sync folder; subsequent navigations keep it
    setRootSyncFolderId(prev => prev || folderId);
    setBreadcrumbPath(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
    setSearchQuery("");
  }, []);

  const navigateBack = useCallback(() => {
    setBreadcrumbPath(prev => {
      if (prev.length <= 1) {
        setSelectedFolderId(null);
        setRootSyncFolderId(null);
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
    setRootSyncFolderId(null);
    setBreadcrumbPath([]);
    setSelectedFileIds(new Set());
    setDetailPanelFileId(null);
    setSearchQuery("");
  }, []);

  const setViewMode = useCallback((mode: "grid" | "list" | "compact") => {
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
      selectedAtribuicao, selectedFolderId, rootSyncFolderId, breadcrumbPath,
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
