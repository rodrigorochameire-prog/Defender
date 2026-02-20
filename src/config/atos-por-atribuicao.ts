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

// Prioridade de atos para ordenação (do mais importante/urgente ao mais trivial)
// Peso baixo = mais importante = aparece primeiro em ordem ascendente
export const ATO_PRIORITY: Record<string, number> = {
  // Atos processuais urgentes
  "Habeas Corpus": 1,
  "Mandado de Segurança": 2,
  "Resposta à Acusação": 3,
  "Apelação": 4,
  "Alegações finais": 5,
  "Memoriais": 6,
  "RESE": 7,
  "Contestação": 8,
  // Recursos e razões
  "Razões de apelação": 10,
  "Contrarrazões de apelação": 11,
  "Razões de RESE": 12,
  "Contrarrazões de RESE": 13,
  "Embargos de Declaração": 14,
  "Contrarrazões de ED": 15,
  "Agravo em Execução": 16,
  // Prisão e liberdade
  "Revogação da prisão": 20,
  "Relaxamento da prisão": 21,
  "Relaxamento e revogação de prisão": 22,
  "Relaxamento e revogação": 22,
  "Substituição da prisão por cautelar": 23,
  "Revogação de MPU": 24,
  "Modulação de MPU": 25,
  "Revogação do monitoramento": 26,
  "Revogação de monitoramento": 26,
  // Execução penal
  "Requerimento de progressão": 30,
  "Designação de justificação": 31,
  "Designação admonitória": 32,
  "Transferência de unidade": 33,
  "Indulto": 34,
  "Manifestação contra reconversão": 35,
  "Manifestação contra regressão": 36,
  // Atos intermediários
  "Diligências do 422": 40,
  "Diligências do réu": 41,
  "Incidente de insanidade": 42,
  "Quesitos": 43,
  "Testemunhas": 44,
  "Rol de Testemunhas": 44,
  "Requerimento audiência": 45,
  "Desaforamento": 46,
  "Restituição de coisa": 47,
  "Ofício": 48,
  "Petição intermediária": 50,
  "Prosseguimento do feito": 51,
  "Atualização de endereço": 52,
  "Endereço do réu": 52,
  "Juntada de documentos": 53,
  "Cumprimento ANPP": 54,
  "Atendimento Inicial": 55,
  // Ciências (triviais)
  "Ciência habilitação DPE": 90,
  "Ciência de decisão": 91,
  "Ciência de sentença": 91,
  "Ciência da pronúncia": 91,
  "Ciência da impronúncia": 91,
  "Ciência da absolvição": 91,
  "Ciência absolvição": 91,
  "Ciência condenação": 91,
  "Ciência de condenação": 91,
  "Ciência da condenação": 91,
  "Ciência desclassificação": 91,
  "Ciência da prescrição": 92,
  "Ciência de prescrição": 92,
  "Ciência prescrição": 92,
  "Ciência de extinção processual": 92,
  "Ciência da extinção do processo": 92,
  "Ciência laudo de exame": 92,
  "Ciência revogação prisão": 92,
  "Ciência da revogação": 92,
  "Ciência acórdão": 92,
  "Ciência do acórdão": 92,
  "Ciência regressão de regime": 92,
  "Ciência de reconversão": 92,
  "Ciência indulto": 92,
  "Ciência cumprimento": 92,
  "Ciência morte": 92,
  "Ciência audiência": 92,
  "Ciência Júri": 92,
  "Ciência da redesignação": 92,
  "Ciência constituição": 92,
  "Ciência LP": 92,
  "Ciência": 95,
  // Outros / genéricos
  "Outro": 98,
  "Outros": 98,
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