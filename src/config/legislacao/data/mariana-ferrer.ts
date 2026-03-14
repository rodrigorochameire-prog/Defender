import type { Legislacao } from "../types";

const data: Legislacao = {
  id: "mariana-ferrer",
  nome: "Lei Mariana Ferrer",
  nomeAbreviado: "LMF",
  referencia: "Lei nº 14.245/2021",
  fonte: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14245.htm",
  dataUltimaAtualizacao: "2026-03-13",
  estrutura: [
  {
    tipo: "titulo" as const,
    nome: "Disposições",
    filhos: [
    {
      tipo: "artigo" as const,
      id: "lmf:art-1",
      numero: "1",
      caput: "Esta Lei altera os Decretos-Leis nos 2.848, de 7 de dezembro de 1940 (Código Penal), e 3.689, de 3 de outubro de 1941 (Código de Processo Penal), e a Lei nº 9.099, de 26 de setembro de 1995 (Lei dos Juizados Especiais Cíveis e Criminais), para coibir a prática de atos atentatórios à dignidade da vítima e de testemunhas e para estabelecer causa de aumento de pena no crime de coação no curso do processo.",
      paragrafos: [],
      incisos: [],
      referencias: [],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lmf:art-2",
      numero: "2",
      caput: "O art. 344 do Decreto-Lei nº 2.848, de 7 de dezembro de 1940 (Código Penal), passa a vigorar acrescido do seguinte parágrafo único:",
      paragrafos: [{"id":"lmf:art-2-púnico","numero":"único","texto":"A pena aumenta-se de 1/3 (um terço) até a metade se o processo envolver crime contra a dignidade sexual. (NR)","alineas":[]}],
      incisos: [],
      referencias: ["lmf:art-344"],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lmf:art-3",
      numero: "3",
      caput: "O Decreto-Lei nº 3.689, de 3 de outubro de 1941 (Código de Processo Penal), passa a vigorar acrescido dos seguintes arts. 400-A e 474-A:",
      paragrafos: [],
      incisos: [{"id":"lmf:art-3-inc-I","numero":"I","texto":"a manifestação sobre circunstâncias ou elementos alheios aos fatos objeto de apuração nos autos;","alineas":[]},{"id":"lmf:art-3-inc-II","numero":"II","texto":"a utilização de linguagem, de informações ou de material que ofendam a dignidade da vítima ou de testemunhas.","alineas":[]},{"id":"lmf:art-3-inc-I","numero":"I","texto":"a manifestação sobre circunstâncias ou elementos alheios aos fatos objeto de apuração nos autos;","alineas":[]},{"id":"lmf:art-3-inc-II","numero":"II","texto":"a utilização de linguagem, de informações ou de material que ofendam a dignidade da vítima ou de testemunhas.","alineas":[]}],
      referencias: [],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lmf:art-4",
      numero: "4",
      caput: "O art. 81 da Lei nº 9.099, de 26 de setembro de 1995, passa a vigorar acrescido do seguinte § 1º-A:",
      paragrafos: [{"id":"lmf:art-4-p1","numero":"1","texto":"A. Durante a audiência, todas as partes e demais sujeitos processuais presentes no ato deverão respeitar a dignidade da vítima, sob pena de responsabilização civil, penal e administrativa, cabendo ao juiz garantir o cumprimento do disposto neste artigo, vedadas:","alineas":[]}],
      incisos: [{"id":"lmf:art-4-inc-I","numero":"I","texto":"a manifestação sobre circunstâncias ou elementos alheios aos fatos objeto de apuração nos autos;","alineas":[]},{"id":"lmf:art-4-inc-II","numero":"II","texto":"a utilização de linguagem, de informações ou de material que ofendam a dignidade da vítima ou de testemunhas.","alineas":[]}],
      referencias: ["lmf:art-81"],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lmf:art-5",
      numero: "5",
      caput: "Esta Lei entra em vigor na data de sua publicação.",
      paragrafos: [],
      incisos: [],
      referencias: [],
      historico: [],
    }
    ],
  }
  ],
};

export default data;
