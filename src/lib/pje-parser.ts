export interface IntimacaoPJeSimples {
  assistido: string;
  dataExpedicao: string;
  numeroProcesso: string;
  idDocumento?: string; // ID único do documento PJe (ex: "62096897" de "Intimação (62096897)")
  tipoDocumento?: string; // Tipo de documento (ex: "Intimação", "Sentença", "Decisão")
  prazo?: number; // Prazo em dias extraído do PJe
  tipoProcesso?: string; // MPUMPCrim, APOrd, APSum, PetCrim, etc.
  crime?: string; // Maus Tratos, Ameaça, Contra a Mulher, etc.
  vara?: string; // Vara de Violência Doméstica, Vara do Júri, etc.
  atribuicaoDetectada?: string; // Atribuição detectada automaticamente
  camposNaoExtraidos?: string[]; // Lista de campos que precisam ser preenchidos manualmente
  isMPU?: boolean; // Se é processo de Medida Protetiva de Urgência (MPUMPCrim)
  ordemOriginal?: number; // Posição original na lista do PJe (para ordenação por "recentes")
}

export interface ResultadoParser {
  intimacoes: IntimacaoPJeSimples[];
  atribuicaoDetectada: string | null;
  varaDetectada: string | null;
}

// Resultado separado para VVD - separa MPUs das demais
export interface ResultadoParserVVD extends ResultadoParser {
  intimacoesMPU: IntimacaoPJeSimples[]; // Vão para página especial de MPUs
  intimacoesGerais: IntimacaoPJeSimples[]; // Vão para demandas gerais com atribuição VVD
}

// ============================================================================
// NOISE DETECTION — Filtragem de linhas de ruído do PJe (UI, navegação, etc.)
// ============================================================================

/** Frases exatas (lowercase) que, se a linha começar com elas, indicam ruído */
const NOISE_PREFIXES: string[] = [
  'último movimento:',
  'data limite prevista',
  'você tomou ciência',
  'o sistema registrou',
  'selecione',
  'pendentes de ciência',
  'ciência dada',
  'apenas pendentes',
  'cujo prazo',
  'sem prazo',
  'respondidos',
  'ícone de',
  // UI buttons & menu items
  'peticionar',
  'novo processo',
  'consulta',
  'configuração',
  'download',
  'painel do defensor',
  'caixa de entrada',
  'expedientes',
  'filtrar',
  'limpar',
  'buscar',
  'atualizar',
  'anterior',
  'próximo',
  'próxima',
  'medidas protetivas',
  'exibir todos',
  'ocultar',
  'mostrar mais',
  'carregando',
  'nenhum resultado',
  'ordenar por',
  'classificar',
  'todos os expedientes',
  'meus expedientes',
  'recebidos',
  'enviados',
  'arquivados',
  'em andamento',
  // Days of the week
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
  'domingo',
  // Short day names
  'seg,',
  'ter,',
  'qua,',
  'qui,',
  'sex,',
  'sáb,',
  'dom,',
  // VVD-specific checkbox/tag labels
  'doença terminal',
  'réu preso',
  'criança e adolescente',
  'pessoa em situação de rua',
  'pessoa com deficiência',
  'apenas pendentes de ciência',
  // Location / vara labels that appear as standalone lines
  'violência doméstica',
  // PJe panel navigation
  'página ',
  'ir para',
  'voltar ao topo',
  'início',
  'detalhes do processo',
  'autos digitais',
  'movimentações',
];

/** Regex patterns that cannot be expressed as simple startsWith checks */
const regexRuidoExtra = /^(\d+ resultados?|«|»|‹|›|\d+ª?\s*(Vara|V\s)|Idoso$|total:?\s*\d|mostrando\s+\d|de\s+\d+\s+a\s+\d+)/i;

/**
 * Determines if a line is UI noise that should be skipped.
 * Uses startsWith semantics for the Set (not includes) to avoid
 * false-positives on names like "Pessoa da Silva".
 *
 * IMPORTANT: Lines containing valid expedition data (dates in parentheses)
 * are NEVER filtered, even if they start with a noise prefix like "Expedição".
 */
function isNoiseLine(linha: string): boolean {
  // NEVER filter lines containing expedition data (dates in parentheses)
  // "Expedição eletrônica (06/02/2026 11:00)" is valid data, not noise
  if (/\(\d{2}\/\d{2}\/\d{4}/.test(linha)) return false;

  // NEVER filter lines containing document IDs like "Intimação (62889857)"
  if (/(?:Intimação|Sentença|Decisão|Despacho|Certidão|Ato Ordinatório|Termo|Edital)\s*\(\d+\)/i.test(linha)) return false;

  const lower = linha.toLowerCase();
  for (let k = 0; k < NOISE_PREFIXES.length; k++) {
    if (lower.startsWith(NOISE_PREFIXES[k])) return true;
  }
  if (regexRuidoExtra.test(linha)) return true;
  // Pure pagination number (1, 2, 3 ... 999) — but NOT process-related
  if (/^\d{1,3}$/.test(linha)) return true;
  // Pagination block like "« 1 2 3 4 5 6 7 8 9 10 11 »"
  if (/^[«»‹›\d\s]+$/.test(linha) && linha.length < 40) return true;
  // Standalone "Expedição" or "Expedições" navigation label (without date data)
  if (/^expedição$|^expedições$/i.test(linha.trim())) return true;
  return false;
}

// Função para converter nomes para Title Case mantendo preposições em minúsculo
function toTitleCase(nome: string): string {
  const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os'];

  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      // Primeira palavra sempre maiúscula, mesmo que seja preposição
      if (index === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }

      // Preposições ficam em minúsculo
      if (preposicoes.includes(palavra)) {
        return palavra;
      }

      // Outras palavras com primeira letra maiúscula
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
}

/**
 * Detecta automaticamente a atribuição baseado no texto
 */
export function detectarAtribuicao(texto: string): { atribuicao: string | null; vara: string | null } {
  const textoLower = texto.toLowerCase();

  // Detecção baseada em padrões de VARA (mais específico, evita falsos positivos)
  // A ordem importa: padrões mais específicos primeiro

  // Júri (checar ANTES de Execução e VVD, pois "Júri e Execuções" contém "execuções")
  if (textoLower.includes('vara do júri') || textoLower.includes('vara do juri') ||
      textoLower.includes('júri e execuções') || textoLower.includes('juri e execucoes') ||
      textoLower.includes('tribunal do júri') || textoLower.includes('tribunal do juri')) {
    return { atribuicao: 'Tribunal do Júri', vara: 'Vara do Júri' };
  }

  // Violência Doméstica — buscar por padrão de VARA, não texto genérico
  // "vara de violência" ou "vara da violência" ou "vara vvd" ou "juizado de violência"
  if (textoLower.includes('vara de violência') || textoLower.includes('vara de violencia') ||
      textoLower.includes('vara da violência') || textoLower.includes('vara da violencia') ||
      textoLower.includes('juizado de violência') || textoLower.includes('juizado de violencia') ||
      /\/vara\s+.*viol[eê]ncia/i.test(texto) ||
      /\/\d+ª?\s*v[.]?\s*.*viol[eê]ncia/i.test(texto)) {
    return { atribuicao: 'Violência Doméstica', vara: 'Vara de Violência Doméstica' };
  }

  // Execução Penal
  if (textoLower.includes('execuções penais') || textoLower.includes('execucoes penais') ||
      textoLower.includes('vara de execução') || textoLower.includes('vara de execucao') ||
      textoLower.includes('vep')) {
    return { atribuicao: 'Execução Penal', vara: 'Vara de Execuções Penais' };
  }

  // Criminal (varas criminais genéricas)
  if (textoLower.includes('vara criminal') || /\d+ª?\s*vara\s+criminal/i.test(texto)) {
    return { atribuicao: 'Substituição Criminal', vara: 'Vara Criminal' };
  }

  // Infância e Juventude
  if (textoLower.includes('vara da infância') || textoLower.includes('vara da infancia') ||
      textoLower.includes('vara de infância') || textoLower.includes('vara de infancia') ||
      textoLower.includes('infracional')) {
    return { atribuicao: 'Infância', vara: 'Vara da Infância e Juventude' };
  }

  // Família
  if (textoLower.includes('vara de família') || textoLower.includes('vara de familia') ||
      textoLower.includes('vara da família') || textoLower.includes('vara da familia')) {
    return { atribuicao: 'Família', vara: 'Vara de Família' };
  }

  // Cível
  if (textoLower.includes('vara cível') || textoLower.includes('vara civel')) {
    return { atribuicao: 'Cível', vara: 'Vara Cível' };
  }

  // Fazenda Pública
  if (textoLower.includes('fazenda pública') || textoLower.includes('fazenda publica')) {
    return { atribuicao: 'Fazenda Pública', vara: 'Vara da Fazenda Pública' };
  }

  return { atribuicao: null, vara: null };
}

/**
 * Parser principal - extrai intimações do texto copiado do PJe
 * Suporta múltiplos formatos: Júri, Criminal, Violência Doméstica, etc.
 */
export function parsePJeIntimacoes(texto: string): IntimacaoPJeSimples[] {
  const resultado = parsePJeIntimacoesCompleto(texto);
  return resultado.intimacoes;
}

/**
 * Parser completo que retorna intimações e metadados
 */
export function parsePJeIntimacoesCompleto(texto: string): ResultadoParser {
  const intimacoes: IntimacaoPJeSimples[] = [];
  const processados = new Set<string>(); // Para evitar duplicatas
  let contadorOrdem = 0; // Contador para preservar ordem original do PJe

  // Detectar atribuição automaticamente
  const { atribuicao: atribuicaoDetectada, vara: varaDetectada } = detectarAtribuicao(texto);

  // ── Pre-processing: limpar texto do Painel do Defensor ──
  // 1. Remover blocos de paginação (« 1 2 3 ... 11 »)
  // 2. Remover linhas duplicadas consecutivas
  // 3. Normalizar whitespace excessivo
  let textoLimpo = texto
    // Remove pagination blocks (« 1 2 ... N ») on single lines
    .replace(/^[«»‹›\s\d]+$/gm, '')
    // Remove header patterns like "108 resultados encontrados"
    .replace(/^\d+\s+resultados?\s+encontrados?.*$/gim, '')
    // Remove "Mostrando X de Y" patterns
    .replace(/^mostrando\s+\d+.*$/gim, '')
    // Remove "De X a Y" pagination info
    .replace(/^de\s+\d+\s+a\s+\d+.*$/gim, '')
    // Collapse multiple consecutive blank lines into one
    .replace(/\n{3,}/g, '\n\n');

  // Dividir texto em linhas e pré-filtrar ruído grosso (paginação, navegação)
  const linhasRaw = textoLimpo.split('\n').map(l => l.trim()).filter(l => l);
  const linhas = linhasRaw.filter(l => !isNoiseLine(l));

  // Regex para número de processo CNJ
  const regexProcesso = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;

  // Regex para data de expedição (com horário opcional)
  // Ex: "Expedição eletrônica (06/02/2026 11:00)" ou "Expedição eletrônica (06/02/2026)"
  const regexExpedicao = /Expedição eletrônica\s*\((\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\)/i;

  // Regex para prazo
  const regexPrazo = /Prazo:\s*(\d+)\s*dias?/i;

  // Regex para ID de documento (intimação, sentença, decisão, despacho, certidão, ato ordinatório, termo, edital)
  const regexDocumento = /(?:Intimação|Sentença|Decisão|Despacho|Certidão|Ato Ordinatório|Termo|Edital)\s*\((\d+)\)/i;

  // Regex para tipo de processo e crime
  // Ex: "MPUMPCrim 8005252-02.2026.8.05.0039 Maus Tratos"
  // Ex: "APOrd 8011331-31.2025.8.05.0039 Ameaça"
  // Ex: "APri 8236693-68.2025.8.05.0001 Contra a Mulher"
  const regexTipoProcessoCrime = /^(MPUMPCrim|APOrd|APSum|APri|PetCrim|AuPrFl|Juri|InsanAc|LibProv|EP|VD|APFD)\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s*(.*)?$/i;

  // Regex para partes do processo (VÍTIMA X RÉU)
  // Captura o nome após o "X" que é o RÉU (nosso assistido)
  const regexPartes = /^(.+?)\s+X\s+(.+)$/i;

  // Regex para detectar nome do intimado que aparece ANTES do tipo de documento
  // No PJe, o formato é: "NOME_ASSISTIDO\nTipo Documento (ID)\nExpedição..."
  const regexNomeAssistidoSolo = /^([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇa-zàáâãéêíóôõúç\s]+)$/;

  let intimacaoAtual: Partial<IntimacaoPJeSimples> = {};
  let idDocumentoAtual = '';
  let tipoDocumentoAtual = '';
  let nomeIntimadoAtual = ''; // Nome que aparece acima do tipo de documento

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Detectar nome do intimado que aparece antes do tipo de documento
    // No PJe Júri, o formato é:
    // JOAO VICTOR MOURA RAMOS          ← nome do intimado
    // Ato Ordinatório (63261696)        ← tipo de documento
    // Expedição eletrônica (19/02/2026) ← data
    // O nome aparece em linha solo, geralmente em maiúsculas ou com acentos
    // Verificar se a próxima linha é um tipo de documento
    if (i + 1 < linhas.length) {
      const proximaLinha = linhas[i + 1];
      if (regexDocumento.test(proximaLinha)) {
        // Esta linha pode ser o nome do intimado
        const nomeCandidato = linha.trim();
        // Validar que parece um nome de pessoa (mixed-case or ALL CAPS accepted)
        if (nomeCandidato.length > 3 &&
            nomeCandidato.length < 80 &&
            !nomeCandidato.match(/\d{7}-/) &&
            !nomeCandidato.match(/\d{2}\/\d{2}\/\d{4}/) &&
            !nomeCandidato.startsWith('/') &&
            !nomeCandidato.match(/^(Juri|InsanAc|LibProv|PetCrim|EP|VD|MPUMPCrim|APOrd|APSum|APri|AuPrFl|APFD)\s/i) &&
            !nomeCandidato.match(/^(Expedição|Diário|Prazo|Conclusos|Juntada|Mandado)/i) &&
            !isNoiseLine(nomeCandidato) &&
            nomeCandidato.split(' ').length >= 2) {
          nomeIntimadoAtual = nomeCandidato;
          continue;
        }
      }
    }

    // Extrair ID e tipo de documento (ex: "Intimação (62889857)", "Ato Ordinatório (63261696)")
    const matchDocumento = linha.match(regexDocumento);
    if (matchDocumento) {
      // Se já temos um documento pendente com dados completos, salvar antes de resetar
      if (intimacaoAtual.assistido && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
        const chaveUnica = `${intimacaoAtual.numeroProcesso}-${(intimacaoAtual.dataExpedicao || '').split(' ')[0]}`;
        if (!processados.has(chaveUnica)) {
          processados.add(chaveUnica);
          const camposNaoExtraidos: string[] = [];
          if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
          if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');
          const isMPU = intimacaoAtual.tipoProcesso?.toUpperCase() === 'MPUMPCRIM';
          intimacoes.push({
            assistido: intimacaoAtual.assistido,
            dataExpedicao: intimacaoAtual.dataExpedicao,
            numeroProcesso: intimacaoAtual.numeroProcesso,
            idDocumento: idDocumentoAtual || undefined,
            tipoDocumento: tipoDocumentoAtual || 'Intimação',
            prazo: intimacaoAtual.prazo,
            tipoProcesso: intimacaoAtual.tipoProcesso,
            crime: intimacaoAtual.crime,
            vara: intimacaoAtual.vara || varaDetectada || undefined,
            atribuicaoDetectada: atribuicaoDetectada || undefined,
            camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
            isMPU,
            ordemOriginal: contadorOrdem++,
          });
        }
        intimacaoAtual = {};
      }

      idDocumentoAtual = matchDocumento[1];
      tipoDocumentoAtual = linha.split('(')[0].trim();
      continue;
    }

    // Extrair data de expedição (com horário se disponível)
    // Também capturar "Diário Eletrônico" e "Edital" como formas de expedição
    const matchExpedicao = linha.match(regexExpedicao) ||
                           linha.match(/Diário Eletrônico\s*\((\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\)/i) ||
                           linha.match(/Edital\s*\((\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\)/i);
    if (matchExpedicao && !intimacaoAtual.dataExpedicao) {
      // Se tiver horário, incluir no formato "DD/MM/YYYY HH:mm"
      intimacaoAtual.dataExpedicao = matchExpedicao[2]
        ? `${matchExpedicao[1]} ${matchExpedicao[2]}`
        : matchExpedicao[1];
      continue;
    }

    // Extrair prazo (apenas se ainda não temos)
    if (!intimacaoAtual.prazo) {
      const matchPrazo = linha.match(regexPrazo);
      if (matchPrazo) {
        intimacaoAtual.prazo = parseInt(matchPrazo[1], 10);
        continue;
      }
    }

    // Extrair tipo de processo, número e crime
    const matchTipoProcesso = linha.match(regexTipoProcessoCrime);
    if (matchTipoProcesso) {
      intimacaoAtual.tipoProcesso = matchTipoProcesso[1];
      intimacaoAtual.numeroProcesso = matchTipoProcesso[2];
      intimacaoAtual.crime = matchTipoProcesso[3]?.trim() || '';

      // Se o crime ficou vazio, verificar a próxima linha (no Júri o crime pode estar na linha seguinte)
      if (!intimacaoAtual.crime && i + 1 < linhas.length) {
        const proximaLinha = linhas[i + 1].trim();
        // Verificar se a próxima linha parece ser um tipo de crime (não é uma linha de dados do parser)
        if (proximaLinha &&
            !regexProcesso.test(proximaLinha) &&
            !regexExpedicao.test(proximaLinha) &&
            !regexPrazo.test(proximaLinha) &&
            !regexDocumento.test(proximaLinha) &&
            !regexPartes.test(proximaLinha) &&
            !proximaLinha.startsWith('/') &&
            !isNoiseLine(proximaLinha) &&
            !proximaLinha.match(/^(MPUMPCrim|APOrd|APSum|APri|PetCrim|AuPrFl|Juri|InsanAc|LibProv|EP|VD|APFD)\s/i) &&
            proximaLinha.length > 3 &&
            proximaLinha.length < 60) {
          intimacaoAtual.crime = proximaLinha;
          i++; // Pular a próxima linha já consumida
        }
      }
      continue;
    }

    // Extrair apenas número do processo (caso não tenha tipo)
    if (!intimacaoAtual.numeroProcesso) {
      const matchProcesso = linha.match(regexProcesso);
      if (matchProcesso) {
        intimacaoAtual.numeroProcesso = matchProcesso[1];
        continue;
      }
    }

    // Extrair partes (AUTOR X RÉU) - determinar quem é o assistido
    const matchPartes = linha.match(regexPartes);
    if (matchPartes) {
      const ladoEsquerdo = matchPartes[1].trim();
      const ladoDireito = matchPartes[2].trim();

      // Determinar quem é o assistido baseado no contexto
      // Padrões possíveis:
      // 1. "Ministério Público X FULANO" → assistido é FULANO (direito)
      // 2. "4ª DH CAMAÇARI X FULANO" → assistido é FULANO (direito)
      // 3. "Coordenação de Polícia X FULANO" → assistido é FULANO (direito)
      // 4. "FULANO X MINISTERIO PUBLICO" → assistido é FULANO (esquerdo) - em LibProv
      // 5. "FULANO X Ministério Público" → assistido é FULANO (esquerdo)
      // 6. "DEFENSORIA PUBLICA X MP" → sem assistido individual, pular
      // 7. "FULANO X FULANO" (InsanAc - mesma pessoa) → assistido é qualquer um

      const ehMPouAutoridade = (nome: string): boolean => {
        const nomeUpper = nome.toUpperCase();
        return nomeUpper.includes('MINISTÉRIO PÚBLICO') ||
               nomeUpper.includes('MINISTERIO PUBLICO') ||
               nomeUpper.includes('MINISTÉRIO PUBLICO') ||
               nomeUpper.includes('MINISTERIO PÚBLICO') ||
               /^\d+[ªº]?\s*DH\s/i.test(nome) ||
               nomeUpper.includes('COORDENAÇÃO DE POLÍCIA') ||
               nomeUpper.includes('COORDENACAO DE POLICIA') ||
               nomeUpper.includes('DEFENSORIA PUB') ||
               nomeUpper.includes('ESTADO DA BAHIA');
      };

      // PRIORIDADE: O nome que aparece acima do tipo de documento no PJe
      // é o nome da pessoa que está sendo intimada (o assistido real).
      // A linha "X" mostra as partes do processo, que pode ser um corréu diferente.
      // Ex: "CLEYDSON MANOEL BOMFIM PEREIRA" (intimado acima do doc)
      //     "MP X PAULO HENRIQUE SILVA DE JESUS e outros (1)" (réu principal)
      // Neste caso, CLEYDSON é o assistido, não PAULO HENRIQUE.

      let nomeAssistidoDaLinhaX = '';

      if (ehMPouAutoridade(ladoEsquerdo) && !ehMPouAutoridade(ladoDireito)) {
        // Caso 1-3: MP/DH/Coord X RÉU → réu é direito
        nomeAssistidoDaLinhaX = ladoDireito;
      } else if (!ehMPouAutoridade(ladoEsquerdo) && ehMPouAutoridade(ladoDireito)) {
        // Caso 4-5: RÉU X MP → réu é esquerdo (LibProv, etc.)
        nomeAssistidoDaLinhaX = ladoEsquerdo;
      } else if (!ehMPouAutoridade(ladoEsquerdo) && !ehMPouAutoridade(ladoDireito)) {
        // Caso 7: Ambos são nomes de pessoas (ex: InsanAc) → usar esquerdo
        nomeAssistidoDaLinhaX = ladoEsquerdo;
      } else {
        // Caso 6: Ambos são autoridades (Defensoria X MP)
        nomeAssistidoDaLinhaX = '';
      }

      // Usar nomeIntimadoAtual (nome acima do tipo de documento) como preferência
      // porque é o nome da pessoa que está sendo efetivamente intimada.
      // EXCETO se o nome é uma autoridade (Defensoria, etc.) - nesse caso usar a linha X
      let nomeAssistido = '';
      if (nomeIntimadoAtual && !ehMPouAutoridade(nomeIntimadoAtual)) {
        nomeAssistido = nomeIntimadoAtual;
      } else if (nomeAssistidoDaLinhaX) {
        nomeAssistido = nomeAssistidoDaLinhaX;
      } else if (nomeIntimadoAtual) {
        // Último recurso: usar o nome da autoridade se não há outra opção
        nomeAssistido = nomeIntimadoAtual;
      } else {
        continue;
      }

      // Remover "e outros (N)" do final se existir
      nomeAssistido = nomeAssistido.replace(/\s+e\s+outros\s*\(\d+\)\s*$/i, '').trim();

      // Converter para Title Case
      intimacaoAtual.assistido = toTitleCase(nomeAssistido);

      // Salvar a intimação se tivermos dados mínimos (assistido + processo + data)
      if (intimacaoAtual.assistido && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
        // Criar chave única para evitar duplicatas (inclui idDocumento para diferenciar)
        const chaveUnica = `${intimacaoAtual.numeroProcesso}-${(intimacaoAtual.dataExpedicao || '').split(' ')[0]}`;

        if (!processados.has(chaveUnica)) {
          processados.add(chaveUnica);

          // Identificar campos que não foram extraídos
          const camposNaoExtraidos: string[] = [];
          if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
          if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');

          // Verificar se é MPU (Medida Protetiva de Urgência)
          const isMPU = intimacaoAtual.tipoProcesso?.toUpperCase() === 'MPUMPCRIM';

          intimacoes.push({
            assistido: intimacaoAtual.assistido,
            dataExpedicao: intimacaoAtual.dataExpedicao,
            numeroProcesso: intimacaoAtual.numeroProcesso,
            idDocumento: idDocumentoAtual || undefined,
            tipoDocumento: tipoDocumentoAtual || 'Intimação',
            prazo: intimacaoAtual.prazo,
            tipoProcesso: intimacaoAtual.tipoProcesso,
            crime: intimacaoAtual.crime,
            vara: intimacaoAtual.vara || varaDetectada || undefined,
            atribuicaoDetectada: atribuicaoDetectada || undefined,
            camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
            isMPU,
            ordemOriginal: contadorOrdem++,
          });
        }

        // Resetar para próxima intimação
        intimacaoAtual = {};
        idDocumentoAtual = '';
        tipoDocumentoAtual = '';
        nomeIntimadoAtual = '';
      }
      continue;
    }

    // Detectar linha da vara (para contexto) - /VARA DE, /VARA DO, /VARA DA, etc.
    if (/^\/VARA\s/i.test(linha) || /^\/\d+[ªº]?\s*V/i.test(linha)) {
      intimacaoAtual.vara = linha.replace(/^\//, '').trim();

      // Se temos dados suficientes mas não encontramos "X" (ex: intimação à Defensoria),
      // usar o nomeIntimadoAtual como assistido e salvar
      if (!intimacaoAtual.assistido && nomeIntimadoAtual && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
        intimacaoAtual.assistido = toTitleCase(nomeIntimadoAtual);

        const chaveUnica = `${intimacaoAtual.numeroProcesso}-${(intimacaoAtual.dataExpedicao || '').split(' ')[0]}`;
        if (!processados.has(chaveUnica)) {
          processados.add(chaveUnica);
          const camposNaoExtraidos: string[] = [];
          if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
          if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');
          const isMPU = intimacaoAtual.tipoProcesso?.toUpperCase() === 'MPUMPCRIM';
          intimacoes.push({
            assistido: intimacaoAtual.assistido,
            dataExpedicao: intimacaoAtual.dataExpedicao,
            numeroProcesso: intimacaoAtual.numeroProcesso,
            idDocumento: idDocumentoAtual || undefined,
            tipoDocumento: tipoDocumentoAtual || 'Intimação',
            prazo: intimacaoAtual.prazo,
            tipoProcesso: intimacaoAtual.tipoProcesso,
            crime: intimacaoAtual.crime,
            vara: intimacaoAtual.vara || varaDetectada || undefined,
            atribuicaoDetectada: atribuicaoDetectada || undefined,
            camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
            isMPU,
            ordemOriginal: contadorOrdem++,
          });
        }
        intimacaoAtual = {};
        idDocumentoAtual = '';
        tipoDocumentoAtual = '';
        nomeIntimadoAtual = '';
      }
      continue;
    }
  }

  // Se sobrou alguma intimação parcial com dados mínimos, tentar salvar
  // Usar nomeIntimadoAtual como fallback se não tiver assistido
  if (!intimacaoAtual.assistido && nomeIntimadoAtual) {
    intimacaoAtual.assistido = toTitleCase(nomeIntimadoAtual);
  }
  if (intimacaoAtual.assistido && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
    const chaveUnica = `${intimacaoAtual.numeroProcesso}-${(intimacaoAtual.dataExpedicao || '').split(' ')[0]}`;

    if (!processados.has(chaveUnica)) {
      const camposNaoExtraidos: string[] = [];
      if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
      if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');

      const isMPU = intimacaoAtual.tipoProcesso?.toUpperCase() === 'MPUMPCRIM';

      intimacoes.push({
        assistido: intimacaoAtual.assistido,
        dataExpedicao: intimacaoAtual.dataExpedicao,
        numeroProcesso: intimacaoAtual.numeroProcesso,
        idDocumento: idDocumentoAtual || undefined,
        tipoDocumento: tipoDocumentoAtual || 'Intimação',
        prazo: intimacaoAtual.prazo,
        tipoProcesso: intimacaoAtual.tipoProcesso,
        crime: intimacaoAtual.crime,
        vara: intimacaoAtual.vara || varaDetectada || undefined,
        atribuicaoDetectada: atribuicaoDetectada || undefined,
        camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
        isMPU,
        ordemOriginal: contadorOrdem++,
      });
    }
  }

  // ── Post-processing: dedup expanded/collapsed copies ──
  // PJe shows each expediente twice (collapsed summary + expanded detail).
  // Keep the copy with more filled fields.
  // Normalize date in dedup key (strip time portion) so "06/02/2026" and "06/02/2026 11:00" match.
  const dedupSeen = new Map<string, IntimacaoPJeSimples>();
  const normalizeDate = (d: string) => d?.split(' ')[0] || d; // "06/02/2026 11:00" → "06/02/2026"
  for (const int of intimacoes) {
    // Primary key: processo + date (without time)
    const keyByDate = `${int.numeroProcesso}-${normalizeDate(int.dataExpedicao)}`;
    // Secondary key: processo + assistido (catches same person, same process, different dates from collapsed/expanded)
    const keyByAssistido = `${int.numeroProcesso}-${int.assistido?.toLowerCase().trim()}`;

    const existing = dedupSeen.get(keyByDate) || dedupSeen.get(keyByAssistido);
    const existingKey = dedupSeen.has(keyByDate) ? keyByDate : dedupSeen.has(keyByAssistido) ? keyByAssistido : null;

    if (!existing) {
      dedupSeen.set(keyByDate, int);
      dedupSeen.set(keyByAssistido, int);
    } else {
      const countFields = (i: IntimacaoPJeSimples) =>
        [i.crime, i.tipoProcesso, i.prazo, i.tipoDocumento, i.idDocumento, i.vara, i.assistido]
          .filter(Boolean).length;
      if (countFields(int) > countFields(existing)) {
        // Replace with richer version
        dedupSeen.set(keyByDate, int);
        dedupSeen.set(keyByAssistido, int);
      }
    }
  }
  // Collect unique intimacoes (Map values may have duplicates due to dual-keying)
  const seenIds = new Set<string>();
  const dedupedIntimacoes: IntimacaoPJeSimples[] = [];
  for (const int of dedupSeen.values()) {
    const uid = `${int.numeroProcesso}-${normalizeDate(int.dataExpedicao)}-${int.assistido}`;
    if (!seenIds.has(uid)) {
      seenIds.add(uid);
      dedupedIntimacoes.push(int);
    }
  }
  // Preserve original order from PJe
  dedupedIntimacoes.sort((a, b) => (a.ordemOriginal ?? 0) - (b.ordemOriginal ?? 0));

  // Se não encontrou nenhuma intimação com o parser de partes, tentar parser antigo para Júri
  if (dedupedIntimacoes.length === 0) {
    return {
      intimacoes: parsePJeIntimacoesLegado(texto),
      atribuicaoDetectada,
      varaDetectada
    };
  }

  return {
    intimacoes: dedupedIntimacoes,
    atribuicaoDetectada,
    varaDetectada,
  };
}

/**
 * Parser legado para formatos antigos (Júri, etc.)
 * Mantido para compatibilidade
 */
function parsePJeIntimacoesLegado(texto: string): IntimacaoPJeSimples[] {
  const intimacoes: IntimacaoPJeSimples[] = [];
  const linhasRaw = texto.split('\n').map(l => l.trim()).filter(l => l);
  // Pre-filter noise lines using the same isNoiseLine() used by the main parser
  const linhas = linhasRaw.filter(l => !isNoiseLine(l));

  let assistidoAtual = '';
  let dataExpedicaoAtual = '';
  let numeroProcessoAtual = '';
  let idDocumentoAtual = '';
  let tipoDocumentoAtual = '';

  // Lista de palavras que NÃO são nomes de assistidos
  const palavrasExcluidas = [
    'ministério público', 'ministério publico', 'mp', 'vara', 'comarca',
    'tribunal', 'justiça', 'sentença', 'decisão', 'despacho', 'certidão',
    'intimação', 'expedição', 'prazo', 'data limite', 'defensor', 'defensoria',
    'último movimento', 'conclusos', 'juntada', 'mandado', 'edital',
    'publicado', 'decorrido', 'termo de sessão', 'ato ordinatório',
    'pendentes de ciência', 'ciência dada', 'sem prazo', 'respondidos',
    'camaçari', 'candeias', 'salvador', 'lauro de freitas', 'ilhéus',
    'caixa de entrada', 'resultados encontrados', 'expedientes',
    'diário eletrônico', 'coordenação de polícia', 'estado da bahia',
    'homicídio', 'prisão preventiva', 'competência', 'tráfico',
    'liberdade provisória', 'você tomou ciência', 'o sistema registrou',
    'data limite prevista', 'peticionar', 'novo processo', 'consulta',
    'configuração', 'download', 'painel do defensor', 'selecione',
    'doença terminal', 'idoso', 'réu preso', 'criança e adolescente',
    'pessoa em situação de rua', 'pessoa com deficiência', 'violência doméstica',
    'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira',
    'sábado', 'domingo',
  ];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Detectar nome do assistido (nome em MAIÚSCULAS)
    const ehTodoMaiusculo = linha === linha.toUpperCase();
    const temMaiusculaInicial = linha.charAt(0) === linha.charAt(0).toUpperCase();

    const contemPalavraExcluida = palavrasExcluidas.some(palavra =>
      linha.toLowerCase().includes(palavra)
    );

    const ehNome = ehTodoMaiusculo &&
                   !linha.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/) &&
                   !linha.match(/\d{2}\/\d{2}\/\d{4}/) &&
                   !linha.includes('(') &&
                   !contemPalavraExcluida &&
                   !linha.startsWith('/') &&
                   !linha.startsWith('X ') &&
                   !linha.match(/^(Juri|InsanAc|LibProv|PetCrim|EP|VD|MPUMPCrim|APOrd|APSum|APri|AuPrFl|APFD)\s/i) &&
                   linha.length > 5 &&
                   linha.length < 80 &&
                   !linha.match(/^\d/) &&
                   linha.split(' ').length >= 2 &&
                   linha.split(' ').length <= 10;

    if (ehNome) {
      // Salvar registro anterior se completo
      if (assistidoAtual && numeroProcessoAtual && dataExpedicaoAtual) {
        const jaExiste = intimacoes.some(
          int => int.assistido === assistidoAtual &&
                 int.numeroProcesso === numeroProcessoAtual &&
                 int.dataExpedicao === dataExpedicaoAtual
        );

        if (!jaExiste) {
          intimacoes.push({
            assistido: assistidoAtual,
            dataExpedicao: dataExpedicaoAtual,
            numeroProcesso: numeroProcessoAtual,
            idDocumento: idDocumentoAtual,
            tipoDocumento: tipoDocumentoAtual,
          });
        }
      }

      assistidoAtual = toTitleCase(linha);
      dataExpedicaoAtual = '';
      numeroProcessoAtual = '';
      idDocumentoAtual = '';
      tipoDocumentoAtual = '';
      continue;
    }

    // Extrair data de expedição (com horário se disponível)
    const expedicaoMatch = linha.match(/(?:Expedição eletrônica|Diário Eletrônico|Edital)\s*\((\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}))?\)/i);
    if (expedicaoMatch && !dataExpedicaoAtual) {
      // Se tiver horário, incluir no formato "DD/MM/YYYY HH:mm"
      dataExpedicaoAtual = expedicaoMatch[2]
        ? `${expedicaoMatch[1]} ${expedicaoMatch[2]}`
        : expedicaoMatch[1];
      continue;
    }

    // Extrair número do processo
    const processoMatch = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    if (processoMatch && !numeroProcessoAtual) {
      numeroProcessoAtual = processoMatch[1];
      continue;
    }

    // Extrair ID e tipo de documento
    const documentoMatch = linha.match(/(\w+)\s*\((\d+)\)/);
    if (documentoMatch && !idDocumentoAtual) {
      tipoDocumentoAtual = documentoMatch[1];
      idDocumentoAtual = documentoMatch[2];
      continue;
    }
  }

  // Salvar último registro
  if (assistidoAtual && numeroProcessoAtual && dataExpedicaoAtual) {
    const jaExiste = intimacoes.some(
      int => int.assistido === assistidoAtual &&
             int.numeroProcesso === numeroProcessoAtual &&
             int.dataExpedicao === dataExpedicaoAtual
    );

    if (!jaExiste) {
      intimacoes.push({
        assistido: assistidoAtual,
        dataExpedicao: dataExpedicaoAtual,
        numeroProcesso: numeroProcessoAtual,
        idDocumento: idDocumentoAtual,
        tipoDocumento: tipoDocumentoAtual,
      });
    }
  }

  return intimacoes;
}

function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

function proximoDiaUtil(data: Date): Date {
  const novaData = new Date(data);
  while (!ehDiaUtil(novaData)) {
    novaData.setDate(novaData.getDate() + 1);
  }
  return novaData;
}

export function calcularPrazoDefensoria(dataExpedicao: string, diasPrazoProcessual: number): string {
  try {
    const [dia, mes, ano] = dataExpedicao.split('/').map(Number);
    const dataBase = new Date(ano, mes - 1, dia);

    // ETAPA 1: Adicionar 10 dias CORRIDOS de leitura (intimação)
    const dataAposLeitura = new Date(dataBase);
    dataAposLeitura.setDate(dataAposLeitura.getDate() + 10);

    // ETAPA 2: Ajustar para o próximo dia útil se cair em fim de semana
    const dataInicioContagem = proximoDiaUtil(dataAposLeitura);

    // ETAPA 3: Adicionar prazo EM DOBRO em dias ÚTEIS
    const diasPrazoEmDobro = diasPrazoProcessual * 2;
    let diasAdicionados = 0;
    let dataAtual = new Date(dataInicioContagem);

    while (diasAdicionados < diasPrazoEmDobro) {
      dataAtual.setDate(dataAtual.getDate() + 1);

      if (ehDiaUtil(dataAtual)) {
        diasAdicionados++;
      }
    }

    // ETAPA 4: Se terminar em dia não útil, avançar para o próximo dia útil
    const dataFinal = proximoDiaUtil(dataAtual);

    const diaFinal = String(dataFinal.getDate()).padStart(2, '0');
    const mesFinal = String(dataFinal.getMonth() + 1).padStart(2, '0');
    const anoFinal = String(dataFinal.getFullYear()).slice(-2);

    return `${diaFinal}/${mesFinal}/${anoFinal}`;
  } catch (error) {
    console.error('Erro ao calcular prazo:', error);
    return '';
  }
}

export function converterDataParaISO(dataStr: string): string {
  try {
    // Separar data e hora (formato: "DD/MM/YYYY HH:mm" ou "DD/MM/YYYY")
    const [dataParte, horaParte] = dataStr.split(' ');
    const [dia, mes, ano] = dataParte.split('/').map(Number);
    const anoCompleto = ano > 2000 ? ano : 2000 + ano;
    const dataISO = `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    // Se tiver horário, adicionar no formato ISO
    if (horaParte) {
      return `${dataISO}T${horaParte}:00`;
    }
    return dataISO;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Gera o texto de providências indicando quais campos precisam ser ajustados
 */
function gerarProvidencias(intimacao: IntimacaoPJeSimples): string {
  const camposAjustar: string[] = [];

  // Campos que sempre precisam ser verificados/ajustados após importação
  camposAjustar.push('status');
  camposAjustar.push('ato');

  // Adicionar campos não extraídos
  if (intimacao.camposNaoExtraidos && intimacao.camposNaoExtraidos.length > 0) {
    camposAjustar.push(...intimacao.camposNaoExtraidos);
  }

  // Remover duplicatas
  const camposUnicos = [...new Set(camposAjustar)];

  return `(ajustar ${camposUnicos.join(' e ')})`;
}

/**
 * Statuses do grupo "concluída" — únicos que sobrevivem à importação sem serem
 * remapeados para triagem. Todos os outros ficam em "fila" (triagem).
 */
const IMPORT_CONCLUIDA_STATUSES = new Set([
  'protocolado', 'ciencia', 'resolvido', 'constituiu_advogado', 'sem_atuacao',
]);

/**
 * Resolve o status para importação:
 * - Se for do grupo "concluída" → mantém
 * - Qualquer outro status → força "fila" (triagem)
 * Garante que demandas recém-importadas sempre entrem na triagem.
 */
export function resolveImportStatus(status: string | undefined | null): string {
  if (status && IMPORT_CONCLUIDA_STATUSES.has(status)) return status;
  return 'fila';
}

export function intimacaoToDemanda(
  intimacao: IntimacaoPJeSimples,
  atribuicao: string,
  overrides?: {
    ato?: string;
    status?: string;
    prazo?: string;
    estadoPrisional?: string;
    assistidoMatchId?: number;
    providencias?: string;
  }
): any {
  // Usar atribuição detectada se disponível e não foi especificada
  const atribuicaoFinal = atribuicao || intimacao.atribuicaoDetectada || 'Substituição Criminal';

  // Converter data para ISO (inclui horário se disponível)
  const dataISO = converterDataParaISO(intimacao.dataExpedicao);

  return {
    id: `pje-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assistido: intimacao.assistido,
    status: resolveImportStatus(overrides?.status),
    data: dataISO,
    // dataInclusao com precisão de milissegundos para ordenação precisa
    // Usa 999 - ordemOriginal para que a primeira da lista (ordem 0) tenha valor maior (999)
    // e apareça primeiro na ordenação descendente por "recentes"
    dataInclusao: intimacao.ordemOriginal !== undefined
      ? `${dataISO.split('T')[0]}T00:00:00.${String(999 - intimacao.ordemOriginal).padStart(3, '0')}`
      : new Date().toISOString(),
    prazo: overrides?.prazo || '',
    processos: [
      {
        tipo: intimacao.tipoProcesso || 'AP',
        numero: intimacao.numeroProcesso,
      }
    ],
    ato: overrides?.ato || 'Ciência',
    providencias: (overrides?.providencias !== undefined && overrides.providencias.trim() !== "")
      ? overrides.providencias
      : gerarProvidencias(intimacao),
    atribuicao: atribuicaoFinal,
    estadoPrisional: overrides?.estadoPrisional || 'Solto',
    tipoAto: 'Geral',
    ...(overrides?.assistidoMatchId && { assistidoMatchId: overrides.assistidoMatchId }),
    pjeData: {
      ...intimacao,
      dataExpedicao: intimacao.dataExpedicao,
      numeroProcesso: intimacao.numeroProcesso,
      idDocumento: intimacao.idDocumento,
      tipoDocumento: intimacao.tipoDocumento,
      prazoOriginal: intimacao.prazo,
      crime: intimacao.crime,
      vara: intimacao.vara,
      ordemOriginal: intimacao.ordemOriginal,
    },
  };
}

export function formatarResumoImportacao(intimacoes: IntimacaoPJeSimples[]): string {
  const total = intimacoes.length;

  let resumo = `✅ **${total} ${total === 1 ? 'intimação encontrada' : 'intimações encontradas'}**\n\n`;

  if (total > 0) {
    resumo += `📋 **Dados extraídos automaticamente:**\n`;
    resumo += `  • Nome do assistido (réu)\n`;
    resumo += `  • Data de expedição\n`;
    resumo += `  • Número do processo\n`;
    resumo += `  • ID do documento PJe\n`;
    resumo += `  • Prazo (quando disponível)\n`;
    resumo += `  • Tipo de crime\n\n`;
    resumo += `⚙️ **Após importar:**\n`;
    resumo += `  • Edite o ATO de cada demanda\n`;
    resumo += `  • Ajuste o STATUS conforme necessário\n`;
  }

  return resumo;
}

// ============================================================================
// SISTEMA DE DETECÇÃO DE DUPLICATAS COM DEMANDAS EXISTENTES
// ============================================================================

export interface ResultadoVerificacaoDuplicatas {
  novas: IntimacaoPJeSimples[];
  duplicadas: IntimacaoPJeSimples[];
  totalEncontradas: number;
  totalNovas: number;
  totalDuplicadas: number;
  atribuicaoDetectada?: string | null;
  varaDetectada?: string | null;
}

/**
 * Verifica se uma intimação já existe nas demandas cadastradas
 * Critério principal: processo + data de expedição
 * Isso permite múltiplas demandas do mesmo processo para diferentes intimações
 */
export function verificarDuplicatas(
  intimacoes: IntimacaoPJeSimples[],
  demandasExistentes: any[]
): ResultadoVerificacaoDuplicatas {
  const novas: IntimacaoPJeSimples[] = [];
  const duplicadas: IntimacaoPJeSimples[] = [];

  // Data de corte: últimos 30 dias (para demandas sem data)
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  for (const intimacao of intimacoes) {
    const isDuplicada = demandasExistentes.some(demanda => {
      // 1. Verificar por ID do documento PJe (mais confiável)
      const idDocumentoCompativel = intimacao.idDocumento && demanda.pjeData?.idDocumento
        ? demanda.pjeData.idDocumento === intimacao.idDocumento
        : false;

      if (idDocumentoCompativel) return true;

      // 2. Verificar processo
      const processoCompativel = demanda.processos?.some((proc: any) =>
        proc.numero === intimacao.numeroProcesso
      ) || false;

      if (!processoCompativel) return false;

      // 3. Mesmo processo - verificar data de expedição
      const dataIntimacao = converterDataParaISO(intimacao.dataExpedicao);
      const dataDemanda = demanda.dataEntrada || demanda.data;

      // Se ambas têm data, comparar
      if (dataIntimacao && dataDemanda) {
        return dataIntimacao === dataDemanda;
      }

      // Se nenhuma tem data, verificar se demanda é recente (últimos 30 dias)
      if (!dataIntimacao && !dataDemanda) {
        const createdAt = demanda.createdAt ? new Date(demanda.createdAt) : null;
        if (createdAt && createdAt >= trintaDiasAtras) {
          // Verificar também nome para maior precisão
          const nomeIntimacao = normalizarNome(intimacao.assistido);
          const nomeDemanda = normalizarNome(demanda.assistido);
          return nomeIntimacao === nomeDemanda || calcularSimilaridade(nomeIntimacao, nomeDemanda) > 0.85;
        }
      }

      return false;
    });

    if (isDuplicada) {
      duplicadas.push(intimacao);
    } else {
      novas.push(intimacao);
    }
  }

  // Pegar atribuição detectada da primeira intimação
  const atribuicaoDetectada = intimacoes[0]?.atribuicaoDetectada || null;
  const varaDetectada = intimacoes[0]?.vara || null;

  return {
    novas,
    duplicadas,
    totalEncontradas: intimacoes.length,
    totalNovas: novas.length,
    totalDuplicadas: duplicadas.length,
    atribuicaoDetectada,
    varaDetectada,
  };
}

export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calcularSimilaridade(str1: string, str2: string): number {
  const comprimentoMaior = Math.max(str1.length, str2.length);
  if (comprimentoMaior === 0) return 1.0;

  const distancia = calcularDistanciaLevenshtein(str1, str2);
  return (comprimentoMaior - distancia) / comprimentoMaior;
}

function calcularDistanciaLevenshtein(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Separa intimações de VVD em duas categorias:
 * - MPU (MPUMPCrim): vão para a página especial de Medidas Protetivas
 * - Gerais (APOrd, APSum, PetCrim, etc.): vão para demandas gerais com atribuição VVD
 */
export function separarIntimacoesVVD(intimacoes: IntimacaoPJeSimples[]): ResultadoParserVVD {
  const intimacoesMPU: IntimacaoPJeSimples[] = [];
  const intimacoesGerais: IntimacaoPJeSimples[] = [];

  for (const intimacao of intimacoes) {
    // MPUMPCrim vai para página especial de MPUs
    if (intimacao.tipoProcesso?.toUpperCase() === 'MPUMPCRIM' || intimacao.isMPU) {
      intimacoesMPU.push({ ...intimacao, isMPU: true });
    } else {
      // Demais classes (APOrd, APSum, PetCrim, etc.) vão para demandas gerais
      intimacoesGerais.push({ ...intimacao, isMPU: false });
    }
  }

  return {
    intimacoes,
    intimacoesMPU,
    intimacoesGerais,
    atribuicaoDetectada: intimacoes[0]?.atribuicaoDetectada || 'Violência Doméstica',
    varaDetectada: intimacoes[0]?.vara || 'Vara de Violência Doméstica',
  };
}

/**
 * Parser completo para VVD que já separa MPUs das demais
 */
export function parsePJeIntimacoesVVD(texto: string): ResultadoParserVVD {
  const resultado = parsePJeIntimacoesCompleto(texto);
  return separarIntimacoesVVD(resultado.intimacoes);
}

export function formatarResumoComDuplicatas(resultado: ResultadoVerificacaoDuplicatas): string {
  let resumo = '';

  if (resultado.totalEncontradas === 0) {
    resumo = `⚠️ **Nenhuma intimação encontrada no texto**\n\n`;
    resumo += `Verifique se o texto foi copiado corretamente do PJe.`;
    return resumo;
  }

  resumo = `📊 **Análise de Importação**\n\n`;

  // Mostrar atribuição detectada
  if (resultado.atribuicaoDetectada) {
    resumo += `🏛️ Atribuição detectada: **${resultado.atribuicaoDetectada}**\n`;
  }
  if (resultado.varaDetectada) {
    resumo += `📍 Vara: **${resultado.varaDetectada}**\n`;
  }

  resumo += `\n🔍 Total de intimações encontradas: **${resultado.totalEncontradas}**\n`;
  resumo += `✅ Intimações novas: **${resultado.totalNovas}**\n`;

  if (resultado.totalDuplicadas > 0) {
    resumo += `⚠️ Intimações já cadastradas: **${resultado.totalDuplicadas}**\n\n`;
    resumo += `**Intimações duplicadas detectadas:**\n`;
    resultado.duplicadas.forEach((intimacao, index) => {
      resumo += `${index + 1}. ${intimacao.assistido} - ${intimacao.numeroProcesso}\n`;
    });
    resumo += `\n`;
  } else {
    resumo += `✨ Nenhuma duplicata encontrada!\n\n`;
  }

  if (resultado.totalNovas > 0) {
    resumo += `**Intimações que serão importadas:**\n`;
    resultado.novas.forEach((intimacao, index) => {
      resumo += `${index + 1}. ${intimacao.assistido}`;
      if (intimacao.crime) {
        resumo += ` (${intimacao.crime})`;
      }
      if (intimacao.idDocumento) {
        resumo += ` - ID: ${intimacao.idDocumento}`;
      }
      resumo += `\n`;
    });
  }

  return resumo;
}

// ==========================================
// PARSER SEEU - EXECUÇÃO PENAL
// ==========================================

/**
 * Interface estendida para intimações do SEEU (Execução Penal)
 */
export interface IntimacaoSEEU extends IntimacaoPJeSimples {
  seq?: number; // Número sequencial no SEEU
  classeProcessual?: string; // Execução da Pena, Execução de Medidas Alternativas
  assuntoPrincipal?: string; // Acordo de Não Persecução Penal, Pena Privativa de Liberdade, etc.
  autoridade?: string; // Estado da Bahia, MP-BA
  dataEnvio?: string; // Data de envio (primeira data)
  ultimoDia?: string; // Último dia do prazo (segunda data)
  prazoResposta?: string; // "6 dias corridos"
  preAnalise?: string; // "Livre"
  tipoManifestacao?: "manifestacao" | "ciencia" | "pendencia" | "razoes"; // Aba de origem
}

/**
 * Resultado do parser SEEU com informações específicas de execução penal
 */
export interface ResultadoParserSEEU {
  intimacoes: IntimacaoSEEU[];
  totalEncontradas: number;
  tipoManifestacao: string;
  sistema: "SEEU";
}

/**
 * Parser para intimações do SEEU (Sistema Eletrônico de Execução Unificada)
 * Extrai dados da "Mesa do Defensor" do SEEU
 * Suporta múltiplos formatos de copy/paste
 */
export function parseSEEUIntimacoes(
  texto: string,
  tipoOverride?: "ciencia" | "manifestacao"
): ResultadoParserSEEU {
  const intimacoes: IntimacaoSEEU[] = [];
  let contadorOrdem = 0;

  // Detectar tipo de manifestação (aba ativa)
  let tipoManifestacao = "manifestacao";
  if (texto.includes("Ciência (") || texto.includes("Ciência(")) {
    const matchCiencia = texto.match(/Ciência\s*\((\d+)\)/);
    if (matchCiencia) {
      tipoManifestacao = "ciencia";
    }
  }
  if (texto.includes("Manifestação (") || texto.includes("Manifestação(")) {
    const matchManifestacao = texto.match(/Manifestação\s*\((\d+)\)/);
    if (matchManifestacao) {
      tipoManifestacao = "manifestacao";
    }
  }

  // Use explicit user override when provided
  if (tipoOverride !== undefined) {
    tipoManifestacao = tipoOverride;
  }

  // MODO PRINCIPAL: Encontrar todos os processos CNJ e extrair blocos
  // Regex para processo CNJ: 7 dígitos - 2 dígitos . 4 dígitos . 1 dígito . 2 dígitos . 4 dígitos
  const regexProcessoCNJ = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
  const processosEncontrados = texto.match(regexProcessoCNJ);

  if (!processosEncontrados || processosEncontrados.length === 0) {
    return {
      intimacoes: [],
      totalEncontradas: 0,
      tipoManifestacao,
      sistema: "SEEU",
    };
  }

  // Remover duplicatas de processos
  const processosUnicos = [...new Set(processosEncontrados)];

  // Para cada processo, encontrar o bloco de texto correspondente
  for (const numeroProcesso of processosUnicos) {
    // Encontrar a posição do processo no texto
    const posicaoProcesso = texto.indexOf(numeroProcesso);
    if (posicaoProcesso === -1) continue;

    // Encontrar o próximo processo para delimitar o bloco
    let fimBloco = texto.length;
    for (const outroProcesso of processosUnicos) {
      if (outroProcesso === numeroProcesso) continue;
      const posicaoOutro = texto.indexOf(outroProcesso, posicaoProcesso + numeroProcesso.length);
      if (posicaoOutro !== -1 && posicaoOutro < fimBloco) {
        fimBloco = posicaoOutro;
      }
    }

    // Extrair o bloco de texto para este processo
    // Incluir um pouco antes para pegar o Seq
    const inicioBloco = Math.max(0, posicaoProcesso - 50);
    const blocoTexto = texto.substring(inicioBloco, fimBloco);

    // Extrair dados do bloco
    const intimacao = extrairDadosBlocoSEEU(blocoTexto, numeroProcesso, tipoManifestacao, contadorOrdem++);
    if (intimacao) {
      intimacoes.push(intimacao);
    }
  }

  return {
    intimacoes,
    totalEncontradas: intimacoes.length,
    tipoManifestacao,
    sistema: "SEEU",
  };
}

/**
 * Extrai dados de um bloco de texto do SEEU
 */
function extrairDadosBlocoSEEU(
  bloco: string,
  numeroProcesso: string,
  tipoManifestacao: string,
  ordemOriginal: number
): IntimacaoSEEU | null {
  // Extrair Seq (número antes do processo)
  const matchSeq = bloco.match(/(\d{3,4})\s*[\t\n]?\s*\d{7}-/);
  const seq = matchSeq ? parseInt(matchSeq[1]) : undefined;

  // Extrair classe processual
  let classeProcessual = '';
  if (bloco.includes('Execução da Pena')) {
    classeProcessual = 'Execução da Pena';
  } else if (bloco.includes('Execução de Medidas Alternativas')) {
    classeProcessual = 'Execução de Medidas Alternativas no Juízo Comum';
  } else if (bloco.includes('Carta Precatória')) {
    classeProcessual = 'Carta Precatória Criminal';
  }

  // Extrair assunto principal
  let assuntoPrincipal = '';
  const matchAssunto = bloco.match(/\((Acordo de Não Persecução Penal|Pena Privativa de Liberdade|Pena Restritiva de Direitos|Internação)[^)]*\)/i);
  if (matchAssunto) {
    assuntoPrincipal = matchAssunto[1];
  }

  // Extrair nome do Executado/Deprecado
  let assistido = '';

  // Tentar padrão "Executado:\n NOME" ou "Deprecado:\n NOME"
  const matchExecutado = bloco.match(/(?:Executado|Deprecado):\s*\n?\s*([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+)/i);
  if (matchExecutado) {
    assistido = matchExecutado[1].trim();
  }

  // Se não encontrou, procurar nome em maiúsculas após "Executado:" na mesma área
  if (!assistido) {
    const linhas = bloco.split('\n');
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].includes('Executado:') || linhas[i].includes('Deprecado:')) {
        // Procurar nas próximas linhas por um nome em maiúsculas
        for (let j = i + 1; j < Math.min(i + 4, linhas.length); j++) {
          const linha = linhas[j].trim();
          // Verificar se é um nome (maiúsculas, pelo menos 2 palavras)
          if (linha && /^[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+$/.test(linha) && linha.split(' ').length >= 2) {
            // Filtrar termos que não são nomes
            if (!linha.includes('ESTADO') && !linha.includes('MINISTÉRIO') && !linha.includes('BAHIA')) {
              assistido = linha;
              break;
            }
          }
        }
        break;
      }
    }
  }

  // Extrair datas (formato DD/MM/YYYY)
  const matchDatas = bloco.match(/(\d{2}\/\d{2}\/\d{4})/g);
  let dataEnvio = '';
  let ultimoDia = '';
  if (matchDatas && matchDatas.length >= 1) {
    dataEnvio = matchDatas[0];
    if (matchDatas.length >= 2) {
      ultimoDia = matchDatas[1];
    }
  }

  // Tentar extrair prazo explícito — sobrescreve ultimoDia se encontrado
  // Padrões suportados: "Prazo: DD/MM/YYYY", "Data limite: DD/MM/YYYY",
  // "até DD/MM/YYYY", "vencimento: DD/MM/YYYY"
  const matchPrazoExplicito = bloco.match(
    /(?:prazo|data\s+limite|vencimento)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i
  ) || bloco.match(/até\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (matchPrazoExplicito) {
    ultimoDia = matchPrazoExplicito[1];
  }

  // Extrair prazo
  let prazo: number | undefined;
  const matchPrazo = bloco.match(/(\d+)\s*dias?\s*(corridos|úteis)?/i);
  if (matchPrazo) {
    prazo = parseInt(matchPrazo[1]);
  }

  // Validar dados mínimos
  if (!numeroProcesso || !assistido) {
    return null;
  }

  return {
    assistido: toTitleCase(assistido),
    numeroProcesso,
    dataExpedicao: dataEnvio,
    dataEnvio,
    ultimoDia,
    seq,
    classeProcessual,
    assuntoPrincipal,
    prazo,
    tipoManifestacao: tipoManifestacao as any,
    tipoDocumento: tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação',
    crime: assuntoPrincipal,
    tipoProcesso: classeProcessual || 'Execução Penal',
    atribuicaoDetectada: 'Execução Penal',
    vara: 'Vara de Execuções Penais',
    ordemOriginal,
    preAnalise: bloco.includes('Livre') ? 'Livre' : undefined,
  };
}

/**
 * Converte intimação SEEU para formato de demanda
 * Formato compatível com handleImportDemandas
 */
export function intimacaoSEEUToDemanda(intimacao: IntimacaoSEEU): any {
  // Calcular prazo baseado no último dia
  let prazoFinal: string | undefined;
  if (intimacao.ultimoDia) {
    // Converter DD/MM/YYYY para YYYY-MM-DD
    const partes = intimacao.ultimoDia.split('/');
    if (partes.length === 3) {
      prazoFinal = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }

  // Converter data de envio para formato ISO
  let dataEntrada: string | undefined;
  if (intimacao.dataEnvio) {
    const partes = intimacao.dataEnvio.split('/');
    if (partes.length === 3) {
      dataEntrada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }

  // Determinar tipo de processo baseado no assunto (ANPP, PPL, PRD)
  // EP é a atribuição, não o tipo de processo
  let tipoProcesso = 'PPL'; // Padrão: Pena Privativa de Liberdade
  if (intimacao.assuntoPrincipal) {
    if (intimacao.assuntoPrincipal.includes('Acordo de Não Persecução')) {
      tipoProcesso = 'ANPP';
    } else if (intimacao.assuntoPrincipal.includes('Pena Privativa')) {
      tipoProcesso = 'PPL';
    } else if (intimacao.assuntoPrincipal.includes('Pena Restritiva')) {
      tipoProcesso = 'PRD';
    }
  }

  // Ato: Manifestação como padrão (Ciência apenas se for aba de ciência)
  const ato = intimacao.tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação';

  // Calcular dataInclusao com precisão de milissegundos para ordenação
  // Usa 999 - ordemOriginal para que a primeira da lista (ordem 0) tenha valor maior (999)
  // e apareça primeiro na ordenação descendente por "recentes"
  let dataInclusao: string;
  if (intimacao.ordemOriginal !== undefined && dataEntrada) {
    dataInclusao = `${dataEntrada}T00:00:00.${String(999 - intimacao.ordemOriginal).padStart(3, '0')}`;
  } else {
    dataInclusao = new Date().toISOString();
  }

  // Formato compatível com handleImportDemandas que espera:
  // assistido, processos, ato, prazo, data, status, estadoPrisional, providencias, atribuicao
  return {
    id: `seeu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assistido: intimacao.assistido,
    processos: [
      {
        tipo: tipoProcesso, // ANPP, PPL ou PRD
        numero: intimacao.numeroProcesso,
      }
    ],
    data: dataEntrada,
    dataInclusao, // Para ordenação precisa preservando ordem original do SEEU
    prazo: prazoFinal,
    ato, // Manifestação ou Ciência
    atribuicao: 'EXECUCAO_PENAL',
    status: resolveImportStatus(ato === 'Ciência' ? 'ciencia' : undefined),
    estadoPrisional: 'Preso', // Padrão para execução penal
    providencias: intimacao.assuntoPrincipal
      ? `${intimacao.classeProcessual || 'Execução Penal'} - ${intimacao.assuntoPrincipal}`
      : intimacao.classeProcessual || 'Execução Penal',
    pjeData: {
      ...intimacao,
      ordemOriginal: intimacao.ordemOriginal,
    },
  };
}

/**
 * Detecta automaticamente se o texto é do SEEU
 */
export function isSEEU(texto: string): boolean {
  const indicadores = [
    'Mesa do Defensor',
    'Manifestação (',
    'Ciência (',
    'Processos Pendentes',
    'Executado:',
    'Execução da Pena',
    'seeu',
    'SEEU',
    'Pré-Análise',
    'Leitura de Prazo',
  ];

  let score = 0;
  const textoLower = texto.toLowerCase();

  for (const indicador of indicadores) {
    if (texto.includes(indicador) || textoLower.includes(indicador.toLowerCase())) {
      score++;
    }
  }

  // Se encontrou pelo menos 3 indicadores, é SEEU
  return score >= 3;
}

/**
 * Parser unificado que detecta automaticamente o sistema (PJe ou SEEU)
 */
export function parseIntimacoesUnificado(texto: string): ResultadoParser & { sistema: 'PJe' | 'SEEU' } {
  if (isSEEU(texto)) {
    const resultado = parseSEEUIntimacoes(texto);
    return {
      intimacoes: resultado.intimacoes,
      atribuicaoDetectada: 'Execução Penal',
      varaDetectada: 'Vara de Execuções Penais',
      sistema: 'SEEU',
    };
  }

  const resultado = parsePJeIntimacoesCompleto(texto);
  return {
    ...resultado,
    sistema: 'PJe',
  };
}
