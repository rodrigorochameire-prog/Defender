/**
 * Detecta o tipo de audiência a partir do bloco de texto cru de uma linha da
 * pauta do PJe (colado pelo usuário no modal de importação).
 *
 * Armadilha central: o PJe quebra palavras NO MEIO da célula "Tipo"
 * (ex.: "JUSTIFICAÇ\nÃO", a quebra cai exatamente entre Ç e Ã; ou
 * "PROCEDIME\nNTO"). Trocar a quebra por um espaço NÃO resolve — o espaço
 * continuaria separando Ç de Ã. É preciso REMOVER todo o whitespace para
 * reconstituir a palavra e então casar contra padrões sem espaço. Isso torna a
 * detecção imune ao wrap de coluna.
 *
 * Retorna o texto canônico do tipo (consumido por mapearTipoAudiencia) ou ""
 * quando nada casou — nesse caso o chamador decide pelo fallback de atribuição.
 */
export function detectarTipoAudiencia(textoBloco: string): string {
  const tipoFlat = textoBloco.replace(/\s+/g, "").toUpperCase();

  // Sessão de Julgamento do Júri
  if (
    /SESS[ÃA]ODEJULGAMENTO/.test(tipoFlat) ||
    /PLEN[ÁA]RIO/.test(tipoFlat) ||
    /TRIBUNALDOJ[UÚ]RI.*JULGAMENTO/.test(tipoFlat)
  ) {
    return "Sessão de Julgamento do Tribunal do Júri";
  }
  // ANPP - Acordo de Não Persecução Penal
  if (
    /ANPP/.test(tipoFlat) ||
    /N[ÃA]OPERSECU[CÇ][ÃA]O/.test(tipoFlat) ||
    /ACORDO.*PENAL/.test(tipoFlat)
  ) {
    return "ANPP";
  }
  // PAP - Produção Antecipada de Provas
  if (
    /PRODU[CÇ][ÃA]OANTECIPADA/.test(tipoFlat) ||
    /\bPAP\b/.test(tipoFlat) ||
    /ANTECIPADADEPROVAS/.test(tipoFlat) ||
    /COLETA.*PROVAS/.test(tipoFlat)
  ) {
    return "PAP";
  }
  // Admonitória (Execução Penal)
  if (/ADMONIT[OÓ]RIA/.test(tipoFlat)) {
    return "Admonitória";
  }
  // Oitiva Especial (antes de justificação para não confundir)
  if (/OITIVAESPECIAL/.test(tipoFlat) || /DEPOIMENTOESPECIAL/.test(tipoFlat)) {
    return "Oitiva especial";
  }
  // Retratação
  if (/RETRATA[CÇ][ÃA]O/.test(tipoFlat)) {
    return "Retratação";
  }
  // Justificação
  if (/JUSTIFICA[CÇ][ÃA]O/.test(tipoFlat)) {
    return "Justificação";
  }
  // Custódia
  if (/CUST[OÓ]DIA/.test(tipoFlat)) {
    return "Custódia";
  }
  // AIJ - Instrução e Julgamento (INSTRUÇÃO cobre "Audiência de Instrução e Julgamento")
  if (/INSTRU[CÇ][ÃA]O/.test(tipoFlat) || /\bAIJ\b/.test(tipoFlat)) {
    return "Instrução e Julgamento";
  }
  // Conciliação
  if (/CONCILIA[CÇ][ÃA]O/.test(tipoFlat)) {
    return "Conciliação";
  }
  // Fallback robusto: inferir pelo CÓDIGO da classe processual, imune a quebra de
  // linha (ex.: "(1268)", "(280)"). Só age quando o texto do tipo não resolveu.
  const codigoClasse = tipoFlat.match(/\((\d{2,5})\)/)?.[1] ?? "";
  const tipoPorClasse: Record<string, string> = {
    "1268": "Justificação", // Medidas Protetivas de Urgência (MPU)
    "280": "Justificação", // Auto de Prisão em Flagrante
    "11955": "Oitiva especial", // Cautelar Inominada Criminal
    "283": "Instrução e Julgamento", // Ação Penal - Procedimento Ordinário
    "10943": "Instrução e Julgamento", // Ação Penal - Procedimento Sumário
  };
  return tipoPorClasse[codigoClasse] ?? "";
}

/**
 * Classifica a situação da audiência (designada/redesignada/realizada/cancelada).
 * Também opera sobre o texto achatado: a coluna "Situação" pode quebrar mid-word
 * ("CANCELA\nDA"), e classificar errado faria uma audiência cancelada/remarcada
 * entrar na agenda como vigente. Ordem: mais específico primeiro (redesignada
 * contém "designada").
 */
export function detectarSituacao(textoBloco: string): string {
  const flat = textoBloco.replace(/\s+/g, "").toUpperCase();
  if (/CANCELADA/.test(flat)) return "cancelada";
  if (/REDESIGNADA/.test(flat)) return "redesignada";
  if (/REALIZADA/.test(flat)) return "realizada";
  return "designada";
}
