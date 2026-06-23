import { describe, it, expect } from "vitest";
import {
  mapearFamiliares,
  normalizarGrau,
  type AssistidoFamiliarInput,
  type RelacaoMapeada,
} from "@/lib/promocao/backfill-familiares";

// Helper: monta um assistido mínimo com defaults nulos. O mapeador só lê
// id, nomeMae, nomePai, nomeContato, parentescoContato, telefoneContato.
const ass = (x: Partial<AssistidoFamiliarInput>): AssistidoFamiliarInput => ({
  id: 1,
  nomeMae: null,
  nomePai: null,
  nomeContato: null,
  parentescoContato: null,
  telefoneContato: null,
  ...x,
});

describe("normalizarGrau", () => {
  it("mapeia variações de mãe", () => {
    expect(normalizarGrau("mãe")).toBe("mae");
    expect(normalizarGrau("Mae")).toBe("mae");
    expect(normalizarGrau("genitora")).toBe("mae");
  });
  it("mapeia variações de pai", () => {
    expect(normalizarGrau("Pai")).toBe("pai");
    expect(normalizarGrau("genitor")).toBe("pai");
  });
  it("mapeia cônjuge/companheiro/esposa/marido", () => {
    expect(normalizarGrau("cônjuge")).toBe("conjuge");
    expect(normalizarGrau("esposa")).toBe("conjuge");
    expect(normalizarGrau("marido")).toBe("conjuge");
    expect(normalizarGrau("companheira")).toBe("conjuge");
  });
  it("mapeia filho/filha", () => {
    expect(normalizarGrau("filho")).toBe("filho");
    expect(normalizarGrau("Filha")).toBe("filho");
  });
  it("mapeia irmão/irmã", () => {
    expect(normalizarGrau("irmão")).toBe("irmao");
    expect(normalizarGrau("irma")).toBe("irmao");
  });
  it("desconhecido vira 'contato'", () => {
    expect(normalizarGrau("amigo")).toBe("contato");
    expect(normalizarGrau("vizinho")).toBe("contato");
  });
  it("vazio/nulo vira 'contato'", () => {
    expect(normalizarGrau(null)).toBe("contato");
    expect(normalizarGrau("")).toBe("contato");
    expect(normalizarGrau("   ")).toBe("contato");
  });
});

describe("mapearFamiliares", () => {
  it("extrai mãe e pai de nomeMae/nomePai", () => {
    const out = mapearFamiliares(ass({ nomeMae: "Maria Silva", nomePai: "João Silva" }));
    const maes = out.filter((r) => r.grau === "mae");
    const pais = out.filter((r) => r.grau === "pai");
    expect(maes).toHaveLength(1);
    expect(maes[0].nomeLivre).toBe("Maria Silva");
    expect(pais).toHaveLength(1);
    expect(pais[0].nomeLivre).toBe("João Silva");
  });

  it("pula campos vazios/nulos/só-espaços", () => {
    const out = mapearFamiliares(ass({ nomeMae: "  ", nomePai: null, nomeContato: "" }));
    expect(out).toHaveLength(0);
  });

  it("extrai contato com grau normalizado de parentescoContato", () => {
    const out = mapearFamiliares(
      ass({ nomeContato: "Ana Souza", parentescoContato: "esposa", telefoneContato: "71999990000" }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].grau).toBe("conjuge");
    expect(out[0].nomeLivre).toBe("Ana Souza");
    expect(out[0].telefone).toBe("71999990000");
  });

  it("contato sem parentesco vira grau 'contato'", () => {
    const out = mapearFamiliares(ass({ nomeContato: "Pedro" }));
    expect(out).toHaveLength(1);
    expect(out[0].grau).toBe("contato");
  });

  it("gera fonteRef estável e único por (assistido, grau)", () => {
    const out = mapearFamiliares(
      ass({ id: 42, nomeMae: "Maria", nomePai: "João", nomeContato: "Ana", parentescoContato: "irmã" }),
    );
    const refs = out.map((r) => r.fonteRef);
    expect(refs).toContain("assistido:42:mae");
    expect(refs).toContain("assistido:42:pai");
    // o contato sempre usa o prefixo `contato:` para não colidir com mãe/pai
    expect(refs).toContain("assistido:42:contato:irmao");
    // fonteRef único (chave de idempotência)
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("todas as relações trazem fonte = backfill-assistido", () => {
    const out = mapearFamiliares(ass({ nomeMae: "Maria" }));
    expect(out.every((r: RelacaoMapeada) => r.fonte === "backfill-assistido")).toBe(true);
  });

  it("é determinístico: mesma entrada → mesma saída", () => {
    const input = ass({ id: 7, nomeMae: "Maria", nomePai: "João" });
    expect(mapearFamiliares(input)).toEqual(mapearFamiliares(input));
  });

  it("contato com mesmo grau que mãe/pai gera fonteRef distinto por sufixo", () => {
    // Se o contato também for 'mae' (ex.: parentescoContato='mãe'), o fonteRef
    // do contato precisa não colidir com o da nomeMae.
    const out = mapearFamiliares(
      ass({ id: 5, nomeMae: "Maria Mãe", nomeContato: "Outra Mãe", parentescoContato: "mãe" }),
    );
    const refs = out.map((r) => r.fonteRef);
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).toContain("assistido:5:mae");
    expect(refs).toContain("assistido:5:contato:mae");
  });
});
