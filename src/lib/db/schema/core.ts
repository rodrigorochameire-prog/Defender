import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  date,
  index,
  uniqueIndex,
  jsonb,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  atribuicaoEnum,
  statusPrisionalEnum,
  statusDemandaEnum,
  prioridadeEnum,
  areaEnum,
  papelProcessoEnum,
  syncOrigemEnum,
} from "./enums";
import { comarcas } from "./comarcas";

// ==========================================
// USUÁRIOS (DEFENSORES)
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("defensor").notNull(),
  phone: text("phone"),
  oab: varchar("oab", { length: 50 }),
  comarca: varchar("comarca", { length: 100 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending").notNull(),
  supervisorId: integer("supervisor_id"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  funcao: varchar("funcao", { length: 30 }),
  nucleo: varchar("nucleo", { length: 30 }),
  isAdmin: boolean("is_admin").default(false),
  podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
  podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
  defensoresVinculados: jsonb("defensores_vinculados").$type<number[]>(),
  areasPrincipais: jsonb("areas_principais").$type<string[]>(),
  mustChangePassword: boolean("must_change_password").default(false),
  inviteToken: varchar("invite_token", { length: 64 }),
  expiresAt: timestamp("expires_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  googleLinked: boolean("google_linked").default(false),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),
  sheetsSpreadsheetId: varchar("sheets_spreadsheet_id", { length: 100 }),
  sheetsSpreadsheetUrl: text("sheets_spreadsheet_url"),
  sheetsSyncEnabled: boolean("sheets_sync_enabled").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_role_idx").on(table.role),
  index("users_approval_status_idx").on(table.approvalStatus),
  index("users_deleted_at_idx").on(table.deletedAt),
  index("users_comarca_idx").on(table.comarca),
  index("users_comarca_id_idx").on(table.comarcaId),
  index("users_supervisor_id_idx").on(table.supervisorId),
  index("users_nucleo_idx").on(table.nucleo),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==========================================
// ASSISTIDOS (Centro da Aplicação)
// ==========================================

export const assistidos = pgTable("assistidos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  nomeMae: text("nome_mae"),
  nomePai: text("nome_pai"),
  dataNascimento: date("data_nascimento"),
  naturalidade: varchar("naturalidade", { length: 100 }),
  nacionalidade: varchar("nacionalidade", { length: 50 }).default("Brasileira"),
  statusPrisional: statusPrisionalEnum("status_prisional").default("SOLTO"),
  localPrisao: text("local_prisao"),
  unidadePrisional: text("unidade_prisional"),
  dataPrisao: date("data_prisao"),
  telefone: varchar("telefone", { length: 20 }),
  telefoneContato: varchar("telefone_contato", { length: 20 }),
  nomeContato: text("nome_contato"),
  parentescoContato: varchar("parentesco_contato", { length: 50 }),
  endereco: text("endereco"),
  photoUrl: text("photo_url"),
  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  casoId: integer("caso_id"),
  atribuicaoPrimaria: atribuicaoEnum("atribuicao_primaria").default("SUBSTITUICAO"),
  driveFolderId: text("drive_folder_id"),
  sigadId: varchar("sigad_id", { length: 20 }),
  sigadExportadoEm: timestamp("sigad_exportado_em"),
  solarExportadoEm: timestamp("solar_exportado_em"),
  analysisStatus: varchar("analysis_status", { length: 20 }),
  analysisData: jsonb("analysis_data").$type<{
    resumo?: string;
    achadosChave?: string[];
    recomendacoes?: string[];
    inconsistencias?: string[];
    fonte?: string;
    kpis?: {
      totalPessoas: number;
      totalAcusacoes: number;
      totalDocumentosAnalisados: number;
      totalEventos: number;
      totalNulidades: number;
      totalRelacoes: number;
    };
    documentosProcessados?: number;
    documentosTotal?: number;
    ultimoDocumentoProcessado?: string;
    versaoModelo?: string;
  }>(),
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: integer("analysis_version").default(0),
  origemCadastro: varchar("origem_cadastro", { length: 20 }).default("manual"),
  duplicataSugerida: jsonb("duplicata_sugerida").$type<{
    assistidoId: number;
    nome: string;
    confidence: number;
  } | null>(),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_nome_idx").on(table.nome),
  index("assistidos_cpf_idx").on(table.cpf),
  index("assistidos_status_prisional_idx").on(table.statusPrisional),
  index("assistidos_defensor_id_idx").on(table.defensorId),
  index("assistidos_deleted_at_idx").on(table.deletedAt),
  index("assistidos_caso_id_idx").on(table.casoId),
  index("assistidos_atribuicao_primaria_idx").on(table.atribuicaoPrimaria),
  index("assistidos_analysis_status_idx").on(table.analysisStatus),
  index("assistidos_comarca_id_idx").on(table.comarcaId),
]);

export type Assistido = typeof assistidos.$inferSelect;
export type InsertAssistido = typeof assistidos.$inferInsert;

// ==========================================
// PROCESSOS (Ligados ao Assistido)
// ==========================================

export const processos = pgTable("processos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  atribuicao: atribuicaoEnum("atribuicao").notNull().default("SUBSTITUICAO"),
  numeroAutos: text("numero_autos").notNull(),
  numeroAntigo: text("numero_antigo"),
  comarca: varchar("comarca", { length: 100 }),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  vara: varchar("vara", { length: 100 }),
  area: areaEnum("area").notNull(),
  classeProcessual: varchar("classe_processual", { length: 100 }),
  assunto: text("assunto"),
  valorCausa: integer("valor_causa"),
  parteContraria: text("parte_contraria"),
  advogadoContrario: text("advogado_contrario"),
  fase: varchar("fase", { length: 50 }),
  situacao: varchar("situacao", { length: 50 }).default("ativo"),
  isJuri: boolean("is_juri").default(false),
  dataSessaoJuri: timestamp("data_sessao_juri"),
  resultadoJuri: text("resultado_juri"),
  defensorId: integer("defensor_id").references(() => users.id),
  observacoes: text("observacoes"),
  linkDrive: text("link_drive"),
  driveFolderId: text("drive_folder_id"),
  casoId: integer("caso_id"),
  analysisStatus: varchar("analysis_status", { length: 20 }),
  analysisData: jsonb("analysis_data").$type<{
    // ==========================================
    // TIER 1 — RESUMO & CONTROLE (always populated)
    // ==========================================
    resumo?: string;
    crimePrincipal?: string;
    estrategia?: string;
    achadosChave?: string[];
    recomendacoes?: string[];
    inconsistencias?: string[];

    // KPIs / Painel de Controle (ad.painelControle ?? ad.kpis)
    painelControle?: {
      crimePrincipal?: string;
      totalPessoas?: number;
      totalAcusacoes?: number;
      totalDocumentosAnalisados?: number;
      totalEventos?: number;
      totalNulidades?: number;
      totalRelacoes?: number;
      faseProcessual?: string;
      reuPreso?: boolean;
      proximaAudiencia?: string;
    };
    kpis?: {
      crimePrincipal?: string;
      totalPessoas?: number;
      totalAcusacoes?: number;
      totalDocumentosAnalisados?: number;
      totalEventos?: number;
      totalNulidades?: number;
      totalRelacoes?: number;
    };

    // Alertas operacionais (ad.alertasOperacionais ?? ad.alertas)
    alertasOperacionais?: Array<{
      tipo: string;
      mensagem: string;
      severidade?: "critica" | "alta" | "media" | "baixa";
      prazo?: string;
    }>;
    alertas?: Array<{
      tipo: string;
      mensagem: string;
      severidade?: "critica" | "alta" | "media" | "baixa";
    }>;

    checklistTatico?: string[];

    // Radar Liberdade (gauges for defense strategy)
    radarLiberdade?: {
      absolvicao?: number;
      desclassificacao?: number;
      atenuantes?: number;
      nulidade?: number;
      prescricao?: number;
      [key: string]: number | undefined;
    };

    // Saneamento processual
    saneamento?: {
      pendencias?: Array<{ item: string; status: string; prazo?: string }>;
      observacoes?: string;
    };

    // Prioridade geral do caso
    prioridadeGeral?: "urgente" | "atencao" | "rotina"; // urgente=preso/prazo, atenção=audiência próxima
    ultimaAtualizacao?: string; // ISO date da última análise

    // ==========================================
    // TIER 1.5 — DINÂMICA DO FATO
    // ==========================================

    // Reconstrução do fato (visão 360°)
    dinamicaFato?: {
      dataHora?: string; // "18/12/2024 às 12h" — data + HORA
      local?: string; // endereço completo
      condicoesAmbientais?: string; // "dia claro, residência, porta aberta" | "noite, rua deserta, pouca iluminação"
      meioInstrumento?: string; // "mãos (tapas/socos)" | "arma branca (faca)" | "arma de fogo (revólver .38)"
      sequenciaAcoes?: string; // narrativa cronológica do fato em si
      motivacaoAlegada?: string; // "ciúmes" | "dívida" | "discussão sobre filhos"
      resultadoFatico?: string; // "lesão leve orelha direita" | "morte" | "ameaça sem contato físico"
    };

    // Lesões (da vítima e/ou do defendido)
    lesoes?: Array<{
      pessoa: string; // "Isabelle" | "Jhonatan"
      descricao: string; // "Lesão na orelha direita, escoriações nos braços"
      localizacaoCorpo?: string; // "orelha direita" | "abdômen" | "face"
      gravidade?: "leve" | "grave" | "gravissima" | "morte";
      laudoExiste?: boolean;
      laudoConteudo?: string; // resumo do laudo
      atendimentoMedico?: boolean;
      hospital?: string;
      observacoes?: string;
    }>;

    // Versão estruturada do defendido (além do depoimento)
    versaoDefendido?: {
      narrativa?: string; // a versão dele em 1-2 parágrafos
      confissaoExtrajudicial?: boolean;
      confissaoDetalhes?: string; // "Confirmou ter agredido" — o que exatamente disse
      confissaoQualificada?: boolean; // alegou excludente? legítima defesa?
      silencioExercido?: boolean; // exerceu direito ao silêncio em alguma fase?
      emQueFase?: string; // "delegacia" | "juízo"
      observacoes?: string;
    };

    // Condição socioeconômica do defendido
    condicaoSocioeconomica?: {
      renda?: string; // "1 salário mínimo" | "desempregado" | "informal"
      dependentes?: number;
      nomeDependentes?: string; // "filha menor de 3 anos"
      beneficiosSociais?: string[]; // "Bolsa Família", "BPC"
      moradiaFixa?: boolean;
      tipoMoradia?: string; // "própria" | "alugada" | "de favor"
      observacoes?: string;
    };

    // Saúde do defendido
    saudeDefendido?: {
      deficiencia?: string;
      doencaCronica?: string;
      dependenciaQuimica?: string; // "álcool" | "cocaína" | "crack"
      tratamentoPsiquiatrico?: boolean;
      laudoPsiquiatrico?: boolean;
      medicamentos?: string[];
      observacoes?: string;
    };

    // Documentos pessoais juntados
    documentosPessoais?: Array<{
      tipo: string; // "CTPS" | "comprovante residência" | "certidão nascimento filho" | "atestado trabalho"
      juntadoEm?: string;
      juntadoPor?: string; // "Adv. Aline" | "DPE Juliane"
      observacoes?: string;
    }>;

    // Representação/desistência (VVD art. 16, crimes condicionados)
    representacao?: {
      tipo?: "incondicionada" | "condicionada" | "queixa_crime";
      representou?: boolean;
      dataRepresentacao?: string;
      retratou?: boolean; // pediu desistência?
      dataRetratacao?: string;
      audienciaRetratacao?: boolean; // houve audiência do art. 16?
      observacoes?: string;
    };

    // ==========================================
    // TIER 2 — PARTES, DEPOIMENTOS, CRONOLOGIA
    // ==========================================

    // Pessoas envolvidas — INTELIGÊNCIA COMPLETA (ad.pessoas)
    pessoas?: Array<{
      nome: string;
      papel: string; // "defendido" | "vitima" | "testemunha_acusacao" | "testemunha_defesa" | "perito" | "delegado" | "policial_condutor" | "familiar" | "outro"
      cpf?: string;
      rg?: string;
      dataNascimento?: string;
      idade?: number;
      nacionalidade?: string;
      naturalidade?: string;
      profissao?: string;
      escolaridade?: string;
      estadoCivil?: string;
      filiacao?: string; // "Filho de X e Y"
      // Endereço (fundamental para mapa de inteligência)
      endereco?: string; // endereço completo
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      coordenadas?: { lat: number; lng: number };
      // Contato
      telefones?: string[];
      email?: string;
      // Vínculos e relações
      vinculoComDefendido?: string; // "ex-companheira", "vizinho", "colega de trabalho"
      vinculoComVitima?: string;
      vinculoComOutros?: Array<{ pessoa: string; vinculo: string }>;
      // Antecedentes e passagens
      antecedentes?: string; // "Primário" ou "Reincidente — art. X"
      passagensPoliciais?: Array<{ tipo: string; data?: string; delegacia?: string; resultado?: string }>;
      processosRelacionados?: Array<{ numero: string; crime?: string; status?: string; relacao?: string }>;
      // Status processual
      preso?: boolean;
      unidadePrisional?: string;
      monitoracaoEletronica?: boolean;
      medidasCautelares?: string[];
      // Audiência e intimação
      intimadoProximaAudiencia?: boolean;
      statusIntimacao?: "intimado" | "nao_intimado" | "frustrada" | "nao_localizado" | "por_edital" | "dispensado";
      detalheIntimacao?: string; // "Mandado devolvido: não localizado no endereço"
      dataCertidaoIntimacao?: string;
      enderecoTentadoIntimacao?: string; // endereço onde o oficial foi
      // Depoimentos prestados
      depoeNaDelegacia?: boolean;
      depoeEmJuizo?: boolean;
      dataDelegacia?: string;
      dataJuizo?: string;
      faltouAudiencia?: boolean;
      motivoFalta?: string; // "não localizado", "não compareceu", "mudou de endereço"
      multaAplicada?: boolean;
      valorMulta?: string;
      // Avaliação estratégica
      favoravelDefesa?: boolean | null;
      perguntasSugeridas?: string[];
      observacoes?: string;
    }>;

    // Depoimentos — ANÁLISE COMPLETA POR VARIÁVEIS DE INTELIGÊNCIA (ad.depoimentos)
    depoimentos?: Array<{
      nome: string;
      papel: string; // "vitima" | "testemunha_acusacao" | "testemunha_defesa" | "policial_condutor" | "perito" | "informante" | "defendido"
      resumo: string;

      // === DEPOIMENTOS POR FASE ===
      // Cada fase é um "momento" em que a pessoa foi ouvida
      fasesDepoimento?: Array<{
        fase: "delegacia" | "juizo_instrucao" | "juizo_justificacao" | "plenario" | "reconhecimento" | "acareacao";
        data?: string;
        local?: string; // "DEAM Camaçari" | "Vara VVD Camaçari" | "Plenário do Júri"
        autoridade?: string; // "Del. Francisca Luciene" | "Juiz André Gomma"
        modalidade?: "presencial" | "videoconferencia" | "hibrida";
        duracaoAproximada?: string; // "15 minutos"
        resumo: string; // o que disse nesta fase
        citacoes?: string[]; // trechos literais desta fase
      }>;
      // Atalhos (compatibilidade — preenchidos a partir de fasesDepoimento)
      fasePolicial?: string; // resumo consolidado delegacia
      faseJudicial?: string; // resumo consolidado juízo
      fasePlenario?: string; // resumo consolidado plenário
      dataDelegacia?: string;
      dataJuizo?: string;

      // === CITAÇÕES LITERAIS ===
      citacoes?: string[];
      trechosRelevantes?: string[];
      quemPerguntou?: string; // "MP" | "Defesa" | "Juiz"

      // === CONTEXTO FORMAL DO DEPOIMENTO ===
      ouvitoSobCompromisso?: boolean; // art. 203 CPP — informante sem compromisso tem peso menor
      qualidadeDepoente?: "testemunha_compromissada" | "informante" | "ofendido" | "perito" | "acusado";
      comportamentoDuranteDepoimento?: string; // "chorou", "hesitou", "olhou para o réu", "pareceu seguro", "evitou detalhes"
      assistidoPorAdvogado?: boolean; // se tinha advogado presente (relevante para interrogatório)

      // === VARIÁVEIS DE INTELIGÊNCIA — responder para cada depoente ===

      // 1. Presença e percepção direta
      presenciouFato?: boolean; // Viu/ouviu o fato diretamente?
      presenciouDetalhes?: string; // O que exatamente viu/ouviu? De onde? A que distância?
      chegouApos?: boolean; // Chegou depois do fato? Viu apenas o resultado?
      fonteInformacao?: string; // Se não presenciou: quem contou? É hearsay?

      // 2. Identificação e reconhecimento
      identificouAlguem?: boolean; // Identificou alguma pessoa envolvida?
      comoIdentificou?: string; // "já conhecia" | "pela vestimenta" | "reconhecimento fotográfico" | "in loco"
      fezReconhecimentoDelegacia?: boolean; // Fez reconhecimento formal na delegacia?
      reconhecimentoRegular?: boolean; // Seguiu art. 226 CPP? (alinhamento, pessoa entre similares)
      irregularidadesReconhecimento?: string; // "foto única", "sem alinhamento", "sugestão do policial"
      reconhecimentoJudicial?: boolean; // Fez reconhecimento em juízo?

      // 3. Interesse e viés
      interesseNoCaso?: boolean; // Tem interesse pessoal no resultado?
      qualInteresse?: string; // "inimizade com réu", "relação com vítima", "policial que prendeu"
      vinculoComVitima?: string; // parentesco, amizade, relação afetiva
      vinculoComDefendido?: string;
      motivacaoParaDepor?: string; // "espontâneo", "conduzido pela polícia", "intimado"
      possibilidadeVies?: "alto" | "medio" | "baixo";
      descricaoVies?: string;

      // 4. Sinais de distorção, mentira ou inconsistência
      sinaisDistorcao?: boolean;
      tiposDistorcao?: Array<
        "contradicao_interna" | // Contradiz a si mesmo no mesmo depoimento
        "contradicao_entre_fases" | // Delegacia vs. juízo
        "contradicao_com_outros" | // Contradiz outro depoente
        "contradicao_com_prova" | // Contradiz laudo/documento/câmera
        "acrescimo_posterior" | // Acrescentou fatos que não mencionou antes
        "omissao_relevante" | // Omitiu fato que deveria saber
        "detalhamento_excessivo" | // Nível de detalhe incompatível com o contexto
        "vagueza_suspeita" | // Vago em pontos-chave
        "linguagem_ensaiada" | // Repete frases do BO ou de outro depoente
        "memoria_seletiva" | // Lembra detalhes irrelevantes mas esquece centrais
        "emocao_incompativel" | // Reação emocional não condiz com o relato
        "tempo_reacao" // Tempo entre fato e BO sugere preparação
      >;
      detalhesDistorcao?: string; // Explicação livre das inconsistências

      // 5. Memória e confiabilidade cognitiva
      tempoEntreFatoDepoimento?: string; // "2 horas", "3 dias", "6 meses"
      condicoesPercepcao?: string; // "escuro", "a 50 metros", "sob efeito de álcool", "situação de pânico"
      confiabilidadeMemoria?: "alta" | "media" | "baixa";
      motivoConfiabilidade?: string; // "depoimento imediato, condições favoráveis" ou "6 meses depois, à noite, sob estresse"

      // 6. Indícios observados pelo depoente
      indiciosRelatados?: string[]; // O que viu que seria indício? Arma, sangue, fuga, grito
      indicioProduzido?: boolean; // Ele próprio produziu/encontrou algum indício?
      preservouLocal?: boolean; // Preservou ou alterou o local?

      // 7. Conduta do depoente no fato
      participouDoFato?: boolean; // Interveio, separou, chamou polícia, fugiu?
      descricaoConduta?: string;
      sofrerAmecaça?: boolean; // Foi ameaçado para depor ou para não depor?
      detalheAmeaca?: string;

      // === CONTRADIÇÕES ESTRUTURADAS ===
      contradicoes?: Array<{
        delegacia?: string;
        juizo?: string;
        comOutroDepoente?: string; // "contradiz X que disse Y"
        comProva?: string; // "contradiz laudo que atesta Z"
        contradicao: string;
        impacto?: "favoravel_defesa" | "desfavoravel" | "neutro";
        gravidade?: "critica" | "relevante" | "menor";
      }>;

      // === ANÁLISE DE CREDIBILIDADE (síntese) ===
      credibilidade?: "alta" | "media" | "baixa";
      motivoCredibilidade?: string;
      impactoAcusacao?: string;
      impactoDefesa?: string;
      notaCredibilidade?: number; // 1-10

      // === AVALIAÇÃO ESTRATÉGICA ===
      favoravelDefesa?: boolean | null;
      deveSerOuvido?: boolean; // Vale a pena ouvir/reinquirir?
      riscoOuvir?: string; // "pode reforçar versão acusatória"
      perguntasSugeridas?: string[];
      objetivoPorPergunta?: string[]; // alinhado 1:1 com perguntasSugeridas
      observacoes?: string;
    }>;

    // Cronologia dos fatos (ad.cronologia)
    cronologia?: Array<{
      data: string;
      evento: string;
      tipo?: "fato" | "flagrante" | "processual" | "decisao" | "audiencia" | "pericia" | "favoravel_defesa" | "desfavoravel" | "neutro";
      fonte?: string; // "BO", "Depoimento de X", "Decisão judicial", "Laudo"
      relevancia?: "alta" | "media" | "baixa";
      localEvento?: string; // endereço do fato
      observacoes?: string;
    }>;

    // Locais relevantes — INTELIGÊNCIA GEOGRÁFICA (ad.locais)
    locais?: Array<{
      tipo: "FATO" | "RESIDENCIA_DEFENDIDO" | "RESIDENCIA_VITIMA" | "RESIDENCIA_TESTEMUNHA" | "DELEGACIA" | "FORUM" | "CAMERA" | "ROTA" | "LOCAL_TRABALHO" | "OUTRO";
      descricao: string; // "Residência do defendido" | "Local do fato"
      endereco: string; // ENDEREÇO COMPLETO — fundamental
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      coordenadas?: { lat: number; lng: number };
      pessoaRelacionada?: string; // "Jhonatan Alexander"
      relevancia?: string;
      observacoes?: string;
    }>;

    // Processos relacionados — INTELIGÊNCIA CRUZADA (ad.processosRelacionados)
    processosRelacionados?: Array<{
      numero: string;
      classe?: string; // "APF", "IP", "AP", "MPU", "HC", "Execução"
      vara?: string;
      comarca?: string;
      crime?: string;
      partes?: string; // "Jhonatan vs. Isabelle"
      status?: string; // "em andamento", "arquivado", "transitado"
      relacaoComPrincipal?: string; // "flagrante originário", "medida protetiva", "inquérito"
      decisoesRelevantes?: string[];
      observacoes?: string;
    }>;

    // Audiências — INTELIGÊNCIA PROCESSUAL (ad.audiencias)
    audiencias?: Array<{
      data: string;
      tipo: string; // "custódia" | "instrução" | "justificação" | "plenário" | "una"
      modalidade?: string; // "presencial" | "virtual" | "híbrida"
      realizada: boolean;
      juiz?: string;
      promotor?: string;
      defensor?: string;
      // Quem foi ouvido
      ouvidos?: Array<{ nome: string; forma?: "presencial" | "virtual" }>;
      // Quem faltou
      ausentes?: Array<{
        nome: string;
        motivo?: string; // "não intimado", "não localizado", "não compareceu sem justificativa"
        consequencia?: string; // "multa R$ 2.315", "condução coercitiva", "redesignação"
      }>;
      resultado?: string; // "frustrada — testemunhas ausentes", "concluída", "redesignada"
      proximaData?: string;
      observacoes?: string;
    }>;

    // Decisões judiciais relevantes (ad.decisoesJudiciais)
    decisoesJudiciais?: Array<{
      data: string;
      tipo: string; // "custódia" | "recebimento_denuncia" | "pronúncia" | "sentença" | "despacho" | "MPU" | "revogação"
      juiz?: string;
      resumo: string;
      fundamentacao?: string; // trechos da decisão
      dispositivoRelevante?: string; // o que decidiu
      impactoDefesa?: string; // como afeta a estratégia
      recorrivel?: boolean;
      prazoRecurso?: string;
      observacoes?: string;
    }>;

    // Passagens e antecedentes cruzados (ad.inteligenciaAntecedentes)
    inteligenciaAntecedentes?: {
      defendido?: {
        primario: boolean;
        certidaoData?: string;
        processosCriminais?: Array<{ numero: string; crime: string; status: string; comarca?: string }>;
        passagensPoliciais?: Array<{ tipo: string; data?: string; delegacia?: string }>;
        mandadosPendentes?: boolean;
        observacoes?: string;
      };
      vitima?: {
        processosCriminais?: Array<{ numero: string; crime: string; status: string; papel?: string }>;
        passagensPoliciais?: Array<{ tipo: string; data?: string; delegacia?: string }>;
        boletinsOcorrencia?: Array<{ numero: string; data?: string; natureza?: string; papel?: string }>;
        observacoes?: string;
      };
      outrosEnvolvidos?: Array<{
        nome: string;
        papel: string;
        processosCriminais?: Array<{ numero: string; crime: string; status: string }>;
        passagensPoliciais?: Array<{ tipo: string; data?: string }>;
        observacoes?: string;
      }>;
    }>;

    // Certidões e diligências de intimação (ad.diligenciasIntimacao)
    diligenciasIntimacao?: Array<{
      destinatario: string;
      tipo: "mandado" | "AR" | "edital" | "whatsapp" | "email" | "telefone";
      data: string;
      resultado: "positivo" | "negativo" | "parcial";
      detalhe: string; // "Compareci ao endereço X, não localizado" / "Intimado pessoalmente"
      enderecoTentado?: string;
      oficialJustica?: string;
      observacoes?: string;
    }>;

    // ==========================================
    // TIER 2.5 — PROVAS DIGITAIS & TECNOLÓGICAS
    // ==========================================

    // Câmeras de vigilância
    camerasVigilancia?: Array<{
      local?: string;
      existem?: boolean;
      requisitadas?: boolean;
      dataRequisicao?: string;
      conteudo?: string; // "Câmera registrou movimentação às 12h15" | "Sem imagens do momento do fato"
      preservada?: boolean; // mídia foi preservada ou já foi sobrescrita?
      observacoes?: string;
    }>;

    // Perícia de celular / digital
    periciaDigital?: Array<{
      dispositivo?: string; // "iPhone do réu" | "Samsung da vítima"
      apreendido?: boolean;
      periciado?: boolean;
      conteudoRelevante?: string; // "Mensagens ameaçadoras" | "Fotos do local" | "Geolocalização"
      printsMensagens?: boolean;
      whatsapp?: boolean;
      localizacao?: boolean;
      observacoes?: string;
    }>;

    // Interceptação telefônica
    interceptacaoTelefonica?: {
      houve?: boolean;
      autorizacaoJudicial?: string; // número da decisão
      periodo?: string; // "01/01 a 31/03/2025"
      ramais?: string[];
      conteudoRelevante?: string;
      transcricaoNosAutos?: boolean;
      observacoes?: string;
    };

    // Provas produzidas pela defesa (investigação defensiva)
    provasDefesa?: Array<{
      tipo?: string; // "documento" | "testemunha" | "laudo particular" | "foto" | "áudio" | "vídeo"
      descricao: string;
      juntadaEm?: string;
      impacto?: string;
      observacoes?: string;
    }>;

    // ==========================================
    // TIER 2.6 — ANDAMENTO PROCESSUAL DETALHADO
    // ==========================================

    // Recursos interpostos
    recursosInterpostos?: Array<{
      tipo: string; // "Apelação" | "RESE" | "HC" | "Agravo" | "Embargos" | "REsp" | "HC STJ"
      numero?: string;
      dataInterposicao?: string;
      dataIntimacaoDecisao?: string; // quando foi intimado da decisão recorrida
      prazoLegal?: string; // "5 dias" | "15 dias"
      vencimento?: string; // data limite
      status?: "pendente" | "admitido" | "provido" | "desprovido" | "prejudicado";
      teseRecursal?: string;
      relator?: string;
      observacoes?: string;
    }>;

    // Pedidos pendentes de decisão
    pedidosPendentes?: Array<{
      tipo: string; // "revogação tornozeleira" | "progressão" | "liberdade provisória" | "produção de prova"
      dataPeticao?: string;
      fundamentacao?: string;
      status: "aguardando_decisao" | "aguardando_MP" | "aguardando_diligencia" | "deferido" | "indeferido";
      diasPendente?: number;
      observacoes?: string;
    }>;

    // Prazos recursais em aberto
    prazosRecursais?: Array<{
      decisao: string; // "Sentença condenatória" | "Pronúncia"
      dataIntimacao?: string;
      prazo: string; // "5 dias"
      vencimento: string;
      recursoAdequado?: string; // "Apelação" | "RESE"
      interposto?: boolean;
      observacoes?: string;
    }>;

    // ==========================================
    // TIER 2.7 — INTELIGÊNCIA AVANÇADA
    // ==========================================

    // Precedentes aplicáveis já pesquisados
    precedentesAplicaveis?: Array<{
      tribunal: string; // "STJ" | "STF" | "TJ-BA"
      numero: string; // "HC 598.886/SC"
      tese: string; // resumo da tese fixada
      aplicabilidade: string; // como se aplica ao caso
      verificado?: boolean; // [VERIFICAR PRECEDENTE] se false
    }>;

    // Argumentos esperados do MP
    argumentosMpEsperados?: Array<{
      argumento: string;
      contraArgumento?: string; // como a defesa deve responder
      probabilidade?: "alta" | "media" | "baixa";
    }>;

    // Pontos sensíveis — temas a evitar
    pontosSensiveis?: Array<{
      tema: string;
      porque: string; // "se perguntar X, abre porta para Y"
      alternativa?: string; // abordagem segura
    }>;

    // Lacunas de investigação defensiva
    lacunasInvestigacao?: Array<{
      oqueFalta: string; // "ouvir vizinhos" | "obter câmeras" | "perícia de celular"
      prioridade: "alta" | "media" | "baixa";
      comoObter?: string;
    }>;

    // Testemunhas não arroladas (potenciais)
    testemunhasNaoArroladas?: Array<{
      nome?: string;
      relacao: string; // "vizinho mencionado no depoimento de X"
      potencial: string; // "pode confirmar que defendido estava em outro local"
      risco?: string; // "pode reforçar versão da vítima"
      fonteIdentificacao: string; // "mencionado na fls. 45 do IP"
    }>;

    // ==========================================
    // TIER 3 — TESES & ESTRATÉGIA
    // ==========================================

    // Teses completas com ranking (ad.tesesCompleto — preferred)
    tesesCompleto?: {
      principal?: { nome: string; fundamentacao: string; viabilidade: number; observacoes?: string };
      subsidiarias?: Array<{ nome: string; fundamentacao: string; viabilidade: number; observacoes?: string }>;
      desclassificacao?: { para: string; fundamentacao: string; viabilidade: number };
    };

    // Teses simples (ad.teses — fallback)
    teses?: string[];

    // Nulidades detectadas (ad.nulidades)
    nulidades?: Array<{
      tipo: string;
      descricao: string;
      severidade: "alta" | "media" | "baixa";
      fundamentacao: string;
      documentoRef?: string;
    }>;

    // Matriz de Guerra (ad.matrizGuerra)
    matrizGuerra?: Array<{
      argumento: string;
      tipo: "acusacao" | "defesa";
      forca: number;
      resposta?: string;
      fonte?: string;
    }>;

    // Orientação ao assistido (ad.orientacaoAssistido)
    orientacaoAssistido?: string;

    // Perspectiva plenária — Júri (ad.perspectivaPlenaria)
    perspectivaPlenaria?: string;

    // Perguntas estratégicas por testemunha (ad.perguntasEstrategicas)
    perguntasEstrategicas?: Array<{
      testemunha: string;
      papel?: string;
      perguntas: string[];
      objetivo?: string;
    }>;

    // ==========================================
    // TIER 4 — PROVAS & DOCUMENTOS (v7)
    // ==========================================

    // Inventário de provas (ad.inventarioProvas)
    inventarioProvas?: Array<{
      tipo: string;
      descricao: string;
      origem?: string;
      favoravel?: boolean;
      observacoes?: string;
      documentoRef?: string;
    }>;

    // Mapa documental (ad.mapaDocumental)
    mapaDocumental?: Array<{
      documento: string;
      tipo?: string;
      paginas?: string;
      conteudoRelevante?: string;
      observacoes?: string;
    }>;

    // Laudos periciais (ad.laudos)
    laudos?: Array<{
      tipo: string;
      perito?: string;
      conclusao?: string;
      pontosFracos?: string[];
      observacoes?: string;
    }>;

    // ==========================================
    // TIER 5 — IMPUTAÇÕES & DOSIMETRIA
    // ==========================================

    // Imputações detalhadas (ad.imputacoes)
    imputacoes?: Array<{
      crime: string;
      artigo?: string;
      qualificadoras?: string[];
      agravantes?: string[];
      atenuantes?: string[];
      penaMinima?: string;
      penaMaxima?: string;
      observacoes?: string;
    }>;

    // Radiografia da acusação (ad.acusacaoRadiografia)
    acusacaoRadiografia?: {
      orgaoAcusador?: string;
      tese?: string;
      provasIndicadas?: string[];
      fragilidades?: string[];
      observacoes?: string;
    };

    // Cálculo de pena / dosimetria (ad.calculoPena)
    calculoPena?: {
      penaBase?: string;
      circunstanciasJudiciais?: Array<{ circunstancia: string; valoracao: string }>;
      agravantesAtenuantes?: Array<{ tipo: string; descricao: string; efeito: string }>;
      causasAumentoDiminuicao?: Array<{ tipo: string; descricao: string; fracao: string }>;
      penaProvisoria?: string;
      penaDefinitiva?: string;
      regime?: string;
      substituicao?: string;
      observacoes?: string;
    };

    // Cadeia de custódia (ad.cadeiaCustodia)
    cadeiaCustodia?: {
      itens?: Array<{
        evidencia: string;
        etapas?: Array<{ fase: string; responsavel?: string; data?: string; local?: string }>;
        irregularidades?: string[];
        impacto?: string;
      }>;
      observacoes?: string;
    };

    // Licitude da prova (ad.licitudeProva)
    licitudeProva?: {
      provasIlicitas?: Array<{
        prova: string;
        motivo: string;
        fundamentacao: string;
        provasDerivadas?: string[];
      }>;
      observacoes?: string;
    };

    // ==========================================
    // TIER 6 — ATRIBUIÇÃO: JÚRI
    // ==========================================

    // Rito bifásico — Júri (ad.ritoBifasico)
    ritoBifasico?: {
      fase?: string;
      pronuncDesclassific?: string;
      materialidade?: { status: string; observacoes?: string };
      autoria?: { status: string; observacoes?: string };
      qualificadoras?: Array<{ nome: string; fundamentacao: string; estrategia?: string }>;
      observacoes?: string;
    };

    // Preparação para plenário (ad.preparacaoPlenario)
    preparacaoPlenario?: {
      tesesPlenario?: Array<{ tese: string; argumento: string; prova?: string }>;
      quesitos?: Array<{ quesito: string; resposta_esperada?: string; estrategia?: string }>;
      jurados?: { perfil?: string; orientacoes?: string };
      retorica?: string;
      observacoes?: string;
    };

    // ==========================================
    // TIER 7 — ATRIBUIÇÃO: VVD
    // ==========================================

    // MPU / Medidas Protetivas de Urgência (ad.mpu)
    mpu?: {
      medidasVigentes?: Array<{ medida: string; status: string; dataConcessao?: string }>;
      descumprimentos?: Array<{
        descricao: string;
        data?: string;
        providencia?: string; // "prisão preventiva decretada" | "advertência"
        processoDescumprimento?: string; // nº do processo de descumprimento (art. 24-A)
      }>;
      observacoes?: string;
    };

    // Contexto relacional (ad.contextoRelacional)
    contextoRelacional?: {
      tipoRelacao?: string;
      tempoRelacao?: string;
      filhos?: number;
      nomeFilhos?: string[];
      idadeFilhos?: number[];
      guardaRegulamentada?: boolean;
      visitasRegulamentadas?: boolean;
      pensaoAlimenticia?: boolean;
      dependenciaEconomica?: boolean;
      cicloViolencia?: string;
      historico?: string;
      disputasParalelas?: string; // "guarda", "partilha de bens", "pensão"
      observacoes?: string;
    };

    // Rede de apoio e acompanhamento (VVD)
    redeApoio?: {
      creas?: boolean;
      cram?: boolean;
      caps?: boolean;
      delegaciaMulher?: boolean;
      abrigo?: boolean;
      patrulhaMariaPenha?: boolean;
      equipeMultidisciplinar?: boolean;
      grupoReflexivo?: boolean; // defendido encaminhado para grupo reflexivo?
      grupoReflexivoStatus?: string; // "encaminhado" | "frequentando" | "concluído" | "não compareceu"
      observacoes?: string;
    };

    // ==========================================
    // TIER 8 — ATRIBUIÇÃO: EXECUÇÃO PENAL
    // ==========================================

    // Cronograma de benefícios (ad.cronogramaBeneficios)
    cronogramaBeneficios?: {
      beneficios?: Array<{
        nome: string; // "progressão" | "livramento condicional" | "indulto" | "saída temporária"
        dataPrevisao?: string;
        fracao?: string; // "1/6" | "2/5" | "3/5"
        requisitosObjetivos?: boolean;
        requisitosSubjetivos?: string; // "bom comportamento" | "pendente de exame"
        status?: "preenchido" | "pendente" | "requerido" | "indeferido";
        observacoes?: string;
      }>;
      observacoes?: string;
    };

    // Detração detalhada (EP)
    detracaoDetalhada?: {
      periodos?: Array<{
        tipo: "prisao_provisoria" | "prisao_definitiva" | "monitoracao_eletronica" | "domiciliar";
        dataInicio: string;
        dataFim?: string; // null = vigente
        dias?: number;
        fundamentacao?: string;
      }>;
      totalDias?: number;
      observacoes?: string;
    };

    // Remição por trabalho/estudo (art. 126 LEP)
    remicao?: {
      trabalho?: {
        local?: string;
        jornadaDiaria?: string;
        diasTrabalhados?: number;
        diasRemidos?: number; // 3 dias trabalho = 1 dia remido
        atestadoJuntado?: boolean;
      };
      estudo?: {
        instituicao?: string;
        cargaHoraria?: string;
        horasEstudadas?: number;
        diasRemidos?: number; // 12 horas estudo = 1 dia remido
        certificadoJuntado?: boolean;
      };
      leitura?: {
        obrasLidas?: number;
        diasRemidos?: number; // 1 obra = 4 dias
        resenhasJuntadas?: boolean;
      };
      totalDiasRemidos?: number;
      observacoes?: string;
    };

    // Comportamento carcerário (EP)
    comportamentoCarcerario?: {
      atestadoComportamento?: boolean;
      classificacao?: "bom" | "regular" | "mau";
      faltasDisciplinares?: Array<{
        tipo: "leve" | "media" | "grave";
        data?: string;
        descricao?: string;
        sanção?: string;
        reabilitada?: boolean;
      }>;
      dataUltimoAtestado?: string;
      observacoes?: string;
    };

    // ==========================================
    // META
    // ==========================================
    documentosProcessados?: number;
    documentosTotal?: number;
    versaoModelo?: string;

    // Payload wrapper (used by cowork worker for nested data)
    payload?: Record<string, any>;
  }>(),
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: integer("analysis_version").default(0),

  // Geolocalização do fato
  localDoFatoEndereco: text("local_do_fato_endereco"),
  localDoFatoLat: numeric("local_do_fato_lat", { precision: 10, scale: 7 }),
  localDoFatoLng: numeric("local_do_fato_lng", { precision: 10, scale: 7 }),

  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("processos_assistido_id_idx").on(table.assistidoId),
  index("processos_numero_autos_idx").on(table.numeroAutos),
  index("processos_comarca_idx").on(table.comarca),
  index("processos_area_idx").on(table.area),
  index("processos_is_juri_idx").on(table.isJuri),
  index("processos_defensor_id_idx").on(table.defensorId),
  index("processos_situacao_idx").on(table.situacao),
  index("processos_deleted_at_idx").on(table.deletedAt),
  index("processos_caso_id_idx").on(table.casoId),
  index("processos_analysis_status_idx").on(table.analysisStatus),
  index("processos_comarca_id_idx").on(table.comarcaId),
  index("processos_local_fato_geo_idx").on(table.localDoFatoLat, table.localDoFatoLng),
]);

export type Processo = typeof processos.$inferSelect;
export type InsertProcesso = typeof processos.$inferInsert;

// ==========================================
// DEMANDAS/PRAZOS (Coração da Gestão)
// ==========================================

export const demandas = pgTable("demandas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  ato: text("ato").notNull(),
  tipoAto: varchar("tipo_ato", { length: 50 }),
  prazo: date("prazo"),
  dataEntrada: date("data_entrada"),
  dataIntimacao: date("data_intimacao"),
  dataExpedicao: date("data_expedicao"),
  dataConclusao: timestamp("data_conclusao"),
  tipoPrazoId: integer("tipo_prazo_id"),
  status: statusDemandaEnum("status").default("5_FILA"),
  substatus: varchar("substatus", { length: 50 }),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),
  providencias: text("providencias"),
  defensorId: integer("defensor_id").references(() => users.id),
  delegadoParaId: integer("delegado_para_id").references(() => users.id),
  dataDelegacao: timestamp("data_delegacao"),
  motivoDelegacao: text("motivo_delegacao"),
  statusDelegacao: varchar("status_delegacao", { length: 20 }),
  prazoSugerido: date("prazo_sugerido"),
  reuPreso: boolean("reu_preso").default(false),
  googleCalendarEventId: text("google_calendar_event_id"),
  casoId: integer("caso_id"),
  ordemManual: integer("ordem_manual"),
  importBatchId: text("import_batch_id"),
  ordemOriginal: integer("ordem_original"),
  enrichmentData: jsonb("enrichment_data").$type<{
    crime?: string;
    artigos?: string[];
    qualificadoras?: string[];
    fase_processual?: string;
    atribuicao_detectada?: string;
    reu_preso_detectado?: boolean;
    intimado?: string;
    correus?: string[];
    vitima?: string;
    urgencia?: string;
    confidence?: number;
    tipo_documento_pje?: string;
    tipo_processo?: string;
    id_documento_pje?: string;
    vara?: string;
  }>(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  syncedAt: timestamp("synced_at"),
}, (table) => [
  index("demandas_processo_id_idx").on(table.processoId),
  index("demandas_assistido_id_idx").on(table.assistidoId),
  index("demandas_prazo_idx").on(table.prazo),
  index("demandas_status_idx").on(table.status),
  index("demandas_prioridade_idx").on(table.prioridade),
  index("demandas_delegado_para_id_idx").on(table.delegadoParaId),
  index("demandas_defensor_id_idx").on(table.defensorId),
  index("demandas_reu_preso_idx").on(table.reuPreso),
  index("demandas_deleted_at_idx").on(table.deletedAt),
  index("demandas_caso_id_idx").on(table.casoId),
  index("demandas_import_batch_id_idx").on(table.importBatchId),
]);

export type Demanda = typeof demandas.$inferSelect;
export type InsertDemanda = typeof demandas.$inferInsert;

// ==========================================
// HISTÓRICO DE DELEGAÇÕES
// ==========================================

export const delegacoesHistorico = pgTable("delegacoes_historico", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id")
    .references(() => demandas.id, { onDelete: "cascade" }),
  delegadoDeId: integer("delegado_de_id")
    .notNull()
    .references(() => users.id),
  delegadoParaId: integer("delegado_para_id")
    .notNull()
    .references(() => users.id),
  dataDelegacao: timestamp("data_delegacao").defaultNow().notNull(),
  dataAceitacao: timestamp("data_aceitacao"),
  dataConclusao: timestamp("data_conclusao"),
  tipo: varchar("tipo", { length: 30 }).default("delegacao_generica"),
  instrucoes: text("instrucoes"),
  orientacoes: text("orientacoes"),
  observacoes: text("observacoes"),
  prazoSugerido: date("prazo_sugerido"),
  status: varchar("status", { length: 25 }).default("pendente").notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),
  prioridade: varchar("prioridade", { length: 10 }).default("NORMAL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("delegacoes_historico_demanda_id_idx").on(table.demandaId),
  index("delegacoes_historico_delegado_de_id_idx").on(table.delegadoDeId),
  index("delegacoes_historico_delegado_para_id_idx").on(table.delegadoParaId),
  index("delegacoes_historico_status_idx").on(table.status),
  index("delegacoes_historico_tipo_idx").on(table.tipo),
  index("delegacoes_historico_assistido_id_idx").on(table.assistidoId),
  index("delegacoes_historico_processo_id_idx").on(table.processoId),
]);

export type DelegacaoHistorico = typeof delegacoesHistorico.$inferSelect;
export type InsertDelegacaoHistorico = typeof delegacoesHistorico.$inferInsert;

// ==========================================
// AFASTAMENTOS (Cobertura entre Defensores)
// ==========================================

export const afastamentos = pgTable("afastamentos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id")
    .notNull()
    .references(() => users.id),
  substitutoId: integer("substituto_id")
    .notNull()
    .references(() => users.id),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  tipo: varchar("tipo", { length: 20 }).default("FERIAS").notNull(),
  motivo: text("motivo"),
  ativo: boolean("ativo").default(true).notNull(),
  acessoDemandas: boolean("acesso_demandas").default(true),
  acessoEquipe: boolean("acesso_equipe").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("afastamentos_defensor_id_idx").on(table.defensorId),
  index("afastamentos_substituto_id_idx").on(table.substitutoId),
  index("afastamentos_ativo_idx").on(table.ativo),
  index("afastamentos_data_inicio_idx").on(table.dataInicio),
]);

export type Afastamento = typeof afastamentos.$inferSelect;
export type InsertAfastamento = typeof afastamentos.$inferInsert;

// ==========================================
// VINCULAÇÃO ASSISTIDOS-PROCESSOS (MUITOS-PARA-MUITOS)
// ==========================================

export const assistidosProcessos = pgTable("assistidos_processos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  papel: papelProcessoEnum("papel").default("REU").notNull(),
  isPrincipal: boolean("is_principal").default(true),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_processos_assistido_id_idx").on(table.assistidoId),
  index("assistidos_processos_processo_id_idx").on(table.processoId),
  index("assistidos_processos_papel_idx").on(table.papel),
  uniqueIndex("assistidos_processos_unique_idx").on(table.assistidoId, table.processoId, table.papel),
]);

export type AssistidoProcesso = typeof assistidosProcessos.$inferSelect;
export type InsertAssistidoProcesso = typeof assistidosProcessos.$inferInsert;

// ==========================================
// USER SETTINGS
// ==========================================

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_settings_user_id_idx").on(table.userId),
]);

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ==========================================
// USER INVITATIONS
// ==========================================

export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  nome: text("nome").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  nucleo: varchar("nucleo", { length: 30 }),
  funcao: varchar("funcao", { length: 30 }).default("defensor_titular"),
  oab: varchar("oab", { length: 50 }),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(),
  podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
  podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
  mensagem: text("mensagem"),
  invitedById: integer("invited_by_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedUserId: integer("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_invitations_email_idx").on(table.email),
  index("user_invitations_token_idx").on(table.token),
  index("user_invitations_status_idx").on(table.status),
]);

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ==========================================
// HANDOFF CONFIG (INFORMAÇÕES POR COMARCA)
// ==========================================

export const handoffConfig = pgTable("handoff_config", {
  id: serial("id").primaryKey(),
  comarca: text("comarca").notNull().unique(),
  defensor2grauInfo: text("defensor_2grau_info"),
  defensorEPInfo: text("defensor_ep_info"),
  nucleoEPEndereco: text("nucleo_ep_endereco"),
  nucleoEPTelefone: text("nucleo_ep_telefone"),
  nucleoEPHorario: text("nucleo_ep_horario"),
  mensagemPersonalizada: text("mensagem_personalizada"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("handoff_config_comarca_idx").on(table.comarca),
]);

// ==========================================
// DEFENSOR PARCEIROS
// ==========================================
export const defensorParceiros = pgTable("defensor_parceiros", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parceiroId: integer("parceiro_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("defensor_parceiros_defensor_idx").on(table.defensorId),
  index("defensor_parceiros_parceiro_idx").on(table.parceiroId),
  unique("defensor_parceiros_unique").on(table.defensorId, table.parceiroId),
]);
export type DefensorParceiro = typeof defensorParceiros.$inferSelect;
export type InsertDefensorParceiro = typeof defensorParceiros.$inferInsert;

// ==========================================
// SYNC LOG
// ==========================================

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "cascade" }),
  campo: varchar("campo", { length: 50 }).notNull(),
  valorBanco: text("valor_banco"),
  valorPlanilha: text("valor_planilha"),
  origem: syncOrigemEnum("origem").notNull(),
  bancoUpdatedAt: timestamp("banco_updated_at"),
  planilhaUpdatedAt: timestamp("planilha_updated_at"),
  conflito: boolean("conflito").default(false),
  resolvidoEm: timestamp("resolvido_em"),
  resolvidoPor: varchar("resolvido_por", { length: 100 }),
  resolvidoValor: text("resolvido_valor"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SyncLogEntry = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

// ==========================================
// CHAT HISTORY (Skills)
// ==========================================

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  skillId: varchar("skill_id", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChatHistoryEntry = typeof chatHistory.$inferSelect;
export type InsertChatHistory = typeof chatHistory.$inferInsert;

// ==========================================
// ANALYSIS JOBS (Worker Queue)
// ==========================================

export const analysisJobs = pgTable("analysis_jobs", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id),
  skill: varchar("skill", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("analysis_jobs_status_idx").on(table.status),
  processoIdx: index("analysis_jobs_processo_idx").on(table.processoId),
}));

export type AnalysisJob = typeof analysisJobs.$inferSelect;
export type InsertAnalysisJob = typeof analysisJobs.$inferInsert;
