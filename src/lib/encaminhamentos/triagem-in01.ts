// Gerador do corpo de e-mail de triagem — IN 01/2026-CGD.
// Encaminhamento ao defensor natural (peticionamento interno/integrado).
// Item 13 da IN: a unidade remetente NÃO redige nem protocola a peça —
// envia apenas a triagem (qualificação das partes + histórico) e os documentos.

export interface TriagemIN01Params {
  regime: "interno" | "integrado";
  assistidoNome: string;
  papelAssistido?: string | null; // "requerido", "réu", "exequente"...
  comarcaResidencia?: string | null; // comarca onde o assistido reside (nossa)
  numeroAutos: string;
  vara?: string | null;
  comarcaProcesso?: string | null; // comarca onde tramita o processo
  parteContraria?: string | null;
  historico?: string | null;
  prazoEmCurso?: boolean | null; // há prazo processual correndo?
  prazoDescricao?: string | null;
  documentos?: string | null;
}

function clean(s?: string | null): string {
  return (s ?? "").trim();
}

export function gerarTriagemIN01(p: TriagemIN01Params): string {
  const abertura =
    p.regime === "integrado"
      ? "Nos termos da Instrução Normativa nº 001/2026-CGD e do Acordo de Cooperação Técnica do CONDEGE, encaminho demanda de usuário residente em unidade da federação diversa daquela em que tramita o processo de seu interesse, para direcionamento ao defensor natural."
      : "Nos termos da Instrução Normativa nº 001/2026-CGD, encaminho demanda de usuário residente em Comarca diversa daquela em que tramita o processo de seu interesse, para direcionamento ao defensor natural.";

  const papel = clean(p.papelAssistido) ? ` (${clean(p.papelAssistido)})` : "";
  const reside = clean(p.comarcaResidencia)
    ? `, residente em ${clean(p.comarcaResidencia)},`
    : ",";

  const varaTxt = clean(p.vara) ? `, em trâmite na ${clean(p.vara)}` : "";
  const comarcaTxt = clean(p.comarcaProcesso) ? ` (Comarca de ${clean(p.comarcaProcesso)})` : "";

  const linhas: string[] = [];
  linhas.push(
    `- Assistido${papel}: ${clean(p.assistidoNome)}${reside} atendido nesta unidade.`,
  );
  linhas.push(`- Processo: ${clean(p.numeroAutos)}${varaTxt}${comarcaTxt}.`);
  if (clean(p.parteContraria)) linhas.push(`- Parte contrária: ${clean(p.parteContraria)}.`);
  linhas.push(`- Histórico dos fatos: ${clean(p.historico) || "(a complementar)"}.`);

  const prazo =
    p.prazoEmCurso === true
      ? `ATENÇÃO — há prazo em curso${clean(p.prazoDescricao) ? `: ${clean(p.prazoDescricao)}` : ""}. Encaminhamento prioritário (itens 10 a 12 da IN 01/2026).`
      : "não há prazo em curso para a Defesa no momento.";
  linhas.push(`- Prazo processual: ${prazo}`);
  linhas.push(`- Documentos anexos: ${clean(p.documentos) || "(a indicar)"}.`);

  return [
    "Prezada Coordenação,",
    "",
    abertura,
    "",
    "TRIAGEM",
    ...linhas,
    "",
    "Solicito o direcionamento ao defensor natural, a quem compete apurar a viabilidade de assunção do patrocínio e o direcionamento dos atos processuais subsequentes (item 13 da IN 01/2026).",
    "",
    "Fico à disposição.",
    "Atenciosamente,",
  ].join("\n");
}
