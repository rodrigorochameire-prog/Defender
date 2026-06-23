import { describe, it, expect } from "vitest";
import { normalizarFeed } from "@/lib/registros/feed-unificado";
import { familiaDeTipo, rotuloDoTipo } from "@/lib/registros/tipologia";

describe("tipologia", () => {
  it("mapeia tipos de registro para famílias", () => {
    expect(familiaDeTipo("registro", "atendimento")).toBe("contato");
    expect(familiaDeTipo("registro", "peticao")).toBe("producao");
    expect(familiaDeTipo("registro", "busca")).toBe("investigacao");
    expect(familiaDeTipo("registro", "delegacao")).toBe("gestao");
    expect(familiaDeTipo("registro", "anotacao")).toBe("nota");
  });
  it("audiência tem família própria; demanda-evento mapeia por tipo", () => {
    expect(familiaDeTipo("audiencia", "instrucao")).toBe("audiencia");
    expect(familiaDeTipo("demanda-evento", "diligencia")).toBe("producao");
  });
  it("tipo desconhecido → nota", () => {
    expect(familiaDeTipo("registro", "xpto")).toBe("nota");
    expect(rotuloDoTipo("registro", "xpto")).toBe("xpto");
  });
});

describe("normalizarFeed", () => {
  const base = { registros: [], demandaEventos: [], audiencias: [] };

  it("vazio → []", () => expect(normalizarFeed(base)).toEqual([]));

  it("funde as 3 fontes e ordena por data desc", () => {
    const feed = normalizarFeed({
      registros: [{ id: 1, tipo: "ciencia", dataRegistro: "2026-06-01T10:00:00Z", titulo: "Ciência", conteudo: "...", status: "realizado", demandaId: 5, audienciaId: 9, processoId: 3, dossieAtendimento: null, enrichmentData: null, pontosChave: null, autorId: 7 }],
      demandaEventos: [{ id: 2, tipo: "diligencia", subtipo: "peticao", resumo: "Protocolar", descricao: null, status: "pendente", prazo: "2026-06-10", createdAt: "2026-06-03T08:00:00Z", demandaId: 5, processoId: 3, autorId: 7 }],
      audiencias: [{ id: 3, tipo: "instrucao", dataAudiencia: "2026-06-02T14:00:00Z", local: "Sala 2", status: "agendada", processoId: 3 }],
    });
    expect(feed.map((i) => i.id)).toEqual(["demanda-evento:2", "audiencia:3", "registro:1"]);
  });

  it("preserva links e família por item", () => {
    const [reg] = normalizarFeed({ ...base, registros: [{ id: 1, tipo: "atendimento", dataRegistro: "2026-06-01T10:00:00Z", titulo: null, conteudo: "x", status: null, demandaId: 8, audienciaId: null, processoId: 2, dossieAtendimento: { a: 1 }, enrichmentData: null, pontosChave: null, autorId: null }] });
    expect(reg.familia).toBe("contato");
    expect(reg.links.demandaId).toBe(8);
    expect(reg.temDados).toBe(true); // tem dossiê
  });

  it("audiência vira item linkado ao processo + audienciaId", () => {
    const [a] = normalizarFeed({ ...base, audiencias: [{ id: 3, tipo: "custodia", dataAudiencia: "2026-06-02T14:00:00Z", local: null, status: "realizada", processoId: 4 }] });
    expect(a.links).toEqual({ demandaId: null, audienciaId: 3, processoId: 4 });
    expect(a.rotulo).toBe("Audiência");
  });
});
