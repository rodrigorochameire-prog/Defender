import type { PapelCanonico } from "./tipos";

const MAPA: Record<string, PapelCanonico> = {
  defendido: { papel: "reu", lado: "defesa", subpapel: null },
  vitima: { papel: "vitima", lado: "acusacao", subpapel: null },
  testemunha_acusacao: { papel: "testemunha", lado: "acusacao", subpapel: null },
  testemunha_defesa: { papel: "testemunha", lado: "defesa", subpapel: null },
  perito: { papel: "perito", lado: null, subpapel: null },
  delegado: { papel: "delegado", lado: null, subpapel: null },
  policial_condutor: { papel: "policial", lado: null, subpapel: "condutor" },
  policial: { papel: "policial", lado: null, subpapel: null },
  familiar: { papel: "familiar", lado: null, subpapel: null },
  informante: { papel: "informante", lado: null, subpapel: null },
};

export function mapearPapel(tipoIa: string): PapelCanonico {
  return MAPA[(tipoIa ?? "").trim().toLowerCase()] ?? { papel: "outro", lado: null, subpapel: null };
}
