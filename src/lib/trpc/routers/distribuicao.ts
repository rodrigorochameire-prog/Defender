import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  distributionHistory,
  extractionPatterns,
  assistidos,
  processos,
} from "@/lib/db/schema";
import { eq, and, desc, ilike, or, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope } from "../workspace";
import {
  listDistributionPendingFiles,
  distributeFileComplete,
  searchFoldersByPartialName,
  ATRIBUICAO_FOLDER_IDS,
} from "@/lib/services/google-drive";
import {
  extractFromPdfText,
  identificarAtribuicao,
  toTitleCase,
  checkNameSimilarity,
  normalizeName,
} from "@/lib/utils/text-extraction";
import {
  extrairDadosPdfDoDrive,
  isGeminiConfigured,
} from "@/lib/services/gemini";

export const distribuicaoRouter = router({
  // Listar arquivos pendentes na pasta de distribuição
  listPending: protectedProcedure.query(async ({ ctx }) => {
    getWorkspaceScope(ctx.user);

    const files = await listDistributionPendingFiles();

    return files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      thumbnailLink: f.thumbnailLink,
    }));
  }),

  // Extrair dados de um PDF usando Gemini Vision
  extractData: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      // Verificar se Gemini está configurado
      if (!isGeminiConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "API do Gemini não está configurada. Configure GEMINI_API_KEY nas variáveis de ambiente.",
        });
      }

      // Extrair dados usando Gemini Vision
      const extracted = await extrairDadosPdfDoDrive(input.fileId);

      if (!extracted.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: extracted.error || "Erro ao extrair dados do PDF",
        });
      }

      // Buscar padrões aprendidos para melhorar a extração
      const patterns = await db
        .select()
        .from(extractionPatterns)
        .orderBy(desc(extractionPatterns.timesUsed));

      // Aplicar correções baseadas em padrões aprendidos
      let orgaoCorrigido = extracted.orgaoJulgador;
      let atribuicaoFromPattern: "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | null = null;

      if (extracted.orgaoJulgador) {
        // Buscar padrão correspondente ao órgão
        const orgaoPattern = patterns.find(
          (p) =>
            p.patternType === "orgao" &&
            p.originalValue.toLowerCase() === extracted.orgaoJulgador?.toLowerCase()
        );

        if (orgaoPattern) {
          if (orgaoPattern.correctedValue) {
            orgaoCorrigido = orgaoPattern.correctedValue;
          }
          if (orgaoPattern.correctAtribuicao) {
            atribuicaoFromPattern = orgaoPattern.correctAtribuicao as "JURI" | "VVD" | "EP" | "SUBSTITUICAO";
          }
        }
      }

      // Identificar atribuição baseado nos dados extraídos
      let atribuicaoResult = null;
      if (orgaoCorrigido) {
        atribuicaoResult = identificarAtribuicao(
          orgaoCorrigido,
          extracted.classeDemanda || undefined,
          extracted.assuntos || undefined
        );
      }

      // Se temos atribuição do padrão com alta confiança, usar ela
      if (atribuicaoFromPattern && (!atribuicaoResult || atribuicaoResult.confianca < 90)) {
        atribuicaoResult = {
          atribuicao: atribuicaoFromPattern,
          confianca: 100,
          motivo: "Atribuição definida por padrão aprendido",
        };
      }

      // Converter nomes para Title Case
      const assistidosFormatados = extracted.assistidos.map((a) => ({
        original: a.nome,
        formatted: toTitleCase(a.nome),
        papel: a.papel,
      }));

      // Verificar se algum assistido já existe no banco (para sugestão)
      const assistidosSugestoes = await Promise.all(
        assistidosFormatados.map(async (a) => {
          const similar = await db
            .select({
              id: assistidos.id,
              nome: assistidos.nome,
              cpf: assistidos.cpf,
              atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
              driveFolderId: assistidos.driveFolderId,
            })
            .from(assistidos)
            .where(
              or(
                ilike(assistidos.nome, `%${a.formatted}%`),
                ilike(assistidos.nome, `${a.formatted.split(" ")[0]}%`)
              )
            )
            .limit(3);

          return {
            ...a,
            sugestoes: similar.map((s) => ({
              id: s.id,
              nome: s.nome,
              cpf: s.cpf,
              atribuicao: s.atribuicaoPrimaria,
              hasDriveFolder: !!s.driveFolderId,
            })),
          };
        })
      );

      return {
        numeroProcesso: extracted.numeroProcesso,
        orgaoJulgador: orgaoCorrigido,
        orgaoOriginal: extracted.orgaoJulgador,
        classeDemanda: extracted.classeDemanda,
        assuntos: extracted.assuntos,
        assistidos: assistidosSugestoes,
        atribuicao: atribuicaoResult?.atribuicao || null,
        atribuicaoConfianca: atribuicaoResult?.confianca || 0,
        atribuicaoMotivo: atribuicaoResult?.motivo || null,
        tipoDocumento: extracted.tipoDocumento,
        dataDocumento: extracted.dataDocumento,
        resumo: extracted.resumo,
        tokensUtilizados: extracted.tokensUtilizados,
        usouPadrao: !!atribuicaoFromPattern,
      };
    }),

  // Buscar assistidos similares (para homonímia)
  searchSimilar: protectedProcedure
    .input(
      z.object({
        nome: z.string(),
        atribuicao: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const nomeNormalizado = normalizeName(input.nome);
      const partes = nomeNormalizado.split(" ").filter((p) => p.length > 0);

      if (partes.length === 0) {
        return [];
      }

      // Buscar por primeiro nome
      const primeiroNome = partes[0];
      const ultimoNome = partes.length > 1 ? partes[partes.length - 1] : null;

      // Query para encontrar candidatos
      const candidatos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(
          or(
            ilike(assistidos.nome, `${primeiroNome}%`),
            ultimoNome ? ilike(assistidos.nome, `%${ultimoNome}`) : undefined
          )
        )
        .limit(20);

      // Calcular similaridade
      const resultados = candidatos.map((c) => {
        const similarity = checkNameSimilarity(input.nome, c.nome);
        let tipo: "exact" | "similar" | "first_last" = "first_last";

        if (similarity.exactMatch) {
          tipo = "exact";
        } else if (similarity.similarMatch) {
          tipo = "similar";
        }

        return {
          id: c.id,
          nome: c.nome,
          cpf: c.cpf,
          atribuicao: c.atribuicaoPrimaria,
          driveFolderId: c.driveFolderId,
          similarity: tipo,
          distance: similarity.distance,
        };
      });

      // Ordenar por relevância (exact > similar > first_last) e depois por distância
      return resultados
        .filter((r) => r.similarity === "exact" || r.similarity === "similar" || r.distance <= 5)
        .sort((a, b) => {
          const order = { exact: 0, similar: 1, first_last: 2 };
          if (order[a.similarity] !== order[b.similarity]) {
            return order[a.similarity] - order[b.similarity];
          }
          return a.distance - b.distance;
        })
        .slice(0, 10);
    }),

  // Processar distribuição de um arquivo
  distribute: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        atribuicao: z.enum(["JURI", "VVD", "EP", "SUBSTITUICAO"]),
        assistidoNome: z.string(),
        numeroProcesso: z.string(),
        assistidoId: z.number().optional(), // Se já existe
        createNewAssistido: z.boolean().default(false),
        // Dados originais para aprendizado
        orgaoOriginal: z.string().optional(),
        atribuicaoOriginal: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);

      let assistidoId = input.assistidoId;
      let assistidoNome = input.assistidoNome;

      // Se precisa criar novo assistido
      if (input.createNewAssistido && !assistidoId) {
        const [novoAssistido] = await db
          .insert(assistidos)
          .values({
            nome: toTitleCase(input.assistidoNome),
            statusPrisional: "SOLTO",
            atribuicaoPrimaria:
              input.atribuicao === "JURI"
                ? "JURI_CAMACARI"
                : input.atribuicao === "VVD"
                  ? "VVD_CAMACARI"
                  : input.atribuicao === "EP"
                    ? "EXECUCAO_PENAL"
                    : "SUBSTITUICAO",
            defensorId: ctx.user.id,
            workspaceId: workspaceId || 1,
          })
          .returning();

        assistidoId = novoAssistido.id;
        assistidoNome = novoAssistido.nome;
      } else if (assistidoId) {
        // Buscar nome do assistido existente
        const [existente] = await db
          .select({ nome: assistidos.nome })
          .from(assistidos)
          .where(eq(assistidos.id, assistidoId));

        if (existente) {
          assistidoNome = existente.nome;
        }
      }

      // Executar a distribuição no Drive
      const result = await distributeFileComplete(
        input.fileId,
        input.atribuicao,
        assistidoNome,
        input.numeroProcesso
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao distribuir arquivo",
        });
      }

      // Atualizar pasta do assistido no banco
      if (assistidoId && result.assistidoFolder) {
        await db
          .update(assistidos)
          .set({
            driveFolderId: result.assistidoFolder.id,
            updatedAt: new Date(),
          })
          .where(eq(assistidos.id, assistidoId));
      }

      // Registrar no histórico
      await db.insert(distributionHistory).values({
        driveFileId: input.fileId,
        originalFilename: result.movedFile?.name || "unknown",
        extractedNumeroProcesso: input.numeroProcesso,
        extractedAssistidoNome: assistidoNome,
        atribuicaoIdentificada: input.atribuicao as any,
        assistidoId: assistidoId || null,
        destinationFolderId: result.processoFolder?.id || null,
        status: "completed",
        processedAt: new Date(),
        workspaceId: workspaceId || 1,
      });

      // SISTEMA DE APRENDIZADO: Salvar padrão se houve correção
      if (input.orgaoOriginal && input.atribuicaoOriginal) {
        // Se a atribuição foi corrigida pelo usuário, salvar o padrão
        if (input.atribuicaoOriginal !== input.atribuicao) {
          // Verificar se já existe padrão para este órgão
          const [existingPattern] = await db
            .select()
            .from(extractionPatterns)
            .where(
              and(
                eq(extractionPatterns.patternType, "orgao"),
                eq(extractionPatterns.originalValue, input.orgaoOriginal)
              )
            );

          if (existingPattern) {
            // Atualizar padrão existente
            await db
              .update(extractionPatterns)
              .set({
                correctAtribuicao: input.atribuicao as any,
                timesUsed: sql`${extractionPatterns.timesUsed} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(extractionPatterns.id, existingPattern.id));
          } else {
            // Criar novo padrão
            await db.insert(extractionPatterns).values({
              patternType: "orgao",
              originalValue: input.orgaoOriginal,
              correctAtribuicao: input.atribuicao as any,
              workspaceId: workspaceId || 1,
              createdBy: ctx.user.id,
            });
          }

          console.log(
            `[Aprendizado] Padrão salvo: "${input.orgaoOriginal}" -> ${input.atribuicao}`
          );
        }
      }

      return {
        success: true,
        assistidoId,
        assistidoFolderId: result.assistidoFolder?.id,
        processoFolderId: result.processoFolder?.id,
        movedFileId: result.movedFile?.id,
      };
    }),

  // Histórico de distribuições
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workspaceId, isAdmin } = getWorkspaceScope(ctx.user);

      const conditions = [];

      if (!isAdmin && workspaceId) {
        conditions.push(eq(distributionHistory.workspaceId, workspaceId));
      }

      if (input.status) {
        conditions.push(eq(distributionHistory.status, input.status));
      }

      const items = await db
        .select()
        .from(distributionHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(distributionHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return items;
    }),

  // Salvar padrão aprendido
  savePattern: protectedProcedure
    .input(
      z.object({
        patternType: z.enum(["orgao", "classe", "parte", "numero"]),
        originalValue: z.string(),
        correctedValue: z.string().optional(),
        correctAtribuicao: z.enum(["JURI", "VVD", "EP", "SUBSTITUICAO"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);

      // Verificar se já existe
      const [existing] = await db
        .select()
        .from(extractionPatterns)
        .where(
          and(
            eq(extractionPatterns.patternType, input.patternType),
            eq(extractionPatterns.originalValue, input.originalValue)
          )
        );

      if (existing) {
        // Atualizar contagem de uso
        await db
          .update(extractionPatterns)
          .set({
            timesUsed: sql`${extractionPatterns.timesUsed} + 1`,
            correctedValue: input.correctedValue || existing.correctedValue,
            correctAtribuicao: (input.correctAtribuicao as any) || existing.correctAtribuicao,
            updatedAt: new Date(),
          })
          .where(eq(extractionPatterns.id, existing.id));

        return { updated: true, id: existing.id };
      }

      // Criar novo padrão
      const [newPattern] = await db
        .insert(extractionPatterns)
        .values({
          patternType: input.patternType,
          originalValue: input.originalValue,
          correctedValue: input.correctedValue,
          correctAtribuicao: input.correctAtribuicao as any,
          workspaceId: workspaceId || 1,
          createdBy: ctx.user.id,
        })
        .returning();

      return { created: true, id: newPattern.id };
    }),

  // Listar padrões aprendidos
  listPatterns: protectedProcedure
    .input(
      z.object({
        patternType: z.enum(["orgao", "classe", "parte", "numero"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      const conditions = [];

      if (input.patternType) {
        conditions.push(eq(extractionPatterns.patternType, input.patternType));
      }

      return db
        .select()
        .from(extractionPatterns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(extractionPatterns.timesUsed));
    }),

  // Buscar processo existente pelo número
  searchProcesso: protectedProcedure
    .input(
      z.object({
        numeroProcesso: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);

      // Normalizar número do processo (remover caracteres especiais para busca)
      const numeroNormalizado = input.numeroProcesso.replace(/[^0-9]/g, "");

      if (numeroNormalizado.length < 5) {
        return null;
      }

      // Buscar processo pelo número
      const [processo] = await db
        .select({
          id: processos.id,
          numero: processos.numero,
          assistidoId: processos.assistidoId,
          assistidoNome: assistidos.nome,
          tipoProcesso: processos.tipoProcesso,
          driveFolderId: processos.driveFolderId,
        })
        .from(processos)
        .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
        .where(
          or(
            eq(processos.numero, input.numeroProcesso),
            sql`REPLACE(REPLACE(REPLACE(${processos.numero}, '.', ''), '-', ''), ' ', '') = ${numeroNormalizado}`
          )
        )
        .limit(1);

      if (!processo) {
        return null;
      }

      return {
        id: processo.id,
        numero: processo.numero,
        assistidoId: processo.assistidoId,
        assistidoNome: processo.assistidoNome,
        tipoProcesso: processo.tipoProcesso,
        driveFolderId: processo.driveFolderId,
      };
    }),

  // Criar ou vincular a processo existente
  linkToProcesso: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        processoId: z.number(),
        atribuicao: z.enum(["JURI", "VVD", "EP", "SUBSTITUICAO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workspaceId } = getWorkspaceScope(ctx.user);

      // Buscar processo e assistido
      const [processo] = await db
        .select({
          id: processos.id,
          numero: processos.numero,
          assistidoId: processos.assistidoId,
          assistidoNome: assistidos.nome,
          driveFolderId: processos.driveFolderId,
        })
        .from(processos)
        .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
        .where(eq(processos.id, input.processoId));

      if (!processo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo não encontrado",
        });
      }

      // Executar distribuição
      const result = await distributeFileComplete(
        input.fileId,
        input.atribuicao,
        processo.assistidoNome || "Desconhecido",
        processo.numero
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro ao distribuir arquivo",
        });
      }

      // Atualizar driveFolderId do processo se necessário
      if (result.processoFolder && !processo.driveFolderId) {
        await db
          .update(processos)
          .set({
            driveFolderId: result.processoFolder.id,
            updatedAt: new Date(),
          })
          .where(eq(processos.id, processo.id));
      }

      // Registrar no histórico
      await db.insert(distributionHistory).values({
        driveFileId: input.fileId,
        originalFilename: result.movedFile?.name || "unknown",
        extractedNumeroProcesso: processo.numero,
        extractedAssistidoNome: processo.assistidoNome || "Desconhecido",
        atribuicaoIdentificada: input.atribuicao as any,
        assistidoId: processo.assistidoId,
        processoId: processo.id,
        destinationFolderId: result.processoFolder?.id || null,
        status: "completed",
        processedAt: new Date(),
        workspaceId: workspaceId || 1,
      });

      return {
        success: true,
        processoId: processo.id,
        processoFolderId: result.processoFolder?.id,
        movedFileId: result.movedFile?.id,
      };
    }),
});
