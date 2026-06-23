import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cautelaresDecisao } from "@/lib/db/schema/cautelares";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { processos } from "@/lib/db/schema/core";
import type { AcaoPromocaoCautelar, CandidatoCautelar } from "./tipos-cautelar";

/**
 * Porta (interface) que o applier de cautelares consome. O applier não sabe nada
 * sobre Drizzle: recebe um `PromocaoCautelarRepo` injetado. Em produção,
 * `criarRepoCautelarDrizzle(tx)` envolve a transação real; nos testes, um
 * repositório fake coleta as chamadas (sem DB).
 */
export interface PromocaoCautelarRepo {
  /**
   * Cria a decisão cautelar (origem='promocao', status='ativa', literal=texto
   * fonte). Retorna o id da decisão criada.
   */
  criarCautelar(
    processoId: number,
    dados: { codigo: string; especie: "prisao" | "diversa"; artigo: string },
    c: CandidatoCautelar,
  ): Promise<number>;
  /**
   * Registra a decisão de promoção na trilha de auditoria (`promocao_log`,
   * entidade='cautelar'). `cautelarId` é null em `sem-correspondencia`.
   */
  log(
    processoId: number,
    acao: string,
    c: CandidatoCautelar,
    cautelarId: number | null,
  ): Promise<void>;
  /** Marca `processos.cautelares_promovidas_em` (flag de skip do backfill). */
  marcarPromovido(processoId: number): Promise<void>;
}

/**
 * Implementação Drizzle da porta de cautelares. `tx` é tipado como `typeof db` —
 * o mesmo tipo passado ao callback de `db.transaction` (veja src/lib/db/index.ts).
 *
 * NUMERIC→string: a coluna `confianca` do log é `numeric` no Drizzle → inserir
 * como string. `cautelares_decisao` não tem coluna de confidence.
 */
export function criarRepoCautelarDrizzle(tx: typeof db): PromocaoCautelarRepo {
  return {
    async criarCautelar(processoId, dados, c) {
      const [row] = await tx
        .insert(cautelaresDecisao)
        .values({
          processoId,
          codigo: dados.codigo,
          especie: dados.especie,
          artigo: dados.artigo,
          literal: c.medida,
          status: "ativa",
          origem: "promocao",
        })
        .returning({ id: cautelaresDecisao.id });
      return row.id;
    },

    async log(processoId, acao, c, cautelarId) {
      await tx.insert(promocaoLog).values({
        entidade: "cautelar",
        processoId,
        // Reuso da tabela de pessoas: candidatoNome=texto da medida (auditoria),
        // pessoaId=cautelarId (campo int de auditoria).
        candidatoNome: c.medida,
        candidatoCpf: null,
        acao,
        pessoaId: cautelarId,
        candidatosIds: null,
        confianca: String(c.confianca),
        fonteRef: c.fonteRef,
      });
    },

    async marcarPromovido(processoId) {
      await tx
        .update(processos)
        .set({ cautelaresPromovidasEm: new Date() })
        .where(eq(processos.id, processoId));
    },
  };
}

/** Re-export de conveniência para o applier (mantém o módulo coeso). */
export type { AcaoPromocaoCautelar };
