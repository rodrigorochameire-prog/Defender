import type { VfTipo, VfCluster } from "./tipo-cluster";

export interface Dominio {
  key: string;          // segmento de rota: /admin/carreira/vida-funcional/[key]
  label: string;
  icon: string;         // nome de ícone lucide (resolvido na UI)
  cluster: VfCluster;
  tipos: VfTipo[];      // tipos de evento que pertencem a este domínio
}

export const DOMINIOS: Dominio[] = [
  // cluster ausencias
  { key: "ferias-licencas", label: "Férias / Licenças", icon: "Palmtree", cluster: "ausencias", tipos: ["FERIAS", "LICENCA"] },
  { key: "afastamentos", label: "Afastamentos", icon: "Plane", cluster: "ausencias", tipos: ["AFASTAMENTO"] },
  { key: "designacoes", label: "Designações", icon: "Send", cluster: "ausencias", tipos: ["DESIGNACAO_RELEVANTE"] },
  { key: "convocacoes", label: "Convocações", icon: "Mail", cluster: "ausencias", tipos: ["CONVOCACAO"] },
  { key: "cooperacoes", label: "Cooperações", icon: "Handshake", cluster: "ausencias", tipos: ["COOPERACAO"] },
  // cluster contraprestacao
  { key: "substituicoes-gratificacoes", label: "Substituições / Gratificações", icon: "Coins", cluster: "contraprestacao", tipos: ["SUBSTITUICAO", "GRATIFICACAO"] },
  { key: "trabalho-extra-folgas", label: "Trab. extraordinário & folgas", icon: "Zap", cluster: "contraprestacao", tipos: ["TRABALHO_EXTRAORDINARIO", "FOLGA"] },
  { key: "diarias", label: "Diárias", icon: "Luggage", cluster: "contraprestacao", tipos: ["DIARIA"] },
  { key: "reembolsos", label: "Reembolsos", icon: "Receipt", cluster: "contraprestacao", tipos: ["REEMBOLSO"] },
  // cluster administrativo
  { key: "solicitacoes", label: "Solicitações administrativas", icon: "FileText", cluster: "administrativo", tipos: ["SOLICITACAO_ADM"] },
];

export function getDominio(key: string): Dominio | undefined {
  return DOMINIOS.find((d) => d.key === key);
}

export function dominiosByCluster(cluster: VfCluster): Dominio[] {
  return DOMINIOS.filter((d) => d.cluster === cluster);
}
