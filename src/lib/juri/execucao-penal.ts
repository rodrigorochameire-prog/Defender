/**
 * Calculadora de Execucao Penal - Defensoria Publica
 *
 * Engine PURO TypeScript - sem dependencias de banco de dados.
 * Calcula marcos de execucao penal (progressao de regime, livramento
 * condicional, saida temporaria, etc.) com base na legislacao brasileira.
 *
 * LEGISLACAO IMPLEMENTADA:
 * - Art. 112, LEP (Lei 7.210/84) - Progressao de regime
 * - Lei 13.964/2019 (Pacote Anticrime) - Novas fracoes de progressao
 * - Lei 14.994/2024 (Feminicidio) - Fracao de 55% para feminicidio
 * - Art. 83, CP - Livramento condicional
 * - Art. 42, CP - Detracao penal
 * - Art. 122, LEP - Saida temporaria
 *
 * PRINCIPIO DA IRRETROATIVIDADE (Art. 5, XL, CF):
 * Aplica-se a lei vigente na data do FATO, salvo se mais benefica.
 * Este calculador aplica a lei vigente na data do fato sem retroagir
 * o Pacote Anticrime para fatos anteriores a 23/01/2020.
 *
 * CONVENCAO DE CALCULO:
 * - 1 mes = 30 dias (simplificacao juridica padrao)
 * - Pena total em meses -> convertida para dias (x30)
 */

// ==========================================
// CONSTANTES LEGAIS
// ==========================================

/** Data de vigencia do Pacote Anticrime (Lei 13.964/2019) */
const PACOTE_ANTICRIME = new Date("2020-01-23");

/** Data de vigencia da Lei 14.994/2024 (fracao 55% feminicidio) */
const LEI_FEMINICIDIO_2024 = new Date("2024-10-10");

/** Dias por mes para calculo penal */
const DIAS_POR_MES = 30;

// ==========================================
// TIPOS
// ==========================================

export type TipoPenal =
  | "homicidio_simples"
  | "homicidio_qualificado"
  | "homicidio_privilegiado"
  | "homicidio_privilegiado_qualificado"
  | "homicidio_tentado"
  | "feminicidio";

export type RegimeInicial = "fechado" | "semiaberto" | "aberto";

export interface ExecucaoPenalInput {
  tipoPenal: TipoPenal;
  penaTotalMeses: number;
  regimeInicial: RegimeInicial;
  /** Data do fato (ISO date string, ex: "2023-05-15") */
  dataFato: string;
  /** Data da condenacao (ISO date string) */
  dataCondenacao: string;
  reuPrimario: boolean;
  resultouMorte: boolean;
  /** Data de inicio da prisao preventiva (ISO date string). Se ausente, sem detracao. */
  detracaoInicio?: string;
}

export interface MarcoExecucao {
  tipo:
    | "detracao"
    | "progressao_1"
    | "progressao_2"
    | "saida_temporaria"
    | "livramento_condicional"
    | "fim_pena";
  /** Label tecnico-juridico */
  label: string;
  /** Label acessivel para o assistido e familiares */
  labelAcessivel: string;
  /** Data do marco (ISO date string) */
  data: string;
  /** Dias cumpridos ate este marco (a partir da condenacao) */
  diasCumpridos: number;
  /** Fracao aplicada para este marco (ex: "2/5", "25%") */
  fracao?: string;
  /** Fundamento legal (artigo e lei) */
  fundamentoLegal: string;
}

export interface ExecucaoPenalResult {
  marcos: MarcoExecucao[];
  fracaoProgressao: number;
  fracaoLabel: string;
  incisoAplicado: string;
  vedadoLivramento: boolean;
  saldoPenaDias: number;
  detracaoDias: number;
  penaTotalDias: number;
  regimeLegal: "pre_anticrime" | "pos_anticrime" | "pos_feminicidio_2024";
}

// ==========================================
// FUNCOES AUXILIARES
// ==========================================

/**
 * Formata Date para dd/mm/aaaa (padrao brasileiro)
 */
function formatBR(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Converte ISO date string para Date (meia-noite UTC para evitar timezone issues)
 */
function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Adiciona dias a uma data, retornando nova Date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calcula diferenca em dias entre duas datas (b - a)
 */
function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Converte Date para ISO date string (YYYY-MM-DD)
 */
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ==========================================
// CLASSIFICACAO DO CRIME
// ==========================================

/**
 * Determina se o tipo penal e considerado HEDIONDO
 * (Lei 8.072/90, art. 1)
 *
 * Homicidio qualificado e hediondo (art. 1, I).
 * Homicidio simples nao e hediondo (salvo grupo de exterminio - nao tratado aqui).
 * Homicidio privilegiado-qualificado: doutrina/STJ dominante trata como hediondo
 * (qualificadora objetiva + privilegio subjetivo coexistem).
 * Feminicidio e qualificado por natureza (art. 121, par. 2, VI, CP) -> hediondo.
 */
function isHediondo(tipo: TipoPenal): boolean {
  switch (tipo) {
    case "homicidio_qualificado":
    case "homicidio_privilegiado_qualificado":
    case "feminicidio":
      return true;
    case "homicidio_simples":
    case "homicidio_privilegiado":
    case "homicidio_tentado":
      return false;
  }
}

/**
 * Determina se o tipo penal envolve violencia contra pessoa.
 * Todos os homicidios envolvem violencia.
 */
function isViolento(tipo: TipoPenal): boolean {
  // Todos os tipos penais tratados aqui (homicidios) envolvem violencia
  return true;
}

// ==========================================
// REGIME LEGAL APLICAVEL
// ==========================================

type RegimeLegal = "pre_anticrime" | "pos_anticrime" | "pos_feminicidio_2024";

/**
 * Determina o regime legal aplicavel com base na data do fato.
 * Principio da irretroatividade da lei penal mais gravosa.
 */
function determinarRegimeLegal(
  dataFato: Date,
  tipoPenal: TipoPenal
): RegimeLegal {
  // Feminicidio com fracao 55%: somente fatos >= 10/10/2024
  if (tipoPenal === "feminicidio" && dataFato >= LEI_FEMINICIDIO_2024) {
    return "pos_feminicidio_2024";
  }

  // Pacote Anticrime: fatos >= 23/01/2020
  if (dataFato >= PACOTE_ANTICRIME) {
    return "pos_anticrime";
  }

  return "pre_anticrime";
}

// ==========================================
// FRACOES DE PROGRESSAO - ART. 112, LEP
// ==========================================

interface FracaoProgressao {
  fracao: number;
  label: string;
  inciso: string;
  vedaLivramento: boolean;
}

/**
 * Calcula a fracao de progressao de regime aplicavel.
 *
 * Pre-Pacote Anticrime:
 *   - Comum: 1/6
 *   - Hediondo primario: 2/5
 *   - Hediondo reincidente: 3/5
 *
 * Pos-Pacote Anticrime (art. 112, LEP):
 *   III  - 25%: primario + violencia (homicidio simples/privilegiado)
 *   IV   - 30%: reincidente + violencia
 *   V    - 40%: hediondo primario (homicidio qualificado)
 *   VI-a - 50%: hediondo + resultado morte, primario
 *   VI-A - 55%: feminicidio primario (Lei 14.994/2024, >= 10/10/2024)
 *   VII  - 60%: hediondo reincidente
 *   VIII - 70%: hediondo reincidente + resultado morte
 *
 * Homicidio tentado: segue fracao do crime base (violencia),
 * tipicamente 25% primario / 30% reincidente.
 */
function obterFracaoProgressao(
  tipoPenal: TipoPenal,
  reuPrimario: boolean,
  resultouMorte: boolean,
  regimeLegal: RegimeLegal
): FracaoProgressao {
  // ---- PRE-PACOTE ANTICRIME ----
  if (regimeLegal === "pre_anticrime") {
    if (isHediondo(tipoPenal)) {
      if (reuPrimario) {
        return {
          fracao: 2 / 5,
          label: "2/5",
          inciso: "Art. 112, LEP (redacao anterior) c/c Lei 11.464/07",
          vedaLivramento: false,
        };
      }
      return {
        fracao: 3 / 5,
        label: "3/5",
        inciso: "Art. 112, LEP (redacao anterior) c/c Lei 11.464/07",
        vedaLivramento: false,
      };
    }
    // Crime comum (simples, privilegiado, tentado)
    return {
      fracao: 1 / 6,
      label: "1/6",
      inciso: "Art. 112, LEP (redacao anterior)",
      vedaLivramento: false,
    };
  }

  // ---- POS-FEMINICIDIO 2024 ----
  if (regimeLegal === "pos_feminicidio_2024") {
    // Feminicidio com Lei 14.994/2024
    if (reuPrimario) {
      return {
        fracao: 0.55,
        label: "55%",
        inciso: "Art. 112, VI-A, LEP (Lei 14.994/2024)",
        vedaLivramento: true,
      };
    }
    // Feminicidio reincidente: aplica inciso VII (60%) ou VIII (70%)
    if (resultouMorte) {
      return {
        fracao: 0.7,
        label: "70%",
        inciso: "Art. 112, VIII, LEP",
        vedaLivramento: true,
      };
    }
    return {
      fracao: 0.6,
      label: "60%",
      inciso: "Art. 112, VII, LEP",
      vedaLivramento: false,
    };
  }

  // ---- POS-PACOTE ANTICRIME ----
  const hediondo = isHediondo(tipoPenal);

  // Homicidio tentado: violencia sem ser hediondo
  if (tipoPenal === "homicidio_tentado") {
    if (reuPrimario) {
      return {
        fracao: 0.25,
        label: "25%",
        inciso: "Art. 112, III, LEP",
        vedaLivramento: false,
      };
    }
    return {
      fracao: 0.3,
      label: "30%",
      inciso: "Art. 112, IV, LEP",
      vedaLivramento: false,
    };
  }

  if (hediondo) {
    // Hediondo + resultado morte
    if (resultouMorte) {
      if (reuPrimario) {
        // Inciso VI-a: 50% hediondo + morte + primario
        return {
          fracao: 0.5,
          label: "50%",
          inciso: "Art. 112, VI, alinea a, LEP",
          vedaLivramento: true,
        };
      }
      // Inciso VIII: 70% hediondo + morte + reincidente
      return {
        fracao: 0.7,
        label: "70%",
        inciso: "Art. 112, VIII, LEP",
        vedaLivramento: true,
      };
    }

    // Hediondo sem resultado morte
    if (reuPrimario) {
      // Feminicidio pre-Lei 14.994: aplica inciso V (40%)
      // Homicidio qualificado / priv-qualificado: inciso V (40%)
      return {
        fracao: 0.4,
        label: "40%",
        inciso: "Art. 112, V, LEP",
        vedaLivramento: false,
      };
    }
    // Inciso VII: 60% hediondo + reincidente
    return {
      fracao: 0.6,
      label: "60%",
      inciso: "Art. 112, VII, LEP",
      vedaLivramento: false,
    };
  }

  // Crime com violencia, nao hediondo (simples, privilegiado)
  if (reuPrimario) {
    return {
      fracao: 0.25,
      label: "25%",
      inciso: "Art. 112, III, LEP",
      vedaLivramento: false,
    };
  }
  return {
    fracao: 0.3,
    label: "30%",
    inciso: "Art. 112, IV, LEP",
    vedaLivramento: false,
  };
}

// ==========================================
// FRACAO DE LIVRAMENTO CONDICIONAL
// ==========================================

interface FracaoLivramento {
  fracao: number;
  label: string;
  fundamento: string;
}

/**
 * Calcula fracao para livramento condicional (art. 83, CP).
 *
 * - Primario, crime comum: 1/3
 * - Reincidente: 1/2
 * - Hediondo (primario ou reincidente): 2/3
 *
 * Vedacao: crimes hediondos com resultado morte (vedado pelo Pacote Anticrime)
 * e feminicidio sob Lei 14.994/2024.
 */
function obterFracaoLivramento(
  tipoPenal: TipoPenal,
  reuPrimario: boolean,
  vedadoLivramento: boolean
): FracaoLivramento | null {
  if (vedadoLivramento) {
    return null;
  }

  const hediondo = isHediondo(tipoPenal);

  if (hediondo) {
    return {
      fracao: 2 / 3,
      label: "2/3",
      fundamento: "Art. 83, V, CP",
    };
  }

  if (!reuPrimario) {
    return {
      fracao: 1 / 2,
      label: "1/2",
      fundamento: "Art. 83, II, CP",
    };
  }

  return {
    fracao: 1 / 3,
    label: "1/3",
    fundamento: "Art. 83, I, CP",
  };
}

// ==========================================
// FUNCAO PRINCIPAL
// ==========================================

/**
 * Calcula todos os marcos de execucao penal com base nos parametros do caso.
 *
 * Fluxo:
 * 1. Determina regime legal (irretroatividade)
 * 2. Obtem fracao de progressao
 * 3. Calcula detracao (prisao preventiva)
 * 4. Calcula saldo de pena
 * 5. Gera marcos (progressao, saida temporaria, livramento, fim de pena)
 * 6. Ordena marcos por data
 */
export function calcularExecucaoPenal(
  input: ExecucaoPenalInput
): ExecucaoPenalResult {
  const dataFato = parseISO(input.dataFato);
  const dataCondenacao = parseISO(input.dataCondenacao);
  const penaTotalDias = input.penaTotalMeses * DIAS_POR_MES;

  // 1. Regime legal aplicavel
  const regimeLegal = determinarRegimeLegal(dataFato, input.tipoPenal);

  // 2. Fracao de progressao
  const progressaoInfo = obterFracaoProgressao(
    input.tipoPenal,
    input.reuPrimario,
    input.resultouMorte,
    regimeLegal
  );

  // 3. Detracao penal (art. 42, CP)
  let detracaoDias = 0;
  if (input.detracaoInicio) {
    const detracaoInicio = parseISO(input.detracaoInicio);
    detracaoDias = diffDays(detracaoInicio, dataCondenacao);
    if (detracaoDias < 0) detracaoDias = 0;
  }

  // 4. Saldo de pena
  const saldoPenaDias = Math.max(penaTotalDias - detracaoDias, 0);

  // 5. Gerar marcos
  const marcos: MarcoExecucao[] = [];

  // --- Marco: Detracao ---
  if (detracaoDias > 0) {
    marcos.push({
      tipo: "detracao",
      label: `Detracao: ${detracaoDias} dias`,
      labelAcessivel: `Voce ficou ${detracaoDias} dias preso antes da condenacao. Esse tempo e descontado da pena.`,
      data: input.dataCondenacao,
      diasCumpridos: 0,
      fundamentoLegal: "Art. 42, CP",
    });
  }

  // Ponto de partida para calculo dos marcos:
  // A condenacao e o marco zero. Os dias de detracao ja foram
  // subtraidos do saldo, entao os marcos sao calculados sobre o saldo.
  const baseDate = dataCondenacao;

  // --- Progressao de regime ---
  // Depende do regime inicial
  if (input.regimeInicial === "fechado") {
    // Progressao 1: fechado -> semiaberto
    const diasProgressao1 = Math.ceil(saldoPenaDias * progressaoInfo.fracao);
    const dataProgressao1 = addDays(baseDate, diasProgressao1);

    marcos.push({
      tipo: "progressao_1",
      label: `Progressao fechado -> semiaberto (${progressaoInfo.label} de ${saldoPenaDias} dias)`,
      labelAcessivel: `Pode pedir mudanca para regime semiaberto em ${formatBR(dataProgressao1)}.`,
      data: toISO(dataProgressao1),
      diasCumpridos: diasProgressao1,
      fracao: progressaoInfo.label,
      fundamentoLegal: progressaoInfo.inciso,
    });

    // Saida temporaria: disponivel no regime semiaberto + cumprido 1/6 do total
    // Art. 122, LEP: regime semiaberto + 1/6 da pena cumprido
    const diasSaidaTemporaria = Math.ceil(saldoPenaDias / 6);
    // A saida temporaria e a partir do maior entre: data da progressao 1 e 1/6 da pena
    const dataSaidaTemporaria =
      diasSaidaTemporaria > diasProgressao1
        ? addDays(baseDate, diasSaidaTemporaria)
        : dataProgressao1;
    const diasCumpridosSaida = Math.max(diasSaidaTemporaria, diasProgressao1);

    marcos.push({
      tipo: "saida_temporaria",
      label: `Saida temporaria (1/6 de ${saldoPenaDias} dias, apos regime semiaberto)`,
      labelAcessivel: `Pode solicitar saida temporaria a partir de ${formatBR(dataSaidaTemporaria)}.`,
      data: toISO(dataSaidaTemporaria),
      diasCumpridos: diasCumpridosSaida,
      fracao: "1/6",
      fundamentoLegal: "Art. 122, LEP",
    });

    // Progressao 2: semiaberto -> aberto
    // Calcula-se a mesma fracao sobre o saldo restante apos progressao 1
    const saldoAposProgressao1 = saldoPenaDias - diasProgressao1;
    const diasProgressao2Parcial = Math.ceil(
      saldoAposProgressao1 * progressaoInfo.fracao
    );
    const diasProgressao2Total = diasProgressao1 + diasProgressao2Parcial;
    const dataProgressao2 = addDays(baseDate, diasProgressao2Total);

    marcos.push({
      tipo: "progressao_2",
      label: `Progressao semiaberto -> aberto (${progressaoInfo.label} de ${saldoAposProgressao1} dias restantes)`,
      labelAcessivel: `Pode pedir mudanca para regime aberto em ${formatBR(dataProgressao2)}.`,
      data: toISO(dataProgressao2),
      diasCumpridos: diasProgressao2Total,
      fracao: progressaoInfo.label,
      fundamentoLegal: progressaoInfo.inciso,
    });
  } else if (input.regimeInicial === "semiaberto") {
    // Ja inicia no semiaberto: sem progressao 1 (fechado -> semiaberto)

    // Saida temporaria: 1/6 da pena no semiaberto
    const diasSaidaTemporaria = Math.ceil(saldoPenaDias / 6);
    const dataSaidaTemporaria = addDays(baseDate, diasSaidaTemporaria);

    marcos.push({
      tipo: "saida_temporaria",
      label: `Saida temporaria (1/6 de ${saldoPenaDias} dias)`,
      labelAcessivel: `Pode solicitar saida temporaria a partir de ${formatBR(dataSaidaTemporaria)}.`,
      data: toISO(dataSaidaTemporaria),
      diasCumpridos: diasSaidaTemporaria,
      fracao: "1/6",
      fundamentoLegal: "Art. 122, LEP",
    });

    // Progressao: semiaberto -> aberto
    const diasProgressao = Math.ceil(saldoPenaDias * progressaoInfo.fracao);
    const dataProgressao = addDays(baseDate, diasProgressao);

    marcos.push({
      tipo: "progressao_2",
      label: `Progressao semiaberto -> aberto (${progressaoInfo.label} de ${saldoPenaDias} dias)`,
      labelAcessivel: `Pode pedir mudanca para regime aberto em ${formatBR(dataProgressao)}.`,
      data: toISO(dataProgressao),
      diasCumpridos: diasProgressao,
      fracao: progressaoInfo.label,
      fundamentoLegal: progressaoInfo.inciso,
    });
  }
  // Regime aberto: sem progressao de regime (ja esta no mais brando)

  // --- Livramento condicional ---
  const fracaoLivramento = obterFracaoLivramento(
    input.tipoPenal,
    input.reuPrimario,
    progressaoInfo.vedaLivramento
  );

  if (fracaoLivramento) {
    const diasLivramento = Math.ceil(saldoPenaDias * fracaoLivramento.fracao);
    const dataLivramento = addDays(baseDate, diasLivramento);

    marcos.push({
      tipo: "livramento_condicional",
      label: `Livramento condicional (${fracaoLivramento.label} de ${saldoPenaDias} dias)`,
      labelAcessivel: `Pode solicitar livramento condicional em ${formatBR(dataLivramento)}.`,
      data: toISO(dataLivramento),
      diasCumpridos: diasLivramento,
      fracao: fracaoLivramento.label,
      fundamentoLegal: fracaoLivramento.fundamento,
    });
  }

  // --- Fim da pena ---
  const dataFimPena = addDays(baseDate, saldoPenaDias);

  marcos.push({
    tipo: "fim_pena",
    label: `Fim da pena (${saldoPenaDias} dias)`,
    labelAcessivel: `Previsao de cumprimento total da pena: ${formatBR(dataFimPena)}.`,
    data: toISO(dataFimPena),
    diasCumpridos: saldoPenaDias,
    fundamentoLegal: "Art. 1, LEP",
  });

  // 6. Ordenar marcos por data
  marcos.sort((a, b) => a.data.localeCompare(b.data));

  return {
    marcos,
    fracaoProgressao: progressaoInfo.fracao,
    fracaoLabel: progressaoInfo.label,
    incisoAplicado: progressaoInfo.inciso,
    vedadoLivramento: progressaoInfo.vedaLivramento,
    saldoPenaDias,
    detracaoDias,
    penaTotalDias,
    regimeLegal,
  };
}
