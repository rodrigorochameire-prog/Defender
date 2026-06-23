import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { casePersonas } from "@/lib/db/schema/casos";
import { pessoas, participacoesProcesso } from "@/lib/db/schema/pessoas";
import { candidatosDeCasePersonas } from "./adaptador-case-personas";
import { candidatosDeAnalysis } from "./adaptador-analysis";
import { planejarPromocao } from "./planejar";
import { criarRepoDrizzle } from "./repo";
import { aplicarAcoes } from "./applier";
import type { CandidatoPessoa, PessoaExistente, ParticipacaoExistente } from "./tipos";

export interface BackfillContadores {
  processos: number;
  vinculadas: number;
  criadas: number;
  revisao: number;
  ignoradas: number;
  caseScopedAdiadas: number;
}

export interface BackfillOpts {
  /** Limite de processos a processar neste lote (default: 50). */
  limite?: number;
  /** Restringe a um workspace (default: todos). */
  workspaceId?: number;
}

/**
 * Varre as duas fontes de pessoas extraídas pela IA e promove para o catálogo
 * global. Idempotente: ignora processos já marcados (`pessoas_promovidas_em`).
 *
 * Fontes:
 *   (a) `case_personas` com `processo_id` não-nulo cujo processo ainda não foi promovido;
 *   (b) `processos` com `analysisData->'pessoas'` presente e ainda não promovidos.
 *
 * Escopo do piloto: `case_personas` com `processo_id NULL` (caso-scoped) são
 * adiadas — não chutamos o processo quando o caso tem múltiplos. Conta-se
 * quantas foram puladas (`caseScopedAdiadas`).
 */
export async function backfillPromocaoPessoas(
  opts: BackfillOpts = {},
): Promise<BackfillContadores> {
  const limite = opts.limite ?? 50;
  const contadores: BackfillContadores = {
    processos: 0,
    vinculadas: 0,
    criadas: 0,
    revisao: 0,
    ignoradas: 0,
    caseScopedAdiadas: 0,
  };

  // Conta case_personas caso-scoped (processo_id NULL) adiadas no piloto.
  const [{ adiadas } = { adiadas: 0 }] = await db
    .select({ adiadas: sql<number>`count(*)::int` })
    .from(casePersonas)
    .where(isNull(casePersonas.processoId));
  contadores.caseScopedAdiadas = adiadas;

  // (a) processoIds vindos de case_personas (processo não promovido).
  const wsFilter = opts.workspaceId != null ? eq(processos.workspaceId, opts.workspaceId) : undefined;

  const deCasePersonas = await db
    .selectDistinct({ processoId: casePersonas.processoId })
    .from(casePersonas)
    .innerJoin(processos, eq(processos.id, casePersonas.processoId))
    .where(
      and(
        isNotNull(casePersonas.processoId),
        isNull(processos.pessoasPromovidasEm),
        ...(wsFilter ? [wsFilter] : []),
      ),
    );

  // (b) processoIds vindos de analysisData.pessoas.
  const deAnalysis = await db
    .select({ processoId: processos.id })
    .from(processos)
    .where(
      and(
        isNull(processos.pessoasPromovidasEm),
        sql`${processos.analysisData} -> 'pessoas' IS NOT NULL`,
        ...(wsFilter ? [wsFilter] : []),
      ),
    );

  const idsUnicos = new Set<number>();
  for (const r of deCasePersonas) if (r.processoId != null) idsUnicos.add(r.processoId);
  for (const r of deAnalysis) idsUnicos.add(r.processoId);

  const processoIds = [...idsUnicos].slice(0, limite);

  for (const processoId of processoIds) {
    // Estado do processo: workspaceId + analysisData.
    const [proc] = await db
      .select({
        workspaceId: processos.workspaceId,
        analysisData: processos.analysisData,
      })
      .from(processos)
      .where(eq(processos.id, processoId))
      .limit(1);
    if (!proc) continue;

    const workspaceId = proc.workspaceId ?? null;

    // Candidatos das duas fontes.
    const rowsCase = await db
      .select()
      .from(casePersonas)
      .where(eq(casePersonas.processoId, processoId));
    const candidatos: CandidatoPessoa[] = [
      ...candidatosDeCasePersonas(rowsCase),
      ...candidatosDeAnalysis(processoId, proc.analysisData ?? null),
    ];
    if (candidatos.length === 0) continue;

    // Pessoas existentes do workspace (pool de dedup).
    const rowsPessoas = await db
      .select({
        id: pessoas.id,
        nomeNormalizado: pessoas.nomeNormalizado,
        nomesAlternativos: pessoas.nomesAlternativos,
        cpf: pessoas.cpf,
        dataNascimento: pessoas.dataNascimento,
      })
      .from(pessoas)
      .where(
        and(
          isNull(pessoas.mergedInto),
          workspaceId != null ? eq(pessoas.workspaceId, workspaceId) : isNull(pessoas.workspaceId),
        ),
      );
    const existentes: PessoaExistente[] = rowsPessoas.map((p) => ({
      id: p.id,
      nomeNormalizado: p.nomeNormalizado,
      nomesAlternativos: p.nomesAlternativos ?? [],
      cpf: p.cpf,
      dataNascimento: p.dataNascimento,
    }));

    // Participações já existentes neste processo (com origem, p/ idempotência).
    const rowsPart = await db
      .select({
        pessoaId: participacoesProcesso.pessoaId,
        processoId: participacoesProcesso.processoId,
        papel: participacoesProcesso.papel,
        origem: participacoesProcesso.origem,
      })
      .from(participacoesProcesso)
      .where(eq(participacoesProcesso.processoId, processoId));
    const participacoes: ParticipacaoExistente[] = rowsPart.map((p) => ({
      pessoaId: p.pessoaId,
      processoId: p.processoId,
      papel: p.papel,
      origem: p.origem,
    }));

    const acoes = planejarPromocao({ processoId, candidatos, existentes, participacoes });

    await withTransaction(async (tx) => {
      await aplicarAcoes(criarRepoDrizzle(tx), processoId, workspaceId, acoes);
    });

    contadores.processos += 1;
    for (const a of acoes) {
      if (a.tipo === "vincular") contadores.vinculadas += 1;
      else if (a.tipo === "criar") contadores.criadas += 1;
      else if (a.tipo === "revisar") contadores.revisao += 1;
      else if (a.tipo === "ignorar") contadores.ignoradas += 1;
    }
  }

  return contadores;
}
