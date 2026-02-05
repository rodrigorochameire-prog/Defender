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
}

export interface ResultadoParser {
  intimacoes: IntimacaoPJeSimples[];
  atribuicaoDetectada: string | null;
  varaDetectada: string | null;
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

  // Violência Doméstica
  if (textoLower.includes('violência doméstica') || textoLower.includes('violencia domestica')) {
    return { atribuicao: 'Violência Doméstica', vara: 'Vara de Violência Doméstica' };
  }

  // Júri
  if (textoLower.includes('vara do júri') || textoLower.includes('vara do juri') ||
      textoLower.includes('júri e execuções') || textoLower.includes('juri e execucoes')) {
    return { atribuicao: 'Júri', vara: 'Vara do Júri' };
  }

  // Execução Penal
  if (textoLower.includes('execuções penais') || textoLower.includes('execucoes penais') ||
      textoLower.includes('vara de execução') || textoLower.includes('vep')) {
    return { atribuicao: 'Execução Penal', vara: 'Vara de Execuções Penais' };
  }

  // Criminal
  if (textoLower.includes('vara criminal') || textoLower.includes('1ª vara criminal') ||
      textoLower.includes('2ª vara criminal') || textoLower.includes('3ª vara criminal')) {
    return { atribuicao: 'Criminal', vara: 'Vara Criminal' };
  }

  // Infância e Juventude
  if (textoLower.includes('infância') || textoLower.includes('infancia') ||
      textoLower.includes('juventude') || textoLower.includes('infracional')) {
    return { atribuicao: 'Infância', vara: 'Vara da Infância e Juventude' };
  }

  // Família
  if (textoLower.includes('vara de família') || textoLower.includes('vara de familia')) {
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

  // Detectar atribuição automaticamente
  const { atribuicao: atribuicaoDetectada, vara: varaDetectada } = detectarAtribuicao(texto);

  // Dividir texto em linhas
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);

  // Regex para número de processo CNJ
  const regexProcesso = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;

  // Regex para data de expedição
  const regexExpedicao = /Expedição eletrônica\s*\((\d{2}\/\d{2}\/\d{4})/i;

  // Regex para prazo
  const regexPrazo = /Prazo:\s*(\d+)\s*dias?/i;

  // Regex para ID de documento (intimação, sentença, etc.)
  const regexDocumento = /(?:Intimação|Sentença|Decisão|Despacho|Certidão)\s*\((\d+)\)/i;

  // Regex para tipo de processo e crime
  // Ex: "MPUMPCrim 8005252-02.2026.8.05.0039 Maus Tratos"
  // Ex: "APOrd 8011331-31.2025.8.05.0039 Ameaça"
  const regexTipoProcessoCrime = /^(MPUMPCrim|APOrd|APSum|PetCrim|AuPrFl|Juri|InsanAc|LibProv|EP|VD|APFD)\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s*(.*)?$/i;

  // Regex para partes do processo (VÍTIMA X RÉU)
  // Captura o nome após o "X" que é o RÉU (nosso assistido)
  const regexPartes = /^(.+?)\s+X\s+(.+)$/i;

  let intimacaoAtual: Partial<IntimacaoPJeSimples> = {};
  let idDocumentoAtual = '';
  let tipoDocumentoAtual = '';

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    // Extrair ID e tipo de documento (ex: "Intimação (62889857)")
    const matchDocumento = linha.match(regexDocumento);
    if (matchDocumento) {
      idDocumentoAtual = matchDocumento[1];
      tipoDocumentoAtual = linha.split('(')[0].trim();
      continue;
    }

    // Extrair data de expedição
    const matchExpedicao = linha.match(regexExpedicao);
    if (matchExpedicao) {
      intimacaoAtual.dataExpedicao = matchExpedicao[1];
      continue;
    }

    // Extrair prazo
    const matchPrazo = linha.match(regexPrazo);
    if (matchPrazo) {
      intimacaoAtual.prazo = parseInt(matchPrazo[1], 10);
      continue;
    }

    // Extrair tipo de processo, número e crime
    const matchTipoProcesso = linha.match(regexTipoProcessoCrime);
    if (matchTipoProcesso) {
      intimacaoAtual.tipoProcesso = matchTipoProcesso[1];
      intimacaoAtual.numeroProcesso = matchTipoProcesso[2];
      intimacaoAtual.crime = matchTipoProcesso[3]?.trim() || '';
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

    // Extrair partes (VÍTIMA X RÉU) - o RÉU é o assistido
    const matchPartes = linha.match(regexPartes);
    if (matchPartes) {
      // O segundo grupo (após o X) é o réu, que é o assistido da Defensoria
      let nomeReu = matchPartes[2].trim();

      // Remover "e outros (N)" do final se existir
      nomeReu = nomeReu.replace(/\s+e\s+outros\s*\(\d+\)\s*$/i, '').trim();

      // Converter para Title Case
      intimacaoAtual.assistido = toTitleCase(nomeReu);

      // Salvar a intimação se tivermos dados mínimos (assistido + processo + data)
      if (intimacaoAtual.assistido && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
        // Criar chave única para evitar duplicatas
        const chaveUnica = `${intimacaoAtual.numeroProcesso}-${intimacaoAtual.dataExpedicao}-${idDocumentoAtual || 'sem-id'}`;

        if (!processados.has(chaveUnica)) {
          processados.add(chaveUnica);

          // Identificar campos que não foram extraídos
          const camposNaoExtraidos: string[] = [];
          if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
          if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');

          intimacoes.push({
            assistido: intimacaoAtual.assistido,
            dataExpedicao: intimacaoAtual.dataExpedicao,
            numeroProcesso: intimacaoAtual.numeroProcesso,
            idDocumento: idDocumentoAtual || undefined,
            tipoDocumento: tipoDocumentoAtual || 'Intimação',
            prazo: intimacaoAtual.prazo,
            tipoProcesso: intimacaoAtual.tipoProcesso,
            crime: intimacaoAtual.crime,
            vara: varaDetectada || undefined,
            atribuicaoDetectada: atribuicaoDetectada || undefined,
            camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
          });
        }

        // Resetar para próxima intimação
        intimacaoAtual = {};
        idDocumentoAtual = '';
        tipoDocumentoAtual = '';
      }
      continue;
    }

    // Detectar linha da vara (para contexto)
    if (linha.includes('/VARA DE') || linha.includes('/vara de')) {
      intimacaoAtual.vara = linha.replace('/', '').trim();
      continue;
    }
  }

  // Se sobrou alguma intimação parcial com dados mínimos, tentar salvar
  if (intimacaoAtual.assistido && intimacaoAtual.numeroProcesso && intimacaoAtual.dataExpedicao) {
    const chaveUnica = `${intimacaoAtual.numeroProcesso}-${intimacaoAtual.dataExpedicao}-${idDocumentoAtual || 'sem-id'}`;

    if (!processados.has(chaveUnica)) {
      const camposNaoExtraidos: string[] = [];
      if (!intimacaoAtual.prazo) camposNaoExtraidos.push('prazo');
      if (!intimacaoAtual.crime) camposNaoExtraidos.push('crime');

      intimacoes.push({
        assistido: intimacaoAtual.assistido,
        dataExpedicao: intimacaoAtual.dataExpedicao,
        numeroProcesso: intimacaoAtual.numeroProcesso,
        idDocumento: idDocumentoAtual || undefined,
        tipoDocumento: tipoDocumentoAtual || 'Intimação',
        prazo: intimacaoAtual.prazo,
        tipoProcesso: intimacaoAtual.tipoProcesso,
        crime: intimacaoAtual.crime,
        vara: varaDetectada || undefined,
        atribuicaoDetectada: atribuicaoDetectada || undefined,
        camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
      });
    }
  }

  // Se não encontrou nenhuma intimação com o parser de partes, tentar parser antigo para Júri
  if (intimacoes.length === 0) {
    return {
      intimacoes: parsePJeIntimacoesLegado(texto),
      atribuicaoDetectada,
      varaDetectada
    };
  }

  return {
    intimacoes,
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
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);

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
    'caixa de entrada', 'resultados encontrados'
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
                   !linha.match(/^(Juri|InsanAc|LibProv|PetCrim|EP|VD|MPUMPCrim|APOrd|APSum|AuPrFl)\s/i) &&
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

    // Extrair data de expedição
    const expedicaoMatch = linha.match(/(?:Expedição eletrônica|Diário Eletrônico|Edital)\s*\((\d{2}\/\d{2}\/\d{4})/i);
    if (expedicaoMatch && !dataExpedicaoAtual) {
      dataExpedicaoAtual = expedicaoMatch[1];
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
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const anoCompleto = ano > 2000 ? ano : 2000 + ano;
    return `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
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

export function intimacaoToDemanda(
  intimacao: IntimacaoPJeSimples,
  atribuicao: string
): any {
  // Usar atribuição detectada se disponível e não foi especificada
  const atribuicaoFinal = atribuicao || intimacao.atribuicaoDetectada || 'Criminal';

  return {
    id: `pje-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assistido: intimacao.assistido,
    status: 'Analisar',
    data: converterDataParaISO(intimacao.dataExpedicao),
    prazo: '',
    processos: [
      {
        tipo: intimacao.tipoProcesso || 'AP',
        numero: intimacao.numeroProcesso,
      }
    ],
    ato: 'Ciência',
    providencias: gerarProvidencias(intimacao),
    atribuicao: atribuicaoFinal,
    estadoPrisional: 'Solto',
    tipoAto: 'Geral',
    pjeData: {
      ...intimacao,
      dataExpedicao: intimacao.dataExpedicao,
      numeroProcesso: intimacao.numeroProcesso,
      idDocumento: intimacao.idDocumento,
      tipoDocumento: intimacao.tipoDocumento,
      prazoOriginal: intimacao.prazo,
      crime: intimacao.crime,
      vara: intimacao.vara,
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
 */
export function verificarDuplicatas(
  intimacoes: IntimacaoPJeSimples[],
  demandasExistentes: any[]
): ResultadoVerificacaoDuplicatas {
  const novas: IntimacaoPJeSimples[] = [];
  const duplicadas: IntimacaoPJeSimples[] = [];

  for (const intimacao of intimacoes) {
    const isDuplicada = demandasExistentes.some(demanda => {
      const nomeIntimacao = normalizarNome(intimacao.assistido);
      const nomeDemanda = normalizarNome(demanda.assistido);

      const nomesCompativeis = nomeIntimacao === nomeDemanda ||
                               calcularSimilaridade(nomeIntimacao, nomeDemanda) > 0.85;

      const processoCompativel = demanda.processos?.some((proc: any) =>
        proc.numero === intimacao.numeroProcesso
      ) || false;

      const dataIntimacao = converterDataParaISO(intimacao.dataExpedicao);
      const dataCompativel = demanda.data === dataIntimacao;

      const idDocumentoCompativel = intimacao.idDocumento && demanda.pjeData?.idDocumento
        ? demanda.pjeData.idDocumento === intimacao.idDocumento
        : false;

      return idDocumentoCompativel ||
             (nomesCompativeis && processoCompativel && dataCompativel);
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

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcularSimilaridade(str1: string, str2: string): number {
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
