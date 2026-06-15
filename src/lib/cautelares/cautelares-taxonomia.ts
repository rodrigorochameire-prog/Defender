// src/lib/cautelares/cautelares-taxonomia.ts
// Catálogo canônico das medidas cautelares pessoais no processo penal:
// prisão (preventiva, temporária, domiciliar) e medidas diversas da prisão
// (art. 319 e 320 do CPP). Única fonte de verdade dos códigos e gatilhos de parsing.

export const CAUTELAR = {
  // Prisão
  PRISAO_PREVENTIVA: "PRISAO_PREVENTIVA",
  PRISAO_TEMPORARIA: "PRISAO_TEMPORARIA",
  PRISAO_DOMICILIAR: "PRISAO_DOMICILIAR",
  // Diversas da prisão — art. 319 CPP
  COMPARECIMENTO_PERIODICO: "COMPARECIMENTO_PERIODICO", // I
  PROIBICAO_ACESSO_LUGARES: "PROIBICAO_ACESSO_LUGARES", // II
  PROIBICAO_CONTATO: "PROIBICAO_CONTATO", // III
  PROIBICAO_AUSENTAR_COMARCA: "PROIBICAO_AUSENTAR_COMARCA", // IV
  RECOLHIMENTO_NOTURNO: "RECOLHIMENTO_NOTURNO", // V
  SUSPENSAO_FUNCAO: "SUSPENSAO_FUNCAO", // VI
  INTERNACAO_PROVISORIA: "INTERNACAO_PROVISORIA", // VII
  FIANCA: "FIANCA", // VIII
  MONITORACAO_ELETRONICA: "MONITORACAO_ELETRONICA", // IX
  // Art. 320 CPP
  PROIBICAO_AUSENTAR_PAIS: "PROIBICAO_AUSENTAR_PAIS",
  OUTRA: "OUTRA",
} as const;

export type CautelarCodigo = (typeof CAUTELAR)[keyof typeof CAUTELAR];

/** Espécie da cautelar — prisão ou diversa da prisão. */
export type EspecieCautelar = "prisao" | "diversa";

export const STATUS_CAUTELAR = {
  ATIVA: "ativa",
  REVOGADA: "revogada",
  SUBSTITUIDA: "substituida",
  CUMPRIDA: "cumprida",
} as const;

export interface CatalogoCautelar {
  codigo: CautelarCodigo;
  especie: EspecieCautelar;
  artigo: string;
  rotulo: string;
  /** Regex de gatilho (aplicada sobre texto normalizado: minúsculo, sem acento). */
  gatilhos: RegExp[];
}

// Ordem importa: itens mais específicos antes do fallback OUTRA. Em particular,
// a prisão domiciliar (art. 318) vem antes do recolhimento noturno (art. 319, V)
// para não confundir "recolhimento domiciliar integral" com o noturno.
export const CATALOGO_CAUTELARES: CatalogoCautelar[] = [
  {
    codigo: CAUTELAR.PRISAO_TEMPORARIA,
    especie: "prisao",
    artigo: "Lei 7.960/89",
    rotulo: "Prisão temporária",
    gatilhos: [/prisao temporaria/],
  },
  {
    codigo: CAUTELAR.PRISAO_DOMICILIAR,
    especie: "prisao",
    artigo: "318 CPP",
    rotulo: "Prisão domiciliar",
    gatilhos: [
      /prisao domiciliar/,
      /recolhimento domiciliar integral/,
      /substitu\w*.{0,40}prisao.{0,20}domiciliar/,
    ],
  },
  {
    codigo: CAUTELAR.PRISAO_PREVENTIVA,
    especie: "prisao",
    artigo: "312/313 CPP",
    rotulo: "Prisão preventiva",
    gatilhos: [
      /prisao preventiva/,
      /decret\w*.{0,25}preventiva/,
      /convert\w*.{0,30}prisao preventiva/,
      /\bpreventivamente\b/,
    ],
  },
  {
    codigo: CAUTELAR.COMPARECIMENTO_PERIODICO,
    especie: "diversa",
    artigo: "319, I",
    rotulo: "Comparecimento periódico em juízo",
    gatilhos: [
      /comparecimento periodico/,
      /comparec\w*.{0,40}juizo.{0,30}(mensal|quinzenal|semanal|periodic)/,
      /apresenta\w*.{0,30}periodic/,
    ],
  },
  {
    codigo: CAUTELAR.PROIBICAO_ACESSO_LUGARES,
    especie: "diversa",
    artigo: "319, II",
    rotulo: "Proibição de acesso ou frequência a determinados lugares",
    gatilhos: [
      /proibicao de (acesso|frequencia|frequentar).{0,40}(lugar|local|estabelecimento)/,
      /proibi\w*.{0,15}(de )?frequentar.{0,30}(lugar|local)/,
    ],
  },
  {
    codigo: CAUTELAR.PROIBICAO_CONTATO,
    especie: "diversa",
    artigo: "319, III",
    rotulo: "Proibição de manter contato com pessoa determinada",
    gatilhos: [
      /proibicao de (manter )?contato com (pessoa|determinad)/,
      /proibi\w*.{0,15}(de )?(manter )?contato com.{0,30}(vitima|testemunha|corre\w*|determinad)/,
    ],
  },
  {
    codigo: CAUTELAR.PROIBICAO_AUSENTAR_COMARCA,
    especie: "diversa",
    artigo: "319, IV",
    rotulo: "Proibição de ausentar-se da comarca",
    gatilhos: [
      /proibicao de (se )?ausentar.{0,20}(da )?comarca/,
      /nao (se )?ausentar.{0,15}(da )?comarca/,
      /proibi\w*.{0,20}ausentar.{0,15}comarca/,
    ],
  },
  {
    codigo: CAUTELAR.RECOLHIMENTO_NOTURNO,
    especie: "diversa",
    artigo: "319, V",
    rotulo: "Recolhimento domiciliar no período noturno e nos dias de folga",
    gatilhos: [
      /recolhimento (domiciliar )?(no periodo )?noturno/,
      /recolher-se.{0,30}(periodo )?noturno/,
      /recolhimento.{0,20}noturno.{0,20}folga/,
    ],
  },
  {
    codigo: CAUTELAR.SUSPENSAO_FUNCAO,
    especie: "diversa",
    artigo: "319, VI",
    rotulo: "Suspensão do exercício de função pública ou de atividade econômica/financeira",
    gatilhos: [
      /suspensao do exercicio de funcao publica/,
      /suspensao.{0,25}(de )?atividade (economica|financeira)/,
      /afastamento.{0,20}(da )?funcao publica/,
    ],
  },
  {
    codigo: CAUTELAR.INTERNACAO_PROVISORIA,
    especie: "diversa",
    artigo: "319, VII",
    rotulo: "Internação provisória",
    gatilhos: [/internacao provisoria/],
  },
  {
    codigo: CAUTELAR.FIANCA,
    especie: "diversa",
    artigo: "319, VIII",
    rotulo: "Fiança",
    gatilhos: [
      /\bfianca\b/,
      /arbitr\w*.{0,15}fianca/,
    ],
  },
  {
    codigo: CAUTELAR.MONITORACAO_ELETRONICA,
    especie: "diversa",
    artigo: "319, IX",
    rotulo: "Monitoração eletrônica",
    gatilhos: [/monitoracao eletronica/, /tornozeleira/],
  },
  {
    codigo: CAUTELAR.PROIBICAO_AUSENTAR_PAIS,
    especie: "diversa",
    artigo: "320 CPP",
    rotulo: "Proibição de ausentar-se do país (entrega de passaporte)",
    gatilhos: [
      /ausentar-se do pais/,
      /proibicao.{0,20}(de )?sair do pais/,
      /entrega.{0,15}passaporte/,
    ],
  },
];

export const STATUS_CAUTELAR_LABEL: Record<string, string> = {
  ativa: "Ativa",
  revogada: "Revogada",
  substituida: "Substituída",
  cumprida: "Cumprida",
};

const ROTULO_POR_CODIGO: Record<string, { rotulo: string; artigo: string }> =
  Object.fromEntries(
    CATALOGO_CAUTELARES.map((c) => [c.codigo, { rotulo: c.rotulo, artigo: c.artigo }]),
  );

/** Rótulo legível de uma cautelar pelo código. */
export function rotuloCautelar(codigo: string): string {
  return ROTULO_POR_CODIGO[codigo]?.rotulo ?? codigo;
}

/** Artigo legal de uma cautelar pelo código. */
export function artigoCautelar(codigo: string): string {
  return ROTULO_POR_CODIGO[codigo]?.artigo ?? "";
}

/** Normaliza texto para matching: minúsculo, sem acentos, espaços colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
