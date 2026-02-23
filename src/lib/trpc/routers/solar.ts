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
import { processos, documentos, anotacoes, assistidos } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  enrichmentClient,
  type SolarSyncOutput,
  type SolarNomeSyncOutput,
  type SolarCadastrarOutput,
  type SigadExportarOutput,
  type SigadBuscarOutput,
} from "@/lib/services/enrichment-client";
import { uploadFileBuffer } from "@/lib/services/google-drive";

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
});
