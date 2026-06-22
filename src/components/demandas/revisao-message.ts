/** Monta a mensagem de WhatsApp com a orientação da revisão para a estagiária. */
export function montarMensagemRevisao(
  destinatarioNome: string,
  consideracoes: string,
  horaDoDia: number,
): string {
  const saudacao = horaDoDia < 12 ? "Bom dia" : horaDoDia < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = (destinatarioNome || "").split(" ")[0] || "";
  const abertura = primeiroNome ? `${saudacao}, ${primeiroNome}!` : `${saudacao}!`;
  return `${abertura}\n\n${consideracoes.trim()}`;
}
