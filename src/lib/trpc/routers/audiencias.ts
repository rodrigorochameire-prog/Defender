import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction, audiencias, processos, assistidos, sessoesJuri, testemunhas } from "@/lib/db";
import { claudeCodeTasks, casos } from "@/lib/db/schema/casos";
import { analysisJobs } from "@/lib/db/schema/core";
import { atendimentos } from "@/lib/db/schema/agenda";
import { diligencias, anotacoes } from "@/lib/db/schema/investigacao";
import { eq, and, gte, lte, desc, asc, isNull, or, sql, ilike, inArray } from "drizzle-orm";
import { addDays } from "date-fns";
import { TRPCError } from "@trpc/server";
import { gerarPreparacaoAudienciaPdf, type PreparacaoDepoente } from "@/lib/pdf/preparacao-audiencia";

// ==========================================
// Shared analysis helper used by both
// `previewPreparacao` (query, dry-run) and
// `prepararAudiencia` (mutation, persisting).
// ==========================================

type TestemunhaTipo = "DEFESA" | "ACUSACAO" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";

type RawDep = {
  nome?: string;
  papel?: string;
  tipo?: string;
  vinculo?: string;
  resumo?: string;
  endereco?: string;
  telefones?: string[];
  observacoes?: string;
  perguntas?: string[];
  pontos_favoraveis?: string[] | string;
  pontos_desfavoraveis?: string[] | string;
};

interface PreparedDepoente {
  nome: string;
  tipo: TestemunhaTipo;
  vinculo?: string | null;
  endereco: string | null;
  resumo: string | null;
  perguntasSugeridas: string | null;
  pontosFavoraveis: string | null;
  pontosDesfavoraveis: string | null;
  observacoes: string | null;
}

interface PreparacaoComputed {
  audiencia: typeof audiencias.$inferSelect;
  processo: typeof processos.$inferSelect;
  assistidoNome: string;
  resumoCaso: string | null;
  depoentes: PreparedDepoente[];
}

const _normalizeName = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const _placeholderPatterns: RegExp[] = [
  /\ba\s+confirmar\b/,
  /\ba\s+identificar\b/,
  /\bn[aã]o\s+identificad/,
  /\bn[aã]o\s+localizad/,
  /\bdesconhecid/,
  /\bequipe\b/,
  /\btestemunhas?\s+n[aã]o\b/,
  /\bv[ií]tima\s+(a\s+)?confirmar\b/,
  /^\s*sem\s+nome\s*$/,
  /^\s*\?+\s*$/,
  /^\s*-+\s*$/,
];

const _isPlaceholder = (nome: string): boolean => {
  const n = _normalizeName(nome);
  if (n.length < 3) return true;
  return _placeholderPatterns.some((re) => re.test(n));
};

const _mapPapelToTipo = (papel: string): TestemunhaTipo => {
  const p = (papel || "").toLowerCase().replace(/\s+/g, "_");
  // Acusação
  if (p === "testemunha_acusacao" || p === "acusacao" || p === "testemunha_de_acusação"
      || p === "testemunha_de_acusacao") return "ACUSACAO";
  // Defesa
  if (p === "testemunha_defesa" || p === "defesa" || p === "testemunha_de_defesa") return "DEFESA";
  // Vítima / Ofendida
  if (p === "vitima" || p === "vítima" || p === "ofendida" || p === "ofendido") return "VITIMA";
  // Policial (qualquer variante)
  if (p.includes("policial") || p.includes("pm_") || p === "pm"
      || p.includes("condutor") || p.includes("militar")) return "ACUSACAO";
  // Investigador / Delegado (tratados como acusação)
  if (p.includes("investigador") || p.includes("ipc") || p.includes("delegad")) return "ACUSACAO";
  // Perito
  if (p === "perito" || p.includes("perit")) return "PERITO";
  // Informante
  if (p === "informante") return "INFORMANTE";
  // Testemunha genérica
  if (p.includes("testemunha")) return "COMUM";
  // Réu não deve virar testemunha — filtrar antes. Se chegou aqui, default.
  if (p === "reu" || p === "réu" || p === "defendido") return "COMUM";
  return "COMUM";
};

const _joinList = (v: string[] | string | undefined | null): string | null => {
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? v.map((s) => `• ${s}`).join("\n") : null;
  return v.trim() || null;
};

// Map processo.atribuicao → skill alias (see .claude/skills-cowork/SKILL_ALIASES.json).
// This picks the atribuição-specific skill (juri/vvd/ep) so the daemon loads the
// richest references/ for the case type, instead of the generic analise-audiencias.
function atribuicaoToPrepararAudienciaSkill(atribuicao: string | null | undefined): string {
  switch (atribuicao) {
    case "JURI_CAMACARI":
    case "JURI":
    case "GRUPO_JURI":
      return "preparar-audiencia-juri";
    case "VVD_CAMACARI":
    case "VVD":
      return "preparar-audiencia-vvd";
    case "EXECUCAO_PENAL":
    case "EXECUCAO":
      return "preparar-audiencia-ep";
    case "SUBSTITUICAO":
    case "SUBSTITUICAO_CIVEL":
      return "preparar-audiencia-criminal";
    default:
      return "preparar-audiencia"; // legacy fallback → analise-audiencias
  }
}

/**
 * Enqueue a `preparar-audiencia` task for the worker (Mac Mini),
 * unless one is already pending or processing for this processo. Returns the
 * task id and a flag indicating whether it was created or already existed.
 *
 * Inserts into `claude_code_tasks` — the canonical queue processed by
 * scripts/claude-code-daemon.mjs. Migrated from analysis_jobs (2026-04).
 */
async function ensureClaudeCodeTask(
  processoId: number,
  assistidoId: number,
  numeroAutos: string,
  assistidoNome: string,
  atribuicao: string | null | undefined,
  createdBy: number,
): Promise<{ jobId: number; created: boolean }> {
  // 1. Check for an existing pending or processing task — avoid duplicates.
  const [existingTask] = await db
    .select({ id: claudeCodeTasks.id, status: claudeCodeTasks.status })
    .from(claudeCodeTasks)
    .where(
      and(
        eq(claudeCodeTasks.processoId, processoId),
        inArray(claudeCodeTasks.status, ["pending", "processing"]),
      ),
    )
    .orderBy(desc(claudeCodeTasks.createdAt))
    .limit(1);

  if (existingTask) {
    return { jobId: existingTask.id, created: false };
  }

  // 2. Build the prompt — same template as the worker already understands.
  const prompt = `Você é o Defensor Público responsável pela preparação da audiência criminal do processo ${numeroAutos}, em desfavor de ${assistidoNome}.

Examine TODOS os documentos do caso disponíveis no Drive (denúncia, inquérito, decisões, depoimentos prévios) e produza uma análise estruturada com FOCO PRINCIPAL em IDENTIFICAR TODOS OS DEPOENTES.

OBJETIVO PRINCIPAL: extrair a lista completa e exaustiva de pessoas arroladas como testemunhas (de acusação E de defesa), a vítima, peritos, e os policiais condutores da prisão/investigação. Esses são os depoentes da audiência.

Para cada depoente, forneça nome completo, papel processual exato, e breve resumo (do depoimento se já houve, ou do papel se ainda não depôs). Quando possível, inclua endereço e telefone.

Adicionalmente, produza resumo estratégico, achados-chave, recomendações e inconsistências.`;

  // 3. Insert and bump processo.analysis_status to "queued" so the agenda
  //    badge reflects the work-in-progress state.
  const skill = atribuicaoToPrepararAudienciaSkill(atribuicao);

  const [created] = await db
    .insert(claudeCodeTasks)
    .values({
      assistidoId,
      processoId,
      skill,
      prompt,
      status: "pending",
      createdBy,
    })
    .returning({ id: claudeCodeTasks.id });

  await db
    .update(processos)
    .set({ analysisStatus: "queued" })
    .where(eq(processos.id, processoId));

  return { jobId: created.id, created: true };
}

async function computePreparacao(audienciaId: number): Promise<PreparacaoComputed> {
  const [audiencia] = await db
    .select()
    .from(audiencias)
    .where(eq(audiencias.id, audienciaId))
    .limit(1);

  if (!audiencia) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Audiência ${audienciaId} não encontrada`,
    });
  }

  const [processo] = await db
    .select()
    .from(processos)
    .where(eq(processos.id, audiencia.processoId))
    .limit(1);

  if (!processo) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Processo ${audiencia.processoId} não encontrado`,
    });
  }

  let assistidoNome = "Não identificado";
  if (audiencia.assistidoId) {
    const [assistido] = await db
      .select({ nome: assistidos.nome })
      .from(assistidos)
      .where(eq(assistidos.id, audiencia.assistidoId))
      .limit(1);
    if (assistido) assistidoNome = assistido.nome;
  }

  let analysisData = processo.analysisData as Record<string, any> | string | null;
  if (typeof analysisData === "string") {
    try {
      analysisData = JSON.parse(analysisData) as Record<string, any>;
    } catch {
      analysisData = null;
    }
  }
  const ad = analysisData as Record<string, any> | null;

  const collect = (arr: unknown): RawDep[] =>
    Array.isArray(arr) ? (arr as RawDep[]) : [];

  // Merge testemunhas_acusacao + testemunhas_defesa (from _analise_ia.json VVD/Júri skill)
  // into a unified list with papel/tipo tagged so downstream mapping works.
  const mergedTestemunhas: RawDep[] = [
    ...collect(ad?.testemunhas_acusacao).map((t) => ({
      ...t,
      papel: t.papel ?? t.tipo ?? t.vinculo ?? "ACUSACAO",
    })),
    ...collect(ad?.testemunhas_defesa).map((t) => ({
      ...t,
      papel: t.papel ?? t.tipo ?? t.vinculo ?? "DEFESA",
    })),
  ];

  const sources: Array<{ label: string; items: RawDep[] }> = [
    { label: "testemunhas_acusacao+defesa", items: mergedTestemunhas },
    { label: "depoimentos", items: collect(ad?.depoimentos) },
    { label: "painelDepoentes", items: collect(ad?.painelDepoentes) },
    { label: "payload.depoimentos", items: collect(ad?.payload?.depoimentos) },
    { label: "payload.perguntas_por_testemunha", items: collect(ad?.payload?.perguntas_por_testemunha) },
    {
      label: "pessoas",
      items: collect(ad?.pessoas).filter((p) => {
        const papel = (p.papel ?? p.vinculo ?? "").toLowerCase();
        return (
          papel.startsWith("testemunha") ||
          papel === "vitima" ||
          papel === "vítima" ||
          papel === "ofendida" ||
          papel === "ofendido" ||
          papel === "informante" ||
          papel.includes("policial") ||
          papel.includes("pm") ||
          papel.includes("condutor") ||
          papel.includes("investigador") ||
          papel.includes("perit")
        );
      }),
    },
  ];

  const picked = sources.find((s) => s.items.length > 0);
  let raws: RawDep[] = picked?.items ?? [];

  // Filter defendido + placeholders
  const assistidoNormalized = _normalizeName(assistidoNome);
  const isDefendido = (nome: string): boolean => {
    if (!assistidoNormalized || assistidoNormalized === "nao identificado") return false;
    const n = _normalizeName(nome);
    if (n === assistidoNormalized) return true;
    const aTokens = assistidoNormalized.split(" ").filter((t) => t.length >= 3);
    const dTokens = n.split(" ").filter((t) => t.length >= 3);
    if (aTokens.length === 0 || dTokens.length === 0) return false;
    const overlap = aTokens.filter((t) => dTokens.includes(t)).length;
    return overlap >= 2 || overlap === Math.min(aTokens.length, dTokens.length);
  };

  raws = raws.filter((d) => {
    if (!d.nome) return false;
    if (_isPlaceholder(d.nome)) return false;
    if (isDefendido(d.nome)) return false;
    return true;
  });

  // Dedup by normalized name, keep richest
  const richness = (d: RawDep): number =>
    (d.resumo?.length ?? 0) +
    (d.endereco?.length ?? 0) +
    (Array.isArray(d.perguntas) ? d.perguntas.length * 30 : 0) +
    (d.observacoes?.length ?? 0);

  const dedupMap = new Map<string, RawDep>();
  for (const dep of raws) {
    const key = _normalizeName(dep.nome ?? "");
    if (!key) continue;
    const existing = dedupMap.get(key);
    if (!existing || richness(dep) > richness(existing)) {
      dedupMap.set(key, dep);
    }
  }
  raws = Array.from(dedupMap.values());

  // Merge enrichment from pessoas[] when depoimentos[] entries are slim.
  // The cowork worker writes a master `pessoas[]` array with endereco /
  // telefones / observacoes for the entire cast, and a leaner `depoimentos[]`
  // for who will testify. Match by normalized name and copy missing fields.
  const pessoasList = collect(ad?.pessoas);
  const pessoasByName = new Map<string, RawDep>();
  for (const p of pessoasList) {
    if (!p.nome) continue;
    pessoasByName.set(_normalizeName(p.nome), p);
  }
  for (const dep of raws) {
    if (!dep.nome) continue;
    const match = pessoasByName.get(_normalizeName(dep.nome));
    if (!match) continue;
    if (!dep.endereco && match.endereco) dep.endereco = match.endereco;
    if (!dep.telefones?.length && match.telefones?.length) dep.telefones = match.telefones;
    if (!dep.observacoes && match.observacoes) dep.observacoes = match.observacoes;
  }

  const depoentes: PreparedDepoente[] = raws
    .filter((d): d is RawDep & { nome: string } => !!d.nome)
    .map((dep) => {
      const tipo = _mapPapelToTipo(dep.papel ?? dep.tipo ?? "");
      const perguntasSugeridas = _joinList(dep.perguntas);
      const pontosFavoraveis = _joinList(dep.pontos_favoraveis);
      const pontosDesfavoraveis = _joinList(dep.pontos_desfavoraveis);
      const telefonesText =
        Array.isArray(dep.telefones) && dep.telefones.length
          ? `Telefones: ${dep.telefones.join(", ")}`
          : null;
      const observacoes =
        [dep.observacoes?.trim() || null, telefonesText].filter(Boolean).join("\n") || null;

      return {
        nome: dep.nome,
        tipo,
        vinculo: dep.vinculo?.trim() || dep.papel?.trim() || null,
        endereco: dep.endereco?.trim() || null,
        resumo: dep.resumo?.trim() || null,
        perguntasSugeridas,
        pontosFavoraveis,
        pontosDesfavoraveis,
        observacoes,
      };
    });

  const resumoCaso =
    (ad?.resumo as string | undefined) ??
    (ad?.payload?.resumo_fato as string | undefined) ??
    null;

  return { audiencia, processo, assistidoNome, resumoCaso, depoentes };
}

export const audienciasRouter = router({
  // Listar audiências
  // NOTA: Sem limite por padrão para garantir que todos os eventos apareçam no calendário
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(10000).optional(), // Opcional - sem limite por padrão
      offset: z.number().default(0),
      responsavelId: z.number().optional(),
      apenasProximas: z.boolean().optional().default(false), // Filtrar apenas futuras
    }).optional())
    .query(async ({ input }) => {
      const { limit, offset = 0, responsavelId, apenasProximas = false } = input || {};

      const whereConditions = [];

      // Filtrar audiências futuras apenas se solicitado
      if (apenasProximas) {
        whereConditions.push(gte(audiencias.dataAudiencia, new Date()));
      }

      // Filtrar por responsável se especificado
      if (responsavelId) {
        whereConditions.push(
          or(
            eq(audiencias.defensorId, responsavelId),
            isNull(audiencias.defensorId)
          )
        );
      }

      // Construir query base
      let query = db
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          casoId: audiencias.casoId,
          assistidoId: audiencias.assistidoId,
          dataHora: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          local: audiencias.local,
          titulo: audiencias.titulo,
          descricao: audiencias.descricao,
          sala: audiencias.sala,
          horario: audiencias.horario,
          defensorId: audiencias.defensorId,
          juiz: audiencias.juiz,
          promotor: audiencias.promotor,
          status: audiencias.status,
          resultado: audiencias.resultado,
          responsavelId: audiencias.defensorId, // Alias para compatibilidade
          processo: {
            id: processos.id,
            numero: processos.numeroAutos,
            atribuicao: processos.atribuicao,
            area: processos.area,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(audiencias.dataAudiencia))
        .offset(offset);

      // Aplicar limite apenas se especificado
      if (limit !== undefined) {
        // Drizzle narrows the query type after .limit() differently when chained conditionally
        query = query.limit(limit) as any;
      }

      return await query;
    }),

  // Buscar audiência por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [audiencia] = await db
        .select()
        .from(audiencias)
        .where(eq(audiencias.id, input.id))
        .limit(1);

      return audiencia || null;
    }),

  // ==========================================
  // CONTEXTO COMPLETO — alimenta Sheet + Modal
  // ==========================================
  getAudienciaContext: protectedProcedure
    .input(z.object({ audienciaId: z.number() }))
    .query(async ({ input }) => {
      // 1. Audiência + processo + assistido
      const [aud] = await db
        .select()
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId))
        .limit(1);
      if (!aud) return null;

      const procRows = await db.select().from(processos).where(eq(processos.id, aud.processoId)).limit(1);
      const proc = procRows[0] ?? null;

      let assist: typeof assistidos.$inferSelect | null = null;
      if (aud.assistidoId) {
        const assistRows = await db.select().from(assistidos).where(eq(assistidos.id, aud.assistidoId)).limit(1);
        assist = assistRows[0] ?? null;
      }

      // 2. Caso vinculado (narrativa_denuncia, teoria_fatos/provas/direito)
      let caso: { id: number; narrativaDenuncia: string | null; teoriaFatos: string | null; teoriaProvas: string | null; teoriaDireito: string | null; foco: string | null; status: string | null; fase: string | null } | null = null;
      if (assist) {
        const casoRows = await db
          .select({
            id: casos.id,
            narrativaDenuncia: casos.narrativaDenuncia,
            teoriaFatos: casos.teoriaFatos,
            teoriaProvas: casos.teoriaProvas,
            teoriaDireito: casos.teoriaDireito,
            foco: casos.foco,
            status: casos.status,
            fase: casos.fase,
          })
          .from(casos)
          .where(eq(casos.assistidoId, assist.id))
          .limit(1);
        caso = casoRows[0] ?? null;
      }

      // 3. Atendimentos (versão do réu no atendimento)
      let atendimentosResult: any[] = [];
      if (assist) {
        const conditions = proc
          ? or(eq(atendimentos.processoId, proc.id), eq(atendimentos.assistidoId, assist.id))
          : eq(atendimentos.assistidoId, assist.id);
        atendimentosResult = await db
          .select({
            id: atendimentos.id,
            data: atendimentos.dataAtendimento,
            tipo: atendimentos.tipo,
            resumo: atendimentos.resumo,
            transcricaoResumo: atendimentos.transcricaoResumo,
            pontosChave: atendimentos.pontosChave,
            assunto: atendimentos.assunto,
          })
          .from(atendimentos)
          .where(conditions)
          .orderBy(desc(atendimentos.dataAtendimento))
          .limit(5);
      }

      // 4. Diligências (investigação defensiva)
      let diligenciasResult: any[] = [];
      if (proc) {
        const diligConditions = assist
          ? and(or(eq(diligencias.processoId, proc.id), eq(diligencias.assistidoId, assist.id)), isNull(diligencias.deletedAt))
          : and(eq(diligencias.processoId, proc.id), isNull(diligencias.deletedAt));
        diligenciasResult = await db
          .select({
            id: diligencias.id,
            titulo: diligencias.titulo,
            tipo: diligencias.tipo,
            status: diligencias.status,
            resultado: diligencias.resultado,
            nomePessoaAlvo: diligencias.nomePessoaAlvo,
            prioridade: diligencias.prioridade,
          })
          .from(diligencias)
          .where(diligConditions)
          .orderBy(desc(diligencias.createdAt))
          .limit(10);
      }

      // 5. Anotações relevantes
      let anotacoesResult: any[] = [];
      if (proc) {
        anotacoesResult = await db
          .select({
            id: anotacoes.id,
            conteudo: anotacoes.conteudo,
            tipo: anotacoes.tipo,
            importante: anotacoes.importante,
            createdAt: anotacoes.createdAt,
          })
          .from(anotacoes)
          .where(eq(anotacoes.processoId, proc.id))
          .orderBy(desc(anotacoes.createdAt))
          .limit(5);
      }

      // 6. Testemunhas cadastradas
      const testemunhasResult = proc
        ? await db
            .select()
            .from(testemunhas)
            .where(eq(testemunhas.processoId, proc.id))
        : [];

      // 7. Analysis data (parsed)
      let analysisData: Record<string, any> | null = null;
      if (proc?.analysisData) {
        try {
          analysisData = typeof proc.analysisData === "string"
            ? JSON.parse(proc.analysisData)
            : proc.analysisData as Record<string, any>;
        } catch { /* ignore */ }
      }

      return {
        audiencia: aud,
        processo: proc,
        assistido: assist,
        caso,
        atendimentos: atendimentosResult,
        diligencias: diligenciasResult,
        anotacoes: anotacoesResult,
        testemunhas: testemunhasResult,
        analysisData,
      };
    }),

  // Próximas audiências (para dashboard)
  // Se dias=0, retorna TODAS as audiências futuras sem limite de data
  proximas: protectedProcedure
    .input(z.object({
      dias: z.number().default(0), // 0 = sem limite de dias
      limite: z.number().default(50), // Aumentado para mostrar mais eventos
    }).optional())
    .query(async ({ input }) => {
      const { dias = 0, limite = 50 } = input || {};

      const whereConditions = [gte(audiencias.dataAudiencia, new Date())];

      // Só adiciona limite de data se dias > 0
      if (dias > 0) {
        const dataLimite = addDays(new Date(), dias);
        whereConditions.push(lte(audiencias.dataAudiencia, dataLimite));
      }

      const results = await db
        .select({
          id: audiencias.id,
          dataHora: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          local: audiencias.local,
          titulo: audiencias.titulo,
          descricao: audiencias.descricao,
          responsavelId: audiencias.defensorId,
          status: audiencias.status,
          processo: {
            id: processos.id,
            numero: processos.numeroAutos,
            atribuicao: processos.atribuicao,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(and(...whereConditions))
        .orderBy(asc(audiencias.dataAudiencia))
        .limit(limite);

      return results;
    }),

  // Criar audiência
  create: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      casoId: z.number().optional(),
      assistidoId: z.number().optional(),
      dataAudiencia: z.string().or(z.date()),
      tipo: z.string(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [audiencia] = await db
        .insert(audiencias)
        .values({
          processoId: input.processoId,
          casoId: input.casoId,
          assistidoId: input.assistidoId,
          dataAudiencia: new Date(input.dataAudiencia),
          tipo: input.tipo,
          local: input.local,
          titulo: input.titulo,
          descricao: input.descricao,
          sala: input.sala,
          horario: input.horario,
          defensorId: input.defensorId,
          juiz: input.juiz,
          promotor: input.promotor,
          status: "agendada",
        })
        .returning();

      return audiencia;
    }),

  // Atualizar audiência
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      dataAudiencia: z.string().or(z.date()).optional(),
      tipo: z.string().optional(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
      status: z.string().optional(),
      resultado: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // TODO: replace with Partial<typeof audiencias.$inferInsert> once all optional fields are mapped
      const updateData: Partial<typeof audiencias.$inferInsert> = { ...data };

      if (data.dataAudiencia) {
        updateData.dataAudiencia = new Date(data.dataAudiencia);
      }

      const [audiencia] = await db
        .update(audiencias)
        .set(updateData)
        .where(eq(audiencias.id, id))
        .returning();

      return audiencia;
    }),

  // Deletar audiência
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(audiencias).where(eq(audiencias.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // REGISTRO DE AUDIÊNCIA (JSONB persistence)
  // ==========================================

  // Salvar registro de audiência (cria ou atualiza)
  salvarRegistro: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      registro: z.any(), // RegistroAudienciaData as JSON
      juiz: z.string().optional(),
      promotor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const registroData = input.registro as Record<string, unknown>;
      const [updated] = await db
        .update(audiencias)
        .set({
          registroAudiencia: registroData,
          status: registroData.realizada ? "realizada" : "reagendada",
          resultado: (registroData.resultado as string) || null,
          anotacoes: (registroData.anotacoesGerais as string) || null,
          juiz: input.juiz ?? undefined,
          promotor: input.promotor ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(audiencias.id, input.audienciaId))
        .returning();
      return updated;
    }),

  // Buscar registro de audiência por ID da audiência
  buscarRegistro: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
    }))
    .query(async ({ input }) => {
      const [audiencia] = await db
        .select({
          id: audiencias.id,
          registroAudiencia: audiencias.registroAudiencia,
          status: audiencias.status,
        })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId))
        .limit(1);
      return audiencia?.registroAudiencia || null;
    }),

  // Buscar histórico de registros por processo ou assistido
  buscarHistoricoRegistros: protectedProcedure
    .input(z.object({
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.processoId) conditions.push(eq(audiencias.processoId, input.processoId));
      if (input.assistidoId) conditions.push(eq(audiencias.assistidoId, input.assistidoId));

      if (conditions.length === 0) return [];

      const results = await db
        .select({
          id: audiencias.id,
          registroAudiencia: audiencias.registroAudiencia,
          dataAudiencia: audiencias.dataAudiencia,
          status: audiencias.status,
          resultado: audiencias.resultado,
        })
        .from(audiencias)
        .where(or(...conditions))
        .orderBy(desc(audiencias.dataAudiencia));

      return results.filter(r => r.registroAudiencia != null);
    }),

  // Status de preparação para audiências próximas
  statusPreparacao: protectedProcedure
    .input(z.object({
      diasAntecedencia: z.number().default(8),
    }))
    .query(async ({ input }) => {
      const { diasAntecedencia } = input;
      const agora = new Date();
      const dataLimite = addDays(agora, diasAntecedencia);

      // 1. Buscar audiências agendadas dentro do período
      const audienciasProximas = await db
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          dataAudiencia: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          titulo: audiencias.titulo,
          assistidoNome: assistidos.nome,
          analysisStatus: processos.analysisStatus,
          analysisData: processos.analysisData,
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(
          and(
            gte(audiencias.dataAudiencia, agora),
            lte(audiencias.dataAudiencia, dataLimite),
            eq(audiencias.status, "agendada")
          )
        )
        .orderBy(asc(audiencias.dataAudiencia));

      if (audienciasProximas.length === 0) return [];

      // 2. Buscar testemunhas para todas as audiências de uma vez
      const audienciaIds = audienciasProximas.map((a) => a.id);
      const todasTestemunhas = await db
        .select({
          audienciaId: testemunhas.audienciaId,
          status: testemunhas.status,
        })
        .from(testemunhas)
        .where(inArray(testemunhas.audienciaId, audienciaIds));

      // Agrupar testemunhas por audiência
      const testemunhasPorAudiencia = new Map<number, typeof todasTestemunhas>();
      for (const t of todasTestemunhas) {
        if (t.audienciaId == null) continue;
        const lista = testemunhasPorAudiencia.get(t.audienciaId) ?? [];
        lista.push(t);
        testemunhasPorAudiencia.set(t.audienciaId, lista);
      }

      // 3. Montar resultado com statusPrep calculado
      return audienciasProximas.map((a) => {
        const hasAnalysis =
          a.analysisStatus === "completed" && a.analysisData != null;

        const tList = testemunhasPorAudiencia.get(a.id) ?? [];
        const testemunhasCount = tList.length;
        const naoIntimadas = tList.filter(
          (t) => t.status === "ARROLADA" || t.status === "NAO_LOCALIZADA"
        ).length;

        let statusPrep: "completo" | "parcial" | "pendente";
        if (hasAnalysis && testemunhasCount > 0 && naoIntimadas === 0) {
          statusPrep = "completo";
        } else if (hasAnalysis || testemunhasCount > 0) {
          statusPrep = "parcial";
        } else {
          statusPrep = "pendente";
        }

        return {
          id: a.id,
          processoId: a.processoId,
          assistidoNome: a.assistidoNome ?? "Não identificado",
          dataAudiencia: a.dataAudiencia,
          tipo: a.tipo,
          titulo: a.titulo,
          statusPrep,
          hasAnalysis,
          testemunhasCount,
          naoIntimadas,
        };
      });
    }),

  // Importar audiências em batch (do PJe)
  // Verifica duplicatas por número do processo + data + horário
  // Cria assistidos automaticamente se não existirem
  importBatch: protectedProcedure
    .input(z.object({
      eventos: z.array(z.object({
        titulo: z.string(),
        tipo: z.string(),
        data: z.string(),
        horarioInicio: z.string(),
        horarioFim: z.string().optional(),
        local: z.string().optional(),
        processo: z.string(),
        assistido: z.string().optional(),
        assistidos: z.array(z.object({
          nome: z.string(),
          cpf: z.string(),
        })).optional(),
        atribuicao: z.string().optional(),
        status: z.string().optional(),
        descricao: z.string().optional(),
        classeJudicial: z.string().optional(),
        situacaoAudiencia: z.string().optional(),
        orgaoJulgador: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { eventos } = input;

      // Mapear atribuição para o enum do banco de dados
      // Valores válidos: JURI_CAMACARI, VVD_CAMACARI, EXECUCAO_PENAL, SUBSTITUICAO, SUBSTITUICAO_CIVEL, GRUPO_JURI
      const mapAtribuicao = (atrib: string | undefined): "VVD_CAMACARI" | "JURI_CAMACARI" | "EXECUCAO_PENAL" | "SUBSTITUICAO" | "SUBSTITUICAO_CIVEL" | "GRUPO_JURI" => {
        if (!atrib) return "SUBSTITUICAO";
        const a = atrib.toUpperCase();
        if (a.includes("VIOLÊNCIA") || a.includes("VIOLENCIA") || a.includes("DOMÉSTICA") || a.includes("DOMESTICA") || a.includes("VVD")) return "VVD_CAMACARI";
        if (a.includes("JÚRI") || a.includes("JURI") || a.includes("TRIBUNAL")) return "JURI_CAMACARI";
        if (a.includes("EXECUÇÃO") || a.includes("EXECUCAO")) return "EXECUCAO_PENAL";
        if (a.includes("GRUPO")) return "GRUPO_JURI";
        if (a.includes("CÍVEL") || a.includes("CIVEL") || a.includes("FAMÍLIA") || a.includes("FAMILIA") || a.includes("NÃO PENAL") || a.includes("NAO PENAL")) return "SUBSTITUICAO_CIVEL";
        return "SUBSTITUICAO";
      };

      // Mapear área para o enum do banco de dados
      // Valores válidos: JURI, EXECUCAO_PENAL, VIOLENCIA_DOMESTICA, SUBSTITUICAO, CURADORIA, FAMILIA, CIVEL, FAZENDA_PUBLICA
      const mapArea = (atrib: string | undefined): "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" => {
        if (!atrib) return "SUBSTITUICAO";
        const a = atrib.toUpperCase();
        if (a.includes("VIOLÊNCIA") || a.includes("VIOLENCIA") || a.includes("DOMÉSTICA") || a.includes("DOMESTICA") || a.includes("VVD")) return "VIOLENCIA_DOMESTICA";
        if (a.includes("JÚRI") || a.includes("JURI") || a.includes("TRIBUNAL")) return "JURI";
        if (a.includes("EXECUÇÃO") || a.includes("EXECUCAO")) return "EXECUCAO_PENAL";
        if (a.includes("CURADORIA")) return "CURADORIA";
        if (a.includes("FAMÍLIA") || a.includes("FAMILIA")) return "FAMILIA";
        if (a.includes("CÍVEL") || a.includes("CIVEL")) return "CIVEL";
        if (a.includes("FAZENDA")) return "FAZENDA_PUBLICA";
        return "SUBSTITUICAO";
      };

      // Função para normalizar nomes (remover acentos, espaços extras, padronizar case)
      const normalizarNome = (nome: string): string => {
        return nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " "); // Remove espaços extras
      };

      // Função para calcular similaridade entre strings (algoritmo de Levenshtein simplificado)
      const calcularSimilaridade = (str1: string, str2: string): number => {
        const s1 = normalizarNome(str1);
        const s2 = normalizarNome(str2);
        if (s1 === s2) return 1;

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1;

        // Verificar se um contém o outro
        if (longer.includes(shorter) || shorter.includes(longer)) {
          return shorter.length / longer.length;
        }

        // Comparar palavras
        const palavras1 = s1.split(" ");
        const palavras2 = s2.split(" ");
        const palavrasComuns = palavras1.filter(p => palavras2.includes(p));

        return palavrasComuns.length / Math.max(palavras1.length, palavras2.length);
      };

      // ==========================================
      // BATCH PRE-FETCH: Eliminate N+1 queries
      // ==========================================

      // 1. Collect all unique CPFs from import events
      const allCpfs: string[] = [];
      for (const evento of eventos) {
        const lista = evento.assistidos || [];
        for (const a of lista) {
          if (a.cpf) {
            const cpfLimpo = a.cpf.replace(/\D/g, "");
            if (cpfLimpo && !allCpfs.includes(cpfLimpo)) allCpfs.push(cpfLimpo);
          }
        }
      }

      // 2. Collect all unique processo numbers from import events
      const allProcessoNumbers = [...new Set(eventos.map(e => e.processo))];

      // 3. Batch-fetch all assistidos that have any of those CPFs (1 query instead of N)
      let cpfToAssistido = new Map<string, { id: number }>();
      if (allCpfs.length > 0) {
        const assistidosByCpf = await db
          .select({ id: assistidos.id, cpf: assistidos.cpf })
          .from(assistidos)
          .where(sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') IN (${sql.join(allCpfs.map(c => sql`${c}`), sql`, `)})`);

        for (const a of assistidosByCpf) {
          if (a.cpf) {
            const cpfLimpo = a.cpf.replace(/\D/g, "");
            cpfToAssistido.set(cpfLimpo, { id: a.id });
          }
        }
      }

      // 4. Batch-fetch all assistidos for name matching (1 query instead of N)
      // We fetch all assistidos to do in-memory similarity matching
      const allAssistidosForMatching = await db
        .select({ id: assistidos.id, nome: assistidos.nome, atribuicaoPrimaria: assistidos.atribuicaoPrimaria })
        .from(assistidos);

      // Pre-normalize all names for similarity matching
      const assistidosNormalizados = allAssistidosForMatching.map(a => ({
        ...a,
        nomeNormalizado: normalizarNome(a.nome),
      }));

      // 5. Batch-fetch all processos by numeroAutos (1 query instead of N)
      let numeroToProcesso = new Map<string, { id: number; classeProcessual: string | null; vara: string | null; isJuri: boolean | null }>();
      if (allProcessoNumbers.length > 0) {
        const processosByNumero = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            classeProcessual: processos.classeProcessual,
            vara: processos.vara,
            isJuri: processos.isJuri,
          })
          .from(processos)
          .where(inArray(processos.numeroAutos, allProcessoNumbers));

        for (const p of processosByNumero) {
          numeroToProcesso.set(p.numeroAutos, {
            id: p.id,
            classeProcessual: p.classeProcessual,
            vara: p.vara,
            isJuri: p.isJuri,
          });
        }
      }

      // 6. Batch-fetch existing audiências for duplicate detection (1 query instead of N)
      // Build all dataHora + processo combos to check
      // Force BRT (-03:00) so the Date is unambiguous regardless of server TZ
      // (Vercel runs in UTC; without the offset "08:30" would be parsed as 08:30 UTC = 05:30 BRT).
      const allDataHoras = eventos.map(e => new Date(`${e.data}T${e.horarioInicio}:00-03:00`));
      const existingAudiencias = await db
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          assistidoId: audiencias.assistidoId,
          dataAudiencia: audiencias.dataAudiencia,
          numeroAutos: processos.numeroAutos,
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .where(
          and(
            inArray(audiencias.dataAudiencia, allDataHoras),
            inArray(processos.numeroAutos, allProcessoNumbers)
          )
        );

      // Build lookup: "processo|dataISO" -> audiência data
      const duplicateMap = new Map<string, { id: number; processoId: number | null; assistidoId: number | null }>();
      for (const ea of existingAudiencias) {
        if (ea.numeroAutos && ea.dataAudiencia) {
          const key = `${ea.numeroAutos}|${ea.dataAudiencia.toISOString()}`;
          duplicateMap.set(key, { id: ea.id, processoId: ea.processoId, assistidoId: ea.assistidoId });
        }
      }

      // Helper: find assistido by name similarity from pre-fetched data
      const findAssistidoByName = (nome: string): number | undefined => {
        const nomeNorm = normalizarNome(nome);
        for (const candidato of assistidosNormalizados) {
          const similaridade = calcularSimilaridade(candidato.nomeNormalizado, nomeNorm);
          if (similaridade >= 0.9) {
            return candidato.id;
          }
        }
        return undefined;
      };

      // Entire batch wrapped in a transaction — on error, everything rolls back
      return await withTransaction(async (tx) => {
        const importados: number[] = [];
        const duplicados: string[] = [];
        const atualizados: number[] = [];
        const assistidosCriados: number[] = [];

        for (const evento of eventos) {
          // Construir data/hora completa (forçar BRT — ver comentário no allDataHoras acima)
          const dataHora = new Date(`${evento.data}T${evento.horarioInicio}:00-03:00`);

          // Check duplicate from pre-fetched map (0 queries instead of 1)
          const dupKey = `${evento.processo}|${dataHora.toISOString()}`;
          const audienciaExistente = duplicateMap.get(dupKey);

          // Se encontrou duplicata, atualizar com os novos dados (exceto processo e assistido já vinculados)
          if (audienciaExistente) {
            // Atualizar audiência existente com novos dados
            await tx
              .update(audiencias)
              .set({
                tipo: evento.tipo,
                titulo: evento.titulo,
                descricao: evento.descricao,
                local: evento.local,
                horario: evento.horarioInicio,
                status: evento.status === "confirmado" ? "agendada" :
                       evento.status === "cancelado" ? "cancelada" :
                       evento.status === "remarcado" ? "reagendada" : "agendada",
              })
              .where(eq(audiencias.id, audienciaExistente.id));

            // Atualizar processo existente com atribuição corrigida se necessário
            if (audienciaExistente.processoId) {
              const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
              const areaEnum = mapArea(evento.atribuicao);

              await tx
                .update(processos)
                .set({
                  atribuicao: atribuicaoEnum as typeof processos.atribuicao._.data,
                  area: areaEnum as typeof processos.area._.data,
                  classeProcessual: evento.classeJudicial || undefined,
                  vara: evento.orgaoJulgador || undefined,
                })
                .where(eq(processos.id, audienciaExistente.processoId));
            }

            atualizados.push(audienciaExistente.id);
            duplicados.push(evento.processo);
            continue;
          }

          // Buscar ou criar assistido (primeiro da lista) — using pre-fetched Maps
          let assistidoId: number | undefined;
          const listaAssistidos = evento.assistidos || [];

          if (listaAssistidos.length > 0) {
            const primeiroAssistido = listaAssistidos[0];

            // Lookup by CPF from pre-fetched map (0 queries instead of 1)
            if (primeiroAssistido.cpf) {
              const cpfLimpo = primeiroAssistido.cpf.replace(/\D/g, "");
              const match = cpfToAssistido.get(cpfLimpo);
              if (match) {
                assistidoId = match.id;
              }
            }

            // Lookup by name from pre-fetched list (0 queries instead of 1)
            if (!assistidoId) {
              assistidoId = findAssistidoByName(primeiroAssistido.nome);
            }

            // Se não encontrou, criar novo assistido (INSERT still needs to be sequential)
            if (!assistidoId) {
              const nomeFormatado = primeiroAssistido.nome
                .toLowerCase()
                .split(" ")
                .map((palavra: string) => {
                  if (["de", "da", "do", "das", "dos", "e"].includes(palavra)) {
                    return palavra;
                  }
                  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                })
                .join(" ");

              const [novoAssistido] = await tx
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  cpf: primeiroAssistido.cpf || null,
                  statusPrisional: "SOLTO",
                  atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
                })
                .returning({ id: assistidos.id });

              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);

              // Update in-memory caches so subsequent iterations find this new record
              if (primeiroAssistido.cpf) {
                const cpfLimpo = primeiroAssistido.cpf.replace(/\D/g, "");
                cpfToAssistido.set(cpfLimpo, { id: novoAssistido.id });
              }
              assistidosNormalizados.push({
                id: novoAssistido.id,
                nome: nomeFormatado,
                atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
                nomeNormalizado: normalizarNome(nomeFormatado),
              });
            }
          } else {
            // Se não tem assistido identificado, buscar ou criar
            const nomeGenerico = evento.assistido || "Não identificado";

            // Lookup by name from pre-fetched list (0 queries instead of 1)
            if (nomeGenerico !== "Não identificado") {
              assistidoId = findAssistidoByName(nomeGenerico);
            }

            if (!assistidoId) {
              const nomeFormatado = nomeGenerico
                .toLowerCase()
                .split(" ")
                .map((palavra: string) => {
                  if (["de", "da", "do", "das", "dos", "e"].includes(palavra)) {
                    return palavra;
                  }
                  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                })
                .join(" ");

              const [novoAssistido] = await tx
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  statusPrisional: "SOLTO",
                  atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
                })
                .returning({ id: assistidos.id });

              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);

              // Update in-memory cache
              assistidosNormalizados.push({
                id: novoAssistido.id,
                nome: nomeFormatado,
                atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
                nomeNormalizado: normalizarNome(nomeFormatado),
              });
            }
          }

          // Backfill atribuicaoPrimaria if null — using pre-fetched data (0 queries instead of 1)
          if (assistidoId) {
            const cached = assistidosNormalizados.find(a => a.id === assistidoId);
            if (cached && !cached.atribuicaoPrimaria) {
              await tx.update(assistidos)
                .set({ atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data })
                .where(eq(assistidos.id, assistidoId));
              // Update in-memory cache
              cached.atribuicaoPrimaria = mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data;
            }
          }

          // Buscar ou criar processo — using pre-fetched Map (0 queries instead of 1-2)
          let processoId: number | undefined;
          const processoCache = numeroToProcesso.get(evento.processo);

          if (processoCache) {
            processoId = processoCache.id;

            // Backfill processo data if incomplete (using cached data, 0 extra SELECT)
            const updates: Record<string, any> = {};
            if ((!processoCache.classeProcessual || processoCache.classeProcessual === "Não informado") && evento.classeJudicial) {
              updates.classeProcessual = evento.classeJudicial;
            }
            if ((!processoCache.vara || processoCache.vara === "Não informado") && evento.orgaoJulgador) {
              updates.vara = evento.orgaoJulgador;
            }
            if (Object.keys(updates).length > 0) {
              await tx.update(processos).set(updates).where(eq(processos.id, processoCache.id));
              // Update cache
              if (updates.classeProcessual) processoCache.classeProcessual = updates.classeProcessual;
              if (updates.vara) processoCache.vara = updates.vara;
            }
          } else {
            // Criar processo com todos os campos obrigatórios
            const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
            const areaEnum = mapArea(evento.atribuicao);

            const [novoProcesso] = await tx
              .insert(processos)
              .values({
                assistidoId: assistidoId!,
                numeroAutos: evento.processo,
                atribuicao: atribuicaoEnum as typeof processos.atribuicao._.data,
                area: areaEnum as typeof processos.area._.data,
                classeProcessual: evento.classeJudicial || "Não informado",
                vara: evento.orgaoJulgador || "Não informado",
              })
              .returning({ id: processos.id });

            processoId = novoProcesso.id;

            // Update in-memory cache so subsequent iterations find this new processo
            numeroToProcesso.set(evento.processo, {
              id: novoProcesso.id,
              classeProcessual: evento.classeJudicial || "Não informado",
              vara: evento.orgaoJulgador || "Não informado",
              isJuri: null,
            });
          }

          // Verificar se é SESSÃO DE JÚRI (não apenas audiência na Vara do Júri)
          // Critério: deve ser "Sessão de Julgamento" ou "Plenário", não apenas mencionar "Júri"
          const tituloLower = evento.titulo?.toLowerCase() || "";
          const ehSessaoJuri =
            evento.tipo === "juri" ||
            tituloLower.includes("sessão de julgamento") ||
            tituloLower.includes("plenário do júri") ||
            tituloLower.includes("plenário do juri") ||
            // Padrão específico: "Júri - Nome" (título gerado pelo parser)
            (tituloLower.startsWith("júri -") && !tituloLower.includes("instrução"));

          if (ehSessaoJuri) {
            // Criar sessão de júri na tabela correta
            const [sessao] = await tx
              .insert(sessoesJuri)
              .values({
                processoId: processoId!,
                dataSessao: dataHora,
                defensorNome: "Defensor", // Será atualizado depois
                assistidoNome: evento.assistido || "Não identificado",
                status: evento.status === "cancelado" ? "CANCELADA" :
                       evento.status === "remarcado" ? "ADIADA" : "AGENDADA",
                observacoes: evento.descricao,
              })
              .returning({ id: sessoesJuri.id });

            // Atualizar processo com flag de júri
            await tx.update(processos)
              .set({ isJuri: true })
              .where(eq(processos.id, processoId!));

            importados.push(sessao.id);
          } else {
            // Criar audiência comum
            const [audiencia] = await tx
              .insert(audiencias)
              .values({
                processoId,
                assistidoId,
                dataAudiencia: dataHora,
                tipo: evento.tipo,
                titulo: evento.titulo,
                descricao: evento.descricao,
                local: evento.local,
                horario: evento.horarioInicio,
                status: evento.status === "confirmado" ? "agendada" :
                       evento.status === "cancelado" ? "cancelada" :
                       evento.status === "remarcado" ? "reagendada" : "agendada",
              })
              .returning({ id: audiencias.id });

            importados.push(audiencia.id);
          }
        }

        return {
          importados: importados.length,
          duplicados: duplicados.length,
          atualizados: atualizados.length,
          duplicadosProcessos: duplicados,
          assistidosCriados: assistidosCriados.length,
        };
      });
    }),

  // ==========================================
  // PIPELINE: Estado da preparação (testemunhas + PDF)
  // ==========================================

  getPreparacao: protectedProcedure
    .input(z.object({ audienciaId: z.number() }))
    .query(async ({ input }) => {
      const { audienciaId } = input;

      const lista = await db
        .select({
          id: testemunhas.id,
          nome: testemunhas.nome,
          tipo: testemunhas.tipo,
          status: testemunhas.status,
          endereco: testemunhas.endereco,
          resumoDepoimento: testemunhas.resumoDepoimento,
          pontosFavoraveis: testemunhas.pontosFavoraveis,
          pontosDesfavoraveis: testemunhas.pontosDesfavoraveis,
          perguntasSugeridas: testemunhas.perguntasSugeridas,
          observacoes: testemunhas.observacoes,
        })
        .from(testemunhas)
        .where(eq(testemunhas.audienciaId, audienciaId))
        .orderBy(asc(testemunhas.tipo), asc(testemunhas.nome));

      return {
        audienciaId,
        testemunhas: lista,
        total: lista.length,
      };
    }),

  // ==========================================
  // PIPELINE: Status do job de análise (worker)
  // ==========================================
  // Returns the most recent claude_code_tasks row for a processo, so the UI
  // can show "em fila / processando / concluído / falhou" badges and
  // know when to refetch the preparação.

  getAnalysisJobStatus: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [job] = await db
        .select({
          id: claudeCodeTasks.id,
          status: claudeCodeTasks.status,
          createdAt: claudeCodeTasks.createdAt,
          startedAt: claudeCodeTasks.startedAt,
          completedAt: claudeCodeTasks.completedAt,
          error: claudeCodeTasks.erro,
        })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.processoId, input.processoId))
        .orderBy(desc(claudeCodeTasks.createdAt))
        .limit(1);

      return job ?? null;
    }),

  // ==========================================
  // PIPELINE: Preview da preparação (dry-run)
  // ==========================================

  previewPreparacao: protectedProcedure
    .input(z.object({ audienciaId: z.number() }))
    .query(async ({ input }) => {
      const computed = await computePreparacao(input.audienciaId);

      // Mark which depoentes already exist in the DB so the UI can show
      // "novo" vs "já existente" badges in the preview.
      const existingRows = await db
        .select({ id: testemunhas.id, nome: testemunhas.nome })
        .from(testemunhas)
        .where(eq(testemunhas.audienciaId, input.audienciaId));

      const existingNorm = new Set(existingRows.map((r) => _normalizeName(r.nome)));

      return {
        audienciaId: input.audienciaId,
        assistidoNome: computed.assistidoNome,
        processoNumero: computed.processo.numeroAutos,
        atribuicao: computed.processo.atribuicao,
        resumoCaso: computed.resumoCaso,
        total: computed.depoentes.length,
        depoentes: computed.depoentes.map((d) => ({
          ...d,
          status: existingNorm.has(_normalizeName(d.nome))
            ? ("JA_EXISTENTE" as const)
            : ("NOVO" as const),
        })),
      };
    }),

  // ==========================================
  // PIPELINE: Preparar audiência (popular testemunhas)
  // ==========================================

  prepararAudiencia: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      skipDownload: z.boolean().optional(),
      skipAnalysis: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { audienciaId } = input;
      const { audiencia, processo, assistidoNome, resumoCaso, depoentes } =
        await computePreparacao(audienciaId);

      // ── Self-healing cleanup: every run, sweep out any testemunha rows that
      // never should have been inserted in the first place — the defendido
      // himself, or obvious placeholder names ("a confirmar", "equipe", etc.).
      // This catches garbage left over from old code paths and from manual
      // misuse, without ever touching legitimate edits.
      const existingForAudience = await db
        .select({ id: testemunhas.id, nome: testemunhas.nome })
        .from(testemunhas)
        .where(eq(testemunhas.audienciaId, audienciaId));

      const assistidoNorm = _normalizeName(assistidoNome);
      const polluted: number[] = [];
      for (const row of existingForAudience) {
        const n = _normalizeName(row.nome);
        // Defendido check: exact match or strong token overlap
        if (assistidoNorm && n === assistidoNorm) {
          polluted.push(row.id);
          continue;
        }
        if (assistidoNorm && assistidoNorm !== "nao identificado") {
          const aTokens = assistidoNorm.split(" ").filter((t) => t.length >= 3);
          const dTokens = n.split(" ").filter((t) => t.length >= 3);
          if (aTokens.length && dTokens.length) {
            const overlap = aTokens.filter((t) => dTokens.includes(t)).length;
            if (overlap >= 2 || overlap === Math.min(aTokens.length, dTokens.length)) {
              polluted.push(row.id);
              continue;
            }
          }
        }
        // Placeholder check
        if (_isPlaceholder(row.nome)) {
          polluted.push(row.id);
        }
      }

      let cleanedCount = 0;
      if (polluted.length > 0) {
        await db
          .delete(testemunhas)
          .where(inArray(testemunhas.id, polluted));
        cleanedCount = polluted.length;
      }

      if (depoentes.length === 0) {
        // ── Detect "empty analysis" loop: if the worker has completed a job
        // for this processo in the last hour and still produced 0 depoentes,
        // it almost certainly means the Drive folder is empty (no PDFs to
        // analyze). Re-enqueueing would loop forever. Surface a distinct
        // status so the user knows to download the autos first.
        // Fix A (2026-04-08): accept recent completions from EITHER queue.
        // The daemon migration to claude_code_tasks was partial — the legacy
        // ~/ombuds-worker/worker.sh still processes analysis_jobs, and the
        // pje-worker.sh (PJe download pipeline) also enqueues there. Checking
        // only claude_code_tasks missed legitimate "worker ran, no PDFs" cases.
        // Use a 24h window rather than 1h — the worker may have run hours
        // ago and the "empty analysis" signal is still valid. Stale but
        // non-ancient completions are trustworthy evidence of Drive emptiness.
        const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [recentClaudeTask] = await db
          .select({ completedAt: claudeCodeTasks.completedAt })
          .from(claudeCodeTasks)
          .where(
            and(
              eq(claudeCodeTasks.processoId, processo.id),
              eq(claudeCodeTasks.status, "completed"),
              gte(claudeCodeTasks.completedAt, recentCutoff),
            ),
          )
          .orderBy(desc(claudeCodeTasks.completedAt))
          .limit(1);

        const [recentAnalysisJob] = await db
          .select({ completedAt: analysisJobs.completedAt })
          .from(analysisJobs)
          .where(
            and(
              eq(analysisJobs.processoId, processo.id),
              eq(analysisJobs.status, "completed"),
              gte(analysisJobs.completedAt, recentCutoff),
            ),
          )
          .orderBy(desc(analysisJobs.completedAt))
          .limit(1);

        const recentJob = recentClaudeTask ?? recentAnalysisJob;

        if (recentJob) {
          return {
            audienciaId,
            assistidoNome,
            testemunhas: [],
            pdfPath: null,
            cleanedCount,
            documentsMissing: true as const,
            jobQueued: null as null | {
              id: number;
              created: boolean;
              status: "pending";
            },
          };
        }

        // ── Step D: enqueue a worker task instead of failing.
        // scripts/claude-code-daemon.mjs subscribes to claude_code_tasks via
        // Supabase Realtime and runs `claude -p` with the preparar-audiencia
        // skill, then writes depoimentos[] back into processos.analysis_data.
        // The user can re-click "Preparar Audiências" once the task completes.
        const job = await ensureClaudeCodeTask(
          processo.id,
          processo.assistidoId,
          processo.numeroAutos ?? "—",
          assistidoNome,
          processo.atribuicao,
          ctx.user.id,
        );

        return {
          audienciaId,
          assistidoNome,
          testemunhas: [],
          pdfPath: null,
          cleanedCount,
          documentsMissing: false as const,
          jobQueued: {
            id: job.jobId,
            created: job.created,
            status: "pending" as const,
          },
        };
      }

      const testemunhasResult: Array<{ nome: string; tipo: string; status: string }> = [];
      const pdfDepoentes: PreparacaoDepoente[] = [];

      for (const dep of depoentes) {
        // Check if testemunha already exists (same audienciaId + nome)
        const [existing] = await db
          .select({
            id: testemunhas.id,
            endereco: testemunhas.endereco,
            resumoDepoimento: testemunhas.resumoDepoimento,
            perguntasSugeridas: testemunhas.perguntasSugeridas,
            pontosFavoraveis: testemunhas.pontosFavoraveis,
            pontosDesfavoraveis: testemunhas.pontosDesfavoraveis,
            observacoes: testemunhas.observacoes,
          })
          .from(testemunhas)
          .where(
            and(
              eq(testemunhas.audienciaId, audienciaId),
              ilike(testemunhas.nome, dep.nome)
            )
          )
          .limit(1);

        let action: "ARROLADA" | "ENRIQUECIDA" | "JA_EXISTENTE" = "ARROLADA";

        if (!existing) {
          await db.insert(testemunhas).values({
            processoId: audiencia.processoId,
            audienciaId,
            nome: dep.nome,
            tipo: dep.tipo,
            status: "ARROLADA",
            endereco: dep.endereco,
            resumoDepoimento: dep.resumo,
            perguntasSugeridas: dep.perguntasSugeridas,
            pontosFavoraveis: dep.pontosFavoraveis,
            pontosDesfavoraveis: dep.pontosDesfavoraveis,
            observacoes: dep.observacoes,
          });
          action = "ARROLADA";
        } else {
          // Upsert enrichment: fill empty columns from the new analysis,
          // never overwriting fields the defensor may have edited manually.
          const isEmpty = (s: string | null | undefined) => !s || !s.trim();
          const patch: Record<string, string | null> = {};
          if (isEmpty(existing.endereco) && dep.endereco) patch.endereco = dep.endereco;
          if (isEmpty(existing.resumoDepoimento) && dep.resumo) patch.resumoDepoimento = dep.resumo;
          if (isEmpty(existing.perguntasSugeridas) && dep.perguntasSugeridas)
            patch.perguntasSugeridas = dep.perguntasSugeridas;
          if (isEmpty(existing.pontosFavoraveis) && dep.pontosFavoraveis)
            patch.pontosFavoraveis = dep.pontosFavoraveis;
          if (isEmpty(existing.pontosDesfavoraveis) && dep.pontosDesfavoraveis)
            patch.pontosDesfavoraveis = dep.pontosDesfavoraveis;
          if (isEmpty(existing.observacoes) && dep.observacoes)
            patch.observacoes = dep.observacoes;

          if (Object.keys(patch).length > 0) {
            await db.update(testemunhas).set(patch).where(eq(testemunhas.id, existing.id));
            action = "ENRIQUECIDA";
          } else {
            action = "JA_EXISTENTE";
          }
        }

        testemunhasResult.push({
          nome: dep.nome,
          tipo: dep.tipo,
          status: action,
        });

        pdfDepoentes.push({
          nome: dep.nome,
          tipo: dep.tipo,
          endereco: dep.endereco,
          resumo: dep.resumo,
          perguntas_sugeridas: dep.perguntasSugeridas,
          pontos_favoraveis: dep.pontosFavoraveis,
          pontos_desfavoraveis: dep.pontosDesfavoraveis,
          observacoes: dep.observacoes,
        });
      }

      // ── A5: Generate institutional PDF in the assistido's Drive folder.
      // Env-gated; on Vercel / when Drive isn't mounted this is a no-op.
      let pdfPath: string | null = null;
      try {
        const pdfResult = await gerarPreparacaoAudienciaPdf({
          atribuicao: (processo.atribuicao as string | null) ?? "SUBSTITUICAO",
          assistido: assistidoNome,
          processo: processo.numeroAutos ?? "—",
          audiencia: {
            data: audiencia.dataAudiencia,
            tipo: audiencia.tipo ?? null,
            local: audiencia.local ?? null,
          },
          resumo_caso: resumoCaso,
          depoentes: pdfDepoentes,
        });
        if (pdfResult) pdfPath = pdfResult.pdfPath;
      } catch (err) {
        console.warn("[prepararAudiencia] PDF generation failed:", err);
      }

      // 8. Return result
      return {
        audienciaId,
        assistidoNome,
        testemunhas: testemunhasResult,
        pdfPath,
        cleanedCount,
        documentsMissing: false as const,
        jobQueued: null as null | {
          id: number;
          created: boolean;
          status: "pending";
        },
      };
    }),

  // ==========================================
  // PIPELINE: Atualizar intimação de testemunhas
  // ==========================================

  atualizarIntimacaoTestemunhas: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      intimacoes: z.array(z.object({
        testemunhaNome: z.string().optional(),
        status: z.enum(["INTIMADA", "NAO_LOCALIZADA", "CARTA_PRECATORIA"]),
        movimentacao: z.string(),
        data: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { audienciaId, intimacoes } = input;

      // Fetch all testemunhas for this audiência
      const testemunhasDaAudiencia = await db
        .select()
        .from(testemunhas)
        .where(eq(testemunhas.audienciaId, audienciaId));

      if (testemunhasDaAudiencia.length === 0) {
        return { updated: [] };
      }

      const updated: string[] = [];

      for (const intimacao of intimacoes) {
        if (!intimacao.testemunhaNome) continue;

        const nomeIntimacao = intimacao.testemunhaNome.toLowerCase().trim();

        // Case-insensitive partial match
        const match = testemunhasDaAudiencia.find((t) => {
          const nomeTest = t.nome.toLowerCase().trim();
          return (
            nomeTest === nomeIntimacao ||
            nomeTest.includes(nomeIntimacao) ||
            nomeIntimacao.includes(nomeTest)
          );
        });

        if (match) {
          const obsText = `[${intimacao.data}] ${intimacao.movimentacao}`;
          const newObs = match.observacoes
            ? `${match.observacoes}\n${obsText}`
            : obsText;

          await db
            .update(testemunhas)
            .set({
              status: intimacao.status,
              observacoes: newObs,
              updatedAt: new Date(),
            })
            .where(eq(testemunhas.id, match.id));

          updated.push(match.nome);
        }
      }

      return { updated };
    }),

  addQuickNote: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      texto: z.string().min(1, "Nota não pode ser vazia"),
    }))
    .mutation(async ({ input, ctx }) => {
      const [audiencia] = await db
        .select({ anotacoesRapidas: audiencias.anotacoesRapidas })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId));
      if (!audiencia) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audiência não encontrada" });
      }
      const novaNota = {
        texto: input.texto,
        timestamp: new Date().toISOString(),
        autorId: ctx.user.id,
      };
      const notasAtualizadas = [...(audiencia.anotacoesRapidas ?? []), novaNota];
      await db
        .update(audiencias)
        .set({ anotacoesRapidas: notasAtualizadas, updatedAt: new Date() })
        .where(eq(audiencias.id, input.audienciaId));
      return { nota: novaNota };
    }),

  marcarDepoenteOuvido: protectedProcedure
    .input(z.object({
      depoenteId: z.number(),
      sinteseJuizo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = {
        status: "OUVIDA",
        ouvidoEm: new Date(),
        updatedAt: new Date(),
      };
      if (input.sinteseJuizo) updates.sinteseJuizo = input.sinteseJuizo;
      const [row] = await db
        .update(testemunhas)
        .set(updates)
        .where(eq(testemunhas.id, input.depoenteId))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Depoente não encontrado" });
      }
      return row;
    }),

  redesignarDepoente: protectedProcedure
    .input(z.object({
      depoenteId: z.number(),
      novaData: z.string().optional(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [atual] = await db.select().from(testemunhas).where(eq(testemunhas.id, input.depoenteId));
      if (!atual) throw new TRPCError({ code: "NOT_FOUND", message: "Depoente não encontrado" });
      const observacoesAtualizadas = input.motivo
        ? [atual.observacoes, `[Redesignado: ${input.motivo}]`].filter(Boolean).join("\n")
        : atual.observacoes;
      const [row] = await db
        .update(testemunhas)
        .set({
          redesignadoPara: input.novaData ?? null,
          observacoes: observacoesAtualizadas,
          updatedAt: new Date(),
        } as any)
        .where(eq(testemunhas.id, input.depoenteId))
        .returning();
      return row;
    }),
});
