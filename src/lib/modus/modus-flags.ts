/**
 * Flags de Modus Operandi (Fase VI) — funções puras, pró-defesa.
 * Detectam vícios procedimentais argumentáveis a partir das circunstâncias.
 */

export interface ModusOperandi {
  abordagem?: string;
  fundadaSuspeitaDocumentada?: boolean;
}

export interface ModusFlag {
  tipo: "abordagem-sem-fundada-suspeita";
  nivel: "amber";
  motivo: string;
}

// Abordagens que EXIGEM fundada suspeita documentada para serem lícitas.
const ABORDAGENS_EXIGEM_SUSPEITA = ["denuncia-anonima", "flagrante-ronda", "bloqueio"];

/**
 * "Abordagem sem fundada suspeita + objeto ilícito apreendido": quando a
 * abordagem exige fundada suspeita (denúncia anônima, ronda, bloqueio), ela NÃO
 * foi documentada, e houve apreensão de droga/arma → nulidade probatória
 * (prova derivada da busca pessoal ilegal — art. 244 CPP / jurisprudência STF/STJ).
 */
export function detectAbordagemSemFundadaSuspeita(
  m: ModusOperandi | null | undefined,
  temApreensaoIlicita: boolean,
): ModusFlag | null {
  if (!m || !m.abordagem) return null;
  if (!ABORDAGENS_EXIGEM_SUSPEITA.includes(m.abordagem)) return null;
  if (m.fundadaSuspeitaDocumentada === true) return null;
  if (!temApreensaoIlicita) return null;
  return {
    tipo: "abordagem-sem-fundada-suspeita",
    nivel: "amber",
    motivo:
      "Abordagem que exige fundada suspeita não documentada, com apreensão de objeto ilícito — nulidade probatória argumentável (busca pessoal ilegal, art. 244 CPP).",
  };
}
