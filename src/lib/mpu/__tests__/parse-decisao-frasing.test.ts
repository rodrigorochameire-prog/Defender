import { describe, it, expect } from "vitest";
import { parseDecisaoMPU } from "../parse-decisao";

// Regressão: decisão real (proc. 8013098-70.2026, Matheus H.) com fraseado
// descritivo (não-canônico) das medidas do art. 22, II e III, a/b/c.
const DECISAO_MATHEUS = `Ex positis, com fundamento no art. 19, § 1.º, da Lei 11.340/06, defiro o pedido formulado, para aplicar ao suposto agressor MATHEUS HENRIQUE BEZERRA COSTA, sem sua oitiva prévia, as medidas elencadas no artigo 22, incisos II e III, alíneas "a", "b" e "c", da Lei Maria da Penha:

a) afastamento IMEDIATO do lar, domicílio ou local de convivência com a ofendida, ficando facultado ao requerido apenas a retirada dos seus pertences pessoais e objetos de trabalho;

b) manutenção de uma distância mínima de 200 (duzentos) metros da ofendida, familiares e testemunhas, em qualquer local onde estiverem;

c) proibição de manter qualquer contato com a ofendida, familiares e testemunhas, seja pessoalmente ou por qualquer outro canal de comunicação, a exemplo de telefonemas, mensagens eletrônicas de texto ou de voz, e-mail's, redes sociais, notadamente Facebook, Instagram ou mesmo pelo aplicativo de celular WhatsApp;

d) proibição de frequentar os locais onde saiba estar a ofendida, em especial a sua residência e o seu local de trabalho;

e) obrigação de manter seu endereço atualizado nos autos, comunicando imediatamente qualquer mudança.`;

describe("parseDecisaoMPU — fraseado descritivo (não-canônico)", () => {
  const r = parseDecisaoMPU(DECISAO_MATHEUS);
  const codigos = r.medidas.map((m) => m.codigo).sort();

  it("reconhece as quatro medidas (II e III a/b/c)", () => {
    expect(codigos).toEqual([
      "AFASTAMENTO_LAR",
      "PROIBICAO_APROXIMACAO",
      "PROIBICAO_CONTATO",
      "PROIBICAO_FREQUENTAR",
    ]);
  });

  it("extrai a distância de 200 metros na aproximação", () => {
    const ap = r.medidas.find((m) => m.codigo === "PROIBICAO_APROXIMACAO");
    expect(ap?.distanciaMetros).toBe(200);
  });
});
