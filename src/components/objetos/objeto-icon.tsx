"use client";

import {
  Crosshair,
  Pill,
  Car,
  Smartphone,
  Banknote,
  Gem,
  FileText,
  Package,
  type LucideIcon,
} from "lucide-react";

/** Tipos de objeto apreendido (Fase V). Espelha o enum `objeto_tipo`. */
export type ObjetoTipo =
  | "arma-fogo"
  | "arma-branca"
  | "droga"
  | "veiculo"
  | "celular"
  | "dinheiro"
  | "joia"
  | "documento"
  | "outro-bem";

const ICON_BY_TIPO: Record<string, LucideIcon> = {
  "arma-fogo": Crosshair,
  "arma-branca": Crosshair,
  droga: Pill,
  veiculo: Car,
  celular: Smartphone,
  dinheiro: Banknote,
  joia: Gem,
  documento: FileText,
  "outro-bem": Package,
};

const LABEL_BY_TIPO: Record<string, string> = {
  "arma-fogo": "Arma de fogo",
  "arma-branca": "Arma branca",
  droga: "Droga",
  veiculo: "Veículo",
  celular: "Celular",
  dinheiro: "Dinheiro",
  joia: "Joia",
  documento: "Documento",
  "outro-bem": "Outro bem",
};

export function objetoIconFor(tipo: string | null | undefined): LucideIcon {
  return (tipo && ICON_BY_TIPO[tipo]) || Package;
}

export function objetoLabelFor(tipo: string | null | undefined): string {
  return (tipo && LABEL_BY_TIPO[tipo]) || "Objeto";
}

export const TIPO_OPTIONS: { value: ObjetoTipo; label: string }[] = (
  Object.keys(LABEL_BY_TIPO) as ObjetoTipo[]
).map((value) => ({ value, label: LABEL_BY_TIPO[value] }));
