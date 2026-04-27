require('dotenv').config({ path: process.env.HOME + '/projetos/Defender/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ASSISTIDO_GARRIDO = 594;
const NUMERO_AUTOS = '8004502-05.2023.8.05.0039';
const DRIVE_FOLDER_GARRIDO = '1uX2tscVG6myjLBoS42mAXnLr6RN8HsVA';
const DATA_AUD = '2026-04-17T09:00:00';

const ANALYSIS = {
  schema_version: "v2-garrido-acareacao-2026-04-17",
  fonte: "relatorio-manual",
  gerado_em: new Date().toISOString(),
  gerado_por: "Defensor Rodrigo — análise pós-audiência 16/04/2026",
  tipo: "juri",

  imputacao: "Duplo homicídio qualificado — vítimas Ítalo Andrade (Policial Militar) e Cleberson Santos (ex-fuzileiro naval), em 11/09/2020, no imóvel da Fazenda Camarão, Barra do Jacuípe, Camaçari/BA. Antônio Roberto Garrido Rodrigues é denunciado como partícipe/olheiro, supostamente responsável por acionar os executores (co-réus policiais militares e civis armados) para emboscar as vítimas. Acusação sustenta que Garrido seria caseiro a serviço do proprietário Joel Lopes e teria feito ligação (\"já liguei pro homem\") e ameaçado Edilton Pessoa de Alcântara (sobrevivente) com facão.",

  resumo_executivo: "Processo com 3.000+ páginas, múltiplos co-réus (majoritariamente policiais militares) e forte carga de provas contraditórias. A base da imputação contra Garrido é o depoimento extrajudicial de Edilton — que em juízo, hoje (16/04/2026), classificou suas falas em vídeo como produto de coação da primeira guarnição policial (\"Santiago\"). A testemunha do MP (Seu José) contradisse o próprio termo da delegacia (assinou sem ler, nega \"vulgo Neguinho\", cronologia vacilante). Joel Lopes (95 anos), em nova oitiva, declarou que o ocupante \"foi o Luiz que botou, era Garrido\" — ou seja, nega ter sido quem colocou Garrido no imóvel e desqualifica o termo da delegacia que atribuía a Ítalo/Cleberson a missão de \"retirar Garrido\". Defesa de Garrido deve se descolar completamente dos PMs co-réus e explorar a tese de locatário-vítima (legítima defesa da posse + inexigibilidade de conduta diversa).",

  narrativa_denuncia: "Segundo a denúncia, em 11/09/2020 as vítimas Ítalo Andrade e Cleberson Santos se deslocaram até a Fazenda Camarão (Barra do Jacuípe) para remover Garrido do imóvel; foram recebidas por grupo armado composto por co-réus PMs, civis armados e pelo próprio Garrido, que teria articulado a chamada dos executores a mando de Joel Lopes (proprietário). O grupo teria efetuado disparos, matando Ítalo e Cleberson; Edilton Pessoa de Alcântara teria sido mantido rendido; a cena teria sido posteriormente manipulada (cadeados cortados, armas remanejadas, vítimas arrastadas para a cozinha). Garrido figuraria como o \"olheiro\" que acionou o grupo.",

  versao_delegacia: "Na inquirição policial inicial (termo assinado sem leitura integral, conforme admitido pelo próprio depoente em 16/04/2026), Joel Lopes teria declarado que Ítalo e Cleberson \"se ofereceram para dar apoio de segurança com a finalidade de retirar Garrido do imóvel\" — versão que, se mantida, pesa contra Garrido. O termo também colocava José Reis como conhecido por \"vulgo Neguinho\". Edilton teria, em gravação de vídeo, afirmado ter ligado para \"o homem\" — frase-chave usada pela acusação para imputar a Garrido o papel de articulador.",

  versao_juizo: "Na audiência de 16/04/2026: (a) Edilton renegou suas falas em vídeo, classificando-as como produto de coação pela primeira guarnição (menciona \"Santiago\") — \"Quando você mente, você não grava\"; (b) José Reis admitiu ter assinado o termo da delegacia sem ler, contestou \"vulgo Neguinho\", apresentou cronologia vacilante sobre tiros e anúncio \"sou polícia\"; descreveu sinais de arrombamento prévio na casa, ausência de armas visíveis no carro de Joel, Joel sendo erguido pelo braço e batendo a cabeça; (c) Joel declarou textualmente \"foi o Luiz que botou, era Garrido\" e, confrontado com o termo da delegacia sobre Ítalo/Cleberson se oferecerem para retirar Garrido, respondeu \"não tinha certeza do que era nada disso\" — retratação crucial para afastar a tese de mandato do proprietário sobre a ação letal.",

  testemunhas_acusacao: [
    {
      nome: "Edilton Pessoa de Alcântara",
      papel: "vítima sobrevivente / testemunha-chave da acusação",
      status: "OUVIDA",
      data_oitiva: "2026-04-16",
      lado: "acusacao",
      resumo: "Primo da vítima Ítalo. Hoje (reabertura limitada ao vídeo juntado pela defesa): não reconhece pessoas no vídeo/fotos; afirma que suas falas no vídeo foram feitas sob coação da primeira guarnição policial (cita 'Santiago'). Coleta antecipada 2025: narrou ação da PM sem diálogo, execução imediata, manipulação de cena, coordenação por Nascimento, agressão do Major Preza. Alega ter sido contatado por advogado \"Vivaldo Amaral\" com oferta de suborno meses após os fatos.",
      pontos_favoraveis_defesa_garrido: "Retratação do vídeo (=coação) remove a frase 'já liguei pro homem' do substrato probatório utilizável contra Garrido. Descreve o grupo executor como PMs/civis, sem colocar Garrido em posição de comando.",
      pontos_desfavoraveis_defesa_garrido: "Em coleta antecipada, imputou a Garrido frase 'já liguei pro homem' e pedido para 'ficar quieto' após os tiros. Precisa ser confrontado com retratação atual."
    },
    {
      nome: "José Reis Xavier dos Santos (\"Seu José\")",
      papel: "trabalhador/motorista de Joel — testemunha do MP",
      status: "OUVIDA",
      data_oitiva: "2026-04-16",
      lado: "acusacao",
      resumo: "Acompanhou Joel ao local; relata sinais de arrombamento prévio no imóvel (cadeado/corrente quebrados), anúncio 'sou polícia' por mascarados, aproximadamente 2 disparos sem ver atiradores, Joel sendo erguido pelo braço e batendo a cabeça. Não viu armas no carro nem ferramentas. Admite divergências com a delegacia (cronologia, um ou dois terrenos); assinou termo sem ler; contesta 'vulgo Neguinho'. Na delegacia reconheceu por foto única 'moreno, gordinho, sem camisa' — sem certeza.",
      pontos_favoraveis_defesa_garrido: "Descreve sinais de arrombamento PRÉVIOS à chegada da PM — compatível com tese de invasão que Garrido relata. Admite fragilidade do termo de delegacia (modelo coletivo de contestação dos autos inquisitoriais).",
      pontos_desfavoraveis_defesa_garrido: "Descreve presença de um homem 'à vontade' na casa, que pode ser interpretado como o caseiro (Garrido). Deve ser trabalhado com foco em não-reconhecimento."
    }
  ],

  testemunhas_defesa: [
    {
      nome: "Genivaldo",
      papel: "vizinho — apontado por co-réu Edson como quem acionou a PM",
      status: "ARROLADA",
      lado: "defesa",
      resumo: "Mencionado pelo co-réu Edson (depoimento favorável à defesa) como quem teria acionado a polícia por invasão no imóvel. Pode esclarecer que não foi Garrido quem chamou a polícia.",
      pontos_favoraveis_defesa_garrido: "Trunfo da defesa — destrói a narrativa de que Garrido foi o elo comunicativo com os executores."
    },
    {
      nome: "Joel Lopes da Pinto",
      papel: "proprietário / réu de co-processo cível — testemunha",
      status: "OUVIDA",
      data_oitiva: "2026-04-16",
      lado: "neutro",
      resumo: "95 anos. Depoimento complexo e marcado por inconsistências e lapsos de memória. Hoje afirmou que 'foi o Luiz que botou, era Garrido' — retirou a si mesmo da cadeia causal da presença de Garrido no imóvel. Desqualificou termo da delegacia sobre 'Ítalo/Cleberson se ofereceram para retirar Garrido'. Descreveu sequestro anterior e relata perseguição pela filha Neide e corretor Luiz. Nega conhecer 'Edilton Bola' mas narra sequestro por grupo com 'Bola' (contradição interna a explorar).",
      pontos_favoraveis_defesa_garrido: "Retratação do termo da delegacia que colocava Joel como mandante da retirada de Garrido. Atribuição da 'colocação' de Garrido a Luiz (invasor) e não a Joel. Desqualifica a tese de caseiro-a-mando-de-Joel.",
      pontos_desfavoraveis_defesa_garrido: "Em coleta 2025 já havia mencionado 'Bola' e um caseiro — termos ambíguos que podem ser reaproveitados pela acusação."
    }
  ],

  depoentes_hoje: [
    "Edilton Pessoa de Alcântara (reabertura limitada ao vídeo)",
    "José Reis Xavier dos Santos",
    "Joel Lopes da Pinto"
  ],

  contradicoes: [
    {
      ponto: "Vínculo de Garrido com Joel",
      versao_delegacia: "Joel teria pedido apoio de Ítalo/Cleverson para retirar Garrido (mandato do proprietário)",
      versao_juizo_hoje: "Joel: 'foi o Luiz que botou, era Garrido'; nega que tenha 'certeza' sobre o termo da delegacia",
      impacto: "ESSENCIAL — quebra tese central do MP de Garrido como caseiro-olheiro a mando de Joel"
    },
    {
      ponto: "Frase 'já liguei pro homem'",
      versao_delegacia: "Edilton atribuiu a Garrido (via vídeo) o dito 'já liguei pro homem'",
      versao_juizo_hoje: "Edilton: vídeo foi feito sob coação; 'quando você mente, você não grava'",
      impacto: "ESSENCIAL — elimina a única frase que colocava Garrido como elo comunicativo com os executores"
    },
    {
      ponto: "Dinâmica da chegada das vítimas",
      versao_delegacia: "Chegada pacífica a convite de Joel (Edilton) / apoio de segurança (Joel)",
      versao_juizo_hoje: "Joel: compradores pularam muro; Seu José: mascarados depois; sinais de arrombamento prévio",
      impacto: "ALTO — compatível com cenário de invasão/confusão, não de emboscada organizada por Garrido"
    },
    {
      ponto: "Identificação de 'Bola' (Edilton) por Joel",
      versao_delegacia: "Joel (coleta 2025): cita 'Bola' como presente no local",
      versao_juizo_hoje: "Joel: nega conhecer 'Edilton Bola' pessoalmente; mas narra sequestro com 'Bola'",
      impacto: "MÉDIO — contradição interna fragiliza credibilidade geral de Joel; útil para impugnação do reconhecimento fotográfico"
    },
    {
      ponto: "Agressor único vs. múltiplos",
      versao_delegacia: "Edilton: grupo com Edson, Lopes, Carlos Antônio, Pitta",
      versao_juizo_hoje: "Joel: 'foi Edson, só Edson'",
      impacto: "MÉDIO — tensão entre os próprios narradores da acusação"
    },
    {
      ponto: "Qualificação de testemunhas no inquérito",
      versao_delegacia: "José Reis qualificado como 'vulgo Neguinho'",
      versao_juizo_hoje: "José Reis contesta a qualificação; admite ter assinado sem ler",
      impacto: "ALTO — ataque sistêmico à cadeia de autos inquisitoriais; viável arguir nulidade do reconhecimento"
    }
  ],

  vulnerabilidades_acusacao: [
    "Única prova direta contra Garrido (vídeo de Edilton) foi renegada em juízo com alegação de coação policial (arts. 157/158 do CPP — prova ilícita por derivação)",
    "Três testemunhas-chave (Edilton, José Reis, Joel) admitem ter assinado termos da delegacia sem leitura integral, abrindo espaço para impugnação sistemática da fase inquisitorial",
    "Tese da acusação exigia que Joel fosse o mandante da ação; o próprio Joel desautorizou o termo da delegacia nesse ponto",
    "Presença do segundo vídeo (Joel + Garrido) sem juntada formalizada — ônus probatório ao MP, com risco de quebra de cadeia de custódia (art. 158-B e ss.)",
    "Reconhecimento de Garrido na cena é circunstancial: Seu José fala em 'homem à vontade' sem certeza; Joel afirma saber 'por ouvir dizer'",
    "Ausência de bilhetagem telefônica nos autos capaz de atribuir a Garrido chamada de comando aos executores",
    "Coleta antecipada de Edilton descreve coordenação dos PMs (Nascimento, Santiago, Cruz), deixando Garrido fora da cadeia decisória"
  ],

  laudos: [
    {
      nome: "Laudo pericial de local (DPT)",
      status: "Pendente/não localizado nos autos disponíveis",
      relevancia: "Crítico — verificação de sinais de arrombamento dos portões/cadeados (compatível com versão de Garrido de invasão); análise balística (posicionamento dos tiros); verificação se a cena foi lavada"
    },
    {
      nome: "Laudo do médico do SAMU (Paulo Eduardo)",
      status: "Juntado",
      relevancia: "Relata presença de água no chão (cena lavada) — sugere alteração pós-evento pela PM, não por Garrido"
    },
    {
      nome: "Laudo balístico / cápsulas",
      status: "A verificar completude",
      relevancia: "Edilton relata que PM recolheu cápsulas; apurar cadeia de custódia"
    },
    {
      nome: "Perícia em vídeo / áudio (2º vídeo mencionado Joel+Garrido)",
      status: "A REQUERER — perícia com lacre e CoC",
      relevancia: "Alto — vídeo citado pelo assistente de acusação precisa ser juntado formalmente para contraditório"
    }
  ],

  pendencias_diligencia_pre_aij: [
    "Requerer, antes/durante a acareação, exibição do termo de delegacia de Joel para confronto ponto a ponto",
    "Requerer juntada do '2º vídeo' (Joel + Garrido) mencionado pelo assistente de acusação, com lacre e cadeia de custódia",
    "Requerer oitiva de Genivaldo (vizinho mencionado pelo co-réu Edson)",
    "Requerer requisição de bilhetagem das linhas telefônicas de Garrido em 11/09/2020 (rejeição de dolo homicida via curta duração/destinatário)",
    "Juntar contrato de locação de R$ 500 entre Garrido e César/representante de Joel (documentos entregues à Dra. Amanda — verificar anexação)",
    "Pedir impugnação do reconhecimento fotográfico (art. 226 CPP — jurisprudência STJ HC 598.886/SC)"
  ],

  pendencias: [
    "Audiência de acareação 17/04/2026 — consignar em ata retratações de Edilton/Joel e fragilidades dos termos da delegacia",
    "Alegações finais: estruturar em legítima defesa da posse, inexigibilidade de conduta diversa, erro de tipo/proibição",
    "Verificar se os documentos entregues pelo Garrido à Dra. Amanda foram efetivamente juntados aos autos"
  ],

  teses_defesa: [
    {
      nome: "Legítima Defesa da Posse",
      base_legal: "Art. 25 CP c/c art. 23, II, CP e arts. 1.210 e 1.224 CC",
      fundamentacao: "Garrido era locatário (R$ 500/mês), não caseiro. Invasão violenta com arrombamento do portão e agressão por terceiros armados (Edilton/Cleverson/Ítalo). Pegou facão para cortar mato, em defesa de sua posse e integridade. Não tem responsabilidade objetiva pelo excesso cometido por terceiros (PMs ou milicianos) que chegaram após sua ligação.",
      forca: "ALTA"
    },
    {
      nome: "Ausência de dolo homicida / Concurso improvável",
      base_legal: "Art. 18, I CP; art. 29, §2º CP",
      fundamentacao: "Se Garrido acionou terceiros, foi pedir socorro contra invasão — conduta adequada socialmente. Não detinha domínio do fato, não estava ao lado dos atiradores, não portava arma de fogo. Inexistência de liame subjetivo com os homicídios.",
      forca: "ALTA"
    },
    {
      nome: "Inexigibilidade de conduta diversa",
      base_legal: "Art. 22 CP (por analogia); doutrina Zaffaroni/Nilo Batista",
      fundamentacao: "Idoso (66 anos) cercado por homens armados dos dois lados — invasores e, depois, policiais. Permaneceu calado ou cooperou sob coação. A ordem ao Edilton ('fica quieto') foi tentativa de salvar vidas, não ocultar crime.",
      forca: "MÉDIA-ALTA"
    },
    {
      nome: "Impugnação probatória — nulidade do inquérito",
      base_legal: "Art. 5º, LV, CF/88; arts. 157, 226, 229, 230 CPP; STJ HC 598.886/SC",
      fundamentacao: "Três testemunhas-chave (Edilton, José Reis, Joel) admitem ter assinado termos sem leitura; Edilton alega coação policial; reconhecimento fotográfico realizado com foto única ao arrepio do art. 226 CPP. Pedir desentranhamento ou revisão crítica do conjunto inquisitorial.",
      forca: "ALTA"
    },
    {
      nome: "Erro de tipo / erro de proibição",
      base_legal: "Arts. 20 e 21 CP",
      fundamentacao: "Caso se entenda que Garrido tenha efetivamente chamado 'segurança' contra invasores, agiu supondo ser legítima tal chamada — desconhecia o propósito executório dos terceiros que compareceram ao local.",
      forca: "SUBSIDIÁRIA"
    }
  ],

  teses: [
    "Legítima defesa da posse",
    "Ausência de dolo homicida",
    "Inexigibilidade de conduta diversa",
    "Impugnação do inquérito — três testemunhas retratam termos da delegacia",
    "Erro de tipo/proibição (subsidiária)",
    "Descolamento da defesa dos PMs co-réus — Garrido como 'corda fraca' / idoso-locatário vítima"
  ],

  roteiro_acareacao: {
    contexto: "Acareação Joel × Edilton requerida pelo MP para esclarecer identificação de 'Bola'.",
    objetivos_defesa_garrido: [
      "Consignar em ata a retratação de Edilton sobre o vídeo (coação da primeira guarnição)",
      "Consignar em ata a retratação de Joel sobre o termo da delegacia ('retirar Garrido')",
      "Obter, se possível, afirmação de Joel de que não conhece Garrido pessoalmente",
      "Obter de Edilton confirmação de que Garrido não estava armado nem deu comando aos atiradores"
    ],
    perguntas_para_edilton: [
      "Quando o senhor chegou ao terreno, o Sr. Garrido estava armado?",
      "O Sr. Garrido foi agredido por alguém do grupo em que o senhor estava?",
      "O Sr. Garrido deu comando aos atiradores ou permaneceu como refém?",
      "O vídeo em que o senhor menciona Garrido foi gravado antes ou depois de a primeira guarnição tê-lo detido?"
    ],
    perguntas_para_joel: [
      "O senhor viu pessoalmente o Sr. Garrido em algum momento antes ou depois dos fatos?",
      "Alguma vez firmou contrato direto com Garrido para cuidar do terreno?",
      "O senhor efetivamente ofereceu serviço de segurança a Ítalo e Cleverson para retirar Garrido, como consta no termo da delegacia?",
      "O senhor reconhece agora, olhando para o Sr. Edilton, a pessoa que esteve no seu terreno no dia dos fatos?"
    ],
    requerimentos_na_abertura: [
      "Exibição do termo de delegacia de Joel com leitura textual para confronto (art. 229 CPP)",
      "Consignação em ata do conteúdo das oitivas de hoje (16/04) no que diz respeito a Garrido",
      "Juntada/exibição do '2º vídeo' (Joel + Garrido) mencionado pelo assistente de acusação"
    ]
  },

  crimePrincipal: "Homicídio qualificado em concurso (art. 121, §2º CP) — partícipe (imputação contra Garrido)",

  estrategia: "Defesa descolada dos PMs co-réus. Foco subjetivo: idoso-locatário agredido, assustado, sem dolo nem domínio do fato. Uso ofensivo das retratações de Edilton e Joel em 16/04/2026 como fundamento para absolvição por ausência de prova ou, subsidiariamente, absolvição por legítima defesa da posse.",

  achadosChave: [
    "Edilton retratou o vídeo-base da imputação contra Garrido (coação da primeira guarnição)",
    "Joel desautorizou o termo da delegacia sobre 'Ítalo/Cleverson se oferecerem para retirar Garrido'",
    "Joel atribui colocação de Garrido no imóvel ao ex-corretor Luiz (não a si mesmo)",
    "Seu José (MP) descreve sinais de arrombamento prévio e não viu armas no carro de Joel",
    "Contradição interna de Joel sobre 'Bola' (nega conhecer, mas narra sequestro com 'Bola')",
    "Três testemunhas centrais admitiram assinar termos da delegacia sem leitura integral",
    "Existência de '2º vídeo' (Joel + Garrido) mencionado pelo assistente de acusação — ainda não juntado formalmente"
  ],

  recomendacoes: [
    "Consignar em ata tudo o que for dito na acareação amanhã (não delegar a memória da audiência)",
    "Requerer o exame pericial do '2º vídeo' caso seja juntado (art. 158-A e ss CPP)",
    "Arrolar Genivaldo como testemunha de defesa ao longo da instrução remanescente",
    "Requerer bilhetagem telefônica de Garrido no dia dos fatos",
    "Em alegações finais, cruzar depoimentos para sustentar absolvição (art. 386, VII, CPP)",
    "Preparar tese subsidiária de desclassificação caso juízo não acolha absolvição"
  ],

  orientacaoAssistido: "Garrido deve comparecer à acareação com postura humilde, demonstrar medo e confusão (coerente com sua idade e papel de vítima). NÃO estabelecer intimidade verbal com co-réus PMs. Reforçar ser locatário, não caseiro. Não discutir fatos com testemunhas no corredor. Confirmar em voz alta quando perguntado que os documentos entregues à Dra. Amanda foram efetivamente juntados, se houver dúvida.",

  perspectivaPlenaria: "Narrativa de plenário a ser construída: 'o idoso-locatário que ficou no meio do tiroteio'. Perfil ideal de jurado: trabalhador, família, moradia própria — sensíveis à ideia de defesa da posse. Evitar jurados com vínculo policial direto. Estratégia de contra-narrativa ao MP: apontar a incoerência entre tratar Garrido como 'intelectual' da ação quando o próprio Joel (que seria o mandante) nega ter sido o contratante.",

  quesitos_criticos: [
    "Autoria — está provado que o réu concorreu para os homicídios?",
    "Qualificadoras (emboscada, recurso que dificultou a defesa) — está configurada a emboscada se Garrido nega ter chamado os executores para matar?",
    "Tese absolutória: legítima defesa da posse — está demonstrado que Garrido agiu para repelir injusta agressão?"
  ],

  avaliacao_risco_v2: {
    risco_geral: "MÉDIO",
    justificativa: "Processo complexo com muitos co-réus PMs; carga probatória construída pela PM favorece a acusação em um cenário de júri comum. Porém, as retratações de 16/04/2026 criam base sólida para absolvição se bem trabalhadas no plenário.",
    risco_condenacao_garrido: "MÉDIO-BAIXO (se retratações forem bem exploradas)",
    atenuantes: ["Idade (66 anos, art. 65, I CP)", "Primariedade a verificar", "Confissão se aplicável no interrogatório"]
  }
};

async function main() {
  console.log('=== ETAPA 1: Criar processo para Garrido (aid 594) ===');
  const { data: existing } = await sb
    .from('processos')
    .select('id')
    .eq('assistido_id', ASSISTIDO_GARRIDO)
    .eq('numero_autos', NUMERO_AUTOS)
    .maybeSingle();

  let garridoProcId;
  if (existing) {
    console.log('Processo já existe, id=', existing.id, '→ atualizando');
    garridoProcId = existing.id;
    const { error } = await sb.from('processos').update({
      is_juri: true,
      area: 'JURI',
      atribuicao: 'JURI_CAMACARI',
      vara: 'VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI',
      comarca: 'Camaçari',
      comarca_id: 1,
      classe_processual: 'Ação Penal',
      situacao: 'ativo',
      fase: 'Instrução (pós-pronúncia)',
      tipo_processo: 'AP',
      drive_folder_id: DRIVE_FOLDER_GARRIDO,
      link_drive: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_GARRIDO}`,
      analysis_data: ANALYSIS,
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      analysis_version: 2,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { data: created, error } = await sb.from('processos').insert({
      assistido_id: ASSISTIDO_GARRIDO,
      numero_autos: NUMERO_AUTOS,
      atribuicao: 'JURI_CAMACARI',
      is_juri: true,
      area: 'JURI',
      vara: 'VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI',
      comarca: 'Camaçari',
      comarca_id: 1,
      classe_processual: 'Ação Penal',
      situacao: 'ativo',
      fase: 'Instrução (pós-pronúncia)',
      tipo_processo: 'AP',
      drive_folder_id: DRIVE_FOLDER_GARRIDO,
      link_drive: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_GARRIDO}`,
      analysis_data: ANALYSIS,
      analysis_status: 'completed',
      analyzed_at: new Date().toISOString(),
      analysis_version: 2,
      observacoes: 'Duplo homicídio qualificado (Ítalo Andrade PM + Cleberson ex-fuzileiro) — Fazenda Camarão, Barra do Jacuípe, 11/09/2020. Garrido como partícipe/olheiro (acusação). Tese defesa: locatário-vítima / legítima defesa da posse.'
    }).select('id').single();
    if (error) throw error;
    garridoProcId = created.id;
    console.log('Processo Garrido criado, id=', garridoProcId);
  }

  console.log('\n=== ETAPA 2: Corrigir processo 240 (VVD→Júri) ===');
  const { error: err240 } = await sb.from('processos').update({
    is_juri: true,
    area: 'JURI',
    atribuicao: 'JURI_CAMACARI',
    vara: 'VARA DO JÚRI E EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI',
    fase: 'Instrução (pós-pronúncia)',
    updated_at: new Date().toISOString()
  }).eq('id', 240);
  if (err240) console.warn('Aviso proc 240:', err240.message);
  else console.log('Proc 240 atualizado para Júri');

  console.log('\n=== ETAPA 3: Criar audiência de acareação para Garrido ===');
  // Check existing
  const { data: audExist } = await sb
    .from('audiencias')
    .select('id')
    .eq('assistido_id', ASSISTIDO_GARRIDO)
    .gte('data_audiencia', '2026-04-17')
    .lt('data_audiencia', '2026-04-18')
    .maybeSingle();

  const audPayload = {
    processo_id: garridoProcId,
    assistido_id: ASSISTIDO_GARRIDO,
    data_audiencia: DATA_AUD,
    tipo: 'Continuação de Instrução / Acareação',
    local: 'Vara do Júri e Execuções Penais de Camaçari/BA',
    sala: 'Vara do Júri',
    titulo: 'Acareação Joel × Edilton + Continuação Instrução — Antônio Roberto Garrido Rodrigues — 8004502-05.2023.8.05.0039',
    descricao: 'Acareação entre Joel Lopes e Edilton Pessoa de Alcântara (requerida pelo MP para esclarecer identificação de \'Bola\'). Continuação da instrução com os co-réus do duplo homicídio de Ítalo Andrade e Cleberson Santos.',
    juiz: 'Yasmim (designada em 02/02/2026)',
    status: 'agendada',
    resumo_defesa: 'Defesa de Antônio Roberto Garrido Rodrigues (66 anos, locatário do imóvel da Fazenda Camarão). Acareação Joel × Edilton visa esclarecer identificação de \'Bola\'. Subsídios principais: (1) Edilton retratou em 16/04/2026 o vídeo-base da imputação contra Garrido alegando coação da primeira guarnição policial; (2) Joel, em nova oitiva, afirmou que \'foi o Luiz que botou, era Garrido\' e desqualificou o termo de delegacia sobre Ítalo/Cleverson \'se oferecerem para retirar Garrido do imóvel\'; (3) José Reis (MP) descreveu sinais de arrombamento prévio, ausência de armas no carro e admitiu ter assinado termo de delegacia sem leitura integral. Objetivo tático: consignar em ata as retratações, obter confirmação de que Joel não conhece pessoalmente Garrido, requerer juntada do \'2º vídeo\' (Joel + Garrido) mencionado pelo assistente de acusação, reiterar oitiva de Genivaldo e bilhetagem telefônica.',
    anotacoes: [
      '=== AUDIÊNCIA ANTERIOR (16/04/2026) — RESUMO OPERACIONAL ===',
      'Edilton (reabertura limitada ao vídeo): não reconhece pessoas; retratou vídeo alegando coação da 1ª guarnição (\'Santiago\').',
      'José Reis Xavier (Seu José): sinais de arrombamento prévio; sem armas no carro; cronologia vacilante; assinou termo sem ler; contesta \'vulgo Neguinho\'.',
      'Joel Lopes (95 anos): \'foi o Luiz que botou, era Garrido\'; desqualifica termo da delegacia sobre retirada de Garrido.',
      '',
      '=== ESTRATÉGIA PARA A ACAREAÇÃO (17/04/2026) ===',
      '1. Exibir termo de delegacia de Joel e confrontar ponto a ponto (art. 229 CPP).',
      '2. Consignar em ata a retratação de Edilton sobre o vídeo.',
      '3. Consignar em ata a não-identificação pessoal de Garrido por Joel.',
      '4. Requerer juntada do \'2º vídeo\' (Joel + Garrido) citado pelo assistente de acusação.',
      '5. Reiterar pedido de oitiva de Genivaldo (vizinho que teria acionado Edson).',
      '6. Requerer bilhetagem telefônica de Garrido no dia dos fatos.',
      '7. Preparar roteiro de interrogatório de Garrido focado em: locatário (não caseiro), invadido/agredido, ausência de comando.'
    ].join('\n'),
    anotacoes_rapidas: 'ACAREAÇÃO JOEL×EDILTON — explorar retratações de 16/04. Garrido: locatário (não caseiro), legítima defesa da posse.',
    gerar_prazo_apos: false,
    updated_at: new Date().toISOString()
  };

  let audId;
  if (audExist) {
    const { error } = await sb.from('audiencias').update(audPayload).eq('id', audExist.id);
    if (error) throw error;
    audId = audExist.id;
    console.log('Audiência atualizada, id=', audId);
  } else {
    const { data: adCreated, error } = await sb.from('audiencias').insert({ ...audPayload, created_at: new Date().toISOString() }).select('id').single();
    if (error) throw error;
    audId = adCreated.id;
    console.log('Audiência criada, id=', audId);
  }

  console.log('\n=== ETAPA 4: Inserir testemunhas ===');
  const testemunhas = [
    {
      processo_id: garridoProcId,
      audiencia_id: audId,
      nome: 'Edilton Pessoa de Alcântara',
      tipo: 'ACUSACAO',
      status: 'OUVIDA',
      ouvido_em: '2026-04-16',
      resumo_depoimento: 'Vítima sobrevivente. Na coleta antecipada 2025 detalhou ação da PM, manipulação de cena, coordenação por Nascimento, ameaças e tentativa de suborno. Na audiência de 16/04/2026 (reabertura limitada ao vídeo juntado pela defesa): renegou integralmente o conteúdo do vídeo, atribuindo-o a coação da primeira guarnição (cita \'Santiago\') — \'quando você mente, você não grava\'.',
      sintese_juizo: 'Em 16/04/2026, com escopo limitado ao vídeo: não reconheceu ninguém nos vídeos/fotos. Declarou: \'Tudo que eu falei no local do ocorrido foi por manipulação, por ter sido coagido\'. Relatou que foi instruído pela 1ª guarnição (\'Santiago\'). Assistente de acusação (Rodrigo/FESOL) mencionou \'2º vídeo\' envolvendo Joel e Antônio Roberto Garrido; Edilton disse não poder detalhar por áudio ruim e memória comprometida.',
      pontos_favoraveis: 'Retratação do vídeo derruba a principal prova contra Garrido. Descreve grupo executor como PMs/civis sem Garrido em posição de comando. Alega coação da PM — abre porta para impugnação probatória.',
      pontos_desfavoraveis: 'Em coleta antecipada ainda pesa contra Garrido (frase \'já liguei pro homem\' e pedido para \'ficar quieto\'). Necessário confrontar com a retratação atual em plenário.',
      perguntas_sugeridas: '1. Quando o senhor chegou ao terreno, o Sr. Garrido estava armado?\n2. O Sr. Garrido foi agredido por alguém do grupo em que o senhor estava?\n3. O Sr. Garrido deu comando aos atiradores ou permaneceu como refém?\n4. O vídeo em que o senhor menciona Garrido foi gravado antes ou depois de a primeira guarnição tê-lo detido?\n5. Quem especificamente da 1ª guarnição coagiu o senhor a dizer o que disse no vídeo?',
      ordem_inquiricao: 1
    },
    {
      processo_id: garridoProcId,
      audiencia_id: audId,
      nome: 'José Reis Xavier dos Santos',
      tipo: 'ACUSACAO',
      status: 'OUVIDA',
      ouvido_em: '2026-04-16',
      resumo_depoimento: 'Trabalhador/motorista de Joel (pintura, medições, placas). Acompanhou Joel ao local dos fatos. Descreveu sinais de arrombamento prévio na casa (cadeado/corrente quebrados, materiais danificados), anúncio \'sou polícia\' por dois mascarados (bonés/Covid), aproximadamente 2 disparos sem ver atiradores, Joel sendo erguido pelo braço e batendo a cabeça na mureta. Não viu armas no carro nem ferramentas. Fugiu pelo mato, deixou documento no muro.',
      sintese_juizo: 'Em 16/04/2026: divergências com o termo da delegacia — cronologia vacilante (tiros antes/depois do anúncio), um ou dois terrenos visitados. Admitiu ter assinado termo da delegacia sem leitura integral. Contestou a inserção de \'vulgo Neguinho\' no termo. Na delegacia reconheceu por foto única um \'moreno meio gordinho\' sem certeza.',
      pontos_favoraveis: 'Sinais de arrombamento prévio compatíveis com tese de invasão narrada por Garrido. Não viu armas nem ferramentas — afasta narrativa de grupo organizado armado saindo com Joel. Admissão de fragilidade do termo da delegacia (modelo coletivo de impugnação da fase inquisitorial).',
      pontos_desfavoraveis: 'Menciona um \'homem à vontade\' na casa (possível interpretação como caseiro) — pode ser referência a Garrido, exige trabalho para descaracterizar.',
      perguntas_sugeridas: '1. Quando o senhor chegou, já havia sinais de arrombamento no portão e na casa?\n2. O senhor viu armas no carro em que estava com Joel?\n3. O \'homem à vontade\' que o senhor descreveu portava arma ou parecia exercer alguma liderança?\n4. O senhor escreveu sozinho o depoimento na delegacia ou o delegado transcreveu?\n5. O senhor já havia visto o Sr. Garrido em alguma ocasião anterior?',
      ordem_inquiricao: 2
    },
    {
      processo_id: garridoProcId,
      audiencia_id: audId,
      nome: 'Joel Lopes da Pinto (Cunha)',
      tipo: 'COMUM',
      status: 'OUVIDA',
      ouvido_em: '2026-04-16',
      resumo_depoimento: 'Proprietário (95 anos) da Fazenda Camarão. Depoimento complexo e marcado por inconsistências. Descreveu invasão liderada pelo ex-corretor Luiz em conluio com sua filha Neide. Relatou sequestro anterior (R$ 80 mil exigidos, pagou R$ 90 mil para poupar a vida; posterior tentativa com R$ 40 mil + carro). Narrativa do dia dos fatos: levou 2 supostos compradores; portão cadeado; compradores pularam muro; chegada de 3 armados (Luís, Edson, outro); tiroteio; Edson o agrediu dizendo \'já foi dois, agora é você\'; defecou involuntariamente.',
      sintese_juizo: 'Em 16/04/2026 afirmou textualmente: \'Me falaram que o nome dele, que foi o Luiz que botou, era Garrido\' — atribui a colocação de Garrido ao ex-corretor invasor, não a si mesmo. Confrontado com o termo da delegacia (\'Ítalo e Cleverson se ofereceram para dar apoio de segurança com a finalidade de retirar Garrido\') respondeu \'não tinha certeza do que era nada disso\'. Nega conhecer \'Edilton Bola\' pessoalmente — contradição interna com narrativa de sequestro por \'Bola\'. Nega ter sido arrastado (contraria termo anterior). Memória falha justificada por idade e trauma.',
      pontos_favoraveis: 'Retratação crucial do termo da delegacia que colocava Joel como mandante da retirada de Garrido. Atribuição da colocação de Garrido ao ex-corretor Luiz — quebra da tese de caseiro-a-mando-de-Joel. Descrédito geral: testemunha vacilante, de 95 anos, que contradiz seu próprio motorista (Xavier) quanto à razão da ida ao local.',
      pontos_desfavoraveis: 'Coleta 2025 já havia mencionado \'Bola\' e caseiro — expressões que podem ser reaproveitadas pela acusação se não forem trabalhadas no contexto das contradições atuais.',
      perguntas_sugeridas: '1. O senhor viu pessoalmente o Sr. Garrido em algum momento antes ou depois dos fatos?\n2. Alguma vez firmou contrato direto com Garrido para cuidar do terreno?\n3. O senhor efetivamente ofereceu serviço de segurança a Ítalo e Cleverson para retirar Garrido, como consta no termo da delegacia?\n4. O senhor reconhece o Sr. Edilton aqui presente como a pessoa que esteve no seu terreno no dia dos fatos?\n5. O \'Bola\' do sequestro e o \'Edilton\' da oitiva de hoje são a mesma pessoa?',
      ordem_inquiricao: 3
    },
    {
      processo_id: garridoProcId,
      audiencia_id: null,
      nome: 'Genivaldo',
      tipo: 'DEFESA',
      status: 'ARROLADA',
      resumo_depoimento: 'Vizinho do imóvel. Apontado pelo co-réu Edson (policial militar) como quem teria acionado a polícia por invasão — o que destrói a tese de que Garrido foi o elo comunicativo com os executores.',
      sintese_juizo: null,
      pontos_favoraveis: 'Trunfo da defesa. Se confirmar que acionou Edson/PM, desfaz a narrativa acusatória central contra Garrido.',
      pontos_desfavoraveis: '—',
      perguntas_sugeridas: '1. Foi o senhor quem acionou a polícia no dia 11/09/2020 por invasão ao imóvel de Garrido?\n2. O senhor conhecia o Sr. Garrido como caseiro ou como locatário?\n3. O senhor presenciou portões arrombados ou algum tipo de tumulto antes da chegada da polícia?',
      ordem_inquiricao: 99
    }
  ];

  for (const t of testemunhas) {
    const { data: existT } = await sb.from('testemunhas').select('id').eq('processo_id', garridoProcId).eq('nome', t.nome).maybeSingle();
    if (existT) {
      await sb.from('testemunhas').update(t).eq('id', existT.id);
      console.log('Testemunha atualizada:', t.nome);
    } else {
      await sb.from('testemunhas').insert(t);
      console.log('Testemunha inserida:', t.nome);
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Processo Garrido id:', garridoProcId);
  console.log('Audiência id:', audId);
  console.log('Drive folder:', `https://drive.google.com/drive/folders/${DRIVE_FOLDER_GARRIDO}`);
}

main().catch(e => { console.error(e); process.exit(1); });
