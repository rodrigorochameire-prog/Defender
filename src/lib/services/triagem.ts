export function generateTccRef(year: number, seq: number): string {
  if (year < 2020 || year > 2099) {
    throw new Error(`Ano inválido: ${year}`);
  }
  return `TCC-${year}-${String(seq).padStart(4, "0")}`;
}

const URGENCIA_NAO = new Set(["Não", "Nao", "", "false", "0"]);

export interface NormalizedPayload {
  assistidoNome: string;
  assistidoTelefone?: string;
  assistidoCpf?: string;
  compareceu: "proprio" | "familiar" | "outro";
  familiarNome?: string;
  familiarTelefone?: string;
  familiarGrau?: string;
  processoCnj?: string;
  situacao?: string;
  vara?: string;
  urgencia: boolean;
  urgenciaMotivo?: string;
  documentoEntregue: string;
  demandaLivre?: string;
}

const COMPARECEU_VALID = new Set(["proprio", "familiar", "outro"]);

export function normalizePayload(raw: Record<string, unknown>): NormalizedPayload {
  const nome = String(raw.assistido_nome ?? "").trim();
  if (!nome) throw new Error("assistido_nome é obrigatório");

  const compareceuRaw = String(raw.compareceu ?? "proprio").toLowerCase();
  const compareceu = COMPARECEU_VALID.has(compareceuRaw)
    ? (compareceuRaw as "proprio" | "familiar" | "outro")
    : "proprio";

  const urgenciaRaw = String(raw.urgencia ?? "Não");
  const urgencia = !URGENCIA_NAO.has(urgenciaRaw);

  let processoCnj: string | undefined;
  if (raw.processo_cnj) {
    const digits = String(raw.processo_cnj).replace(/\D/g, "");
    if (digits.length !== 20) {
      throw new Error(`CNJ inválido: precisa ter 20 dígitos, recebido ${digits.length}`);
    }
    processoCnj = digits;
  }

  return {
    assistidoNome: nome,
    assistidoTelefone: raw.telefone ? String(raw.telefone) : undefined,
    assistidoCpf: raw.cpf ? String(raw.cpf) : undefined,
    compareceu,
    familiarNome: raw.familiar_nome ? String(raw.familiar_nome) : undefined,
    familiarTelefone: raw.familiar_telefone ? String(raw.familiar_telefone) : undefined,
    familiarGrau: raw.familiar_grau ? String(raw.familiar_grau) : undefined,
    processoCnj,
    situacao: raw.situacao ? String(raw.situacao) : undefined,
    vara: raw.vara ? String(raw.vara) : undefined,
    urgencia,
    urgenciaMotivo: urgencia ? urgenciaRaw : undefined,
    documentoEntregue: String(raw.documento_entregue ?? "Nenhum"),
    demandaLivre: raw.demanda ? String(raw.demanda) : undefined,
  };
}

export interface AutoResolveInput {
  documentoEntregue: string;
  demandaLivre: string | null | undefined;
}

export function shouldAutoResolve({ documentoEntregue, demandaLivre }: AutoResolveInput): boolean {
  if (documentoEntregue === "Nenhum" || !documentoEntregue) return false;
  const len = (demandaLivre ?? "").trim().length;
  return len < 30;
}
