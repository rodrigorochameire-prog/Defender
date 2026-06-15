import { describe, it, expect } from "vitest";
import { parseAtaAudiencia } from "../parse-ata-audiencia";

const ATA = `ATA DE AUDIÊNCIA - INSTRUÇÃO E JULGAMENTO
Processo nº: 8009657-18.2025.8.05.0039
PRESENÇAS:
Juiz de Direito: André Gomma de Azevedo
Ministério Público: Nataly Santos de Araújo
Defensoria Pública: Rodrigo Rocha Meire
Vítima: Kauane Conceição Dos Santos
Acusado: Bryan Reino Soares Lima
Aos onze dias do mês de junho do ano de dois mil e vinte e seis, às 11h00min, na sala de audiências da Vara de Violência Doméstica e Familiar Contra a Mulher da Comarca de Camaçari/BA, sob a presidência do MM. Juiz de Direito André Gomma de Azevedo, foi realizada a audiência de Instrução e Julgamento nos autos em epígrafe.
Instalada a assentada, procedeu-se à abertura da fase instrutória, oportunidade em que foi colhido o depoimento da vítima Kauane Conceição Dos Santos, que respondeu às perguntas formuladas pelo Juízo, pelo Ministério Público e pela Defensoria Pública.
Em seguida, constatou-se a ausência da testemunha arrolada, Vanessa Santos da Conceição, tendo sido apresentada justificativa de que a mesma se encontra sob internamento hospitalar.
Considerando que a testemunha Vanessa Santos da Conceição encontra-se hospitalizada, determino a suspensão do presente ato técnico de instrução.
Para a continuidade da audiência, com a inquirição da referida testemunha e o posterior interrogatório do acusado Bryan Reino Soares Lima, designo o dia 28/07/2026, às 11h00min.
Link da audiência, oitiva da vítima:
<https://playback.lifesize.com/#/publicvideo/eb7c7bb7-e0ef-466c-83d0-5e61e691372e?vcpubtoken=ebc85f3a-41b3-4bd3-a9b9-bd42397ed208>.
Camaçari (BA), 11 de junho de 2026. André Gomma de Azevedo, Juiz de Direito.`;

describe("parseAtaAudiencia — ata real (Bryan)", () => {
  const r = parseAtaAudiencia(ATA);

  it("reconhece que é uma ata", () => {
    expect(r.ehAta).toBe(true);
  });

  it("extrai a data de realização por extenso (11/06/2026, não a redesignação 28/07)", () => {
    expect(r.dataRealizada).toBe("2026-06-11");
  });

  it("extrai o link de mídia (Lifesize) com o rótulo", () => {
    expect(r.midias).toHaveLength(1);
    expect(r.midias[0].tipo).toBe("lifesize");
    expect(r.midias[0].url).toContain("playback.lifesize.com/#/publicvideo/eb7c7bb7");
    expect(r.midias[0].url).not.toMatch(/[.>]$/); // sem pontuação grudada
    expect(r.midias[0].rotulo).toMatch(/oitiva da v[íi]tima/i);
  });

  it("extrai as presenças", () => {
    expect(r.presencas.juiz).toBe("André Gomma de Azevedo");
    expect(r.presencas.ministerioPublico).toBe("Nataly Santos de Araújo");
    expect(r.presencas.defensor).toBe("Rodrigo Rocha Meire");
    expect(r.presencas.vitima).toBe("Kauane Conceição Dos Santos");
    expect(r.presencas.acusado).toBe("Bryan Reino Soares Lima");
  });

  it("identifica quem foi ouvido", () => {
    expect(r.ouvidos.some((o) => /kauane/i.test(o.nome))).toBe(true);
  });

  it("identifica a ausência com o motivo", () => {
    const a = r.ausencias.find((x) => /vanessa/i.test(x.nome));
    expect(a).toBeTruthy();
    expect(a!.motivo).toMatch(/internamento hospitalar|hospitalizad/i);
  });

  it("classifica o resultado como suspensa e capta a redesignação", () => {
    expect(r.resultado).toBe("suspensa");
    expect(r.redesignacao?.data).toBe("2026-07-28");
    expect(r.redesignacao?.horario).toBe("11:00");
  });

  it("texto comum não vira ata", () => {
    expect(parseAtaAudiencia("Ciência da intimação. Nada a requerer.").ehAta).toBe(false);
  });
});
