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
import { testemunhas, depoimentosAnalise, driveFiles, audiencias, processos, assistidos, casePersonas, demandas } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  pythonBackend,
  type TestemunhaInfo,
  type ArquivoProcessado,
  type TestemunhaBriefing,
  type PessoaInfo,
} from "@/lib/services/python-backend";
import { getAccessToken } from "@/lib/services/google-drive";
import { createOrUpdateDriveFile, readDriveFileFromFolder } from "@/lib/integrations/google";

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

      // 3. Buscar arquivos do Drive vinculados ao processo (exclui enrichmentData JSONB — pesado e não usado aqui)
      const arquivosDb = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
        })
        .from(driveFiles)
        .where(eq(driveFiles.processoId, input.processoId));

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
          contradicoes_com_laudos: [],
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
   * Exporta briefing consolidado para pasta do Drive (integração Cowork)
   *
   * Agrega todos os dados do assistido/audiência em markdown estruturado
   * e salva como `_briefing_[tipo]_[data].md` na pasta raiz do assistido no Drive.
   * O Cowork (Claude Code) lê esse arquivo ao analisar a pasta.
   */
  exportarParaCowork: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        audienciaId: z.number().optional(),
        processoId: z.number().optional(),
        tipo: z.enum(["audiencia", "assistido", "processo"]).default("assistido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Buscar assistido
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
      });

      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      if (!assistido.driveFolderId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Assistido não possui pasta no Drive. Crie a pasta primeiro.",
        });
      }

      // 2. Buscar processos
      const processosDb = await db.query.processos.findMany({
        where: and(eq(processos.assistidoId, input.assistidoId), isNull(processos.deletedAt)),
      });

      // 3. Buscar demandas (exclui deletadas)
      const demandasDb = await db.query.demandas.findMany({
        where: and(
          eq(demandas.assistidoId, input.assistidoId),
          isNull(demandas.deletedAt)
        ),
      });

      // 4. Audiência específica (se tipo='audiencia')
      let audienciaDb: typeof audiencias.$inferSelect | undefined;
      let testemunhasDb: typeof testemunhas.$inferSelect[] = [];

      if (input.tipo === "audiencia" && input.audienciaId) {
        audienciaDb = await db.query.audiencias.findFirst({
          where: eq(audiencias.id, input.audienciaId),
        });

        if (audienciaDb) {
          const processoIdParaTestemunhas = audienciaDb.processoId;
          testemunhasDb = await db.query.testemunhas.findMany({
            where: eq(testemunhas.processoId, processoIdParaTestemunhas),
          });
        }
      }

      // 4b. Buscar depoimentos históricos do processo
      let depoimentosDb: typeof depoimentosAnalise.$inferSelect[] = [];
      if (audienciaDb?.processoId) {
        const processoParaDepoimentos = await db.query.processos.findFirst({
          where: eq(processos.id, audienciaDb.processoId),
          columns: { casoId: true },
        });
        if (processoParaDepoimentos?.casoId) {
          depoimentosDb = await db.query.depoimentosAnalise.findMany({
            where: eq(depoimentosAnalise.casoId, processoParaDepoimentos.casoId),
          });
        }
      }

      // 5. Arquivos do Drive vinculados
      const processoIds = processosDb.map((p) => p.id);
      let arquivosDb: { name: string; mimeType: string | null }[] = [];
      if (processoIds.length > 0) {
        arquivosDb = await db
          .select({ name: driveFiles.name, mimeType: driveFiles.mimeType })
          .from(driveFiles)
          .where(eq(driveFiles.processoId, processoIds[0]));
      }

      // 6. Montar markdown estruturado
      const now = new Date();
      const dataStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const horaStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const lines: string[] = [];

      // Cabeçalho
      lines.push(`# Briefing OMBUDS — ${assistido.nome}`);
      lines.push(`> Gerado automaticamente em ${dataStr} às ${horaStr}`);
      lines.push(`> Tipo: ${input.tipo === "audiencia" ? "Briefing de Audiência" : "Visão Geral do Assistido"}`);
      lines.push("");

      // Dados pessoais
      lines.push("## Assistido");
      lines.push(`- **Nome**: ${assistido.nome}`);
      if (assistido.cpf) lines.push(`- **CPF**: ${assistido.cpf}`);
      if (assistido.dataNascimento) lines.push(`- **Data de nascimento**: ${assistido.dataNascimento}`);
      if (assistido.statusPrisional) lines.push(`- **Status prisional**: ${assistido.statusPrisional}`);
      if (assistido.unidadePrisional) lines.push(`- **Unidade prisional**: ${assistido.unidadePrisional}`);
      if (assistido.localPrisao) lines.push(`- **Local de prisão**: ${assistido.localPrisao}`);
      if (assistido.dataPrisao) lines.push(`- **Data da prisão**: ${assistido.dataPrisao}`);
      if (assistido.observacoes) lines.push(`- **Observações**: ${assistido.observacoes}`);
      lines.push("");

      // Processos
      lines.push("## Processos");
      if (processosDb.length === 0) {
        lines.push("_Nenhum processo vinculado._");
      } else {
        for (const p of processosDb) {
          lines.push(`### ${p.numeroAutos}`);
          lines.push(`- **Assunto**: ${p.assunto || "—"}`);
          lines.push(`- **Vara**: ${p.vara || "—"}`);
          lines.push(`- **Área**: ${p.area}`);
          lines.push(`- **Atribuição**: ${p.atribuicao}`);
          if (p.fase) lines.push(`- **Fase**: ${p.fase}`);
          if (p.situacao) lines.push(`- **Situação**: ${p.situacao}`);
          if (p.parteContraria) lines.push(`- **Parte contrária**: ${p.parteContraria}`);
          if (p.isJuri) lines.push(`- **Júri**: Sim${p.dataSessaoJuri ? ` — sessão em ${new Date(p.dataSessaoJuri).toLocaleDateString("pt-BR")}` : ""}`);

          // Analysis data do processo
          if (p.analysisData?.resumo) {
            lines.push(`- **Resumo IA**: ${p.analysisData.resumo}`);
          }
          if (p.analysisData?.teses && p.analysisData.teses.length > 0) {
            lines.push(`- **Teses identificadas**:`);
            for (const tese of p.analysisData.teses) {
              lines.push(`  - ${tese}`);
            }
          }
          lines.push("");
        }
      }

      // Audiência (se aplicável)
      if (input.tipo === "audiencia" && audienciaDb) {
        lines.push("## Audiência");
        lines.push(`- **Tipo**: ${audienciaDb.tipo}`);
        lines.push(`- **Data**: ${new Date(audienciaDb.dataAudiencia).toLocaleDateString("pt-BR")} às ${audienciaDb.horario || new Date(audienciaDb.dataAudiencia).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
        if (audienciaDb.local) lines.push(`- **Local**: ${audienciaDb.local}`);
        if (audienciaDb.sala) lines.push(`- **Sala**: ${audienciaDb.sala}`);
        if (audienciaDb.juiz) lines.push(`- **Juiz**: ${audienciaDb.juiz}`);
        if (audienciaDb.promotor) lines.push(`- **Promotor**: ${audienciaDb.promotor}`);
        if (audienciaDb.status) lines.push(`- **Status**: ${audienciaDb.status}`);
        if (audienciaDb.observacoes) lines.push(`- **Observações**: ${audienciaDb.observacoes}`);
        if (audienciaDb.resumoDefesa) {
          lines.push("");
          lines.push("### Resumo da Defesa");
          lines.push(audienciaDb.resumoDefesa);
        }
        lines.push("");

        // Testemunhas
        if (testemunhasDb.length > 0) {
          lines.push("## Testemunhas");
          for (const t of testemunhasDb) {
            lines.push(`### ${t.nome} (${t.tipo})`);
            if (t.telefone) lines.push(`- **Telefone**: ${t.telefone}`);
            if (t.status) lines.push(`- **Status**: ${t.status}`);
            if (t.ordemInquiricao) lines.push(`- **Ordem de inquirição**: ${t.ordemInquiricao}`);
            if (t.resumoDepoimento) {
              lines.push(`- **Resumo do depoimento**: ${t.resumoDepoimento}`);
            }
            if (t.pontosFavoraveis) {
              const pontos = JSON.parse(t.pontosFavoraveis) as string[];
              if (pontos.length > 0) {
                lines.push("- **Pontos favoráveis**:");
                pontos.forEach((p) => lines.push(`  - ${p}`));
              }
            }
            if (t.pontosDesfavoraveis) {
              const pontos = JSON.parse(t.pontosDesfavoraveis) as string[];
              if (pontos.length > 0) {
                lines.push("- **Pontos desfavoráveis**:");
                pontos.forEach((p) => lines.push(`  - ${p}`));
              }
            }
            if (t.perguntasSugeridas) {
              const perguntas = JSON.parse(t.perguntasSugeridas) as string[];
              if (perguntas.length > 0) {
                lines.push("- **Perguntas sugeridas**:");
                perguntas.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`));
              }
            }
            lines.push("");
          }
        }

        // Depoimentos históricos comparativos
        if (depoimentosDb.length > 0) {
          lines.push("## Histórico de Depoimentos (Análise Comparativa)");
          lines.push("");
          for (const d of depoimentosDb) {
            lines.push(`### ${d.testemunhaNome ?? "Testemunha desconhecida"}`);
            if (d.versaoDelegacia) {
              lines.push("**Versão na Delegacia:**");
              lines.push(d.versaoDelegacia);
              lines.push("");
            }
            if (d.versaoJuizo) {
              lines.push("**Versão no Juízo:**");
              lines.push(d.versaoJuizo);
              lines.push("");
            }
            if (d.contradicoesIdentificadas) {
              lines.push(`**Contradições identificadas:** ${d.contradicoesIdentificadas}`);
              lines.push("");
            }
            if (d.estrategiaInquiricao) {
              lines.push(`**Estratégia de inquirição:** ${d.estrategiaInquiricao}`);
              lines.push("");
            }
          }
        }
      }

      // Demandas abertas (exclui arquivadas e concluídas)
      const demandasAbertas = demandasDb.filter((d) => d.status !== "ARQUIVADO" && d.status !== "CONCLUIDO");
      if (demandasAbertas.length > 0) {
        lines.push("## Demandas Abertas");
        for (const d of demandasAbertas) {
          const prazoStr = d.prazo ? new Date(d.prazo).toLocaleDateString("pt-BR") : "sem prazo";
          const urgente = d.prazo && new Date(d.prazo) < now;
          lines.push(`- **${d.ato}** — prazo: ${prazoStr}${urgente ? " ⚠️ VENCIDO" : ""} [${d.status}]${d.reuPreso ? " [RÉU PRESO]" : ""}`);
          if (d.providencias) lines.push(`  → ${d.providencias}`);
        }
        lines.push("");
      }

      // Arquivos no Drive
      if (arquivosDb.length > 0) {
        lines.push("## Arquivos na Pasta do Processo");
        for (const f of arquivosDb) {
          lines.push(`- ${f.name}${f.mimeType ? ` (${f.mimeType.split("/").pop()})` : ""}`);
        }
        lines.push("");
      }

      // Analysis geral do assistido
      if (assistido.analysisData?.resumo) {
        lines.push("## Análise IA do Assistido");
        lines.push(assistido.analysisData.resumo);
        if (assistido.analysisData.achadosChave?.length) {
          lines.push("");
          lines.push("**Achados-chave:**");
          assistido.analysisData.achadosChave.forEach((a) => lines.push(`- ${a}`));
        }
        if (assistido.analysisData.recomendacoes?.length) {
          lines.push("");
          lines.push("**Recomendações:**");
          assistido.analysisData.recomendacoes.forEach((r) => lines.push(`- ${r}`));
        }
        lines.push("");
      }

      lines.push("---");
      lines.push(`_Briefing gerado pelo OMBUDS em ${dataStr} às ${horaStr}_`);

      const markdown = lines.join("\n");

      // 7. Escrever no Drive
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível obter token de acesso ao Google Drive.",
        });
      }

      const dateSlug = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const fileName = input.tipo === "audiencia"
        ? `_briefing_audiencia_${dateSlug}.md`
        : `_briefing_assistido_${dateSlug}.md`;

      const result = await createOrUpdateDriveFile(
        accessToken,
        assistido.driveFolderId,
        fileName,
        markdown,
        "text/markdown"
      );

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao escrever arquivo no Drive.",
        });
      }

      return {
        success: true,
        fileName,
        fileUrl: result.webViewLink,
        assistidoNome: assistido.nome,
      };
    }),

  /**
   * Importa análise gerada pelo Cowork (_analise_ia.json) da pasta Drive do assistido.
   *
   * O Cowork lê o briefing exportado, gera _analise_ia.json e salva na mesma pasta.
   * Esta mutation detecta o arquivo, parseia e popula analysisData no banco.
   */
  importarAnaliseCowork: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
      });

      if (!assistido) throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      if (!assistido.driveFolderId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Assistido sem pasta no Drive" });

      const accessToken = await getAccessToken();
      if (!accessToken) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao obter token do Drive" });

      const raw = await readDriveFileFromFolder(accessToken, assistido.driveFolderId, "_analise_ia.json");
      if (!raw) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo _analise_ia.json não encontrado na pasta do Drive. Gere a análise no Cowork primeiro." });

      let analise: Record<string, unknown>;
      try {
        analise = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "PARSE_ERROR", message: "Arquivo _analise_ia.json inválido (não é JSON válido)" });
      }

      // Monta analysisData mesclando campos novos com existentes
      const existing = assistido.analysisData ?? {};
      const newData = {
        ...existing,
        ...(analise.resumo ? { resumo: String(analise.resumo) } : {}),
        ...(Array.isArray(analise.achadosChave) ? { achadosChave: analise.achadosChave as string[] } : {}),
        ...(Array.isArray(analise.recomendacoes) ? { recomendacoes: analise.recomendacoes as string[] } : {}),
        ...(Array.isArray(analise.inconsistencias) ? { inconsistencias: analise.inconsistencias as string[] } : {}),
      };

      await db.update(assistidos).set({
        analysisData: { ...newData, fonte: "cowork" },
        analysisStatus: "completed",
        analyzedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(assistidos.id, input.assistidoId));

      // Se o JSON tem teses ou resumo por processo, atualiza o processo principal também
      if ((analise.teses || analise.resumoProcesso) && analise.processoId) {
        const proc = await db.query.processos.findFirst({
          where: eq(processos.id, Number(analise.processoId)),
        });
        if (proc) {
          const existingProc = proc.analysisData ?? {};
          await db.update(processos).set({
            analysisData: {
              ...existingProc,
              ...(analise.resumoProcesso ? { resumo: String(analise.resumoProcesso) } : {}),
              ...(Array.isArray(analise.teses) ? { teses: analise.teses as string[] } : {}),
            },
            analysisStatus: "cowork",
            analyzedAt: new Date(),
          }).where(eq(processos.id, proc.id));
        }
      }

      return {
        success: true,
        camposImportados: Object.keys(analise).filter(k => ["resumo","achadosChave","recomendacoes","inconsistencias","teses"].includes(k)),
        geradoEm: analise.geradoEm ? String(analise.geradoEm) : undefined,
      };
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
      // Busca apenas campos necessários para listagem (exclui enrichmentData JSONB)
      const arquivos = await db
        .select({
          id: driveFiles.id,
          driveFileId: driveFiles.driveFileId,
          name: driveFiles.name,
          mimeType: driveFiles.mimeType,
        })
        .from(driveFiles)
        .where(eq(driveFiles.processoId, input.processoId));

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
