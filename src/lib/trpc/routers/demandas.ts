import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, processos, assistidos, users } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, lte, gte, and, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, getDefensorResponsavel, getDefensoresVisiveis } from "../workspace";

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
          createdAt: demandas.createdAt,
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
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`${demandas.ordemManual} ASC NULLS LAST, ${demandas.prazo} ASC NULLS LAST`)
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

      const [demanda] = await db
        .select()
        .from(demandas)
        .where(and(...conditions));
      
      return demanda || null;
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
      };

      for (const row of input.rows) {
        try {
          // 1. Buscar ou criar assistido por nome
          let assistido = await db.query.assistidos.findFirst({
            where: and(
              ilike(assistidos.nome, row.assistido.trim()),
              isNull(assistidos.deletedAt),
            ),
          });

          if (!assistido) {
            const statusPrisional = row.estadoPrisional === "preso"
              ? "CADEIA_PUBLICA"
              : row.estadoPrisional === "monitorado"
                ? "MONITORADO"
                : "SOLTO";

            const [newAssistido] = await db.insert(assistidos).values({
              nome: row.assistido.trim(),
              statusPrisional: statusPrisional as any,
              defensorId: defensorId || ctx.user.id,
              workspaceId: workspaceId,
            }).returning();
            assistido = newAssistido;
          }

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
          } else {
            // Se não tem data, verificar demandas recentes (últimos 30 dias)
            // do mesmo processo que também não têm data de entrada
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
          // Se dataInclusao foi fornecida (para ordenação precisa do SEEU/PJe), usá-la como createdAt
          const createdAtValue = row.dataInclusao ? new Date(row.dataInclusao) : new Date();

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
            createdAt: createdAtValue, // Usa dataInclusao se fornecida para ordenação precisa
          }).returning();

          results.imported++;
        } catch (error) {
          results.errors.push(`${row.assistido}: ${(error as Error).message}`);
          results.skipped++;
        }
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
      for (const item of input.items) {
        await db
          .update(demandas)
          .set({ ordemManual: item.ordem })
          .where(eq(demandas.id, item.id));
      }
      return { success: true };
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
});
