/**
 * Calculadora de Prazos - Defensoria Pública
 *
 * REGRAS IMPLEMENTADAS:
 * 1. 10 dias de leitura após expedição (tempo para abrir a intimação)
 * 2. Prazo em DOBRO para Defensoria (art. 186 CPC / art. 5º LC 80/94)
 * 3. Prazo CRIMINAL: dias CORRIDOS (não úteis!)
 * 4. Se vencer em fim de semana/feriado, prorroga para próximo dia útil
 */

// Mapeamento de tipos de ato para dias de prazo processual (ANTES de dobrar)
export const PRAZOS_POR_ATO: Record<string, number> = {
  // === INSTRUÇÃO CRIMINAL ===
  "Resposta à Acusação": 10,
  "Resposta à acusação": 10,
  "Alegações finais": 5,
  "Alegações Finais": 5,
  "Memoriais": 5,

  // === RECURSOS CRIMINAIS ===
  "Apelação": 5,
  "Razões de apelação": 8,
  "Razões de Apelação": 8,
  "Contrarrazões de apelação": 8,
  "Contrarrazões de Apelação": 8,
  "RESE": 5,
  "Recurso em Sentido Estrito": 5,
  "Razões de RESE": 2,
  "Contrarrazões de RESE": 2,
  "Embargos de Declaração": 2,
  "Embargos de declaração": 2,
  "Contrarrazões de RE": 15,
  "Contrarrazões de REsp": 15,
  "Contrarrazões de ED": 2,

  // === EXECUÇÃO PENAL ===
  "Agravo em Execução": 5,
  "Agravo em execução": 5,
  "Razões de agravo": 5,
  "Contrarrazões de agravo": 5,
  "Requerimento de progressão": 0, // Sem prazo
  "Indulto": 0, // Sem prazo
  "Audiência de justificação": 3,
  "Designação admonitória": 3,
  "Transferência de unidade": 5,
  "Cumprimento ANPP": 5,

  // === JÚRI ===
  "Diligências": 5,
  "Diligências do réu": 5,
  "Diligências do 422": 5,
  "Quesitos": 3,
  "Testemunhas": 3,
  "Testemunhas do réu": 3,
  "Desaforamento": 10,

  // === PEDIDOS DE LIBERDADE (urgentes - prazo reduzido) ===
  "Habeas Corpus": 0, // Urgente - sem prazo fixo
  "HC": 0,
  "Liberdade Provisória": 2,
  "Relaxamento de Prisão": 2,
  "Relaxamento da prisão": 2,
  "Relaxamento": 2,
  "Revogação de Prisão Preventiva": 2,
  "Revogação da prisão": 2,
  "Revogação": 2,
  "Revogação de medidas": 2,
  "Revogação de monitoração": 2,
  "Revogação de MPU": 2,
  "Relaxamento e revogação": 2,

  // === VIOLÊNCIA DOMÉSTICA ===
  "Modulação de MPU": 5,
  "Manifestação contrarrazões": 5,

  // === OUTROS ===
  "Contestação": 10,
  "Incidente de insanidade": 5,
  "Petição intermediária": 5,
  "Prosseguimento do feito": 5,
  "Atualização de endereço": 2,
  "Endereço do réu": 2,
  "Restituição de coisa": 5,
  "Requerimento audiência": 5,
};

// Feriados nacionais fixos (mês é 0-indexed)
const FERIADOS_FIXOS = [
  { mes: 0, dia: 1 },   // Confraternização Universal
  { mes: 3, dia: 21 },  // Tiradentes
  { mes: 4, dia: 1 },   // Dia do Trabalhador
  { mes: 8, dia: 7 },   // Independência
  { mes: 9, dia: 12 },  // Nossa Senhora Aparecida
  { mes: 10, dia: 2 },  // Finados
  { mes: 10, dia: 15 }, // Proclamação da República
  { mes: 11, dia: 25 }, // Natal
];

/**
 * Calcula a data da Páscoa para um ano (algoritmo de Meeus/Jones/Butcher)
 */
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}

/**
 * Gera lista de feriados para um ano específico
 */
function getFeriadosAno(ano: number): Set<string> {
  const feriados = new Set<string>();

  // Feriados fixos
  for (const f of FERIADOS_FIXOS) {
    feriados.add(`${ano}-${String(f.mes + 1).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`);
  }

  // Feriados móveis baseados na Páscoa
  const pascoa = calcularPascoa(ano);

  // Carnaval: 47 dias antes da Páscoa (terça-feira)
  const carnaval = new Date(pascoa);
  carnaval.setDate(carnaval.getDate() - 47);
  feriados.add(carnaval.toISOString().split('T')[0]);

  // Segunda de carnaval
  const segCarnaval = new Date(pascoa);
  segCarnaval.setDate(segCarnaval.getDate() - 48);
  feriados.add(segCarnaval.toISOString().split('T')[0]);

  // Sexta-feira Santa: 2 dias antes da Páscoa
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(sextaSanta.getDate() - 2);
  feriados.add(sextaSanta.toISOString().split('T')[0]);

  // Corpus Christi: 60 dias após a Páscoa
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  feriados.add(corpusChristi.toISOString().split('T')[0]);

  // Recesso forense: 20/12 a 06/01
  for (let dia = 20; dia <= 31; dia++) {
    feriados.add(`${ano}-12-${String(dia).padStart(2, '0')}`);
  }
  for (let dia = 1; dia <= 6; dia++) {
    feriados.add(`${ano + 1}-01-${String(dia).padStart(2, '0')}`);
  }

  return feriados;
}

/**
 * Verifica se é fim de semana
 */
function ehFimDeSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === 0 || dia === 6;
}

/**
 * Verifica se é feriado
 */
function ehFeriado(data: Date, feriados: Set<string>): boolean {
  const dataStr = data.toISOString().split('T')[0];
  return feriados.has(dataStr);
}

/**
 * Verifica se é dia útil (não é fim de semana nem feriado)
 */
function ehDiaUtil(data: Date, feriados: Set<string>): boolean {
  return !ehFimDeSemana(data) && !ehFeriado(data, feriados);
}

/**
 * Encontra o próximo dia útil a partir de uma data
 */
function proximoDiaUtil(data: Date, feriados: Set<string>): Date {
  const novaData = new Date(data);
  while (!ehDiaUtil(novaData, feriados)) {
    novaData.setDate(novaData.getDate() + 1);
  }
  return novaData;
}

/**
 * Calcula o prazo final para a Defensoria Pública
 *
 * @param dataExpedicao - Data em que a intimação foi expedida
 * @param diasPrazoProcessual - Prazo legal em dias (ANTES de dobrar)
 * @param tempoLeituraDias - Dias de "tempo de leitura" (padrão: 10)
 * @param aplicarDobro - Se deve aplicar prazo em dobro (padrão: true)
 * @param diasCorridos - Se deve contar em dias corridos (padrão: true para criminal)
 */
export function calcularPrazoDefensoria(
  dataExpedicao: Date,
  diasPrazoProcessual: number,
  tempoLeituraDias: number = 10,
  aplicarDobro: boolean = true,
  diasCorridos: boolean = true // Criminal = dias corridos
): string {
  try {
    if (diasPrazoProcessual === 0) {
      // Atos sem prazo fixo (HC, etc)
      return '';
    }

    // Obter feriados dos anos relevantes
    const ano = dataExpedicao.getFullYear();
    const feriadosAno = getFeriadosAno(ano);
    const feriadosProximo = getFeriadosAno(ano + 1);
    const todosFeriados = new Set([...feriadosAno, ...feriadosProximo]);

    // ETAPA 1: Adicionar tempo de leitura (dias CORRIDOS)
    const dataAposLeitura = new Date(dataExpedicao);
    dataAposLeitura.setDate(dataAposLeitura.getDate() + tempoLeituraDias);

    // ETAPA 2: Termo inicial é o primeiro dia APÓS a leitura
    const termoInicial = new Date(dataAposLeitura);
    termoInicial.setDate(termoInicial.getDate() + 1);

    // ETAPA 3: Calcular prazo com dobro
    const prazoFinal = aplicarDobro ? diasPrazoProcessual * 2 : diasPrazoProcessual;

    // ETAPA 4: Adicionar prazo
    let dataFinal: Date;

    if (diasCorridos) {
      // CRIMINAL: Dias corridos (apenas ajusta se vencer em feriado/fim de semana)
      dataFinal = new Date(termoInicial);
      dataFinal.setDate(dataFinal.getDate() + prazoFinal);

      // Se cair em fim de semana ou feriado, prorroga para próximo dia útil
      dataFinal = proximoDiaUtil(dataFinal, todosFeriados);
    } else {
      // CÍVEL: Dias úteis
      let diasContados = 0;
      dataFinal = new Date(termoInicial);

      while (diasContados < prazoFinal) {
        dataFinal.setDate(dataFinal.getDate() + 1);
        if (ehDiaUtil(dataFinal, todosFeriados)) {
          diasContados++;
        }
      }
    }

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

/**
 * Calcula automaticamente o prazo baseado no tipo de ato
 * Usa as regras da Defensoria: 10 dias leitura + prazo em dobro + dias corridos
 */
export function calcularPrazoPorAto(dataExpedicao: Date, tipoAto: string): string {
  const diasPrazo = PRAZOS_POR_ATO[tipoAto];

  if (diasPrazo === undefined) {
    // Se não encontrar o prazo específico, retorna vazio
    return '';
  }

  if (diasPrazo === 0) {
    // Atos urgentes sem prazo (HC, etc)
    return '';
  }

  // Usar configuração padrão: 10 dias leitura, dobro, dias corridos (criminal)
  return calcularPrazoDefensoria(dataExpedicao, diasPrazo, 10, true, true);
}

/**
 * Obtém os dias de prazo processual para um tipo de ato (ANTES de dobrar)
 */
export function obterDiasPrazoPorAto(tipoAto: string): number | null {
  const prazo = PRAZOS_POR_ATO[tipoAto];
  return prazo !== undefined ? prazo : null;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AA)
 */
export function converterISOParaBR(dataISO: string): string {
  try {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const anoAbreviado = String(ano).slice(-2);
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anoAbreviado}`;
  } catch {
    return '';
  }
}

/**
 * Converte data brasileira (DD/MM/AA ou DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
export function converterBRParaISO(dataBR: string): string {
  try {
    const [dia, mes, ano] = dataBR.split('/').map(Number);
    const anoCompleto = ano > 2000 ? ano : 2000 + ano;
    return `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formata a explicação do cálculo do prazo
 */
export function formatarExplicacaoPrazo(tipoAto: string, prazoFinal: string): string {
  const diasPrazo = PRAZOS_POR_ATO[tipoAto];

  if (!diasPrazo || !prazoFinal) {
    return '';
  }

  return `📅 **Prazo calculado automaticamente**

**Tipo de Ato:** ${tipoAto}
**Prazo Legal:** ${diasPrazo} dias

**Cálculo:**
• +10 dias de leitura (tempo para abrir intimação)
• ${diasPrazo} dias × 2 (Defensoria) = ${diasPrazo * 2} dias corridos
• Se cair em fim de semana/feriado → próximo dia útil
• **Vence em:** ${prazoFinal}`;
}

/**
 * Retorna informações detalhadas do cálculo
 */
export function calcularPrazoDetalhado(
  dataExpedicao: Date,
  tipoAto: string
): {
  prazoFinal: string;
  diasBase: number;
  diasComDobro: number;
  dataLeitura: string;
  dataTermoInicial: string;
  explicacao: string;
} | null {
  const diasBase = PRAZOS_POR_ATO[tipoAto];

  if (diasBase === undefined || diasBase === 0) {
    return null;
  }

  const tempoLeitura = 10;
  const diasComDobro = diasBase * 2;

  // Data de leitura
  const dataLeitura = new Date(dataExpedicao);
  dataLeitura.setDate(dataLeitura.getDate() + tempoLeitura);

  // Termo inicial
  const dataTermoInicial = new Date(dataLeitura);
  dataTermoInicial.setDate(dataTermoInicial.getDate() + 1);

  const prazoFinal = calcularPrazoPorAto(dataExpedicao, tipoAto);

  return {
    prazoFinal,
    diasBase,
    diasComDobro,
    dataLeitura: converterISOParaBR(dataLeitura.toISOString().split('T')[0]),
    dataTermoInicial: converterISOParaBR(dataTermoInicial.toISOString().split('T')[0]),
    explicacao: formatarExplicacaoPrazo(tipoAto, prazoFinal),
  };
}
