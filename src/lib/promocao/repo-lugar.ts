import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lugares, participacoesLugar } from "@/lib/db/schema/lugares";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { processos } from "@/lib/db/schema/core";
import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";
import type { CandidatoLugar } from "./tipos-lugar";

/**
 * Porta (interface) que o applier de lugares consome. O applier não sabe nada
 * sobre Drizzle: recebe um `PromocaoLugarRepo` injetado. Em produção,
 * `criarRepoLugarDrizzle(tx)` envolve a transação real; nos testes, um
 * repositório fake coleta as chamadas (sem DB).
 */
export interface PromocaoLugarRepo {
  /** Cria o lugar (fonteCriacao='promocao', endereço normalizado) e retorna o id. */
  criarLugar(c: CandidatoLugar, workspaceId: number): Promise<number>;
  /** Cria a participação (vínculo processo↔lugar) com `fonte='promocao'`. */
  inserirParticipacao(processoId: number, lugarId: number, c: CandidatoLugar): Promise<void>;
  /** Registra a decisão de promoção na trilha de auditoria (`promocao_log`, entidade='lugar'). */
  log(
    processoId: number,
    acao: string,
    c: CandidatoLugar,
    lugarId: number | null,
  ): Promise<void>;
  /** Marca `processos.lugares_promovidos_em` (flag de skip do backfill). */
  marcarPromovido(processoId: number): Promise<void>;
}

/**
 * Implementação Drizzle da porta de lugares. `tx` é tipado como `typeof db` — o
 * mesmo tipo passado ao callback de `db.transaction` (veja src/lib/db/index.ts).
 *
 * NUMERIC→string: colunas `confidence`/`latitude`/`longitude` são `numeric` no
 * Drizzle → inserir como string.
 */
export function criarRepoLugarDrizzle(tx: typeof db): PromocaoLugarRepo {
  return {
    async criarLugar(c, workspaceId) {
      const [row] = await tx
        .insert(lugares)
        .values({
          workspaceId,
          enderecoCompleto: c.enderecoCompleto,
          enderecoNormalizado: normalizarEndereco(c.enderecoCompleto),
          bairro: c.bairro ?? null,
          cidade: c.cidade ?? undefined,
          uf: c.uf ?? undefined,
          cep: c.cep ?? null,
          latitude: c.latitude != null ? String(c.latitude) : null,
          longitude: c.longitude != null ? String(c.longitude) : null,
          fonteCriacao: "promocao",
          confidence: String(c.confianca),
        })
        .returning({ id: lugares.id });
      return row.id;
    },

    async inserirParticipacao(processoId, lugarId, c) {
      await tx.insert(participacoesLugar).values({
        lugarId,
        processoId,
        pessoaId: c.pessoaId ?? null,
        tipo: c.tipo,
        fonte: "promocao",
        confidence: String(c.confianca),
      });
    },

    async log(processoId, acao, c, lugarId) {
      await tx.insert(promocaoLog).values({
        entidade: "lugar",
        processoId,
        // Reuso da tabela de pessoas: candidatoNome=endereço (texto de auditoria),
        // pessoaId=lugarId (campo int de auditoria).
        candidatoNome: c.enderecoCompleto,
        candidatoCpf: null,
        acao,
        pessoaId: lugarId,
        candidatosIds: null,
        confianca: String(c.confianca),
        fonteRef: c.fonteRef,
      });
    },

    async marcarPromovido(processoId) {
      await tx
        .update(processos)
        .set({ lugaresPromovidosEm: new Date() })
        .where(eq(processos.id, processoId));
    },
  };
}
