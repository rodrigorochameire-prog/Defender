"use client";

import { Sparkles } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import {
  BlocoCaso,
  BlocoPessoas,
  BlocoProvas,
  BlocoEstrategia,
  BlocoPreparacao,
  type AnalysisBlocksData,
} from "./analise-blocks";
import { trpc } from "@/lib/trpc/client";

// ─── Mock Data (Adenilson case) ────────────────────────────────────────────

const MOCK_ANALYSIS: AnalysisBlocksData = {
  caso: {
    resumoFato:
      "Adenilson Souza dos Santos e identificado como autor de homicidio qualificado ocorrido em 15/09/2024, na localidade de Alto do Cruzeiro, Camacari/BA. A vitima, Carlos Eduardo Lima, foi atingida por dois disparos de arma de fogo (regiao toracica e abdominal) apos suposta discussao em via publica. O reu foi preso em flagrante no local, portando arma calibre .38, registrada em nome de terceiro. Ha relatos de ameacas previas da vitima contra o reu e historico de conflito entre as familias.",
    narrativaDenuncia:
      "O Ministerio Publico sustenta que o denunciado, de forma livre e consciente, efetuou dois disparos contra a vitima por motivo torpe (divida de drogas), impossibilitando a defesa da vitima que estava desarmada e de costas. Arrola 3 testemunhas presenciais e se ampara no laudo cadaverico que aponta trajetoria dos projeteis de tras para frente.",
    narrativaDefensiva:
      "A defesa pode construir narrativa de legitima defesa putativa: a vitima, conhecida por comportamento agressivo e portadora habitual de arma branca (faca), havia ameacado o reu e sua familia nos dias anteriores. No momento do fato, a vitima fez menção de sacar objeto da cintura (conforme testemunha Jose Carlos), levando o reu a acreditar em agressao iminente. O ferimento cortante no braco direito do reu corrobora confronto fisico previo aos disparos.",
    cronologia: [
      {
        data: "10/09/2024",
        evento: "Vitima ameaca reu e familia em via publica",
        fonte: "Testemunha Jose Carlos",
        relevancia: "Estabelece historico de ameacas previas",
      },
      {
        data: "12/09/2024",
        evento: "Reu registra BO por ameaca contra vitima",
        fonte: "RO 1234/2024",
        relevancia: "Documenta temor previo e busca por protecao legal",
      },
      {
        data: "14/09/2024",
        evento: "Vitima vista armada com faca em bar proximo",
        fonte: "Informante Ana Paula",
        relevancia: "Corrobora porte habitual de arma branca",
      },
      {
        data: "15/09/2024 19h30",
        evento: "Confronto e disparos — vitima socorrida ao Hospital Geral de Camacari",
        fonte: "Auto de prisao em flagrante",
        relevancia: "Fato principal",
      },
      {
        data: "15/09/2024 21h45",
        evento: "Obito da vitima no hospital",
        fonte: "Certidao de obito",
        relevancia: "Consumacao do homicidio",
      },
      {
        data: "16/09/2024",
        evento: "Exame de corpo de delito do reu — ferimento cortante no braco direito",
        fonte: "IML",
        relevancia: "Corrobora confronto fisico e versao de legitima defesa",
      },
    ],
    fatosRelacionados: [
      {
        descricao: "Vitima tinha passagem por lesao corporal contra ex-companheira em 2022",
        conexaoComCaso: "Demonstra perfil agressivo da vitima, relevante para tese de legitima defesa",
        fonte: "Certidao de antecedentes",
      },
      {
        descricao: "Disputas entre familias por terreno no Alto do Cruzeiro",
        conexaoComCaso: "Contexto do conflito — MP pode usar para alegar motivo torpe, defesa pode usar para demonstrar temor fundamentado",
        fonte: "Informativo policial",
      },
    ],
  },

  pessoas: {
    perfilReu: {
      historico: "35 anos, pedreiro, morador do Alto do Cruzeiro ha 20 anos",
      contextoSocial:
        "Casado, 2 filhos menores (8 e 12 anos), unico provedor. Sem antecedentes criminais. Membro ativo da comunidade, citado como pessoa pacifica por vizinhos.",
      antecedentes: [],
      condicoesAtenuantes: [
        "Primario e de bons antecedentes",
        "Confissao espontanea parcial (admite disparos, alega defesa)",
        "Pai de 2 filhos menores dependentes",
      ],
      versaoDosFatos:
        "Relata que estava retornando do trabalho quando foi abordado pela vitima que o ameacou com objeto na cintura. Tentou se afastar mas foi agredido com faca (ferimento no braco). Sacou a arma emprestada de amigo e disparou para se defender.",
    },
    perfilVitima: {
      relacaoComReu: "Vizinhos no Alto do Cruzeiro, familias em conflito por terreno",
      historico:
        "28 anos, sem ocupacao formal. Uma passagem por lesao corporal (2022). Conhecido na comunidade como 'esquentado'.",
      comportamentoRelatado:
        "Vizinhos relatam comportamento agressivo, porte frequente de arma branca, envolvimento com trafico local (nao comprovado nos autos)",
      credibilidade: "Historico de agressividade corrobora versao da defesa sobre temor",
    },
    depoentes: [
      {
        nome: "Maria Conceicao dos Santos",
        tipo: "ACUSACAO",
        statusIntimacao: "INTIMADO",
        perfil: "Vizinha, estava na varanda no momento dos fatos. Mora a 30m do local.",
        versaoDelegacia:
          "Disse que viu o reu atirar na vitima pelas costas, sem provocacao",
        versaoJuizo:
          "Mudou parcialmente: admitiu que houve discussao antes, mas manteve que vitima estava de costas",
        contradicoes: [
          "Na delegacia disse 'sem provocacao', em juizo admitiu discussao previa",
          "Distancia de 30m a noite — questionavel se podia ver detalhes",
        ],
        pontosFortes: ["Mudou versao entre fases — credibilidade abalada"],
        pontosFracos: ["Unica testemunha que afirma tiros pelas costas"],
        perguntasSugeridas: [
          "A senhora consegue descrever a iluminacao do local no momento dos fatos?",
          "Na delegacia a senhora disse que nao houve provocacao. Em juizo disse que houve discussao. Qual das versoes e a verdadeira?",
          "A senhora viu se a vitima portava algum objeto na cintura?",
          "Qual a sua relacao com a familia da vitima?",
        ],
        credibilidade: "Baixa — contradição grave entre fases, distancia e iluminacao questionaveis",
      },
      {
        nome: "Jose Carlos Oliveira",
        tipo: "DEFESA",
        statusIntimacao: "PENDENTE",
        perfil:
          "Amigo do reu, estava no bar proximo. Afirma ter presenciado ameacas previas.",
        versaoDelegacia:
          "Disse que viu a vitima ameacar o reu 5 dias antes e fazer mençao de sacar objeto da cintura no dia do fato",
        versaoJuizo: "",
        contradicoes: [],
        pontosFortes: [
          "Versao consistente e detalhada",
          "Corrobora ameacas previas",
        ],
        pontosFracos: ["Amigo do reu — MP vai questionar imparcialidade"],
        perguntasSugeridas: [
          "O senhor presenciou pessoalmente as ameacas do dia 10/09?",
          "Pode descrever o gesto que a vitima fez com a mao antes dos disparos?",
          "O senhor viu algum objeto na mao da vitima?",
        ],
        credibilidade: "Media — relato consistente mas relacao de amizade gera suspeicao",
      },
      {
        nome: "Dr. Roberto Andrade",
        tipo: "PERITO",
        statusIntimacao: "NAO_INTIMADO",
        perfil: "Medico legista responsavel pelo laudo cadaverico",
        versaoDelegacia: "",
        versaoJuizo: "",
        contradicoes: [],
        pontosFortes: [
          "Laudo nao exclui categoricamente legitima defesa",
        ],
        pontosFracos: [
          "Trajetoria de tras para frente favorece versao do MP",
        ],
        perguntasSugeridas: [
          "A trajetoria descrita e compativel com cenario em que a vitima girava o corpo durante confronto?",
          "E possivel que a vitima estivesse em movimento rotacional ao ser atingida?",
        ],
        credibilidade: "Alta — perito oficial",
      },
    ],
    informantes: [
      {
        fonte: "Informativo Policial — DRACO/Camacari",
        conteudo:
          "Apuracao sobre dinamica do trafico no Alto do Cruzeiro. Menciona vitima como 'associado' a faccao local, sem comprovacao formal.",
        confiabilidade: "Media — fonte policial, porem sem provas documentais do envolvimento",
        informacoesRelevantes: [
          "Vitima mencionada como associada a faccao",
          "Historico de conflitos armados na regiao",
          "Disputa territorial entre grupos rivais",
        ],
        conexaoComCaso:
          "Pode contextualizar perfil agressivo da vitima e ambiente de violencia, mas risco de preconceito contra reu",
      },
    ],
  },

  provas: {
    elementosInquisitoriais: [
      {
        tipo: "Auto de prisao em flagrante",
        descricao: "Reu preso no local com arma calibre .38 registrada em nome de terceiro",
        origem: "Delegacia",
        peso: "alto",
        contestavel: true,
        argumento:
          "Posse da arma nao implica autoria dolosa — compativel com posse para defesa em contexto de ameacas",
      },
      {
        tipo: "Depoimento policial",
        descricao: "PM afirma que reu estava 'calmo' no momento da prisao",
        origem: "Sgt. Ferreira",
        peso: "medio",
        contestavel: true,
        argumento:
          "Estado emocional pos-fato nao indica premeditacao; choque pos-traumatico pode causar aparente calma",
      },
    ],
    elementosProbatorios: [
      {
        tipo: "Depoimento Maria Conceicao",
        descricao: "Afirma que reu disparou pelas costas da vitima",
        origem: "Audiencia de instrucao",
        peso: "alto",
        favoravel: false,
        contestavel: true,
      },
    ],
    provasPericiais: [
      {
        tipo: "Laudo cadaverico",
        perito: "Dr. Roberto Andrade",
        conclusao:
          "Dois ferimentos por projetil de arma de fogo: regiao toracica posterior e abdominal lateral. Trajetoria de tras para frente e de cima para baixo.",
        pontoCritico:
          "Trajetoria nao exclui cenario de luta corporal com vitima em movimento rotacional",
        contestacao:
          "Requerer esclarecimentos sobre possibilidade de vitima estar girando o corpo — a trajetoria descrita e compativel com confronto dinamico, nao apenas ataque pelas costas",
      },
      {
        tipo: "Exame de corpo de delito do reu",
        perito: "Dra. Lucia Santos",
        conclusao:
          "Ferimento cortante no braco direito, compativel com instrumento perfuro-cortante (faca)",
        pontoCritico: "Corrobora versao de que houve confronto fisico previo aos disparos",
        contestacao: "",
      },
    ],
    provasDocumentais: [
      {
        documento: "BO 1234/2024 — ameaca",
        conteudo: "Registrado pelo reu 3 dias antes do fato, relatando ameacas da vitima",
        relevancia: "Documenta temor previo e busca por meios legais de protecao",
        favoravel: true,
      },
      {
        documento: "Certidao de antecedentes da vitima",
        conteudo: "Uma passagem por lesao corporal (art. 129) em 2022",
        relevancia: "Corrobora perfil agressivo da vitima",
        favoravel: true,
      },
      {
        documento: "Registro de arma",
        conteudo: "Arma calibre .38 registrada em nome de Antonio Ferreira (amigo do reu)",
        relevancia: "MP pode usar porte ilegal como agravante; defesa argumenta emprestimo diante de ameacas",
        favoravel: false,
      },
    ],
    informativosInvestigacao: [
      {
        fonte: "Informativo DRACO/Camacari",
        dataApuracao: "20/09/2024",
        conteudo:
          "Apuracao sobre dinamica criminal no Alto do Cruzeiro. Menciona historico de conflitos armados na regiao.",
        informacoesRelevantes: [
          "Vitima associada a grupo local",
          "Regiao tem historico de homicidios por disputas territoriais",
        ],
        credibilidade: "Media",
      },
    ],
    possibilidadesProbatorias: [
      {
        diligencia: "Oitiva de Jose Carlos Oliveira em juizo",
        objetivo: "Confirmar ameacas previas e gesto da vitima no momento do fato",
        fundamento: "art. 400 CPP",
        urgencia: "alta",
      },
      {
        diligencia: "Laudo de exame residuografico nas maos da vitima",
        objetivo: "Verificar se vitima portava objeto metalico (faca) no momento",
        fundamento: "art. 6o, VII, CPP",
        urgencia: "alta",
      },
      {
        diligencia: "Pericia de local com reconstituicao simulada",
        objetivo: "Demonstrar que trajetoria dos projeteis e compativel com luta corporal",
        fundamento: "art. 7o CPP",
        urgencia: "media",
      },
      {
        diligencia: "Imagens de cameras de seguranca do comercio proximo",
        objetivo: "Verificar existencia de registro visual do confronto",
        fundamento: "art. 240 CPP",
        urgencia: "media",
      },
    ],
  },

  estrategia: {
    tesePrincipal: {
      tese: "Legitima defesa putativa",
      fundamentoFatico:
        "Vitima havia ameacado reu e familia dias antes (BO registrado). No momento do fato, fez gesto de sacar objeto da cintura (testemunha Jose Carlos). Reu tinha ferimento cortante no braco (laudo IML), demonstrando agressao previa com arma branca.",
      fundamentoJuridico: "art. 25 c/c art. 20, par. 1o, CP — descriminante putativa por erro de tipo",
      elementosQueCorroboram: [
        "BO 1234/2024 — ameaca registrada 3 dias antes",
        "Ferimento cortante no braco do reu (laudo IML)",
        "Testemunha Jose Carlos — viu gesto de sacar objeto",
        "Antecedentes da vitima — passagem por lesao corporal",
        "Atendimento 15/01 — relato do reu consistente com versao de Jose Carlos",
      ],
    },
    tesesSubsidiarias: [
      {
        tese: "Excesso exculpante na legitima defesa",
        fundamento:
          "Mesmo que se reconheca que houve excesso nos disparos, o reu agiu sob dominio de violenta emocao diante de agressao injusta (art. 65, III, c, CP)",
        quandoUsar:
          "Se o juri reconhecer a situacao de defesa mas entender que os dois disparos foram excessivos",
      },
      {
        tese: "Homicidio privilegiado por violenta emocao",
        fundamento:
          "Reu agiu sob dominio de violenta emocao logo apos injusta provocacao da vitima (art. 121, par. 1o, CP)",
        quandoUsar:
          "Se o juri nao aceitar a legitima defesa — buscar desclassificacao para privilegiado, afastando qualificadoras",
      },
    ],
    nulidades: [
      {
        tipo: "Ausencia de advogado na oitiva do reu na delegacia",
        descricao:
          "O interrogatorio do reu na delegacia foi realizado sem presenca de advogado, em violacao ao art. 5o, LXIII da CF",
        severidade: "alta",
        fundamentacao:
          "Nulidade absoluta conforme jurisprudencia do STF (HC 127.900). Declaracoes nao podem ser usadas como prova",
      },
      {
        tipo: "Ausencia de exame residuografico na vitima",
        descricao:
          "Nao foi realizado exame para verificar se a vitima portava arma branca no momento do fato",
        severidade: "media",
        fundamentacao:
          "Cerceamento de defesa — diligencia relevante para comprovar tese da defesa nao foi realizada pela autoridade policial",
      },
    ],
    qualificadoras: [
      {
        tipo: "Motivo torpe (divida de drogas)",
        imputada: true,
        contestavel: true,
        argumento:
          "Nao ha prova nos autos de relacao com drogas entre reu e vitima. MP baseou-se em 'informacoes da vizinhanca' sem individualizar fonte. Conflito comprovado e por disputa de terreno entre familias.",
      },
      {
        tipo: "Recurso que impossibilitou defesa da vitima",
        imputada: true,
        contestavel: true,
        argumento:
          "Ferimento no braco do reu comprova confronto fisico previo. Testemunha Maria mudou versao entre fases. Nao ha prova segura de ataque pelas costas sem provocacao.",
      },
    ],
    pontosFortes: {
      defesa: [
        {
          ponto: "Ferimento cortante no reu comprovado por laudo IML",
          elementos: ["Laudo IML", "Fotos do ferimento"],
        },
        {
          ponto: "BO registrado 3 dias antes comprova temor previo",
          elementos: ["BO 1234/2024"],
        },
        {
          ponto: "Testemunha de acusacao mudou versao entre fases",
          elementos: ["Depoimento Maria — delegacia vs juizo"],
        },
        {
          ponto: "Reu primario e de bons antecedentes",
          elementos: ["FAC limpa", "Testemunhos abonativos"],
        },
        {
          ponto: "Vitima com antecedente criminal e perfil agressivo",
          elementos: ["Certidao antecedentes", "Relatos de vizinhos"],
        },
      ],
      acusacao: [
        {
          ponto: "Trajetoria dos projeteis de tras para frente (laudo)",
          elementos: ["Laudo cadaverico"],
        },
        {
          ponto: "Arma nao era do reu — porte ilegal",
          elementos: ["Registro da arma"],
        },
        {
          ponto: "Testemunha Maria afirma tiros pelas costas",
          elementos: ["Depoimento em juizo"],
        },
        {
          ponto: "Reu permaneceu no local armado apos os fatos",
          elementos: ["APF"],
        },
      ],
    },
    pontosFracos: {
      defesa: [
        {
          ponto: "Principal testemunha de defesa (Jose Carlos) e amigo do reu",
          mitigacao:
            "Preparar perguntas que demonstrem detalhes especificos que so quem presenciou saberia, fortalecendo credibilidade",
        },
        {
          ponto: "Arma emprestada configura porte ilegal",
          mitigacao:
            "Argumentar que reu buscou arma diante de ameacas concretas quando o Estado falhou em protege-lo (BO sem providencias)",
        },
        {
          ponto: "Dois disparos podem ser interpretados como excesso",
          mitigacao:
            "Argumentar reacao instintiva em situacao de estresse extremo — nao ha como dosar a defesa em fracao de segundo",
        },
      ],
      acusacao: [
        {
          ponto: "Nao ha prova material do motivo torpe (drogas)",
          comoExplorar:
            "Insistir em plenario que a qualificadora se baseia em boato, nao em prova. Pedir que MP aponte uma unica prova documental.",
        },
        {
          ponto: "Testemunha chave mudou versao entre fases",
          comoExplorar:
            "Confrontar versoes em plenario: ler trecho da delegacia, ler trecho do juizo, pedir que explique a contradicao",
        },
        {
          ponto: "Laudo nao exclui confronto dinamico",
          comoExplorar:
            "Requerer esclarecimentos do perito em plenario sobre cenarios alternativos de trajetoria dos projeteis",
        },
      ],
    },
    matrizGuerra: [
      {
        fato: "Disparos contra a vitima",
        versaoAcusacao:
          "Reu atirou pelas costas da vitima desarmada, sem provocacao, por motivo torpe",
        versaoDefesa:
          "Reu disparou em reacao a gesto da vitima de sacar objeto, apos confronto fisico com faca (ferimento no braco)",
        elementosDeProva: [
          "Laudo cadaverico",
          "Laudo corpo de delito do reu",
          "Depoimento Maria",
          "Depoimento Jose Carlos",
        ],
        contradicoes: [
          "Maria disse 'sem provocacao' na delegacia mas admitiu discussao em juizo",
          "Laudo indica tiros de tras, porem reu tem ferimento de faca — houve confronto previo",
        ],
      },
      {
        fato: "Motivacao do crime",
        versaoAcusacao: "Divida de drogas (motivo torpe)",
        versaoDefesa:
          "Conflito por terreno entre familias + ameacas previas (BO registrado)",
        elementosDeProva: [
          "BO 1234/2024",
          "Informativo DRACO",
          "Depoimentos de vizinhos",
        ],
        contradicoes: [
          "MP alega drogas mas nao ha nenhuma prova material — nenhuma apreensao, nenhum depoimento especifico",
          "BO registrado pelo reu contradiz tese de que reu era o agressor",
        ],
      },
    ],
  },

  operacional: {
    orientacaoAoAssistido:
      "Adenilson deve manter postura serena e respeitosa durante todo o julgamento. No interrogatorio, deve relatar os fatos de forma cronologica: as ameacas dos dias anteriores, o registro do BO, o confronto no dia do fato (agressao com faca, gesto de sacar objeto), e os disparos como reacao. Deve enfatizar que tentou resolver pela via legal (BO) e que so agiu quando se sentiu em perigo iminente. NAO deve mencionar envolvimento da vitima com trafico ou faccoes — isso pode gerar antipatia do juri. Deve demonstrar arrependimento pela morte, mesmo alegando defesa.",
    quesitos: [
      {
        texto: "O reu agiu sob influencia de injusta provocacao da vitima?",
        estrategia:
          "Quesito essencial para privilegiado. Apontar BO, ameacas, gesto de sacar objeto. Jurados tendem a reconhecer provocacao quando ha historico documentado.",
      },
      {
        texto: "O reu agiu em defesa propria, real ou putativa?",
        estrategia:
          "Quesito da tese principal. Enfatizar ferimento no braco, gesto da vitima, contexto de ameacas. Usar demonstracao visual (fotos do ferimento) em plenario.",
      },
      {
        texto: "O crime foi praticado por motivo torpe?",
        estrategia:
          "Pedir aos jurados que votem NAO. Demonstrar ausencia total de prova sobre drogas. Mostrar que o conflito era por terreno (fato documentado).",
      },
    ],
    informacoesAtendimento: [
      {
        data: "20/09/2024",
        conteudo:
          "Primeiro atendimento. Adenilson relatou ameacas previas e mostrou BO. Disse que a arma era emprestada de amigo Antonio apos as ameacas. Estava emocionalmente abalado.",
        relevanciaParaCaso:
          "Relato consistente desde o primeiro atendimento — nao ha mudanca de versao. Mencionou emprestimo da arma de forma espontanea.",
      },
      {
        data: "15/10/2024",
        conteudo:
          "Segundo atendimento. Adenilson mencionou que Jose Carlos estava presente no bar proximo e viu o gesto da vitima. Pediu que fosse arrolado como testemunha.",
        relevanciaParaCaso:
          "Identificacao espontanea de testemunha presencial — corrobora que Jose Carlos realmente presenciou os fatos.",
      },
      {
        data: "20/01/2025",
        conteudo:
          "Atendimento pre-audiencia. Orientado sobre postura em plenario. Demonstrou boa compreensao. Familia presente — esposa e mae.",
        relevanciaParaCaso:
          "Reu demonstra cooperacao e compreensao do processo. Presenca familiar pode ser utilizada em plenario.",
      },
    ],
    pontosCriticos: [
      {
        ponto: "Intimacao de Jose Carlos ainda pendente",
        risco: "Sem a principal testemunha de defesa, a tese de legitima defesa perde o elemento 'gesto de sacar objeto'",
        mitigacao:
          "Requerer intimacao com urgencia. Se nao localizado, considerar conducao coercitiva. Preparar argumentacao alternativa baseada apenas nas provas materiais.",
      },
      {
        ponto: "Perito nao intimado para esclarecimentos",
        risco: "Sem esclarecimentos, a trajetoria 'de tras para frente' fica como unica leitura possivel do laudo",
        mitigacao:
          "Requerer intimacao do perito Dr. Roberto Andrade. Preparar perguntas sobre cenarios alternativos de trajetoria.",
      },
      {
        ponto: "MP pode juntar informativo DRACO para sustentar motivo torpe",
        risco: "Jurados podem associar reu a trafico mesmo sem provas diretas",
        mitigacao:
          "Preparar impugnacao: informativo nao menciona o reu; usar apenas para contextualizar perfil da vitima se necessario.",
      },
    ],
  },
};

// ─── Metadata type ─────────────────────────────────────────────────────────

interface AnalysisMetadata {
  analisadoEm: string;
  skill: string;
  versaoSchema: string;
  documentosAnalisados: Array<{ nome: string; tipo: string }>;
  modeloUtilizado: string;
}

const MOCK_METADATA: AnalysisMetadata = {
  analisadoEm: "2026-03-28T14:30:00Z",
  skill: "analise-audiencias + juri",
  versaoSchema: "2.0",
  documentosAnalisados: [
    { nome: "Denuncia.pdf", tipo: "denuncia" },
    { nome: "IP_completo.pdf", tipo: "inquerito" },
    { nome: "Laudo_cadaverico.pdf", tipo: "laudo" },
    { nome: "Laudo_corpo_delito_reu.pdf", tipo: "laudo" },
    { nome: "Termo_depoimento_Maria.pdf", tipo: "depoimento" },
    { nome: "Termo_depoimento_Jose.pdf", tipo: "depoimento" },
    { nome: "BO_1234_2024.pdf", tipo: "documento" },
    { nome: "Certidao_antecedentes_vitima.pdf", tipo: "documento" },
    { nome: "Auto_prisao_flagrante.pdf", tipo: "apf" },
    { nome: "Informativo_DRACO.pdf", tipo: "informativo" },
    { nome: "Ata_audiencia_instrucao.pdf", tipo: "ata" },
    { nome: "Pronúncia.pdf", tipo: "decisao" },
  ],
  modeloUtilizado: "claude -p (local)",
};

// ─── Tab Component ─────────────────────────────────────────────────────────

interface AnaliseTabProps {
  assistidoId: number;
}

export function AnaliseTab({ assistidoId }: AnaliseTabProps) {
  // Fetch real analysis data
  const { data: casosData, isLoading } = trpc.analise.getCasosDoAssistido.useQuery(
    { assistidoId },
    { enabled: !!assistidoId }
  );

  // Get analysis for selected case (use first case if none selected)
  const selectedCaso = casosData?.casos?.[0];
  const { data: analiseData } = trpc.analise.getAnaliseDoCaso.useQuery(
    { casoId: selectedCaso?.caso?.id ?? 0 },
    { enabled: !!selectedCaso?.caso?.id }
  );

  // Use real analysisData from the caso JSONB field, fall back to mock in dev
  const realData = (analiseData?.analysisData as AnalysisBlocksData | null) ?? null;

  const USE_MOCK =
    process.env.NODE_ENV === "development" && !realData;

  const analysis: AnalysisBlocksData | null = realData ?? (USE_MOCK ? MOCK_ANALYSIS : null);

  const metadata: AnalysisMetadata | null = analiseData?.analyzedAt
    ? {
        analisadoEm: analiseData.analyzedAt.toISOString?.() ?? String(analiseData.analyzedAt),
        skill: "analise",
        versaoSchema: String(analiseData.analysisVersion ?? "1.0"),
        documentosAnalisados: [],
        modeloUtilizado: "claude -p (local)",
      }
    : USE_MOCK
      ? MOCK_METADATA
      : null;

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <Sparkles className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Nenhuma análise disponível</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Clique em <span className="font-medium text-foreground">Analisar</span> para gerar uma análise estratégica completa do caso com teses, provas e depoimentos.
        </p>
      </div>
    );
  }

  // ── Render analysis blocks ──────────────────────────────────────────────
  return (
    <div className="space-y-1">
      {/* Case selector pills — future: when multiple cases exist */}
      {/* <div className="flex gap-2 mb-4">
        <button className="text-xs px-3 py-1.5 rounded-full bg-zinc-700 text-zinc-100">
          0501234-56.2024 · Homicidio Qualif.
        </button>
      </div> */}

      <Accordion
        type="multiple"
        defaultValue={[]}
      >
        {analysis.caso && <BlocoCaso data={analysis.caso} />}
        {analysis.pessoas && <BlocoPessoas data={analysis.pessoas} />}
        {analysis.provas && <BlocoProvas data={analysis.provas} />}
        {analysis.estrategia && (
          <BlocoEstrategia data={analysis.estrategia} />
        )}
        {analysis.operacional && (
          <BlocoPreparacao data={analysis.operacional} />
        )}
      </Accordion>

      {/* Metadata footer */}
      {metadata && (
        <p className="text-[10px] text-zinc-600 text-right pt-2 pb-1">
          Analisado em{" "}
          {new Date(metadata.analisadoEm).toLocaleDateString("pt-BR")} ·{" "}
          {metadata.documentosAnalisados.length} documentos · via{" "}
          {metadata.skill} · schema v{metadata.versaoSchema}
        </p>
      )}
    </div>
  );
}
