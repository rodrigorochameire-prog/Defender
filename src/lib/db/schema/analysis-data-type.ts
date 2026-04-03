// ==========================================
// AnalysisData Type -- Processos
// Extracted to separate file due to SWC parser size limits
// ==========================================

export type ProcessoAnalysisData = {

    // ==========================================
    // TIER 1 -- RESUMO & CONTROLE (always populated)
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
    // TIER 1.5 -- DINÂMICA DO FATO
    // ==========================================

    // Reconstrução do fato (visão 360°)
    dinamicaFato?: {
      dataHora?: string; // "18/12/2024 às 12h" -- data + HORA
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
      confissaoDetalhes?: string; // "Confirmou ter agredido" -- o que exatamente disse
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
    // TIER 2 -- PARTES, DEPOIMENTOS, CRONOLOGIA
    // ==========================================

    // Pessoas envolvidas -- INTELIGÊNCIA COMPLETA (ad.pessoas)
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
      antecedentes?: string; // "Primário" ou "Reincidente -- art. X"
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

    // Depoimentos -- ANÁLISE COMPLETA POR VARIÁVEIS DE INTELIGÊNCIA (ad.depoimentos)
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
      // Atalhos (compatibilidade -- preenchidos a partir de fasesDepoimento)
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
      ouvitoSobCompromisso?: boolean; // art. 203 CPP -- informante sem compromisso tem peso menor
      qualidadeDepoente?: "testemunha_compromissada" | "informante" | "ofendido" | "perito" | "acusado";
      comportamentoDuranteDepoimento?: string; // "chorou", "hesitou", "olhou para o réu", "pareceu seguro", "evitou detalhes"
      assistidoPorAdvogado?: boolean; // se tinha advogado presente (relevante para interrogatório)

      // === VARIÁVEIS DE INTELIGÊNCIA -- responder para cada depoente ===

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

    // Locais relevantes -- INTELIGÊNCIA GEOGRÁFICA (ad.locais)
    locais?: Array<{
      tipo: "FATO" | "RESIDENCIA_DEFENDIDO" | "RESIDENCIA_VITIMA" | "RESIDENCIA_TESTEMUNHA" | "DELEGACIA" | "FORUM" | "CAMERA" | "ROTA" | "LOCAL_TRABALHO" | "OUTRO";
      descricao: string; // "Residência do defendido" | "Local do fato"
      endereco: string; // ENDEREÇO COMPLETO -- fundamental
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
      coordenadas?: { lat: number; lng: number };
      pessoaRelacionada?: string; // "Jhonatan Alexander"
      relevancia?: string;
      observacoes?: string;
    }>;

    // Processos relacionados -- INTELIGÊNCIA CRUZADA (ad.processosRelacionados)
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

    // Audiências -- INTELIGÊNCIA PROCESSUAL (ad.audiencias)
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
      resultado?: string; // "frustrada -- testemunhas ausentes", "concluída", "redesignada"
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
    };

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
    // TIER 2.5 -- PROVAS DIGITAIS & TECNOLÓGICAS
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
    // TIER 2.6 -- ANDAMENTO PROCESSUAL DETALHADO
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
    // TIER 2.7 -- INTELIGÊNCIA AVANÇADA
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

    // Pontos sensíveis -- temas a evitar
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
    // TIER 3 -- TESES & ESTRATÉGIA
    // ==========================================

    // Teses completas com ranking (ad.tesesCompleto -- preferred)
    tesesCompleto?: {
      principal?: { nome: string; fundamentacao: string; viabilidade: number; observacoes?: string };
      subsidiarias?: Array<{ nome: string; fundamentacao: string; viabilidade: number; observacoes?: string }>;
      desclassificacao?: { para: string; fundamentacao: string; viabilidade: number };
    };

    // Teses simples (ad.teses -- fallback)
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

    // Perspectiva plenária -- Júri (ad.perspectivaPlenaria)
    perspectivaPlenaria?: string;

    // Perguntas estratégicas por testemunha (ad.perguntasEstrategicas)
    perguntasEstrategicas?: Array<{
      testemunha: string;
      papel?: string;
      perguntas: string[];
      objetivo?: string;
    }>;

    // ==========================================
    // TIER 4 -- PROVAS & DOCUMENTOS (v7)
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
    // TIER 5 -- IMPUTAÇÕES & DOSIMETRIA
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
    // TIER 5.5 -- CRIMINAL COMUM: POR TIPO PENAL
    // ==========================================

    // ---- TRÁFICO DE DROGAS (Lei 11.343/06) ----
    trafico?: {
      // Droga apreendida
      tipoDroga?: string; // "cocaína" | "maconha" | "crack" | "ecstasy" | "LSD" | "múltiplas"
      quantidade?: string; // "26 papelotes de cocaína" | "500g de maconha"
      quantidadeGramas?: number;
      embalagens?: string; // "papelotes" | "tijolos" | "porções" | "pinos"
      quantidadeEmbalagens?: number;
      localApreensao?: string; // "via pública" | "residência" | "veículo" | "pessoa do flagranteado"
      proximidadeEscola?: boolean; // art. 40, III -- causa de aumento
      // Laudo
      laudoConstatacaoProvisoria?: boolean; // existe?
      laudoDefinitivo?: boolean; // foi juntado?
      laudoConteudo?: string; // resultado do laudo
      // Tipificação
      artigoImputado?: "art33" | "art33_p4" | "art34" | "art35" | "art28"; // tráfico | privilegiado | maquinário | associação | uso
      // Tráfico vs. Uso (a grande questão)
      teseUsoPessoal?: boolean; // defesa alega que era para uso
      elementosUso?: string[]; // "quantidade pequena" | "sem petrechos de venda" | "primário" | "sem dinheiro trocado"
      elementosTrafico?: string[]; // "quantidade grande" | "embalagens fracionadas" | "dinheiro trocado" | "balança"
      // Art. 33, §4° -- traficante ocasional (redução 1/6 a 2/3)
      paragrafo4Aplicavel?: boolean;
      requisitosParagrafo4?: {
        primario?: boolean;
        bonsAntecedentes?: boolean;
        naoIntegranteOrganizacao?: boolean;
        naoSeDedicaAtividadeCriminosa?: boolean;
      };
      // Circunstâncias da apreensão
      flagranteOrigem?: "denuncia_anonima" | "patrulhamento" | "mandado" | "cumprimento_busca" | "blitz" | "outra";
      buscaPessoalFundada?: boolean; // fundada suspeita? (art. 244 CPP)
      motivoBuscaPessoal?: string;
      cadeiaCustodiaDroga?: string; // regular? irregularidades?
      // Regime e benefícios
      equiparadoHediondo?: boolean; // tráfico = equiparado a hediondo
      fiancaVedada?: boolean;
      regimeInicialFechado?: boolean; // STF declarou inconstitucional a obrigatoriedade
      substituicaoPRD?: boolean; // vedação legal, mas STF flexibilizou
      observacoes?: string;
    };

    // ---- DESARMAMENTO (Lei 10.826/03) ----
    desarmamento?: {
      // Arma
      tipoArma?: string; // "revólver calibre .38" | "pistola 9mm" | "espingarda" | "simulacro"
      marca?: string;
      calibre?: string;
      usoPermitido?: boolean; // uso permitido vs. uso restrito
      numeracaoRaspada?: boolean; // art. 16, §1°, IV -- causa de aumento
      numeracao?: string;
      // Munição
      municaoApreendida?: boolean;
      quantidadeMunicao?: number;
      calibreMunicao?: string;
      // Tipificação
      artigoImputado?:
        | "art12" // Posse irregular (uso permitido) -- detenção 1-3 anos
        | "art14" // Porte ilegal (uso permitido) -- reclusão 2-4 anos
        | "art16" // Posse/porte (uso restrito) -- reclusão 3-6 anos
        | "art17" // Comércio ilegal -- reclusão 6-12 anos
        | "art18"; // Tráfico internacional -- reclusão 8-16 anos
      posseVsPorte?: "posse" | "porte"; // posse = dentro de casa | porte = fora
      // Perícia
      laudoPericial?: boolean; // arma periciada?
      armaAptaDisparo?: boolean; // FUNDAMENTAL -- se arma é inapta, tese de atipicidade
      resultadoPericia?: string;
      // Registro/Autorização
      possuiRegistro?: boolean;
      possuiCAC?: boolean; // Caçador/Atirador/Colecionador
      exercicioFuncao?: boolean; // portava no exercício de função?
      // Teses específicas
      teseAtipicidade?: boolean; // arma inapta = fato atípico
      teseInsignificancia?: boolean; // munição desacompanhada de arma
      tesePosse?: boolean; // era posse (dentro de casa), não porte
      observacoes?: string;
    };

    // ---- ROUBO (art. 157 CP) ----
    roubo?: {
      // Tipificação
      tipo?: "simples" | "majorado" | "latrocinio";
      // Causas de aumento (§2°)
      majorantes?: Array<{
        inciso: string; // "I" | "II" | "III" | "IV" | "V" | "VI" | "VII"
        descricao: string; // "emprego de arma de fogo" | "concurso de 2+ pessoas" | "restrição de liberdade"
        comprovada?: boolean;
        teseDefensiva?: string; // "arma não apreendida" | "simulacro"
      }>;
      // Arma no roubo
      empregoArma?: boolean;
      tipoArma?: "arma_fogo_real" | "arma_branca" | "simulacro" | "dedo_na_cintura" | "nao_apreendida";
      armaApreendida?: boolean;
      armaPericiada?: boolean;
      // Res furtiva (bens subtraídos)
      resFurtiva?: Array<{
        bem: string; // "celular iPhone 14" | "R$ 500,00" | "bolsa"
        valorEstimado?: string;
        restituido?: boolean;
      }>;
      valorTotal?: string;
      bensRestituidos?: boolean;
      // Reconhecimento (problema recorrente em roubo)
      reconhecimentoPessoal?: {
        realizado?: boolean;
        fase?: "delegacia" | "juizo";
        procedimento?: string; // "foto única" | "álbum fotográfico" | "presencial com alinhamento"
        regular226CPP?: boolean; // seguiu art. 226 CPP?
        irregularidades?: string[]; // "foto única WhatsApp" | "sem alinhamento" | "sugestão policial"
        teseIlegalidade?: boolean; // HC 598.886/SC STJ
      };
      // Câmeras
      camerasSeguranca?: boolean;
      imagensUteis?: boolean;
      conteudoImagens?: string;
      // Concurso
      concurso?: boolean;
      coautores?: string[];
      delacao?: boolean;
      // Continuidade delitiva
      continuidadeDelitiva?: boolean; // art. 71 CP
      quantosFatos?: number;
      observacoes?: string;
    };

    // ---- FURTO (art. 155 CP) ----
    furto?: {
      tipo?: "simples" | "qualificado" | "privilegiado";
      qualificadoras?: string[]; // "rompimento de obstáculo" | "escalada" | "destreza" | "chave falsa" | "concurso"
      resFurtiva?: Array<{ bem: string; valor?: string; restituido?: boolean }>;
      valorTotal?: string;
      principioInsignificancia?: boolean; // tese do furto famélico / bagatela
      criteriosInsignificancia?: { // STF: MARI
        minimaOfensividade?: boolean;
        ausenciaPericulosidade?: boolean;
        reduzidoGrauReprovabilidade?: boolean;
        inexpressividadeLesao?: boolean;
      };
      observacoes?: string;
    };

    // ---- RECEPTAÇÃO (art. 180 CP) ----
    receptacao?: {
      tipo?: "simples" | "qualificada" | "culposa";
      bemReceptado?: string;
      origemConhecida?: boolean; // sabia que era produto de crime?
      prova?: string; // como prova-se a ciência?
      observacoes?: string;
    };

    // ---- AMEAÇA (art. 147 CP) ----
    ameaca?: {
      meio?: "verbal" | "escrita" | "gesto" | "whatsapp" | "audio" | "video";
      conteudo?: string; // o que foi dito/escrito
      provaDocumental?: boolean; // print, áudio, vídeo
      contexto?: string; // "durante briga" | "após separação"
      teseAtipicidade?: boolean; // ameaça vaga, genérica, inverossímil
      observacoes?: string;
    };

    // ==========================================
    // TIER 5.6 -- ANPP NA FASE DE CONHECIMENTO
    // ==========================================

    // ANPP proposto/cabível durante a investigação ou ação penal
    anppConhecimento?: {
      // Cabimento (art. 28-A CPP)
      cabivel?: boolean;
      motivoCabimentoOuNao?: string;
      requisitos?: {
        penaMinimaMenor4Anos?: boolean;
        naoArquivamento?: boolean;
        naoReincidente?: boolean;
        naoBeneficiadoAntes?: boolean; // nos últimos 5 anos
        circunstanciasFavoraveis?: boolean;
      };

      // Propositura
      oferecidoPeloMP?: boolean;
      dataOferecimento?: string;
      motivoNaoOferecimento?: string; // se não foi oferecido quando cabível
      defesaRequereuAoJuiz?: boolean; // art. 28-A, §14 -- remessa ao PGJ

      // Negociação
      condicoesPropostas?: Array<{
        tipo: "reparacao_dano" | "psc" | "pecuniaria" | "comparecimento" | "outra";
        descricao: string;
        prazo?: string;
        valor?: string;
      }>;
      defendidoAceitou?: boolean;
      motivoRecusa?: string;
      defensorPresente?: boolean; // §4° -- obrigatório

      // Homologação
      homologado?: boolean;
      dataHomologacao?: string;
      juizHomologador?: string;
      audienciaVoluntariedade?: boolean; // §4° -- juiz verificou voluntariedade?

      // Se não oferecido quando cabível -- tese defensiva
      teseNaoOferecimento?: {
        cabivelMasNaoOferecido?: boolean;
        requerimentoAoJuiz?: boolean; // art. 28-A, §14
        remessaPGJ?: boolean;
        resultado?: string;
      };

      observacoes?: string;
    };

    // ==========================================
    // TIER 6 -- ATRIBUIÇÃO: JÚRI (COMPLETO)
    // ==========================================

    // ---- TIPIFICAÇÃO DO HOMICÍDIO ----
    homicidio?: {
      tipo?: "simples" | "qualificado" | "privilegiado" | "culposo" | "tentado" | "tentado_qualificado";
      consumado?: boolean;
      // Qualificadoras (art. 121, §2°) -- cada uma com análise probatória
      qualificadoras?: Array<{
        inciso: "I_torpe" | "II_futl" | "III_cruel" | "IV_recurso_impossivel_defesa" | "V_conexao" | "VI_feminicidio" | "VII_contra_autoridade" | "VIII_menor_14";
        descricao: string; // "motivo torpe -- vingança por dívida de drogas"
        indicadoresProva?: string[]; // o que nos autos sustenta essa qualificadora
        fragilidadesProva?: string[]; // o que a defesa pode explorar
        manifestamenteImprocedente?: boolean; // pode pedir afastamento na pronúncia?
        fundamentoAfastamento?: string; // argumento jurídico para afastar
        incluídaNaPronúncia?: boolean; // juiz incluiu na pronúncia?
        estrategiaPlenario?: string; // como enfrentar no plenário
      }>;
      // Privilégio (art. 121, §1°)
      privilegio?: {
        alegado?: boolean;
        violentaEmocao?: boolean;
        logoEmSeguida?: boolean; // imediatamente após provocação?
        injustaProvocacao?: boolean;
        descricaoProvocacao?: string;
        compatibilidadeComQualificadoras?: string; // "incompatível com torpe" | "compatível com recurso"
        observacoes?: string;
      };
      // Vítima
      vitima?: {
        nome?: string;
        idade?: number;
        profissao?: string;
        relacaoComReu?: string; // "desconhecido" | "amigo" | "rival" | "parente" | "companheira"
        antecedentesVitima?: string; // passagens policiais, processos -- relevante para legítima defesa
        comportamentoPreFato?: string; // "ameaçou o réu" | "estava armado" | "provocou"
        causaMortis?: string; // do laudo necroscópico
        observacoes?: string;
      };
      // Arma de fogo (majorante Lei 13.964/2019)
      armaFogo?: {
        utilizada?: boolean;
        tipo?: string; // "revólver .38" | "pistola 9mm" | "espingarda"
        apreendida?: boolean;
        periciada?: boolean;
        aptaDisparo?: boolean;
        registrada?: boolean;
        origem?: string; // "arma do réu" | "arma da vítima" | "origem desconhecida"
        majoranteIncidivel?: boolean; // aumento de 2/3 se arma de fogo de uso restrito/ilegal
        observacoes?: string;
      };
      // Concurso de agentes
      concurso?: {
        houve?: boolean;
        coautores?: Array<{ nome: string; papel?: string; situacao?: string }>;
        participacaoDoDefendido?: string; // "autor direto" | "partícipe" | "autor intelectual"
        participacaoMenorImportancia?: boolean; // art. 29, §1° -- diminuição 1/6 a 1/3
        comunicabilidadeQualificadoras?: string; // elementar vs. circunstância
        observacoes?: string;
      };
      observacoes?: string;
    };

    // ---- PROVA FORENSE (Laudos específicos do Júri) ----
    provaForense?: {
      // Laudo necroscópico
      necroscopico?: {
        existe?: boolean;
        perito?: string;
        dataExame?: string;
        causaMortis?: string; // "ferimento por arma de fogo" | "trauma crânio-encefálico"
        instrumentoCausador?: string; // "projétil de arma de fogo" | "instrumento contundente"
        numeroLesoes?: number;
        localizacaoLesoes?: string[]; // "região torácica anterior" | "face" | "costas"
        lesoesDefensivas?: boolean; // vítima tentou se defender? (relevante para LD)
        compatibilidadeVersaoDefesa?: string; // "compatível com legítima defesa" | "incompatível"
        distanciaDisparo?: string; // "encostado" | "curta distância" | "longa distância"
        direcaoDisparo?: string; // "frente para trás" | "costas" | "cima para baixo"
        morteInstantanea?: boolean; // relevante para crueldade
        observacoes?: string;
      };
      // Laudo de local
      laudoLocal?: {
        existe?: boolean;
        perito?: string;
        localDescrito?: string;
        sinaisLuta?: boolean; // vestígios de confronto?
        manchasSangue?: string; // "ausentes" | "compatíveis com a dinâmica descrita"
        posicaoCorpo?: string;
        objetos?: string[]; // "faca encontrada" | "cápsulas deflagradas"
        capsulasEncontradas?: number;
        projetisEncontrados?: number;
        compatibilidadeComVersoes?: string;
        inconclusivo?: boolean;
        observacoes?: string;
      };
      // Balística
      balistica?: {
        existe?: boolean;
        armaPericiada?: boolean;
        aptaDisparo?: boolean;
        calibre?: string;
        confrontoPositivo?: boolean; // projetil veio da arma apreendida?
        numeroCapsulas?: number;
        numeroDisparos?: number;
        observacoes?: string;
      };
      // Toxicologia (do réu e/ou vítima)
      toxicologia?: {
        existe?: boolean;
        deQuem?: "reu" | "vitima" | "ambos";
        resultado?: string; // "positivo para álcool" | "negativo" | "positivo para cocaína"
        relevanciaParaDefesa?: string; // "vítima embriagada = agressora" | "réu sob efeito = inimputável?"
        observacoes?: string;
      };
      observacoes?: string;
    };

    // ---- INVESTIGAÇÃO DEFENSIVA / OSINT ----
    investigacaoDefensiva?: {
      realizada?: boolean;
      // Câmeras de segurança (buscadas pela defesa)
      cameras?: Array<{
        local?: string;
        proprietario?: string;
        requisitada?: boolean;
        dataRequisicao?: string;
        conteudo?: string;
        preservada?: boolean;
        utilParaDefesa?: boolean;
      }>;
      // Telefonia (ERBs, registros de chamadas)
      telefonia?: {
        requisitada?: boolean;
        conteudo?: string; // "réu estava em outro bairro no horário do fato"
        erbsAnalisadas?: boolean;
        observacoes?: string;
      };
      // Redes sociais / mensagens
      redesSociais?: {
        analisadas?: boolean;
        conteudo?: string; // "vítima postou ameaças ao réu 2 dias antes"
        prints?: boolean;
        preservadas?: boolean; // ata notarial?
        observacoes?: string;
      };
      // Testemunhas não ouvidas no IP
      testemunhasDescobertasDefesa?: Array<{
        nome?: string;
        relacao?: string;
        oquePodeProvar?: string;
        arrolada?: boolean;
      }>;
      // Antecedentes da vítima (investigação defensiva)
      antecedentesVitima?: {
        pesquisados?: boolean;
        processosCriminais?: Array<{ numero?: string; crime?: string; resultado?: string }>;
        passagensPoliciais?: string[];
        reputacao?: string; // "pessoa violenta conhecida no bairro"
        relevanciaParaDefesa?: string; // "vítima era traficante armado"
        observacoes?: string;
      };
      observacoes?: string;
    };

    // ---- RITO BIFÁSICO (pronúncia/impronúncia) ----
    ritoBifasico?: {
      faseAtual?: "pre_pronuncia" | "pos_pronuncia" | "pre_plenario" | "plenario" | "pos_plenario";
      // Pronúncia
      pronuncia?: {
        proferida?: boolean;
        data?: string;
        juiz?: string;
        qualificadorasIncluidas?: string[];
        qualificadorasAfastadas?: string[];
        fundamentacao?: string; // resumo
        recursoInterposto?: boolean; // RESE contra pronúncia?
        resultadoRecurso?: string;
        observacoes?: string;
      };
      // Impronúncia / Absolvição sumária / Desclassificação
      decisaoAlternativa?: {
        tipo?: "impronuncia" | "absolvicao_sumaria" | "desclassificacao";
        para?: string; // se desclassificação: para qual crime?
        fundamentacao?: string;
        recursoMP?: boolean;
        observacoes?: string;
      };
      // Standard probatório por fase
      standardProbatorio?: {
        materialidadeComprovada?: boolean;
        indiciosSuficientesAutoria?: boolean; // standard da pronúncia (in dubio pro societate -- CRITICÁVEL)
        // STF RE 1.308.721: in dubio pro societate NÃO é princípio constitucional
        argumentoAntiInDubio?: boolean; // defesa questiona o standard?
        observacoes?: string;
      };
      observacoes?: string;
    };

    // ---- PREPARAÇÃO PARA PLENÁRIO ----
    preparacaoPlenario?: {
      // Quesitação (art. 483 CPP)
      quesitacao?: {
        quesitosPropostos?: Array<{
          numero: number;
          texto: string;
          fase: "materialidade" | "autoria" | "absolvicao" | "qualificadora" | "privilegio" | "causa_diminuicao" | "causa_aumento";
          respostaEsperadaDefesa: "sim" | "nao";
          estrategia?: string; // "se jurados responderem NÃO → absolvição"
        }>;
        tesesCompativeis?: string[]; // teses que podem coexistir
        tesesIncompativeis?: Array<{ tese1: string; tese2: string; motivo: string }>;
        ordemVotacao?: string; // sequência estratégica
        observacoes?: string;
      };
      // Sustentação oral
      sustentacaoOral?: {
        gancho?: string; // frase de abertura impactante
        argumentosPrincipais?: string[]; // 3-4 argumentos-chave
        frasesEfeito?: string[]; // frases memorizáveis
        vedacoesArt478?: string[]; // lembretes do que NÃO dizer
        linguagemSimples?: boolean; // jurados são leigos
        estrategiaReplica?: string;
        estrategiaTreplica?: string; // último discurso -- argumentos guardados
        observacoes?: string;
      };
      // Perfil dos jurados
      jurados?: {
        listaDisponivel?: boolean;
        perfis?: Array<{
          nome?: string;
          profissao?: string;
          idade?: number;
          historicoJulgamentos?: string;
          perfilFavoravel?: boolean;
          motivoAvaliacao?: string;
          causaRecusa?: string; // art. 468 CPP
        }>;
        estrategiaRecusa?: string; // quem recusar e por quê
        observacoes?: string;
      };
      // Preparação do réu para plenário
      preparacaoReu?: {
        orientacaoComportamento?: string; // postura, vestimenta, olhar
        orientacaoInterrogatorio?: string; // o que falar, o que evitar
        apoioFamiliarPresente?: boolean; // família na plateia?
        observacoes?: string;
      };
      // Nulidades potenciais do plenário
      nulidadesPlenario?: Array<{
        tipo: string; // "excesso de linguagem na pronúncia lida" | "menção à prisão" | "testemunha não intimada"
        momento: string; // "antes" | "durante" | "após"
        consequencia: string; // "nulidade absoluta" | "dissolução do conselho"
        observacoes?: string;
      }>;
      observacoes?: string;
    };


    // ---- STATUS DE LIBERDADE NO JÚRI ----
    liberdadeJuri?: {
      preso?: boolean;
      tempoPreso?: string; // "2 anos 3 meses"
      diasPreso?: number;
      unidade?: string;
      fundamentoPrisao?: string; // "preventiva -- garantia da ordem pública"
      hcImpetrado?: boolean;
      resultadoHc?: string;
      excecaoPrazo?: boolean; // excesso de prazo?
      diasDesdeUltimoAto?: number;
      argumentoLiberdade?: string; // melhor argumento para soltar
      observacoes?: string;
    };

    // ==========================================
    // TIER 6.1 -- ATRIBUIÇÃO: JÚRI (mantido para compatibilidade)
    // ==========================================
      materialidade?: { status: string; observacoes?: string };
      autoria?: { status: string; observacoes?: string };
      qualificadoras?: Array<{ nome: string; fundamentacao: string; estrategia?: string }>;
      observacoes?: string;
    
}
