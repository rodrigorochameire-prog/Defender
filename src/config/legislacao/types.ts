export type TipoEstrutura = "parte" | "livro" | "titulo" | "capitulo" | "secao" | "subsecao";

export type Dispositivo = {
  id: string;
  numero: string;
  texto: string;
  alineas?: Dispositivo[];
  itens?: Dispositivo[];
};

export type VersaoArtigo = {
  versao: number;
  texto: string;
  textoAnterior?: string;
  redacaoDadaPor: { lei: string; artigo: string } | null;
  publicadoEm: string;
  vigenteDesde: string;
  vigenteAte: string | null;
};

export type Artigo = {
  tipo: "artigo";
  id: string;
  numero: string;
  caput: string;
  rubrica?: string;
  paragrafos: Dispositivo[];
  incisos: Dispositivo[];
  referencias: string[];
  historico: VersaoArtigo[];
};

export type NodoEstrutura = {
  tipo: TipoEstrutura;
  nome: string;
  filhos: (NodoEstrutura | Artigo)[];
};

export type Legislacao = {
  id: string;
  nome: string;
  nomeAbreviado: string;
  referencia: string;
  fonte: string;
  dataUltimaAtualizacao: string;
  estrutura: NodoEstrutura[];
};

export type LegislacaoMeta = {
  id: string;
  nome: string;
  nomeAbreviado: string;
  referencia: string;
  fonte: string;
  dataUltimaAtualizacao: string;
  totalArtigos: number;
  cor: string;
};
