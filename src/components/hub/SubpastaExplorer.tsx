"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type DriveFile = {
  id: number;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  isFolder: boolean | null;
  parentFileId: number | null;
  driveFolderId: string | null;
};

function buildTree(files: DriveFile[]): { roots: DriveFile[]; children: Map<number, DriveFile[]> } {
  const children = new Map<number, DriveFile[]>();
  const roots: DriveFile[] = [];

  for (const f of files) {
    if (f.parentFileId == null) {
      roots.push(f);
    } else {
      const list = children.get(f.parentFileId) ?? [];
      list.push(f);
      children.set(f.parentFileId, list);
    }
  }

  return { roots, children };
}

function FileNode({
  file,
  nodeChildren,
  allChildren,
  depth = 0,
}: {
  file: DriveFile;
  nodeChildren: DriveFile[];
  allChildren: Map<number, DriveFile[]>;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFolder = file.isFolder;
  const hasChildren = nodeChildren.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer group",
          { "cursor-default": !isFolder && !file.webViewLink }
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (isFolder && hasChildren) setExpanded((e) => !e);
          else if (file.webViewLink) window.open(file.webViewLink, "_blank");
        }}
      >
        {isFolder ? (
          <>
            {hasChildren ? (
              expanded ? <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
            ) : (
              <span className="w-3 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </>
        )}
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">{file.name}</span>
        {!isFolder && file.webViewLink && (
          <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
        )}
      </div>
      {isFolder && expanded && hasChildren && (
        <div>
          {nodeChildren.map((child) => (
            <FileNode
              key={child.id}
              file={child}
              nodeChildren={allChildren.get(child.id) ?? []}
              allChildren={allChildren}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SubpastaExplorer({ files }: { files: DriveFile[] }) {
  const { roots, children } = buildTree(files);

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <Folder className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-[11px]">Nenhum arquivo no Drive</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {roots.map((f) => (
        <FileNode
          key={f.id}
          file={f}
          nodeChildren={children.get(f.id) ?? []}
          allChildren={children}
        />
      ))}
    </div>
  );
}
