// Configuração de tipos de atos específicos por atribuição

export const ATOS_POR_ATRIBUICAO: Record<string, string[]> = {
  "Tribunal do Júri": [
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Contrarrazões de apelação",
    "Razões de apelação",
    "RESE",
    "Razões de RESE",
    "Contrarrazões de RESE",
    "Diligências do 422",
    "Incidente de insanidade",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Relaxamento e revogação de prisão",
    "Revogação do monitoramento",
    "Habeas Corpus",
    "Restituição de coisa",
    "Ofício",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência da pronúncia",
    "Ciência da impronúncia",
    "Ciência da absolvição",
    "Ciência desclassificação",
    "Ciência da prescrição",
    "Ciência laudo de exame",
    "Ciência revogação prisão",
    "Ciência",
    "Outro",
    "Desaforamento",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço"
  ],

  "Violência Doméstica": [
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de RESE",
    "Contrarrazões de ED",
    "Incidente de insanidade",
    "Revogação de MPU",
    "Modulação de MPU",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Revogação e relaxamento de prisão",
    "Substituição da prisão por cautelar",
    "Habeas Corpus",
    "Revogação de monitoramento",
    "Requerimento de progressão",
    "Requerimento audiência",
    "Mandado de Segurança",
    "Quesitos",
    "Ciência absolvição",
    "Ciência condenação",
    "Ciência de sentença",
    "Ciência de extinção processual",
    "Ciência de prescrição",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência acórdão",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço",
    "Juntada de documentos"
  ],

  "Execução Penal": [
    "Designação de justificação",
    "Designação admonitória",
    "Transferência de unidade",
    "Requerimento de progressão",
    "Indulto",
    "Petição intermediária",
    "Agravo em Execução",
    "Manifestação contra reconversão",
    "Manifestação contra regressão",
    "Atualização de endereço",
    "Ciência",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência de reconversão",
    "Outro",
    "Ciência cumprimento",
    "Ciência morte",
    "Cumprimento ANPP",
    "Ciência regressão de regime",
    "Ciência indulto",
    "Ciência prescrição",
    "Juntada de documentos"
  ],

  "Substituição Criminal": [
    "Resposta à Acusação",
    "Memoriais",
    "RESE",
    "Diligências do 422",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de RESE",
    "Petição intermediária",
    "Relaxamento",
    "Revogação",
    "Relaxamento e revogação",
    "Revogação de MPU",
    "Habeas Corpus",
    "Mandado de Segurança",
    "Testemunhas",
    "Endereço do réu",
    "Outros",
    "Ciência de condenação",
    "Ciência da absolvição",
    "Ciência da pronúncia",
    "Ciência do acórdão",
    "Ciência da extinção do processo",
    "Ciência",
    "Ciência LP",
    "Ciência habilitação DPE",
    "Ciência audiência",
    "Ciência Júri",
    "Ciência da revogação",
    "Ciência da redesignação",
    "Ciência constituição"
  ],

  "Curadoria": [
    "Contestação",
    "Alegações finais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Embargos de Declaração",
    "Contrarrazões de ED",
    "Ciência de sentença",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência acórdão",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço"
  ],

  "Criminal Geral": [
    "Atendimento Inicial",
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "RESE",
    "Razões de RESE",
    "Contrarrazões de RESE",
    "Embargos de Declaração",
    "Contrarrazões de ED",
    "Diligências do réu",
    "Incidente de insanidade",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Relaxamento e revogação de prisão",
    "Habeas Corpus",
    "Mandado de Segurança",
    "Ofício",
    "Rol de Testemunhas",
    "Quesitos",
    "Ciência de sentença",
    "Ciência da absolvição",
    "Ciência da condenação",
    "Ciência da pronúncia",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço",
    "Juntada de documentos"
  ]
};

// Lista de todas as atribuições disponíveis
export const ATRIBUICOES = Object.keys(ATOS_POR_ATRIBUICAO);

// Função auxiliar para obter atos por atribuição
export function getAtosPorAtribuicao(atribuicao: string): Array<{ value: string; label: string }> {
  const atos = ATOS_POR_ATRIBUICAO[atribuicao] || [];
  
  // Adicionar "Todos" no início para filtros
  return [
    { value: "Todos", label: "Todos" },
    ...atos.map(ato => ({ value: ato, label: ato }))
  ];
}

// Função para obter todos os atos únicos (para quando não há atribuição selecionada)
export function getTodosAtosUnicos(): Array<{ value: string; label: string }> {
  const atosSet = new Set<string>();
  
  Object.values(ATOS_POR_ATRIBUICAO).forEach(atos => {
    atos.forEach(ato => atosSet.add(ato));
  });
  
  const atosArray = Array.from(atosSet).sort();
  
  return [
    { value: "Todos", label: "Todos" },
    ...atosArray.map(ato => ({ value: ato, label: ato }))
  ];
}

// Função para validar se um ato pertence a uma atribuição
export function atoValidoParaAtribuicao(ato: string, atribuicao: string): boolean {
  const atos = ATOS_POR_ATRIBUICAO[atribuicao];
  if (!atos) return true; // Se não há lista de atos, aceita qualquer um
  return atos.includes(ato);
}

// Estatísticas
export const ESTATISTICAS_ATOS = {
  "Tribunal do Júri": 32,
  "Violência Doméstica": 33,
  "Execução Penal": 22,
  "Substituição Criminal": 31,
  "Curadoria": 15,
  "Criminal Geral": 35
};

// Total de atos únicos no sistema
export const getTotalAtosUnicos = (): number => {
  return getTodosAtosUnicos().length - 1; // -1 para excluir "Todos"
};