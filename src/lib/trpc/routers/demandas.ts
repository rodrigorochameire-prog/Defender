import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { audiencias } from "@/lib/db/schema/agenda";
import { eq, ilike, or, desc, sql, lte, gte, and, inArray, isNull, isNotNull, not, asc, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDefensorResponsavel, getDefensoresVisiveis } from "../defensor-scope";
import { logAudit, diffFields } from "@/lib/audit";
import { normalizarNome, calcularSimilaridade } from "@/lib/pje-parser";
import { pushDemanda as sheetsPush, removeDemanda as sheetsRemove, moveDemanda as sheetsMove, type DemandaParaSync } from "@/lib/services/google-sheets";
import { triggerReorder } from "@/lib/services/reorder-trigger";
import { buildProvidenciasCell } from "@/lib/services/registros-summary";

/**
 * Monta o objeto DemandaParaSync buscando dados relacionados.
 * Usado para sync com Google Sheets (fire-and-forget).
 */
async function buildDemandaSync(demandaId: number): Promise<DemandaParaSync | null> {
  const result = await db
    .select({
      id: demandas.id,
      status: demandas.status,
      substatus: demandas.substatus,
      reuPreso: demandas.reuPreso,
      dataEntrada: demandas.dataEntrada,
      dataExpedicao: demandas.dataExpedicao,
      ato: demandas.ato,
      prazo: demandas.prazo,
      defensorId: demandas.defensorId,
      assistidoNome: assistidos.nome,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      delegadoNome: users.name,
    })
    .from(demandas)
    .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
    .leftJoin(processos, eq(demandas.processoId, processos.id))
    .leftJoin(users, eq(demandas.delegadoParaId, users.id))
    .where(eq(demandas.id, demandaId))
    .limit(1);

  const row = result[0];
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    substatus: row.substatus ?? null,
    reuPreso: row.reuPreso,
    dataEntrada: row.dataEntrada,
    dataExpedicao: row.dataExpedicao,
    ato: row.ato,
    prazo: row.prazo,
    providencias: await buildProvidenciasCell(row.id),
    assistidoNome: row.assistidoNome ?? "",
    numeroAutos: row.numeroAutos ?? "",
    atribuicao: row.atribuicao ?? "SUBSTITUICAO",
    delegadoNome: row.delegadoNome ?? null,
    defensorId: row.defensorId,
  };
}

// Helper: inferir fase processual com base no tipo de documento PJe
function inferirFaseProcessual(tipoDocumento?: string): string | undefined {
  if (!tipoDocumento) return undefined;
  const tipo = tipoDocumento.toLowerCase();
  if (tipo.includes("sentença") || tipo.includes("sentenca")) return "sentença";
  if (tipo.includes("decisão") || tipo.includes("decisao")) return "instrução";
  if (tipo.includes("ato ordinatório") || tipo.includes("ato ordinatorio")) return "instrução";
  if (tipo.includes("despacho")) return "instrução";
  return undefined;
}

export const demandasRouter = router({
  /** Lista demandas vinculadas a um caso específico. */
  listByCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      return await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          status: demandas.status,
          substatus: demandas.substatus,
          prazo: demandas.prazo,
          prioridade: demandas.prioridade,
          reuPreso: demandas.reuPreso,
          createdAt: demandas.createdAt,
        })
        .from(demandas)
        .where(and(eq(demandas.casoId, input.casoId), isNull(demandas.deletedAt)))
        .orderBy(desc(demandas.createdAt));
    }),

  // Listar todas as demandas
  // ARQUITETURA: Cada defensor tem seu "banco de dados" de demandas
  // - Defensor: vê apenas suas demandas
  // - Estagiário: vê demandas do seu supervisor (defensor vinculado)
  // - Servidor: pode ver de múltiplos defensores (administrativa)
  // - Admin: vê tudo
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        area: z.string().optional(),
        reuPreso: z.boolean().optional(),
        defensorId: z.number().optional(), // Filtro explícito por defensor
        limit: z.number().min(1).max(10000).optional(),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, status, area, reuPreso, defensorId, limit, offset = 0 } = input || {};
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);
      const defensorResponsavel = getDefensorResponsavel(ctx.user);
      
      let conditions = [];
      
      // Excluir demandas deletadas
      conditions.push(isNull(demandas.deletedAt));
      
      if (search) {
        conditions.push(
          ilike(demandas.ato, `%${search}%`)
        );
      }
      
      if (status && status !== "all") {
        conditions.push(eq(demandas.status, status as typeof demandas.status._.data));
      }
      
      if (reuPreso !== undefined) {
        conditions.push(eq(demandas.reuPreso, reuPreso));
      }

      // ISOLAMENTO POR DEFENSOR
      // Cada defensor tem seu próprio universo de demandas
      if (defensorId) {
        // Filtro explícito solicitado - verificar se tem acesso
        if (defensoresVisiveis !== "all" && !defensoresVisiveis.includes(defensorId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem acesso às demandas deste defensor",
          });
        }
        conditions.push(eq(demandas.defensorId, defensorId));
      } else if (defensoresVisiveis !== "all") {
        // Aplica filtro automático baseado no papel do usuário
        if (defensoresVisiveis.length === 1) {
          conditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
        } else if (defensoresVisiveis.length > 1) {
          conditions.push(inArray(demandas.defensorId, defensoresVisiveis));
        }
      }
      // Se defensoresVisiveis === "all", não filtra (admin/servidor)
      
      let query = db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          dataEntrada: demandas.dataEntrada,
          dataExpedicao: demandas.dataExpedicao,
          status: demandas.status,
          substatus: demandas.substatus,
          prioridade: demandas.prioridade,
          reuPreso: demandas.reuPreso,
          processoId: demandas.processoId,
          assistidoId: demandas.assistidoId,
          defensorId: demandas.defensorId,
          ordemManual: demandas.ordemManual,
          importBatchId: demandas.importBatchId,
          ordemOriginal: demandas.ordemOriginal,
          createdAt: demandas.createdAt,
          updatedAt: demandas.updatedAt,
          syncedAt: demandas.syncedAt,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
            atribuicao: processos.atribuicao,
            tipoProcesso: processos.tipoProcesso,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
            photoUrl: assistidos.photoUrl,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`${demandas.ordemManual} ASC NULLS LAST, ${demandas.createdAt} DESC, ${demandas.prazo} ASC NULLS LAST`)
        .$dynamic();

      if (limit) query = query.limit(limit);
      if (offset) query = query.offset(offset);

      return await query;
    }),

  // Buscar demanda por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);
      const conditions = [eq(demandas.id, input.id), isNull(demandas.deletedAt)];

      // Aplicar filtro de acesso
      if (defensoresVisiveis !== "all") {
        if (defensoresVisiveis.length === 1) {
          conditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
        } else if (defensoresVisiveis.length > 1) {
          conditions.push(inArray(demandas.defensorId, defensoresVisiveis));
        }
      }

      const [result] = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          tipoAto: demandas.tipoAto,
          prazo: demandas.prazo,
          dataEntrada: demandas.dataEntrada,
          dataIntimacao: demandas.dataIntimacao,
          dataExpedicao: demandas.dataExpedicao,
          dataConclusao: demandas.dataConclusao,
          status: demandas.status,
          substatus: demandas.substatus,
          prioridade: demandas.prioridade,
          reuPreso: demandas.reuPreso,
          processoId: demandas.processoId,
          assistidoId: demandas.assistidoId,
          defensorId: demandas.defensorId,
          delegadoParaId: demandas.delegadoParaId,
          dataDelegacao: demandas.dataDelegacao,
          motivoDelegacao: demandas.motivoDelegacao,
          statusDelegacao: demandas.statusDelegacao,
          enrichmentData: demandas.enrichmentData,
          createdAt: demandas.createdAt,
          updatedAt: demandas.updatedAt,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
            atribuicao: processos.atribuicao,
            tipoProcesso: processos.tipoProcesso,
            comarca: processos.comarca,
            vara: processos.vara,
            classeProcessual: processos.classeProcessual,
            assunto: processos.assunto,
            fase: processos.fase,
            parteContraria: processos.parteContraria,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
            photoUrl: assistidos.photoUrl,
          },
          defensor: {
            id: users.id,
            name: users.name,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .leftJoin(users, eq(demandas.defensorId, users.id))
        .where(and(...conditions));

      return result || null;
    }),

  // Listar prazos urgentes (próximos 7 dias)
  // Respeita o isolamento por defensor
  prazosUrgentes: protectedProcedure
    .input(
      z.object({
        dias: z.number().default(7),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { dias = 7 } = input || {};
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);
      const hoje = new Date();
      const limite = new Date();
      limite.setDate(limite.getDate() + dias);
      
      // Condições base
      const baseConditions = [
        isNull(demandas.deletedAt),
        lte(demandas.prazo, limite.toISOString().split('T')[0]),
        or(
          eq(demandas.status, "2_ATENDER"),
          eq(demandas.status, "4_MONITORAR"),
          eq(demandas.status, "5_TRIAGEM"),
          eq(demandas.status, "URGENTE")
        ),
      ];
      
      // Aplicar filtro de defensor
      if (defensoresVisiveis !== "all") {
        if (defensoresVisiveis.length === 1) {
          baseConditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
        } else if (defensoresVisiveis.length > 1) {
          baseConditions.push(inArray(demandas.defensorId, defensoresVisiveis));
        }
      }
      
      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          substatus: demandas.substatus,
          prioridade: demandas.prioridade,
          reuPreso: demandas.reuPreso,
          defensorId: demandas.defensorId,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
            atribuicao: processos.atribuicao,
            tipoProcesso: processos.tipoProcesso,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
            statusPrisional: assistidos.statusPrisional,
            photoUrl: assistidos.photoUrl,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(and(...baseConditions))
        .orderBy(demandas.prazo);

      return result;
    }),

  // Demandas com prazo se aproximando (para alertas proativos)
  // Retorna demandas não concluídas com prazo entre hoje e hoje+N dias
  prazosProximos: protectedProcedure
    .input(
      z.object({
        dias: z.number().default(3),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { dias = 3 } = input || {};
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      const hoje = new Date();
      const limite = new Date();
      limite.setDate(hoje.getDate() + dias);

      const hojeStr = hoje.toISOString().split('T')[0];
      const limiteStr = limite.toISOString().split('T')[0];

      const baseConditions = [
        isNull(demandas.deletedAt),
        gte(demandas.prazo, hojeStr),
        lte(demandas.prazo, limiteStr),
        // Excluir status terminais (concluídos/arquivados/protocolados)
        not(inArray(demandas.status, [
          'CONCLUIDO',
          'ARQUIVADO',
          '7_PROTOCOLADO',
          '7_CIENCIA',
          '7_SEM_ATUACAO',
        ] as const)),
      ];

      // Aplicar filtro de defensor
      if (defensoresVisiveis !== "all") {
        if (defensoresVisiveis.length === 1) {
          baseConditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
        } else if (defensoresVisiveis.length > 1) {
          baseConditions.push(inArray(demandas.defensorId, defensoresVisiveis));
        }
      }

      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(demandas)
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(and(...baseConditions))
        .orderBy(asc(demandas.prazo))
        .limit(10);

      return result.map(d => ({
        id: d.id,
        assistido: d.assistido?.nome ?? 'Sem assistido',
        prazo: d.prazo!,
        ato: d.ato,
        status: d.status,
      }));
    }),

  // Criar demanda a partir do formulário "Nova" — resolve assistido/processo
  // por nome/número (find-or-create), aceita atribuição e status em formato
  // amigável e já dispara o sync da planilha. Diferente de `create`, não
  // exige IDs pré-existentes.
  createFromForm: protectedProcedure
    .input(
      z.object({
        assistidoNome: z.string().min(1),
        numeroAutos: z.string().optional(),
        tipoProcesso: z.string().optional(),
        atribuicao: z.string().min(1), // aceita label ("Tribunal do Júri") ou enum ("JURI_CAMACARI")
        ato: z.string().min(1),
        status: z.string().optional(), // "triagem", "protocolado", ou enum direto
        dataExpedicao: z.string().optional(), // YYYY-MM-DD ou DD/MM/YYYY
        dataEntrada: z.string().optional(),
        prazo: z.string().optional(),
        providencias: z.string().optional(), // ignorado — coluna foi migrada para tabela "registros"
        reuPreso: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Resolver atribuicao (aceita label PT-BR ou enum)
      const ATRIBUICAO_LABEL_TO_ENUM: Record<string, string> = {
        "Tribunal do Júri": "JURI_CAMACARI",
        "Grupo Especial do Júri": "GRUPO_JURI",
        "Violência Doméstica": "VVD_CAMACARI",
        "Execução Penal": "EXECUCAO_PENAL",
        "Substituição Criminal": "SUBSTITUICAO",
        "Curadoria Especial": "SUBSTITUICAO_CIVEL",
      };
      const atribuicaoEnum = ATRIBUICAO_LABEL_TO_ENUM[input.atribuicao] ?? input.atribuicao;

      // Validação amigável — se o valor não é uma atribuição válida, rejeita
      // com BAD_REQUEST antes de o Postgres retornar um erro opaco sobre enum.
      const ATRIBUICOES_VALIDAS = new Set([
        "JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI",
        "EXECUCAO_PENAL", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL",
      ]);
      if (!ATRIBUICOES_VALIDAS.has(atribuicaoEnum)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Atribuição inválida: "${input.atribuicao}". Escolha uma das opções da lista.`,
        });
      }

      // `area` é NOT NULL em `processos` — derivar do enum de atribuição.
      const ATRIBUICAO_TO_AREA: Record<string, string> = {
        JURI_CAMACARI: "JURI",
        GRUPO_JURI: "JURI",
        VVD_CAMACARI: "VIOLENCIA_DOMESTICA",
        EXECUCAO_PENAL: "EXECUCAO_PENAL",
        SUBSTITUICAO: "CRIMINAL",
        SUBSTITUICAO_CIVEL: "CIVEL",
      };
      const areaEnumValue = ATRIBUICAO_TO_AREA[atribuicaoEnum] ?? "CRIMINAL";

      // 2. Resolver status+substatus a partir do valor do select do modal
      const STATUS_MAP: Record<string, { status: string; substatus: string | null }> = {
        urgente: { status: "URGENTE", substatus: null },
        triagem: { status: "5_TRIAGEM", substatus: null },
        atender: { status: "2_ATENDER", substatus: "2 - Atender" },
        analisar: { status: "2_ATENDER", substatus: "2 - Analisar" },
        elaborar: { status: "2_ATENDER", substatus: "2 - Elaborar" },
        elaborando: { status: "2_ATENDER", substatus: "2 - Elaborando" },
        revisar: { status: "2_ATENDER", substatus: "2 - Revisar" },
        revisando: { status: "2_ATENDER", substatus: "2 - Revisando" },
        relatorio: { status: "2_ATENDER", substatus: "2 - Relatório" },
        documentos: { status: "2_ATENDER", substatus: "6 - Documentos" },
        testemunhas: { status: "2_ATENDER", substatus: "6 - Testemunhas" },
        investigar: { status: "2_ATENDER", substatus: "2 - Investigar" },
        buscar: { status: "2_ATENDER", substatus: "2 - Buscar" },
        oficiar: { status: "2_ATENDER", substatus: "2 - Oficiar" },
        protocolar: { status: "2_ATENDER", substatus: "3 - Protocolar" },
        monitorar: { status: "4_MONITORAR", substatus: null },
        protocolado: { status: "7_PROTOCOLADO", substatus: null },
        ciencia: { status: "7_CIENCIA", substatus: null },
        resolvido: { status: "CONCLUIDO", substatus: "7 - Resolvido" },
        constituiu_advogado: { status: "CONCLUIDO", substatus: "7 - Constituiu advogado" },
        sem_atuacao: { status: "7_SEM_ATUACAO", substatus: null },
        arquivado: { status: "ARQUIVADO", substatus: null },
      };
      const statusKey = (input.status ?? "triagem").toLowerCase();
      const resolvedStatus = STATUS_MAP[statusKey] ?? { status: statusKey.toUpperCase(), substatus: null };

      // 3. Normalizar datas (aceita DD/MM/YYYY ou YYYY-MM-DD)
      const normalizeDate = (v: string | undefined): string | null => {
        if (!v) return null;
        const s = v.trim();
        if (!s) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        if (s.includes("/")) {
          const parts = s.split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d && m && y) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
        }
        return null;
      };
      const dataExpedicaoDB = normalizeDate(input.dataExpedicao) ?? normalizeDate(input.dataEntrada);
      const dataEntradaDB = normalizeDate(input.dataEntrada) ?? dataExpedicaoDB;
      const prazoDB = normalizeDate(input.prazo);

      // 4. Find-or-create assistido pelo nome (case-insensitive)
      const nomeTrimmed = input.assistidoNome.trim();
      let [assistido] = await db
        .select({ id: assistidos.id })
        .from(assistidos)
        .where(and(ilike(assistidos.nome, nomeTrimmed), isNull(assistidos.deletedAt)))
        .limit(1);
      if (!assistido) {
        const [novo] = await db
          .insert(assistidos)
          .values({ nome: nomeTrimmed, origemCadastro: "manual" })
          .returning({ id: assistidos.id });
        assistido = novo;
      }

      // 5. Find-or-create processo — por numeroAutos se fornecido, senão cria
      // um stub "SN-<timestamp>" vinculado ao assistido (paridade com importFromSheets).
      const numAutos = (input.numeroAutos ?? "").trim();
      let processoId: number;
      if (numAutos) {
        const [existente] = await db
          .select({ id: processos.id })
          .from(processos)
          .where(and(eq(processos.numeroAutos, numAutos), isNull(processos.deletedAt)))
          .limit(1);
        if (existente) {
          processoId = existente.id;
        } else {
          const [novo] = await db
            .insert(processos)
            .values({
              assistidoId: assistido.id,
              numeroAutos: numAutos,
              atribuicao: atribuicaoEnum as never,
              area: areaEnumValue as never,
            })
            .returning({ id: processos.id });
          processoId = novo.id;
        }
      } else {
        const [novo] = await db
          .insert(processos)
          .values({
            assistidoId: assistido.id,
            numeroAutos: `SN-${Date.now()}`,
            atribuicao: atribuicaoEnum as never,
            area: areaEnumValue as never,
          })
          .returning({ id: processos.id });
        processoId = novo.id;
      }

      // 6. Inserir a demanda
      const defensorId = getDefensorResponsavel(ctx.user);
      const [nova] = await db
        .insert(demandas)
        .values({
          processoId,
          assistidoId: assistido.id,
          ato: input.ato,
          status: resolvedStatus.status as never,
          substatus: resolvedStatus.substatus,
          prazo: prazoDB,
          dataEntrada: dataEntradaDB,
          dataExpedicao: dataExpedicaoDB,
          reuPreso: input.reuPreso ?? false,
          prioridade: input.reuPreso ? "REU_PRESO" : "NORMAL",
          defensorId: defensorId || ctx.user.id,
        })
        .returning();

      logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "demanda",
        entityId: nova.id,
        action: "create",
        metadata: { ato: input.ato, origem: "modal_nova" },
      });

      // 7. Sync planilha (fire-and-forget, mesmo padrão de `create`)
      buildDemandaSync(nova.id)
        .then((d) => {
          if (!d) return;
          sheetsPush(d).catch(console.error);
          triggerReorder(d.atribuicao, "create", nova.id);
        })
        .catch(console.error);

      return nova;
    }),

  // Criar nova demanda
  // A demanda é criada no "banco" do defensor logado (ou do supervisor, se estagiário)
  create: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        assistidoId: z.number(),
        ato: z.string().min(1),
        prazo: z.string().optional(),
        dataEntrada: z.string().optional(),
        status: z.enum([
          "2_ATENDER", "4_MONITORAR", "5_TRIAGEM", "7_PROTOCOLADO",
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).default("5_TRIAGEM"),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).default("NORMAL"),
        providencias: z.string().optional(), // ignorado — coluna foi migrada para tabela "registros"
        reuPreso: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const defensorId = getDefensorResponsavel(ctx.user);
      
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
      });

      if (!processo) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
      }

      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
      });

      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      // Demanda é criada vinculada ao defensor responsável
      // providencias é ignorada — coluna foi migrada para tabela "registros"
      const { providencias: _ignored, ...inputSemProvidencias } = input;
      const [novaDemanda] = await db
        .insert(demandas)
        .values({
          ...inputSemProvidencias,
          prazo: input.prazo || null,
          dataEntrada: input.dataEntrada || null,
          defensorId: defensorId || ctx.user.id, // Defensor responsável pela demanda
        })
        .returning();

      // Audit log
      logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "demanda",
        entityId: novaDemanda.id,
        action: "create",
        metadata: { ato: input.ato, assistidoId: input.assistidoId, processoId: input.processoId },
      });

      // Sync Google Sheets (fire-and-forget — não bloqueia resposta)
      buildDemandaSync(novaDemanda.id).then((d) => {
        if (!d) return;
        sheetsPush(d).catch(console.error);
        triggerReorder(d.atribuicao, "create", novaDemanda.id);
      }).catch(console.error);

      return novaDemanda;
    }),

  // Atualizar demanda
  // Só pode atualizar demandas do seu "banco"
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ato: z.string().min(1).optional(),
        prazo: z.string().optional(),
        status: z.enum([
          "2_ATENDER", "4_MONITORAR", "5_TRIAGEM", "7_PROTOCOLADO",
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).optional(),
        substatus: z.string().max(50).optional().nullable(),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).optional(),
        providencias: z.string().optional(), // ignorado — coluna foi migrada para tabela "registros"
        reuPreso: z.boolean().optional(),
        // Atribuição - atualiza o processo vinculado
        atribuicao: z.enum([
          "JURI_CAMACARI", "GRUPO_JURI", "VVD_CAMACARI",
          "EXECUCAO_PENAL", "SUBSTITUICAO", "SUBSTITUICAO_CIVEL"
        ]).optional(),
        // Edição de nome do assistido (atualiza tabela assistidos)
        assistidoNome: z.string().min(1).optional(),
        // Edição de número do processo (atualiza tabela processos)
        processoNumero: z.string().min(1).optional(),
        // Reassociar demanda a outro assistido/processo existente
        assistidoId: z.number().optional(),
        processoId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, atribuicao, assistidoNome, processoNumero, assistidoId: newAssistidoId, processoId: newProcessoId, providencias: _providenciasIgnored, ...data } = input;
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      // TODO: replace with strict Drizzle insert type once all optional fields are mapped
      const updateData: Partial<typeof demandas.$inferInsert> & { updatedAt: Date } = {
        ...data,
        updatedAt: new Date(),
      };

      // Se marcado como concluído, registrar data
      if (data.status === "CONCLUIDO") {
        updateData.concluidoEm = new Date();
      }

      // Construir condições de acesso
      let whereCondition;
      if (defensoresVisiveis === "all") {
        whereCondition = eq(demandas.id, id);
      } else if (defensoresVisiveis.length === 1) {
        whereCondition = and(eq(demandas.id, id), eq(demandas.defensorId, defensoresVisiveis[0]));
      } else {
        whereCondition = and(eq(demandas.id, id), inArray(demandas.defensorId, defensoresVisiveis));
      }

      // Buscar estado anterior para audit log
      const [anterior] = await db.select().from(demandas).where(eq(demandas.id, id));

      const [atualizado] = await db
        .update(demandas)
        .set(updateData)
        .where(whereCondition)
        .returning();

      if (!atualizado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demanda não encontrada ou você não tem permissão para editá-la",
        });
      }

      // Audit log
      if (anterior) {
        const changes = diffFields(
          anterior as unknown as Record<string, unknown>,
          data as Record<string, unknown>,
          ["status", "prioridade", "ato", "reuPreso", "substatus"]
        );
        const isStatusChange = data.status && data.status !== anterior.status;
        logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name,
          entityType: "demanda",
          entityId: id,
          action: isStatusChange ? "status_change" : "update",
          changes: changes ?? undefined,
          metadata: isStatusChange ? { oldStatus: anterior.status, newStatus: data.status } : undefined,
        });
      }

      // Se foi passada atribuição, atualizar o processo vinculado
      if (atribuicao && atualizado.processoId) {
        const ATRIBUICAO_TO_AREA: Record<string, string> = {
          "JURI_CAMACARI": "JURI",
          "GRUPO_JURI": "JURI",
          "VVD_CAMACARI": "VIOLENCIA_DOMESTICA",
          "EXECUCAO_PENAL": "EXECUCAO_PENAL",
          "SUBSTITUICAO": "SUBSTITUICAO",
          "SUBSTITUICAO_CIVEL": "CIVEL",
        };

        await db.update(processos)
          .set({
            atribuicao: atribuicao as typeof processos.atribuicao._.data,
            area: (ATRIBUICAO_TO_AREA[atribuicao] || "JURI") as typeof processos.area._.data,
            updatedAt: new Date(),
          })
          .where(eq(processos.id, atualizado.processoId));
      }

      // Se foi passado assistidoNome, atualizar nome na tabela assistidos
      if (assistidoNome && atualizado.assistidoId) {
        await db.update(assistidos)
          .set({ nome: assistidoNome, updatedAt: new Date() })
          .where(eq(assistidos.id, atualizado.assistidoId));
      }

      // Se foi passado processoNumero, atualizar número na tabela processos
      if (processoNumero && atualizado.processoId) {
        await db.update(processos)
          .set({ numeroAutos: processoNumero, updatedAt: new Date() })
          .where(eq(processos.id, atualizado.processoId));
      }

      // Se foi passado assistidoId, reassociar demanda a outro assistido existente
      if (newAssistidoId !== undefined) {
        await db.update(demandas)
          .set({ assistidoId: newAssistidoId, updatedAt: new Date() })
          .where(eq(demandas.id, id));
      }

      // Se foi passado processoId, reassociar demanda a outro processo existente
      if (newProcessoId !== undefined) {
        await db.update(demandas)
          .set({ processoId: newProcessoId, updatedAt: new Date() })
          .where(eq(demandas.id, id));
      }

      // Sync Google Sheets (fire-and-forget)
      buildDemandaSync(id).then((d) => {
        if (!d) return;
        if (atribuicao) {
          // Atribuição mudou — move de aba
          sheetsMove(d, atribuicao).catch(console.error);
          // Reordena tanto a aba de origem quanto a de destino
          triggerReorder(d.atribuicao, "move", id);
        } else {
          sheetsPush(d).catch(console.error);
          triggerReorder(d.atribuicao, "update", id);
        }
      }).catch(console.error);

      return atualizado;
    }),

  // Excluir demanda (soft delete)
  // Só pode excluir demandas do seu "banco"
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      // Construir condições de acesso - incluir verificação de não deletada
      let whereCondition;
      if (defensoresVisiveis === "all") {
        whereCondition = and(eq(demandas.id, input.id), isNull(demandas.deletedAt));
      } else if (defensoresVisiveis.length === 1) {
        whereCondition = and(
          eq(demandas.id, input.id), 
          eq(demandas.defensorId, defensoresVisiveis[0]),
          isNull(demandas.deletedAt)
        );
      } else if (defensoresVisiveis.length > 1) {
        whereCondition = and(
          eq(demandas.id, input.id), 
          inArray(demandas.defensorId, defensoresVisiveis),
          isNull(demandas.deletedAt)
        );
      } else {
        // Nenhum defensor visível - não pode deletar nada
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para excluir demandas",
        });
      }

      const [excluido] = await db
        .update(demandas)
        .set({ deletedAt: new Date() })
        .where(whereCondition)
        .returning();

      if (!excluido) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demanda não encontrada ou você não tem permissão para excluí-la",
        });
      }

      // Audit log
      logAudit({
        userId: ctx.user.id,
        userName: ctx.user.name,
        entityType: "demanda",
        entityId: input.id,
        action: "delete",
        metadata: { ato: excluido.ato, assistidoId: excluido.assistidoId },
      });

      // Sync Google Sheets — remove da planilha (fire-and-forget)
      if (excluido.processoId) {
        db.select({ atribuicao: processos.atribuicao })
          .from(processos)
          .where(eq(processos.id, excluido.processoId))
          .limit(1)
          .then(([proc]) => {
            if (proc?.atribuicao) {
              sheetsRemove(excluido.id, proc.atribuicao).catch(console.error);
              triggerReorder(proc.atribuicao, "delete", excluido.id);
            }
          })
          .catch(console.error);
      }

      return excluido;
    }),

  // Estatísticas
  // Mostra estatísticas apenas das demandas que o usuário tem acesso
  stats: protectedProcedure.query(async ({ ctx }) => {
    const defensoresVisiveis = getDefensoresVisiveis(ctx.user);
    
    // Construir condição base de acesso
    // SQL<unknown> is the common base type for all Drizzle conditions
    const baseConditions: SQL<unknown>[] = [isNull(demandas.deletedAt)];

    if (defensoresVisiveis !== "all") {
      if (defensoresVisiveis.length === 1) {
        baseConditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
      } else if (defensoresVisiveis.length > 1) {
        baseConditions.push(inArray(demandas.defensorId, defensoresVisiveis));
      }
    }

    const baseCondition = and(...baseConditions);

    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(baseCondition);
    
    const atender = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(and(baseCondition, eq(demandas.status, "2_ATENDER")));
    
    const fila = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(and(baseCondition, eq(demandas.status, "5_TRIAGEM")));
    
    const protocolados = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(and(baseCondition, eq(demandas.status, "7_PROTOCOLADO")));
    
    const reuPreso = await db
      .select({ count: sql<number>`count(*)` })
      .from(demandas)
      .where(and(baseCondition, eq(demandas.reuPreso, true)));
    
    return {
      total: Number(total[0]?.count || 0),
      atender: Number(atender[0]?.count || 0),
      fila: Number(fila[0]?.count || 0),
      protocolados: Number(protocolados[0]?.count || 0),
      reuPreso: Number(reuPreso[0]?.count || 0),
    };
  }),

  // Importar demandas do Google Sheets (bulk)
  // Faz upsert de assistido (por nome) e processo (por número), depois cria a demanda
  importFromSheets: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            assistido: z.string().min(1),
            processoNumero: z.string().optional(),
            ato: z.string().min(1),
            prazo: z.string().optional(),
            dataEntrada: z.string().optional(),
            // dataExpedicaoCompleta para verificação de duplicatas (inclui data+hora)
            // Formato: "YYYY-MM-DDTHH:mm:00" ou "DD/MM/YYYY HH:mm"
            dataExpedicaoCompleta: z.string().optional(),
            // dataInclusao para ordenação precisa (usado por SEEU/PJe)
            // Formato ISO com milissegundos: "2026-01-27T00:00:00.999"
            dataInclusao: z.string().optional(),
            status: z.string().optional(),
            estadoPrisional: z.string().optional(),
            providencias: z.string().optional(), // ignorado — coluna foi migrada para tabela "registros"
            atribuicao: z.string().optional(),
            // Rastreamento de importação
            importBatchId: z.string().optional(), // UUID do lote de importação
            ordemOriginal: z.number().optional(), // Posição original no texto colado
            // Match de assistido (PJe Import v2)
            assistidoMatchId: z.number().optional(), // ID do assistido já vinculado na revisão
            // PJe pass-through de dados (Fase 1)
            tipoDocumento: z.string().optional(), // Intimação, Sentença, Decisão, etc.
            crime: z.string().optional(), // Maus Tratos, Ameaça, etc.
            tipoProcesso: z.string().optional(), // MPUMPCrim, APOrd, etc.
            vara: z.string().optional(), // Vara de Violência Doméstica, etc.
            idDocumentoPje: z.string().optional(), // ID único do documento PJe
            atribuicaoDetectada: z.string().optional(), // Atribuição auto-detectada pelo parser
            // Audiência fields (PJe Import v2 audiência detection)
            audienciaData: z.string().optional(), // YYYY-MM-DD
            audienciaHora: z.string().optional(), // HH:MM
            audienciaTipo: z.string().optional(), // tipo da audiência
            criarEventoAgenda: z.boolean().optional(), // create calendar event
          })
        ),
        atualizarExistentes: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const defensorId = getDefensorResponsavel(ctx.user);

      // Mapeamento de status do frontend para enum do banco
      const STATUS_TO_DB: Record<string, string> = {
        "triagem": "5_TRIAGEM",
        "atender": "2_ATENDER",
        "analisar": "2_ATENDER",
        "elaborar": "2_ATENDER",
        "elaborando": "2_ATENDER",
        "buscar": "2_ATENDER",
        "revisar": "2_ATENDER",
        "revisando": "2_ATENDER",
        "relatorio": "2_ATENDER",
        "documentos": "2_ATENDER",
        "testemunhas": "2_ATENDER",
        "investigar": "2_ATENDER",
        "oficiar": "2_ATENDER",
        "monitorar": "4_MONITORAR",
        "protocolar": "5_TRIAGEM",
        "protocolado": "7_PROTOCOLADO",
        "ciencia": "7_CIENCIA",
        "sem_atuacao": "7_SEM_ATUACAO",
        "constituiu_advogado": "CONCLUIDO",
        "urgente": "URGENTE",
        "resolvido": "CONCLUIDO",
        "arquivado": "ARQUIVADO",
        // Delegação (tratados como em andamento/preparação)
        "amanda": "2_ATENDER",
        "emilly": "2_ATENDER",
        "taissa": "2_ATENDER",
        "estágio_-_taissa": "2_ATENDER",
        "estagio_-_taissa": "2_ATENDER",
      };

      // Mapeamento de atribuição para área do processo
      // Inclui tanto labels quanto values do frontend
      const ATRIBUICAO_TO_AREA: Record<string, string> = {
        // Labels (texto exibido)
        "Tribunal do Júri": "JURI",
        "Grupo Especial do Júri": "JURI",
        "Violência Doméstica": "VIOLENCIA_DOMESTICA",
        "Violência Doméstica - Camaçari": "VIOLENCIA_DOMESTICA",
        "Execução Penal": "EXECUCAO_PENAL",
        "Substituição Criminal": "SUBSTITUICAO",
        "Substituição Cível": "CIVEL",
        "Curadoria Especial": "CURADORIA",
        // Values (enum do frontend)
        "JURI_CAMACARI": "JURI",
        "GRUPO_JURI": "JURI",
        "VVD_CAMACARI": "VIOLENCIA_DOMESTICA",
        "EXECUCAO_PENAL": "EXECUCAO_PENAL",
        "SUBSTITUICAO": "SUBSTITUICAO",
        "SUBSTITUICAO_CIVEL": "CIVEL",
      };

      // Mapeamento de atribuição para enum do banco (processos.atribuicao)
      // Inclui tanto labels quanto values do frontend
      const ATRIBUICAO_TO_ENUM: Record<string, string> = {
        // Labels (texto exibido)
        "Tribunal do Júri": "JURI_CAMACARI",
        "Grupo Especial do Júri": "GRUPO_JURI",
        "Violência Doméstica": "VVD_CAMACARI",
        "Violência Doméstica - Camaçari": "VVD_CAMACARI",
        "Execução Penal": "EXECUCAO_PENAL",
        "Substituição Criminal": "SUBSTITUICAO",
        "Substituição Cível": "SUBSTITUICAO_CIVEL",
        "Curadoria Especial": "SUBSTITUICAO_CIVEL",
        // Values (enum do frontend) - passa direto
        "JURI_CAMACARI": "JURI_CAMACARI",
        "GRUPO_JURI": "GRUPO_JURI",
        "VVD_CAMACARI": "VVD_CAMACARI",
        "EXECUCAO_PENAL": "EXECUCAO_PENAL",
        "SUBSTITUICAO": "SUBSTITUICAO",
        "SUBSTITUICAO_CIVEL": "SUBSTITUICAO_CIVEL",
      };

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        assistidosSemSolar: 0, // Assistidos importados sem exportação ao Solar
      };

      // Rastrear IDs únicos dos assistidos envolvidos na importação
      const assistidoIdsImportados = new Set<number>();

      // IDs das demandas efetivamente criadas — usado para o push em lote à planilha
      const importedDemandaIds: number[] = [];

      for (const row of input.rows) {
        try {
          // Validar que assistido não é uma data serializada (bug Apps Script)
          const nomeAssistido = String(row.assistido ?? "").trim();
          const pareceData = (v: string) =>
            /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(v) || /^\d{4}-\d{2}-\d{2}T/.test(v);
          if (pareceData(nomeAssistido)) {
            results.errors.push(`${nomeAssistido}: nome do assistido parece ser uma data — ignorando`);
            results.skipped++;
            continue;
          }

          // Guard: ato não pode ser uma data serializada (bug Apps Script — causou incidente 2026-03-20)
          const atoRaw = String(row.ato ?? "").trim();
          if (pareceData(atoRaw)) {
            results.errors.push(`${nomeAssistido}: campo 'ato' parece ser uma data serializada ("${atoRaw.slice(0, 40)}…") — provável desalinhamento de colunas`);
            results.skipped++;
            continue;
          }

          // 1. Buscar ou criar assistido
          // Se assistidoMatchId disponível (PJe Import v2), buscar por ID direto
          let assistido;
          if (row.assistidoMatchId) {
            assistido = await db.query.assistidos.findFirst({
              where: and(
                eq(assistidos.id, row.assistidoMatchId),
                isNull(assistidos.deletedAt),
              ),
            });
          }

          // Fallback: buscar por nome (comportamento original)
          if (!assistido) {
            assistido = await db.query.assistidos.findFirst({
              where: and(
                ilike(assistidos.nome, row.assistido.trim()),
                isNull(assistidos.deletedAt),
              ),
            });
          }

          // Backfill: se assistido existente não tem atribuicaoPrimaria, preencher
          if (assistido && !assistido.atribuicaoPrimaria) {
            const targetAtribuicaoPrimariaBackfill = (ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""] || null);
            if (targetAtribuicaoPrimariaBackfill) {
              await db.update(assistidos)
                .set({ atribuicaoPrimaria: targetAtribuicaoPrimariaBackfill as typeof assistidos.atribuicaoPrimaria._.data })
                .where(eq(assistidos.id, assistido.id));
            }
          }

          if (!assistido) {
            const statusPrisional = row.estadoPrisional === "preso"
              ? "CADEIA_PUBLICA"
              : row.estadoPrisional === "monitorado"
                ? "MONITORADO"
                : "SOLTO";

            // Determinar atribuicaoPrimaria para o novo assistido
            const targetAtribuicaoPrimaria = (ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""] || "JURI_CAMACARI") as typeof assistidos.atribuicaoPrimaria._.data;

            const [newAssistido] = await db.insert(assistidos).values({
              nome: row.assistido.trim(),
              statusPrisional: statusPrisional as typeof assistidos.statusPrisional._.data,
              atribuicaoPrimaria: targetAtribuicaoPrimaria,
              defensorId: defensorId || ctx.user.id,
            }).returning();
            assistido = newAssistido;

            // Auto-create Drive folder for new assistido (fire-and-forget, don't block import)
            (async () => {
              try {
                const { isGoogleDriveConfigured, createOrFindAssistidoFolder, mapAtribuicaoToFolderKey } = await import(
                  "@/lib/services/google-drive"
                );
                if (!isGoogleDriveConfigured()) return;
                const folderKey = mapAtribuicaoToFolderKey(targetAtribuicaoPrimaria);
                if (!folderKey) return;
                const folder = await createOrFindAssistidoFolder(folderKey, newAssistido.nome);
                if (folder) {
                  await db.update(assistidos)
                    .set({ driveFolderId: folder.id, updatedAt: new Date() })
                    .where(eq(assistidos.id, newAssistido.id));
                }
              } catch (err) {
                console.error(`[import] Auto-create Drive folder failed for assistido ${newAssistido.id}:`, err);
              }
            })();
          }

          // Rastrear assistido para contagem Solar
          assistidoIdsImportados.add(assistido.id);

          // 2. Buscar ou criar processo por número
          // Guard: processoNumero deve ser CNJ válido (senão cai no fluxo "SN-<timestamp>").
          // Sem isso, valores como "Manifestação"/"Habeas Corpus" vazavam para numero_autos
          // quando colunas da planilha desalinhavam (incidente 2026-03-20).
          const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
          const processoNumeroRaw = row.processoNumero?.trim() || "";
          const processoNumero = CNJ_REGEX.test(processoNumeroRaw) ? processoNumeroRaw : "";
          if (processoNumeroRaw && !processoNumero) {
            results.errors.push(`${nomeAssistido}: processoNumero "${processoNumeroRaw}" não é CNJ válido — processo criado sem número`);
          }
          let processo;

          // Determinar área e atribuição com base no input
          // Se a atribuição não for encontrada no mapa, usa o valor original (pode já ser o enum)
          const inputAtribuicao = row.atribuicao || "";
          const targetArea = (ATRIBUICAO_TO_AREA[inputAtribuicao] || "JURI") as typeof processos.area._.data;
          const targetAtribuicao = (ATRIBUICAO_TO_ENUM[inputAtribuicao] || inputAtribuicao || "JURI_CAMACARI") as typeof processos.atribuicao._.data;

          // Map do prefixo PJe (MPUMPCrim/APOrd/LibProv/etc) → tipo interno.
          // LP cobre incidentes defensivos (Liberdade Provisória, Pedido de
          // Revogação) — diferente de CAUTELAR, que é tipicamente medida
          // restritiva da acusação. Cobre só casos explícitos; o resto cai
          // no default (AP) do schema.
          const mapPjeTipoToEnum = (raw?: string): string | null => {
            if (!raw) return null;
            const t = raw.trim();
            if (/^MPU/i.test(t) || /^MPCA$/i.test(t)) return "MPU";
            if (/^(AuPrFl|APFD)$/i.test(t)) return "APF";
            if (/^EP$/i.test(t)) return "EP";
            if (/^LibProv$/i.test(t)) return "LP";
            if (/^(CauInomCrim|PePrPr)$/i.test(t)) return "CAUTELAR";
            if (/^(APOrd|APSum|APri|PetCrim|Juri|InsanAc|VD)$/i.test(t)) return "AP";
            return null; // desconhecido: não força nada
          };
          const tipoProcessoEnum = mapPjeTipoToEnum(row.tipoProcesso);

          if (processoNumero) {
            processo = await db.query.processos.findFirst({
              where: and(
                eq(processos.numeroAutos, processoNumero),
                isNull(processos.deletedAt),
              ),
            });

            // Atualizar atribuição/área do processo existente. tipoProcesso
            // NUNCA é sobrescrito numa importação subsequente — o PJe envia
            // tipo POR INTIMAÇÃO (ex: "MPUMPCrim" para uma intimação de medida
            // protetiva dentro de uma Ação Penal), e o tipo do processo deve
            // refletir a classe processual canônica, não a última intimação.
            // Só populamos tipoProcesso se o processo ainda estiver no default
            // do schema (AP) E o PJe enviou um tipo novo reconhecido —
            // tratado como first-write, no INSERT abaixo.
            if (processo) {
              const needsAtribuicaoUpdate = processo.atribuicao !== targetAtribuicao;
              if (needsAtribuicaoUpdate) {
                const [updated] = await db.update(processos)
                  .set({ atribuicao: targetAtribuicao, area: targetArea, updatedAt: new Date() })
                  .where(eq(processos.id, processo.id))
                  .returning();
                processo = updated;
              }
            }
          }

          if (!processo) {
            const [newProcesso] = await db.insert(processos).values({
              assistidoId: assistido.id,
              numeroAutos: processoNumero || `SN-${Date.now()}-${results.imported}`,
              area: targetArea,
              atribuicao: targetAtribuicao,
              ...(tipoProcessoEnum ? { tipoProcesso: tipoProcessoEnum } : {}),
            }).returning();
            processo = newProcesso;
          }

          // 3. Converter datas primeiro (precisamos para verificar duplicata)
          const convertDate = (dateStr: string | undefined): string | null => {
            if (!dateStr || !dateStr.trim()) return null;
            const cleaned = dateStr.trim().replace(/\./g, "/");
            // Formato DD/MM/YY ou DD/MM/YYYY
            const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
            if (match) {
              const [, dia, mes, ano] = match;
              const anoFull = ano.length === 2 ? `20${ano}` : ano;
              return `${anoFull}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
            }
            // Formato YYYY-MM-DD (já está correto)
            const isoMatch = cleaned.match(/^\d{4}-\d{2}-\d{2}$/);
            if (isoMatch) return cleaned;
            return null;
          };

          // Converter data de entrada para usar na verificação de duplicata
          const dataEntradaConvertida = convertDate(row.dataEntrada);

          // 4. Verificar duplicata: mesmo processo + mesma data de expedição
          // Isso permite múltiplas demandas do mesmo processo para diferentes intimações
          // (ex: Resposta à Acusação vs Alegações Finais - datas diferentes)
          // Também busca em demandas dos últimos 30 dias para evitar duplicatas recentes
          let existingDemanda;

          // Extrair apenas a data (sem hora) da dataExpedicaoCompleta para comparação com o banco
          // O banco armazena apenas date, então precisamos comparar apenas a parte da data
          let dataExpedicaoParaBusca = dataEntradaConvertida;
          if (row.dataExpedicaoCompleta) {
            // Se tem dataExpedicaoCompleta (com hora), extrair apenas a data
            // Formatos possíveis: "YYYY-MM-DDTHH:mm:00" ou "DD/MM/YYYY HH:mm"
            if (row.dataExpedicaoCompleta.includes('T')) {
              dataExpedicaoParaBusca = row.dataExpedicaoCompleta.split('T')[0];
            } else if (row.dataExpedicaoCompleta.includes(' ')) {
              // Formato "DD/MM/YYYY HH:mm"
              const [dataParte] = row.dataExpedicaoCompleta.split(' ');
              dataExpedicaoParaBusca = convertDate(dataParte);
            } else {
              dataExpedicaoParaBusca = convertDate(row.dataExpedicaoCompleta);
            }
          }

          // Dedup 1 (mais confiável): match pelo ID do documento PJe (coluna
          // `pje_documento_id`, coberta por índice único parcial). Um mesmo
          // documento PJe reimportado SEMPRE refere-se à mesma intimação
          // lógica — evita duplicatas quando o parser detecta o ato de forma
          // diferente na segunda leitura.
          if (row.idDocumentoPje) {
            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                eq(demandas.pjeDocumentoId, row.idDocumentoPje),
                isNull(demandas.deletedAt),
              ),
            });
          }

          if (!existingDemanda && dataExpedicaoParaBusca) {
            // Dedup 2: processo + data de expedição (match clássico)
            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                eq(demandas.dataEntrada, dataExpedicaoParaBusca),
                isNull(demandas.deletedAt),
              ),
            });
          }

          // Fallback: verificar por processo + ato + mesma data de expedição
          // Sem a data, intimações diferentes do mesmo tipo (ex: Ciência em fev e Ciência em mar)
          // seriam tratadas como duplicata incorretamente
          if (!existingDemanda && row.ato && row.ato !== "Demanda importada") {
            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                eq(demandas.ato, row.ato),
                dataExpedicaoParaBusca
                  ? eq(demandas.dataEntrada, dataExpedicaoParaBusca)
                  : isNull(demandas.dataEntrada),
                isNull(demandas.deletedAt),
              ),
            });
          }

          // Fallback final: demandas recentes sem data no mesmo processo
          if (!existingDemanda && !dataExpedicaoParaBusca) {
            const trintaDiasAtras = new Date();
            trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                isNull(demandas.dataEntrada),
                gte(demandas.createdAt, trintaDiasAtras),
                isNull(demandas.deletedAt),
              ),
            });
          }

          // 5. Mapear status (normalizar para lowercase antes do lookup)
          const statusKey = (row.status || "triagem").toLowerCase().replace(/\s+/g, "_").trim();

          // Statuses de conclusão mantêm seu DB status; todos os demais são forçados
          // para "5_TRIAGEM" (coluna Triagem), independente do substatus escolhido.
          // O substatus (label granular: analisar, elaborar, revisar...) é preservado
          // para exibição — o usuário que move para Andamento quando quiser.
          const CONCLUIDA_IMPORT_KEYS = new Set([
            "protocolado", "ciencia", "sem_atuacao", "constituiu_advogado", "resolvido", "arquivado",
          ]);
          const dbStatus = CONCLUIDA_IMPORT_KEYS.has(statusKey)
            ? (STATUS_TO_DB[statusKey] || "5_TRIAGEM")
            : "5_TRIAGEM";

          const reuPreso = row.estadoPrisional === "preso";

          // Salvar substatus granular (elaborar, revisar, buscar, etc.) para display
          const substatus = (row.status || "triagem").toLowerCase().trim() || null;

          if (existingDemanda) {
            // Regra "última edição vence": se o usuário editou a demanda
            // manualmente (OMBUDS ou planilha) depois da última sincronização,
            // o reimport NÃO deve sobrescrever `ato/status/substatus/prazo/
            // providencias`. Apenas metadados de PJe (enrichmentData) e
            // `syncedAt` são atualizados, preservando o trabalho manual.
            const syncedAt: Date | null = (existingDemanda as any).syncedAt ?? null;
            const updatedAt: Date = (existingDemanda as any).updatedAt ?? new Date(0);
            const editadoManualmente = !syncedAt || updatedAt.getTime() > syncedAt.getTime() + 1000;

            if (input.atualizarExistentes && !editadoManualmente) {
              // Reimport autoritativo — usuário não tocou; pode atualizar tudo
              await db.update(demandas)
                .set({
                  ato: row.ato,
                  prazo: convertDate(row.prazo),
                  dataEntrada: convertDate(row.dataEntrada),
                  status: dbStatus as typeof demandas.status._.data,
                  substatus: substatus,
                  prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
                  reuPreso,
                  updatedAt: new Date(),
                  syncedAt: new Date(),
                })
                .where(eq(demandas.id, existingDemanda.id));
              results.updated++;
            } else {
              // Edição manual pendente OU flag desativada: preserva estado
              // manual; apenas garante que enrichmentData mais recente fique
              // salvo (útil para análise) e marca skipped.
              results.skipped++;
            }
            continue;
          }

          // 6. Criar demanda
          // createdAt = momento real da importação (para ordenar "mais novo primeiro")
          // ordemOriginal = posição no texto colado (para saber a ordem original do PJe)
          // importBatchId = UUID do lote (para agrupar demandas importadas juntas)
          // Data de expedição: preferir `dataExpedicaoCompleta` (com hora, extrai só a data)
          // e cair para `row.dataEntrada` quando ausente — mantém o campo preenchido para
          // exibição na planilha/cards.
          let dataExpedicaoDB: string | null = null;
          if (row.dataExpedicaoCompleta) {
            if (row.dataExpedicaoCompleta.includes("T")) {
              dataExpedicaoDB = row.dataExpedicaoCompleta.split("T")[0];
            } else if (row.dataExpedicaoCompleta.includes(" ")) {
              dataExpedicaoDB = convertDate(row.dataExpedicaoCompleta.split(" ")[0]);
            } else {
              dataExpedicaoDB = convertDate(row.dataExpedicaoCompleta);
            }
          } else if (row.dataEntrada) {
            dataExpedicaoDB = convertDate(row.dataEntrada);
          }

          const [insertedDemanda] = await db.insert(demandas).values({
            processoId: processo.id,
            assistidoId: assistido.id,
            ato: row.ato,
            pjeDocumentoId: row.idDocumentoPje || null, // protegido por índice único parcial
            syncedAt: new Date(), // marca estado inicial sincronizado para a regra "última edição vence"
            prazo: convertDate(row.prazo),
            dataEntrada: convertDate(row.dataEntrada),
            dataExpedicao: dataExpedicaoDB,
            status: dbStatus as typeof demandas.status._.data,
            substatus: substatus, // Status granular preservado
            prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
            reuPreso,
            defensorId: defensorId || ctx.user.id,
            importBatchId: row.importBatchId || null,
            ordemOriginal: row.ordemOriginal ?? null,
            // PJe pass-through: enrichmentData com dados extraídos do parser
            // TODO: define a proper EnrichmentData type and use $type<EnrichmentData>() on the column
            enrichmentData: (row.crime || row.tipoDocumento || row.tipoProcesso) ? {
              crime: row.crime || undefined,
              artigos: [],
              fase_processual: inferirFaseProcessual(row.tipoDocumento),
              tipo_documento_pje: row.tipoDocumento || undefined,
              tipo_processo: row.tipoProcesso || undefined,
              id_documento_pje: row.idDocumentoPje || undefined,
              vara: row.vara || undefined,
            } as Record<string, unknown> : undefined,
            // createdAt usa defaultNow() — momento real da importação
          }).returning();

          // Audit log da importação
          logAudit({
            userId: ctx.user.id,
            userName: ctx.user.name,
            entityType: "demanda",
            entityId: insertedDemanda.id,
            action: "import",
            metadata: { importBatchId: row.importBatchId, ato: row.ato, assistido: row.nomeAssistido },
          });

          // 7. Criar audiência quando a intimação é de audiência
          // Nota: NÃO criar calendar_event aqui — `audiencias` é a única fonte
          // de verdade para audiências; a UI da agenda mescla as duas tabelas e
          // criar nas duas gera duplicatas visíveis no calendário.
          const isAudienciaAto = row.ato === "Ciência designação de audiência" ||
            row.ato === "Ciência redesignação de audiência";

          if (isAudienciaAto && row.criarEventoAgenda && row.audienciaData && insertedDemanda) {
            try {
              const dataStr = row.audienciaData;
              const horaStr = row.audienciaHora || "09:00";
              const dataAudiencia = new Date(`${dataStr}T${horaStr}:00`);

              const tipoAud = row.audienciaTipo || "Instrução e Julgamento";
              const titulo = `${tipoAud} — ${row.assistido}`;

              await db.insert(audiencias).values({
                processoId: processo.id,
                assistidoId: assistido.id,
                dataAudiencia,
                tipo: tipoAud.toLowerCase().replace(/ e /g, "_").replace(/ /g, "_"),
                titulo,
                status: "agendada",
              });
            } catch (audienciaError) {
              console.error(`[import] Audiência creation failed for ${row.assistido}:`, audienciaError);
            }
          }

          results.imported++;
          importedDemandaIds.push(insertedDemanda.id);
        } catch (error) {
          results.errors.push(`${row.assistido}: ${(error as Error).message}`);
        }
      }

      // Sync Google Sheets (fire-and-forget) — push de cada demanda recém-criada.
      // Sem isso, o bulk import deixa as demandas invisíveis na planilha, em
      // contraste com demandas.create (que já sincroniza). Aplica a qualquer
      // atribuição (Júri, VVD, Execução Penal, etc.).
      if (importedDemandaIds.length > 0) {
        (async () => {
          const reorderAtribuicoes = new Set<string>();
          for (const id of importedDemandaIds) {
            try {
              const d = await buildDemandaSync(id);
              if (!d) continue;
              await sheetsPush(d);
              if (d.atribuicao) reorderAtribuicoes.add(d.atribuicao);
            } catch (err) {
              console.error(`[import] sheets push falhou para demanda ${id}:`, err);
            }
          }
          for (const atr of reorderAtribuicoes) {
            triggerReorder(atr, "import", undefined);
          }
        })().catch((err) => console.error("[import] sync planilha falhou:", err));
      }

      // Contar assistidos importados que não estão no Solar
      if (assistidoIdsImportados.size > 0) {
        const idsArray = Array.from(assistidoIdsImportados);
        const [semSolarResult] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(assistidos)
          .where(and(
            inArray(assistidos.id, idsArray),
            isNull(assistidos.solarExportadoEm),
            isNull(assistidos.deletedAt),
          ));
        results.assistidosSemSolar = semSolarResult?.count ?? 0;
      }

      return results;
    }),

  // Buscar assistidos por nome ou CPF (para autocomplete de vinculação)
  searchAssistidos: protectedProcedure
    .input(z.object({ search: z.string().min(1) }))
    .query(async ({ ctx, input }) => {

      const conditions = [
        isNull(assistidos.deletedAt),
        or(
          ilike(assistidos.nome, `%${input.search}%`),
          sql`${assistidos.cpf} ILIKE ${'%' + input.search + '%'}`
        ),
      ];

      const results = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          statusPrisional: assistidos.statusPrisional,
        })
        .from(assistidos)
        .where(and(...conditions))
        .limit(8);

      return results;
    }),

  // Buscar processos por número (para autocomplete de vinculação)
  reordenar: protectedProcedure
    .input(z.object({
      items: z.array(z.object({ id: z.number(), ordem: z.number() })),
    }))
    .mutation(async ({ input }) => {
      if (input.items.length === 0) return { success: true };

      // Single CASE WHEN UPDATE instead of N individual UPDATEs
      await withTransaction(async (tx) => {
        const ids = input.items.map(i => i.id);
        await tx.execute(sql`
          UPDATE demandas SET ordem_manual = CASE id
            ${sql.join(input.items.map(i => sql`WHEN ${i.id} THEN ${i.ordem}`), sql` `)}
          END
          WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
        `);
      });
      return { success: true };
    }),

  // Batch match de nomes com assistidos existentes (PJe Import v2)
  // Recebe array de nomes, retorna match result para cada um
  batchMatchAssistidos: protectedProcedure
    .input(z.object({
      nomes: z.array(z.string()).max(200),
    }))
    .query(async ({ ctx, input }) => {

      // 1. Buscar todos assistidos (1 query)
      const conditions: SQL<unknown>[] = [isNull(assistidos.deletedAt)];

      const todosAssistidos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          statusPrisional: assistidos.statusPrisional,
        })
        .from(assistidos)
        .where(and(...conditions));

      // 2. Pre-normalizar todos os nomes dos assistidos
      const assistidosNormalizados = todosAssistidos.map((a) => ({
        ...a,
        nomeNormalizado: normalizarNome(a.nome),
      }));

      // 3. Para cada nome da importação, encontrar melhor match
      return input.nomes.map((nome) => {
        const nomeNorm = normalizarNome(nome);
        let bestMatch: {
          type: "exact" | "similar" | "new";
          matchedId?: number;
          matchedNome?: string;
          matchedCpf?: string | null;
          statusPrisional?: string | null;
          similarity?: number;
        } = { type: "new" };
        let bestSimilarity = 0;

        for (const assistido of assistidosNormalizados) {
          const similarity = calcularSimilaridade(nomeNorm, assistido.nomeNormalizado);

          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;

            if (similarity >= 0.90) {
              bestMatch = {
                type: "exact",
                matchedId: assistido.id,
                matchedNome: assistido.nome,
                matchedCpf: assistido.cpf,
                statusPrisional: assistido.statusPrisional,
                similarity,
              };
            } else if (similarity >= 0.75) {
              bestMatch = {
                type: "similar",
                matchedId: assistido.id,
                matchedNome: assistido.nome,
                matchedCpf: assistido.cpf,
                statusPrisional: assistido.statusPrisional,
                similarity,
              };
            }
          }
        }

        return { nome, match: bestMatch };
      });
    }),

  searchProcessos: protectedProcedure
    .input(z.object({ search: z.string().min(1), assistidoId: z.number().optional() }))
    .query(async ({ ctx, input }) => {

      const conditions: SQL<unknown>[] = [
        isNull(processos.deletedAt),
        ilike(processos.numeroAutos, `%${input.search}%`),
      ];

      // Filtrar por assistido se fornecido
      if (input.assistidoId) {
        conditions.push(eq(processos.assistidoId, input.assistidoId));
      }

      const results = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          vara: processos.vara,
          area: processos.area,
        })
        .from(processos)
        .where(and(...conditions))
        .limit(8);

      return results;
    }),

  // Encontrar duplicatas: agrupa por processo + ato com COUNT >= 2
  findDuplicates: protectedProcedure.query(async ({ ctx }) => {
    const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

    // Passo 1: Encontrar grupos (processo_id, ato) com 2+ demandas
    const accessFilter = defensoresVisiveis === "all"
      ? isNull(demandas.deletedAt)
      : and(
          isNull(demandas.deletedAt),
          defensoresVisiveis.length === 1
            ? eq(demandas.defensorId, defensoresVisiveis[0])
            : inArray(demandas.defensorId, defensoresVisiveis),
        );

    const groups = await db
      .select({
        processoId: demandas.processoId,
        ato: demandas.ato,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(demandas)
      .where(accessFilter)
      .groupBy(demandas.processoId, demandas.ato)
      .having(sql`count(*) >= 2`)
      .orderBy(sql`count(*) desc`);

    if (groups.length === 0) return [];

    // Passo 2: Para cada grupo, buscar demandas completas com joins
    const result = [];
    for (const group of groups) {
      const groupDemandas = await db
        .select({
          id: demandas.id,
          status: demandas.status,
          substatus: demandas.substatus,
          ato: demandas.ato,
          dataEntrada: demandas.dataEntrada,
          prazo: demandas.prazo,
          reuPreso: demandas.reuPreso,
          prioridade: demandas.prioridade,
          createdAt: demandas.createdAt,
          updatedAt: demandas.updatedAt,
          processoNumero: processos.numeroAutos,
          assistidoNome: assistidos.nome,
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(
          and(
            eq(demandas.processoId, group.processoId),
            eq(demandas.ato, group.ato),
            isNull(demandas.deletedAt),
          )
        )
        .orderBy(desc(demandas.updatedAt));

      result.push({
        processoId: group.processoId,
        processoNumero: groupDemandas[0]?.processoNumero || "Sem número",
        assistidoNome: groupDemandas[0]?.assistidoNome || "Desconhecido",
        ato: group.ato,
        count: group.count,
        demandas: groupDemandas,
      });
    }

    return result;
  }),

  // Atualizar demandas em batch (status, substatus, ato, atribuição)
  batchUpdate: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      status: z.enum([
        "2_ATENDER", "4_MONITORAR", "5_TRIAGEM", "7_PROTOCOLADO",
        "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
      ]).optional(),
      substatus: z.string().optional(),
      ato: z.string().min(1).optional(),
      atribuicao: z.enum([
        "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
        "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { ids, ...data } = input;
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      if (!data.status && !data.ato && !data.atribuicao && !data.substatus) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe ao menos um campo para atualizar",
        });
      }

      // Build update payload
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.status) {
        updateData.status = data.status;
        if (data.status === "CONCLUIDO") {
          updateData.concluidoEm = new Date();
        }
      }
      if (data.substatus) {
        updateData.substatus = data.substatus;
      }
      if (data.ato) {
        updateData.ato = data.ato;
      }
      if (data.atribuicao) {
        updateData.atribuicao = data.atribuicao;
      }

      // Build access condition
      let accessCondition;
      if (defensoresVisiveis === "all") {
        accessCondition = and(
          inArray(demandas.id, ids),
          isNull(demandas.deletedAt),
        );
      } else if (defensoresVisiveis.length > 0) {
        accessCondition = and(
          inArray(demandas.id, ids),
          inArray(demandas.defensorId, defensoresVisiveis),
          isNull(demandas.deletedAt),
        );
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para atualizar demandas",
        });
      }

      const atualizados = await db
        .update(demandas)
        .set(updateData)
        .where(accessCondition)
        .returning({ id: demandas.id });

      // Sync updated demandas to Google Sheets (fire-and-forget)
      for (const row of atualizados) {
        buildDemandaSync(row.id).then((d) => {
          if (!d) return;
          sheetsPush(d).catch(console.error);
          triggerReorder(d.atribuicao, "bulk", row.id);
        }).catch(console.error);
      }

      return { updated: atualizados.length };
    }),

  // Reordenar planilha manualmente (sync imediato — bypass do debounce)
  reorderSheets: protectedProcedure
    .input(
      z
        .object({
          sheetName: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const { reorderAllSheets } = await import("@/lib/services/sheets-reorder");
      const result = await reorderAllSheets(input?.sheetName);
      return result;
    }),

  // Exportar demandas para Google Sheets
  exportToSheets: protectedProcedure
    .input(
      z.object({
        titulo: z.string().default("OMBUDS - Demandas"),
        filtros: z
          .object({
            atribuicao: z.string().optional(),
            status: z.string().optional(),
            search: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { titulo, filtros } = input;
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      // Verificar se Google está configurado
      const { getAccessToken, isGoogleDriveConfigured } = await import(
        "@/lib/services/google-drive"
      );
      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google não está conectado. Configure a integração em Configurações.",
        });
      }

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Não foi possível obter autorização do Google. Reconecte a conta.",
        });
      }

      // Montar condições de filtro
      const conditions = [isNull(demandas.deletedAt)];

      if (filtros?.search) {
        conditions.push(ilike(demandas.ato, `%${filtros.search}%`));
      }

      if (filtros?.status && filtros.status !== "all") {
        conditions.push(eq(demandas.status, filtros.status as typeof demandas.status._.data));
      }

      // Filtro por defensor (isolamento)
      if (defensoresVisiveis !== "all") {
        if (defensoresVisiveis.length === 1) {
          conditions.push(eq(demandas.defensorId, defensoresVisiveis[0]));
        } else if (defensoresVisiveis.length > 1) {
          conditions.push(inArray(demandas.defensorId, defensoresVisiveis));
        }
      }

      // Buscar demandas com dados relacionados (sem limit — exportação completa)
      let rows = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          dataEntrada: demandas.dataEntrada,
          status: demandas.status,
          substatus: demandas.substatus,
          processo: {
            numeroAutos: processos.numeroAutos,
            atribuicao: processos.atribuicao,
          },
          assistido: {
            nome: assistidos.nome,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(and(...conditions))
        .orderBy(sql`${demandas.createdAt} DESC`);

      // Filtro por atribuição (campo no processo)
      if (filtros?.atribuicao && filtros.atribuicao !== "all") {
        rows = rows.filter((r) => r.processo?.atribuicao === filtros.atribuicao);
      }

      // Helpers de formatação
      function formatDate(d: Date | string | null | undefined): string {
        if (!d) return "";
        const date = d instanceof Date ? d : new Date(d);
        if (isNaN(date.getTime())) return String(d);
        return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      }

      const STATUS_LABELS: Record<string, string> = {
        "5_triagem": "Triagem",
        "2_atender": "Atender",
        "4_monitorar": "Monitorar",
        "7_protocolado": "Protocolado",
        "7_ciencia": "Ciência",
        "7_sem_atuacao": "Sem atuação",
        concluido: "Concluído",
        arquivado: "Arquivado",
      };

      const ATRIBUICAO_LABELS: Record<string, string> = {
        JURI_CAMACARI: "Tribunal do Júri",
        GRUPO_JURI: "Grupo Especial de Júri",
        VVD_CAMACARI: "Violência Doméstica",
        EXECUCAO_PENAL: "Execução Penal",
        SUBSTITUICAO: "Substituição Criminal",
        SUBSTITUICAO_CIVEL: "Substituição Cível",
      };

      // Montar matriz de dados para o spreadsheet
      const headers = [
        "Status",
        "Assistido",
        "Processo",
        "Ato",
        "Prazo",
        "Data Entrada",
        "Providências",
        "Atribuição",
      ];

      const dataRows = rows.map((r) => [
        STATUS_LABELS[r.status?.toLowerCase() ?? ""] || r.substatus || r.status || "",
        r.assistido?.nome || "",
        r.processo?.numeroAutos || "",
        r.ato || "",
        formatDate(r.prazo),
        formatDate(r.dataEntrada),
        "",
        ATRIBUICAO_LABELS[r.processo?.atribuicao ?? ""] || r.processo?.atribuicao || "",
      ]);

      // --- Google Sheets API v4 via REST ---
      const sheetsBase = "https://sheets.googleapis.com/v4/spreadsheets";
      const authHeader = `Bearer ${accessToken}`;

      // 1. Criar spreadsheet
      const createRes = await fetch(sheetsBase, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: titulo },
          sheets: [
            {
              properties: {
                title: "Demandas",
                gridProperties: { frozenRowCount: 1 },
              },
            },
          ],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao criar planilha: ${err}`,
        });
      }

      const sheet = await createRes.json();
      const spreadsheetId: string = sheet.spreadsheetId;
      const sheetId: number = sheet.sheets[0].properties.sheetId;
      const spreadsheetUrl: string = sheet.spreadsheetUrl;

      // 2. Escrever dados (headers + rows)
      const allValues = [headers, ...dataRows];
      const range = `Demandas!A1:H${allValues.length}`;

      const updateRes = await fetch(
        `${sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ range, majorDimension: "ROWS", values: allValues }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao escrever dados: ${err}`,
        });
      }

      // 3. Formatar: negrito no header + fundo neutral-800 + texto branco + linhas alternadas
      const batchUpdateRes = await fetch(
        `${sheetsBase}/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              // Header: fundo escuro + texto branco + negrito
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.098, green: 0.098, blue: 0.11 },
                      textFormat: {
                        bold: true,
                        foregroundColor: { red: 1, green: 1, blue: 1 },
                        fontSize: 10,
                      },
                    },
                  },
                  fields: "userEnteredFormat(backgroundColor,textFormat)",
                },
              },
              // Linhas de dados pares: fundo neutral-50
              ...(dataRows.length > 0
                ? Array.from({ length: Math.ceil(dataRows.length / 2) }, (_, i) => ({
                    repeatCell: {
                      range: {
                        sheetId,
                        startRowIndex: 1 + i * 2,
                        endRowIndex: 2 + i * 2,
                        startColumnIndex: 0,
                        endColumnIndex: 8,
                      },
                      cell: {
                        userEnteredFormat: {
                          backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 },
                        },
                      },
                      fields: "userEnteredFormat(backgroundColor)",
                    },
                  }))
                : []),
              // Auto-resize todas as colunas
              {
                autoResizeDimensions: {
                  dimensions: {
                    sheetId,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 8,
                  },
                },
              },
            ],
          }),
        }
      );

      if (!batchUpdateRes.ok) {
        // Formatação falhou mas planilha foi criada — não é erro crítico
        console.warn("[exportToSheets] batchUpdate de formatação falhou:", await batchUpdateRes.text());
      }

      return {
        spreadsheetId,
        spreadsheetUrl,
        totalRows: dataRows.length,
      };
    }),

  // Excluir duplicatas em batch (soft delete)
  deleteBatch: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      // Aplicar controle de acesso
      let accessCondition;
      if (defensoresVisiveis === "all") {
        accessCondition = and(
          inArray(demandas.id, input.ids),
          isNull(demandas.deletedAt),
        );
      } else if (defensoresVisiveis.length > 0) {
        accessCondition = and(
          inArray(demandas.id, input.ids),
          inArray(demandas.defensorId, defensoresVisiveis),
          isNull(demandas.deletedAt),
        );
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para excluir demandas",
        });
      }

      const excluidos = await db
        .update(demandas)
        .set({ deletedAt: new Date() })
        .where(accessCondition)
        .returning({ id: demandas.id });

      return { deleted: excluidos.length };
    }),

  // Timeline unificada (audit_log + sync_log) de uma demanda, para observabilidade
  timeline: protectedProcedure
    .input(z.object({ demandaId: z.number() }))
    .query(async ({ input }) => {
      const audit = await db.execute(sql`
        SELECT id, user_name AS who, action, metadata, created_at
        FROM audit_logs
        WHERE entity_type = 'demanda' AND entity_id = ${input.demandaId}
        ORDER BY created_at DESC
        LIMIT 100
      `);
      const sync = await db.execute(sql`
        SELECT id, campo, valor_banco, valor_planilha, origem, conflito, created_at
        FROM sync_log
        WHERE demanda_id = ${input.demandaId}
        ORDER BY created_at DESC
        LIMIT 100
      `);
      return {
        audit: audit as unknown as Array<{
          id: number; who: string | null; action: string;
          metadata: Record<string, unknown> | null; created_at: Date;
        }>,
        sync: sync as unknown as Array<{
          id: number; campo: string; valor_banco: string | null;
          valor_planilha: string | null; origem: string;
          conflito: boolean; created_at: Date;
        }>,
      };
    }),
});
