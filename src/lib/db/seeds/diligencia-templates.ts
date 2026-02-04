/**
 * Templates padrão de diligências investigativas
 *
 * Estes templates são sugestões automáticas baseadas em padrões de casos
 * comuns na Defensoria Pública. Eles ajudam a garantir que nenhuma
 * diligência importante seja esquecida.
 */

export const diligenciaTemplatesData = [
  // ==========================================
  // DILIGÊNCIAS GERAIS (TODOS OS CASOS)
  // ==========================================
  {
    nome: "Contato com familiares do assistido",
    descricao: "Estabelecer contato com familiares para obter informações e documentos",
    tipo: "LOCALIZACAO_PESSOA",
    tituloTemplate: "Contatar familiares do assistido",
    descricaoTemplate: "Localizar e estabelecer contato com familiares do assistido para obter documentos, testemunhas de caráter e informações relevantes para a defesa.",
    checklistItens: [
      "Obter telefones de contato",
      "Ligar/enviar mensagem",
      "Solicitar documentos pessoais",
      "Verificar testemunhas de caráter",
      "Coletar informações sobre condições pessoais",
    ],
    aplicavelA: null, // Aplicável a todos os casos
    prioridadeSugerida: "NORMAL",
    prazoSugeridoDias: 7,
    ordem: 1,
    ativo: true,
  },
  {
    nome: "Pesquisa de antecedentes e vida pregressa",
    descricao: "Pesquisar informações sobre a vida pregressa do assistido",
    tipo: "PESQUISA_OSINT",
    tituloTemplate: "Pesquisar antecedentes e vida pregressa",
    descricaoTemplate: "Realizar pesquisa OSINT para levantar informações sobre vida pregressa, trabalho, família e condições sociais do assistido.",
    checklistItens: [
      "Pesquisar no JusBrasil",
      "Pesquisar no Escavador",
      "Verificar redes sociais",
      "Buscar informações de emprego",
      "Verificar vínculos familiares",
    ],
    aplicavelA: null,
    prioridadeSugerida: "NORMAL",
    prazoSugeridoDias: 5,
    ordem: 2,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA JÚRI (HOMICÍDIO)
  // ==========================================
  {
    nome: "Localização de testemunhas de defesa",
    descricao: "Localizar e arrolar testemunhas favoráveis à defesa",
    tipo: "LOCALIZACAO_PESSOA",
    tituloTemplate: "Localizar testemunhas de defesa",
    descricaoTemplate: "Identificar, localizar e qualificar testemunhas que possam depor favoravelmente à defesa, incluindo testemunhas de caráter e presenciais.",
    checklistItens: [
      "Listar possíveis testemunhas (familiares, amigos, colegas)",
      "Verificar se presenciaram os fatos",
      "Obter qualificação completa",
      "Verificar disponibilidade para depor",
      "Preparar testemunha para audiência",
    ],
    aplicavelA: {
      areas: ["JURI"],
      fases: ["instrucao", "plenario"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 15,
    ordem: 10,
    ativo: true,
  },
  {
    nome: "Análise da cena do crime",
    descricao: "Analisar local dos fatos e dinâmica do crime",
    tipo: "DILIGENCIA_CAMPO",
    tituloTemplate: "Verificar local dos fatos e cena do crime",
    descricaoTemplate: "Realizar diligência no local dos fatos para verificar dinâmica do crime, posição das partes, rotas de fuga, câmeras de segurança e outras informações relevantes.",
    checklistItens: [
      "Visitar local dos fatos",
      "Fotografar/filmar o ambiente",
      "Verificar câmeras de segurança na região",
      "Identificar possíveis testemunhas no local",
      "Analisar compatibilidade com versão da defesa",
    ],
    aplicavelA: {
      areas: ["JURI"],
      tiposCrime: ["homicidio", "tentativa_homicidio"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 10,
    ordem: 11,
    ativo: true,
  },
  {
    nome: "Requisição de prontuário médico da vítima",
    descricao: "Obter prontuário médico para análise de causa mortis e lesões",
    tipo: "REQUISICAO_DOCUMENTO",
    tituloTemplate: "Requisitar prontuário médico da vítima",
    descricaoTemplate: "Solicitar prontuário médico completo da vítima junto aos hospitais/unidades de saúde para análise das lesões, causa mortis e tempo de atendimento.",
    checklistItens: [
      "Identificar hospital de atendimento",
      "Elaborar ofício requisitório",
      "Protocolar pedido",
      "Acompanhar resposta",
      "Analisar prontuário recebido",
    ],
    aplicavelA: {
      areas: ["JURI"],
      tiposCrime: ["homicidio", "lesao_corporal_grave"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 20,
    ordem: 12,
    ativo: true,
  },
  {
    nome: "Pesquisa da vítima (OSINT)",
    descricao: "Levantar informações sobre a vítima e possíveis conflitos",
    tipo: "PESQUISA_OSINT",
    tituloTemplate: "Pesquisar informações sobre a vítima",
    descricaoTemplate: "Realizar pesquisa OSINT da vítima para identificar antecedentes, envolvimento com atividades ilícitas, conflitos anteriores e informações relevantes para a tese de defesa.",
    checklistItens: [
      "Pesquisar processos da vítima",
      "Verificar antecedentes criminais",
      "Pesquisar redes sociais",
      "Verificar notícias sobre a vítima",
      "Identificar possíveis inimigos/conflitos",
    ],
    aplicavelA: {
      areas: ["JURI"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 10,
    ordem: 13,
    ativo: true,
  },
  {
    nome: "Análise de imagens de câmeras",
    descricao: "Requisitar e analisar imagens de câmeras de segurança",
    tipo: "REQUISICAO_DOCUMENTO",
    tituloTemplate: "Requisitar imagens de câmeras de segurança",
    descricaoTemplate: "Identificar e requisitar imagens de câmeras de segurança próximas ao local dos fatos que possam comprovar a dinâmica dos eventos ou álibi do réu.",
    checklistItens: [
      "Identificar estabelecimentos com câmeras",
      "Solicitar preservação das imagens",
      "Elaborar ofício requisitório",
      "Analisar imagens obtidas",
      "Documentar pontos relevantes",
    ],
    aplicavelA: {
      areas: ["JURI"],
    },
    prioridadeSugerida: "URGENTE",
    prazoSugeridoDias: 5,
    ordem: 14,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA TRÁFICO DE DROGAS
  // ==========================================
  {
    nome: "Verificação de condições socioeconômicas",
    descricao: "Documentar situação social para descaracterizar tráfico",
    tipo: "DILIGENCIA_CAMPO",
    tituloTemplate: "Verificar condições socioeconômicas do assistido",
    descricaoTemplate: "Realizar levantamento das condições de vida, moradia, trabalho e renda do assistido para fundamentar tese de uso próprio ou pequeno traficante.",
    checklistItens: [
      "Visitar residência do assistido",
      "Fotografar condições de moradia",
      "Obter comprovantes de renda/trabalho",
      "Verificar se há sinais de enriquecimento",
      "Entrevistar vizinhos/familiares",
    ],
    aplicavelA: {
      tiposCrime: ["trafico", "associacao_trafico"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 15,
    ordem: 20,
    ativo: true,
  },
  {
    nome: "Análise da abordagem policial",
    descricao: "Verificar legalidade e circunstâncias da abordagem",
    tipo: "PESQUISA_OSINT",
    tituloTemplate: "Analisar legalidade da abordagem policial",
    descricaoTemplate: "Verificar circunstâncias da abordagem policial, buscar imagens de câmeras, testemunhas e analisar possíveis nulidades no procedimento.",
    checklistItens: [
      "Verificar se houve fundada suspeita",
      "Analisar auto de prisão em flagrante",
      "Buscar câmeras de segurança próximas",
      "Identificar testemunhas civis",
      "Verificar histórico dos policiais",
    ],
    aplicavelA: {
      tiposCrime: ["trafico", "porte_drogas"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 10,
    ordem: 21,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA ROUBO
  // ==========================================
  {
    nome: "Verificação de álibi",
    descricao: "Confirmar álibi do assistido no momento dos fatos",
    tipo: "LOCALIZACAO_PESSOA",
    tituloTemplate: "Verificar e documentar álibi do assistido",
    descricaoTemplate: "Localizar testemunhas, obter documentos e registros que comprovem onde o assistido estava no momento dos fatos.",
    checklistItens: [
      "Identificar onde o assistido estava",
      "Localizar testemunhas de álibi",
      "Obter registros de entrada/saída",
      "Verificar registros de transações",
      "Buscar imagens de câmeras",
    ],
    aplicavelA: {
      tiposCrime: ["roubo", "furto", "receptacao"],
    },
    prioridadeSugerida: "URGENTE",
    prazoSugeridoDias: 7,
    ordem: 30,
    ativo: true,
  },
  {
    nome: "Análise do reconhecimento",
    descricao: "Verificar regularidade do procedimento de reconhecimento",
    tipo: "REQUISICAO_DOCUMENTO",
    tituloTemplate: "Analisar procedimento de reconhecimento",
    descricaoTemplate: "Verificar se o reconhecimento do assistido seguiu os requisitos legais (art. 226, CPP) e identificar possíveis nulidades.",
    checklistItens: [
      "Analisar auto de reconhecimento",
      "Verificar se houve prévia descrição",
      "Conferir se havia pessoas semelhantes",
      "Verificar condições de iluminação/visibilidade",
      "Identificar sugestionabilidade",
    ],
    aplicavelA: {
      tiposCrime: ["roubo", "furto", "estupro"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 10,
    ordem: 31,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA VIOLÊNCIA DOMÉSTICA
  // ==========================================
  {
    nome: "Verificação de histórico relacional",
    descricao: "Levantar histórico do relacionamento entre as partes",
    tipo: "LOCALIZACAO_PESSOA",
    tituloTemplate: "Verificar histórico do relacionamento",
    descricaoTemplate: "Entrevistar familiares, vizinhos e conhecidos para entender a dinâmica do relacionamento e verificar possíveis falsas acusações ou conflitos prévios.",
    checklistItens: [
      "Entrevistar familiares de ambas as partes",
      "Verificar boletins de ocorrência anteriores",
      "Identificar testemunhas do relacionamento",
      "Documentar versão do assistido",
      "Verificar se há disputa por guarda/bens",
    ],
    aplicavelA: {
      areas: ["VVD_CAMACARI"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 15,
    ordem: 40,
    ativo: true,
  },
  {
    nome: "Pesquisa sobre a vítima",
    descricao: "Levantar informações sobre a suposta vítima",
    tipo: "PESQUISA_OSINT",
    tituloTemplate: "Pesquisar informações sobre a suposta vítima",
    descricaoTemplate: "Realizar pesquisa sobre a suposta vítima para identificar possíveis motivações para falsa acusação, histórico de denúncias e conflitos.",
    checklistItens: [
      "Verificar processos anteriores",
      "Pesquisar redes sociais",
      "Verificar se há disputas familiares",
      "Identificar possíveis motivações",
      "Documentar comportamento nas redes",
    ],
    aplicavelA: {
      areas: ["VVD_CAMACARI"],
    },
    prioridadeSugerida: "NORMAL",
    prazoSugeridoDias: 10,
    ordem: 41,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA EXECUÇÃO PENAL
  // ==========================================
  {
    nome: "Levantamento de atestado de conduta carcerária",
    descricao: "Obter atestado de conduta para benefícios",
    tipo: "REQUISICAO_DOCUMENTO",
    tituloTemplate: "Requisitar atestado de conduta carcerária",
    descricaoTemplate: "Solicitar atestado de conduta carcerária atualizado junto à unidade prisional para instruir pedidos de benefícios.",
    checklistItens: [
      "Identificar unidade prisional",
      "Elaborar ofício requisitório",
      "Protocolar pedido",
      "Acompanhar resposta",
      "Analisar conduta informada",
    ],
    aplicavelA: {
      areas: ["EXECUCAO_PENAL"],
    },
    prioridadeSugerida: "NORMAL",
    prazoSugeridoDias: 15,
    ordem: 50,
    ativo: true,
  },
  {
    nome: "Verificação de proposta de trabalho",
    descricao: "Obter proposta de trabalho para progressão/LC",
    tipo: "LOCALIZACAO_DOCUMENTO",
    tituloTemplate: "Obter proposta de trabalho/emprego",
    descricaoTemplate: "Contatar familiares e possíveis empregadores para obter carta de proposta de trabalho para instruir pedidos de progressão ou livramento condicional.",
    checklistItens: [
      "Contatar familiares sobre possibilidades",
      "Identificar possíveis empregadores",
      "Solicitar carta de empregador",
      "Verificar regularidade da empresa",
      "Obter documentação completa",
    ],
    aplicavelA: {
      areas: ["EXECUCAO_PENAL"],
      fases: ["progressao", "livramento"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 20,
    ordem: 51,
    ativo: true,
  },
  {
    nome: "Verificação de endereço para domiciliar",
    descricao: "Confirmar endereço para prisão domiciliar",
    tipo: "DILIGENCIA_CAMPO",
    tituloTemplate: "Verificar endereço para prisão domiciliar",
    descricaoTemplate: "Verificar condições do endereço indicado para cumprimento de prisão domiciliar, confirmando existência, adequação e disponibilidade.",
    checklistItens: [
      "Visitar endereço indicado",
      "Fotografar imóvel",
      "Entrevistar moradores",
      "Verificar se há sinal de celular/internet",
      "Obter comprovante de residência",
    ],
    aplicavelA: {
      areas: ["EXECUCAO_PENAL"],
    },
    prioridadeSugerida: "ALTA",
    prazoSugeridoDias: 10,
    ordem: 52,
    ativo: true,
  },

  // ==========================================
  // DILIGÊNCIAS PARA TODOS - URGENTES
  // ==========================================
  {
    nome: "Documentação pessoal do assistido",
    descricao: "Obter documentos pessoais para identificação",
    tipo: "LOCALIZACAO_DOCUMENTO",
    tituloTemplate: "Obter documentação pessoal do assistido",
    descricaoTemplate: "Localizar e obter cópias dos documentos pessoais do assistido (RG, CPF, comprovante de residência, certidões) para instrução dos autos.",
    checklistItens: [
      "Solicitar RG e CPF",
      "Obter comprovante de residência",
      "Solicitar certidão de nascimento",
      "Obter carteira de trabalho",
      "Verificar outros documentos relevantes",
    ],
    aplicavelA: null,
    prioridadeSugerida: "NORMAL",
    prazoSugeridoDias: 10,
    ordem: 100,
    ativo: true,
  },
  {
    nome: "Entrevista com assistido preso",
    descricao: "Realizar entrevista presencial com assistido",
    tipo: "OITIVA",
    tituloTemplate: "Entrevistar assistido na unidade prisional",
    descricaoTemplate: "Agendar e realizar entrevista presencial com o assistido preso para colher versão dos fatos, identificar testemunhas e definir estratégia de defesa.",
    checklistItens: [
      "Verificar dias de atendimento na unidade",
      "Agendar visita",
      "Preparar perguntas/questionário",
      "Realizar entrevista",
      "Documentar versão do assistido",
    ],
    aplicavelA: null,
    prioridadeSugerida: "REU_PRESO",
    prazoSugeridoDias: 5,
    ordem: 0, // Primeira da lista quando réu preso
    ativo: true,
  },
];

/**
 * Função para popular templates no banco de dados
 * Usar em um script de seed ou migration
 */
export async function seedDiligenciaTemplates(db: any, diligenciaTemplates: any) {
  console.log("Inserindo templates de diligências...");

  for (const template of diligenciaTemplatesData) {
    await db.insert(diligenciaTemplates).values(template).onConflictDoNothing();
  }

  console.log(`${diligenciaTemplatesData.length} templates inseridos!`);
}
