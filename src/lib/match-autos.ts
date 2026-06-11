// src/lib/match-autos.ts
/** Casa os PDFs do assistido com o processo da audiência/demanda. Lógica pura. */

const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

export interface AutoFile {
  id: number;
  driveFileId: string;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: number | string | null;
  enrichmentStatus?: string | null;
  processoId?: number | null;
}

export interface Correlato {
  cnj: string;
  classe?: string | null;
}

export interface GrupoCorrelato<T> {
  cnj: string;
  classe?: string | null;
  files: T[];
}

export interface ClassificacaoAutos<T> {
  desteProcesso: T[];
  correlacionados: GrupoCorrelato<T>[];
  outros: T[];
}

export function extrairCNJ(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const m = nome.match(CNJ_RE);
  return m ? m[0] : null;
}

const soDigitos = (s: string | null) => (s ? s.replace(/\D/g, "") : "");

export function classificarAutos<T extends AutoFile>(opts: {
  files: T[];
  processoId: number;
  processoCNJ: string | null;
  correlatos: Correlato[];
}): ClassificacaoAutos<T> {
  const alvo = soDigitos(opts.processoCNJ);
  const correlMap = new Map<string, Correlato>();
  for (const c of opts.correlatos) correlMap.set(soDigitos(c.cnj), c);

  const desteProcesso: T[] = [];
  const outros: T[] = [];
  const correlGroups = new Map<string, GrupoCorrelato<T>>();

  for (const file of opts.files) {
    const cnjFile = soDigitos(extrairCNJ(file.name));
    if (file.processoId === opts.processoId || (alvo && cnjFile === alvo)) {
      desteProcesso.push(file);
    } else if (cnjFile && correlMap.has(cnjFile)) {
      const meta = correlMap.get(cnjFile)!;
      const g = correlGroups.get(cnjFile) ?? { cnj: meta.cnj, classe: meta.classe, files: [] };
      g.files.push(file);
      correlGroups.set(cnjFile, g);
    } else {
      outros.push(file);
    }
  }

  return { desteProcesso, correlacionados: [...correlGroups.values()], outros };
}
