"use client";

import { useSyncExternalStore } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  skillId?: string;
  data?: unknown;
  timestamp: Date;
}

interface ChatPanelState {
  isOpen: boolean;
  messages: ChatMessage[];
  assistidoId: number | null;
  assistidoNome: string | null;
}

// Module-level store (replaces zustand when not installed)
let state: ChatPanelState = {
  isOpen: false,
  messages: [],
  assistidoId: null,
  assistidoNome: null,
};

const listeners = new Set<() => void>();

function setState(partial: Partial<ChatPanelState> | ((s: ChatPanelState) => Partial<ChatPanelState>)) {
  const next = typeof partial === "function" ? partial(state) : partial;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// Static actions (callable outside React — e.g., event handlers)
export const chatPanelActions = {
  toggle: () => setState((s) => ({ isOpen: !s.isOpen })),
  open: () => setState({ isOpen: true }),
  close: () => setState({ isOpen: false }),
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) =>
    setState((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    })),
  setAssistido: (id: number | null, nome: string | null) =>
    setState({ assistidoId: id, assistidoNome: nome, messages: [] }),
  clearMessages: () => setState({ messages: [] }),
  getState: () => state,
};

// React hook
export function useChatPanel() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snap,
    ...chatPanelActions,
  };
}

// Zustand-compatible static accessor (used in admin-sidebar.tsx button onClick)
useChatPanel.getState = () => state;
