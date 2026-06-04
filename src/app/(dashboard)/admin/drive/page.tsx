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
import { HeaderSlotTitle } from "@/components/layouts/header-slot-title";

function DrivePageInner() {
  const { detailPanelFileId } = useDriveContext();
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-[#0f0f11]">
      {/* Padrão Defender v5 seamless — título na utility bar, ações + status no bottomRow.
          DriveTopBar (row2 + row1-actions) compartilha state via React Query dedup. */}
      <HeaderSlotTitle
        icon={FolderOpen}
        title="Drive"
        stats={<span className="text-white/55">7ª Regional · Camaçari</span>}
      />

      <CollapsiblePageHeader
        title="Drive"
        icon={FolderOpen}
        seamless
        bottomRow={
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <DriveTopBar variant="row2" />
            </div>
            <DriveTopBar variant="row1-actions" />
          </div>
        }
      />

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
