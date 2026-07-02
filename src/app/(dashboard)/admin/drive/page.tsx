"use client";

import { FolderOpen } from "lucide-react";
import { DriveProvider, useDriveContext } from "@/components/drive/DriveContext";
import { DriveSidebar } from "@/components/drive/DriveSidebar";
import { DriveTopBar } from "@/components/drive/DriveTopBar";
import { DriveContentArea } from "@/components/drive/DriveContentArea";
import { DriveDetailPanel } from "@/components/drive/DriveDetailPanel";
import { DriveCommandPalette } from "@/components/drive/DriveCommandPalette";
import { useKeyboardShortcuts } from "@/components/drive/useKeyboardShortcuts";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";

function DrivePageInner() {
  const { detailPanelFileId } = useDriveContext();
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-neutral-50 dark:bg-background">
      {/* Header rico (Lote D) — DriveTopBar mantido como bloco único no `actions`
          do shell (decisão documentada no report: dissolução total em
          HeaderAction[] arriscaria regressão, DriveTopBar já tem responsividade
          e overflow próprios — SyncHealthDot, OverflowMenu, busca expansível).
          row2 (status/contadores/busca/view toggle) + row1-actions (Processar/
          Upload/Nova Pasta/Overflow) seguem intocados, só remontados aqui. */}
      <GlassHeaderShell
        title="Drive"
        icon={FolderOpen}
        stats={<span className="text-white/55 text-[11px] hidden sm:inline whitespace-nowrap">7ª Regional · Camaçari</span>}
        actions={
          <div className="flex items-center justify-end gap-3 min-w-0 flex-1">
            <div className="flex-1 min-w-0 max-w-xl">
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
