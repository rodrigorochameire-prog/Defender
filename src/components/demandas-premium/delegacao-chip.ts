export type TomChip = "a_delegar" | "ativo" | "concluida";

const WORK_LABEL: Record<string, string> = {
  pendente: "enviado",
  aceita: "aceita",
  em_andamento: "em andamento",
  aguardando_revisao: "aguardando revisão",
  devolvida: "devolvida",
  revisado: "concluída",
  protocolado: "concluída",
  concluida: "concluída",
};

const TERMINAIS = new Set(["revisado", "protocolado", "concluida"]);

type ChipResult = { texto: string; tom: TomChip };

/** Texto + tom do chip de delegação. Null quando a demanda não está delegada. */
export function rotuloDelegacaoChip(p: {
  statusDelegacao: "a_delegar" | "delegado";
  delegacaoWorkStatus?: string | null;
  nome: string;
}): ChipResult;
export function rotuloDelegacaoChip(p: {
  statusDelegacao?: string | null;
  delegacaoWorkStatus?: string | null;
  nome: string;
}): ChipResult | null;
export function rotuloDelegacaoChip(p: {
  statusDelegacao?: string | null;
  delegacaoWorkStatus?: string | null;
  nome: string;
}): ChipResult | null {
  // Rótulo enxuto: o ícone (UserPlus) já comunica que é delegação; o texto
  // traz só o primeiro nome + o andamento, sem o verbo "Delegado/Delegada"
  // (some o descompasso de gênero e fica mais sutil junto ao status).
  const primeiro = p.nome.split(" ")[0] || p.nome;
  if (p.statusDelegacao === "a_delegar") {
    return { texto: `${primeiro} · a delegar`, tom: "a_delegar" };
  }
  if (p.statusDelegacao === "delegado") {
    const ws = p.delegacaoWorkStatus;
    if (ws && TERMINAIS.has(ws)) {
      return { texto: `${primeiro} · concluída`, tom: "concluida" };
    }
    if (ws && WORK_LABEL[ws]) {
      return { texto: `${primeiro} · ${WORK_LABEL[ws]}`, tom: "ativo" };
    }
    return { texto: primeiro, tom: "ativo" };
  }
  return null;
}
