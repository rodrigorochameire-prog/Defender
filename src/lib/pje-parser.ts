export interface IntimacaoPJeSimples {
  assistido: string;
  dataExpedicao: string;
  numeroProcesso: string;
  idDocumento?: string; // ID único do documento PJe (ex: "62096897" de "Sentença (62096897)")
  tipoDocumento?: string; // Tipo de documento (ex: "Sentença", "Decisão", "Despacho")
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

export function parsePJeIntimacoes(texto: string): IntimacaoPJeSimples[] {
  const intimacoes: IntimacaoPJeSimples[] = [];
  const intimacoesComIndice: Array<IntimacaoPJeSimples & { indice: number }> = [];
  let indiceGlobal = 0;
  
  // Dividir por blocos (cada intimação é separada por linhas em branco ou por repetição de nome)
  const linhas = texto.split('\n').map(l => l.trim()).filter(l => l);
  
  let assistidoAtual = '';
  let dataExpedicaoAtual = '';
  let numeroProcessoAtual = '';
  let idDocumentoAtual = '';
  let tipoDocumentoAtual = '';
  
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    
    // Detectar nome do assistido
    // Aceita tanto nomes MAIÚSCULOS quanto Capitalizados (ex: "Agnaldo Carlos dos Santos")
    const temMaiusculaInicial = linha.charAt(0) === linha.charAt(0).toUpperCase();
    const ehTodoMaiusculo = linha === linha.toUpperCase();
    const ehCapitalizado = linha.split(' ').every(palavra => 
      palavra.length === 0 || 
      palavra.charAt(0) === palavra.charAt(0).toUpperCase() ||
      ['de', 'da', 'do', 'dos', 'das', 'e'].includes(palavra.toLowerCase())
    );
    
    // Lista de palavras que NÃO são nomes de assistidos
    const palavrasExcluidas = [
      'ministério público', 'ministério publico', 'mp', 'vara', 'comarca',
      'tribunal', 'justiça', 'sentença', 'decisão', 'despacho', 'certidão',
      'intimação', 'expedição', 'prazo', 'data limite', 'defensor', 'defensoria',
      'último movimento', 'conclusos', 'juntada', 'mandado', 'edital',
      'publicado', 'decorrido', 'termo de sessão', 'ato ordinatório'
    ];
    
    const contemPalavraExcluida = palavrasExcluidas.some(palavra => 
      linha.toLowerCase().includes(palavra)
    );
    
    const ehNome = (ehTodoMaiusculo || (ehCapitalizado && temMaiusculaInicial)) && // Nome em maiúsculas ou capitalizado
                   !linha.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/) && // Não é número de processo
                   !linha.match(/\d{2}\/\d{2}\/\d{4}/) && // Não contém data
                   !linha.includes('(') && // Não contém parênteses
                   !contemPalavraExcluida && // Não contém palavras excluídas
                   !linha.startsWith('/') &&
                   !linha.startsWith('X ') && // Não é separador de partes "X"
                   !linha.match(/^(Juri|InsanAc|LibProv|PetCrim|EP|VD)\s/i) && // Não começa com tipo de processo
                   linha.length > 5 && // Mínimo de caracteres
                   linha.length < 80 && // Máximo de caracteres (evita linhas longas)
                   !linha.match(/^\d/) && // Não começa com número
                   linha.split(' ').length >= 2 && // Pelo menos 2 palavras (nome e sobrenome)
                   linha.split(' ').length <= 10; // Máximo 10 palavras (evita frases longas)
    
    if (ehNome) {
      // Se já temos dados completos, salvar antes de iniciar novo registro
      if (assistidoAtual && numeroProcessoAtual && dataExpedicaoAtual) {
        // Verificar se já não existe (evitar duplicação)
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
      
      // Iniciar novo registro
      assistidoAtual = toTitleCase(linha);
      dataExpedicaoAtual = '';
      numeroProcessoAtual = '';
      idDocumentoAtual = '';
      tipoDocumentoAtual = '';
      continue;
    }
    
    // Extrair data de expedição
    // Ex: "Expedição eletrônica (28/01/2026 12:52)" ou "Diário Eletrônico (21/01/2026 12:13)"
    const expedicaoMatch = linha.match(/(?:Expedição eletrônica|Diário Eletrônico|Edital)\s*\((\d{2}\/\d{2}\/\d{4})/i);
    if (expedicaoMatch && !dataExpedicaoAtual) {
      dataExpedicaoAtual = expedicaoMatch[1];
      continue;
    }
    
    // Extrair número do processo
    // Ex: "InsanAc 8010573-52.2025.8.05.0039 Homicídio Qualificado"
    // Ex: "Juri 8017921-24.2025.8.05.0039 Homicídio Simples"
    const processoMatch = linha.match(/(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
    if (processoMatch && !numeroProcessoAtual) {
      numeroProcessoAtual = processoMatch[1];
      continue;
    }
    
    // Extrair ID e tipo de documento
    // Ex: "Sentença (62096897)"
    const documentoMatch = linha.match(/(\w+)\s*\((\d+)\)/);
    if (documentoMatch && !idDocumentoAtual) {
      tipoDocumentoAtual = documentoMatch[1];
      idDocumentoAtual = documentoMatch[2];
      continue;
    }
  }
  
  // Salvar último registro se estiver completo
  if (assistidoAtual && numeroProcessoAtual && dataExpedicaoAtual) {
    // Verificar se já não existe (evitar duplicação)
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
  
  // Deduplicação final por número de processo (garantia extra)
  const intimacoesUnicas = intimacoes.reduce((acc, current) => {
    const duplicado = acc.find(item => 
      item.numeroProcesso === current.numeroProcesso &&
      item.assistido === current.assistido
    );
    
    if (!duplicado) {
      acc.push(current);
    }
    
    return acc;
  }, [] as IntimacaoPJeSimples[]);
  
  return intimacoesUnicas;
}

function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay();
  // 0 = domingo, 6 = sábado
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
    // Converter data DD/MM/YYYY para objeto Date
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
      
      // Contar apenas dias úteis
      if (ehDiaUtil(dataAtual)) {
        diasAdicionados++;
      }
    }
    
    // ETAPA 4: Se terminar em dia não útil, avançar para o próximo dia útil
    const dataFinal = proximoDiaUtil(dataAtual);
    
    // Formatar como DD/MM/AA
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

export function intimacaoToDemanda(
  intimacao: IntimacaoPJeSimples,
  atribuicao: string
): any {
  return {
    id: `pje-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    assistido: intimacao.assistido,
    status: 'Analisar', // Status padrão - será editado depois
    data: converterDataParaISO(intimacao.dataExpedicao),
    prazo: '', // Será calculado automaticamente quando o ato for selecionado
    processos: [
      {
        tipo: 'AP',
        numero: intimacao.numeroProcesso,
      }
    ],
    ato: 'Ciência', // Ato padrão - será editado depois
    providencias: `📋 **Intimação importada do PJe**

**Data de Expedição:** ${intimacao.dataExpedicao}
**Processo:** ${intimacao.numeroProcesso}

⚠️ *Lembre-se de editar o ATO para calcular automaticamente o prazo*`,
    atribuicao: atribuicao,
    estadoPrisional: 'Solto',
    tipoAto: 'Geral',
    pjeData: intimacao,
  };
}

export function formatarResumoImportacao(intimacoes: IntimacaoPJeSimples[]): string {
  const total = intimacoes.length;
  
  let resumo = `✅ **${total} ${total === 1 ? 'intimação encontrada' : 'intimações encontradas'}**\n\n`;
  
  if (total > 0) {
    resumo += `📋 **Dados extraídos automaticamente:**\n`;
    resumo += `  • Nome do assistido\n`;
    resumo += `  • Data de expedição\n`;
    resumo += `  • Número do processo\n`;
    resumo += `  • ID do documento PJe\n`;
    resumo += `  • Tipo de documento\n\n`;
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
}

/**
 * Verifica se uma intimação já existe nas demandas cadastradas
 * Compara: nome do assistido, número do processo, data de expedição e ID do documento
 */
export function verificarDuplicatas(
  intimacoes: IntimacaoPJeSimples[],
  demandasExistentes: any[]
): ResultadoVerificacaoDuplicatas {
  const novas: IntimacaoPJeSimples[] = [];
  const duplicadas: IntimacaoPJeSimples[] = [];

  for (const intimacao of intimacoes) {
    const isDuplicada = demandasExistentes.some(demanda => {
      // Normalizar nomes para comparação (remover acentos, converter para minúsculas)
      const nomeIntimacao = normalizarNome(intimacao.assistido);
      const nomeDemanda = normalizarNome(demanda.assistido);
      
      // Critério 1: Nomes similares (considerando pequenas variações)
      const nomesCompatíveis = nomeIntimacao === nomeDemanda || 
                               calcularSimilaridade(nomeIntimacao, nomeDemanda) > 0.85;
      
      // Critério 2: Mesmo número de processo
      const processoCompatível = demanda.processos?.some((proc: any) => 
        proc.numero === intimacao.numeroProcesso
      ) || false;
      
      // Critério 3: Data de expedição compatível
      const dataIntimacao = converterDataParaISO(intimacao.dataExpedicao);
      const dataCompatível = demanda.data === dataIntimacao;
      
      // Critério 4: ID do documento (verificação mais precisa)
      const idDocumentoCompatível = intimacao.idDocumento && demanda.pjeData?.idDocumento 
        ? demanda.pjeData.idDocumento === intimacao.idDocumento
        : false;
      
      // Intimação é duplicada se:
      // - Tiver o mesmo ID de documento (mais preciso) OU
      // - Tiver nome compatível + processo compatível + data compatível
      return idDocumentoCompatível || 
             (nomesCompatíveis && processoCompatível && dataCompatível);
    });

    if (isDuplicada) {
      duplicadas.push(intimacao);
    } else {
      novas.push(intimacao);
    }
  }

  return {
    novas,
    duplicadas,
    totalEncontradas: intimacoes.length,
    totalNovas: novas.length,
    totalDuplicadas: duplicadas.length,
  };
}

/**
 * Normaliza um nome para comparação
 * Remove acentos, converte para minúsculas e remove espaços extras
 */
function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

/**
 * Calcula a similaridade entre dois textos (0 a 1)
 * Usa algoritmo de Levenshtein simplificado
 */
function calcularSimilaridade(str1: string, str2: string): number {
  const comprimentoMaior = Math.max(str1.length, str2.length);
  if (comprimentoMaior === 0) return 1.0;
  
  const distancia = calcularDistanciaLevenshtein(str1, str2);
  return (comprimentoMaior - distancia) / comprimentoMaior;
}

/**
 * Calcula a distância de Levenshtein entre dois textos
 */
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
          dp[i - 1][j] + 1,    // Deleção
          dp[i][j - 1] + 1,    // Inserção
          dp[i - 1][j - 1] + 1 // Substituição
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Formata o resumo de importação com informações sobre duplicatas
 */
export function formatarResumoComDuplicatas(resultado: ResultadoVerificacaoDuplicatas): string {
  let resumo = '';
  
  if (resultado.totalEncontradas === 0) {
    resumo = `⚠️ **Nenhuma intimação encontrada no texto**\n\n`;
    resumo += `Verifique se o texto foi copiado corretamente do PJe.`;
    return resumo;
  }
  
  resumo = `📊 **Análise de Importação**\n\n`;
  resumo += `🔍 Total de intimações encontradas: **${resultado.totalEncontradas}**\n`;
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
      if (intimacao.idDocumento) {
        resumo += ` - ${intimacao.tipoDocumento} (${intimacao.idDocumento})`;
      }
      resumo += `\n`;
    });
  }
  
  return resumo;
}