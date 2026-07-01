export const OPEN_COMMAND_PALETTE_EVENT = "ombuds:open-command-palette";

/** Opens the global command palette (search overlay) from anywhere. */
export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

/** Subscribe to open requests. Returns an unsubscribe function. */
export function onOpenCommandPalette(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
  return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
}
