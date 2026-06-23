export interface CandidatoPessoa {
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  papel: string;
  lado?: string | null;
  subpapel?: string | null;
  fonteRef: string;
  confianca: number;
}

export interface PessoaExistente {
  id: number;
  nomeNormalizado: string;
  nomesAlternativos: string[];
  cpf: string | null;
  dataNascimento: string | null;
}

export type ResultadoResolucao =
  | { acao: "vincular"; pessoaId: number; confianca: number; motivo: string }
  | { acao: "criar"; confianca: number; motivo: string }
  | { acao: "revisar"; candidatosIds: number[]; confianca: number; motivo: string };

export interface PapelCanonico { papel: string; lado: string | null; subpapel: string | null }
