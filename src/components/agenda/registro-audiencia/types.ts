export interface Depoente {
  id: string;
  nome: string;
  tipo: "testemunha" | "vitima" | "reu" | "perito" | "informante" | "policial";
  lado?: "acusacao" | "defesa";
  intimado: boolean;
  presente: boolean;
  statusIntimacao?:
    | "intimado"
    | "intimado-pessoalmente"
    | "intimado-advogado"
    | "intimado-edital"
    | "nao-intimado"
    | "sem-diligencia"
    | "frustrada"
    | "frustrada-nao-localizado"
    | "frustrada-endereco-incorreto"
    | "frustrada-mudou"
    | "mp-desistiu"
    | "dispensado"
    | "pendente";
  teorCertidao?: string;
  dataCertidao?: string;
  motivoAusencia?: string;
  jaOuvido?: "delegacia" | "audiencia-anterior" | "juizo-anterior" | "ambos" | "nenhum";
  depoimentoDelegacia?: string;
  depoimentoAnterior?: string;
  pontosFortes?: string;
  pontosFracos?: string;
  estrategiaInquiricao: string;
  perguntasDefesa: string;
  depoimentoLiteral: string;
  analisePercepcoes: string;
  tipoTestemunha?: "ocular" | "ouvir-dizer" | "conduta" | "informante";
  testemunhaOcularViu?: "fato-objeto" | "indicios";
  testemunhaOuvirDizerFonte?: "fonte-direta" | "rumores";
  testemunhaOuvirDizerInformaramAutoria?: boolean;
  testemunhaCondutaCarater?: "favoravel" | "desfavoravel";
  reconheceuAssistido?: boolean;
  vitimaViuAutor?: boolean;
  vitimaReconheceuAutor?: boolean;
  vitimaReconciliada?: boolean;
  vitimaEstadoEmocional?: "em-paz" | "com-raiva";
  vitimaContradicoes?: string;
  reuConfessouDelegacia?: "sim" | "nao" | "em-parte";
  reuSilencio?: boolean;
  reuRetratou?: boolean;
  reuMotivoRetracao?: "tortura" | "falsidade-relato" | "inducao";
  reuInformouAlibi?: boolean;
  reuSabeAlgoFato?: boolean;
  reuSabeOQueIncriminou?: boolean;
}

export interface RegistroAudienciaData {
  eventoId: string;
  dataRealizacao: string;
  realizada: boolean;
  motivoNaoRealizacao?: string;
  assistidoCompareceu: boolean;
  resultado: string;
  motivoRedesignacao?: string;
  tipoExtincao?: string;
  depoentes: Depoente[];
  atendimentoReuAntes: string;
  estrategiasDefesa: string;
  manifestacaoMP: string;
  manifestacaoDefesa: string;
  decisaoJuiz: string;
  encaminhamentos: string;
  anotacoesGerais: string;
  registradoPor: string;
  dataRegistro: string;
  dataRedesignacao?: string;
  horarioRedesignacao?: string;
  processoId?: string;
  casoId?: string;
  assistidoId?: string;
  historicoId?: string;
}
