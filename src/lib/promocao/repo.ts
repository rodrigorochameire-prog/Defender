import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pessoas, participacoesProcesso } from "@/lib/db/schema/pessoas";
import { promocaoLog } from "@/lib/db/schema/promocao";
import { processos } from "@/lib/db/schema/core";
import { normalizarNome } from "@/lib/pessoas/normalize";
import type { CandidatoPessoa } from "./tipos";

/**
 * Trunca defensivamente um valor ao limite da coluna varchar. Campos derivados de
 * texto livre da IA (ex.: `vinculoComDefendido` → `subpapel`) podem exceder o limite
 * e abortar a transação (22001). Truncar é preferível a perder a promoção do processo.
 */
function trunc(v: string | null | undefined, max: number): string | null {
  if (v == null) return null;
  return v.length > max ? v.slice(0, max) : v;
}

/**
 * Sanitiza data de nascimento vinda de texto livre da IA. Aceita ISO (YYYY-MM-DD)
 * ou BR (DD/MM/YYYY), tolera lixo após a data (ex.: "17/05/2011 (confirmado)").
 * Retorna `YYYY-MM-DD` válido ou null — evita abortar a promoção do processo (22007).
 */
function sanitizeDate(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = v.trim();
  let y: number, m: number, d: number;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (br) { d = +br[1]; m = +br[2]; y = +br[3]; }
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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
          // cpf > 14 chars = lixo da extração (texto livre); descarta em vez de truncar.
          cpf: c.cpf && c.cpf.length <= 14 ? c.cpf : null,
          dataNascimento: sanitizeDate(c.dataNascimento),
          fonteCriacao: trunc(fonteCriacao, 40) ?? fonteCriacao,
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
        papel: trunc(c.papel, 30) ?? c.papel,
        lado: trunc(c.lado, 20),
        subpapel: trunc(c.subpapel, 40),
        testemunhaId: c.testemunhaId ?? null,
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
          lado: trunc(c.lado, 20),
          subpapel: trunc(c.subpapel, 40),
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
