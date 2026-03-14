import type { Legislacao } from "../types";

const data: Legislacao = {
  id: "prisao-temporaria",
  nome: "Prisão Temporária",
  nomeAbreviado: "LPTe",
  referencia: "Lei nº 7.960/1989",
  fonte: "https://www.planalto.gov.br/ccivil_03/leis/l7960.htm",
  dataUltimaAtualizacao: "2026-03-13",
  estrutura: [
  {
    tipo: "titulo" as const,
    nome: "Disposições",
    filhos: [
    {
      tipo: "artigo" as const,
      id: "lpte:art-1",
      numero: "1",
      caput: "Caberá prisão temporária:",
      paragrafos: [],
      incisos: [{"id":"lpte:art-1-inc-I","numero":"I","texto":"quando imprescindível para as investigações do inquérito policial;","alineas":[]},{"id":"lpte:art-1-inc-II","numero":"II","texto":"quando o indicado não tiver residência fixa ou não fornecer elementos necessários ao esclarecimento de sua identidade;","alineas":[]},{"id":"lpte:art-1-inc-III","numero":"III","texto":"quando houver fundadas razões, de acordo com qualquer prova admitida na legislação penal, de autoria ou participação do indiciado nos seguintes crimes:","alineas":[{"id":"lpte:art-1-inc-III-a","numero":"a","texto":"homicídio doloso (art. 121, caput, e seu § 2°);"},{"id":"lpte:art-1-inc-III-b","numero":"b","texto":"seqüestro ou cárcere privado (art. 148, caput, e seus §§ 1° e 2°);"},{"id":"lpte:art-1-inc-III-c","numero":"c","texto":"roubo (art. 157, caput, e seus §§ 1°, 2° e 3°);"},{"id":"lpte:art-1-inc-III-d","numero":"d","texto":"extorsão (art. 158, caput, e seus §§ 1° e 2°);"},{"id":"lpte:art-1-inc-III-e","numero":"e","texto":"extorsão mediante seqüestro (art. 159, caput, e seus §§ 1°, 2° e 3°);"},{"id":"lpte:art-1-inc-III-f","numero":"f","texto":"estupro (art. 213, caput, e sua combinação com o art. 223, caput, e parágrafo único);"},{"id":"lpte:art-1-inc-III-g","numero":"g","texto":"atentado violento ao pudor (art. 214, caput, e sua combinação com o art. 223, caput, e parágrafo único);"},{"id":"lpte:art-1-inc-III-h","numero":"h","texto":"rapto violento (art. 219, e sua combinação com o art. 223 caput, e parágrafo único);"},{"id":"lpte:art-1-inc-III-i","numero":"i","texto":"epidemia com resultado de morte (art. 267, § 1°);"},{"id":"lpte:art-1-inc-III-j","numero":"j","texto":"envenenamento de água potável ou substância alimentícia ou medicinal qualificado pela morte (art. 270, caput, combinado com art. 285);"},{"id":"lpte:art-1-inc-III-l","numero":"l","texto":"quadrilha ou bando (art. 288), todos do Código Penal;"},{"id":"lpte:art-1-inc-III-m","numero":"m","texto":"genocídio (arts. 1°, 2° e 3° da Lei n° 2.889, de 1° de outubro de 1956), em qualquer de sua formas típicas;"},{"id":"lpte:art-1-inc-III-n","numero":"n","texto":"tráfico de drogas (art. 12 da Lei n° 6.368, de 21 de outubro de 1976);"},{"id":"lpte:art-1-inc-III-o","numero":"o","texto":"crimes contra o sistema financeiro (Lei n° 7.492, de 16 de junho de 1986)."},{"id":"lpte:art-1-inc-III-p","numero":"p","texto":"crimes previstos na Lei de Terrorismo."}]}],
      referencias: [],
      historico: [{"versao":1,"texto":"Caberá prisão temporária:","redacaoDadaPor":{"lei":"Vide ADI 3360","artigo":""},"publicadoEm":"","vigenteDesde":"","vigenteAte":null}],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-2",
      numero: "2",
      caput: "A prisão temporária será decretada pelo Juiz, em face da representação da autoridade policial ou de requerimento do Ministério Público, e terá o prazo de 5 (cinco) dias, prorrogável por igual período em caso de extrema e comprovada necessidade.",
      paragrafos: [{"id":"lpte:art-2-p1","numero":"1","texto":"Na hipótese de representação da autoridade policial, o Juiz, antes de decidir, ouvirá o Ministério Público.","alineas":[]},{"id":"lpte:art-2-p2","numero":"2","texto":"O despacho que decretar a prisão temporária deverá ser fundamentado e prolatado dentro do prazo de 24 (vinte e quatro) horas, contadas a partir do recebimento da representação ou do requerimento.","alineas":[]},{"id":"lpte:art-2-p3","numero":"3","texto":"O Juiz poderá, de ofício, ou a requerimento do Ministério Público e do Advogado, determinar que o preso lhe seja apresentado, solicitar informações e esclarecimentos da autoridade policial e submetê-lo a exame de corpo de delito.","alineas":[]},{"id":"lpte:art-2-p4","numero":"4","texto":"Decretada a prisão temporária, expedir-se-á mandado de prisão, em duas vias, uma das quais será entregue ao indiciado e servirá como nota de culpa.","alineas":[]},{"id":"lpte:art-2-p4","numero":"4","texto":"A O mandado de prisão conterá necessariamente o período de duração da prisão temporária estabelecido no caput deste artigo, bem como o dia em que o preso deverá ser libertado.","alineas":[]},{"id":"lpte:art-2-p5","numero":"5","texto":"A prisão somente poderá ser executada depois da expedição de mandado judicial.","alineas":[]},{"id":"lpte:art-2-p6","numero":"6","texto":"Efetuada a prisão, a autoridade policial informará o preso dos direitos previstos no art. 5° da Constituição Federal.","alineas":[]},{"id":"lpte:art-2-p7","numero":"7","texto":"Decorrido o prazo de cinco dias de detenção, o preso deverá ser posto imediatamente em liberdade, salvo se já tiver sido decretada sua prisão preventiva.","alineas":[]},{"id":"lpte:art-2-p7","numero":"7","texto":"Decorrido o prazo contido no mandado de prisão, a autoridade responsável pela custódia deverá, independentemente de nova ordem da autoridade judicial, pôr imediatamente o preso em liberdade, salvo se já tiver sido comunicada da prorrogação da prisão temporária ou da decretação da prisão preventiva.","alineas":[]},{"id":"lpte:art-2-p8","numero":"8","texto":"Inclui-se o dia do cumprimento do mandado de prisão no cômputo do prazo de prisão temporária.","alineas":[]}],
      incisos: [],
      referencias: [],
      historico: [{"versao":1,"texto":"§4: A O mandado de prisão conterá necessariamente o período de duração da prisão temporária estabelecido no caput deste artigo, bem como o dia em que o preso deverá ser libertado.","redacaoDadaPor":{"lei":"Incluído pela Lei nº 13.869. de 2019","artigo":""},"publicadoEm":"","vigenteDesde":"","vigenteAte":null},{"versao":2,"texto":"§7: Decorrido o prazo contido no mandado de prisão, a autoridade responsável pela custódia deverá, independentemente de nova ordem da autoridade judicial, pôr imediatamente o preso em liberdade, salvo se já tiver sido comunicada da prorrogação da prisão temporária ou da decretação da prisão preventiva.","redacaoDadaPor":{"lei":"Redação dada pela Lei nº 13.869. de 2019","artigo":""},"publicadoEm":"","vigenteDesde":"","vigenteAte":null},{"versao":3,"texto":"§8: Inclui-se o dia do cumprimento do mandado de prisão no cômputo do prazo de prisão temporária.","redacaoDadaPor":{"lei":"Incluído pela Lei nº 13.869. de 2019","artigo":""},"publicadoEm":"","vigenteDesde":"","vigenteAte":null}],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-3",
      numero: "3",
      caput: "Os presos temporários deverão permanecer, obrigatoriamente, separados dos demais detentos.",
      paragrafos: [],
      incisos: [],
      referencias: [],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-4",
      numero: "4",
      caput: "O art. 4° da Lei n° 4.898, de 9 de dezembro de 1965, fica acrescido da alínea i, com a seguinte redação:",
      paragrafos: [],
      incisos: [],
      referencias: ["lpte:art-4"],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-5",
      numero: "5",
      caput: "Em todas as comarcas e seções judiciárias haverá um plantão permanente de vinte e quatro horas do Poder Judiciário e do Ministério Público para apreciação dos pedidos de prisão temporária.",
      paragrafos: [],
      incisos: [],
      referencias: [],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-6",
      numero: "6",
      caput: "Esta Lei entra em vigor na data de sua publicação.",
      paragrafos: [],
      incisos: [],
      referencias: [],
      historico: [],
    },
    {
      tipo: "artigo" as const,
      id: "lpte:art-7",
      numero: "7",
      caput: "Revogam-se as disposições em contrário.",
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
