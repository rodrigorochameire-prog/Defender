import { describe, it, expect } from "vitest";
import { candidatosDeDepoentes } from "@/lib/promocao/adaptador-depoentes";
import type { Testemunha } from "@/lib/db/schema/agenda";

// Helper: monta uma Testemunha mínima com defaults plausíveis. Os campos não
// usados pelo adaptador são preenchidos com null/valores neutros via `as any`,
// já que o adaptador só lê `id`, `nome`, `tipo`.
const tw = (x: Partial<Testemunha>): Testemunha =>
  ({
    id: 1,
    processoId: 10,
    casoId: null,
    audienciaId: null,
    nome: "Fulano",
    tipo: "COMUM",
    status: "ARROLADA",
    telefone: null,
    endereco: null,
    resumoDepoimento: null,
    pontosFavoraveis: null,
    pontosDesfavoraveis: null,
    perguntasSugeridas: null,
    ordemInquiricao: null,
    observacoes: null,
    ouvidoEm: null,
    redesignadoPara: null,
    sinteseJuizo: null,
    audioDriveFileId: null,
    depoimentoAudioUrl: null,
    depoimentoTranscricao: null,
    transcricaoResumo: null,
    transcricaoStatus: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...x,
  }) as Testemunha;

describe("candidatosDeDepoentes", () => {
  it("ACUSACAO → testemunha/acusacao com fonteRef, confianca 0.8 e testemunhaId", () => {
    const out = candidatosDeDepoentes(10, [tw({ id: 7, nome: "Ana", tipo: "ACUSACAO" })]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      nome: "Ana",
      papel: "testemunha",
      lado: "acusacao",
      fonteRef: "depoentes:10",
      confianca: 0.8,
      testemunhaId: 7,
    });
  });

  it("DEFESA → testemunha/defesa", () => {
    const out = candidatosDeDepoentes(10, [tw({ id: 8, nome: "Bruno", tipo: "DEFESA" })]);
    expect(out[0]).toMatchObject({ papel: "testemunha", lado: "defesa", testemunhaId: 8 });
  });

  it("outros tipos (COMUM/INFORMANTE/PERITO/VITIMA) → testemunha sem lado", () => {
    const out = candidatosDeDepoentes(10, [
      tw({ id: 1, nome: "C", tipo: "COMUM" }),
      tw({ id: 2, nome: "I", tipo: "INFORMANTE" }),
      tw({ id: 3, nome: "P", tipo: "PERITO" }),
      tw({ id: 4, nome: "V", tipo: "VITIMA" }),
    ]);
    expect(out).toHaveLength(4);
    for (const c of out) {
      expect(c.papel).toBe("testemunha");
      expect(c.lado ?? null).toBeNull();
    }
  });

  it("filtra linhas sem nome (vazio/espaços)", () => {
    const out = candidatosDeDepoentes(10, [
      tw({ id: 1, nome: "", tipo: "DEFESA" }),
      tw({ id: 2, nome: "   ", tipo: "DEFESA" }),
      tw({ id: 3, nome: "Carlos", tipo: "DEFESA" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].nome).toBe("Carlos");
    expect(out[0].testemunhaId).toBe(3);
  });

  it("preserva o processoId recebido no fonteRef, não o da linha", () => {
    const out = candidatosDeDepoentes(42, [tw({ id: 5, nome: "Davi", tipo: "DEFESA", processoId: 99 })]);
    expect(out[0].fonteRef).toBe("depoentes:42");
  });

  it("lista vazia → []", () => {
    expect(candidatosDeDepoentes(10, [])).toEqual([]);
  });

  it("não carrega cpf/nascimento (não disponíveis em testemunhas)", () => {
    const out = candidatosDeDepoentes(10, [tw({ id: 1, nome: "Eva", tipo: "ACUSACAO" })]);
    expect(out[0].cpf ?? null).toBeNull();
    expect(out[0].dataNascimento ?? null).toBeNull();
  });
});
