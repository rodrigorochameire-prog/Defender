import { normalizar } from "./cautelares-taxonomia";
import type { RequisitoPreventiva } from "@/lib/db/schema/cautelares";

export interface PreventivaParsed {
  /** Requisitos do art. 312 detectados como presentes (com a frase do juiz). */
  requisitos: RequisitoPreventiva[];
  pressupostos: {
    materialidade: string | null;
    indiciosAutoria: string | null;
  };
  contemporaneidade: string | null;
  /** true quando o texto é, de fato, um decreto/manutenção de preventiva. */
  ehPreventiva: boolean;
}

type RequisitoTipo = RequisitoPreventiva["tipo"];

const REQUISITO_GATILHO: Array<{ tipo: RequisitoTipo; re: RegExp }> = [
  { tipo: "ordem_publica", re: /ordem publica/ },
  { tipo: "ordem_economica", re: /ordem economica/ },
  {
    tipo: "instrucao_criminal",
    re: /(conveniencia|garantia|assegurar) (da )?instrucao|instrucao (criminal|penal|processual)|instrucao do (feito|processo)/,
  },
  {
    tipo: "aplicacao_lei_penal",
    re: /aplicacao da lei penal|assegurar a aplicacao|garantir a aplicacao|risco de fuga|evadir|furtar-se a aplicacao/,
  },
];

/** Quebra o texto em frases preservando o original (para citar verbatim). */
function frases(texto: string): string[] {
  return texto
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+(?=[A-ZÀ-Ý0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const NEGACAO = /\b(indefiro|indeferi|indeferid\w*|nao (?:vislumbro|verifico|ha)|ausencia de|ausente o)\b/;

/**
 * Detecta os requisitos do art. 312 invocados no decreto de preventiva e
 * captura, como fundamentação PRELIMINAR, a(s) frase(s) do juiz que tocam cada
 * requisito (verbatim do original). A transcrição definitiva (palavras do juiz
 * nas partes que importam) é refinada pelo dossiê do Claude.
 */
export function parsePreventiva(texto: string): PreventivaParsed {
  const vazio: PreventivaParsed = {
    requisitos: [],
    pressupostos: { materialidade: null, indiciosAutoria: null },
    contemporaneidade: null,
    ehPreventiva: false,
  };
  if (!texto || !texto.trim()) return vazio;

  const normFull = normalizar(texto);
  const ehPreventiva =
    /prisao preventiva|decret\w*.{0,25}preventiva|convert\w*.{0,30}preventiva|mantenho a (?:prisao )?preventiva|preventivamente/.test(
      normFull,
    );

  const fs = frases(texto);

  const requisitos: RequisitoPreventiva[] = [];
  for (const { tipo, re } of REQUISITO_GATILHO) {
    const trechos: string[] = [];
    for (const f of fs) {
      const nf = normalizar(f);
      if (re.test(nf) && !NEGACAO.test(nf)) trechos.push(f);
    }
    if (trechos.length) {
      requisitos.push({
        tipo,
        presente: true,
        fundamentacao: trechos.join(" ").slice(0, 1000),
        idFl: null,
      });
    }
  }

  const materialidade =
    fs.find((f) =>
      /materialidade|prova da existencia|existencia do (crime|delito)|comprovad\w* a materialidade/.test(
        normalizar(f),
      ),
    ) ?? null;
  const indiciosAutoria =
    fs.find((f) => /indicios? (?:suficientes? )?de autoria|autoria delitiva|indicios de que/.test(normalizar(f))) ??
    null;
  const contemporaneidade =
    fs.find((f) => /contemporane|fatos? recentes?|atualidade do (risco|perigo)/.test(normalizar(f))) ?? null;

  return {
    requisitos,
    pressupostos: {
      materialidade: materialidade ? materialidade.slice(0, 600) : null,
      indiciosAutoria: indiciosAutoria ? indiciosAutoria.slice(0, 600) : null,
    },
    contemporaneidade: contemporaneidade ? contemporaneidade.slice(0, 600) : null,
    ehPreventiva,
  };
}
