import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  documentoModelos,
  documentosGerados,
  processos,
  assistidos,
  casos,
  demandas,
  users
} from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createGoogleDoc } from "@/lib/services/google-drive";

// ==========================================
// VARIAVEIS PADRAO DISPONIVEIS
// ==========================================

export const VARIAVEIS_PADRAO = [
  // Assistido
  { nome: "NOME_ASSISTIDO", label: "Nome do Assistido", tipo: "auto" as const, origem: "assistido.nome", obrigatorio: false },
  { nome: "CPF_ASSISTIDO", label: "CPF do Assistido", tipo: "auto" as const, origem: "assistido.cpf", obrigatorio: false },
  { nome: "RG_ASSISTIDO", label: "RG do Assistido", tipo: "auto" as const, origem: "assistido.rg", obrigatorio: false },
  { nome: "ENDERECO_ASSISTIDO", label: "Endereco do Assistido", tipo: "auto" as const, origem: "assistido.endereco", obrigatorio: false },
  { nome: "TELEFONE_ASSISTIDO", label: "Telefone do Assistido", tipo: "auto" as const, origem: "assistido.telefone", obrigatorio: false },
  { nome: "NOME_MAE_ASSISTIDO", label: "Nome da Mae", tipo: "auto" as const, origem: "assistido.nomeMae", obrigatorio: false },
  { nome: "LOCAL_PRISAO", label: "Local de Prisao", tipo: "auto" as const, origem: "assistido.unidadePrisional", obrigatorio: false },

  // Processo
  { nome: "NUMERO_PROCESSO", label: "Numero do Processo", tipo: "auto" as const, origem: "processo.numeroAutos", obrigatorio: false },
  { nome: "COMARCA", label: "Comarca", tipo: "auto" as const, origem: "processo.comarca", obrigatorio: false },
  { nome: "VARA", label: "Vara", tipo: "auto" as const, origem: "processo.vara", obrigatorio: false },
  { nome: "CLASSE_PROCESSUAL", label: "Classe Processual", tipo: "auto" as const, origem: "processo.classeProcessual", obrigatorio: false },

  // Data
  { nome: "DATA_HOJE", label: "Data de Hoje", tipo: "auto" as const, origem: "system.dataHoje", obrigatorio: false },
  { nome: "DATA_EXTENSO", label: "Data por Extenso", tipo: "auto" as const, origem: "system.dataExtenso", obrigatorio: false },

  // Defensor
  { nome: "NOME_DEFENSOR", label: "Nome do Defensor", tipo: "auto" as const, origem: "user.name", obrigatorio: false },
];

// ==========================================
// FUNCOES AUXILIARES
// ==========================================

function substituirVariaveis(template: string, valores: Record<string, string>): string {
  let resultado = template;
  for (const [variavel, valor] of Object.entries(valores)) {
    const regex = new RegExp(`\\{\\{${variavel}\\}\\}`, "gi");
    resultado = resultado.replace(regex, valor || "");
  }
  return resultado;
}

function extrairVariaveis(template: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const matches = template.matchAll(regex);
  const variaveis = new Set<string>();
  for (const match of matches) {
    variaveis.add(match[1]);
  }
  return Array.from(variaveis);
}

// ==========================================
// ROUTER
// ==========================================

export const modelosRouter = router({
  // ==========================================
  // CRUD DE MODELOS
  // ==========================================

  /** Lista todos os modelos */
  list: protectedProcedure
    .input(z.object({
      categoria: z.string().optional(),
      tipoPeca: z.string().optional(),
      area: z.string().optional(),
      search: z.string().optional(),
      apenasAtivos: z.boolean().default(true),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const {
        categoria,
        tipoPeca,
        area,
        search,
        apenasAtivos = true,
        limit = 50,
        offset = 0
      } = input || {};

      const conditions = [];

      // Excluir deletados
      conditions.push(isNull(documentoModelos.deletedAt));

      // Apenas ativos
      if (apenasAtivos) {
        conditions.push(eq(documentoModelos.isAtivo, true));
      }

      // Filtro por categoria
      if (categoria && categoria !== "all") {
        conditions.push(eq(documentoModelos.categoria, categoria as any));
      }

      // Filtro por tipo de peca
      if (tipoPeca) {
        conditions.push(eq(documentoModelos.tipoPeca, tipoPeca));
      }

      // Filtro por area
      if (area && area !== "all") {
        conditions.push(eq(documentoModelos.area, area as any));
      }

      // Busca por titulo ou descricao
      if (search) {
        conditions.push(
          or(
            ilike(documentoModelos.titulo, `%${search}%`),
            ilike(documentoModelos.descricao, `%${search}%`)
          )
        );
      }

      const results = await db
        .select({
          id: documentoModelos.id,
          titulo: documentoModelos.titulo,
          descricao: documentoModelos.descricao,
          categoria: documentoModelos.categoria,
          tipoPeca: documentoModelos.tipoPeca,
          area: documentoModelos.area,
          tags: documentoModelos.tags,
          isPublic: documentoModelos.isPublic,
          isAtivo: documentoModelos.isAtivo,
          totalUsos: documentoModelos.totalUsos,
          createdAt: documentoModelos.createdAt,
          updatedAt: documentoModelos.updatedAt,
        })
        .from(documentoModelos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(documentoModelos.totalUsos), desc(documentoModelos.createdAt))
        .limit(limit)
        .offset(offset);

      // Contar total
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documentoModelos)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        modelos: results,
        total: countResult?.count || 0,
      };
    }),

  /** Busca modelo por ID */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [modelo] = await db
        .select()
        .from(documentoModelos)
        .where(and(
          eq(documentoModelos.id, input.id),
          isNull(documentoModelos.deletedAt)
        ));

      if (!modelo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modelo nao encontrado",
        });
      }

      return modelo;
    }),

  /** Cria novo modelo */
  create: protectedProcedure
    .input(z.object({
      titulo: z.string().min(1).max(200),
      descricao: z.string().optional(),
      categoria: z.enum([
        "PROVIDENCIA_ADMINISTRATIVA",
        "PROVIDENCIA_FUNCIONAL",
        "PROVIDENCIA_INSTITUCIONAL",
        "PECA_PROCESSUAL",
        "COMUNICACAO",
        "OUTRO"
      ]),
      conteudo: z.string().min(1),
      tipoPeca: z.string().optional(),
      area: z.enum(["JURI", "EXECUCAO_PENAL", "VD", "CRIMINAL_GERAL", "CURADORIA", "CIVEL"]).optional(),
      variaveis: z.array(z.object({
        nome: z.string(),
        label: z.string(),
        tipo: z.enum(["texto", "data", "numero", "selecao", "auto"]),
        obrigatorio: z.boolean(),
        valorPadrao: z.string().optional(),
        opcoes: z.array(z.string()).optional(),
        origem: z.string().optional(),
      })).optional(),
      formatacao: z.object({
        fonte: z.string().optional(),
        tamanhoFonte: z.number().optional(),
        margens: z.object({
          top: z.number(),
          bottom: z.number(),
          left: z.number(),
          right: z.number(),
        }).optional(),
        espacamento: z.number().optional(),
        cabecalho: z.string().optional(),
        rodape: z.string().optional(),
      }).optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const [modelo] = await db
        .insert(documentoModelos)
        .values({
          titulo: input.titulo,
          descricao: input.descricao,
          categoria: input.categoria,
          conteudo: input.conteudo,
          tipoPeca: input.tipoPeca,
          area: input.area,
          variaveis: input.variaveis,
          formatacao: input.formatacao,
          tags: input.tags,
          isPublic: input.isPublic,
          createdById: ctx.user.id,
        })
        .returning();

      return modelo;
    }),

  /** Atualiza modelo */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(200).optional(),
      descricao: z.string().optional(),
      categoria: z.enum([
        "PROVIDENCIA_ADMINISTRATIVA",
        "PROVIDENCIA_FUNCIONAL",
        "PROVIDENCIA_INSTITUCIONAL",
        "PECA_PROCESSUAL",
        "COMUNICACAO",
        "OUTRO"
      ]).optional(),
      conteudo: z.string().min(1).optional(),
      tipoPeca: z.string().optional(),
      area: z.enum(["JURI", "EXECUCAO_PENAL", "VD", "CRIMINAL_GERAL", "CURADORIA", "CIVEL"]).optional().nullable(),
      variaveis: z.array(z.object({
        nome: z.string(),
        label: z.string(),
        tipo: z.enum(["texto", "data", "numero", "selecao", "auto"]),
        obrigatorio: z.boolean(),
        valorPadrao: z.string().optional(),
        opcoes: z.array(z.string()).optional(),
        origem: z.string().optional(),
      })).optional(),
      formatacao: z.object({
        fonte: z.string().optional(),
        tamanhoFonte: z.number().optional(),
        margens: z.object({
          top: z.number(),
          bottom: z.number(),
          left: z.number(),
          right: z.number(),
        }).optional(),
        espacamento: z.number().optional(),
        cabecalho: z.string().optional(),
        rodape: z.string().optional(),
      }).optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
      isAtivo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [modelo] = await db
        .update(documentoModelos)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(documentoModelos.id, id))
        .returning();

      if (!modelo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modelo nao encontrado",
        });
      }

      return modelo;
    }),

  /** Remove modelo (soft delete) */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [modelo] = await db
        .update(documentoModelos)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(documentoModelos.id, input.id))
        .returning();

      if (!modelo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modelo nao encontrado",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // GERACAO DE DOCUMENTOS
  // ==========================================

  /** Auto-preenche variaveis baseado em assistido/processo */
  autoPreencherVariaveis: protectedProcedure
    .input(z.object({
      assistidoId: z.number().optional(),
      processoId: z.number().optional(),
      casoId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const valores: Record<string, string> = {};

      // Dados do sistema
      const hoje = new Date();
      valores["DATA_HOJE"] = hoje.toLocaleDateString("pt-BR");
      valores["DATA_EXTENSO"] = hoje.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // Nome do defensor
      valores["NOME_DEFENSOR"] = ctx.user.name || "";

      // Buscar assistido
      if (input.assistidoId) {
        const [assistido] = await db
          .select()
          .from(assistidos)
          .where(eq(assistidos.id, input.assistidoId));

        if (assistido) {
          valores["NOME_ASSISTIDO"] = assistido.nome || "";
          valores["CPF_ASSISTIDO"] = assistido.cpf || "";
          valores["RG_ASSISTIDO"] = assistido.rg || "";
          valores["ENDERECO_ASSISTIDO"] = assistido.endereco || "";
          valores["TELEFONE_ASSISTIDO"] = assistido.telefone || "";
          valores["NOME_MAE_ASSISTIDO"] = assistido.nomeMae || "";
          valores["LOCAL_PRISAO"] = assistido.unidadePrisional || "";
        }
      }

      // Buscar processo
      if (input.processoId) {
        const [processo] = await db
          .select()
          .from(processos)
          .where(eq(processos.id, input.processoId));

        if (processo) {
          valores["NUMERO_PROCESSO"] = processo.numeroAutos || "";
          valores["COMARCA"] = processo.comarca || "";
          valores["VARA"] = processo.vara || "";
          valores["CLASSE_PROCESSUAL"] = processo.classeProcessual || "";
        }
      }

      return valores;
    }),

  /** Gera documento a partir de modelo */
  gerarDocumento: protectedProcedure
    .input(z.object({
      modeloId: z.number(),
      valoresVariaveis: z.record(z.string()),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      demandaId: z.number().optional(),
      casoId: z.number().optional(),
      titulo: z.string().optional(),
      exportarGoogleDocs: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Buscar modelo
      const [modelo] = await db
        .select()
        .from(documentoModelos)
        .where(eq(documentoModelos.id, input.modeloId));

      if (!modelo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Modelo nao encontrado",
        });
      }

      // Substituir variaveis
      const conteudoFinal = substituirVariaveis(modelo.conteudo, input.valoresVariaveis);
      const tituloFinal = input.titulo || `${modelo.titulo} - ${new Date().toLocaleDateString("pt-BR")}`;

      // Exportar para Google Docs se solicitado
      let googleDocId: string | null = null;
      let googleDocUrl: string | null = null;

      if (input.exportarGoogleDocs) {
        try {
          const docResult = await createGoogleDoc(tituloFinal, conteudoFinal);
          if (docResult) {
            googleDocId = docResult.docId;
            googleDocUrl = docResult.docUrl;
          }
        } catch (error) {
          console.error("Erro ao exportar para Google Docs:", error);
          // Continuar mesmo se falhar a exportacao
        }
      }

      // Salvar documento gerado
      const [documento] = await db
        .insert(documentosGerados)
        .values({
          modeloId: input.modeloId,
          processoId: input.processoId,
          assistidoId: input.assistidoId,
          demandaId: input.demandaId,
          casoId: input.casoId,
          titulo: tituloFinal,
          conteudoFinal,
          valoresVariaveis: input.valoresVariaveis,
          geradoPorIA: false,
          googleDocId,
          googleDocUrl,
          createdById: ctx.user.id,
        })
        .returning();

      // Incrementar contador de uso do modelo
      await db
        .update(documentoModelos)
        .set({
          totalUsos: sql`${documentoModelos.totalUsos} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(documentoModelos.id, input.modeloId));

      return documento;
    }),

  // ==========================================
  // HISTORICO
  // ==========================================

  /** Lista documentos gerados */
  documentosGerados: protectedProcedure
    .input(z.object({
      modeloId: z.number().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const { modeloId, processoId, assistidoId, limit = 50 } = input || {};

      const conditions = [];

      if (modeloId) {
        conditions.push(eq(documentosGerados.modeloId, modeloId));
      }

      if (processoId) {
        conditions.push(eq(documentosGerados.processoId, processoId));
      }

      if (assistidoId) {
        conditions.push(eq(documentosGerados.assistidoId, assistidoId));
      }

      const results = await db
        .select({
          id: documentosGerados.id,
          titulo: documentosGerados.titulo,
          modeloId: documentosGerados.modeloId,
          processoId: documentosGerados.processoId,
          assistidoId: documentosGerados.assistidoId,
          geradoPorIA: documentosGerados.geradoPorIA,
          googleDocUrl: documentosGerados.googleDocUrl,
          createdAt: documentosGerados.createdAt,
        })
        .from(documentosGerados)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(documentosGerados.createdAt))
        .limit(limit);

      return results;
    }),

  /** Busca documento gerado por ID */
  getDocumentoGerado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [documento] = await db
        .select()
        .from(documentosGerados)
        .where(eq(documentosGerados.id, input.id));

      if (!documento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documento nao encontrado",
        });
      }

      return documento;
    }),

  // ==========================================
  // ESTATISTICAS
  // ==========================================

  /** Estatisticas de uso dos modelos */
  stats: protectedProcedure.query(async ({ ctx }) => {
    // Total de modelos
    const [totalModelos] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentoModelos)
      .where(and(
        isNull(documentoModelos.deletedAt),
        eq(documentoModelos.isAtivo, true)
      ));

    // Total de documentos gerados
    const [totalGerados] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentosGerados);

    // Modelos mais usados
    const maisUsados = await db
      .select({
        id: documentoModelos.id,
        titulo: documentoModelos.titulo,
        categoria: documentoModelos.categoria,
        totalUsos: documentoModelos.totalUsos,
      })
      .from(documentoModelos)
      .where(and(
        isNull(documentoModelos.deletedAt),
        eq(documentoModelos.isAtivo, true)
      ))
      .orderBy(desc(documentoModelos.totalUsos))
      .limit(5);

    // Contagem por categoria
    const porCategoria = await db
      .select({
        categoria: documentoModelos.categoria,
        count: sql<number>`count(*)::int`,
      })
      .from(documentoModelos)
      .where(and(
        isNull(documentoModelos.deletedAt),
        eq(documentoModelos.isAtivo, true)
      ))
      .groupBy(documentoModelos.categoria);

    return {
      totalModelos: totalModelos?.count || 0,
      totalGerados: totalGerados?.count || 0,
      maisUsados,
      porCategoria,
    };
  }),

  /** Retorna variaveis padrao disponiveis */
  variaveisPadrao: protectedProcedure.query(() => {
    return VARIAVEIS_PADRAO;
  }),
});
