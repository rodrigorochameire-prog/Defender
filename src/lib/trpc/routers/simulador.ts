import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  simulacoes3d,
  simulacaoPersonagens,
  simulacaoObjetos,
  simulacaoVersoes,
  simulacaoKeyframes,
  simulacaoExportacoes,
  simulacaoAssets,
  casos,
  casePersonas,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resolveWorkspaceId } from "../workspace";

// ==========================================
// SCHEMAS DE VALIDAÇÃO
// ==========================================

const cenaDataSchema = z.object({
  cenario: z.object({
    modeloUrl: z.string(),
    nome: z.string(),
    posicao: z.tuple([z.number(), z.number(), z.number()]),
    rotacao: z.tuple([z.number(), z.number(), z.number()]),
    escala: z.tuple([z.number(), z.number(), z.number()]),
  }),
  iluminacao: z.object({
    ambiente: z.object({ cor: z.string(), intensidade: z.number() }),
    direcional: z.object({
      cor: z.string(),
      intensidade: z.number(),
      posicao: z.tuple([z.number(), z.number(), z.number()]),
    }),
    sombras: z.boolean(),
  }),
  cameras: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    tipo: z.enum(["perspective", "orthographic"]),
    posicao: z.tuple([z.number(), z.number(), z.number()]),
    alvo: z.tuple([z.number(), z.number(), z.number()]),
    fov: z.number().optional(),
  })),
  configuracoes: z.object({
    gridVisivel: z.boolean(),
    eixosVisiveis: z.boolean(),
    qualidade: z.enum(["baixa", "media", "alta"]),
  }),
});

const createSimulacaoSchema = z.object({
  casoId: z.number(),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  cenaData: cenaDataSchema.optional(),
});

const updateSimulacaoSchema = createSimulacaoSchema.partial().extend({
  id: z.number(),
  status: z.enum(["RASCUNHO", "PRONTO", "APRESENTADO", "ARQUIVADO"]).optional(),
  thumbnail: z.string().optional(),
});

const createPersonagemSchema = z.object({
  simulacaoId: z.number(),
  nome: z.string().min(1),
  papel: z.enum(["vitima", "reu", "testemunha", "agressor", "policial", "outro"]).optional(),
  personaId: z.number().optional(),
  avatarUrl: z.string().optional(),
  avatarTipo: z.enum(["ready_player_me", "mixamo", "custom", "basico"]).optional(),
  cor: z.string().optional(),
  altura: z.number().optional(),
  posicaoInicial: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotacaoInicial: z.tuple([z.number(), z.number(), z.number()]).optional(),
  animacaoPadrao: z.string().optional(),
});

const updatePersonagemSchema = createPersonagemSchema.partial().extend({
  id: z.number(),
});

const createObjetoSchema = z.object({
  simulacaoId: z.number(),
  nome: z.string().min(1),
  tipo: z.enum(["arma", "movel", "veiculo", "evidencia", "marcador", "porta", "outro"]).optional(),
  modeloUrl: z.string().optional(),
  modeloNome: z.string().optional(),
  posicao: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotacao: z.tuple([z.number(), z.number(), z.number()]).optional(),
  escala: z.tuple([z.number(), z.number(), z.number()]).optional(),
  cor: z.string().optional(),
  visivel: z.boolean().optional(),
  destacado: z.boolean().optional(),
  descricao: z.string().optional(),
});

const updateObjetoSchema = createObjetoSchema.partial().extend({
  id: z.number(),
});

const createVersaoSchema = z.object({
  simulacaoId: z.number(),
  nome: z.string().min(1),
  tipo: z.enum(["acusacao", "defesa", "alternativa", "comparativa"]),
  cor: z.string().optional(),
  duracao: z.number().optional(),
  narrativa: z.string().optional(),
  cameraId: z.string().optional(),
});

const updateVersaoSchema = createVersaoSchema.partial().extend({
  id: z.number(),
  animacaoData: z.record(z.unknown()).optional(),
  ativa: z.boolean().optional(),
});

const createKeyframeSchema = z.object({
  versaoId: z.number(),
  personagemId: z.number().optional(),
  objetoId: z.number().optional(),
  cameraId: z.string().optional(),
  tempo: z.number(),
  frame: z.number().optional(),
  posicao: z.tuple([z.number(), z.number(), z.number()]).optional(),
  rotacao: z.tuple([z.number(), z.number(), z.number()]).optional(),
  escala: z.tuple([z.number(), z.number(), z.number()]).optional(),
  animacao: z.string().optional(),
  animacaoVelocidade: z.number().optional(),
  opacidade: z.number().optional(),
  visivel: z.boolean().optional(),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut", "spring"]).optional(),
  label: z.string().optional(),
});

const updateKeyframeSchema = createKeyframeSchema.partial().extend({
  id: z.number(),
});

// ==========================================
// ROUTER DO SIMULADOR 3D
// ==========================================

export const simuladorRouter = router({
  // ==========================================
  // SIMULAÇÕES - CRUD PRINCIPAL
  // ==========================================

  // Listar simulações de um caso
  listByCaso: protectedProcedure
    .input(z.object({
      casoId: z.number(),
      includeDeleted: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      // Verificar se o caso existe
      const caso = await db.query.casos.findFirst({
        where: and(
          eq(casos.id, input.casoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ),
      });

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      const conditions = [
        eq(simulacoes3d.casoId, input.casoId),
      ];

      if (!input.includeDeleted) {
        conditions.push(isNull(simulacoes3d.deletedAt));
      }

      const simulacoes = await db.query.simulacoes3d.findMany({
        where: and(...conditions),
        orderBy: [desc(simulacoes3d.updatedAt)],
        with: {
          criadoPor: {
            columns: { id: true, name: true, email: true },
          },
          versoes: {
            where: eq(simulacaoVersoes.ativa, true),
            columns: { id: true, nome: true, tipo: true, cor: true, duracao: true },
          },
        },
      });

      return simulacoes;
    }),

  // Buscar simulação por ID com todos os dados
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const simulacao = await db.query.simulacoes3d.findFirst({
        where: and(
          eq(simulacoes3d.id, input.id),
          eq(simulacoes3d.workspaceId, workspaceId),
          isNull(simulacoes3d.deletedAt),
        ),
        with: {
          caso: {
            columns: { id: true, titulo: true, atribuicao: true },
          },
          criadoPor: {
            columns: { id: true, name: true, email: true },
          },
          personagens: {
            orderBy: [asc(simulacaoPersonagens.ordem)],
            with: {
              persona: {
                columns: { id: true, nome: true, tipo: true },
              },
            },
          },
          objetos: {
            orderBy: [asc(simulacaoObjetos.ordem)],
          },
          versoes: {
            orderBy: [asc(simulacaoVersoes.ordem)],
            with: {
              keyframes: {
                orderBy: [asc(simulacaoKeyframes.tempo)],
              },
              exportacoes: {
                orderBy: [desc(simulacaoExportacoes.createdAt)],
                limit: 1,
              },
            },
          },
        },
      });

      if (!simulacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Simulação não encontrada",
        });
      }

      return simulacao;
    }),

  // Criar nova simulação
  create: protectedProcedure
    .input(createSimulacaoSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      // Verificar se o caso existe
      const caso = await db.query.casos.findFirst({
        where: and(
          eq(casos.id, input.casoId),
          eq(casos.workspaceId, workspaceId),
          isNull(casos.deletedAt),
        ),
      });

      if (!caso) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso não encontrado",
        });
      }

      // Criar simulação com cena padrão
      const cenaDataPadrao = input.cenaData ?? {
        cenario: {
          modeloUrl: "",
          nome: "Cena vazia",
          posicao: [0, 0, 0] as [number, number, number],
          rotacao: [0, 0, 0] as [number, number, number],
          escala: [1, 1, 1] as [number, number, number],
        },
        iluminacao: {
          ambiente: { cor: "#ffffff", intensidade: 0.4 },
          direcional: { cor: "#ffffff", intensidade: 0.8, posicao: [5, 10, 5] as [number, number, number] },
          sombras: true,
        },
        cameras: [
          {
            id: "camera-principal",
            nome: "Câmera Principal",
            tipo: "perspective" as const,
            posicao: [5, 5, 5] as [number, number, number],
            alvo: [0, 0, 0] as [number, number, number],
            fov: 75,
          },
        ],
        configuracoes: {
          gridVisivel: true,
          eixosVisiveis: true,
          qualidade: "media" as const,
        },
      };

      const [simulacao] = await db.insert(simulacoes3d).values({
        casoId: input.casoId,
        titulo: input.titulo,
        descricao: input.descricao,
        cenaData: cenaDataPadrao,
        status: "RASCUNHO",
        criadoPorId: parseInt(userId),
        atualizadoPorId: parseInt(userId),
        workspaceId,
      }).returning();

      // Criar versões padrão (acusação e defesa)
      await db.insert(simulacaoVersoes).values([
        {
          simulacaoId: simulacao.id,
          nome: "Versão da Acusação",
          tipo: "acusacao",
          cor: "#ef4444", // red
          ordem: 0,
        },
        {
          simulacaoId: simulacao.id,
          nome: "Versão da Defesa",
          tipo: "defesa",
          cor: "#22c55e", // green
          ordem: 1,
        },
      ]);

      return simulacao;
    }),

  // Atualizar simulação
  update: protectedProcedure
    .input(updateSimulacaoSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      const { id, ...data } = input;

      const existing = await db.query.simulacoes3d.findFirst({
        where: and(
          eq(simulacoes3d.id, id),
          eq(simulacoes3d.workspaceId, workspaceId),
          isNull(simulacoes3d.deletedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Simulação não encontrada",
        });
      }

      const [updated] = await db.update(simulacoes3d)
        .set({
          ...data,
          atualizadoPorId: parseInt(userId),
          updatedAt: new Date(),
        })
        .where(eq(simulacoes3d.id, id))
        .returning();

      return updated;
    }),

  // Atualizar apenas a cena (auto-save)
  saveCena: protectedProcedure
    .input(z.object({
      simulacaoId: z.number(),
      cenaData: cenaDataSchema,
      thumbnail: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      const existing = await db.query.simulacoes3d.findFirst({
        where: and(
          eq(simulacoes3d.id, input.simulacaoId),
          eq(simulacoes3d.workspaceId, workspaceId),
          isNull(simulacoes3d.deletedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Simulação não encontrada",
        });
      }

      const [updated] = await db.update(simulacoes3d)
        .set({
          cenaData: input.cenaData,
          thumbnail: input.thumbnail,
          atualizadoPorId: parseInt(userId),
          updatedAt: new Date(),
        })
        .where(eq(simulacoes3d.id, input.simulacaoId))
        .returning();

      return updated;
    }),

  // Soft delete
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const [deleted] = await db.update(simulacoes3d)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(simulacoes3d.id, input.id),
          eq(simulacoes3d.workspaceId, workspaceId),
        ))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Simulação não encontrada",
        });
      }

      return { success: true };
    }),

  // ==========================================
  // PERSONAGENS
  // ==========================================

  createPersonagem: protectedProcedure
    .input(createPersonagemSchema)
    .mutation(async ({ input }) => {
      const [personagem] = await db.insert(simulacaoPersonagens).values({
        simulacaoId: input.simulacaoId,
        nome: input.nome,
        papel: input.papel,
        personaId: input.personaId,
        avatarUrl: input.avatarUrl,
        avatarTipo: input.avatarTipo,
        cor: input.cor ?? "#3b82f6",
        altura: input.altura ?? 1.7,
        posicaoInicial: input.posicaoInicial ?? [0, 0, 0],
        rotacaoInicial: input.rotacaoInicial ?? [0, 0, 0],
        animacaoPadrao: input.animacaoPadrao ?? "idle",
      }).returning();

      return personagem;
    }),

  updatePersonagem: protectedProcedure
    .input(updatePersonagemSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(simulacaoPersonagens)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(simulacaoPersonagens.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personagem não encontrado",
        });
      }

      return updated;
    }),

  deletePersonagem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(simulacaoPersonagens)
        .where(eq(simulacaoPersonagens.id, input.id));

      return { success: true };
    }),

  // ==========================================
  // OBJETOS
  // ==========================================

  createObjeto: protectedProcedure
    .input(createObjetoSchema)
    .mutation(async ({ input }) => {
      const [objeto] = await db.insert(simulacaoObjetos).values({
        simulacaoId: input.simulacaoId,
        nome: input.nome,
        tipo: input.tipo,
        modeloUrl: input.modeloUrl,
        modeloNome: input.modeloNome,
        posicao: input.posicao ?? [0, 0, 0],
        rotacao: input.rotacao ?? [0, 0, 0],
        escala: input.escala ?? [1, 1, 1],
        cor: input.cor,
        visivel: input.visivel ?? true,
        destacado: input.destacado ?? false,
        descricao: input.descricao,
      }).returning();

      return objeto;
    }),

  updateObjeto: protectedProcedure
    .input(updateObjetoSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(simulacaoObjetos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(simulacaoObjetos.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Objeto não encontrado",
        });
      }

      return updated;
    }),

  deleteObjeto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(simulacaoObjetos)
        .where(eq(simulacaoObjetos.id, input.id));

      return { success: true };
    }),

  // ==========================================
  // VERSÕES
  // ==========================================

  createVersao: protectedProcedure
    .input(createVersaoSchema)
    .mutation(async ({ input }) => {
      // Obter próxima ordem
      const lastVersao = await db.query.simulacaoVersoes.findFirst({
        where: eq(simulacaoVersoes.simulacaoId, input.simulacaoId),
        orderBy: [desc(simulacaoVersoes.ordem)],
      });

      const [versao] = await db.insert(simulacaoVersoes).values({
        simulacaoId: input.simulacaoId,
        nome: input.nome,
        tipo: input.tipo,
        cor: input.cor ?? "#6366f1",
        duracao: input.duracao ?? 30,
        narrativa: input.narrativa,
        cameraId: input.cameraId,
        ordem: (lastVersao?.ordem ?? -1) + 1,
      }).returning();

      return versao;
    }),

  updateVersao: protectedProcedure
    .input(updateVersaoSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(simulacaoVersoes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(simulacaoVersoes.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versão não encontrada",
        });
      }

      return updated;
    }),

  // Salvar dados de animação (Theatre.js/Remotion)
  saveAnimacaoData: protectedProcedure
    .input(z.object({
      versaoId: z.number(),
      animacaoData: z.record(z.unknown()),
      duracao: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(simulacaoVersoes)
        .set({
          animacaoData: input.animacaoData,
          duracao: input.duracao,
          updatedAt: new Date(),
        })
        .where(eq(simulacaoVersoes.id, input.versaoId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versão não encontrada",
        });
      }

      return updated;
    }),

  deleteVersao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(simulacaoVersoes)
        .where(eq(simulacaoVersoes.id, input.id));

      return { success: true };
    }),

  // Duplicar versão
  duplicateVersao: protectedProcedure
    .input(z.object({
      versaoId: z.number(),
      novoNome: z.string(),
      novoTipo: z.enum(["acusacao", "defesa", "alternativa", "comparativa"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const versaoOriginal = await db.query.simulacaoVersoes.findFirst({
        where: eq(simulacaoVersoes.id, input.versaoId),
        with: {
          keyframes: true,
        },
      });

      if (!versaoOriginal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Versão não encontrada",
        });
      }

      // Criar nova versão
      const [novaVersao] = await db.insert(simulacaoVersoes).values({
        simulacaoId: versaoOriginal.simulacaoId,
        nome: input.novoNome,
        tipo: input.novoTipo ?? versaoOriginal.tipo,
        cor: versaoOriginal.cor,
        animacaoData: versaoOriginal.animacaoData,
        duracao: versaoOriginal.duracao,
        narrativa: versaoOriginal.narrativa,
        cameraId: versaoOriginal.cameraId,
        ordem: versaoOriginal.ordem + 1,
      }).returning();

      // Duplicar keyframes
      if (versaoOriginal.keyframes.length > 0) {
        await db.insert(simulacaoKeyframes).values(
          versaoOriginal.keyframes.map(kf => ({
            versaoId: novaVersao.id,
            personagemId: kf.personagemId,
            objetoId: kf.objetoId,
            cameraId: kf.cameraId,
            tempo: kf.tempo,
            frame: kf.frame,
            posicao: kf.posicao,
            rotacao: kf.rotacao,
            escala: kf.escala,
            animacao: kf.animacao,
            animacaoVelocidade: kf.animacaoVelocidade,
            opacidade: kf.opacidade,
            visivel: kf.visivel,
            easing: kf.easing,
            label: kf.label,
          }))
        );
      }

      return novaVersao;
    }),

  // ==========================================
  // KEYFRAMES
  // ==========================================

  createKeyframe: protectedProcedure
    .input(createKeyframeSchema)
    .mutation(async ({ input }) => {
      const [keyframe] = await db.insert(simulacaoKeyframes).values(input).returning();
      return keyframe;
    }),

  updateKeyframe: protectedProcedure
    .input(updateKeyframeSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(simulacaoKeyframes)
        .set(data)
        .where(eq(simulacaoKeyframes.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Keyframe não encontrado",
        });
      }

      return updated;
    }),

  deleteKeyframe: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(simulacaoKeyframes)
        .where(eq(simulacaoKeyframes.id, input.id));

      return { success: true };
    }),

  // Batch update keyframes (para drag & drop na timeline)
  batchUpdateKeyframes: protectedProcedure
    .input(z.object({
      keyframes: z.array(z.object({
        id: z.number(),
        tempo: z.number(),
        frame: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      for (const kf of input.keyframes) {
        await db.update(simulacaoKeyframes)
          .set({ tempo: kf.tempo, frame: kf.frame })
          .where(eq(simulacaoKeyframes.id, kf.id));
      }

      return { success: true };
    }),

  // ==========================================
  // EXPORTAÇÃO
  // ==========================================

  createExportacao: protectedProcedure
    .input(z.object({
      versaoId: z.number(),
      formato: z.enum(["mp4", "webm", "gif"]),
      resolucao: z.enum(["1280x720", "1920x1080", "3840x2160"]),
      fps: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [exportacao] = await db.insert(simulacaoExportacoes).values({
        versaoId: input.versaoId,
        formato: input.formato,
        resolucao: input.resolucao,
        fps: input.fps ?? 30,
        status: "pendente",
        progresso: 0,
        renderEngine: "remotion",
        criadoPorId: parseInt(userId),
      }).returning();

      // TODO: Iniciar job de renderização com Remotion

      return exportacao;
    }),

  updateExportacaoStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendente", "processando", "pronto", "erro"]),
      progresso: z.number().optional(),
      videoUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      tamanhoBytes: z.number().optional(),
      duracaoSegundos: z.number().optional(),
      tempoRenderizacao: z.number().optional(),
      erro: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [updated] = await db.update(simulacaoExportacoes)
        .set(data)
        .where(eq(simulacaoExportacoes.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exportação não encontrada",
        });
      }

      return updated;
    }),

  // ==========================================
  // BIBLIOTECA DE ASSETS
  // ==========================================

  listAssets: protectedProcedure
    .input(z.object({
      categoria: z.enum(["cenario", "personagem", "objeto", "animacao"]).optional(),
      subcategoria: z.string().optional(),
      includePublicos: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);

      const conditions = [];

      if (input.categoria) {
        conditions.push(eq(simulacaoAssets.categoria, input.categoria));
      }

      if (input.subcategoria) {
        conditions.push(eq(simulacaoAssets.subcategoria, input.subcategoria));
      }

      // Assets públicos ou do workspace
      if (input.includePublicos) {
        conditions.push(
          sql`(${simulacaoAssets.publico} = true OR ${simulacaoAssets.workspaceId} = ${workspaceId})`
        );
      } else {
        conditions.push(eq(simulacaoAssets.workspaceId, workspaceId));
      }

      const assets = await db.query.simulacaoAssets.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [asc(simulacaoAssets.categoria), asc(simulacaoAssets.nome)],
      });

      return assets;
    }),

  createAsset: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      categoria: z.enum(["cenario", "personagem", "objeto", "animacao"]),
      subcategoria: z.string().optional(),
      arquivoUrl: z.string().url(),
      thumbnailUrl: z.string().optional(),
      formato: z.string().optional(),
      descricao: z.string().optional(),
      tags: z.array(z.string()).optional(),
      tamanhoBytes: z.number().optional(),
      fonte: z.string().optional(),
      licenca: z.string().optional(),
      atribuicao: z.string().optional(),
      configuracaoPadrao: z.record(z.unknown()).optional(),
      publico: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = await resolveWorkspaceId(ctx);
      const userId = ctx.session.user.id;

      const [asset] = await db.insert(simulacaoAssets).values({
        ...input,
        workspaceId,
        criadoPorId: parseInt(userId),
      }).returning();

      return asset;
    }),

  // ==========================================
  // PERSONAS DO CASO (para vincular)
  // ==========================================

  getPersonasDoCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input }) => {
      const personas = await db.query.casePersonas.findMany({
        where: eq(casePersonas.casoId, input.casoId),
        orderBy: [asc(casePersonas.nome)],
      });

      return personas;
    }),
});
