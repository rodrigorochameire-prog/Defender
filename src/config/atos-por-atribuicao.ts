// Configuração de tipos de atos específicos por atribuição

export const ATOS_POR_ATRIBUICAO: Record<string, string[]> = {
  "Tribunal do Júri": [
    "Resposta à Acusação",
    "Alegações finais",
    "Memoriais",
    "Apelação",
    "Contrarrazões de apelação",
    "Razões de apelação",
    "RESE",
    "Razões de RESE",
    "Contrarrazões de RESE",
    "Embargos de Declaração",
    "Diligências do 422",
    "Incidente de insanidade",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Relaxamento e revogação de prisão",
    "Revogação do monitoramento",
    "Habeas Corpus",
    "Restituição de coisa",
    "Ofício",
    "Cumprir despacho",
    "Manifestação",
    "Manifestação sobre laudo",
    "Analisar decisão",
    "Analisar sentença",
    "Analisar acórdão",
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
    "Ciência sessão de julgamento",
    "Outro",
    "Desaforamento",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço"
  ],

  "Violência Doméstica": [
    "Resposta à Acusação",
    "Alegações finais",
    "Memoriais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de RESE",
    "Contrarrazões de ED",
    "Embargos de Declaração",
    "Incidente de insanidade",
    "Ciência de MPU",
    "Revogação de MPU",
    "Modulação de MPU",
    "Agravo de Instrumento",
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
    "Cumprir despacho",
    "Manifestação",
    "Manifestação sobre laudo",
    "Manifestação sobre MPU",
    "Analisar decisão",
    "Analisar sentença",
    "Analisar acórdão",
    "Ciência absolvição",
    "Ciência condenação",
    "Ciência de sentença",
    "Ciência de extinção processual",
    "Ciência de prescrição",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência acórdão",
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
    "Manifestar contra prorrogação de MPU",
    "Defesa em audiência de justificação",
    "Manifestar sobre laudo psicossocial",
    "Manifestar sobre modulação de MPU",
    "Pleitear não-renovação de MPU",
    "Defesa criminal — descumprimento art. 24-A",
    "Contestar imposição de tornozeleira",
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço"
  ],

  // Alias: "Grupo Especial do Júri" usa os mesmos atos do Tribunal do Júri
  "Grupo Especial do Júri": [
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
    "Outro",
    "Desaforamento",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço"
  ],

  // Alias: "Curadoria Especial" usa os mesmos atos da Curadoria
  "Curadoria Especial": [
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
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
    "Ciência designação de audiência",
    "Ciência redesignação de audiência",
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
  "Defesa em audiência de justificação": 9,
  "Defesa criminal — descumprimento art. 24-A": 9,
  "Manifestar contra prorrogação de MPU": 9,
  "Contestar imposição de tornozeleira": 9,
  // Recursos e razões
  "Razões de apelação": 10,
  "Contrarrazões de apelação": 11,
  "Razões de RESE": 12,
  "Contrarrazões de RESE": 13,
  "Embargos de Declaração": 14,
  "Contrarrazões de ED": 15,
  "Agravo em Execução": 16,
  "Agravo de Instrumento": 16,
  // Prisão e liberdade
  "Revogação da prisão": 20,
  "Relaxamento da prisão": 21,
  "Relaxamento e revogação de prisão": 22,
  "Relaxamento e revogação": 22,
  "Substituição da prisão por cautelar": 23,
  "Revogação de MPU": 24,
  "Modulação de MPU": 25,
  "Manifestar sobre modulação de MPU": 27,
  "Manifestar sobre laudo psicossocial": 27,
  "Revogação do monitoramento": 26,
  "Revogação de monitoramento": 26,
  "Pleitear não-renovação de MPU": 28,
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
  "Ciência de MPU": 90,
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
  "Ciência designação de audiência": 85,
  "Ciência redesignação de audiência": 85,
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

// ==========================================
// CATEGORIZAÇÃO DE ATOS (dropdown sistematizado)
// ==========================================
// Agrupa atos por natureza para o dropdown em accordion. Ordem reflete a UI:
// Defesas (manifestação processual) → Recursos → Liberdade → Ciências (ato
// passivo) → Diligências (resto). Fonte única usada pelo sheet lateral e pelos
// cards (kanban etc.).
export const ATO_CATEGORY_ORDER = ["Defesas", "Recursos", "Liberdade", "Ciências", "Diligências"];

export function categorizarAto(ato: string): string {
  const a = (ato || "").toLowerCase();
  if (
    a.startsWith("ciência") || a.startsWith("ciencia") ||
    a.startsWith("analisar ") || a === "cumprir despacho"
  ) return "Ciências";
  if (
    a.includes("apelação") || a.includes("apelacao") || a.includes("rese") ||
    a.includes("embargos") || a.includes("habeas") || a.includes("agravo") ||
    a.startsWith("razões") || a.startsWith("razoes") ||
    a.startsWith("contrarrazões") || a.startsWith("contrarrazoes")
  ) return "Recursos";
  if (
    a.includes("revogação") || a.includes("revogacao") ||
    a.includes("relaxamento") || a.includes("restituição") || a.includes("restituicao") ||
    a.includes("monitoramento") || a.includes("liberdade")
  ) return "Liberdade";
  if (
    a === "resposta à acusação" || a === "resposta a acusacao" ||
    a === "alegações finais" || a === "alegacoes finais" ||
    a === "memoriais" || a.startsWith("manifestação") || a.startsWith("manifestacao")
  ) return "Defesas";
  return "Diligências";
}

/**
 * Atos da atribuição, categorizados e ordenados por categoria → label.
 * Pronto para `<InlineDropdown layout="accordion">`. Exclui "Todos".
 */
export function getAtoOptionsAgrupados(
  atribuicao: string,
): Array<{ value: string; label: string; group: string }> {
  return getAtosPorAtribuicao(atribuicao)
    .filter((a) => a.value !== "Todos")
    .map((a) => ({ value: a.value, label: a.label, group: categorizarAto(a.value) }))
    .sort((x, y) => {
      const xi = ATO_CATEGORY_ORDER.indexOf(x.group);
      const yi = ATO_CATEGORY_ORDER.indexOf(y.group);
      if (xi !== yi) return xi - yi;
      return x.label.localeCompare(y.label, "pt-BR");
    });
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
  "Violência Doméstica": 52,
  "Execução Penal": 22,
  "Substituição Criminal": 31,
  "Curadoria": 15,
  "Criminal Geral": 35
};

// Total de atos únicos no sistema
export const getTotalAtosUnicos = (): number => {
  return getTodosAtosUnicos().length - 1; // -1 para excluir "Todos"
};

// ==========================================
// FREQUENTES (preview de importação)
// ==========================================
// Atos mais usados no dia a dia de cada atribuição — aparecem primeiro no
// dropdown do preview de importação (grupo "Frequentes"). Lista curada; nomes
// que não existirem em ATOS_POR_ATRIBUICAO são filtrados silenciosamente.
// Os itens também seguem aparecendo no seu grupo temático.
export const ATOS_FREQUENTES_POR_ATRIBUICAO: Record<string, string[]> = {
  "Tribunal do Júri": [
    "Resposta à Acusação",
    "Diligências do 422",
    "Alegações finais",
    "Memoriais",
    "Ciência designação de audiência",
    "Ciência de decisão",
    "Manifestação",
    "Ciência",
  ],
  "Violência Doméstica": [
    "Resposta à Acusação",
    "Modulação de MPU",
    "Manifestação sobre MPU",
    "Revogação de MPU",
    "Alegações finais",
    "Ciência designação de audiência",
    "Manifestação",
    "Ciência de sentença",
  ],
  "Execução Penal": [
    "Requerimento de progressão",
    "Manifestação contra reconversão",
    "Agravo em Execução",
    "Designação de justificação",
    "Designação admonitória",
    "Transferência de unidade",
    "Indulto",
    "Ciência",
  ],
  "Substituição Criminal": [
    "Resposta à Acusação",
    "Memoriais",
    "Apelação",
    "Revogação",
    "Relaxamento",
    "Habeas Corpus",
    "Ciência designação de audiência",
    "Ciência",
  ],
  "Curadoria": [
    "Contestação",
    "Alegações finais",
    "Apelação",
    "Petição intermediária",
    "Ciência de sentença",
    "Ciência de decisão",
  ],
  "Criminal Geral": [
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Relaxamento da prisão",
    "Revogação da prisão",
    "Habeas Corpus",
    "Petição intermediária",
    "Ciência",
  ],
};

/**
 * Opções de ato para o preview de importação: grupo "Frequentes" primeiro,
 * depois todos os atos da atribuição agrupados por categoria. Atribuição sem
 * configuração cai no fallback de todos os atos (sem grupos).
 */
export function getAtoOptionsPreview(
  atribuicao: string,
): Array<{ value: string; label: string; group?: string }> {
  const agrupados = getAtoOptionsAgrupados(atribuicao);
  if (agrupados.length === 0) {
    return getTodosAtosUnicos().filter((a) => a.value !== "Todos");
  }
  const validos = new Set(agrupados.map((a) => a.value));
  const frequentes = (ATOS_FREQUENTES_POR_ATRIBUICAO[atribuicao] || [])
    .filter((ato) => validos.has(ato))
    .map((ato) => ({ value: ato, label: ato, group: "Frequentes" }));
  return [...frequentes, ...agrupados];
}