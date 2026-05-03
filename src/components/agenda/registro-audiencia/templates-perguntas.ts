import type { SubtipoAudiencia } from "./subtipo-audiencia";
import type { Depoente } from "./types";

export interface TemplatePerguntas {
  id: string;
  titulo: string;
  /** Bloco aplicado em "Estratégia de Inquirição". Cabeçalho + roteiro de perguntas. */
  conteudo: string;
}

type TipoDepoente = Depoente["tipo"];

/**
 * Templates curados para cada combinação subtipo × tipo de depoente.
 * Inspirados em `.claude/skills-cowork/preparar-audiencias/references/tipos_audiencia_*.md`.
 */
const T: Partial<Record<SubtipoAudiencia, Partial<Record<TipoDepoente, TemplatePerguntas[]>>>> = {
  // ───────────────────────────── JUSTIFICAÇÃO (MPU) ─────────────────────────────
  justificacao: {
    vitima: [
      {
        id: "justif-vitima-base",
        titulo: "Ofendida — manutenção/revisão das MPU",
        conteudo: [
          "[ROTEIRO — JUSTIFICAÇÃO / OFENDIDA]",
          "1. Os fatos descritos no BO permanecem atuais? Houve alguma mudança na situação desde a representação?",
          "2. Houve nova violência, ameaça, perseguição ou descumprimento desde o registro do BO?",
          "3. Há contato voluntário (mensagens, ligações, encontros) iniciado por qualquer das partes?",
          "4. As medidas protetivas vêm sendo cumpridas pelo requerido? Há filhos em comum / vínculos que justifiquem contato?",
          "5. A senhora deseja a manutenção, a revisão (com ajustes) ou a revogação das medidas? Por quê?",
          "(Linguagem: usar 'representação registrada no BO' — NÃO 'denúncia'.)",
        ].join("\n"),
      },
    ],
    reu: [
      {
        id: "justif-requerido-base",
        titulo: "Requerido — ciência e cumprimento",
        conteudo: [
          "[ROTEIRO — JUSTIFICAÇÃO / REQUERIDO]",
          "1. Tem ciência exata do conteúdo das medidas protetivas (distância mínima, proibição de contato, etc.)?",
          "2. Houve descumprimento de alguma medida desde a intimação?",
          "3. Houve aproximação espontânea da ofendida (reaproximação consentida)? — STJ AgRg AREsp 2.330.912/DF, HC 521.622/SC.",
          "4. Existem filhos em comum, vínculo financeiro ou patrimonial que demande contato? Como vêm sendo administrados?",
          "5. Quer manifestar voluntariamente algum compromisso adicional?",
        ].join("\n"),
      },
    ],
    informante: [
      {
        id: "justif-informante-base",
        titulo: "Informante — contexto familiar/comunitário",
        conteudo: [
          "[ROTEIRO — JUSTIFICAÇÃO / INFORMANTE]",
          "1. Qual o vínculo com as partes?",
          "2. Presenciou diretamente algum dos fatos narrados ou os conhece por relato?",
          "3. Como percebe a situação de risco hoje?",
          "(Lembrar: informante não presta compromisso — peso probatório reduzido.)",
        ].join("\n"),
      },
    ],
  },

  // ───────────────────────── OITIVA ESPECIAL (Lei 13.431/17) ─────────────────────────
  oitiva_especial: {
    vitima: [
      {
        id: "oitiva-vitima-base",
        titulo: "Depoente protegido — perguntas via intermediação",
        conteudo: [
          "[ROTEIRO — OITIVA ESPECIAL / DEPOENTE PROTEGIDO]",
          "Atenção: defendido NÃO assiste presencialmente. Atuação por perguntas escritas via profissional capacitado.",
          "Diretrizes:",
          "  • Perguntas curtas, claras, NÃO sugestivas.",
          "  • Não exigir descrição detalhada do trauma.",
          "  • Não repetir oitiva (vedação à revitimização — substitui o depoimento policial).",
          "Tópicos prioritários (apenas para descartar contradição com pontos da defesa):",
          "1. Confirmação genérica do contexto (sem detalhar episódios).",
          "2. Identificação do autor por características objetivas (sem apresentação de fotos).",
          "3. Existência de outras pessoas presentes / testemunhas.",
        ].join("\n"),
      },
    ],
  },

  // ─────────────────────────── AIJ (Instrução e Julgamento) ───────────────────────────
  aij: {
    vitima: [
      {
        id: "aij-vitima-base",
        titulo: "Ofendida — confronto com a versão policial",
        conteudo: [
          "[ROTEIRO — AIJ / OFENDIDA]",
          "1. Confirma integralmente o relato prestado em sede policial? Há algo a retificar?",
          "2. Como ocorreu o reconhecimento? Foram cumpridos os requisitos do art. 226 CPP (apresentar pessoas semelhantes, não foto isolada)?",
          "3. Identificou o autor de forma direta ou por relato de terceiros?",
          "4. Conhecia o autor antes dos fatos? Em que circunstâncias o conhecia?",
          "5. Houve alguma contradição entre o que disse na delegacia e a versão atual? Por quê?",
          "(Lembrar: art. 217 CPP — pode ser ouvida fora da presença do defendido.)",
        ].join("\n"),
      },
    ],
    testemunha: [
      {
        id: "aij-testemunha-acusacao",
        titulo: "Testemunha de acusação — atacar credibilidade",
        conteudo: [
          "[ROTEIRO — AIJ / TESTEMUNHA DE ACUSAÇÃO]",
          "1. Presenciou os fatos diretamente ou apenas ouviu relatos?",
          "2. Em que condições visualizou (luminosidade, distância, tempo de observação)?",
          "3. Conhecia o defendido antes dos fatos?",
          "4. Reconheceu pessoalmente ou apenas pelo nome / relato de terceiros?",
          "5. Há vínculo com a vítima (parentesco, amizade, financeiro)?",
          "6. Confirma o que disse em sede policial? Em algum ponto altera a versão?",
        ].join("\n"),
      },
      {
        id: "aij-testemunha-defesa",
        titulo: "Testemunha de defesa — caráter e contexto",
        conteudo: [
          "[ROTEIRO — AIJ / TESTEMUNHA DE DEFESA]",
          "1. Há quanto tempo conhece o defendido?",
          "2. Conhece a fama do defendido na comunidade? Trabalhador, pacífico, vínculos familiares?",
          "3. Sabe se o defendido tem ocupação lícita?",
          "4. No dia / contexto dos fatos, tem alguma observação relevante?",
          "5. Há algum elemento que possa esclarecer a versão da acusação?",
        ].join("\n"),
      },
    ],
    reu: [
      {
        id: "aij-reu-interrogatorio",
        titulo: "Defendido — interrogatório (alibi/silêncio)",
        conteudo: [
          "[ROTEIRO — AIJ / INTERROGATÓRIO DO DEFENDIDO]",
          "1. Confirma os fatos narrados na denúncia? Em que ponto discorda?",
          "2. Onde estava no momento dos fatos? Quem pode confirmar?",
          "3. Conhece a vítima e/ou as testemunhas? Há vínculo (financeiro, afetivo, conflito anterior)?",
          "4. Possui residência fixa, ocupação lícita, vínculos familiares?",
          "5. Tem alguma teoria sobre o que pode tê-lo incriminado / sobre a motivação da imputação?",
          "6. Direito ao silêncio — informar previamente que pode escolher não responder pontos específicos sem prejuízo (art. 5º, LXIII, CF).",
        ].join("\n"),
      },
    ],
    perito: [
      {
        id: "aij-perito-base",
        titulo: "Perito — limites do laudo",
        conteudo: [
          "[ROTEIRO — AIJ / PERITO]",
          "1. Confirma a integralidade do laudo / parecer juntado aos autos?",
          "2. O laudo permite afirmar com certeza pericial os pontos X, Y, Z?",
          "3. Há limitações metodológicas (cadeia de custódia, amostra, técnica) que reduzam o valor probatório?",
          "4. Existem hipóteses alternativas compatíveis com os achados periciais?",
          "5. Houve confronto com perícia da defesa / parecer técnico assistente?",
        ].join("\n"),
      },
    ],
    policial: [
      {
        id: "aij-policial-base",
        titulo: "Policial — cadeia de custódia e procedimento",
        conteudo: [
          "[ROTEIRO — AIJ / POLICIAL]",
          "1. Como tomou conhecimento da ocorrência? Houve denúncia anônima / abordagem aleatória?",
          "2. A abordagem teve fundada suspeita objetiva ou foi por filtro racial / preconceito?",
          "3. Cadeia de custódia: quem manuseou as evidências entre apreensão e perícia?",
          "4. Houve apresentação de pessoas para reconhecimento? Cumpridos requisitos do art. 226 CPP?",
          "5. Na delegacia, o depoente foi informado dos direitos? Houve contato com defesa antes do interrogatório?",
        ].join("\n"),
      },
    ],
  },

  // ────────────────────────────── CUSTÓDIA (até 24h) ──────────────────────────────
  custodia: {
    reu: [
      {
        id: "custodia-base",
        titulo: "Defendido — quesitos obrigatórios da custódia",
        conteudo: [
          "[ROTEIRO — AUDIÊNCIA DE CUSTÓDIA / DEFENDIDO]",
          "QUESITO OBRIGATÓRIO: o senhor sofreu tortura, agressão verbal/física ou maus-tratos durante a prisão ou no transporte?",
          "1. Foi informado dos motivos da prisão e dos direitos no momento da abordagem?",
          "2. Em que horário foi preso? Em que horário foi apresentado? (Confirmar se respeitou prazo de 24h — relaxamento.)",
          "3. Possui residência fixa, ocupação lícita, vínculos familiares na comarca?",
          "4. Tem condições de comparecer aos atos do processo se posto em liberdade? Há histórico de revelia?",
          "5. Há antecedentes? Estão prescritos / são análogos ao fato atual?",
          "(Demonstrar inexistência dos requisitos da preventiva — art. 312, 313 CPP. Propor MPU substitutiva.)",
        ].join("\n"),
      },
    ],
  },

  // ────────────────────────────── PLENÁRIO (Júri) ──────────────────────────────
  plenario: {
    vitima: [
      {
        id: "plenario-vitima-base",
        titulo: "Reinquirição da vítima em plenário",
        conteudo: [
          "[ROTEIRO — PLENÁRIO / VÍTIMA]",
          "VEDADO ao MP: ler/referenciar IP (art. 155 CPP + Súmula 14 STJ) e pronúncia (art. 478 CPP).",
          "Estratégia: confirmar pontos que sustentam a tese de defesa, sem abrir flancos novos.",
          "1. Confirma o que disse em juízo na AIJ? Algum ponto a retificar para os jurados?",
          "2. Confirma as circunstâncias de tempo, modo e lugar?",
          "3. Houve algum contato indevido entre AIJ e plenário (testemunhas pressionadas, retratação solicitada)?",
        ].join("\n"),
      },
    ],
    testemunha: [
      {
        id: "plenario-testemunha-base",
        titulo: "Reinquirição de testemunha em plenário",
        conteudo: [
          "[ROTEIRO — PLENÁRIO / TESTEMUNHA]",
          "Foco: confirmar contradição com versão acusatória OU robustecer narrativa de defesa, sem reabrir vulnerabilidades.",
          "1. Confirma o que disse em juízo? Algum ponto novo desde então?",
          "2. Conhecia o defendido? Como o caracteriza (trabalhador, pacífico)?",
          "3. Tem alguma informação que os jurados precisam conhecer?",
          "(Quesito 4 — absolvição genérica, art. 483 III: basta convencer 4 dos 7 jurados.)",
        ].join("\n"),
      },
    ],
    perito: [
      {
        id: "plenario-perito-base",
        titulo: "Perito em plenário — relativizar laudo",
        conteudo: [
          "[ROTEIRO — PLENÁRIO / PERITO]",
          "1. Limites técnicos do laudo apresentado (margem de erro, técnica, amostra)?",
          "2. Hipóteses alternativas compatíveis com os achados periciais?",
          "3. Houve confronto com parecer técnico assistente?",
          "4. O laudo permite afirmar autoria com certeza pericial?",
        ].join("\n"),
      },
    ],
    policial: [
      {
        id: "plenario-policial-base",
        titulo: "Policial em plenário — abordagem e cadeia",
        conteudo: [
          "[ROTEIRO — PLENÁRIO / POLICIAL]",
          "VEDADO ao MP: usar elementos do IP em plenário (art. 155 CPP + Súmula 14 STJ).",
          "1. Confirma o que disse em juízo na AIJ? Há ponto novo?",
          "2. Detalhe da abordagem — fundada suspeita objetiva?",
          "3. Cadeia de custódia das evidências apresentadas em plenário?",
          "4. Houve reconhecimento? Cumpridos requisitos do art. 226 CPP?",
        ].join("\n"),
      },
    ],
    informante: [
      {
        id: "plenario-informante-base",
        titulo: "Informante em plenário",
        conteudo: [
          "[ROTEIRO — PLENÁRIO / INFORMANTE]",
          "Lembrar jurados: informante não presta compromisso — peso probatório reduzido.",
          "1. Qual o vínculo com vítima/defendido?",
          "2. Presenciou diretamente ou conhece por relato?",
          "3. Há motivo para distorcer a narrativa?",
        ].join("\n"),
      },
    ],
  },
};

/** Retorna templates aplicáveis ao depoente conforme subtipo da audiência. */
export function getTemplatesPerguntas(
  subtipo: SubtipoAudiencia,
  tipoDepoente: TipoDepoente,
): TemplatePerguntas[] {
  return T[subtipo]?.[tipoDepoente] ?? [];
}
