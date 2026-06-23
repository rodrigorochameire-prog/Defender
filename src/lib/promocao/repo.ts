import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pessoas, participacoesProcesso } from "@/lib/db/schema/pessoas";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { processos } from "@/lib/db/schema/core";
import { normalizarNome } from "@/lib/pessoas/normalize";
import type { CandidatoPessoa } from "./tipos";

/**
 * Porta (interface) que o applier consome. O applier não sabe nada sobre Drizzle:
 * recebe um `PromocaoRepo` injetado. Em produção, `criarRepoDrizzle(tx)` envolve
 * a transação real; nos testes, um repositório fake coleta as chamadas.
 */
export interface PromocaoRepo {
  /** Cria a pessoa no catálogo global e retorna o `pessoaId`. */
  criarPessoa(c: CandidatoPessoa, fonteCriacao: string, workspaceId: number | null): Promise<number>;
  inserirParticipacao(processoId: number, pessoaId: number, c: CandidatoPessoa): Promise<void>;
  atualizarParticipacao(processoId: number, pessoaId: number, c: CandidatoPessoa): Promise<void>;
  log(
    processoId: number,
    acao: string,
    c: CandidatoPessoa,
    pessoaId: number | null,
    candidatosIds: number[] | null,
  ): Promise<void>;
  marcarPromovido(processoId: number): Promise<void>;
}

/**
 * Implementação Drizzle da porta. `tx` é tipado como `typeof db` — o mesmo tipo
 * passado ao callback de `db.transaction` (veja src/lib/db/index.ts).
 *
 * NUMERIC→string: colunas `confidence`/`confianca` são `numeric` no Drizzle →
 * inserir como string (`String(c.confianca)`).
 */
export function criarRepoDrizzle(tx: typeof db): PromocaoRepo {
  return {
    async criarPessoa(c, fonteCriacao, workspaceId) {
      const [row] = await tx
        .insert(pessoas)
        .values({
          nome: c.nome,
          nomeNormalizado: normalizarNome(c.nome),
          cpf: c.cpf ?? null,
          dataNascimento: c.dataNascimento ?? null,
          fonteCriacao,
          confidence: String(c.confianca),
          workspaceId,
        })
        .returning({ id: pessoas.id });
      return row.id;
    },

    async inserirParticipacao(processoId, pessoaId, c) {
      await tx.insert(participacoesProcesso).values({
        pessoaId,
        processoId,
        papel: c.papel,
        lado: c.lado ?? null,
        subpapel: c.subpapel ?? null,
        fonte: "promocao",
        origem: "promocao",
        fonteRef: c.fonteRef,
        confidence: String(c.confianca),
      });
    },

    async atualizarParticipacao(processoId, pessoaId, c) {
      await tx
        .update(participacoesProcesso)
        .set({
          lado: c.lado ?? null,
          subpapel: c.subpapel ?? null,
          fonteRef: c.fonteRef,
          confidence: String(c.confianca),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(participacoesProcesso.processoId, processoId),
            eq(participacoesProcesso.pessoaId, pessoaId),
            eq(participacoesProcesso.papel, c.papel),
          ),
        );
    },

    async log(processoId, acao, c, pessoaId, candidatosIds) {
      await tx.insert(promocaoLog).values({
        entidade: "pessoa",
        processoId,
        candidatoNome: c.nome,
        candidatoCpf: c.cpf ?? null,
        acao,
        pessoaId,
        candidatosIds: candidatosIds && candidatosIds.length ? candidatosIds.join(",") : null,
        confianca: String(c.confianca),
        fonteRef: c.fonteRef,
      });
    },

    async marcarPromovido(processoId) {
      await tx
        .update(processos)
        .set({ pessoasPromovidasEm: new Date() })
        .where(eq(processos.id, processoId));
    },
  };
}
