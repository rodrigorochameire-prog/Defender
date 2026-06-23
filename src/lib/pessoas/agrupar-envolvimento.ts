/**
 * Agregação pura do envolvimento cruzado da pessoa (Ficha 360°).
 *
 * Recebe linhas planas (participação × processo) e agrupa por processo, de modo que
 * a UI renderize um card por processo com N papéis. Sem I/O — o router faz a query
 * e delega o shaping para cá (testável sem banco).
 */

export interface LinhaEnvolvimento {
  participacaoId: number;
  processoId: number;
  papel: string;
  lado: string | null;
  subpapel: string | null;
  resumoNestaCausa: string | null;
  numeroAutos: string | null;
  area: string | null;
  fase: string | null;
  atribuicao: string | null;
  classeProcessual: string | null;
}

export interface PapelEnvolvimento {
  participacaoId: number;
  papel: string;
  lado: string | null;
  subpapel: string | null;
  resumoNestaCausa: string | null;
}

export interface ProcessoEnvolvimento {
  processoId: number;
  numeroAutos: string | null;
  area: string | null;
  fase: string | null;
  atribuicao: string | null;
  classeProcessual: string | null;
  papeis: PapelEnvolvimento[];
}

export function agruparEnvolvimento(rows: LinhaEnvolvimento[]): ProcessoEnvolvimento[] {
  const porProcesso = new Map<number, ProcessoEnvolvimento>();
  for (const r of rows) {
    let g = porProcesso.get(r.processoId);
    if (!g) {
      g = {
        processoId: r.processoId,
        numeroAutos: r.numeroAutos ?? null,
        area: r.area ?? null,
        fase: r.fase ?? null,
        atribuicao: r.atribuicao ?? null,
        classeProcessual: r.classeProcessual ?? null,
        papeis: [],
      };
      porProcesso.set(r.processoId, g);
    }
    g.papeis.push({
      participacaoId: r.participacaoId,
      papel: r.papel,
      lado: r.lado ?? null,
      subpapel: r.subpapel ?? null,
      resumoNestaCausa: r.resumoNestaCausa ?? null,
    });
  }
  return [...porProcesso.values()];
}
