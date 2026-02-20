import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { compartilhamentos, profissionais, assistidos, processos } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ==========================================
// ACOMPANHAMENTO ROUTER
// Permite "seguir" assistidos e processos
// usando a tabela compartilhamentos existente
// com motivo = 'Acompanhamento'
// ==========================================

const MOTIVO_ACOMPANHAMENTO = "Acompanhamento";

/**
 * Encontra o profissional associado ao userId
 * A tabela compartilhamentos usa profissionais.id, não users.id
 */
async function getProfissionalId(userId: number): Promise<number> {
  const profissional = await db.query.profissionais.findFirst({
    where: eq(profissionais.userId, userId),
    columns: { id: true },
  });

  if (!profissional) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Perfil de profissional não encontrado. Solicite ao administrador que crie seu perfil.",
    });
  }

  return profissional.id;
}

export const acompanhamentoRouter = router({
  // ==========================================
  // 1. Acompanhar entidade (assistido ou processo)
  // ==========================================
  acompanhar: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(["assistido", "processo"]),
      entidadeId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profissionalId = await getProfissionalId(ctx.user.id);

      // Verificar se a entidade existe
      if (input.entidadeTipo === "assistido") {
        const assistido = await db.query.assistidos.findFirst({
          where: eq(assistidos.id, input.entidadeId),
        });
        if (!assistido) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assistido não encontrado",
          });
        }
      } else {
        const processo = await db.query.processos.findFirst({
          where: eq(processos.id, input.entidadeId),
        });
        if (!processo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Processo não encontrado",
          });
        }
      }

      // Verificar se já acompanha (evitar duplicatas)
      const existente = await db.query.compartilhamentos.findFirst({
        where: and(
          eq(compartilhamentos.compartilhadoComId, profissionalId),
          eq(compartilhamentos.entidadeTipo, input.entidadeTipo),
          eq(compartilhamentos.entidadeId, input.entidadeId),
          eq(compartilhamentos.motivo, MOTIVO_ACOMPANHAMENTO),
          eq(compartilhamentos.ativo, true),
        ),
      });

      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já está acompanhando este registro",
        });
      }

      // Criar compartilhamento de acompanhamento
      const [compartilhamento] = await db.insert(compartilhamentos)
        .values({
          entidadeTipo: input.entidadeTipo,
          entidadeId: input.entidadeId,
          compartilhadoPorId: profissionalId, // quem criou = o próprio usuário
          compartilhadoComId: profissionalId, // quem acompanha = o próprio usuário
          motivo: MOTIVO_ACOMPANHAMENTO,
          ativo: true,
        })
        .returning();

      return compartilhamento;
    }),

  // ==========================================
  // 2. Parar de acompanhar
  // ==========================================
  pararAcompanhar: protectedProcedure
    .input(z.object({
      compartilhamentoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profissionalId = await getProfissionalId(ctx.user.id);

      // Buscar o compartilhamento
      const compartilhamento = await db.query.compartilhamentos.findFirst({
        where: eq(compartilhamentos.id, input.compartilhamentoId),
      });

      if (!compartilhamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acompanhamento não encontrado",
        });
      }

      // Verificar permissão (só quem acompanha pode parar)
      if (compartilhamento.compartilhadoComId !== profissionalId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para remover este acompanhamento",
        });
      }

      // Desativar
      const [updated] = await db.update(compartilhamentos)
        .set({ ativo: false })
        .where(eq(compartilhamentos.id, input.compartilhamentoId))
        .returning();

      return updated;
    }),

  // ==========================================
  // 3. Meus acompanhamentos
  // ==========================================
  meusAcompanhamentos: protectedProcedure
    .query(async ({ ctx }) => {
      const profissionalId = await getProfissionalId(ctx.user.id);

      // Buscar compartilhamentos ativos com motivo 'Acompanhamento'
      const acompanhamentos = await db.query.compartilhamentos.findMany({
        where: and(
          eq(compartilhamentos.compartilhadoComId, profissionalId),
          eq(compartilhamentos.motivo, MOTIVO_ACOMPANHAMENTO),
          eq(compartilhamentos.ativo, true),
        ),
        orderBy: [desc(compartilhamentos.createdAt)],
      });

      // Enriquecer com dados da entidade
      const resultado = await Promise.all(
        acompanhamentos.map(async (a) => {
          let entidadeNome = "";
          let entidadeDetalhe = "";

          if (a.entidadeTipo === "assistido") {
            const assistido = await db.query.assistidos.findFirst({
              where: eq(assistidos.id, a.entidadeId),
              columns: { id: true, nome: true, cpf: true },
            });
            entidadeNome = assistido?.nome || "Assistido não encontrado";
            entidadeDetalhe = assistido?.cpf || "";
          } else if (a.entidadeTipo === "processo") {
            const processo = await db.query.processos.findFirst({
              where: eq(processos.id, a.entidadeId),
              columns: { id: true, numeroAutos: true, vara: true },
            });
            entidadeNome = processo?.numeroAutos || "Processo não encontrado";
            entidadeDetalhe = processo?.vara || "";
          }

          return {
            ...a,
            entidadeNome,
            entidadeDetalhe,
          };
        })
      );

      return resultado;
    }),

  // ==========================================
  // 4. Verificar se estou acompanhando
  // ==========================================
  isAcompanhando: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(["assistido", "processo"]),
      entidadeId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const profissionalId = await getProfissionalId(ctx.user.id);

      const existente = await db.query.compartilhamentos.findFirst({
        where: and(
          eq(compartilhamentos.compartilhadoComId, profissionalId),
          eq(compartilhamentos.entidadeTipo, input.entidadeTipo),
          eq(compartilhamentos.entidadeId, input.entidadeId),
          eq(compartilhamentos.motivo, MOTIVO_ACOMPANHAMENTO),
          eq(compartilhamentos.ativo, true),
        ),
        columns: { id: true },
      });

      return {
        acompanhando: !!existente,
        compartilhamentoId: existente?.id || null,
      };
    }),
});
