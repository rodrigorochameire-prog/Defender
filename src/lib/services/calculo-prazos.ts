/**
 * Serviço de Cálculo Automático de Prazos - Defensoria Pública
 *
 * Regras implementadas:
 * 1. Prazo em dobro para Defensoria Pública (art. 186 CPC / art. 5º LC 80/94)
 * 2. Tempo de leitura: 10 dias após expedição da intimação
 * 3. Prazo criminal: dias CORRIDOS (não úteis)
 * 4. Prazo cível: dias ÚTEIS
 * 5. Suspensão em feriados forenses e recessos
 * 6. Prorrogação para primeiro dia útil se vencer em fim de semana/feriado
 */

import { db } from "@/lib/db";
import {
  tipoPrazos,
  feriadosForenses,
  calculosPrazos,
  type TipoPrazo,
  type FeriadoForense,
  type InsertCalculoPrazo,
} from "@/lib/db/schema";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";

// ==========================================
// TIPOS
// ==========================================

export interface ParametrosCalculo {
  // Datas de entrada
  dataExpedicao?: Date | string; // Data que intimação foi expedida
  dataLeitura?: Date | string; // Data da leitura (se já abriu)

  // Tipo de prazo
  tipoPrazoCodigo?: string; // Código do tipo de prazo cadastrado
  prazoBaseDias?: number; // Prazo em dias (se não usar tipo cadastrado)

  // Configurações
  areaDireito?: "CRIMINAL" | "CIVEL" | "TRABALHISTA" | "EXECUCAO_PENAL" | "JURI";
  aplicarDobro?: boolean; // Default: true (Defensoria)
  tempoLeituraDias?: number; // Default: 10 dias
  contarEmDiasUteis?: boolean; // Default: false para criminal

  // Contexto
  estado?: string; // BA, SP, etc (para feriados estaduais)
  comarca?: string; // Para feriados municipais
  tribunal?: string; // STF, STJ, TJBA
  workspaceId?: number;
}

export interface ResultadoCalculo {
  // Datas calculadas
  dataExpedicao: Date;
  dataLeitura: Date; // Data presumida de leitura
  dataTermoInicial: Date; // Primeiro dia do prazo
  dataTermoFinal: Date; // Prazo fatal

  // Detalhes do cálculo
  prazoBaseDias: number;
  prazoComDobroDias: number;
  diasSuspensos: number;
  feriadosEncontrados: Array<{ data: Date; nome: string }>;

  // Configurações aplicadas
  areaDireito: string;
  contadoEmDiasUteis: boolean;
  aplicouDobro: boolean;
  tempoLeituraAplicado: number;

  // Alertas
  alertas: string[];
}

// ==========================================
// FUNÇÕES AUXILIARES DE DATA
// ==========================================

/**
 * Converte string ou Date para Date
 */
function toDate(date: Date | string | undefined | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Formata data para comparação (YYYY-MM-DD)
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Verifica se é fim de semana (sábado ou domingo)
 */
function isFimDeSemana(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Domingo = 0, Sábado = 6
}

/**
 * Adiciona dias a uma data
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Clona uma data
 */
function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

// ==========================================
// FERIADOS
// ==========================================

/**
 * Gera feriados fixos nacionais para um ano
 */
function getFeriadosFixosNacionais(ano: number): Array<{ data: Date; nome: string }> {
  return [
    { data: new Date(ano, 0, 1), nome: "Confraternização Universal" },
    { data: new Date(ano, 3, 21), nome: "Tiradentes" },
    { data: new Date(ano, 4, 1), nome: "Dia do Trabalhador" },
    { data: new Date(ano, 8, 7), nome: "Independência do Brasil" },
    { data: new Date(ano, 9, 12), nome: "Nossa Senhora Aparecida" },
    { data: new Date(ano, 10, 2), nome: "Finados" },
    { data: new Date(ano, 10, 15), nome: "Proclamação da República" },
    { data: new Date(ano, 11, 25), nome: "Natal" },
  ];
}

/**
 * Calcula Páscoa pelo algoritmo de Meeus/Jones/Butcher
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
 * Gera feriados móveis (baseados na Páscoa) para um ano
 */
function getFeriadosMoveis(ano: number): Array<{ data: Date; nome: string }> {
  const pascoa = calcularPascoa(ano);

  return [
    { data: addDays(pascoa, -48), nome: "Segunda-feira de Carnaval" },
    { data: addDays(pascoa, -47), nome: "Terça-feira de Carnaval" },
    { data: addDays(pascoa, -46), nome: "Quarta-feira de Cinzas" }, // Ponto facultativo até 14h
    { data: addDays(pascoa, -2), nome: "Sexta-feira Santa" },
    { data: pascoa, nome: "Páscoa" },
    { data: addDays(pascoa, 60), nome: "Corpus Christi" },
  ];
}

/**
 * Gera recesso forense (20/12 a 06/01)
 */
function getRecessoForense(ano: number): Array<{ data: Date; nome: string }> {
  const feriados: Array<{ data: Date; nome: string }> = [];

  // Recesso de 20/12 do ano atual até 06/01 do próximo ano
  for (let dia = 20; dia <= 31; dia++) {
    feriados.push({
      data: new Date(ano, 11, dia),
      nome: "Recesso Forense",
    });
  }
  for (let dia = 1; dia <= 6; dia++) {
    feriados.push({
      data: new Date(ano + 1, 0, dia),
      nome: "Recesso Forense",
    });
  }

  return feriados;
}

/**
 * Busca feriados do banco de dados + gera automáticos
 */
async function getFeriados(
  dataInicio: Date,
  dataFim: Date,
  opcoes: {
    estado?: string;
    comarca?: string;
    tribunal?: string;
    workspaceId?: number;
  }
): Promise<Map<string, { data: Date; nome: string }>> {
  const feriadosMap = new Map<string, { data: Date; nome: string }>();

  // 1. Gerar feriados automáticos para os anos envolvidos
  const anoInicio = dataInicio.getFullYear();
  const anoFim = dataFim.getFullYear();

  for (let ano = anoInicio; ano <= anoFim; ano++) {
    // Feriados fixos nacionais
    for (const feriado of getFeriadosFixosNacionais(ano)) {
      feriadosMap.set(formatDateKey(feriado.data), feriado);
    }

    // Feriados móveis
    for (const feriado of getFeriadosMoveis(ano)) {
      feriadosMap.set(formatDateKey(feriado.data), feriado);
    }

    // Recesso forense
    for (const feriado of getRecessoForense(ano)) {
      feriadosMap.set(formatDateKey(feriado.data), feriado);
    }
  }

  // 2. Buscar feriados do banco de dados (sobrescrevem os automáticos se necessário)
  try {
    const conditions = [
      gte(feriadosForenses.data, dataInicio.toISOString().split("T")[0]),
      lte(feriadosForenses.data, dataFim.toISOString().split("T")[0]),
      eq(feriadosForenses.suspendePrazo, true),
    ];

    // Filtrar por abrangência
    const abrangenciaConditions = [eq(feriadosForenses.abrangencia, "NACIONAL")];

    if (opcoes.estado) {
      abrangenciaConditions.push(
        and(
          eq(feriadosForenses.abrangencia, "ESTADUAL"),
          eq(feriadosForenses.estado, opcoes.estado)
        )!
      );
    }

    if (opcoes.comarca) {
      abrangenciaConditions.push(
        and(
          eq(feriadosForenses.abrangencia, "MUNICIPAL"),
          eq(feriadosForenses.comarca, opcoes.comarca)
        )!
      );
    }

    if (opcoes.tribunal) {
      abrangenciaConditions.push(
        and(
          eq(feriadosForenses.abrangencia, "TRIBUNAL"),
          eq(feriadosForenses.tribunal, opcoes.tribunal)
        )!
      );
    }

    const feriadosDB = await db
      .select()
      .from(feriadosForenses)
      .where(and(...conditions, or(...abrangenciaConditions)));

    for (const feriado of feriadosDB) {
      const dataFeriado = toDate(feriado.data);
      if (dataFeriado) {
        feriadosMap.set(formatDateKey(dataFeriado), {
          data: dataFeriado,
          nome: feriado.nome,
        });

        // Se for período (recesso), adicionar todos os dias
        if (feriado.dataFim) {
          const dataFimPeriodo = toDate(feriado.dataFim);
          if (dataFimPeriodo) {
            let current = addDays(dataFeriado, 1);
            while (current <= dataFimPeriodo) {
              feriadosMap.set(formatDateKey(current), {
                data: cloneDate(current),
                nome: feriado.nome,
              });
              current = addDays(current, 1);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Erro ao buscar feriados do banco:", error);
    // Continua com feriados automáticos
  }

  return feriadosMap;
}

// ==========================================
// CÁLCULO DE PRAZOS
// ==========================================

/**
 * Verifica se uma data é dia útil
 */
function isDiaUtil(
  data: Date,
  feriadosMap: Map<string, { data: Date; nome: string }>
): boolean {
  // Fim de semana não é dia útil
  if (isFimDeSemana(data)) return false;

  // Feriado não é dia útil
  if (feriadosMap.has(formatDateKey(data))) return false;

  return true;
}

/**
 * Encontra o próximo dia útil a partir de uma data
 */
function proximoDiaUtil(
  data: Date,
  feriadosMap: Map<string, { data: Date; nome: string }>
): Date {
  let current = cloneDate(data);

  while (!isDiaUtil(current, feriadosMap)) {
    current = addDays(current, 1);
  }

  return current;
}

/**
 * Adiciona dias úteis a uma data
 */
function addDiasUteis(
  dataInicial: Date,
  diasUteis: number,
  feriadosMap: Map<string, { data: Date; nome: string }>
): { dataFinal: Date; feriadosEncontrados: Array<{ data: Date; nome: string }> } {
  const feriadosEncontrados: Array<{ data: Date; nome: string }> = [];
  let current = cloneDate(dataInicial);
  let diasContados = 0;

  while (diasContados < diasUteis) {
    current = addDays(current, 1);

    if (isDiaUtil(current, feriadosMap)) {
      diasContados++;
    } else {
      const feriado = feriadosMap.get(formatDateKey(current));
      if (feriado && !isFimDeSemana(current)) {
        feriadosEncontrados.push(feriado);
      }
    }
  }

  return { dataFinal: current, feriadosEncontrados };
}

/**
 * Adiciona dias corridos a uma data, mas garante que o vencimento seja em dia útil
 */
function addDiasCorridos(
  dataInicial: Date,
  dias: number,
  feriadosMap: Map<string, { data: Date; nome: string }>
): { dataFinal: Date; feriadosEncontrados: Array<{ data: Date; nome: string }> } {
  const feriadosEncontrados: Array<{ data: Date; nome: string }> = [];
  let dataFinal = addDays(dataInicial, dias);

  // Coleta feriados no período para informação
  let current = cloneDate(dataInicial);
  while (current <= dataFinal) {
    const feriado = feriadosMap.get(formatDateKey(current));
    if (feriado) {
      feriadosEncontrados.push(feriado);
    }
    current = addDays(current, 1);
  }

  // Se cair em fim de semana ou feriado, prorroga para próximo dia útil
  dataFinal = proximoDiaUtil(dataFinal, feriadosMap);

  return { dataFinal, feriadosEncontrados };
}

/**
 * Calcula o prazo automaticamente
 */
export async function calcularPrazo(
  params: ParametrosCalculo
): Promise<ResultadoCalculo> {
  const alertas: string[] = [];

  // 1. Buscar tipo de prazo se especificado
  let tipoPrazo: TipoPrazo | null = null;
  if (params.tipoPrazoCodigo) {
    try {
      const [tipo] = await db
        .select()
        .from(tipoPrazos)
        .where(eq(tipoPrazos.codigo, params.tipoPrazoCodigo))
        .limit(1);
      tipoPrazo = tipo || null;
    } catch (error) {
      console.error("Erro ao buscar tipo de prazo:", error);
    }
  }

  // 2. Definir parâmetros (tipo cadastrado ou manual)
  const prazoBaseDias = tipoPrazo?.prazoLegalDias ?? params.prazoBaseDias ?? 15;
  const areaDireito = params.areaDireito ?? tipoPrazo?.areaDireito ?? "CRIMINAL";
  const contarEmDiasUteis =
    params.contarEmDiasUteis ??
    tipoPrazo?.contarEmDiasUteis ??
    (areaDireito === "CIVEL" || areaDireito === "TRABALHISTA");
  const aplicarDobro =
    params.aplicarDobro ?? tipoPrazo?.aplicarDobroDefensoria ?? true;
  const tempoLeituraDias =
    params.tempoLeituraDias ?? tipoPrazo?.tempoLeituraDias ?? 10;

  // 3. Calcular prazo com dobro para Defensoria
  const prazoComDobroDias = aplicarDobro ? prazoBaseDias * 2 : prazoBaseDias;

  // 4. Definir data de expedição (hoje se não informada)
  const dataExpedicao = toDate(params.dataExpedicao) ?? new Date();

  // 5. Calcular data de leitura
  // Se já foi informada, usar. Senão, expedição + tempo de leitura
  let dataLeitura: Date;
  if (params.dataLeitura) {
    dataLeitura = toDate(params.dataLeitura)!;
  } else {
    // Tempo de leitura em dias corridos
    dataLeitura = addDays(dataExpedicao, tempoLeituraDias);
  }

  // 6. Termo inicial: primeiro dia após a leitura
  const dataTermoInicial = addDays(dataLeitura, 1);

  // 7. Buscar feriados para o período (com margem)
  const dataFimEstimada = addDays(dataTermoInicial, prazoComDobroDias + 30);
  const feriadosMap = await getFeriados(dataExpedicao, dataFimEstimada, {
    estado: params.estado,
    comarca: params.comarca,
    tribunal: params.tribunal,
    workspaceId: params.workspaceId,
  });

  // 8. Calcular termo final
  let resultado: {
    dataFinal: Date;
    feriadosEncontrados: Array<{ data: Date; nome: string }>;
  };

  if (contarEmDiasUteis) {
    // Cível/Trabalhista: dias úteis
    resultado = addDiasUteis(dataTermoInicial, prazoComDobroDias, feriadosMap);
    alertas.push("Prazo contado em dias ÚTEIS (área cível/trabalhista)");
  } else {
    // Criminal: dias corridos, mas vencimento em dia útil
    resultado = addDiasCorridos(dataTermoInicial, prazoComDobroDias, feriadosMap);
    alertas.push("Prazo contado em dias CORRIDOS (área criminal)");
  }

  const dataTermoFinal = resultado.dataFinal;

  // 9. Alertas adicionais
  if (aplicarDobro) {
    alertas.push(`Prazo em dobro para Defensoria: ${prazoBaseDias} → ${prazoComDobroDias} dias`);
  }

  if (tempoLeituraDias > 0 && !params.dataLeitura) {
    alertas.push(`Tempo de leitura aplicado: ${tempoLeituraDias} dias após expedição`);
  }

  if (resultado.feriadosEncontrados.length > 0) {
    const nomeFeriados = [...new Set(resultado.feriadosEncontrados.map((f) => f.nome))];
    alertas.push(`Feriados/recessos no período: ${nomeFeriados.join(", ")}`);
  }

  return {
    dataExpedicao,
    dataLeitura,
    dataTermoInicial,
    dataTermoFinal,
    prazoBaseDias,
    prazoComDobroDias,
    diasSuspensos: resultado.feriadosEncontrados.length,
    feriadosEncontrados: resultado.feriadosEncontrados,
    areaDireito,
    contadoEmDiasUteis: contarEmDiasUteis,
    aplicouDobro: aplicarDobro,
    tempoLeituraAplicado: tempoLeituraDias,
    alertas,
  };
}

/**
 * Salva o cálculo no histórico
 */
export async function salvarCalculoPrazo(
  demandaId: number,
  resultado: ResultadoCalculo,
  tipoPrazoCodigo?: string,
  workspaceId?: number,
  userId?: number
): Promise<void> {
  const calculoData: InsertCalculoPrazo = {
    demandaId,
    tipoPrazoCodigo,
    dataExpedicao: resultado.dataExpedicao.toISOString().split("T")[0],
    dataLeitura: resultado.dataLeitura.toISOString().split("T")[0],
    dataTermoInicial: resultado.dataTermoInicial.toISOString().split("T")[0],
    dataTermoFinal: resultado.dataTermoFinal.toISOString().split("T")[0],
    prazoBaseDias: resultado.prazoBaseDias,
    prazoComDobroDias: resultado.prazoComDobroDias,
    diasUteisSuspensos: resultado.diasSuspensos,
    areaDireito: resultado.areaDireito,
    contadoEmDiasUteis: resultado.contadoEmDiasUteis,
    aplicouDobro: resultado.aplicouDobro,
    tempoLeituraAplicado: resultado.tempoLeituraAplicado,
    observacoes: resultado.alertas.join("\n"),
    calculoManual: false,
    workspaceId,
    calculadoPorId: userId,
  };

  await db.insert(calculosPrazos).values(calculoData);
}

// ==========================================
// TIPOS DE PRAZO PRÉ-CONFIGURADOS
// ==========================================

/**
 * Lista de tipos de prazo padrão para seeding inicial
 */
export const TIPOS_PRAZO_PADRAO: Array<Omit<TipoPrazo, "id" | "createdAt" | "updatedAt">> = [
  // CRIMINAL - INSTRUÇÃO
  {
    codigo: "RESPOSTA_ACUSACAO",
    nome: "Resposta à Acusação",
    descricao: "Art. 396-A CPP - Prazo para resposta escrita à acusação",
    prazoLegalDias: 10,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "MANIFESTACAO",
    fase: "INSTRUCAO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "ALEGACOES_FINAIS_MEMORIAIS",
    nome: "Alegações Finais / Memoriais",
    descricao: "Art. 403 CPP - Prazo para alegações finais após instrução",
    prazoLegalDias: 5,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "AUDIENCIA",
    categoria: "MANIFESTACAO",
    fase: "INSTRUCAO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "ALEGACOES_FINAIS_JURI",
    nome: "Alegações Finais (Júri)",
    descricao: "Art. 411 CPP - Alegações finais antes da pronúncia",
    prazoLegalDias: 5,
    areaDireito: "JURI",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "AUDIENCIA",
    categoria: "MANIFESTACAO",
    fase: "INSTRUCAO",
    isActive: true,
    workspaceId: null,
  },

  // CRIMINAL - RECURSOS
  {
    codigo: "APELACAO",
    nome: "Apelação Criminal",
    descricao: "Art. 593 CPP - Prazo para interpor apelação",
    prazoLegalDias: 5,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "RAZOES_APELACAO",
    nome: "Razões de Apelação",
    descricao: "Art. 600 CPP - Prazo para apresentar razões de apelação",
    prazoLegalDias: 8,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "CONTRARRAZOES_APELACAO",
    nome: "Contrarrazões de Apelação",
    descricao: "Art. 600 CPP - Prazo para contrarrazões",
    prazoLegalDias: 8,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "RESE",
    nome: "Recurso em Sentido Estrito (RESE)",
    descricao: "Art. 586 CPP - Prazo para interpor RESE",
    prazoLegalDias: 5,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "RAZOES_RESE",
    nome: "Razões de RESE",
    descricao: "Art. 588 CPP - Prazo para razões do RESE",
    prazoLegalDias: 2,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "AGRAVO_EXECUCAO",
    nome: "Agravo em Execução Penal",
    descricao: "Art. 197 LEP - Prazo para agravo em execução",
    prazoLegalDias: 5,
    areaDireito: "EXECUCAO_PENAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "EXECUCAO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "EMBARGOS_DECLARACAO",
    nome: "Embargos de Declaração",
    descricao: "Art. 382/619 CPP - Prazo para embargos de declaração",
    prazoLegalDias: 2,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "RESP",
    nome: "Recurso Especial",
    descricao: "Art. 1.029 CPC - Prazo para REsp",
    prazoLegalDias: 15,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "RE",
    nome: "Recurso Extraordinário",
    descricao: "Art. 1.029 CPC - Prazo para RE",
    prazoLegalDias: 15,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "AGRAVO_RESP_RE",
    nome: "Agravo em REsp/RE",
    descricao: "Art. 1.042 CPC - Prazo para agravo contra inadmissão de REsp/RE",
    prazoLegalDias: 15,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },

  // HABEAS CORPUS
  {
    codigo: "HABEAS_CORPUS",
    nome: "Habeas Corpus",
    descricao: "Art. 5º, LXVIII CF - Sem prazo legal (urgência)",
    prazoLegalDias: 0,
    areaDireito: "CRIMINAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: false,
    tempoLeituraDias: 0,
    termoInicial: "INTIMACAO",
    categoria: "PETICAO",
    fase: "INSTRUCAO",
    isActive: true,
    workspaceId: null,
  },

  // EXECUÇÃO PENAL
  {
    codigo: "PEDIDO_PROGRESSAO",
    nome: "Pedido de Progressão de Regime",
    descricao: "Art. 112 LEP - Pedido de progressão",
    prazoLegalDias: 0,
    areaDireito: "EXECUCAO_PENAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: false,
    tempoLeituraDias: 0,
    termoInicial: "INTIMACAO",
    categoria: "PETICAO",
    fase: "EXECUCAO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "PEDIDO_LIVRAMENTO",
    nome: "Pedido de Livramento Condicional",
    descricao: "Art. 83 CP / Art. 131 LEP - Pedido de LC",
    prazoLegalDias: 0,
    areaDireito: "EXECUCAO_PENAL",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: false,
    tempoLeituraDias: 0,
    termoInicial: "INTIMACAO",
    categoria: "PETICAO",
    fase: "EXECUCAO",
    isActive: true,
    workspaceId: null,
  },

  // JÚRI
  {
    codigo: "RESE_PRONUNCIA",
    nome: "RESE contra Pronúncia",
    descricao: "Art. 581, IV CPP - Recurso contra pronúncia",
    prazoLegalDias: 5,
    areaDireito: "JURI",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "INSTRUCAO",
    isActive: true,
    workspaceId: null,
  },
  {
    codigo: "APELACAO_JURI",
    nome: "Apelação (Júri)",
    descricao: "Art. 593, III CPP - Apelação contra decisão do júri",
    prazoLegalDias: 5,
    areaDireito: "JURI",
    contarEmDiasUteis: false,
    aplicarDobroDefensoria: true,
    tempoLeituraDias: 10,
    termoInicial: "INTIMACAO",
    categoria: "RECURSO",
    fase: "RECURSO",
    isActive: true,
    workspaceId: null,
  },
];

/**
 * Popula tipos de prazo padrão no banco
 */
export async function seedTiposPrazo(): Promise<number> {
  let inserted = 0;

  for (const tipo of TIPOS_PRAZO_PADRAO) {
    try {
      // Verificar se já existe
      const [existing] = await db
        .select()
        .from(tipoPrazos)
        .where(eq(tipoPrazos.codigo, tipo.codigo))
        .limit(1);

      if (!existing) {
        await db.insert(tipoPrazos).values(tipo as any);
        inserted++;
      }
    } catch (error) {
      console.error(`Erro ao inserir tipo de prazo ${tipo.codigo}:`, error);
    }
  }

  return inserted;
}
