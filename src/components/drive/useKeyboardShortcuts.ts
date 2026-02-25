import { useEffect, useState, useCallback, useRef } from "react";
import { useDriveContext } from "./DriveContext";

// ─── Types ──────────────────────────────────────────────────────────

interface UseKeyboardShortcutsOptions {
  fileIds?: number[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function isInputTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  // Also check for cmdk input (command palette)
  if (target.getAttribute("cmdk-input") !== null) return true;
  return false;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions) {
  const ctx = useDriveContext();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending key after 500ms
  const startChord = useCallback((key: string) => {
    setPendingKey(key);
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
    }
    pendingTimeoutRef.current = setTimeout(() => {
      setPendingKey(null);
    }, 500);
  }, []);

  const clearChord = useCallback(() => {
    setPendingKey(null);
    if (pendingTimeoutRef.current) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if target is an input element
      if (isInputTarget(e.target)) return;

      // Detect platform modifier
      const isMac =
        navigator.platform?.toLowerCase().includes("mac") ||
        navigator.userAgent?.toLowerCase().includes("mac");
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // ── Ctrl+K / Cmd+K is handled by DriveCommandPalette ──
      // ── Delete is intentionally not implemented (dangerous without confirmation) ──

      // ── Ctrl+A / Cmd+A: Select all visible files ──
      if (modKey && e.key === "a") {
        e.preventDefault();
        if (options?.fileIds && options.fileIds.length > 0) {
          ctx.selectAllFiles(options.fileIds);
        }
        return;
      }

      // Skip other shortcuts if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // ── Chord: g then l → toggle view mode ──
      if (pendingKey === "g" && e.key === "l") {
        e.preventDefault();
        clearChord();
        ctx.setViewMode(ctx.viewMode === "grid" ? "list" : "grid");
        return;
      }

      // ── Start chord on "g" ──
      if (e.key === "g") {
        startChord("g");
        return;
      }

      // Clear any pending chord if a different key is pressed
      if (pendingKey) {
        clearChord();
      }

      switch (e.key) {
        // ── Backspace: Navigate back ──
        case "Backspace": {
          e.preventDefault();
          ctx.navigateBack();
          break;
        }

        // ── Space: Toggle detail panel ──
        case " ": {
          e.preventDefault();
          if (ctx.detailPanelFileId !== null) {
            // Panel is open — close it
            ctx.closeDetailPanel();
          } else if (ctx.selectedFileIds.size > 0) {
            // Open detail panel for the first selected file
            const firstId = Array.from(ctx.selectedFileIds)[0];
            ctx.openDetailPanel(firstId);
          }
          break;
        }

        // ── Slash: Focus search input ──
        case "/": {
          e.preventDefault();
          // Dispatch a custom event that the search input can listen for
          window.dispatchEvent(new CustomEvent("drive:focus-search"));
          break;
        }

        // ── Escape: Close detail panel + clear selection ──
        case "Escape": {
          ctx.closeDetailPanel();
          ctx.clearSelection();
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [ctx, options?.fileIds, pendingKey, startChord, clearChord]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);
}
