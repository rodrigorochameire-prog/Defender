/**
 * PDF Section Classifier — Claude Sonnet 4 (primary) + Gemini Flash (fallback)
 *
 * Recebe texto extraido de um bloco de paginas e identifica
 * pecas processuais com taxonomia refinada para defesa criminal.
 *
 * v2 — Nova taxonomia com relevancia defensiva, dados estruturados
 *       (pessoas, cronologia, teses) e filtro de burocracia.
 * v3 — Migrado de Gemini Flash para Claude Sonnet 4 como engine primaria.
 *       Gemini Flash mantido como fallback caso ANTHROPIC_API_KEY nao esteja configurada.
 */

import Anthropic from "@anthropic-ai/sdk";

// ==========================================
// CONFIGURACAO
// ==========================================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) throw new Error("Anthropic API key nao configurada (ANTHROPIC_API_KEY)");
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return anthropicClient;
}

export function isClassifierConfigured(): boolean {
  return !!(ANTHROPIC_API_KEY || GEMINI_API_KEY);
}

// ==========================================
// TIPOS — TAXONOMIA v2 (relevancia defensiva)
// ==========================================

export const SECTION_TIPOS = [
  // === CRITICO (vermelho) — impacto direto na defesa ===
  "denuncia",
  "sentenca",
  "depoimento_vitima",
  "depoimento_testemunha",
  "depoimento_investigado",

  // === ALTO (laranja/amarelo) — analise obrigatoria ===
  "decisao",
  "pronuncia",
  "laudo_pericial",
  "laudo_necroscopico",
  "laudo_local",
  "laudo_toxicologico",
  "laudo_balistico",
  "laudo_medico_legal",
  "laudo_psiquiatrico",
  "pericia_digital",
  "ata_audiencia",
  "interrogatorio",
  "alegacoes_mp",
  "alegacoes_defesa",
  "resposta_acusacao",
  "recurso",
  "habeas_corpus",
  "midia_mensagens",
  "midia_imagem_video",

  // === MEDIO (azul) — contexto investigativo ===
  "boletim_ocorrencia",
  "portaria_ip",
  "relatorio_policial",
  "auto_prisao",
  "termo_inquerito",
  "certidao_relevante",
  "diligencias_422",
  "alegacoes",
  "auto_apreensao",
  "mandado",
  "reconhecimento_formal",
  "acareacao",
  "registro_telefonico",

  // === BAIXO (cinza) — referencia ===
  "documento_identidade",
  "alvara_soltura",
  "guia_execucao",
  "outros",

  // === OCULTO — burocracia sem valor defensivo ===
  "burocracia",
] as const;

export type SectionTipo = (typeof SECTION_TIPOS)[number];

/** Nivel de relevancia para a defesa */
export type RelevanciaDefensiva = "critico" | "alto" | "medio" | "baixo" | "oculto";

/** Mapa tipo -> relevancia */
export const TIPO_RELEVANCIA: Record<SectionTipo, RelevanciaDefensiva> = {
  denuncia: "critico",
  sentenca: "critico",
  depoimento_vitima: "critico",
  depoimento_testemunha: "critico",
  depoimento_investigado: "critico",

  decisao: "alto",
  pronuncia: "alto",
  laudo_pericial: "alto",
  laudo_necroscopico: "alto",
  laudo_local: "alto",
  laudo_toxicologico: "alto",
  laudo_balistico: "alto",
  laudo_medico_legal: "alto",
  laudo_psiquiatrico: "alto",
  pericia_digital: "alto",
  ata_audiencia: "alto",
  interrogatorio: "alto",
  alegacoes_mp: "alto",
  alegacoes_defesa: "alto",
  resposta_acusacao: "alto",
  recurso: "alto",
  habeas_corpus: "alto",
  midia_mensagens: "alto",
  midia_imagem_video: "alto",

  boletim_ocorrencia: "medio",
  portaria_ip: "medio",
  relatorio_policial: "medio",
  auto_prisao: "medio",
  termo_inquerito: "medio",
  certidao_relevante: "medio",
  diligencias_422: "medio",
  alegacoes: "medio",
  auto_apreensao: "medio",
  mandado: "medio",
  reconhecimento_formal: "medio",
  acareacao: "medio",
  registro_telefonico: "medio",

  documento_identidade: "baixo",
  alvara_soltura: "baixo",
  guia_execucao: "baixo",
  outros: "baixo",

  burocracia: "oculto",
};

// ==========================================
// GRUPOS SEMANTICOS — Agrupamento hierarquico
// ==========================================

export const SECTION_GROUPS = {
  depoimentos: {
    label: "Depoimentos e Interrogatórios",
    icon: "Users",
    color: "#3b82f6",
    tipos: ["depoimento_vitima", "depoimento_testemunha", "depoimento_investigado", "interrogatorio", "reconhecimento_formal", "acareacao"] as const,
  },
  laudos: {
    label: "Laudos e Perícias",
    icon: "Microscope",
    color: "#ec4899",
    tipos: ["laudo_pericial", "laudo_necroscopico", "laudo_local", "laudo_toxicologico", "laudo_balistico", "laudo_medico_legal", "laudo_psiquiatrico", "pericia_digital"] as const,
  },
  midias: {
    label: "Provas Digitais e Mídias",
    icon: "Smartphone",
    color: "#06b6d4",
    tipos: ["midia_mensagens", "midia_imagem_video", "registro_telefonico"] as const,
  },
  decisoes: {
    label: "Decisões Judiciais",
    icon: "Gavel",
    color: "#8b5cf6",
    tipos: ["decisao", "sentenca", "pronuncia"] as const,
  },
  defesa: {
    label: "Manifestações da Defesa",
    icon: "ShieldCheck",
    color: "#10b981",
    tipos: ["alegacoes_defesa", "resposta_acusacao", "recurso", "habeas_corpus"] as const,
  },
  mp: {
    label: "Manifestações do MP",
    icon: "BookMarked",
    color: "#ef4444",
    tipos: ["denuncia", "alegacoes_mp", "alegacoes"] as const,
  },
  investigacao: {
    label: "Investigação Policial",
    icon: "Shield",
    color: "#f97316",
    tipos: ["relatorio_policial", "portaria_ip", "auto_prisao", "termo_inquerito", "boletim_ocorrencia", "diligencias_422", "auto_apreensao", "mandado"] as const,
  },
  audiencias: {
    label: "Audiências",
    icon: "CalendarDays",
    color: "#4f46e5",
    tipos: ["ata_audiencia"] as const,
  },
  documentos: {
    label: "Documentos e Certidões",
    icon: "FileCheck",
    color: "#22c55e",
    tipos: ["certidao_relevante", "documento_identidade", "alvara_soltura", "guia_execucao"] as const,
  },
  outros: {
    label: "Outros",
    icon: "HelpCircle",
    color: "#71717a",
    tipos: ["outros"] as const,
  },
  burocracia: {
    label: "Burocracia",
    icon: "Ban",
    color: "#d4d4d8",
    tipos: ["burocracia"] as const,
  },
} as const;

export type SectionGroupKey = keyof typeof SECTION_GROUPS;

/** Mapa reverso: tipo -> grupo */
export const TIPO_TO_GROUP: Record<string, SectionGroupKey> = Object.entries(SECTION_GROUPS).reduce(
  (acc, [groupKey, group]) => {
    for (const tipo of group.tipos) {
      acc[tipo] = groupKey as SectionGroupKey;
    }
    return acc;
  },
  {} as Record<string, SectionGroupKey>
);

// ==========================================
// INTERFACES — Dados Estruturados v2
// ==========================================

/** Pessoa mencionada no documento com papel e contexto */
export interface PessoaExtraida {
  nome: string;
  papel: "vitima" | "investigado" | "testemunha" | "juiz" | "promotor" | "delegado" | "perito" | "defensor" | "outro";
  descricao?: string; // Ex: "vizinho do acusado", "policial militar que atendeu a ocorrencia"
}

/** Evento cronologico extraido */
export interface EventoCronologia {
  data: string; // formato ISO ou dd/mm/yyyy
  descricao: string;
  fonte?: string; // "depoimento de FULANO", "laudo pericial", etc.
}

/** Tese defensiva identificada */
export interface TeseDefensiva {
  tipo: "nulidade" | "prescricao" | "excludente" | "atenuante" | "desclassificacao" | "absolvicao" | "procedimento" | "prova_ilicita" | "outra";
  descricao: string;
  fundamentacao?: string; // artigos de lei, jurisprudencia
  confianca: number; // 0-100
}

export interface ClassifiedSection {
  tipo: SectionTipo;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string;
  confianca: number; // 0-100
  relevancia: RelevanciaDefensiva;
  metadata: {
    // Dados estruturados v2
    pessoas?: PessoaExtraida[];
    cronologia?: EventoCronologia[];
    tesesDefensivas?: TeseDefensiva[];

    // Campos legados (mantidos para backward compatibility)
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;

    // Novos campos contextuais
    contradicoes?: string[]; // contradicoes detectadas com outros depoimentos/pecas
    pontosCriticos?: string[]; // pontos que merecem atencao da defesa
  };
}

export interface ClassificationResult {
  success: boolean;
  sections: ClassifiedSection[];
  tokensUsed?: number;
  error?: string;
}

// ==========================================
// CLASSIFICACAO — Prompt v2
// ==========================================

const CLASSIFICATION_PROMPT = `Analisador de processos criminais brasileiros (foco: DEFESA).
Identifique TODAS as pecas processuais no texto. Use EXATAMENTE estes valores para "tipo":

TIPOS VALIDOS:
denuncia, sentenca, depoimento_vitima, depoimento_testemunha, depoimento_investigado,
decisao, pronuncia, laudo_pericial, laudo_necroscopico, laudo_local,
laudo_toxicologico, laudo_balistico, laudo_medico_legal, laudo_psiquiatrico, pericia_digital,
ata_audiencia, interrogatorio, alegacoes_mp, alegacoes_defesa, resposta_acusacao,
recurso, habeas_corpus, midia_mensagens, midia_imagem_video,
boletim_ocorrencia, portaria_ip, relatorio_policial,
auto_prisao, termo_inquerito, certidao_relevante, diligencias_422, alegacoes,
auto_apreensao, mandado, reconhecimento_formal, acareacao, registro_telefonico,
documento_identidade, alvara_soltura, guia_execucao, outros, burocracia

PADROES DE CLASSIFICACAO POR TIPO:

=== PECAS PROCESSUAIS ===
| pronuncia | "PRONUNCIA", "PRONUNCIO O REU", "Decisao de Pronuncia" |
| resposta_acusacao | "RESPOSTA A ACUSACAO", "DEFESA PRELIMINAR", "Art. 396-A CPP" |
| habeas_corpus | "HABEAS CORPUS", "HC", "ORDEM DE HABEAS CORPUS", "LIBERDADE PROVISORIA" |
| diligencias_422 | "ART. 422", "DILIGENCIAS", "REQUERIMENTO DE DILIGENCIAS", "ROL DE TESTEMUNHAS" |
| ata_audiencia | "ATA DE AUDIENCIA", "TERMO DE AUDIENCIA", "AUDIENCIA DE INSTRUCAO" |
| alegacoes_mp | "ALEGACOES FINAIS DO MINISTERIO PUBLICO", "ALEGACOES FINAIS DA ACUSACAO", "MEMORIAIS DO MP" |
| alegacoes_defesa | "ALEGACOES FINAIS DA DEFESA", "MEMORIAIS DA DEFESA", "RAZOES FINAIS DEFENSIVAS" |

=== LAUDOS E PERICIAS (classificar pelo tipo especifico, nao generico) ===
| laudo_necroscopico | "LAUDO NECROSCOPICO", "EXAME CADAVERICO", "LAUDO DE NECROPSIA", "AUTO DE EXAME CADAVERICO", "CAUSA MORTIS" |
| laudo_local | "LAUDO DE LOCAL", "EXAME DE LOCAL", "LAUDO DE EXAME DO LOCAL DO FATO", "LEVANTAMENTO DE LOCAL" |
| laudo_toxicologico | "LAUDO TOXICOLOGICO", "EXAME TOXICOLOGICO", "LAUDO DEFINITIVO", "EXAME QUIMICO", substancias controladas, cocaina, maconha, crack |
| laudo_balistico | "LAUDO BALISTICO", "EXAME BALISTICO", "EXAME DE ARMA DE FOGO", "EXAME EM PROJETIL", "EXAME DE MUNICAO", "CONFRONTO BALISTICO" |
| laudo_medico_legal | "EXAME DE CORPO DE DELITO", "LAUDO MEDICO LEGAL", "EXAME DE LESOES CORPORAIS", "AUTO DE EXAME DE CORPO DE DELITO", "LAUDO DE EXAME DE CORPO DE DELITO" |
| laudo_psiquiatrico | "EXAME PSIQUIATRICO", "LAUDO PSIQUIATRICO", "PERICIA PSIQUIATRICA", "INCIDENTE DE INSANIDADE", "EXAME DE SANIDADE MENTAL", "LAUDO PSICOLOGICO" |
| pericia_digital | "PERICIA EM DISPOSITIVO", "EXAME EM CELULAR", "EXAME EM SMARTPHONE", "PERICIA EM MIDIA DIGITAL", "EXAME EM COMPUTADOR", "EXTRACAO DE DADOS", "RELATORIO DE EXTRACAO" |
| laudo_pericial | Qualquer outro laudo/pericia NAO coberto acima (papiloscopia, DNA, contabil, grafotecnico, etc) |

REGRA: SEMPRE prefira o tipo especifico de laudo. Use \`laudo_pericial\` generico APENAS se nenhum dos tipos especificos se aplica.

=== PROVAS DIGITAIS E MIDIAS ===
| midia_mensagens | Prints/capturas de WhatsApp, Telegram, SMS, Instagram DM, Facebook Messenger, emails. Contem baloes de conversa, nomes de contato, datas, horarios de mensagem. |
| midia_imagem_video | Fotografias (local do crime, lesoes, objetos apreendidos), frames de video, prints de redes sociais (posts, stories, fotos de perfil), stills de cameras de seguranca/CCTV. |
| registro_telefonico | Extratos de chamadas telefonicas (ERBs), registros de SMS, dados de geolocalizacao, logs de conexao, IMEI, listas de contatos extraidas. Formato tabelar com datas/horarios/numeros. |

REGRA: Se o conteudo e uma TABELA de registros de chamadas/SMS/ERB = registro_telefonico. Se e uma CONVERSA (baloes, mensagens entre pessoas) = midia_mensagens. Se e IMAGEM/FOTO/VIDEO/PRINT de rede social = midia_imagem_video.

=== ATOS INVESTIGATIVOS E PROCEDIMENTAIS ===
| interrogatorio | "INTERROGATORIO", "TERMO DE INTERROGATORIO" (judicial) |
| reconhecimento_formal | "AUTO DE RECONHECIMENTO", "TERMO DE RECONHECIMENTO DE PESSOA", "RECONHECIMENTO FOTOGRAFICO", "RECONHECIMENTO PESSOAL", "ALBUM FOTOGRAFICO" |
| acareacao | "TERMO DE ACAREACAO", "ACAREACAO", confronto entre versoes de diferentes depoentes |
| auto_apreensao | "AUTO DE APREENSAO", "TERMO DE APREENSAO", "AUTO DE EXIBICAO E APREENSAO", lista de objetos/armas/drogas apreendidos |
| mandado | "MANDADO DE PRISAO", "MANDADO DE BUSCA E APREENSAO", "MANDADO DE INTIMACAO", "MANDADO DE CONDUCAO" |
| alvara_soltura | "ALVARA DE SOLTURA", "CONTRA-MANDADO", ordem judicial de liberacao |
| guia_execucao | "GUIA DE RECOLHIMENTO", "GUIA DE EXECUCAO", "GUIA DE INTERNACAO", documentos de execucao penal |

Diferencie \`alegacoes_mp\` de \`alegacoes_defesa\` sempre que possivel. Use \`alegacoes\` generico apenas quando nao for possivel identificar a parte. Prefira \`depoimento_investigado\` para termos do inquerito policial e \`interrogatorio\` para interrogatorios judiciais.

REGRAS CRITICAS — IDENTIFICACAO DE DEPOIMENTOS E INTERROGATORIOS:

⚠️ DISTINCAO FUNDAMENTAL: FASE POLICIAL vs FASE JUDICIAL
Depoimentos/interrogatorios ocorrem em FASES DISTINTAS do processo, com valor probatorio DIFERENTE.
Voce DEVE identificar a fase e inclui-la no metadata.fase de CADA depoimento/interrogatorio.

FASE POLICIAL (INQUERITO) — valor probatorio MENOR, inquisitorial:
Marcadores:
- "TERMO DE DEPOIMENTO", "TERMO DE DECLARACOES", "TERMO DE DECLARACAO"
- "AUTO DE QUALIFICACAO E INTERROGATORIO" (policial)
- Presenca de: "Delegado(a) de Policia", "Escrivao(a) de Policia", "IP N°", "BO N°"
- Local: delegacia, DEAM, DT, DHPP
- Estrutura: cabecalho delegacia + "sob a presidencia do(a) Delegado(a)" + Escrivao + "compareceu" + "INQUIRIDO(A)" + "Nada mais disse"
Titulo: "[Inquerito] Depoimento de NOME (papel)" ou "[Inquerito] Interrogatorio de NOME"

FASE JUDICIAL (INSTRUCAO) — valor probatorio PLENO, contraditorio:
Marcadores:
- "ATA DE AUDIENCIA DE INSTRUCAO", "TERMO DE AUDIENCIA", "AUDIENCIA DE INSTRUCAO E JULGAMENTO"
- "OITIVA DE TESTEMUNHA", "OITIVA DA VITIMA", "DEPOIMENTO EM JUIZO"
- Presenca de: "Juiz(a) de Direito", "Magistrado(a)", "MM. Juiz", "Vara Criminal", "Promotor(a) de Justica"
- Menção a: "compromisso legal", "sob as penas da lei", "advertido(a)", "contraditorio"
- Perguntas de PARTES: "pelo(a) Promotor(a):", "pela Defesa:", "pelo(a) Juiz(a):"
- "INTERROGATORIO DO REU" judicial: ultimo ato da audiencia (art. 400 CPP)
Titulo: "[Instrucao] Oitiva de NOME (papel)" ou "[Instrucao] Interrogatorio de NOME"

FASE PLENARIO (JURI) — perante os jurados:
Marcadores:
- "ATA DE PLENARIO", "SESSAO DO TRIBUNAL DO JURI", "PLENARIO DO JURI"
- Perguntas pelos jurados, "quesitacao"
Titulo: "[Plenario] Depoimento de NOME (papel)" ou "[Plenario] Interrogatorio de NOME"

CADA pessoa ouvida = 1 secao separada. Se ha 3 Termos de Depoimento no texto, sao 3 secoes.
Se a MESMA pessoa depoe em fases diferentes (inquerito E instrucao), sao secoes SEPARADAS com fases diferentes.

CLASSIFICACAO DO PAPEL:
- Se o depoente e vitima ou familiar da vitima → depoimento_vitima
- Se o depoente e testemunha, vizinho, conhecido → depoimento_testemunha
- Se e investigado/reu com "INTERROGADO(A)/CONDUZIDO" → depoimento_investigado (inquerito) ou interrogatorio (judicial)
- Se o texto menciona "na qualidade de suposto(a) autor(a)" ou "investigado" e e fase policial → depoimento_investigado
- Se e interrogatorio em audiencia judicial → interrogatorio

REGRA: Prefira \`depoimento_investigado\` para termos do inquerito policial e \`interrogatorio\` para interrogatorios judiciais.

MARCADORES TEXTUAIS adicionais:
1. "TERMO DE DEPOIMENTO" → depoimento_testemunha ou depoimento_vitima (fase: inquerito)
2. "TERMO DE DECLARACOES" → depoimento_testemunha ou depoimento_vitima (fase: inquerito)
3. "TERMO DE QUALIFICACAO E INTERROGATORIO" → depoimento_investigado (fase: inquerito)
4. "AUTO DE QUALIFICACAO E INTERROGATORIO" → depoimento_investigado (fase: inquerito)
5. "OITIVA DE TESTEMUNHA" em audiencia → depoimento_testemunha (fase: instrucao)
6. "OITIVA DA VITIMA" em audiencia → depoimento_vitima (fase: instrucao)
7. "INTERROGATORIO DO REU" em audiencia → interrogatorio (fase: instrucao)

ESTRUTURA FORMAL de depoimento POLICIAL:
- Cabecalho: delegacia + tipo do termo
- Referencia: "IP N°" ou "BO N°" + numero
- Data/hora: "As HH:MM do dia DD do mes de MMMM do ano de AAAA"
- Autoridade: "sob a presidencia do(a) Delegado(a) de Policia, NOME"
- Escrivao: "comigo NOME, Escrivao(a) de Policia"
- Pessoa ouvida: "compareceu o(a) DEPOENTE:" ou "DECLARANTE:" ou "INTERROGADO(A):"
- Conteudo: "INQUIRIDO(A) acerca do(s) fato(s)..." ou "as perguntas RESPONDEU:"
- Encerramento: "Nada mais disse e nem lhe foi perguntado"

ESTRUTURA FORMAL de depoimento JUDICIAL:
- Cabecalho: Vara + Comarca + "Ata de Audiencia"
- Presenca: Juiz, Promotor, Defensor, reu
- Compromisso: "prestou compromisso legal" (testemunhas) ou "advertida(o)" (vitima)
- Perguntas alternadas: "Pelo(a) MP:", "Pela Defesa:", "Pelo(a) Juiz(a):"
- Encerramento: "Nada mais foi perguntado" ou "Encerrada a inquiricao"

RELATORIO POLICIAL vs DEPOIMENTO:
- relatorio_policial = documento NARRATIVO do delegado. Contem: "Relatam os autos", "Relatorio Final", "Relatorio de Investigacao", resumo dos fatos, conclusoes. MESMO QUE mencione o que testemunhas disseram, e relatorio_policial. Um relatorio pode ter muitas paginas — UMA unica secao.
- Se o texto NAO tem a estrutura formal acima (Termo + compareceu + INQUIRIDO + Nada mais disse), NAO e depoimento — e relatorio_policial ou outra peca.
- Trechos como "conforme declarou a testemunha X..." dentro de narrativa = relatorio_policial (nao depoimento).

REGRAS GERAIS:
- Autuacao, juntada, verificacao autenticidade, certidao publicacao, remessa, vista MP, conclusao, ato ordinatorio, termo abertura/encerramento = burocracia
- Certidao com conteudo relevante (antecedentes, comparecimento) = certidao_relevante. Mera certidao burocracia = burocracia
- Auto de Prisao em Flagrante (AUTUACAO do flagrante) = auto_prisao
- Sumario/capa PJe = burocracia
- Requisicao de Exame Pericial = outros
- Missao Policial / Ordem de Missao = diligencias_422
- Representacao por Prisao Preventiva = outros

RESPONDA APENAS JSON (sem markdown). Exemplo com MULTIPLAS secoes em FASES DIFERENTES:
{"sections":[
  {"tipo":"relatorio_policial","titulo":"Relatorio Final do Inquerito Policial","paginaInicio":5,"paginaFim":15,"resumo":"Relatorio narrativo do delegado...","confianca":95,"metadata":{"fase":null,"pessoas":[{"nome":"Anderson Carvalho","papel":"delegado"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":[],"partesmencionadas":[],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"depoimento_vitima","titulo":"[Inquerito] Depoimento de Maria da Silva (mae da vitima)","paginaInicio":16,"paginaFim":17,"resumo":"Mae relata na delegacia ultima vez que viu o filho...","confianca":98,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Maria da Silva","papel":"vitima","descricao":"mae da vitima"}],"cronologia":[{"data":"07/06/2024","descricao":"Data do depoimento"}],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":["Contradiz horario do BO"],"partesmencionadas":["Maria da Silva"],"datasExtraidas":["07/06/2024"],"artigosLei":[]}},
  {"tipo":"depoimento_vitima","titulo":"[Instrucao] Oitiva de Maria da Silva (mae da vitima)","paginaInicio":45,"paginaFim":47,"resumo":"Em juizo, mae muda versao sobre horario e diz que nao tem certeza...","confianca":96,"metadata":{"fase":"instrucao","autoridade":"Juiz(a) Fulano","sob_compromisso":false,"pessoas":[{"nome":"Maria da Silva","papel":"vitima","descricao":"mae da vitima"}],"cronologia":[{"data":"15/09/2024","descricao":"Data da audiencia"}],"tesesDefensivas":[],"contradicoes":["Mudou versao sobre horario em relacao ao inquerito"],"pontosCriticos":["Contradiz proprio depoimento na delegacia — favoravel a defesa"],"partesmencionadas":["Maria da Silva"],"datasExtraidas":["15/09/2024"],"artigosLei":[]}},
  {"tipo":"depoimento_testemunha","titulo":"[Inquerito] Depoimento de Joao Santos (vizinho)","paginaInicio":18,"paginaFim":19,"resumo":"Vizinho diz ter ouvido gritos, nao viu diretamente...","confianca":95,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Joao Santos","papel":"testemunha","descricao":"vizinho"}],"cronologia":[],"tesesDefensivas":[],"contradicoes":[],"pontosCriticos":["Depoimento de ouvir-dizer — nao presencial"],"partesmencionadas":["Joao Santos"],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"depoimento_investigado","titulo":"[Inquerito] Interrogatorio de Fulano de Tal","paginaInicio":20,"paginaFim":22,"resumo":"Investigado nega participacao na delegacia...","confianca":98,"metadata":{"fase":"inquerito","autoridade":"Del. Anderson Carvalho","sob_compromisso":false,"pessoas":[{"nome":"Fulano de Tal","papel":"investigado"}],"cronologia":[],"tesesDefensivas":[{"tipo":"absolvicao","descricao":"Nega autoria","confianca":40}],"contradicoes":[],"pontosCriticos":["Exerceu direito ao silencio parcial"],"partesmencionadas":["Fulano de Tal"],"datasExtraidas":[],"artigosLei":[]}},
  {"tipo":"interrogatorio","titulo":"[Instrucao] Interrogatorio de Fulano de Tal","paginaInicio":55,"paginaFim":58,"resumo":"Em juizo, reu alega legitima defesa com detalhes...","confianca":97,"metadata":{"fase":"instrucao","autoridade":"Juiz(a) Fulano","sob_compromisso":false,"pessoas":[{"nome":"Fulano de Tal","papel":"investigado"}],"cronologia":[],"tesesDefensivas":[{"tipo":"excludente","descricao":"Alega legitima defesa — vitima avancou com faca","confianca":65}],"contradicoes":["Na delegacia negou participacao, em juizo admite mas alega defesa"],"pontosCriticos":["Mudanca de tese entre fases — pode ser confissao qualificada"],"partesmencionadas":["Fulano de Tal"],"datasExtraidas":[],"artigosLei":["art. 25 CP"]}}
]}

Campos metadata.fase: inquerito|instrucao|plenario|null (OBRIGATORIO para depoimentos/interrogatorios, null para demais pecas)
Campos metadata.autoridade: nome do delegado, juiz ou presidente do juri que presidiu o ato (string ou null)
Campos metadata.sob_compromisso: se a testemunha prestou compromisso legal (true/false, null se nao aplicavel)
Campos metadata.pessoas[].papel: vitima|investigado|testemunha|juiz|promotor|delegado|perito|defensor|outro
Campos metadata.tesesDefensivas[].tipo: nulidade|prescricao|excludente|atenuante|desclassificacao|absolvicao|procedimento|prova_ilicita|outra
Se nenhuma peca encontrada: {"sections":[]}
IMPORTANTE: Use SOMENTE os tipos listados acima. Nao invente tipos novos.
IMPORTANTE: Para depoimentos e interrogatorios, SEMPRE inclua metadata.fase (inquerito, instrucao ou plenario). Se a MESMA pessoa depoem em fases diferentes, crie secoes SEPARADAS.
NOTA: Este bloco pode ter overlap de paginas com blocos adjacentes. Identifique TODAS as secoes que iniciam ou estao completamente dentro deste bloco normalmente. O sistema fara deduplicacao automatica de secoes repetidas.`;

/**
 * Classifica secoes dentro de um bloco de paginas extraidas.
 *
 * @param pageText - Texto concatenado de um bloco de paginas (com marcadores [PAGINA N])
 * @param startPage - Primeira pagina do bloco (para ajustar offsets)
 * @param endPage - Ultima pagina do bloco
 */
export async function classifyPageChunk(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  try {
    if (!isClassifierConfigured()) {
      return { success: false, sections: [], error: "Nenhuma API de IA configurada (ANTHROPIC_API_KEY ou GEMINI_API_KEY)" };
    }

    // Try Claude Sonnet 4 first (primary)
    if (ANTHROPIC_API_KEY) {
      try {
        return await classifyWithClaude(pageText, startPage, endPage);
      } catch (claudeError) {
        console.warn("[pdf-classifier] Claude failed, trying Gemini fallback:", claudeError);
        // If Gemini key exists, fallback; otherwise re-throw
        if (GEMINI_API_KEY) {
          return await classifyWithGemini(pageText, startPage, endPage);
        }
        throw claudeError;
      }
    }

    // Gemini-only path (no Anthropic key)
    return await classifyWithGemini(pageText, startPage, endPage);
  } catch (error) {
    console.error("[pdf-classifier] Error:", error);
    return {
      success: false,
      sections: [],
      error: error instanceof Error ? error.message : "Classification error",
    };
  }
}

// ==========================================
// CLASSIFY WITH CLAUDE SONNET 4 (PRIMARY)
// ==========================================

async function classifyWithClaude(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  const client = getAnthropicClient();

  const userMessage = `## TEXTO DO PROCESSO (paginas ${startPage} a ${endPage})

${pageText}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: CLASSIFICATION_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  const sections = parseAndMapSections(responseText, startPage, endPage);

  return {
    success: true,
    sections,
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
  };
}

// ==========================================
// CLASSIFY WITH GEMINI FLASH (FALLBACK)
// ==========================================

async function classifyWithGemini(
  pageText: string,
  startPage: number,
  endPage: number
): Promise<ClassificationResult> {
  // Lazy-import to avoid loading @google/generative-ai when using Claude
  const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import("@google/generative-ai");

  if (!GEMINI_API_KEY) throw new Error("Gemini API key nao configurada");

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  const prompt = `${CLASSIFICATION_PROMPT}

## TEXTO DO PROCESSO (paginas ${startPage} a ${endPage})

${pageText}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();

  const sections = parseAndMapSections(responseText, startPage, endPage);

  return {
    success: true,
    sections,
    tokensUsed: response.usageMetadata?.totalTokenCount,
  };
}

// ==========================================
// SHARED JSON PARSING & SECTION MAPPING
// ==========================================

function parseAndMapSections(
  responseText: string,
  startPage: number,
  endPage: number
): ClassifiedSection[] {
  let jsonStr = responseText;
  if (responseText.includes("```json")) {
    jsonStr = responseText.split("```json")[1].split("```")[0].trim();
  } else if (responseText.includes("```")) {
    jsonStr = responseText.split("```")[1].split("```")[0].trim();
  }

  const parsed = JSON.parse(jsonStr);
  return (parsed.sections || []).map(
    (s: Record<string, unknown>) => {
      const tipo = SECTION_TIPOS.includes(s.tipo as SectionTipo)
        ? (s.tipo as SectionTipo)
        : mapLegacyTipo(s.tipo as string);

      const meta = (s.metadata as Record<string, unknown>) || {};

      return {
        tipo,
        titulo: String(s.titulo || "Secao nao identificada"),
        paginaInicio: Number(s.paginaInicio) || startPage,
        paginaFim: Number(s.paginaFim) || endPage,
        resumo: String(s.resumo || ""),
        confianca: Math.min(100, Math.max(0, Number(s.confianca) || 50)),
        relevancia: TIPO_RELEVANCIA[tipo] || "baixo",
        metadata: {
          // Dados estruturados v2
          pessoas: Array.isArray(meta.pessoas) ? (meta.pessoas as PessoaExtraida[]) : [],
          cronologia: Array.isArray(meta.cronologia) ? (meta.cronologia as EventoCronologia[]) : [],
          tesesDefensivas: Array.isArray(meta.tesesDefensivas) ? (meta.tesesDefensivas as TeseDefensiva[]) : [],
          contradicoes: Array.isArray(meta.contradicoes) ? (meta.contradicoes as string[]) : [],
          pontosCriticos: Array.isArray(meta.pontosCriticos) ? (meta.pontosCriticos as string[]) : [],

          // Campos legados
          partesmencionadas: Array.isArray(meta.partesmencionadas)
            ? (meta.partesmencionadas as string[])
            : extractPartesFromPessoas(meta.pessoas),
          datasExtraidas: Array.isArray(meta.datasExtraidas)
            ? (meta.datasExtraidas as string[])
            : extractDatasFromCronologia(meta.cronologia),
          artigosLei: Array.isArray(meta.artigosLei) ? (meta.artigosLei as string[]) : [],
          juiz: (meta.juiz as string) || extractPessoaByPapel(meta.pessoas, "juiz"),
          promotor: (meta.promotor as string) || extractPessoaByPapel(meta.pessoas, "promotor"),
        },
      };
    }
  );
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Mapeia tipos legados (da taxonomia v1) para a v2.
 * Usado quando o modelo retorna um tipo antigo ou nao reconhecido.
 */
function mapLegacyTipo(tipo: string): SectionTipo {
  const legacyMap: Record<string, SectionTipo> = {
    depoimento: "depoimento_testemunha", // fallback generico → testemunha
    laudo: "laudo_pericial",
    inquerito: "relatorio_policial",
    certidao: "certidao_relevante",
  };
  return legacyMap[tipo] || "outros";
}

/** Extrai nomes de PessoaExtraida[] para campo legado partesmencionadas */
function extractPartesFromPessoas(pessoas: unknown): string[] {
  if (!Array.isArray(pessoas)) return [];
  return pessoas
    .filter((p: Record<string, unknown>) => p && typeof p.nome === "string")
    .map((p: Record<string, unknown>) => p.nome as string);
}

/** Extrai datas de EventoCronologia[] para campo legado datasExtraidas */
function extractDatasFromCronologia(cronologia: unknown): string[] {
  if (!Array.isArray(cronologia)) return [];
  return cronologia
    .filter((e: Record<string, unknown>) => e && typeof e.data === "string")
    .map((e: Record<string, unknown>) => e.data as string);
}

/** Busca primeira pessoa com papel especifico */
function extractPessoaByPapel(pessoas: unknown, papel: string): string | undefined {
  if (!Array.isArray(pessoas)) return undefined;
  const found = pessoas.find(
    (p: Record<string, unknown>) => p && p.papel === papel && typeof p.nome === "string"
  );
  return found ? (found as Record<string, unknown>).nome as string : undefined;
}

// ==========================================
// DEDUPLICACAO (para chunks com overlap)
// ==========================================

/**
 * Simple string similarity — ratio of matching chars (case-insensitive).
 * Returns 0..1 where 1 = identical.
 */
function titleSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  if (!la || !lb) return 0;

  // Use longest common substring ratio as a quick similarity measure
  const shorter = la.length <= lb.length ? la : lb;
  const longer = la.length > lb.length ? la : lb;
  let maxMatch = 0;
  for (let i = 0; i < shorter.length; i++) {
    for (let j = i + 1; j <= shorter.length; j++) {
      const sub = shorter.slice(i, j);
      if (longer.includes(sub) && sub.length > maxMatch) {
        maxMatch = sub.length;
      }
    }
  }
  return maxMatch / longer.length;
}

/**
 * Checks if two page ranges overlap.
 */
function pagesOverlap(a: ClassifiedSection, b: ClassifiedSection): boolean {
  return a.paginaInicio <= b.paginaFim && b.paginaInicio <= a.paginaFim;
}

/**
 * Deduplicates sections detected across overlapping chunks.
 * When two sections of the same tipo with similar titles overlap in page ranges,
 * keeps the one with higher confidence (or merges metadata).
 */
export function deduplicateSections(sections: ClassifiedSection[]): ClassifiedSection[] {
  if (sections.length <= 1) return sections;

  // Sort by paginaInicio, then by confianca DESC
  const sorted = [...sections].sort((a, b) =>
    a.paginaInicio !== b.paginaInicio
      ? a.paginaInicio - b.paginaInicio
      : b.confianca - a.confianca
  );

  const kept: ClassifiedSection[] = [];
  const removed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (removed.has(i)) continue;

    const current = sorted[i];

    // Look ahead for duplicates (same tipo, overlapping pages, similar title)
    for (let j = i + 1; j < sorted.length; j++) {
      if (removed.has(j)) continue;

      const candidate = sorted[j];

      // Stop looking if candidate starts too far ahead
      if (candidate.paginaInicio > current.paginaFim + 2) break;

      if (
        current.tipo === candidate.tipo &&
        pagesOverlap(current, candidate) &&
        titleSimilarity(current.titulo, candidate.titulo) > 0.5
      ) {
        // Keep current (higher confianca due to sort), remove candidate
        // Merge page range to be the widest
        current.paginaInicio = Math.min(current.paginaInicio, candidate.paginaInicio);
        current.paginaFim = Math.max(current.paginaFim, candidate.paginaFim);
        removed.add(j);
      }
    }

    kept.push(current);
  }

  if (removed.size > 0) {
    console.log(`[pdf-classifier] Deduplication: removed ${removed.size} duplicate sections from ${sections.length} total`);
  }

  return kept;
}

// ==========================================
// CLASSIFICACAO EM LOTE
// ==========================================

/**
 * Classifica um PDF inteiro processando em blocos.
 * Retorna todas as secoes encontradas em todos os blocos, deduplicated.
 */
export async function classifyFullDocument(
  chunks: Array<{ startPage: number; endPage: number; text: string }>
): Promise<ClassificationResult> {
  const allSections: ClassifiedSection[] = [];
  let totalTokens = 0;
  let successfulChunks = 0;
  let lastError: string | undefined;

  for (const chunk of chunks) {
    const result = await classifyPageChunk(chunk.text, chunk.startPage, chunk.endPage);

    if (!result.success) {
      console.warn(
        `[pdf-classifier] Chunk ${chunk.startPage}-${chunk.endPage} failed: ${result.error}`
      );
      lastError = result.error;
      continue; // Skip failed chunks, process the rest
    }

    successfulChunks++;
    allSections.push(...result.sections);
    totalTokens += result.tokensUsed || 0;
  }

  // If ALL chunks failed, propagate the error
  if (successfulChunks === 0 && chunks.length > 0) {
    return {
      success: false,
      sections: [],
      tokensUsed: totalTokens,
      error: lastError || "Todos os blocos falharam na classificacao",
    };
  }

  // Deduplicate sections from overlapping chunks
  const deduplicated = deduplicateSections(allSections);

  // Success = at least one chunk was processed (even if 0 sections found)
  return {
    success: true,
    sections: deduplicated,
    tokensUsed: totalTokens,
  };
}
