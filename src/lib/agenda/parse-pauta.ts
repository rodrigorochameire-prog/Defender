/**
 * parse-pauta.ts — Helpers de parsing da pauta de audiências do PJe.
 *
 * Fonte única compartilhada entre o modal de importação manual
 * (src/components/agenda/pje-agenda-import-modal.tsx) e o passo
 * de confirmação server-side futuro.
 *
 * Lógica portada fielmente do modal; não altere o comportamento sem
 * atualizar os testes em __tests__/parse-pauta.test.ts.
 */

import { NAME_ACCENTS } from "@/lib/utils/title-case";
import { detectarSlug, tipoPorSlug } from "@/lib/agenda/tipos-audiencia";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface AssistidoInfo {
  nome: string;
  cpf: string;
}

export interface ParsedEvento {
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  processo: string;
  /** Nome(s) do(s) assistido(s) concatenado(s) com ", " */
  assistido: string;
  assistidos: AssistidoInfo[];
  atribuicao: string;
  status: string;
  descricao: string;
  classeJudicial: string;
  situacaoAudiencia: string;
  orgaoJulgador: string;
}

// ---------------------------------------------------------------------------
// toTitleCase — cópia local (porta exata das linhas ~90-106 do modal).
//
// Mantém conectivos em minúsculo (exceto na primeira palavra), produzindo o
// casing correto de nomes próprios em português: "Jean Maykon Simões da Silva".
// NAME_ACCENTS (dicionário compartilhado) recupera grafias acentuadas.
// ---------------------------------------------------------------------------

// Conectivos que devem permanecer em minúsculo no Title Case
const conectivos = ["de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "sem", "a", "o", "as", "os"];

export function toTitleCase(texto: string): string {
  if (!texto) return "";

  return texto
    .toLowerCase()
    .split(" ")
    .map((palavra, index) => {
      // Acentuar nomes próprios conhecidos (dicionário compartilhado, independe de conectivo)
      if (NAME_ACCENTS[palavra]) return NAME_ACCENTS[palavra];
      // Primeira palavra sempre em maiúsculo, conectivos em minúsculo
      if (index === 0 || !conectivos.includes(palavra)) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      }
      return palavra;
    })
    .join(" ");
}

// ---------------------------------------------------------------------------
// mapearAtribuicao
// Porta exata das linhas 108-156 do modal.
// ---------------------------------------------------------------------------

export function mapearAtribuicao(
  orgaoJulgador: string,
  classeJudicial: string,
  textoCompleto: string,
): string {
  const texto = `${orgaoJulgador} ${classeJudicial} ${textoCompleto}`.toUpperCase();

  // Violência Doméstica — verificar múltiplas variações e padrões
  if (
    texto.includes("VIOLÊNCIA DOMÉSTICA") ||
    texto.includes("VIOLENCIA DOMESTICA") ||
    texto.includes("VIOLÊNCIA DOM") ||
    texto.includes("VIOLENCIA DOM") ||
    texto.includes("MARIA DA PENHA") ||
    texto.includes("MEDIDAS PROTETIVAS") ||
    texto.includes("MULHER DE CAMAÇARI") ||
    texto.includes("MULHER DE CAMACARI") ||
    texto.includes("VARA DE VIOLÊNCIA") ||
    texto.includes("VARA DE VIOLENCIA") ||
    /VIOL[EÊ]NCIA\s+DOM[EÉ]STICA\s+FAM/i.test(texto)
  ) {
    return "Violência Doméstica";
  }

  // Tribunal do Júri — verificar primeiro a classe judicial (mais específico).
  // "COMPETÊNCIA DO JÚRI" ou "AÇÃO PENAL DE COMPETÊNCIA DO JÚRI" na classe.
  if (
    (classeJudicial.toUpperCase().includes("COMPET") && classeJudicial.toUpperCase().includes("JÚRI")) ||
    (classeJudicial.toUpperCase().includes("COMPET") && classeJudicial.toUpperCase().includes("JURI")) ||
    texto.includes("TRIBUNAL DO JÚRI") ||
    texto.includes("TRIBUNAL DO JURI") ||
    texto.includes("PLENÁRIO") ||
    texto.includes("VARA DO JÚRI") ||
    texto.includes("VARA DO JURI") ||
    /VARA\s+D[OAE]\s+J[UÚ]RI/i.test(texto) ||
    /COMPET[EÊ]NCIA\s+D[OAE]\s+J[UÚ]RI/i.test(texto)
  ) {
    return "Tribunal do Júri";
  }

  // Execução Penal — SOMENTE quando explicitamente mencionado, não pelo nome
  // da vara. "VARA DO JÚRI E EXECUÇÕES PENAIS" não é Execução Penal.
  const ehVaraJuriComExecucao = /VARA\s+D[OAE]\s+J[UÚ]RI\s+E\s+EXECU[CÇ]/i.test(texto);
  if (
    !ehVaraJuriComExecucao &&
    (texto.includes("EXECUÇÃO PENAL") ||
      texto.includes("EXECUCAO PENAL") ||
      texto.includes("EXECUÇÕES"))
  ) {
    return "Execução Penal";
  }

  if (texto.includes("CURADORIA")) {
    return "Curadoria";
  }

  return "Criminal Geral";
}

// ---------------------------------------------------------------------------
// mapearSituacao
// Porta exata das linhas 176-189 do modal. A ordem importa.
// ---------------------------------------------------------------------------

export function mapearSituacao(situacaoTexto: string): string {
  const situacao = situacaoTexto.toLowerCase();

  // A ordem importa: "redesignada" contém "designada" e "não-realizada" contém
  // "realizada". Os termos mais específicos precisam ser testados primeiro.
  if (situacao.includes("cancelada")) return "cancelado";
  if (situacao.includes("não-realizada") || situacao.includes("nao-realizada")) return "cancelado";
  if (situacao.includes("redesignada")) return "remarcado";
  if (situacao.includes("realizada")) return "concluido";
  if (situacao.includes("designada")) return "confirmado";

  return "confirmado";
}

// ---------------------------------------------------------------------------
// extrairAssistidos
// Porta do bloco de regex das linhas 253-307 do modal.
// Extrai nome + CPF dos assistidos da Defensoria no polo passivo.
// ---------------------------------------------------------------------------

export function extrairAssistidos(partesTexto: string): AssistidoInfo[] {
  // Normaliza quebras de linha e rejunta CPF partido entre linhas (ex.: "915-\n09")
  const normalizado = partesTexto
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*-\s*(\d)/g, "$1-$2");

  const partesAssistidas: AssistidoInfo[] = [];

  // Flag SEM "i": a primeira letra precisa ser maiúscula (nomes e marcadores
  // como (REU) sempre são), evitando que conectores em minúsculo — "e",
  // "civilmente", "como" — ancorem a captura e contaminem o nome do réu.
  const regexAssistido =
    /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑa-záàâãéèêíïóôõöúçñ\s]+?)(?:\s*-\s*CPF:\s*([\d.-]+))?\s*\((REU|INVESTIGADO|REQUERIDO|FLAGRANTEADO|RECORRIDO|APELADO|AUTORIDADE)\)/g;

  let match: RegExpExecArray | null;
  while ((match = regexAssistido.exec(normalizado)) !== null) {
    let nome = match[1].trim();
    const cpf = match[2] ? match[2].trim() : "";

    // Limpar "registrado(a) civilmente como"
    nome = nome.replace(/registrado\(a\)\s+civilmente\s+como\s*/gi, "").trim();
    // Remover prefixos como "X "
    nome = nome.replace(/^X\s+/i, "").trim();
    // Remover conjunção "e/E" que liga réus (ex.: "e ANDERSON FARIAS DIAS")
    nome = nome.replace(/^e\s+/i, "").trim();
    // Remover espaços extras
    nome = nome.replace(/\s+/g, " ").trim();

    // Filtrar entidades que não são pessoas físicas
    const naoEPessoa =
      nome.includes("Ministério") ||
      nome.includes("VARA") ||
      nome.includes("DEAM") ||
      nome.includes("Polícia") ||
      nome.includes("DT ") ||
      nome.includes("DELEGACIA") ||
      nome.includes("segredo de justiça") ||
      /^\d{2}ª?\s*D[T]/i.test(nome);

    if (nome && nome.length > 2 && !naoEPessoa) {
      partesAssistidas.push({
        nome: toTitleCase(nome),
        cpf,
      });
    }
  }

  // Remover duplicatas por CPF ou nome
  return partesAssistidas.filter((assistido, index, self) =>
    index === self.findIndex(
      (a) => (a.cpf && a.cpf === assistido.cpf) || a.nome === assistido.nome,
    ),
  );
}

// ---------------------------------------------------------------------------
// linhaParaEvento
// Constrói um ParsedEvento a partir de colunas ESTRUTURADAS da pauta PJe.
// Usado pelo passo de confirmação server-side (futuro); o modal de texto
// colado usa lógica de blocos própria e chama os helpers individuais acima.
// ---------------------------------------------------------------------------

export interface LinhaEventoCols {
  /** "DD/MM/AA HH:MM" */
  dataHora: string;
  processo: string;
  orgao: string;
  partes: string;
  classe: string;
  tipo: string;
  sala: string;
  situacao: string;
}

export function linhaParaEvento(
  cols: LinhaEventoCols,
  forcedAtribuicao?: string,
): ParsedEvento {
  // --- Data e hora ---
  const [datePart, timePart] = cols.dataHora.split(" ");
  const [dia, mes, ano] = datePart.split("/");
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
  const data = `${anoCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  const horarioInicio = timePart;

  // --- Assistidos ---
  const assistidosUnicos = extrairAssistidos(cols.partes);
  const assistidoTitulo = assistidosUnicos.length > 0 ? assistidosUnicos[0].nome : "";
  const assistidosTexto = assistidosUnicos.map((a) => a.nome).join(", ");

  // --- Tipo de audiência via catálogo ---
  const tipoCat = tipoPorSlug(detectarSlug(`${cols.tipo} ${cols.classe}`));

  // --- Atribuição ---
  const atribuicao =
    forcedAtribuicao && forcedAtribuicao !== "auto"
      ? forcedAtribuicao
      : mapearAtribuicao(
          cols.orgao,
          cols.classe,
          `${cols.orgao} ${cols.classe} ${cols.tipo}`,
        );

  // --- Horário fim usando duração do catálogo (fallback 60 min) ---
  const [h, m] = horarioInicio.split(":").map(Number);
  const duracao = tipoCat.duracaoMin ?? 60;
  const fimMinutos = (h * 60 + m + duracao) % 1440;
  const horarioFim = `${String(Math.floor(fimMinutos / 60)).padStart(2, "0")}:${String(fimMinutos % 60).padStart(2, "0")}`;

  // --- Classe judicial: strip "(NNNN)" e Title Case ---
  const classeJudicial = toTitleCase(
    cols.classe.replace(/\s*\(\d+\)\s*$/, "").trim(),
  );

  // --- Local fixo ---
  const local = "Fórum Clemente Mariani - Camaçari";

  // --- Título ---
  const titulo = `${tipoCat.sigla} - ${assistidoTitulo || "Sem assistido"} - ${cols.processo}`;

  // --- Status e situação ---
  const status = mapearSituacao(cols.situacao);
  const situacaoAudiencia = cols.situacao;

  // --- Órgão julgador ---
  const orgaoJulgador = cols.orgao;
  const orgaoJulgadorFormatado = toTitleCase(orgaoJulgador);

  // --- Descrição estruturada ---
  const dataFormatada = `${data.substring(8, 10)}/${data.substring(5, 7)}/${data.substring(2, 4)} ${horarioInicio}`;
  const descricao = `INFORMAÇÕES DA AUDIÊNCIA

Órgão Julgador: ${orgaoJulgadorFormatado || "Não informado"}

Tipo de Audiência: ${tipoCat.descricao}

Processo: ${cols.processo}

Classe Processual: ${classeJudicial}

Parte(s) Assistida(s): ${assistidosTexto || "Não identificado"}

Data e Horário: ${dataFormatada}

Status: ${cols.situacao}`;

  return {
    titulo,
    tipo: tipoCat.descricao,
    data,
    horarioInicio,
    horarioFim,
    local,
    processo: cols.processo,
    assistido: assistidosTexto,
    assistidos: assistidosUnicos,
    atribuicao,
    status,
    descricao,
    classeJudicial,
    situacaoAudiencia,
    orgaoJulgador,
  };
}
