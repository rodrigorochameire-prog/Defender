import type { ReactNode } from "react";

export type SecaoId =
  | "registros"
  | "proxima-audiencia"
  | "identificacao"
  | "cronologia"
  | "oficio"
  | "autos"
  | "recursos";

/** Ordem default do corpo do sheet de Demandas. */
export const SECOES_DEMANDA: SecaoId[] = [
  "registros",
  "proxima-audiencia",
  "identificacao",
  "cronologia",
  "oficio",
  "autos",
  "recursos",
];

/** v1: ordem única. Gancho para manifestos por atribuição no futuro. */
export function resolverManifesto(): SecaoId[] {
  return SECOES_DEMANDA;
}

export interface SecaoEntry {
  label: string;
  temDado: boolean;
  count?: number;
  node: ReactNode;
}

export type SecoesMap = Record<SecaoId, SecaoEntry>;

export interface ToCSection {
  id: string;
  label: string;
  count?: number;
}

/** ToC e corpo derivam disto — filtra seções sem dado, preserva a ordem. */
export function toToCSections(manifesto: SecaoId[], map: SecoesMap): ToCSection[] {
  return manifesto
    .filter((id) => map[id].temDado)
    .map((id) => ({ id, label: map[id].label, count: map[id].count }));
}
