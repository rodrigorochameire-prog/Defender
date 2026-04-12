"use client";

import { FolderOpen } from "lucide-react";
import { DriveProvider, useDriveContext } from "@/components/drive/DriveContext";
import { DriveSidebar } from "@/components/drive/DriveSidebar";
import { DriveTopBar } from "@/components/drive/DriveTopBar";
import { DriveContentArea } from "@/components/drive/DriveContentArea";
import { DriveDetailPanel } from "@/components/drive/DriveDetailPanel";
import { DriveCommandPalette } from "@/components/drive/DriveCommandPalette";
import { useKeyboardShortcuts } from "@/components/drive/useKeyboardShortcuts";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";

function DrivePageInner() {
  const { detailPanelFileId } = useDriveContext();
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-[#0f0f11]">
      {/* Page header Padrão Defender v5 — DriveTopBar absorvido via variants.
          Row 1 (children) = icon + title + actions (Upload, Nova Pasta, Overflow).
          Row 2 (bottomRow) = sync status + stats + search + view toggle.
          Duas instâncias compartilham state via React Query dedup (sem custo extra). */}
      <CollapsiblePageHeader
        title="Drive"
        icon={FolderOpen}
        bottomRow={<DriveTopBar variant="row2" />}
      >
        <DriveTopBar variant="row1" />
      </CollapsiblePageHeader>

      {/* Drive layout (sidebar + content) — ocupa o resto da viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <DriveSidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div className="flex flex-1 min-h-0">
            <DriveContentArea />
            {detailPanelFileId !== null && <DriveDetailPanel />}
          </div>
        </div>
        <DriveCommandPalette />
      </div>
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
