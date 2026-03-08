import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, lte, gte, and, inArray, isNull, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, getDefensorResponsavel, getDefensoresVisiveis } from "../workspace";
import { normalizarNome, calcularSimilaridade } from "@/lib/pje-parser";

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
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, status, area, reuPreso, defensorId, limit = 50, offset = 0 } = input || {};
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
        conditions.push(eq(demandas.status, status as any));
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
      
      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          dataEntrada: demandas.dataEntrada,
          status: demandas.status,
          substatus: demandas.substatus,
          prioridade: demandas.prioridade,
          providencias: demandas.providencias,
          reuPreso: demandas.reuPreso,
          processoId: demandas.processoId,
          assistidoId: demandas.assistidoId,
          defensorId: demandas.defensorId,
          ordemManual: demandas.ordemManual,
          importBatchId: demandas.importBatchId,
          ordemOriginal: demandas.ordemOriginal,
          createdAt: demandas.createdAt,
          updatedAt: demandas.updatedAt,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            area: processos.area,
            atribuicao: processos.atribuicao,
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
        .orderBy(sql`${demandas.createdAt} DESC, ${demandas.ordemManual} ASC NULLS LAST, ${demandas.prazo} ASC NULLS LAST`)
        .limit(limit)
        .offset(offset);

      return result;
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
          providencias: demandas.providencias,
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
          eq(demandas.status, "5_FILA"),
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
          "2_ATENDER", "4_MONITORAR", "5_FILA", "7_PROTOCOLADO", 
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).default("5_FILA"),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).default("NORMAL"),
        providencias: z.string().optional(),
        reuPreso: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const defensorId = getDefensorResponsavel(ctx.user);
      const { workspaceId } = getWorkspaceScope(ctx.user);
      
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
      const [novaDemanda] = await db
        .insert(demandas)
        .values({
          ...input,
          prazo: input.prazo || null,
          dataEntrada: input.dataEntrada || null,
          defensorId: defensorId || ctx.user.id, // Defensor responsável pela demanda
          workspaceId: workspaceId, // Workspace opcional para compatibilidade
        })
        .returning();
      
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
          "2_ATENDER", "4_MONITORAR", "5_FILA", "7_PROTOCOLADO",
          "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
        ]).optional(),
        substatus: z.string().max(50).optional().nullable(),
        prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE", "REU_PRESO"]).optional(),
        providencias: z.string().optional(),
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
      const { id, atribuicao, assistidoNome, processoNumero, assistidoId: newAssistidoId, processoId: newProcessoId, ...data } = input;
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      const updateData: any = {
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
            atribuicao: atribuicao as any,
            area: (ATRIBUICAO_TO_AREA[atribuicao] || "JURI") as any,
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
      
      return excluido;
    }),

  // Estatísticas
  // Mostra estatísticas apenas das demandas que o usuário tem acesso
  stats: protectedProcedure.query(async ({ ctx }) => {
    const defensoresVisiveis = getDefensoresVisiveis(ctx.user);
    
    // Construir condição base de acesso
    let baseConditions: any[] = [isNull(demandas.deletedAt)];
    
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
      .where(and(baseCondition, eq(demandas.status, "5_FILA")));
    
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
            providencias: z.string().optional(),
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
          })
        ),
        atualizarExistentes: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const defensorId = getDefensorResponsavel(ctx.user);
      const { workspaceId } = getWorkspaceScope(ctx.user);

      // Mapeamento de status do frontend para enum do banco
      const STATUS_TO_DB: Record<string, string> = {
        "fila": "5_FILA",
        "atender": "2_ATENDER",
        "analisar": "2_ATENDER",
        "elaborar": "2_ATENDER",
        "elaborando": "2_ATENDER",
        "buscar": "2_ATENDER",
        "revisar": "2_ATENDER",
        "monitorar": "4_MONITORAR",
        "protocolar": "5_FILA",
        "protocolado": "7_PROTOCOLADO",
        "urgente": "URGENTE",
        "resolvido": "CONCLUIDO",
        "arquivado": "ARQUIVADO",
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

      for (const row of input.rows) {
        try {
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
                .set({ atribuicaoPrimaria: targetAtribuicaoPrimariaBackfill as any })
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
            const targetAtribuicaoPrimaria = (ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""] || "JURI_CAMACARI") as any;

            const [newAssistido] = await db.insert(assistidos).values({
              nome: row.assistido.trim(),
              statusPrisional: statusPrisional as any,
              atribuicaoPrimaria: targetAtribuicaoPrimaria,
              defensorId: defensorId || ctx.user.id,
              workspaceId: workspaceId,
            }).returning();
            assistido = newAssistido;

            // TODO: auto-create Drive folder for new assistido
            // ensureDriveFolderForAssistido(newAssistido.id, newAssistido.nome, targetAtribuicaoPrimaria)
          }

          // Rastrear assistido para contagem Solar
          assistidoIdsImportados.add(assistido.id);

          // 2. Buscar ou criar processo por número
          const processoNumero = row.processoNumero?.trim() || "";
          let processo;

          // Determinar área e atribuição com base no input
          // Se a atribuição não for encontrada no mapa, usa o valor original (pode já ser o enum)
          const inputAtribuicao = row.atribuicao || "";
          const targetArea = (ATRIBUICAO_TO_AREA[inputAtribuicao] || "JURI") as any;
          const targetAtribuicao = (ATRIBUICAO_TO_ENUM[inputAtribuicao] || inputAtribuicao || "JURI_CAMACARI") as any;

          if (processoNumero) {
            processo = await db.query.processos.findFirst({
              where: and(
                eq(processos.numeroAutos, processoNumero),
                isNull(processos.deletedAt),
              ),
            });

            // Atualizar atribuição/área do processo existente se necessário
            if (processo && processo.atribuicao !== targetAtribuicao) {
              const [updated] = await db.update(processos)
                .set({ atribuicao: targetAtribuicao, area: targetArea, updatedAt: new Date() })
                .where(eq(processos.id, processo.id))
                .returning();
              processo = updated;
            }
          }

          if (!processo) {
            const [newProcesso] = await db.insert(processos).values({
              assistidoId: assistido.id,
              numeroAutos: processoNumero || `SN-${Date.now()}-${results.imported}`,
              area: targetArea,
              atribuicao: targetAtribuicao,
              workspaceId: assistido.workspaceId,
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

          if (dataExpedicaoParaBusca) {
            // Se tem data de expedição, verificar por processo + data
            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                eq(demandas.dataEntrada, dataExpedicaoParaBusca),
                isNull(demandas.deletedAt),
              ),
            });
          }

          // Fallback: verificar por processo + ato (mesmo ato no mesmo processo = provável duplicata)
          if (!existingDemanda && row.ato && row.ato !== "Demanda importada") {
            existingDemanda = await db.query.demandas.findFirst({
              where: and(
                eq(demandas.processoId, processo.id),
                eq(demandas.ato, row.ato),
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

          // 5. Mapear status
          const dbStatus = STATUS_TO_DB[row.status || "fila"] || "5_FILA";
          const reuPreso = row.estadoPrisional === "preso";

          // Salvar substatus granular (elaborar, revisar, buscar, etc.) para display
          const substatus = row.status?.toLowerCase().trim() || null;

          if (existingDemanda) {
            // Se atualizarExistentes está ativo, atualizar a demanda existente
            if (input.atualizarExistentes) {
              await db.update(demandas)
                .set({
                  ato: row.ato, // Atualizar o ato também (pode mudar de Ciência para Manifestação)
                  prazo: convertDate(row.prazo),
                  dataEntrada: convertDate(row.dataEntrada),
                  status: dbStatus as any,
                  substatus: substatus,
                  prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
                  reuPreso,
                  providencias: row.providencias || null,
                  updatedAt: new Date(),
                })
                .where(eq(demandas.id, existingDemanda.id));
              results.updated++;
            } else {
              results.skipped++;
            }
            continue;
          }

          // 6. Criar demanda
          // createdAt = momento real da importação (para ordenar "mais novo primeiro")
          // ordemOriginal = posição no texto colado (para saber a ordem original do PJe)
          // importBatchId = UUID do lote (para agrupar demandas importadas juntas)
          await db.insert(demandas).values({
            processoId: processo.id,
            assistidoId: assistido.id,
            ato: row.ato,
            prazo: convertDate(row.prazo),
            dataEntrada: convertDate(row.dataEntrada),
            status: dbStatus as any,
            substatus: substatus, // Status granular preservado
            prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
            reuPreso,
            providencias: row.providencias || null,
            defensorId: defensorId || ctx.user.id,
            workspaceId: workspaceId,
            importBatchId: row.importBatchId || null,
            ordemOriginal: row.ordemOriginal ?? null,
            // PJe pass-through: enrichmentData com dados extraídos do parser
            enrichmentData: (row.crime || row.tipoDocumento || row.tipoProcesso) ? {
              crime: row.crime || undefined,
              artigos: [],
              fase_processual: inferirFaseProcessual(row.tipoDocumento),
              tipo_documento_pje: row.tipoDocumento || undefined,
              tipo_processo: row.tipoProcesso || undefined,
              id_documento_pje: row.idDocumentoPje || undefined,
              vara: row.vara || undefined,
            } as any : undefined,
            // createdAt usa defaultNow() — momento real da importação
          }).returning();

          results.imported++;
        } catch (error) {
          results.errors.push(`${row.assistido}: ${(error as Error).message}`);
          results.skipped++;
        }
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
      const { workspaceId } = getWorkspaceScope(ctx.user);

      const conditions = [
        isNull(assistidos.deletedAt),
        or(
          ilike(assistidos.nome, `%${input.search}%`),
          sql`${assistidos.cpf} ILIKE ${'%' + input.search + '%'}`
        ),
      ];

      // Filtrar por workspace se disponível
      if (workspaceId) {
        conditions.push(eq(assistidos.workspaceId, workspaceId));
      }

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
      const { workspaceId } = getWorkspaceScope(ctx.user);

      // 1. Buscar todos assistidos do workspace (1 query)
      const conditions: any[] = [isNull(assistidos.deletedAt)];
      if (workspaceId) {
        conditions.push(eq(assistidos.workspaceId, workspaceId));
      }

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
      const { workspaceId } = getWorkspaceScope(ctx.user);

      const conditions: any[] = [
        isNull(processos.deletedAt),
        ilike(processos.numeroAutos, `%${input.search}%`),
      ];

      // Filtrar por assistido se fornecido
      if (input.assistidoId) {
        conditions.push(eq(processos.assistidoId, input.assistidoId));
      }

      // Filtrar por workspace se disponível
      if (workspaceId) {
        conditions.push(eq(processos.workspaceId, workspaceId));
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
          providencias: demandas.providencias,
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

  // Atualizar demandas em batch (status e/ou ato)
  batchUpdate: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      status: z.enum([
        "2_ATENDER", "4_MONITORAR", "5_FILA", "7_PROTOCOLADO",
        "7_CIENCIA", "7_SEM_ATUACAO", "URGENTE", "CONCLUIDO", "ARQUIVADO"
      ]).optional(),
      ato: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { ids, ...data } = input;
      const defensoresVisiveis = getDefensoresVisiveis(ctx.user);

      if (!data.status && !data.ato) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Informe ao menos status ou ato para atualizar",
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
      if (data.ato) {
        updateData.ato = data.ato;
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

      return { updated: atualizados.length };
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
});
