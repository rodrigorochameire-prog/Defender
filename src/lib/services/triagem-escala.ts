export interface PlantaoMes {
  juri: "Rodrigo" | "Juliane";
  ep: "Rodrigo" | "Juliane";
  vvd: "Rodrigo" | "Juliane";
}

/**
 * Convenção atual (MVP):
 * - Meses ímpares (1,3,5,7,9,11): Rodrigo Júri+EP, Juliane VVD
 * - Meses pares (2,4,6,8,10,12): invertido
 *
 * Substituições (férias/licenças) virão da Cowork.Coberturas em fase 2.
 */
export function defensoresPlantaoNoMes(_year: number, month: number): PlantaoMes {
  const isPar = month % 2 === 0;
  return isPar
    ? { juri: "Juliane", ep: "Juliane", vvd: "Rodrigo" }
    : { juri: "Rodrigo", ep: "Rodrigo", vvd: "Juliane" };
}

export function defensorTitularPorVara(vara: string): string | null {
  const map: Record<string, string> = {
    "1ª Crime": "Cristiane",
    "1a Crime": "Cristiane",
    "2ª Crime": "Danilo",
    "2a Crime": "Danilo",
  };
  return map[vara] ?? null;
}

export interface EscalaMes {
  ano: number;
  mes: number;
  juri: string;
  ep: string;
  vvd: string;
  vara1Crime: string;
  vara2Crime: string;
  substituicoes: { defensor: string; tipo: string; inicio: string; fim: string; substituto?: string }[];
}

export function montarEscalaMes(year: number, month: number): EscalaMes {
  const p = defensoresPlantaoNoMes(year, month);
  return {
    ano: year,
    mes: month,
    juri: p.juri,
    ep: p.ep,
    vvd: p.vvd,
    vara1Crime: "Cristiane",
    vara2Crime: "Danilo",
    substituicoes: [],
  };
}
