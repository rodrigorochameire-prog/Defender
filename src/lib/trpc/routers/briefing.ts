/**
 * Router de Briefing para Audiências
 *
 * Gera análise detalhada e estratégica:
 * - Identifica testemunhas nos documentos
 * - Extrai depoimentos (delegacia + juízo)
 * - Analisa laudos periciais
 * - Busca antecedentes de réu, vítima e testemunhas
 * - Correlaciona provas (laudos vs depoimentos)
 * - Detecta contradições
 * - Sugere perguntas estratégicas e teses defensivas
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { testemunhas, depoimentosAnalise, driveFiles, audiencias, processos, casos, assistidos, casePersonas } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  pythonBackend,
  type TestemunhaInfo,
  type ArquivoProcessado,
  type TestemunhaBriefing,
  type PessoaInfo,
} from "@/lib/services/python-backend";

// ==========================================
// ROUTER
// ==========================================

export const briefingRouter = router({
  /**
   * Gera briefing para audiência
   *
   * 1. Busca testemunhas do processo/caso
   * 2. Busca arquivos do Drive vinculados
   * 3. Processa arquivos (extrai/transcreve)
   * 4. Chama backend Python para análise
   * 5. Retorna briefing estruturado
   */
  generateForAudiencia: protectedProcedure
    .input(
      z.object({
        audienciaId: z.number(),
        processoId: z.number(),
        casoId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Buscar dados da audiência
      const audiencia = await db.query.audiencias.findFirst({
        where: eq(audiencias.id, input.audienciaId),
      });

      if (!audiencia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audiência não encontrada",
        });
      }

      // 2. Buscar testemunhas do processo/caso
      const whereConditions = [eq(testemunhas.processoId, input.processoId)];
      if (input.casoId) {
        whereConditions.push(eq(testemunhas.casoId, input.casoId));
      }

      const testemunhasDb = await db.query.testemunhas.findMany({
        where: and(...whereConditions),
      });

      // Converter para formato esperado pelo backend
      const testemunhasInfo: TestemunhaInfo[] = testemunhasDb.map((t) => ({
        nome: t.nome,
        tipo: t.tipo as "ACUSACAO" | "DEFESA",
      }));

      // 3. Buscar arquivos do Drive vinculados ao processo
      const arquivosDb = await db.query.driveFiles.findMany({
        where: eq(driveFiles.processoId, input.processoId),
      });

      // 4. Processar arquivos para extrair conteúdo
      const arquivosProcessados: ArquivoProcessado[] = [];

      for (const arquivo of arquivosDb) {
        // Determinar tipo do arquivo e source_type
        const mimeType = arquivo.mimeType || "";
        const fileName = arquivo.name.toLowerCase();

        let sourceType: "delegacia" | "juizo" | "laudo" | "relatorio" | "certidao" | "antecedentes" | "ro" | "outro" = "outro";

        // Heurística expandida para determinar origem/tipo do documento
        if (
          fileName.includes("laudo") ||
          fileName.includes("pericia") ||
          fileName.includes("cadaverico") ||
          fileName.includes("toxicologico") ||
          fileName.includes("balistico") ||
          fileName.includes("lesoes") ||
          fileName.includes("dna") ||
          fileName.includes("local do crime") ||
          fileName.includes("necropsia")
        ) {
          sourceType = "laudo";
        } else if (
          fileName.includes("antecedente") ||
          fileName.includes("folha de antecedentes") ||
          fileName.includes("certidao criminal") ||
          fileName.includes("fac")
        ) {
          sourceType = "antecedentes";
        } else if (
          fileName.includes("boletim de ocorrencia") ||
          fileName.includes("ro ") ||
          fileName.includes("b.o.") ||
          fileName.includes("registro de ocorrencia")
        ) {
          sourceType = "ro";
        } else if (
          fileName.includes("certidao") ||
          fileName.includes("certidão")
        ) {
          sourceType = "certidao";
        } else if (
          fileName.includes("relatorio") ||
          fileName.includes("relatório") ||
          fileName.includes("inquerito policial") ||
          fileName.includes("rip")
        ) {
          sourceType = "relatorio";
        } else if (
          fileName.includes("termo") ||
          fileName.includes("depoimento") ||
          fileName.includes("delegacia") ||
          fileName.includes("inquerito") ||
          fileName.includes("oitiva")
        ) {
          sourceType = "delegacia";
        } else if (
          fileName.includes("audiencia") ||
          fileName.includes("instrucao") ||
          fileName.includes("juizo") ||
          mimeType.includes("video") ||
          mimeType.includes("audio")
        ) {
          sourceType = "juizo";
        }

        // Verificar se já temos conteúdo extraído
        // TODO: Buscar de driveFileContents se existir

        // Incluir todos os arquivos processáveis
        if (
          mimeType.includes("pdf") ||
          mimeType.includes("video") ||
          mimeType.includes("audio") ||
          mimeType.includes("text") ||
          mimeType.includes("image") ||
          mimeType.includes("document")
        ) {
          // Para gerar briefing, precisamos extrair/transcrever o conteúdo
          // Isso será feito pelo backend Python que usa Smart Extract
          arquivosProcessados.push({
            drive_file_id: arquivo.driveFileId,
            file_name: arquivo.name,
            content: "", // Backend Python vai extrair
            source_type: sourceType,
          });
        }
      }

      // 5. Buscar pessoas do caso para análise de antecedentes
      const pessoas: PessoaInfo[] = [];

      // Buscar assistido(s) do processo (réu)
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
        with: {
          assistido: true,
        },
      });

      if (processo?.assistido) {
        pessoas.push({
          nome: processo.assistido.nome,
          tipo: "REU",
          cpf: processo.assistido.cpf || undefined,
        });
      }

      // Buscar vítima e outras personas do caso
      if (input.casoId) {
        const personasDb = await db.query.casePersonas.findMany({
          where: eq(casePersonas.casoId, input.casoId),
        });

        for (const persona of personasDb) {
          if (persona.tipo === "VITIMA" || persona.tipo === "TESTEMUNHA") {
            pessoas.push({
              nome: persona.nome,
              tipo: persona.tipo as "REU" | "VITIMA" | "TESTEMUNHA",
            });
          }
        }
      }

      // Adicionar testemunhas à lista de pessoas para busca de antecedentes
      for (const t of testemunhasInfo) {
        if (!pessoas.find((p) => p.nome === t.nome)) {
          pessoas.push({
            nome: t.nome,
            tipo: "TESTEMUNHA",
          });
        }
      }

      // 6. Se não há arquivos, retornar aviso
      if (arquivosProcessados.length === 0) {
        return {
          success: true,
          testemunhas: testemunhasInfo.map((t) => ({
            nome: t.nome,
            tipo: t.tipo,
            arquivos_encontrados: [],
            contradicoes: [],
            pontos_fortes: [],
            pontos_fracos: [],
            perguntas_sugeridas: [],
          })),
          laudos: [],
          relatorios: [],
          antecedentes: [],
          correlacoes: [],
          resumo_geral:
            "Nenhum documento encontrado na pasta do processo.",
          cenario_probatorio: undefined,
          tese_principal_sugerida: undefined,
          teses_subsidiarias: [],
          estrategia_recomendada:
            "Faça upload dos documentos do processo (denúncia, laudos, termos de depoimento, vídeos de audiências).",
          riscos_identificados: [],
          oportunidades_defesa: [],
          ordem_inquiricao_sugerida: testemunhasInfo.map((t) => t.nome),
        };
      }

      // 7. Chamar backend Python para gerar briefing completo
      // O backend vai:
      // - Extrair conteúdo dos arquivos (Docling/OCR/Speech-to-Text)
      // - Classificar documentos por tipo (laudo, depoimento, etc.)
      // - Analisar laudos periciais
      // - Buscar antecedentes de réu, vítima e testemunhas
      // - Correlacionar provas (laudos vs depoimentos)
      // - Identificar testemunhas e analisar depoimentos
      // - Gerar estratégia e teses defensivas
      try {
        const result = await pythonBackend.briefingAudiencia({
          processo_id: input.processoId,
          caso_id: input.casoId,
          audiencia_id: input.audienciaId,
          testemunhas: testemunhasInfo,
          arquivos: arquivosProcessados,
          pessoas: pessoas,
        });

        return result;
      } catch (error) {
        console.error("Erro ao gerar briefing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar briefing. Tente novamente.",
        });
      }
    }),

  /**
   * Salva briefing no banco de dados
   *
   * Persiste análises em:
   * - testemunhas (resumoDepoimento, pontosFavoraveis, etc.)
   * - depoimentosAnalise (versões, contradições)
   *
   * TODO: Persistir também:
   * - Laudos analisados
   * - Antecedentes
   * - Correlações
   * - Teses defensivas
   */
  saveBriefing: protectedProcedure
    .input(
      z.object({
        casoId: z.number(),
        audienciaId: z.number().optional(),
        testemunhas: z.array(
          z.object({
            nome: z.string(),
            versao_delegacia: z.string().optional(),
            versao_juizo: z.string().optional(),
            contradicoes: z.array(z.string()).optional(),
            pontos_fortes: z.array(z.string()).optional(),
            pontos_fracos: z.array(z.string()).optional(),
            perguntas_sugeridas: z.array(z.string()).optional(),
            credibilidade_score: z.number().optional(),
            contradicoes_com_laudos: z.array(z.string()).optional(),
          })
        ),
        // Novos campos estratégicos (persistência futura)
        tese_principal: z.string().optional(),
        teses_subsidiarias: z.array(z.string()).optional(),
        riscos: z.array(z.string()).optional(),
        oportunidades: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results: Record<string, boolean> = {};

      for (const t of input.testemunhas) {
        try {
          // Buscar testemunha existente
          const testemunhaDb = await db.query.testemunhas.findFirst({
            where: and(
              eq(testemunhas.casoId, input.casoId),
              eq(testemunhas.nome, t.nome)
            ),
          });

          if (testemunhaDb) {
            // Atualizar testemunha
            await db
              .update(testemunhas)
              .set({
                resumoDepoimento: t.versao_delegacia || t.versao_juizo,
                pontosFavoraveis: JSON.stringify(t.pontos_fortes || []),
                pontosDesfavoraveis: JSON.stringify(t.pontos_fracos || []),
                perguntasSugeridas: JSON.stringify(t.perguntas_sugeridas || []),
                updatedAt: new Date(),
              })
              .where(eq(testemunhas.id, testemunhaDb.id));

            // Criar/atualizar depoimentosAnalise
            const existingAnalise = await db.query.depoimentosAnalise.findFirst({
              where: and(
                eq(depoimentosAnalise.casoId, input.casoId),
                eq(depoimentosAnalise.testemunhaNome, t.nome)
              ),
            });

            const analiseData = {
              versaoDelegacia: t.versao_delegacia,
              versaoJuizo: t.versao_juizo,
              contradicoesIdentificadas: (t.contradicoes || []).join("\n"),
              pontosFortes: (t.pontos_fortes || []).join("\n"),
              pontosFracos: (t.pontos_fracos || []).join("\n"),
              estrategiaInquiricao: (t.perguntas_sugeridas || []).join("\n"),
              updatedAt: new Date(),
            };

            if (existingAnalise) {
              await db
                .update(depoimentosAnalise)
                .set(analiseData)
                .where(eq(depoimentosAnalise.id, existingAnalise.id));
            } else {
              await db.insert(depoimentosAnalise).values({
                casoId: input.casoId,
                testemunhaNome: t.nome,
                ...analiseData,
                createdAt: new Date(),
              });
            }

            results[t.nome] = true;
          } else {
            results[t.nome] = false;
          }
        } catch (error) {
          console.error(`Erro ao salvar briefing para ${t.nome}:`, error);
          results[t.nome] = false;
        }
      }

      return {
        success: true,
        results,
      };
    }),

  /**
   * Busca briefing existente para audiência
   */
  getForAudiencia: protectedProcedure
    .input(
      z.object({
        audienciaId: z.number(),
        processoId: z.number(),
        casoId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Buscar testemunhas com seus briefings
      const whereConditions = [eq(testemunhas.processoId, input.processoId)];
      if (input.casoId) {
        whereConditions.push(eq(testemunhas.casoId, input.casoId));
      }

      const testemunhasDb = await db.query.testemunhas.findMany({
        where: and(...whereConditions),
      });

      // Buscar análises de depoimentos se houver casoId
      let analisesDb: typeof depoimentosAnalise.$inferSelect[] = [];
      if (input.casoId) {
        analisesDb = await db.query.depoimentosAnalise.findMany({
          where: eq(depoimentosAnalise.casoId, input.casoId),
        });
      }

      // Montar briefing combinando dados
      const briefings: TestemunhaBriefing[] = testemunhasDb.map((t) => {
        const analise = analisesDb.find((a) => a.testemunhaNome === t.nome);

        return {
          nome: t.nome,
          tipo: t.tipo,
          arquivos_encontrados: [],
          versao_delegacia: analise?.versaoDelegacia || undefined,
          versao_juizo: analise?.versaoJuizo || undefined,
          contradicoes: analise?.contradicoesIdentificadas
            ? analise.contradicoesIdentificadas.split("\n").filter(Boolean)
            : [],
          pontos_fortes: analise?.pontosFortes
            ? analise.pontosFortes.split("\n").filter(Boolean)
            : t.pontosFavoraveis
            ? JSON.parse(t.pontosFavoraveis)
            : [],
          pontos_fracos: analise?.pontosFracos
            ? analise.pontosFracos.split("\n").filter(Boolean)
            : t.pontosDesfavoraveis
            ? JSON.parse(t.pontosDesfavoraveis)
            : [],
          perguntas_sugeridas: analise?.estrategiaInquiricao
            ? analise.estrategiaInquiricao.split("\n").filter(Boolean)
            : t.perguntasSugeridas
            ? JSON.parse(t.perguntasSugeridas)
            : [],
          credibilidade_score: undefined,
          credibilidade_justificativa: undefined,
        };
      });

      return {
        success: true,
        testemunhas: briefings,
        // Estrutura completa para compatibilidade com BriefingSection expandido
        laudos: [],
        antecedentes: [],
        correlacoes: [],
        teses_subsidiarias: [],
        riscos_identificados: [],
        oportunidades_defesa: [],
        ordem_inquiricao_sugerida: briefings.map((b) => b.nome),
        hasBriefing: briefings.some(
          (b) => b.versao_delegacia || b.versao_juizo || b.perguntas_sugeridas.length > 0
        ),
      };
    }),

  /**
   * Lista testemunhas arroladas para audiência
   */
  listTestemunhas: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        casoId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions = [eq(testemunhas.processoId, input.processoId)];
      if (input.casoId) {
        whereConditions.push(eq(testemunhas.casoId, input.casoId));
      }

      const testemunhasDb = await db.query.testemunhas.findMany({
        where: and(...whereConditions),
        orderBy: (t, { asc }) => [asc(t.ordemInquiricao), asc(t.nome)],
      });

      return testemunhasDb.map((t) => ({
        id: t.id,
        nome: t.nome,
        tipo: t.tipo,
        status: t.status,
        telefone: t.telefone,
        ordemInquiricao: t.ordemInquiricao,
        temBriefing: !!(t.resumoDepoimento || t.perguntasSugeridas),
      }));
    }),

  /**
   * Lista arquivos disponíveis para briefing
   */
  listArquivosDisponiveis: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const arquivos = await db.query.driveFiles.findMany({
        where: eq(driveFiles.processoId, input.processoId),
      });

      // Filtrar apenas arquivos que podem conter depoimentos
      const arquivosFiltrados = arquivos.filter((a) => {
        const mimeType = a.mimeType || "";
        const fileName = a.name.toLowerCase();

        return (
          mimeType.includes("pdf") ||
          mimeType.includes("video") ||
          mimeType.includes("audio") ||
          mimeType.includes("text") ||
          fileName.includes("depoimento") ||
          fileName.includes("termo") ||
          fileName.includes("audiencia")
        );
      });

      return arquivosFiltrados.map((a) => {
        // Determinar tipo provável
        const mimeType = a.mimeType || "";
        const fileName = a.name.toLowerCase();

        let tipoProvavel: "delegacia" | "juizo" | "outro" = "outro";
        if (
          fileName.includes("termo") ||
          fileName.includes("delegacia") ||
          fileName.includes("inquerito")
        ) {
          tipoProvavel = "delegacia";
        } else if (
          fileName.includes("audiencia") ||
          mimeType.includes("video") ||
          mimeType.includes("audio")
        ) {
          tipoProvavel = "juizo";
        }

        return {
          id: a.id,
          driveFileId: a.driveFileId,
          nome: a.name,
          mimeType: a.mimeType,
          tipoProvavel,
        };
      });
    }),
});
