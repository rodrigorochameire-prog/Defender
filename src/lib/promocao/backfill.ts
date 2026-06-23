import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db, withTransaction } from "@/lib/db";
import { processos } from "@/lib/db/schema/core";
import { casePersonas } from "@/lib/db/schema/casos";
import { pessoas, participacoesProcesso } from "@/lib/db/schema/pessoas";
import { testemunhas } from "@/lib/db/schema/agenda";
import { candidatosDeCasePersonas } from "./adaptador-case-personas";
import { candidatosDeAnalysis } from "./adaptador-analysis";
import { candidatosDeDepoentes } from "./adaptador-depoentes";
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

/** Contadores de ações para um único processo promovido. */
export interface PromocaoProcessoContadores {
  vinculadas: number;
  criadas: number;
  revisao: number;
  ignoradas: number;
}

/**
 * Promove as pessoas extraídas pela IA para um único processo: carrega o estado
 * (workspace, candidatos das duas fontes, pessoas existentes, participações),
 * planeja as ações de forma idempotente e aplica em transação.
 *
 * Reusado pelo backfill (varredura em lote) e pelo hook de consolidação
 * (`consolidateForProcesso`). NÃO faz early-return em `pessoas_promovidas_em`:
 * essa flag é apenas o filtro de skip do backfill. Quando chamado diretamente,
 * sempre processa — a idempotência é garantida pelo planejador (dedup por
 * participação) e não duplica.
 */
export async function promoverProcesso(
  processoId: number,
): Promise<PromocaoProcessoContadores> {
  const contadores: PromocaoProcessoContadores = {
    vinculadas: 0,
    criadas: 0,
    revisao: 0,
    ignoradas: 0,
  };

  // Estado do processo: workspaceId + analysisData.
  const [proc] = await db
    .select({
      workspaceId: processos.workspaceId,
      analysisData: processos.analysisData,
    })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1);
  if (!proc) return contadores;

  const workspaceId = proc.workspaceId ?? null;

  // Candidatos das duas fontes.
  const rowsCase = await db
    .select()
    .from(casePersonas)
    .where(eq(casePersonas.processoId, processoId));
  // Depoentes (testemunhas) como terceira fonte. Falha isolada (CA-A4): se a
  // carga falhar, segue com as outras fontes em vez de abortar a promoção.
  let candidatosDepoentes: CandidatoPessoa[] = [];
  try {
    const rowsTestemunhas = await db
      .select()
      .from(testemunhas)
      .where(eq(testemunhas.processoId, processoId));
    candidatosDepoentes = candidatosDeDepoentes(processoId, rowsTestemunhas);
  } catch (err) {
    console.error(`[promocao] falha ao carregar depoentes do processo ${processoId}:`, err);
  }

  const candidatos: CandidatoPessoa[] = [
    ...candidatosDeCasePersonas(rowsCase),
    ...candidatosDeAnalysis(processoId, proc.analysisData ?? null),
    ...candidatosDepoentes,
  ];
  if (candidatos.length === 0) {
    // Sem pessoas extraíveis: marca como promovido mesmo assim, para o backfill
    // não re-selecionar este processo a cada execução (liveness do lote).
    await db.update(processos).set({ pessoasPromovidasEm: new Date() }).where(eq(processos.id, processoId));
    return contadores;
  }

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
    // Pool de dedup escopado por workspace (divergência consciente do design §12):
    // mais conservador no caminho de escrita — nunca cross-linka entre workspaces;
    // a merge-queue global reconcilia duplicatas. Ver design doc §12.
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

  for (const a of acoes) {
    if (a.tipo === "vincular") contadores.vinculadas += 1;
    else if (a.tipo === "criar") contadores.criadas += 1;
    else if (a.tipo === "revisar") contadores.revisao += 1;
    else if (a.tipo === "ignorar") contadores.ignoradas += 1;
  }

  return contadores;
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
    try {
      const c = await promoverProcesso(processoId);
      contadores.processos += 1;
      contadores.vinculadas += c.vinculadas;
      contadores.criadas += c.criadas;
      contadores.revisao += c.revisao;
      contadores.ignoradas += c.ignoradas;
    } catch (err) {
      // Isola falha por processo (ex.: dado de extração inválido): pula e segue,
      // em vez de abortar a varredura inteira. O processo não é marcado como promovido.
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[promocao] processo ${processoId} falhou, pulando: ${msg}`);
    }
  }

  return contadores;
}

/**
 * Varre processos que têm depoentes (`testemunhas`) ainda não promovidos e os
 * promove via `promoverProcesso` (que já consolida as três fontes — case_personas,
 * analysisData e depoentes). Complementa `backfillPromocaoPessoas`, cujo seletor
 * só alcança processos com case_personas/analysisData.pessoas: aqui o gatilho é a
 * presença de linhas em `testemunhas`. A idempotência é a do planejador (dedup por
 * participação), então reprocessar é seguro.
 */
export async function backfillPromocaoDepoentes(
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

  const wsFilter = opts.workspaceId != null ? eq(processos.workspaceId, opts.workspaceId) : undefined;

  const deDepoentes = await db
    .selectDistinct({ processoId: testemunhas.processoId })
    .from(testemunhas)
    .innerJoin(processos, eq(processos.id, testemunhas.processoId))
    .where(
      and(
        isNull(processos.pessoasPromovidasEm),
        ...(wsFilter ? [wsFilter] : []),
      ),
    );

  const idsUnicos = new Set<number>();
  for (const r of deDepoentes) if (r.processoId != null) idsUnicos.add(r.processoId);
  const processoIds = [...idsUnicos].slice(0, limite);

  for (const processoId of processoIds) {
    try {
      const c = await promoverProcesso(processoId);
      contadores.processos += 1;
      contadores.vinculadas += c.vinculadas;
      contadores.criadas += c.criadas;
      contadores.revisao += c.revisao;
      contadores.ignoradas += c.ignoradas;
    } catch (err) {
      // Isola falha por processo (ex.: dado de extração inválido): pula e segue,
      // em vez de abortar a varredura inteira. O processo não é marcado como promovido.
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[promocao] processo ${processoId} falhou, pulando: ${msg}`);
    }
  }

  return contadores;
}
