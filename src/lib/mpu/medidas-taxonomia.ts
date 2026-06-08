// src/lib/mpu/medidas-taxonomia.ts
// Catálogo canônico das medidas protetivas de urgência (Lei 11.340/2006).
// Única fonte de verdade dos códigos, vocabulários e gatilhos de parsing.

export const MEDIDA_MPU = {
  SUSPENSAO_PORTE_ARMA: "SUSPENSAO_PORTE_ARMA",
  AFASTAMENTO_LAR: "AFASTAMENTO_LAR",
  PROIBICAO_APROXIMACAO: "PROIBICAO_APROXIMACAO",
  PROIBICAO_CONTATO: "PROIBICAO_CONTATO",
  PROIBICAO_FREQUENTAR: "PROIBICAO_FREQUENTAR",
  RESTRICAO_VISITAS: "RESTRICAO_VISITAS",
  ALIMENTOS_PROVISORIOS: "ALIMENTOS_PROVISORIOS",
  MONITORACAO_ELETRONICA: "MONITORACAO_ELETRONICA",
  OUTRA: "OUTRA",
} as const;

export type MedidaMpuCodigo = (typeof MEDIDA_MPU)[keyof typeof MEDIDA_MPU];

export type Protegido = "ofendida" | "familiares" | "testemunhas";
export type MeioContato =
  | "telefone"
  | "email"
  | "redes_sociais"
  | "mensagens"
  | "interposta_pessoa";
export type Lugar = "residencia_vitima" | "trabalho_vitima" | "outro";

export interface CatalogoMedida {
  codigo: MedidaMpuCodigo;
  artigo: string;
  rotulo: string;
  /** Regex de gatilho (já aplicada sobre texto normalizado: minúsculo, sem acento). */
  gatilhos: RegExp[];
}

// Ordem importa: itens mais específicos antes do fallback OUTRA.
export const CATALOGO_MEDIDAS: CatalogoMedida[] = [
  {
    codigo: MEDIDA_MPU.SUSPENSAO_PORTE_ARMA,
    artigo: "22, I",
    rotulo: "Suspensão da posse / restrição do porte de armas",
    gatilhos: [/(suspensao|restricao).{0,30}(posse|porte).{0,15}arma/, /entrega.{0,15}arma/],
  },
  {
    codigo: MEDIDA_MPU.AFASTAMENTO_LAR,
    artigo: "22, II",
    rotulo: "Afastamento do lar",
    gatilhos: [/afastamento do (lar|domicilio)/, /afastar-se do (lar|domicilio)/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_APROXIMACAO,
    artigo: "22, III, a",
    rotulo: "Proibição de aproximação",
    gatilhos: [/proibicao de aproximacao/, /proibido.{0,20}aproximar/, /nao.{0,10}aproximar/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_CONTATO,
    artigo: "22, III, b",
    rotulo: "Proibição de contato",
    gatilhos: [/proibicao de contato/, /proibido.{0,20}contato/, /nao.{0,10}contatar/],
  },
  {
    codigo: MEDIDA_MPU.PROIBICAO_FREQUENTAR,
    artigo: "22, III, c",
    rotulo: "Proibição de frequentar lugares",
    gatilhos: [/proibicao de frequentar/, /proibido.{0,20}frequentar/, /nao.{0,10}frequentar/],
  },
  {
    codigo: MEDIDA_MPU.RESTRICAO_VISITAS,
    artigo: "22, IV",
    rotulo: "Restrição/suspensão de visitas aos dependentes",
    gatilhos: [/(restricao|suspensao).{0,20}visita/, /visita.{0,20}dependente/],
  },
  {
    codigo: MEDIDA_MPU.ALIMENTOS_PROVISORIOS,
    artigo: "22, V",
    rotulo: "Alimentos provisórios/provisionais",
    gatilhos: [/alimentos provis(orios|ionais)/, /prestacao de alimentos/],
  },
  {
    codigo: MEDIDA_MPU.MONITORACAO_ELETRONICA,
    artigo: "art. 22",
    rotulo: "Monitoração eletrônica",
    gatilhos: [/monitoracao eletronica/, /tornozeleira/],
  },
];

/** Remove acentos e baixa a caixa — usado em todo matching. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
