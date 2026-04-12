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
      {/* Header — Padrão Defender v5 */}
      <CollapsiblePageHeader title="Drive" icon={FolderOpen}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Drive</h1>
            <span className="text-[10px] text-white/55">
              Arquivos e pastas dos assistidos e processos
            </span>
          </div>
        </div>
      </CollapsiblePageHeader>

      {/* Drive layout (sidebar + content) — ocupa o resto da viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Sidebar */}
        <DriveSidebar />
        {/* Content column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <DriveTopBar />
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
