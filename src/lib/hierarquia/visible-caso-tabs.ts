import type { Area } from "./infer-caso-area";

export interface CasoTab {
  key: string;
  label: string;
}

const SEMPRE: CasoTab[] = [
  { key: "geral",         label: "Geral" },
  { key: "processos",     label: "Processos" },
  { key: "pessoas",       label: "Pessoas" },
  { key: "cronologia",    label: "Cronologia" },
  { key: "audiencias",    label: "Audiências" },
  { key: "atendimentos",  label: "Atendimentos" },
  { key: "documentos",    label: "Documentos" },
  { key: "midias",        label: "Mídias" },
  { key: "demandas",      label: "Demandas" },
  { key: "oficios",       label: "Ofícios" },
  { key: "investigacao",  label: "Investigação" },
];

const AREA_GRUPOS_PENAL = new Set<Area>([
  "JURI","CRIMINAL","SUBSTITUICAO","EXECUCAO_PENAL","VIOLENCIA_DOMESTICA",
]);
const AREA_GRUPOS_ANPP  = new Set<Area>([
  "JURI","CRIMINAL","SUBSTITUICAO",
]);

export function computeVisibleCasoTabs(area: Area): CasoTab[] {
  const tabs: CasoTab[] = [...SEMPRE];

  if (AREA_GRUPOS_PENAL.has(area)) {
    tabs.push({ key: "delitos", label: "Delitos" });
  }
  if (AREA_GRUPOS_ANPP.has(area)) {
    tabs.push({ key: "institutos", label: "Institutos" });
  }
  if (area === "VIOLENCIA_DOMESTICA") {
    tabs.push({ key: "mpu", label: "MPU" });
  }
  if (area === "EXECUCAO_PENAL") {
    tabs.push({ key: "execucao-penal", label: "Execução Penal" });
  }
  if (area === "INFANCIA_JUVENTUDE") {
    tabs.push({ key: "atos-infracionais", label: "Atos Infracionais" });
  }

  return tabs;
}
