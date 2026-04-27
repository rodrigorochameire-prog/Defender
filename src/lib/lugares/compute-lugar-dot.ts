export type LugarDotLevel = "none" | "subtle" | "normal" | "amber" | "red";

export interface LugarSignal {
  lugarId: number;
  bairro: string | null;
  totalProcessos: number;
  recentes12m: number;
  totalParticipacoes: number;
  bairroTotal12m: number;
}

export function computeLugarDotLevel(s: LugarSignal): LugarDotLevel {
  if (s.totalProcessos >= 5) return "red";          // muito recorrente
  if (s.bairroTotal12m >= 5) return "amber";        // bairro hot zone
  if (s.totalProcessos >= 3) return "normal";
  if (s.totalProcessos >= 2) return "subtle";
  return "none";
}
