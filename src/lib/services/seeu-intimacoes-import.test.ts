import { describe, it, expect } from "vitest";
import {
  buildSeeuLedgerUpserts,
  parseSeeuRow,
  seeuStagingRowToImportRow,
} from "@/lib/services/seeu-intimacoes-import";
import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";

function row(over: Partial<SeeuImportStaging>): SeeuImportStaging {
  return {
    id: 1, jobId: 10, atribuicao: "EXECUCAO_PENAL", tab: "manifestacao",
    seq: 1552, processoNumero: "2000068-07.2025.8.05.0039", assistidoNome: "X",
    ato: "Manifestação", tipoDocumento: null, dataExpedicao: null,
    dataIntimacao: null, prazo: null, conteudo: "bloco", pjeDocumentoId: null,
    contentHash: "h1", decisao: "nova", matchedDemandaId: null,
    matchedLedgerId: null, selected: true, revisao: null,
    createdAt: new Date(), ...over,
  } as SeeuImportStaging;
}

// Blocos reais capturados (com a sentinela "Mesa do Defensor" que o worker prefixa).
// O de "Medidas Alternativas" NÃO contém "Execução da Pena" → provaria o misroute
// sob auto-detecção; aqui deve parsear porque forçamos SEEU.
const BLOCO_MEDIDAS_ALT =
  "Mesa do Defensor\n812\t\n2000108-91.2022.8.05.0039 \tExecução de Medidas Alternativas no Juízo Comum\n" +
  "(Acordo de Não Persecução Penal)\t\nPolo Ativo:\t\nMinistério Público do Estado da Bahia\n\n\n" +
  "Executado:\t\nRENATO DIAS DE FREITAS\n\t\t30/06/2026\n10/07/2026\t5 dias corridos\t\nAnalisar\n";
const BLOCO_CIENCIA =
  "Mesa do Defensor\n1000\t\n2000124-11.2023.8.05.0039 \tExecução da Pena\n(Pena Privativa de Liberdade)\t\n" +
  "Autoridade:\t\nEstado da Bahia\n\n\nExecutado:\t\nFRANKLIN LEITE DOS SANTOS\n" +
  "\t\t30/06/2026\n10/07/2026\t5 dias corridos\t\nAnalisar\n\n[ Dispensar Juntada ]\t\n";

describe("parseSeeuRow / seeuStagingRowToImportRow (forçado, não auto-detecta)", () => {
  it("parseSeeuRow parsa bloco 'Medidas Alternativas' que o auto-detect erraria", () => {
    const int = parseSeeuRow(row({ tab: "manifestacao", conteudo: BLOCO_MEDIDAS_ALT }));
    expect(int?.assistido).toBe("Renato Dias de Freitas");
    expect(int?.dataEnvio).toBe("30/06/2026");
    expect(int?.ultimoDia).toBe("10/07/2026");
  });

  it("aba ciencia → ImportRow com ato 'Ciência' e status de ciência", () => {
    const ir = seeuStagingRowToImportRow(row({ tab: "ciencia", conteudo: BLOCO_CIENCIA, ato: "Ciência" }));
    expect(ir.assistido).toBe("Franklin Leite dos Santos");
    expect(ir.ato).toBe("Ciência");
    expect(ir.status).toBe("ciencia");
    expect(ir.atribuicao).toBe("EXECUCAO_PENAL");
  });

  it("aba manifestacao → ImportRow com ato 'Manifestação' e status analisar", () => {
    const ir = seeuStagingRowToImportRow(row({ tab: "manifestacao", conteudo: BLOCO_MEDIDAS_ALT, ato: "Manifestação" }));
    expect(ir.ato).toBe("Manifestação");
    expect(ir.status).toBe("analisar");
  });

  it("aba razoes → ImportRow preserva o ato 'Razões' do worker (não vira 'Manifestação')", () => {
    const ir = seeuStagingRowToImportRow(row({ tab: "razoes", conteudo: BLOCO_MEDIDAS_ALT, ato: "Razões" }));
    expect(ir.ato).toBe("Razões");
    expect(ir.status).toBe("analisar");
  });

  it("edições em revisao vencem o parse (assistido)", () => {
    const ir = seeuStagingRowToImportRow(
      row({ tab: "manifestacao", conteudo: BLOCO_MEDIDAS_ALT, revisao: { assistidoNome: "Nome Editado" } }),
    );
    expect(ir.assistido).toBe("Nome Editado");
  });
});

describe("buildSeeuLedgerUpserts", () => {
  it("marca imported quando selecionado, preservando processo+seq", () => {
    const ups = buildSeeuLedgerUpserts([row({ id: 1 })], new Set([1]), 10);
    expect(ups[0]).toMatchObject({
      processoNumero: "2000068-07.2025.8.05.0039", seq: 1552,
      contentHash: "h1", decisao: "imported", jobId: 10,
    });
  });

  it("marca duplicate para linha ja_importada não selecionada e skipped p/ nova não selecionada", () => {
    const ups = buildSeeuLedgerUpserts(
      [row({ id: 1, decisao: "ja_importada" }), row({ id: 2, seq: 999, decisao: "nova" })],
      new Set(),
      10,
    );
    expect(ups[0].decisao).toBe("duplicate");
    expect(ups[1].decisao).toBe("skipped");
  });
});
