import { describe, it, expect } from "vitest";
import { candidatosDeDepoentes } from "@/lib/promocao/adaptador-depoentes";
import { planejarPromocao } from "@/lib/promocao/planejar";
import { aplicarAcoes } from "@/lib/promocao/applier";
import type { PromocaoRepo } from "@/lib/promocao/repo";
import type { Testemunha } from "@/lib/db/schema/agenda";
import type { CandidatoPessoa, PessoaExistente, ParticipacaoExistente } from "@/lib/promocao/tipos";

const tw = (id: number, nome: string, tipo: Testemunha["tipo"]): Testemunha =>
  ({ id, processoId: 10, nome, tipo, status: "ARROLADA" } as unknown as Testemunha);

// Verifica que um depoente cujo nome já foi promovido (via analysisData → pessoa
// existente com participação origem="promocao" no mesmo processo+papel) NÃO
// duplica: o planner o resolve para `ignorar`.
describe("idempotência depoentes ↔ pessoa já promovida", () => {
  it("depoente já-pessoa (nome bate, participação promocao mesma papel) → ignorar", () => {
    const candidatos = candidatosDeDepoentes(10, [tw(7, "Ana Maria", "ACUSACAO")]);
    expect(candidatos[0].papel).toBe("testemunha");

    const existentes: PessoaExistente[] = [
      { id: 50, nomeNormalizado: "ana maria", nomesAlternativos: [], cpf: null, dataNascimento: null },
    ];
    // Pessoa 50 já tem participação de promoção neste processo, papel testemunha.
    const participacoes: ParticipacaoExistente[] = [
      { pessoaId: 50, processoId: 10, papel: "testemunha", origem: "promocao" },
    ];

    const acoes = planejarPromocao({ processoId: 10, candidatos, existentes, participacoes });
    expect(acoes).toHaveLength(1);
    expect(acoes[0].tipo).toBe("ignorar");
  });

  it("re-run não cria participação nova quando já ignorado (applier não insere)", async () => {
    const candidatos = candidatosDeDepoentes(10, [tw(7, "Ana Maria", "ACUSACAO")]);
    const existentes: PessoaExistente[] = [
      { id: 50, nomeNormalizado: "ana maria", nomesAlternativos: [], cpf: null, dataNascimento: null },
    ];
    const participacoes: ParticipacaoExistente[] = [
      { pessoaId: 50, processoId: 10, papel: "testemunha", origem: "promocao" },
    ];
    const acoes = planejarPromocao({ processoId: 10, candidatos, existentes, participacoes });

    const inseridas: unknown[] = [];
    const criadas: unknown[] = [];
    const repo: PromocaoRepo = {
      async criarPessoa(c) { criadas.push(c); return 999; },
      async inserirParticipacao(_p, _id, c) { inseridas.push(c); },
      async atualizarParticipacao() {},
      async log() {},
      async marcarPromovido() {},
    };
    await aplicarAcoes(repo, 10, null, acoes);
    expect(criadas).toHaveLength(0);
    expect(inseridas).toHaveLength(0);
  });

  it("depoente novo (nome não bate) → criar com testemunhaId propagado ao repo", async () => {
    const candidatos = candidatosDeDepoentes(10, [tw(8, "Carlos Novo", "DEFESA")]);
    const acoes = planejarPromocao({ processoId: 10, candidatos, existentes: [], participacoes: [] });
    expect(acoes[0].tipo).toBe("criar");

    const inseridas: CandidatoPessoa[] = [];
    const repo: PromocaoRepo = {
      async criarPessoa() { return 123; },
      async inserirParticipacao(_p, _id, c) { inseridas.push(c); },
      async atualizarParticipacao() {},
      async log() {},
      async marcarPromovido() {},
    };
    await aplicarAcoes(repo, 10, null, acoes);
    expect(inseridas).toHaveLength(1);
    expect((inseridas[0] as CandidatoPessoa & { testemunhaId?: number }).testemunhaId).toBe(8);
  });
});
