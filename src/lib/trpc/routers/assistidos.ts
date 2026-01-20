import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { assistidos, processos, demandas, audiencias, documentos, movimentacoes, anotacoes } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

export const assistidosRouter = router({
  // Listar todos os assistidos
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusPrisional: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, statusPrisional, limit = 50, offset = 0 } = input || {};
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      // Construir condições
      const conditions = [isNull(assistidos.deletedAt)];
      
      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf || "", `%${search}%`)
          )!
        );
      }
      
      if (statusPrisional && statusPrisional !== "all") {
        conditions.push(eq(assistidos.statusPrisional, statusPrisional as any));
      }

      if (!isAdmin) {
        conditions.push(eq(assistidos.workspaceId, workspaceId));
      }
      
      const result = await db
        .select()
        .from(assistidos)
        .where(and(...conditions))
        .orderBy(desc(assistidos.createdAt))
        .limit(limit)
        .offset(offset);
      
      return result;
    }),

  // Buscar assistido por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const conditions = [eq(assistidos.id, input.id)];

      if (!isAdmin) {
        conditions.push(eq(assistidos.workspaceId, workspaceId));
      }

      const [assistido] = await db
        .select()
        .from(assistidos)
        .where(and(...conditions));
      
      return assistido || null;
    }),

  // Criar novo assistido
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).default("SOLTO"),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
        workspaceId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user, input.workspaceId);

      if (!workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Defina um workspace para criar o assistido.",
        });
      }

      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          nome: input.nome,
          cpf: input.cpf || null,
          rg: input.rg || null,
          nomeMae: input.nomeMae || null,
          nomePai: input.nomePai || null,
          dataNascimento: input.dataNascimento || null,
          naturalidade: input.naturalidade || null,
          nacionalidade: input.nacionalidade || "Brasileira",
          statusPrisional: input.statusPrisional,
          localPrisao: input.localPrisao || null,
          unidadePrisional: input.unidadePrisional || null,
          dataPrisao: input.dataPrisao || null,
          telefone: input.telefone || null,
          telefoneContato: input.telefoneContato || null,
          nomeContato: input.nomeContato || null,
          parentescoContato: input.parentescoContato || null,
          endereco: input.endereco || null,
          observacoes: input.observacoes || null,
          defensorId: input.defensorId || ctx.user.id,
          workspaceId,
        })
        .returning();
      
      return novoAssistido;
    }),

  // Atualizar assistido
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).optional(),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
        photoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      
      // Só incluir campos que foram enviados
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });
      
      const [atualizado] = await db
        .update(assistidos)
        .set(updateData)
        .where(
          isAdmin
            ? eq(assistidos.id, id)
            : and(eq(assistidos.id, id), eq(assistidos.workspaceId, workspaceId))
        )
        .returning();
      
      return atualizado;
    }),

  // Excluir assistido (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [excluido] = await db
        .update(assistidos)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? eq(assistidos.id, input.id)
            : and(eq(assistidos.id, input.id), eq(assistidos.workspaceId, workspaceId))
        )
        .returning();
      
      return excluido;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
    const baseConditions = [isNull(assistidos.deletedAt)];

    if (!isAdmin) {
      baseConditions.push(eq(assistidos.workspaceId, workspaceId));
    }

    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(and(...baseConditions));
    
    // Contagem por status prisional (presos)
    const presos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          ...baseConditions,
          or(
            eq(assistidos.statusPrisional, "CADEIA_PUBLICA"),
            eq(assistidos.statusPrisional, "PENITENCIARIA"),
            eq(assistidos.statusPrisional, "COP"),
            eq(assistidos.statusPrisional, "HOSPITAL_CUSTODIA")
          )
        )
      );
    
    // Contagem soltos
    const soltos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          ...baseConditions,
          or(
            eq(assistidos.statusPrisional, "SOLTO"),
            eq(assistidos.statusPrisional, "DOMICILIAR"),
            eq(assistidos.statusPrisional, "MONITORADO")
          )
        )
      );
    
    return {
      total: Number(total[0]?.count || 0),
      presos: Number(presos[0]?.count || 0),
      soltos: Number(soltos[0]?.count || 0),
    };
  }),

  // ==========================================
  // TIMELINE UNIFICADA DO ASSISTIDO
  // ==========================================
  listTimeline: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const assistidoScope = await db
        .select({ id: assistidos.id })
        .from(assistidos)
        .where(
          isAdmin
            ? eq(assistidos.id, input.assistidoId)
            : and(eq(assistidos.id, input.assistidoId), eq(assistidos.workspaceId, workspaceId))
        );

      if (assistidoScope.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado." });
      }

      const processosDoAssistido = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
        })
        .from(processos)
        .where(and(
          eq(processos.assistidoId, input.assistidoId),
          isNull(processos.deletedAt)
        ));

      const processoIds = processosDoAssistido.map((p) => p.id);
      const processoMap = processosDoAssistido.reduce<Record<number, string>>((acc, item) => {
        acc[item.id] = item.numeroAutos;
        return acc;
      }, {});

      const audienciasData = await db
        .select({
          id: audiencias.id,
          data: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          status: audiencias.status,
          local: audiencias.local,
          sala: audiencias.sala,
          processoId: audiencias.processoId,
        })
        .from(audiencias)
        .where(
          processoIds.length > 0
            ? or(
                eq(audiencias.assistidoId, input.assistidoId),
                inArray(audiencias.processoId, processoIds)
              )
            : eq(audiencias.assistidoId, input.assistidoId)
        );

      const demandasData = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          processoId: demandas.processoId,
        })
        .from(demandas)
        .where(and(
          eq(demandas.assistidoId, input.assistidoId),
          isNull(demandas.deletedAt)
        ));

      const anotacoesData = await db
        .select({
          id: anotacoes.id,
          conteudo: anotacoes.conteudo,
          tipo: anotacoes.tipo,
          createdAt: anotacoes.createdAt,
        })
        .from(anotacoes)
        .where(eq(anotacoes.assistidoId, input.assistidoId));

      const documentosData = await db
        .select({
          id: documentos.id,
          titulo: documentos.titulo,
          createdAt: documentos.createdAt,
          processoId: documentos.processoId,
        })
        .from(documentos)
        .where(
          processoIds.length > 0
            ? or(
                eq(documentos.assistidoId, input.assistidoId),
                inArray(documentos.processoId, processoIds)
              )
            : eq(documentos.assistidoId, input.assistidoId)
        );

      const movimentacoesData = processoIds.length
        ? await db
            .select({
              id: movimentacoes.id,
              data: movimentacoes.dataMovimentacao,
              descricao: movimentacoes.descricao,
              tipo: movimentacoes.tipo,
              processoId: movimentacoes.processoId,
            })
            .from(movimentacoes)
            .where(inArray(movimentacoes.processoId, processoIds))
        : [];

      const timeline = [
        ...audienciasData
          .filter((item) => item.data)
          .map((item) => ({
            id: `aud-${item.id}`,
            type: "audiencia",
            title: `Audiência ${item.tipo}`,
            description: [item.local, item.sala ? `Sala ${item.sala}` : null]
              .filter(Boolean)
              .join(" • "),
            date: item.data,
            processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
          })),
        ...demandasData
          .filter((item) => item.prazo)
          .map((item) => ({
            id: `dem-${item.id}`,
            type: "demanda",
            title: item.ato,
            description: `Status: ${item.status}`,
            date: item.prazo,
            processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
          })),
        ...anotacoesData.map((item) => ({
          id: `nota-${item.id}`,
          type: "nota",
          title: item.tipo === "providencia" ? "Providência" : "Nota da defesa",
          description: item.conteudo,
          date: item.createdAt,
        })),
        ...documentosData.map((item) => ({
          id: `doc-${item.id}`,
          type: "documento",
          title: item.titulo,
          description: "Documento anexado",
          date: item.createdAt,
          processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
        })),
        ...movimentacoesData.map((item) => ({
          id: `mov-${item.id}`,
          type: "movimentacao",
          title: item.descricao,
          description: item.tipo || "Movimentação processual",
          date: item.data,
          processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());

      return timeline;
    }),
});
