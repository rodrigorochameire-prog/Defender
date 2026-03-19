import type { Legislacao } from "../types";

const data: Legislacao = {
  id: "tortura",
  nome: "Lei de Tortura",
  nomeAbreviado: "LT",
  referencia: "Lei nº 9.455/1997",
  fonte: "https://www.planalto.gov.br/ccivil_03/leis/l9455.htm",
  dataUltimaAtualizacao: "2026-03-19",
  estrutura: [
    {
      tipo: "titulo" as const,
      nome: "Disposições",
      filhos: [
        {
          tipo: "artigo" as const,
          id: "lt:art-1",
          numero: "1",
          caput: "Constitui crime de tortura:",
          paragrafos: [
            {
              id: "lt:art-1-p1",
              numero: "1",
              texto: "Na mesma pena incorre quem submete pessoa presa ou sujeita a medida de segurança a sofrimento físico ou mental, por intermédio da prática de ato não previsto em lei ou não resultante de medida legal.",
              alineas: [],
            },
            {
              id: "lt:art-1-p2",
              numero: "2",
              texto: "Aquele que se omite em face dessas condutas, quando tinha o dever de evitá-las ou apurá-las, incorre na pena de detenção de um a quatro anos.",
              alineas: [],
            },
            {
              id: "lt:art-1-p3",
              numero: "3",
              texto: "Se resulta lesão corporal de natureza grave ou gravíssima, a pena é de reclusão de quatro a dez anos; se resulta morte, a reclusão é de oito a dezesseis anos.",
              alineas: [],
            },
            {
              id: "lt:art-1-p4",
              numero: "4",
              texto: "Aumenta-se a pena de um sexto até um terço: I - se o crime é cometido por agente público; II – se o crime é cometido contra criança, gestante, portador de deficiência, adolescente ou maior de 60 (sessenta) anos; III - se o crime é cometido mediante sequestro.",
              alineas: [],
            },
            {
              id: "lt:art-1-p5",
              numero: "5",
              texto: "A condenação acarretará a perda do cargo, função ou emprego público e a interdição para seu exercício pelo dobro do prazo da pena aplicada.",
              alineas: [],
            },
            {
              id: "lt:art-1-p6",
              numero: "6",
              texto: "O crime de tortura é inafiançável e insuscetível de graça ou anistia.",
              alineas: [],
            },
            {
              id: "lt:art-1-p7",
              numero: "7",
              texto: "O condenado por crime previsto nesta Lei, salvo a hipótese do § 2o, iniciará o cumprimento da pena em regime fechado.",
              alineas: [],
            },
          ],
          incisos: [
            {
              id: "lt:art-1-inc-I",
              numero: "I",
              texto: "constranger alguém com emprego de violência ou grave ameaça, causando-lhe sofrimento físico ou mental:",
              alineas: [
                {
                  id: "lt:art-1-inc-I-a",
                  numero: "a",
                  texto: "com o fim de obter informação, declaração ou confissão da vítima ou de terceira pessoa;",
                },
                {
                  id: "lt:art-1-inc-I-b",
                  numero: "b",
                  texto: "para provocar ação ou omissão de natureza criminosa;",
                },
                {
                  id: "lt:art-1-inc-I-c",
                  numero: "c",
                  texto: "em razão de discriminação racial ou religiosa;",
                },
              ],
            },
            {
              id: "lt:art-1-inc-II",
              numero: "II",
              texto: "submeter alguém, sob sua guarda, poder ou autoridade, com emprego de violência ou grave ameaça, a intenso sofrimento físico ou mental, como forma de aplicar castigo pessoal ou medida de caráter preventivo.",
              alineas: [],
            },
          ],
          referencias: [],
          historico: [],
        },
        {
          tipo: "artigo" as const,
          id: "lt:art-2",
          numero: "2",
          caput: "O disposto nesta Lei aplica-se ainda quando o crime não tenha sido cometido em território nacional, sendo a vítima brasileira ou encontrando-se o agente em local sob jurisdição brasileira.",
          paragrafos: [],
          incisos: [],
          referencias: [],
          historico: [],
        },
        {
          tipo: "artigo" as const,
          id: "lt:art-3",
          numero: "3",
          caput: "Esta Lei entra em vigor na data de sua publicação.",
          paragrafos: [],
          incisos: [],
          referencias: [],
          historico: [],
        },
        {
          tipo: "artigo" as const,
          id: "lt:art-4",
          numero: "4",
          caput: "Revoga-se o art. 233 da Lei nº 8.069, de 13 de julho de 1990 - Estatuto da Criança e do Adolescente.",
          paragrafos: [],
          incisos: [],
          referencias: [],
          historico: [],
        },
      ],
    },
  ],
};

export default data;
