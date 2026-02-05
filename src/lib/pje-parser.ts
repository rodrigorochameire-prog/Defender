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
            vara: varaDetectada || undefined,
            atribuicaoDetectada: atribuicaoDetectada || undefined,
            camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
            isMPU,
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
        vara: varaDetectada || undefined,
        atribuicaoDetectada: atribuicaoDetectada || undefined,
        camposNaoExtraidos: camposNaoExtraidos.length > 0 ? camposNaoExtraidos : undefined,
        isMPU,
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
 */
export function parseSEEUIntimacoes(texto: string): ResultadoParserSEEU {
  const intimacoes: IntimacaoSEEU[] = [];
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);

  // Detectar tipo de manifestação (aba ativa)
  let tipoManifestacao = "manifestacao";
  if (texto.includes("Ciência (") || texto.includes("Ciência(")) {
    // Verifica se é a aba ativa
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

  // Regex para detectar início de uma intimação (número sequencial + número CNJ)
  // Padrão: número + número do processo CNJ
  const regexProcessoCNJ = /^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\s*/;
  const regexSeqProcesso = /^(\d+)\s+(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;

  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];

    // Procurar por padrão: Seq + Processo CNJ
    const matchSeqProcesso = linha.match(regexSeqProcesso);
    const matchProcessoSolo = linha.match(regexProcessoCNJ);

    if (matchSeqProcesso || matchProcessoSolo) {
      const intimacao: IntimacaoSEEU = {
        assistido: '',
        dataExpedicao: '',
        numeroProcesso: '',
        atribuicaoDetectada: 'Execução Penal',
        vara: 'Vara de Execuções Penais',
      };

      if (matchSeqProcesso) {
        intimacao.seq = parseInt(matchSeqProcesso[1]);
        intimacao.numeroProcesso = matchSeqProcesso[2];
      } else if (matchProcessoSolo) {
        intimacao.numeroProcesso = matchProcessoSolo[1];
      }

      // Avançar e coletar informações das próximas linhas
      i++;

      // Coletar até encontrar próxima intimação ou fim
      while (i < linhas.length) {
        const linhaAtual = linhas[i];

        // Se encontrou próxima intimação, parar
        if (regexSeqProcesso.test(linhaAtual) ||
            (regexProcessoCNJ.test(linhaAtual) && linhaAtual.match(/^\d{7}/))) {
          break;
        }

        // Classe Processual
        if (linhaAtual.includes('Execução da Pena') ||
            linhaAtual.includes('Execução de Medidas Alternativas')) {
          intimacao.classeProcessual = linhaAtual.includes('Execução da Pena')
            ? 'Execução da Pena'
            : 'Execução de Medidas Alternativas no Juízo Comum';
        }

        // Assunto Principal (entre parênteses)
        const matchAssunto = linhaAtual.match(/\(([^)]+)\)/);
        if (matchAssunto && !intimacao.assuntoPrincipal) {
          const assunto = matchAssunto[1];
          // Filtrar assuntos válidos
          if (assunto.includes('Acordo') || assunto.includes('Pena') ||
              assunto.includes('Liberdade') || assunto.includes('Direitos')) {
            intimacao.assuntoPrincipal = assunto;
          }
        }

        // Autoridade
        if (linhaAtual.includes('Autoridade:') || linhaAtual.includes('Polo Ativo:')) {
          // A próxima linha não-vazia deve ser o nome da autoridade
          i++;
          while (i < linhas.length && linhas[i].trim() === '') i++;
          if (i < linhas.length) {
            const autoridade = linhas[i].trim();
            if (autoridade && !autoridade.includes('Executado:') && !autoridade.includes('Defensor')) {
              intimacao.autoridade = autoridade;
            }
          }
          continue;
        }

        // Executado (nome do assistido)
        if (linhaAtual.includes('Executado:')) {
          // A próxima linha não-vazia deve ser o nome do executado
          i++;
          while (i < linhas.length && linhas[i].trim() === '') i++;
          if (i < linhas.length) {
            let nomeExecutado = linhas[i].trim();
            // Remover possível "°" ou outros caracteres especiais do início
            nomeExecutado = nomeExecutado.replace(/^[°\s]+/, '');
            if (nomeExecutado &&
                !nomeExecutado.includes('Autoridade:') &&
                !nomeExecutado.includes('Defensor') &&
                !nomeExecutado.match(/^\d{2}\/\d{2}\/\d{4}/)) {
              intimacao.assistido = toTitleCase(nomeExecutado);
            }
          }
          continue;
        }

        // Datas (formato DD/MM/YYYY)
        const matchDatas = linhaAtual.match(/(\d{2}\/\d{2}\/\d{4})/g);
        if (matchDatas && matchDatas.length >= 1) {
          // Primeira data é data de envio
          if (!intimacao.dataEnvio) {
            intimacao.dataEnvio = matchDatas[0];
            intimacao.dataExpedicao = matchDatas[0]; // Para compatibilidade
          }
          // Segunda data é último dia
          if (matchDatas.length >= 2 && !intimacao.ultimoDia) {
            intimacao.ultimoDia = matchDatas[1];
          }
        }

        // Prazo para resposta
        const matchPrazo = linhaAtual.match(/(\d+)\s*dias?\s*(corridos|úteis)?/i);
        if (matchPrazo) {
          intimacao.prazo = parseInt(matchPrazo[1]);
          intimacao.prazoResposta = linhaAtual.trim();
        }

        // Pré-Análise
        if (linhaAtual === 'Livre' || linhaAtual.includes('Livre')) {
          intimacao.preAnalise = 'Livre';
        }

        i++;
      }

      // Validar intimação antes de adicionar
      if (intimacao.numeroProcesso && intimacao.assistido) {
        intimacao.tipoManifestacao = tipoManifestacao as any;

        // Definir tipo de documento baseado no tipo de manifestação
        intimacao.tipoDocumento = tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação';

        // Extrair crime/assunto do assunto principal
        if (intimacao.assuntoPrincipal) {
          intimacao.crime = intimacao.assuntoPrincipal;
        }

        // Tipo de processo
        intimacao.tipoProcesso = intimacao.classeProcessual || 'Execução Penal';

        intimacoes.push(intimacao);
      }
    } else {
      i++;
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

  // Determinar ato baseado no tipo de manifestação e assunto
  let ato = intimacao.tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação';
  if (intimacao.assuntoPrincipal) {
    if (intimacao.assuntoPrincipal.includes('Acordo de Não Persecução')) {
      ato = 'ANPP - ' + ato;
    } else if (intimacao.assuntoPrincipal.includes('Pena Privativa')) {
      ato = 'PPL - ' + ato;
    } else if (intimacao.assuntoPrincipal.includes('Pena Restritiva')) {
      ato = 'PRD - ' + ato;
    }
  }

  // Formato compatível com handleImportDemandas que espera:
  // assistido, processos, ato, prazo, data, status, estadoPrisional, providencias, atribuicao
  return {
    id: `seeu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assistido: intimacao.assistido,
    processos: [
      {
        tipo: 'EP', // Execução Penal
        numero: intimacao.numeroProcesso,
      }
    ],
    data: dataEntrada,
    prazo: prazoFinal,
    ato,
    atribuicao: 'EXECUCAO_PENAL',
    status: intimacao.tipoManifestacao === 'ciencia' ? 'ciencia' : 'atender',
    estadoPrisional: 'Preso', // Padrão para execução penal
    providencias: intimacao.assuntoPrincipal
      ? `${intimacao.classeProcessual || 'Execução Penal'} - ${intimacao.assuntoPrincipal}`
      : intimacao.classeProcessual || 'Execução Penal',
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
