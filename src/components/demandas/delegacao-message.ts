export interface DemandaMsg {
  processoNumero?: string;
  assistidoNome?: string;
  ato?: string;
}

export function montarMensagemDelegacao(params: {
  destinatarioNome: string;
  demandas: DemandaMsg[];
  instrucoes?: string;
  prazo?: string;
  /** Hora do dia (0-23) para a saudação. */
  horaDoDia: number;
}): string {
  const { destinatarioNome, demandas, instrucoes, prazo, horaDoDia } = params;
  const saudacao = horaDoDia < 12 ? "Bom dia" : horaDoDia < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = destinatarioNome.split(" ")[0] || destinatarioNome;

  let msg = `${saudacao}, ${primeiroNome}!\n\nSegue(m) ${demandas.length} demanda(s) para você:\n`;

  demandas.forEach((d, i) => {
    msg += `\n${i + 1}. `;
    if (d.processoNumero) msg += `*${d.processoNumero}*`;
    if (d.assistidoNome) msg += ` — ${d.assistidoNome}`;
    if (d.ato) msg += ` (${d.ato})`;
  });

  if (instrucoes) msg += `\n\n📋 ${instrucoes}`;
  if (prazo) {
    const [y, m, dd] = prazo.split("-");
    msg += `\n⏰ Prazo sugerido: ${dd}/${m}/${y}`;
  }
  return msg;
}
