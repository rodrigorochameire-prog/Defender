import type { Legislacao } from "./types";

// Importações estáticas — necessário para Turbopack analisar corretamente
import codigoPenal from "./data/codigo-penal";
import cpp from "./data/cpp";
import lep from "./data/lep";
import mariaDaPenha from "./data/maria-da-penha";
import drogas from "./data/drogas";
import eca from "./data/eca";
import abusoAutoridade from "./data/abuso-autoridade";
import cf88Titulo2 from "./data/cf88-titulo2";
import contravencoes from "./data/contravencoes";
import desarmamento from "./data/desarmamento";
import testemunhasProtegidas from "./data/testemunhas-protegidas";
import prisaoTemporaria from "./data/prisao-temporaria";
import marianaFerrer from "./data/mariana-ferrer";
import lc80 from "./data/lc80";
import lce26Bahia from "./data/lce26-bahia";
import jecrim from "./data/jecrim";
import crimesHediondos from "./data/crimes-hediondos";
import interceptacao from "./data/interceptacao";
import organizacaoCriminosa from "./data/organizacao-criminosa";
import ctbCrimes from "./data/ctb-crimes";
import tortura from "./data/tortura";
import racismo from "./data/racismo";
import crimesAmbientais from "./data/crimes-ambientais";
import estatutoIdoso from "./data/estatuto-idoso";
import lavagemDinheiro from "./data/lavagem-dinheiro";
import identificacaoCriminal from "./data/identificacao-criminal";
import crimesCiberneticos from "./data/crimes-ciberneticos";
import antiterrorismo from "./data/antiterrorismo";

export const LEGISLACAO_REGISTRY: Record<string, Legislacao> = {
  "codigo-penal": codigoPenal,
  "cpp": cpp,
  "lep": lep,
  "maria-da-penha": mariaDaPenha,
  "drogas": drogas,
  "eca": eca,
  "abuso-autoridade": abusoAutoridade,
  "cf88-titulo2": cf88Titulo2,
  "contravencoes": contravencoes,
  "desarmamento": desarmamento,
  "testemunhas-protegidas": testemunhasProtegidas,
  "prisao-temporaria": prisaoTemporaria,
  "mariana-ferrer": marianaFerrer,
  "lc80": lc80,
  "lce26-bahia": lce26Bahia,
  "jecrim": jecrim,
  "crimes-hediondos": crimesHediondos,
  "interceptacao": interceptacao,
  "organizacao-criminosa": organizacaoCriminosa,
  "ctb-crimes": ctbCrimes,
  "tortura": tortura,
  "racismo": racismo,
  "crimes-ambientais": crimesAmbientais,
  "estatuto-idoso": estatutoIdoso,
  "lavagem-dinheiro": lavagemDinheiro,
  "identificacao-criminal": identificacaoCriminal,
  "crimes-ciberneticos": crimesCiberneticos,
  "antiterrorismo": antiterrorismo,
};
