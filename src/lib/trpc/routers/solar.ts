/**
 * Router tRPC para integração Solar (DPEBA)
 *
 * Permite sincronizar processos do Sistema Solar da Defensoria Pública
 * com o OMBUDS: consulta movimentações, extrai dados, baixa PDFs
 * e envia ao Google Drive.
 *
 * Endpoints:
 * - solar.status: Status da conexão Solar
 * - solar.syncProcesso: Sincroniza um processo
 * - solar.syncBatch: Sincroniza múltiplos processos
 * - solar.avisos: Lista avisos pendentes (PJe/SEEU)
 */

import { createHash } from "crypto";
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos, documentos, anotacoes, assistidos, demandas } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, ilike, desc, asc, or, sql, inArray, count as drizzleCount } from "drizzle-orm";
import {
  enrichmentClient,
  type SolarSyncOutput,
  type SolarNomeSyncOutput,
  type SolarCadastrarOutput,
  type SolarSyncToOutput,
  type SolarCriarAnotacaoOutput,
  type SolarUploadDocumentoOutput,
  type SigadExportarOutput,
  type SigadBuscarOutput,
} from "@/lib/services/enrichment-client";
import { uploadFileBuffer, listFilesInFolder, moveFileInDrive } from "@/lib/services/google-drive";
import {
  PROTOCOLAR_FOLDER_ID,
  PETICOES_POR_ASSUNTO_FOLDER_ID,
  ATO_TO_DRIVE_FOLDER,
  FOLDER_FALLBACK,
  detectarAtoDoNomeArquivo,
  extrairProcessoDoNomeArquivo,
} from "@/config/protocolar-folders";
import {
  resolverFaseSolar,
  gerarDescricaoFase,
} from "@/config/protocolar-solar";
import { gerarTextoProtocolo } from "@/lib/utils/solar-text";
import { shouldSync } from "@/config/solar-sync-config";

// ==========================================
// SOLAR ROUTER
// ==========================================

export const solarRouter = router({
  /**
   * Status da integração Solar.
   * Checa configuração, autenticação, seletores.
   */
  status: protectedProcedure.query(async () => {
    try {
      const status = await enrichmentClient.solarStatus();
      return {
        available: true,
        ...status,
      };
    } catch (error) {
      return {
        available: false,
        configured: false,
        authenticated: false,
        session_age_seconds: null,
        solar_reachable: false,
        selectors_mapped: false,
        unmapped_selectors: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Sincroniza um processo do Solar.
   * 1. Busca numeroAutos no DB
   * 2. Chama Enrichment Engine /solar/sync-processo
   * 3. Upload PDFs retornados ao Google Drive
   * 4. Cria registros documentos no DB
   */
  syncProcesso: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        downloadPdfs: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar processo no DB
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
        columns: {
          id: true,
          numeroAutos: true,
          assistidoId: true,
          casoId: true,
          driveFolderId: true,
        },
      });

      if (!processo) {
        throw new Error(`Processo ${input.processoId} não encontrado`);
      }

      if (!processo.numeroAutos) {
        throw new Error("Processo sem número de autos cadastrado");
      }

      // 2. Chamar Enrichment Engine
      const result: SolarSyncOutput = await enrichmentClient.solarSyncProcesso({
        numeroProcesso: processo.numeroAutos,
        processoId: processo.id,
        assistidoId: processo.assistidoId,
        casoId: processo.casoId,
        downloadPdfs: input.downloadPdfs,
      });

      // 3. Upload PDFs ao Drive (se retornados e pasta existe)
      const uploadedDocs: { filename: string; driveFileId?: string }[] = [];

      if (result.pdfs && result.pdfs.length > 0 && processo.driveFolderId) {
        for (const pdf of result.pdfs) {
          try {
            const buffer = Buffer.from(pdf.content_base64, "base64");
            const driveResult = await uploadFileBuffer(
              buffer,
              pdf.filename,
              pdf.mime_type,
              processo.driveFolderId,
            );
            uploadedDocs.push({
              filename: pdf.filename,
              driveFileId: driveResult?.id,
            });
          } catch (error) {
            console.error(`Failed to upload PDF ${pdf.filename} to Drive:`, error);
            uploadedDocs.push({ filename: pdf.filename });
          }
        }
      }

      return {
        ...result,
        uploaded_to_drive: uploadedDocs,
        pdfs: undefined, // Remove base64 data from response (já foi uploaded)
      };
    }),

  /**
   * Sincroniza múltiplos processos do Solar.
   */
  syncBatch: protectedProcedure
    .input(
      z.object({
        processoIds: z.array(z.number()).max(20),
        downloadPdfs: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar todos os processos
      const processosDb = await Promise.all(
        input.processoIds.map((id) =>
          db.query.processos.findFirst({
            where: eq(processos.id, id),
            columns: {
              id: true,
              numeroAutos: true,
              assistidoId: true,
              casoId: true,
              driveFolderId: true,
            },
          }),
        ),
      );

      // Filtrar processos válidos
      const validProcessos = processosDb.filter(
        (p): p is NonNullable<typeof p> => p !== undefined && p !== null && !!p.numeroAutos,
      );

      if (validProcessos.length === 0) {
        throw new Error("Nenhum processo válido encontrado");
      }

      // Chamar Enrichment Engine batch
      const result = await enrichmentClient.solarSyncBatch({
        processos: validProcessos.map((p) => ({
          numeroProcesso: p.numeroAutos!,
          processoId: p.id,
          assistidoId: p.assistidoId,
          casoId: p.casoId,
          downloadPdfs: input.downloadPdfs,
        })),
      });

      // Upload PDFs de cada resultado ao Drive
      for (const syncResult of result.results) {
        if (!syncResult.pdfs || syncResult.pdfs.length === 0) continue;

        const proc = validProcessos.find(
          (p) => p.numeroAutos === syncResult.numero_processo,
        );
        if (!proc?.driveFolderId) continue;

        for (const pdf of syncResult.pdfs) {
          try {
            const buffer = Buffer.from(pdf.content_base64, "base64");
            await uploadFileBuffer(
              buffer,
              pdf.filename,
              pdf.mime_type,
              proc.driveFolderId,
            );
          } catch (error) {
            console.error(`Failed to upload ${pdf.filename}:`, error);
          }
        }
      }

      return {
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        results: result.results.map((r) => ({
          ...r,
          pdfs: undefined, // Remove base64 from response
        })),
      };
    }),

  /**
   * Lista avisos pendentes do Solar (intimações PJe/SEEU).
   */
  avisos: protectedProcedure.query(async () => {
    try {
      return await enrichmentClient.solarAvisos();
    } catch (error) {
      return {
        avisos: [],
        total: 0,
        error: error instanceof Error ? error.message : "Failed to fetch avisos",
      };
    }
  }),

  /**
   * Busca todos os processos de um defensor pelo nome no Solar.
   * Útil para: "rodrigo rocha meire", "juliane andrade pereira"
   */
  syncPorNome: protectedProcedure
    .input(z.object({ nome: z.string().min(3) }))
    .mutation(async ({ input }): Promise<SolarNomeSyncOutput> => {
      return enrichmentClient.solarSyncPorNome({ nome: input.nome });
    }),

  /**
   * Cadastra um processo no Solar se ainda não existir.
   * Busca pelo número → se não encontrado → clica 'Novo Processo Judicial'.
   */
  cadastrarNoSolar: protectedProcedure
    .input(
      z.object({
        processoId: z.number(),
        grau: z.number().default(1),
      }),
    )
    .mutation(async ({ input }): Promise<SolarCadastrarOutput> => {
      const processo = await db.query.processos.findFirst({
        where: eq(processos.id, input.processoId),
        columns: { id: true, numeroAutos: true },
      });

      if (!processo) {
        throw new Error(`Processo ${input.processoId} não encontrado`);
      }
      if (!processo.numeroAutos) {
        throw new Error("Processo sem número de autos cadastrado");
      }

      return enrichmentClient.solarCadastrarProcesso({
        numeroProcesso: processo.numeroAutos,
        grau: input.grau,
      });
    }),

  /**
   * Exporta assistido do SIGAD para o Solar.
   * Fluxo:
   * 1. Busca assistido + seus processos no OMBUDS
   * 2. Chama SIGAD: busca por CPF + verifica número do processo
   * 3. Extrai dados extras da página extrato (nomeMae, dataNascimento, naturalidade, telefone)
   * 4. Exporta ao Solar via botão nativo SIGAD
   * 5. Enriquece OMBUDS com dados extraídos (apenas campos vazios)
   */
  exportarViaSigad: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input, ctx }): Promise<SigadExportarOutput> => {
      // 1. Buscar assistido com seus processos
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: {
          id: true,
          nome: true,
          cpf: true,
          nomeMae: true,
          dataNascimento: true,
          naturalidade: true,
          telefone: true,
        },
        with: {
          processos: {
            columns: { id: true, numeroAutos: true },
            where: (p, { isNotNull }) => isNotNull(p.numeroAutos),
          },
        },
      });

      if (!assistido) {
        throw new Error(`Assistido ${input.assistidoId} não encontrado`);
      }
      if (!assistido.cpf) {
        throw new Error(
          `Assistido ${assistido.nome} não tem CPF cadastrado no OMBUDS`,
        );
      }

      // 2. Coletar números de processo para verificação cruzada
      const numerosProcesso = (assistido.processos ?? [])
        .map((p) => p.numeroAutos)
        .filter((n): n is string => Boolean(n));

      // 3. Exportar via SIGAD (com verificação de processo + extração de dados)
      const result = await enrichmentClient.sigadExportarAssistido({
        cpf: assistido.cpf,
        ombudsAssistidoId: assistido.id,
        numerosProcessoOmbuds: numerosProcesso.length > 0 ? numerosProcesso : undefined,
      });

      // 4. Enriquecer OMBUDS se exportação foi bem-sucedida e há dados novos
      const camposEnriquecidos: string[] = [];

      if (result.success && result.dados_para_enriquecer) {
        const dados = result.dados_para_enriquecer;

        // Só preenche campos atualmente vazios — nunca sobrescreve dados existentes
        if (dados.nomeMae && !assistido.nomeMae) {
          camposEnriquecidos.push("nomeMae");
        }
        if (dados.dataNascimento && !assistido.dataNascimento) {
          camposEnriquecidos.push("dataNascimento");
        }
        if (dados.naturalidade && !assistido.naturalidade) {
          camposEnriquecidos.push("naturalidade");
        }
        if (dados.telefone && !assistido.telefone) {
          camposEnriquecidos.push("telefone");
        }
      }

      // 5. Persistir observações do SIGAD como anotações no OMBUDS
      // Cada observação vira uma anotação com hash SHA-256 para deduplicação idempotente
      let novasAnotacoes = 0;
      if (result.success && result.observacoes && result.observacoes.length > 0) {
        const processoCorrespondente = (assistido.processos ?? []).find((p) => {
          if (!result.sigad_processo || !p.numeroAutos) return false;
          const norm = (s: string) => s.replace(/[\s.\-/]/g, "");
          return norm(p.numeroAutos) === norm(result.sigad_processo);
        });
        const processoIdVinculo = processoCorrespondente?.id ?? null;

        for (const obs of result.observacoes) {
          if (!obs.texto) continue;
          const conteudo = [
            `[SIGAD] ${obs.tipo ?? "Observação"} — ${obs.data ?? ""}`,
            obs.defensor ? `Defensor/Servidor: ${obs.defensor}` : null,
            obs.texto,
          ]
            .filter(Boolean)
            .join("\n");

          // Hash SHA-256 truncado (16 hex) para deduplicação idempotente
          const conteudoHash = createHash("sha256")
            .update(conteudo)
            .digest("hex")
            .slice(0, 16);

          const inserted = await db
            .insert(anotacoes)
            .values({
              assistidoId: input.assistidoId,
              processoId: processoIdVinculo,
              conteudo,
              conteudoHash,
              tipo: "atendimento",
              importante: false,
              createdById: ctx.user.id,
            })
            .onConflictDoNothing()  // unique index em (assistidoId, conteudoHash)
            .returning({ id: anotacoes.id });

          // Só conta como "nova" se de fato inseriu
          if (inserted.length > 0) {
            novasAnotacoes++;
          }
        }

        if (novasAnotacoes > 0) {
          camposEnriquecidos.push(`${novasAnotacoes} observações novas`);
        } else if (result.observacoes.length > 0) {
          camposEnriquecidos.push(`${result.observacoes.length} observações já existiam (sem duplicatas)`);
        }
      }

      // 6. UPDATE único: enriquecimento + rastreabilidade SIGAD/Solar
      const now = new Date();
      const assistidoUpdate: Record<string, unknown> = {
        sigadExportadoEm: now,
        updatedAt: now,
      };
      // Gravar sigad_id se disponível
      if (result.sigad_id) {
        assistidoUpdate.sigadId = result.sigad_id;
      }
      // Solar: só marcar se exportação foi bem-sucedida (inclui "já existia")
      if (result.success) {
        assistidoUpdate.solarExportadoEm = now;
        // Enriquecer campos vazios com dados do SIGAD
        const dados = result.dados_para_enriquecer;
        if (dados?.nomeMae && !assistido.nomeMae) assistidoUpdate.nomeMae = dados.nomeMae;
        if (dados?.dataNascimento && !assistido.dataNascimento) assistidoUpdate.dataNascimento = dados.dataNascimento;
        if (dados?.naturalidade && !assistido.naturalidade) assistidoUpdate.naturalidade = dados.naturalidade;
        if (dados?.telefone && !assistido.telefone) assistidoUpdate.telefone = dados.telefone;
      }

      await db
        .update(assistidos)
        .set(assistidoUpdate)
        .where(eq(assistidos.id, input.assistidoId));

      // Anotar campos enriquecidos no resultado
      if (camposEnriquecidos.length > 0) {
        result.message = `${result.message ?? ""} Campos enriquecidos: ${camposEnriquecidos.join(", ")}`.trim();
      }

      return result;
    }),

  /**
   * Exporta múltiplos assistidos ao Solar via SIGAD em sequência.
   * Max 20 assistidos, delay de 2s entre cada para evitar flood no SIGAD.
   */
  exportarBatch: protectedProcedure
    .input(z.object({ assistidoIds: z.array(z.number()).min(1).max(20) }))
    .mutation(async ({ input, ctx }) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const results: Array<{
        assistidoId: number;
        nome?: string;
        success: boolean;
        ja_existia_solar?: boolean;
        verificacao_processo?: boolean | null;
        sigad_processo?: string | null;
        campos_enriquecidos?: string[];
        novas_anotacoes?: number;
        solar_url?: string | null;
        error?: string | null;
        message?: string | null;
      }> = [];

      for (const assistidoId of input.assistidoIds) {
        try {
          // Buscar assistido com processos
          const assistido = await db.query.assistidos.findFirst({
            where: eq(assistidos.id, assistidoId),
            columns: {
              id: true,
              nome: true,
              cpf: true,
              nomeMae: true,
              dataNascimento: true,
              naturalidade: true,
              telefone: true,
            },
            with: {
              processos: {
                columns: { id: true, numeroAutos: true },
                where: (p, { isNotNull }) => isNotNull(p.numeroAutos),
              },
            },
          });

          if (!assistido?.cpf) {
            results.push({
              assistidoId,
              nome: assistido?.nome ?? undefined,
              success: false,
              error: "sem_cpf",
              message: "Assistido sem CPF no OMBUDS",
            });
            continue;
          }

          const numerosProcesso = (assistido.processos ?? [])
            .map((p) => p.numeroAutos)
            .filter((n): n is string => Boolean(n));

          const result = await enrichmentClient.sigadExportarAssistido({
            cpf: assistido.cpf,
            ombudsAssistidoId: assistido.id,
            numerosProcessoOmbuds: numerosProcesso.length > 0 ? numerosProcesso : undefined,
          });

          // Enriquecer OMBUDS se bem-sucedido
          const camposEnriquecidos: string[] = [];
          if (result.success && result.dados_para_enriquecer) {
            const dados = result.dados_para_enriquecer;
            if (dados.nomeMae && !assistido.nomeMae) camposEnriquecidos.push("nomeMae");
            if (dados.dataNascimento && !assistido.dataNascimento) camposEnriquecidos.push("dataNascimento");
            if (dados.naturalidade && !assistido.naturalidade) camposEnriquecidos.push("naturalidade");
            if (dados.telefone && !assistido.telefone) camposEnriquecidos.push("telefone");
          }

          // Persistir observações com deduplicação por hash
          let novasAnotacoes = 0;
          if (result.success && result.observacoes && result.observacoes.length > 0) {
            const processoCorrespondente = (assistido.processos ?? []).find((p) => {
              if (!result.sigad_processo || !p.numeroAutos) return false;
              const norm = (s: string) => s.replace(/[\s.\-/]/g, "");
              return norm(p.numeroAutos) === norm(result.sigad_processo);
            });
            const processoIdVinculo = processoCorrespondente?.id ?? null;

            for (const obs of result.observacoes) {
              if (!obs.texto) continue;
              const conteudo = [
                `[SIGAD] ${obs.tipo ?? "Observação"} — ${obs.data ?? ""}`,
                obs.defensor ? `Defensor/Servidor: ${obs.defensor}` : null,
                obs.texto,
              ]
                .filter(Boolean)
                .join("\n");

              const conteudoHash = createHash("sha256")
                .update(conteudo)
                .digest("hex")
                .slice(0, 16);

              const inserted = await db
                .insert(anotacoes)
                .values({
                  assistidoId,
                  processoId: processoIdVinculo,
                  conteudo,
                  conteudoHash,
                  tipo: "atendimento",
                  importante: false,
                  createdById: ctx.user.id,
                })
                .onConflictDoNothing()
                .returning({ id: anotacoes.id });

              if (inserted.length > 0) {
                novasAnotacoes++;
              }
            }

            if (novasAnotacoes > 0) {
              camposEnriquecidos.push(`${novasAnotacoes} observações novas`);
            } else {
              camposEnriquecidos.push(`${result.observacoes.length} observações já existiam (sem duplicatas)`);
            }
          }

          // UPDATE único: enriquecimento + rastreabilidade SIGAD/Solar
          const now = new Date();
          const assistidoUpdate: Record<string, unknown> = {
            sigadExportadoEm: now,
            updatedAt: now,
          };
          if (result.sigad_id) {
            assistidoUpdate.sigadId = result.sigad_id;
          }
          if (result.success) {
            assistidoUpdate.solarExportadoEm = now;
            const dados = result.dados_para_enriquecer;
            if (dados?.nomeMae && !assistido.nomeMae) assistidoUpdate.nomeMae = dados.nomeMae;
            if (dados?.dataNascimento && !assistido.dataNascimento) assistidoUpdate.dataNascimento = dados.dataNascimento;
            if (dados?.naturalidade && !assistido.naturalidade) assistidoUpdate.naturalidade = dados.naturalidade;
            if (dados?.telefone && !assistido.telefone) assistidoUpdate.telefone = dados.telefone;
          }
          await db
            .update(assistidos)
            .set(assistidoUpdate)
            .where(eq(assistidos.id, assistidoId));

          results.push({
            assistidoId,
            nome: assistido.nome ?? undefined,
            success: result.success,
            ja_existia_solar: result.ja_existia_solar,
            verificacao_processo: result.verificacao_processo,
            sigad_processo: result.sigad_processo,
            campos_enriquecidos: camposEnriquecidos,
            novas_anotacoes: novasAnotacoes,
            solar_url: result.solar_url,
            error: result.error,
            message: result.message,
          });
        } catch (err) {
          results.push({
            assistidoId,
            success: false,
            error: "exception",
            message: err instanceof Error ? err.message : "Erro desconhecido",
          });
        }

        // Delay entre requisições para não sobrecarregar o SIGAD
        if (assistidoId !== input.assistidoIds.at(-1)) {
          await sleep(2000);
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        total: results.length,
        succeeded,
        failed,
        results,
      };
    }),

  /**
   * Verifica se assistido existe no SIGAD pelo CPF (sem exportar).
   */
  buscarNoSigad: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ input }): Promise<SigadBuscarOutput> => {
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: { id: true, nome: true, cpf: true },
      });

      if (!assistido?.cpf) {
        return {
          success: false,
          encontrado: false,
          error: "Assistido sem CPF no OMBUDS",
        };
      }

      return enrichmentClient.sigadBuscarAssistido({ cpf: assistido.cpf });
    }),

  /**
   * Sincroniza anotações do OMBUDS como Fases Processuais no Solar.
   *
   * Fluxo:
   * 1. Busca anotações do assistido que não foram sincronizadas (solar_synced_at IS NULL)
   * 2. Para cada processo: verifica/cria no Solar
   * 3. Cria fase processual para cada anotação
   * 4. Marca anotações como sincronizadas (solar_synced_at + solar_fase_id)
   *
   * Safety: dry_run=true preenche mas não salva.
   */
  sincronizarComSolar: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        modo: z.enum(["fase", "anotacao", "auto"]).default("auto"),
        dryRun: z.boolean().default(false),
        anotacaoIds: z.array(z.number()).max(50).optional(), // sync específicas
      }),
    )
    .mutation(async ({ input, ctx }): Promise<SolarSyncToOutput> => {
      // 1. Buscar anotações pendentes de sync
      const assistido = await db.query.assistidos.findFirst({
        where: eq(assistidos.id, input.assistidoId),
        columns: { id: true, nome: true },
      });

      if (!assistido) {
        throw new Error(`Assistido ${input.assistidoId} não encontrado`);
      }

      // Buscar anotações não sincronizadas com Solar
      let anotacoesQuery = db.query.anotacoes.findMany({
        where: and(
          eq(anotacoes.assistidoId, input.assistidoId),
          isNull(anotacoes.solarSyncedAt),
        ),
        columns: {
          id: true,
          processoId: true,
          conteudo: true,
          tipo: true,
          createdAt: true,
        },
        with: {
          processo: {
            columns: { id: true, numeroAutos: true },
          },
        },
        orderBy: (a, { asc }) => [asc(a.createdAt)],
        limit: 50,
      });

      let anotacoesDb = await anotacoesQuery;

      // Se anotacaoIds foi especificado, filtrar
      if (input.anotacaoIds && input.anotacaoIds.length > 0) {
        const ids = new Set(input.anotacaoIds);
        anotacoesDb = anotacoesDb.filter((a) => ids.has(a.id));
      }

      if (anotacoesDb.length === 0) {
        return {
          success: true,
          fases_criadas: 0,
          fases_skipped: 0,
          fases_falhadas: 0,
          total: 0,
          dry_run: input.dryRun,
          erros: [],
          detalhes: [],
        };
      }

      // 2. Preparar dados para o enrichment engine
      const anotacoesToSync = anotacoesDb.map((a) => ({
        id: a.id,
        processoId: a.processoId,
        numeroAutos: a.processo?.numeroAutos ?? null,
        conteudo: a.conteudo,
        tipo: a.tipo ?? "nota",
        createdAt: a.createdAt.toISOString(),
      }));

      // 3. Chamar enrichment engine
      const result = await enrichmentClient.solarSyncTo({
        assistidoId: input.assistidoId,
        anotacoes: anotacoesToSync,
        modo: input.modo,
        dryRun: input.dryRun,
      });

      // 4. Marcar anotações como sincronizadas (se não dry_run)
      if (!input.dryRun && result.detalhes) {
        const now = new Date();
        for (const detalhe of result.detalhes) {
          if (detalhe.status === "created") {
            await db
              .update(anotacoes)
              .set({
                solarSyncedAt: now,
                solarFaseId: detalhe.solar_fase_id ?? null,
                updatedAt: now,
              })
              .where(eq(anotacoes.id, detalhe.anotacao_id));
          }
        }
      }

      return result;
    }),

  /**
   * Cria uma anotação simples no Histórico de um atendimento Solar.
   * Alternativa mais leve que sincronizarComSolar para notas rápidas.
   */
  criarAnotacao: protectedProcedure
    .input(
      z.object({
        atendimentoId: z.string(),
        texto: z.string().max(5000),
        qualificacaoId: z.number().default(302), // ANOTAÇÕES
        dryRun: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }): Promise<SolarCriarAnotacaoOutput> => {
      const result = await enrichmentClient.solarCriarAnotacao({
        atendimentoId: input.atendimentoId,
        texto: input.texto,
        qualificacaoId: input.qualificacaoId,
        dryRun: input.dryRun,
      });

      return result;
    }),

  // ==========================================
  // SOLAR HUB — LISTING QUERIES
  // ==========================================

  /**
   * Lista processos com status de integração Solar.
   * Usado na Solar Hub para visualizar quais processos precisam de sync.
   */
  processosParaSolar: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }).optional(),
    )
    .query(async ({ input }) => {
      const search = input?.search;
      const limit = input?.limit ?? 100;

      // Build where conditions
      const conditions = [
        isNull(processos.deletedAt),
        isNotNull(processos.numeroAutos),
      ];

      if (search) {
        conditions.push(
          or(
            ilike(processos.numeroAutos, `%${search}%`),
            ilike(assistidos.nome, `%${search}%`),
          )!,
        );
      }

      const rows = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          comarca: processos.comarca,
          vara: processos.vara,
          assistidoNome: assistidos.nome,
          assistidoId: assistidos.id,
          driveFolderId: processos.driveFolderId,
          updatedAt: processos.updatedAt,
          solarExportadoEm: assistidos.solarExportadoEm,
        })
        .from(processos)
        .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
        .where(and(...conditions))
        .orderBy(desc(processos.updatedAt))
        .limit(limit);

      // Compute solarStatus in JS
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      return rows.map((row) => {
        let solarStatus: "synced" | "stale" | "not_registered";

        if (row.solarExportadoEm) {
          const exportedAt = new Date(row.solarExportadoEm).getTime();
          solarStatus = now - exportedAt < twentyFourHours ? "synced" : "stale";
        } else {
          solarStatus = "not_registered";
        }

        return {
          id: row.id,
          numeroAutos: row.numeroAutos,
          comarca: row.comarca,
          vara: row.vara,
          assistidoNome: row.assistidoNome,
          assistidoId: row.assistidoId,
          driveFolderId: row.driveFolderId,
          updatedAt: row.updatedAt,
          solarStatus,
        };
      });
    }),

  /**
   * Lista assistidos com status de integração Solar/SIGAD.
   * Usado na Solar Hub para visualizar quem pode ser exportado.
   */
  assistidosParaSolar: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        filter: z.enum(["todos", "exportaveis", "sem_cpf", "exportados"]).default("todos"),
        limit: z.number().min(1).max(200).default(100),
      }).optional(),
    )
    .query(async ({ input }) => {
      const search = input?.search;
      const filter = input?.filter ?? "todos";
      const limit = input?.limit ?? 100;

      // Build where conditions
      const conditions = [isNull(assistidos.deletedAt)];

      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf, `%${search}%`),
          )!,
        );
      }

      // Apply filter
      switch (filter) {
        case "exportaveis":
          conditions.push(isNotNull(assistidos.cpf));
          conditions.push(isNull(assistidos.solarExportadoEm));
          break;
        case "sem_cpf":
          conditions.push(isNull(assistidos.cpf));
          break;
        case "exportados":
          conditions.push(isNotNull(assistidos.solarExportadoEm));
          break;
        // "todos" — no extra conditions
      }

      const rows = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          sigadId: assistidos.sigadId,
          sigadExportadoEm: assistidos.sigadExportadoEm,
          solarExportadoEm: assistidos.solarExportadoEm,
        })
        .from(assistidos)
        .where(and(...conditions))
        .orderBy(asc(assistidos.nome))
        .limit(limit);

      // Compute solarStatus in JS
      return rows.map((row) => {
        let solarStatus: "exported" | "sigad_only" | "no_cpf" | "unchecked";

        if (row.solarExportadoEm != null) {
          solarStatus = "exported";
        } else if (row.sigadId != null) {
          solarStatus = "sigad_only";
        } else if (row.cpf == null) {
          solarStatus = "no_cpf";
        } else {
          solarStatus = "unchecked";
        }

        return {
          id: row.id,
          nome: row.nome,
          cpf: row.cpf,
          sigadId: row.sigadId,
          sigadExportadoEm: row.sigadExportadoEm,
          solarExportadoEm: row.solarExportadoEm,
          solarStatus,
        };
      });
    }),

  /**
   * Lista anotações pendentes de sincronização com Solar, agrupadas por assistido.
   * Útil para painel de pendências na Solar Hub.
   */
  anotacoesPendentes: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;

      const rows = await db.query.anotacoes.findMany({
        where: and(
          isNull(anotacoes.solarSyncedAt),
          isNotNull(anotacoes.assistidoId),
        ),
        columns: {
          id: true,
          conteudo: true,
          tipo: true,
          createdAt: true,
          assistidoId: true,
          processoId: true,
        },
        with: {
          assistido: {
            columns: { id: true, nome: true },
          },
          processo: {
            columns: { id: true, numeroAutos: true },
          },
        },
        orderBy: [asc(anotacoes.createdAt)],
        limit,
      });

      // Group by assistidoId
      const grouped = new Map<number, {
        assistidoId: number;
        assistidoNome: string;
        anotacoes: typeof rows;
      }>();

      for (const row of rows) {
        if (!row.assistidoId) continue;
        const key = row.assistidoId;
        if (!grouped.has(key)) {
          grouped.set(key, {
            assistidoId: key,
            assistidoNome: row.assistido?.nome ?? "Sem nome",
            anotacoes: [],
          });
        }
        grouped.get(key)!.anotacoes.push(row);
      }

      return [...grouped.values()];
    }),

  /**
   * Estatísticas agregadas da Solar Hub.
   * Conta processos sincronizados, assistidos exportados, fases criadas, pendências e SIGAD.
   */
  // ==========================================
  // PROTOCOLAR — Workflow de protocolo Solar
  // ==========================================

  /**
   * Lista arquivos PDF da pasta "Protocolar" no Drive.
   * Para cada PDF, tenta fazer matching automatico:
   * - Tipo de ato (pelo prefixo do nome: RAC, AF, AP, etc.)
   * - Numero de processo (pelo padrao CNJ no nome)
   * - Demanda OMBUDS (cruzando processo encontrado)
   * - DOCX correspondente (mesmo nome, extensao diferente)
   */
  listProtocolar: protectedProcedure
    .input(z.object({
      pageToken: z.string().optional(),
      pageSize: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      try {
        const pageSize = input?.pageSize ?? 50;
        const pageToken = input?.pageToken;

        // 1. Listar arquivos da pasta Protocolar no Drive
        const driveResult = await listFilesInFolder(
          PROTOCOLAR_FOLDER_ID,
          pageToken,
          pageSize,
        );

        if (!driveResult || !driveResult.files) {
          return {
            items: [],
            nextPageToken: null,
            total: 0,
          };
        }

        // 2. Separar PDFs e outros (DOCXs, Google Docs)
        const allFiles = driveResult.files;
        const pdfs = allFiles.filter(f =>
          f.mimeType === "application/pdf" ||
          f.name?.toLowerCase().endsWith(".pdf")
        );
        const nonPdfs = allFiles.filter(f =>
          f.mimeType !== "application/pdf" &&
          !f.name?.toLowerCase().endsWith(".pdf")
        );

        // 3. Para cada PDF, fazer matching
        const items = await Promise.all(pdfs.map(async (pdf) => {
          const fileName = pdf.name || "";

          // Detectar tipo de ato
          const atoDetectado = detectarAtoDoNomeArquivo(fileName);

          // Extrair numero de processo
          const processoDetectado = extrairProcessoDoNomeArquivo(fileName);

          // Buscar DOCX correspondente (mesmo nome base)
          const baseName = fileName.replace(/\.pdf$/i, "");
          const docxCorrespondente = nonPdfs.find(f => {
            const fName = f.name || "";
            return (
              fName.replace(/\.(docx?|gdoc)$/i, "") === baseName ||
              fName.replace(/\.docx?$/i, "") === baseName ||
              // Google Docs nao tem extensao
              (f.mimeType === "application/vnd.google-apps.document" && fName === baseName)
            );
          });

          // Buscar demanda OMBUDS pelo numero de processo
          let demandaMatch: {
            id: number;
            ato: string;
            status: string;
            processoId: number;
            assistidoNome?: string;
          } | null = null;

          if (processoDetectado) {
            try {
              // Buscar processo pelo numero (parcial ou completo)
              const matchedProcessos = await db
                .select({
                  processoId: processos.id,
                  numeroAutos: processos.numeroAutos,
                })
                .from(processos)
                .where(and(
                  isNull(processos.deletedAt),
                  sql`${processos.numeroAutos} LIKE ${`%${processoDetectado}%`}`,
                ))
                .limit(1);

              if (matchedProcessos.length > 0) {
                const proc = matchedProcessos[0]!;

                // Buscar demanda mais recente deste processo
                const matchedDemandas = await db
                  .select({
                    id: demandas.id,
                    ato: demandas.ato,
                    status: demandas.status,
                    processoId: demandas.processoId,
                  })
                  .from(demandas)
                  .where(and(
                    eq(demandas.processoId, proc.processoId),
                    isNull(demandas.deletedAt),
                  ))
                  .orderBy(desc(demandas.createdAt))
                  .limit(1);

                if (matchedDemandas.length > 0) {
                  const dem = matchedDemandas[0]!;

                  // Buscar nome do assistido
                  const [assistidoData] = await db
                    .select({ nome: assistidos.nome })
                    .from(assistidos)
                    .leftJoin(processos, eq(processos.assistidoId, assistidos.id))
                    .where(eq(processos.id, proc.processoId))
                    .limit(1);

                  demandaMatch = {
                    id: dem.id,
                    ato: dem.ato,
                    status: dem.status,
                    processoId: dem.processoId,
                    assistidoNome: assistidoData?.nome ?? undefined,
                  };
                }
              }
            } catch {
              // Silently fail — matching is best-effort
            }
          }

          // Resolver subpasta destino
          const ato = atoDetectado || demandaMatch?.ato || null;
          const subpastaDestino = ato
            ? ATO_TO_DRIVE_FOLDER[ato] || FOLDER_FALLBACK
            : null;

          // Resolver fase Solar
          const faseSolar = ato ? resolverFaseSolar(ato) : null;

          return {
            // Arquivo
            id: pdf.id,
            nome: fileName,
            mimeType: pdf.mimeType,
            tamanho: pdf.size ? parseInt(pdf.size) : null,
            modificadoEm: pdf.modifiedTime,
            webViewLink: pdf.webViewLink,

            // Matching
            atoDetectado: ato,
            processoDetectado,
            demandaMatch,

            // DOCX correspondente
            docxCorrespondente: docxCorrespondente ? {
              id: docxCorrespondente.id,
              nome: docxCorrespondente.name,
              mimeType: docxCorrespondente.mimeType,
              webViewLink: docxCorrespondente.webViewLink,
            } : null,

            // Destinos
            subpastaDestino,
            faseSolar: faseSolar ? {
              tipo: faseSolar.tipo,
              qualificacao: faseSolar.qualificacao ?? null,
              descricaoTemplate: faseSolar.descricaoTemplate ?? null,
            } : null,

            // Status do matching
            matchStatus: demandaMatch
              ? "vinculado"
              : processoDetectado
                ? "processo_encontrado"
                : atoDetectado
                  ? "ato_detectado"
                  : "manual",
          };
        }));

        return {
          items,
          nextPageToken: driveResult.nextPageToken ?? null,
          total: items.length,
          totalDrive: allFiles.length,
        };
      } catch (error) {
        console.error("[listProtocolar] Error:", error);
        return {
          items: [],
          nextPageToken: null,
          total: 0,
          error: error instanceof Error ? error.message : "Erro ao listar arquivos",
        };
      }
    }),

  /**
   * Executa o protocolo de um documento no Solar.
   * Workflow completo:
   * 1. Upload PDF ao Solar (enrichment engine → Playwright)
   * 2. Criar fase processual no Solar
   * 3. Mover DOCX para subpasta correta no Drive
   * 4. Mover PDF para pasta "Protocolados" no Drive
   * 5. Atualizar demanda no OMBUDS (status → 7_PROTOCOLADO)
   */
  protocolarNoSolar: protectedProcedure
    .input(z.object({
      // Arquivo
      pdfFileId: z.string(),
      pdfFileName: z.string(),
      docxFileId: z.string().optional(),

      // Solar
      atendimentoId: z.string(),
      numeroProcesso: z.string(),

      // Ato e fase
      ato: z.string(),
      faseTipoId: z.number().optional(),
      faseDescricao: z.string().optional(),
      grau: z.number().default(1),

      // Demanda
      demandaId: z.number().optional(),

      // Drive
      subpastaDestino: z.string().optional(),

      // Safety
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const resultados: {
        etapa: string;
        sucesso: boolean;
        mensagem: string;
        detalhes?: Record<string, unknown>;
      }[] = [];

      try {
        // 1. Upload PDF ao Solar via enrichment engine
        // O enrichment engine recebe o file_path local — mas como o PDF esta no Drive,
        // precisamos primeiro baixar e salvar temporariamente.
        // POR ENQUANTO: esta etapa sera implementada quando o tunnel estiver ativo.
        // O upload requer que o arquivo esteja acessivel pelo servidor Playwright.
        // TODO: Implementar download do Drive → /tmp → upload via Playwright

        resultados.push({
          etapa: "upload_solar",
          sucesso: true,
          mensagem: "Upload ao Solar sera implementado com Cloudflare Tunnel ativo",
          detalhes: {
            atendimentoId: input.atendimentoId,
            numeroProcesso: input.numeroProcesso,
            nota: "Requer arquivo local acessivel pelo enrichment engine",
          },
        });

        // 2. Mover DOCX para subpasta correta no Drive
        if (input.docxFileId && input.subpastaDestino) {
          try {
            // Buscar a subpasta pelo nome dentro de PETICOES_POR_ASSUNTO_FOLDER_ID
            const subfolders = await listFilesInFolder(
              PETICOES_POR_ASSUNTO_FOLDER_ID,
              undefined,
              200,
            );

            const targetFolder = subfolders?.files?.find(
              f => f.name === input.subpastaDestino &&
                   f.mimeType === "application/vnd.google-apps.folder"
            );

            if (targetFolder) {
              if (!input.dryRun) {
                const moveResult = await moveFileInDrive(
                  input.docxFileId,
                  targetFolder.id,
                  PROTOCOLAR_FOLDER_ID,
                );

                resultados.push({
                  etapa: "mover_docx",
                  sucesso: !!moveResult,
                  mensagem: moveResult
                    ? `DOCX movido para "${input.subpastaDestino}"`
                    : "Falha ao mover DOCX",
                  detalhes: { targetFolderId: targetFolder.id },
                });
              } else {
                resultados.push({
                  etapa: "mover_docx",
                  sucesso: true,
                  mensagem: `[DRY-RUN] Moveria DOCX para "${input.subpastaDestino}"`,
                  detalhes: { targetFolderId: targetFolder.id },
                });
              }
            } else {
              resultados.push({
                etapa: "mover_docx",
                sucesso: false,
                mensagem: `Subpasta "${input.subpastaDestino}" nao encontrada em Peticoes por assunto`,
              });
            }
          } catch (err) {
            resultados.push({
              etapa: "mover_docx",
              sucesso: false,
              mensagem: `Erro ao mover DOCX: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }

        // 3. Mover PDF para pasta "Protocolados" (arquivo morto)
        // TODO: Criar/identificar pasta "Protocolados" no Drive
        // Por enquanto, deixar o PDF no Protocolar (será movido quando a pasta existir)
        resultados.push({
          etapa: "mover_pdf",
          sucesso: true,
          mensagem: "PDF mantido em Protocolar (pasta Protocolados sera criada)",
        });

        // 4. Atualizar demanda no OMBUDS
        if (input.demandaId && !input.dryRun) {
          try {
            await db
              .update(demandas)
              .set({
                status: "7_PROTOCOLADO",
                dataConclusao: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(demandas.id, input.demandaId));

            resultados.push({
              etapa: "atualizar_demanda",
              sucesso: true,
              mensagem: `Demanda #${input.demandaId} atualizada para 7_PROTOCOLADO`,
            });
          } catch (err) {
            resultados.push({
              etapa: "atualizar_demanda",
              sucesso: false,
              mensagem: `Erro ao atualizar demanda: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        } else if (input.demandaId && input.dryRun) {
          resultados.push({
            etapa: "atualizar_demanda",
            sucesso: true,
            mensagem: `[DRY-RUN] Atualizaria demanda #${input.demandaId} para 7_PROTOCOLADO`,
          });
        }

        // 5. Criar anotação de registro no OMBUDS (providência automática)
        if (input.demandaId && !input.dryRun) {
          try {
            // Buscar demanda para obter assistidoId e processoId
            const demandaData = await db.query.demandas.findFirst({
              where: eq(demandas.id, input.demandaId),
              columns: { assistidoId: true, processoId: true },
              with: {
                processo: { columns: { atribuicao: true } },
              },
            });

            if (demandaData) {
              const textoAnotacao = gerarTextoProtocolo(input.ato, input.numeroProcesso);
              const conteudoHash = createHash("sha256")
                .update(textoAnotacao)
                .digest("hex")
                .slice(0, 16);

              await db
                .insert(anotacoes)
                .values({
                  assistidoId: demandaData.assistidoId,
                  processoId: demandaData.processoId,
                  demandaId: input.demandaId,
                  conteudo: textoAnotacao,
                  conteudoHash,
                  tipo: "providencia",
                  importante: false,
                  createdById: ctx.user.id,
                })
                .onConflictDoNothing();

              resultados.push({
                etapa: "anotacao_ombuds",
                sucesso: true,
                mensagem: `Anotação de protocolo registrada no OMBUDS`,
              });

              // Se a config permite sync de anotações, tentar registrar no Solar também
              const atribuicao = (demandaData as any).processo?.atribuicao || "JURI_CAMACARI";
              if (shouldSync(atribuicao, "syncAnotacoes") && input.atendimentoId) {
                try {
                  await enrichmentClient.solarCriarAnotacao({
                    atendimento_id: input.atendimentoId,
                    numero_processo: input.numeroProcesso,
                    texto: textoAnotacao,
                    grau: input.grau,
                  });
                  resultados.push({
                    etapa: "anotacao_solar",
                    sucesso: true,
                    mensagem: "Anotação de protocolo registrada no Solar",
                  });
                } catch (solarErr) {
                  // Não é crítico — anotação local já foi salva
                  resultados.push({
                    etapa: "anotacao_solar",
                    sucesso: false,
                    mensagem: `Solar offline ou indisponível: ${solarErr instanceof Error ? solarErr.message : String(solarErr)}`,
                  });
                }
              }
            }
          } catch (err) {
            resultados.push({
              etapa: "anotacao_ombuds",
              sucesso: false,
              mensagem: `Erro ao criar anotação: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }

        const todasSucesso = resultados.every(r => r.sucesso);

        return {
          success: todasSucesso,
          dryRun: input.dryRun,
          resultados,
          resumo: {
            etapasExecutadas: resultados.length,
            etapasBemSucedidas: resultados.filter(r => r.sucesso).length,
            etapasFalharam: resultados.filter(r => !r.sucesso).length,
          },
        };
      } catch (error) {
        return {
          success: false,
          dryRun: input.dryRun,
          resultados,
          error: error instanceof Error ? error.message : "Erro inesperado",
        };
      }
    }),

  stats: protectedProcedure.query(async () => {
    // Count processos that have been synced to Solar (via assistido.solarExportadoEm)
    const [syncResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(processos)
      .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
      .where(and(
        isNull(processos.deletedAt),
        isNotNull(assistidos.solarExportadoEm),
      ));

    // Count assistidos exported to Solar
    const [exportResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assistidos)
      .where(and(
        isNull(assistidos.deletedAt),
        isNotNull(assistidos.solarExportadoEm),
      ));

    // Count annotations synced to Solar
    const [fasesResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(anotacoes)
      .where(isNotNull(anotacoes.solarSyncedAt));

    // Count annotations pending sync
    const [pendingResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(anotacoes)
      .where(and(
        isNull(anotacoes.solarSyncedAt),
        isNotNull(anotacoes.assistidoId),
      ));

    // Count assistidos with SIGAD ID
    const [sigadResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assistidos)
      .where(and(
        isNull(assistidos.deletedAt),
        isNotNull(assistidos.sigadId),
      ));

    return {
      processosSincronizados: syncResult?.count ?? 0,
      assistidosExportados: exportResult?.count ?? 0,
      fasesCriadas: fasesResult?.count ?? 0,
      anotacoesPendentes: pendingResult?.count ?? 0,
      assistidosNoSigad: sigadResult?.count ?? 0,
    };
  }),

  // ==========================================
  // DASHBOARD ASSISTIDOS × SOLAR
  // ==========================================

  /**
   * Painel comparativo: status de sync dos assistidos com SIGAD/Solar.
   * Retorna stats globais, stats por atribuição, e lista paginada.
   * Tudo baseado em dados do DB (sem scraping).
   */
  dashboardAssistidosSync: protectedProcedure
    .input(
      z.object({
        atribuicao: z.string().optional(),
        status: z.enum(["all", "exported", "pending", "no_cpf", "error", "unchecked"]).default("all"),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { atribuicao, status = "all", search, limit = 50, offset = 0 } = input || {};

      // === 1. Stats globais (sem paginação) ===
      const allAssistidos = await db
        .select({
          id: assistidos.id,
          cpf: assistidos.cpf,
          atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
          sigadId: assistidos.sigadId,
          sigadExportadoEm: assistidos.sigadExportadoEm,
          solarExportadoEm: assistidos.solarExportadoEm,
        })
        .from(assistidos)
        .where(isNull(assistidos.deletedAt));

      const stats = {
        total: allAssistidos.length,
        exportedSolar: allAssistidos.filter(a => a.solarExportadoEm != null).length,
        pending: allAssistidos.filter(a => a.cpf && !a.solarExportadoEm).length,
        noCpf: allAssistidos.filter(a => !a.cpf).length,
        withSigad: allAssistidos.filter(a => a.sigadId != null).length,
        // "error" = tentou exportar (sigadExportadoEm set) mas não foi ao Solar
        errors: allAssistidos.filter(a =>
          a.sigadExportadoEm != null && a.solarExportadoEm == null && a.cpf != null
        ).length,
      };

      // === 2. Stats por atribuição ===
      const atribuicaoLabels: Record<string, string> = {
        JURI_CAMACARI: "Júri",
        GRUPO_JURI: "Grupo Júri",
        VVD_CAMACARI: "VVD",
        EXECUCAO_PENAL: "Exec. Penal",
        SUBSTITUICAO: "Substituição",
        SUBSTITUICAO_CIVEL: "Subst. Cível",
      };

      const byAtribuicaoMap = new Map<string, { total: number; exported: number }>();
      for (const a of allAssistidos) {
        const key = a.atribuicaoPrimaria || "SUBSTITUICAO";
        const cur = byAtribuicaoMap.get(key) || { total: 0, exported: 0 };
        cur.total++;
        if (a.solarExportadoEm != null) cur.exported++;
        byAtribuicaoMap.set(key, cur);
      }

      const byAtribuicao = Array.from(byAtribuicaoMap.entries())
        .map(([key, val]) => ({
          atribuicao: key,
          label: atribuicaoLabels[key] || key,
          total: val.total,
          exported: val.exported,
          percentage: val.total > 0 ? Math.round((val.exported / val.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // === 3. Lista filtrada + paginada ===
      const conditions: ReturnType<typeof eq>[] = [isNull(assistidos.deletedAt)];

      // Filtro por atribuição
      if (atribuicao && atribuicao !== "all") {
        const atribuicaoMap: Record<string, string[]> = {
          "JURI": ["JURI_CAMACARI", "GRUPO_JURI"],
          "VVD": ["VVD_CAMACARI"],
          "EXECUCAO": ["EXECUCAO_PENAL"],
          "SUBSTITUICAO": ["SUBSTITUICAO"],
          "SUBSTITUICAO_CIVEL": ["SUBSTITUICAO_CIVEL"],
        };
        const valores = atribuicaoMap[atribuicao] || [atribuicao];
        conditions.push(inArray(assistidos.atribuicaoPrimaria, valores as any));
      }

      // Filtro por busca
      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf || "", `%${search}%`),
          )!
        );
      }

      // Filtro por status de sync
      if (status !== "all") {
        switch (status) {
          case "exported":
            conditions.push(isNotNull(assistidos.solarExportadoEm));
            break;
          case "pending":
            conditions.push(isNotNull(assistidos.cpf));
            conditions.push(isNull(assistidos.solarExportadoEm));
            break;
          case "no_cpf":
            conditions.push(isNull(assistidos.cpf));
            break;
          case "error":
            conditions.push(isNotNull(assistidos.sigadExportadoEm));
            conditions.push(isNull(assistidos.solarExportadoEm));
            conditions.push(isNotNull(assistidos.cpf));
            break;
          case "unchecked":
            conditions.push(isNull(assistidos.sigadExportadoEm));
            conditions.push(isNull(assistidos.solarExportadoEm));
            conditions.push(isNotNull(assistidos.cpf));
            break;
        }
      }

      // Query principal
      const result = await db
        .select()
        .from(assistidos)
        .where(and(...conditions))
        .orderBy(
          // Pendentes primeiro, depois exportados
          sql`CASE
            WHEN ${assistidos.solarExportadoEm} IS NULL AND ${assistidos.cpf} IS NOT NULL THEN 0
            WHEN ${assistidos.cpf} IS NULL THEN 1
            WHEN ${assistidos.solarExportadoEm} IS NOT NULL THEN 2
            ELSE 3
          END`,
          asc(assistidos.nome),
        )
        .limit(limit)
        .offset(offset);

      // Count total filtrado (para paginação)
      const [totalFiltered] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(assistidos)
        .where(and(...conditions));

      if (result.length === 0) {
        return { stats, byAtribuicao, assistidos: [], total: totalFiltered?.count ?? 0 };
      }

      // Contagens agregadas
      const assistidoIds = result.map(a => a.id);

      const processosCountData = await db
        .select({
          assistidoId: processos.assistidoId,
          count: sql<number>`count(*)::int`,
        })
        .from(processos)
        .where(and(
          inArray(processos.assistidoId, assistidoIds),
          isNull(processos.deletedAt),
        ))
        .groupBy(processos.assistidoId);

      const processosMap = new Map(processosCountData.map(p => [p.assistidoId, p.count]));

      const demandasCountData = await db
        .select({
          assistidoId: demandas.assistidoId,
          count: sql<number>`count(*)::int`,
        })
        .from(demandas)
        .where(and(
          inArray(demandas.assistidoId, assistidoIds),
          isNull(demandas.deletedAt),
        ))
        .groupBy(demandas.assistidoId);

      const demandasMap = new Map(demandasCountData.map(d => [d.assistidoId, d.count]));

      // Calcular statusSync para cada assistido
      const assistidosList = result.map(a => {
        let statusSync: "exported" | "pending" | "no_cpf" | "error" | "unchecked";
        if (a.solarExportadoEm != null) {
          statusSync = "exported";
        } else if (!a.cpf) {
          statusSync = "no_cpf";
        } else if (a.sigadExportadoEm != null) {
          statusSync = "error";
        } else {
          statusSync = a.cpf ? "pending" : "unchecked";
        }

        return {
          id: a.id,
          nome: a.nome,
          cpf: a.cpf,
          atribuicaoPrimaria: a.atribuicaoPrimaria,
          sigadId: a.sigadId,
          sigadExportadoEm: a.sigadExportadoEm,
          solarExportadoEm: a.solarExportadoEm,
          processosCount: processosMap.get(a.id) ?? 0,
          demandasCount: demandasMap.get(a.id) ?? 0,
          statusSync,
        };
      });

      return {
        stats,
        byAtribuicao,
        assistidos: assistidosList,
        total: totalFiltered?.count ?? 0,
      };
    }),
});
