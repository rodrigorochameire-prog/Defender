"use client";

import { useSyncExternalStore } from "react";

interface PrepararAudienciasState {
  isOpen: boolean;
}

let state: PrepararAudienciasState = {
  isOpen: false,
};

const listeners = new Set<() => void>();

function setState(partial: Partial<PrepararAudienciasState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export const prepararAudienciasActions = {
  open: () => setState({ isOpen: true }),
  close: () => setState({ isOpen: false }),
  setOpen: (isOpen: boolean) => setState({ isOpen }),
  getState: () => state,
};

export function usePrepararAudiencias() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snap, ...prepararAudienciasActions };
}
