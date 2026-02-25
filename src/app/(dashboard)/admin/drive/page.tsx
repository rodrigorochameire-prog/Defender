"use client";

import { DriveProvider, useDriveContext } from "@/components/drive/DriveContext";
import { DriveSidebar } from "@/components/drive/DriveSidebar";
import { DriveTopBar } from "@/components/drive/DriveTopBar";
import { DriveContentArea } from "@/components/drive/DriveContentArea";
import { DriveDetailPanel } from "@/components/drive/DriveDetailPanel";
import { DriveCommandPalette } from "@/components/drive/DriveCommandPalette";
import { useKeyboardShortcuts } from "@/components/drive/useKeyboardShortcuts";

function DrivePageInner() {
  const { detailPanelFileId } = useDriveContext();
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950">
      <DriveTopBar />
      <div className="flex flex-1 min-h-0">
        <DriveSidebar />
        <DriveContentArea />
        {detailPanelFileId !== null && <DriveDetailPanel />}
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
