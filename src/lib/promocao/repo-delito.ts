import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tipificacoes } from "@/lib/db/schema/delitos-catalogo";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { processos } from "@/lib/db/schema/core";
import type { CandidatoDelito } from "./tipos-delito";

/**
 * Porta (interface) que o applier de delitos consome. O applier não sabe nada
 * sobre Drizzle: recebe um `PromocaoDelitoRepo` injetado. Em produção,
 * `criarRepoDelitoDrizzle(tx)` envolve a transação real; nos testes, um
 * repositório fake coleta as chamadas (sem DB).
 */
export interface PromocaoDelitoRepo {
  /**
   * Cria a tipificação (vínculo processo↔delito) com `origem='promocao'`.
   * Retorna o id da tipificação criada.
   */
  criarTipificacao(processoId: number, delitoId: number, c: CandidatoDelito): Promise<number>;
  /**
   * Registra a decisão de promoção na trilha de auditoria (`promocao_log`,
   * entidade='delito'). `delitoId` é null em `sem-correspondencia`.
   */
  log(
    processoId: number,
    acao: string,
    c: CandidatoDelito,
    delitoId: number | null,
  ): Promise<void>;
  /** Marca `processos.delitos_promovidos_em` (flag de skip do backfill). */
  marcarPromovido(processoId: number): Promise<void>;
}

/**
 * Implementação Drizzle da porta de delitos. `tx` é tipado como `typeof db` — o
 * mesmo tipo passado ao callback de `db.transaction` (veja src/lib/db/index.ts).
 *
 * NUMERIC→string: colunas `confidence`/`confianca` são `numeric` no Drizzle →
 * inserir como string (`String(c.confianca)`).
 */
export function criarRepoDelitoDrizzle(tx: typeof db): PromocaoDelitoRepo {
  return {
    async criarTipificacao(processoId, delitoId, c) {
      const [row] = await tx
        .insert(tipificacoes)
        .values({
          processoId,
          delitoId,
          qualificadoras: c.qualificadoras,
          majorantes: c.majorantes,
          minorantes: c.minorantes,
          observacoes: c.observacoes ?? null,
          fonte: "promocao",
          origem: "promocao",
          confidence: String(c.confianca),
        })
        .returning({ id: tipificacoes.id });
      return row.id;
    },

    async log(processoId, acao, c, delitoId) {
      await tx.insert(promocaoLog).values({
        entidade: "delito",
        processoId,
        // Reuso da tabela de pessoas: candidatoNome=crime, candidatoCpf=artigo
        // (apenas texto de auditoria), pessoaId=delitoId (campo int de auditoria).
        candidatoNome: c.crime,
        candidatoCpf: c.artigoBruto ?? null,
        acao,
        pessoaId: delitoId,
        candidatosIds: null,
        confianca: String(c.confianca),
        fonteRef: c.fonteRef,
      });
    },

    async marcarPromovido(processoId) {
      await tx
        .update(processos)
        .set({ delitosPromovidosEm: new Date() })
        .where(eq(processos.id, processoId));
    },
  };
}
