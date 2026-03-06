import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../init";
import { db } from "@/lib/db";
import {
  avaliacoesJuri,
  avaliacaoJurados,
  avaliacaoTestemunhasJuri,
  argumentosSustentacao,
  sessoesJuri,
  jurados,
  personagensJuri,
  dosimetriaJuri,
  documentosJuri,
  quesitos,
} from "@/lib/db/schema";
import { eq, desc, and, or, isNull, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Schema de validação para jurado na avaliação
const avaliacaoJuradoSchema = z.object({
  posicao: z.number().min(1).max(7),
  juradoId: z.number().optional(),
  nome: z.string().optional(),
  profissao: z.string().optional(),
  idadeAproximada: z.number().optional(),
  sexo: z.string().optional(),
  aparenciaPrimeiraImpressao: z.string().optional(),
  linguagemCorporalInicial: z.string().optional(),
  tendenciaVoto: z.enum(["CONDENAR", "ABSOLVER", "INDECISO"]).optional(),
  nivelConfianca: z.enum(["BAIXA", "MEDIA", "ALTA"]).optional(),
  justificativaTendencia: z.string().optional(),
  anotacoesInterrogatorio: z.string().optional(),
  anotacoesMp: z.string().optional(),
  anotacoesDefesa: z.string().optional(),
  anotacoesGerais: z.string().optional(),
});

// Schema de validação para testemunha na avaliação
const avaliacaoTestemunhaSchema = z.object({
  ordem: z.number(),
  testemunhaId: z.number().optional(),
  nome: z.string(),
  resumoDepoimento: z.string().optional(),
  reacaoJurados: z.string().optional(),
  expressoesFaciaisLinguagem: z.string().optional(),
  credibilidade: z.number().min(1).max(10).optional(),
  observacoesComplementares: z.string().optional(),
});

// Schema de validação para argumento
const argumentoSchema = z.object({
  tipo: z.enum(["mp", "defesa"]),
  ordem: z.number(),
  descricaoArgumento: z.string().optional(),
  reacaoJurados: z.string().optional(),
  nivelPersuasao: z.number().min(1).max(10).optional(),
});

export const avaliacaoJuriRouter = router({
  // Criar nova avaliação
  create: protectedProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        processoId: z.number().optional(),
        observador: z.string(),
        dataJulgamento: z.string(),
        horarioInicio: z.string().optional(),
        duracaoEstimada: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se a sessão existe
      const sessao = await db.query.sessoesJuri.findFirst({
        where: eq(sessoesJuri.id, input.sessaoJuriId),
      });

      if (!sessao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      const [avaliacao] = await db
        .insert(avaliacoesJuri)
        .values({
          sessaoJuriId: input.sessaoJuriId,
          processoId: input.processoId || sessao.processoId,
          observador: input.observador,
          dataJulgamento: input.dataJulgamento,
          horarioInicio: input.horarioInicio,
          duracaoEstimada: input.duracaoEstimada,
          status: "em_andamento",
          criadoPorId: ctx.user.id,
        })
        .returning();

      // Criar os 7 registros de jurados
      const juradosData = Array.from({ length: 7 }, (_, i) => ({
        avaliacaoJuriId: avaliacao.id,
        posicao: i + 1,
      }));

      await db.insert(avaliacaoJurados).values(juradosData);

      return avaliacao;
    }),

  // Buscar avaliação por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const avaliacao = await db.query.avaliacoesJuri.findFirst({
        where: eq(avaliacoesJuri.id, input.id),
        with: {
          avaliacaoJurados: true,
          avaliacaoTestemunhas: true,
          argumentos: true,
        },
      });

      return avaliacao;
    }),

  // Buscar avaliação por sessão do júri
  getBySessaoId: protectedProcedure
    .input(z.object({ sessaoJuriId: z.number() }))
    .query(async ({ input }) => {
      const avaliacao = await db.query.avaliacoesJuri.findFirst({
        where: eq(avaliacoesJuri.sessaoJuriId, input.sessaoJuriId),
        with: {
          avaliacaoJurados: true,
          avaliacaoTestemunhas: true,
          argumentos: true,
        },
      });

      return avaliacao;
    }),

  // Listar avaliações
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { status, limit = 50, offset = 0 } = input || {};

      let conditions = [];
      if (status && status !== "all") {
        conditions.push(eq(avaliacoesJuri.status, status));
      }

      const result = await db
        .select()
        .from(avaliacoesJuri)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(avaliacoesJuri.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  // Atualizar avaliação principal
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        // Contexto
        observador: z.string().optional(),
        horarioInicio: z.string().optional(),
        duracaoEstimada: z.string().optional(),
        descricaoAmbiente: z.string().optional(),
        disposicaoFisica: z.string().optional(),
        climaEmocionalInicial: z.string().optional(),
        presencaPublicoMidia: z.string().optional(),
        // Interrogatório
        interrogatorioReacaoGeral: z.string().optional(),
        interrogatorioJuradosAcreditaram: z.string().optional(),
        interrogatorioJuradosCeticos: z.string().optional(),
        interrogatorioMomentosImpacto: z.string().optional(),
        interrogatorioContradicoes: z.string().optional(),
        interrogatorioImpressaoCredibilidade: z.string().optional(),
        interrogatorioNivelCredibilidade: z.number().min(1).max(10).optional(),
        // MP
        mpEstrategiaGeral: z.string().optional(),
        mpImpactoGeral: z.number().min(1).max(10).optional(),
        mpInclinacaoCondenar: z.string().optional(),
        // Defesa
        defesaEstrategiaGeral: z.string().optional(),
        defesaImpactoGeral: z.number().min(1).max(10).optional(),
        defesaDuvidaRazoavel: z.string().optional(),
        // Réplica
        replicaRefutacoes: z.string().optional(),
        replicaArgumentosNovos: z.string().optional(),
        replicaReacaoGeral: z.string().optional(),
        replicaImpacto: z.number().min(1).max(10).optional(),
        replicaMudancaOpiniao: z.string().optional(),
        // Tréplica
        treplicaRefutacoes: z.string().optional(),
        treplicaApeloFinal: z.string().optional(),
        treplicaReacaoGeral: z.string().optional(),
        treplicaMomentoImpactante: z.string().optional(),
        treplicaImpacto: z.number().min(1).max(10).optional(),
        treplicaReconquistaIndecisos: z.string().optional(),
        // Análise Final
        ladoMaisPersuasivo: z.string().optional(),
        impactoAcusacao: z.number().min(1).max(10).optional(),
        impactoDefesa: z.number().min(1).max(10).optional(),
        impressaoFinalLeiga: z.string().optional(),
        argumentoMaisImpactante: z.string().optional(),
        pontosNaoExplorados: z.string().optional(),
        climaGeralJulgamento: z.string().optional(),
        momentosVirada: z.string().optional(),
        surpresasJulgamento: z.string().optional(),
        observacoesAdicionais: z.string().optional(),
        // Status
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(avaliacoesJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(avaliacoesJuri.id, id))
        .returning();

      return atualizado;
    }),

  // Atualizar jurado na avaliação
  updateJurado: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        posicao: z.number().min(1).max(7),
        data: avaliacaoJuradoSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, posicao, data } = input;

      const [atualizado] = await db
        .update(avaliacaoJurados)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(avaliacaoJurados.avaliacaoJuriId, avaliacaoJuriId),
            eq(avaliacaoJurados.posicao, posicao)
          )
        )
        .returning();

      return atualizado;
    }),

  // Adicionar ou atualizar testemunha
  upsertTestemunha: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        data: avaliacaoTestemunhaSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, data } = input;

      // Verificar se já existe
      const existing = await db.query.avaliacaoTestemunhasJuri.findFirst({
        where: and(
          eq(avaliacaoTestemunhasJuri.avaliacaoJuriId, avaliacaoJuriId),
          eq(avaliacaoTestemunhasJuri.ordem, data.ordem)
        ),
      });

      if (existing) {
        const [atualizado] = await db
          .update(avaliacaoTestemunhasJuri)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(avaliacaoTestemunhasJuri.id, existing.id))
          .returning();
        return atualizado;
      } else {
        const [novo] = await db
          .insert(avaliacaoTestemunhasJuri)
          .values({
            avaliacaoJuriId,
            ...data,
          })
          .returning();
        return novo;
      }
    }),

  // Adicionar ou atualizar argumento
  upsertArgumento: protectedProcedure
    .input(
      z.object({
        avaliacaoJuriId: z.number(),
        data: argumentoSchema,
      })
    )
    .mutation(async ({ input }) => {
      const { avaliacaoJuriId, data } = input;

      // Verificar se já existe
      const existing = await db.query.argumentosSustentacao.findFirst({
        where: and(
          eq(argumentosSustentacao.avaliacaoJuriId, avaliacaoJuriId),
          eq(argumentosSustentacao.tipo, data.tipo),
          eq(argumentosSustentacao.ordem, data.ordem)
        ),
      });

      if (existing) {
        const [atualizado] = await db
          .update(argumentosSustentacao)
          .set(data)
          .where(eq(argumentosSustentacao.id, existing.id))
          .returning();
        return atualizado;
      } else {
        const [novo] = await db
          .insert(argumentosSustentacao)
          .values({
            avaliacaoJuriId,
            ...data,
          })
          .returning();
        return novo;
      }
    }),

  // ==========================================
  // ENCERRAR SESSÃO — Salva TUDO do cockpit → banco
  // ==========================================
  encerrarSessao: protectedProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        resultado: z.enum(["absolvicao", "condenacao", "desclassificacao", "nulidade"]),
        // Formulário de avaliação completo
        avaliacao: z.object({
          processoNumero: z.string().optional(),
          nomeReu: z.string().optional(),
          dataJulgamento: z.string(),
          observador: z.string(),
          horarioInicio: z.string().optional(),
          duracaoEstimada: z.string().optional(),
          descricaoAmbiente: z.string().optional(),
          disposicaoFisica: z.string().optional(),
          climaEmocionalInicial: z.string().optional(),
          presencaPublicoMidia: z.string().optional(),
          // Interrogatório
          interrogatorio: z.object({
            reacaoGeral: z.string().optional(),
            juradosAcreditaram: z.string().optional(),
            juradosCeticos: z.string().optional(),
            momentosImpacto: z.string().optional(),
            contradicoes: z.string().optional(),
            impressaoCredibilidade: z.string().optional(),
            nivelCredibilidade: z.number().nullable().optional(),
          }).optional(),
          // MP
          mpEstrategiaGeral: z.string().optional(),
          mpImpactoGeral: z.number().nullable().optional(),
          mpInclinacaoCondenar: z.string().optional(),
          // Defesa
          defesaEstrategiaGeral: z.string().optional(),
          defesaImpactoGeral: z.number().nullable().optional(),
          defesaDuvidaRazoavel: z.string().optional(),
          // Réplica
          replica: z.object({
            refutacoes: z.string().optional(),
            argumentosNovos: z.string().optional(),
            reacaoGeral: z.string().optional(),
            impacto: z.number().nullable().optional(),
            mudancaOpiniao: z.string().optional(),
          }).optional(),
          // Tréplica
          treplica: z.object({
            refutacoes: z.string().optional(),
            apeloFinal: z.string().optional(),
            reacaoGeral: z.string().optional(),
            momentoImpactante: z.string().optional(),
            impacto: z.number().nullable().optional(),
            reconquistaIndecisos: z.string().optional(),
          }).optional(),
          // Análise Final
          analise: z.object({
            ladoMaisPersuasivo: z.string().optional(),
            qualReacoesIndicam: z.string().optional(),
            impactoAcusacao: z.number().nullable().optional(),
            impactoDefesa: z.number().nullable().optional(),
            previsaoVoto: z.array(z.object({
              tendencia: z.string(),
              confianca: z.string(),
              justificativa: z.string(),
            })).optional(),
            impressaoLeiga: z.string().optional(),
            argumentoMaisImpactante: z.string().optional(),
            pontosNaoExplorados: z.string().optional(),
            climaGeral: z.string().optional(),
            momentosVirada: z.string().optional(),
            surpresas: z.string().optional(),
            observacoesAdicionais: z.string().optional(),
          }).optional(),
        }),
        // Jurados observados
        jurados: z.array(z.object({
          juradoId: z.number().optional(),
          posicao: z.number(),
          nome: z.string().optional(),
          profissao: z.string().optional(),
          idadeAproximada: z.string().optional(),
          sexo: z.string().optional(),
          aparenciaPrimeiraImpressao: z.string().optional(),
          linguagemCorporalInicial: z.string().optional(),
          tendenciaVoto: z.string().optional(),
          confianca: z.string().optional(),
          justificativa: z.string().optional(),
        })).optional(),
        // Testemunhas observadas
        testemunhas: z.array(z.object({
          nome: z.string(),
          ordem: z.number(),
          resumoDepoimento: z.string().optional(),
          reacaoJurados: z.string().optional(),
          expressoesFaciaisLinguagem: z.string().optional(),
          credibilidade: z.number().nullable().optional(),
          observacoesComplementares: z.string().optional(),
        })).optional(),
        // Argumentos MP
        argumentosMp: z.array(z.object({
          ordem: z.number(),
          descricao: z.string().optional(),
          reacaoJurados: z.string().optional(),
          nivelPersuasao: z.number().nullable().optional(),
        })).optional(),
        // Argumentos Defesa
        argumentosDefesa: z.array(z.object({
          ordem: z.number(),
          descricao: z.string().optional(),
          reacaoJurados: z.string().optional(),
          nivelPersuasao: z.number().nullable().optional(),
        })).optional(),
        // Anotações livres do cockpit
        anotacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessaoJuriId, resultado, avaliacao: av } = input;

      // Verificar se a sessão existe
      const sessao = await db.query.sessoesJuri.findFirst({
        where: eq(sessoesJuri.id, sessaoJuriId),
      });
      if (!sessao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      // 1. Criar a avaliação principal
      const [avaliacao] = await db
        .insert(avaliacoesJuri)
        .values({
          sessaoJuriId,
          processoId: sessao.processoId,
          observador: av.observador || "Estagiária",
          dataJulgamento: av.dataJulgamento || new Date().toISOString().split("T")[0],
          horarioInicio: av.horarioInicio || null,
          duracaoEstimada: av.duracaoEstimada || null,
          descricaoAmbiente: av.descricaoAmbiente || null,
          disposicaoFisica: av.disposicaoFisica || null,
          climaEmocionalInicial: av.climaEmocionalInicial || null,
          presencaPublicoMidia: av.presencaPublicoMidia || null,
          // Interrogatório
          interrogatorioReacaoGeral: av.interrogatorio?.reacaoGeral || null,
          interrogatorioJuradosAcreditaram: av.interrogatorio?.juradosAcreditaram || null,
          interrogatorioJuradosCeticos: av.interrogatorio?.juradosCeticos || null,
          interrogatorioMomentosImpacto: av.interrogatorio?.momentosImpacto || null,
          interrogatorioContradicoes: av.interrogatorio?.contradicoes || null,
          interrogatorioImpressaoCredibilidade: av.interrogatorio?.impressaoCredibilidade || null,
          interrogatorioNivelCredibilidade: av.interrogatorio?.nivelCredibilidade ?? null,
          // MP
          mpEstrategiaGeral: av.mpEstrategiaGeral || null,
          mpImpactoGeral: av.mpImpactoGeral ?? null,
          mpInclinacaoCondenar: av.mpInclinacaoCondenar || null,
          // Defesa
          defesaEstrategiaGeral: av.defesaEstrategiaGeral || null,
          defesaImpactoGeral: av.defesaImpactoGeral ?? null,
          defesaDuvidaRazoavel: av.defesaDuvidaRazoavel || null,
          // Réplica
          replicaRefutacoes: av.replica?.refutacoes || null,
          replicaArgumentosNovos: av.replica?.argumentosNovos || null,
          replicaReacaoGeral: av.replica?.reacaoGeral || null,
          replicaImpacto: av.replica?.impacto ?? null,
          replicaMudancaOpiniao: av.replica?.mudancaOpiniao || null,
          // Tréplica
          treplicaRefutacoes: av.treplica?.refutacoes || null,
          treplicaApeloFinal: av.treplica?.apeloFinal || null,
          treplicaReacaoGeral: av.treplica?.reacaoGeral || null,
          treplicaMomentoImpactante: av.treplica?.momentoImpactante || null,
          treplicaImpacto: av.treplica?.impacto ?? null,
          treplicaReconquistaIndecisos: av.treplica?.reconquistaIndecisos || null,
          // Análise Final
          ladoMaisPersuasivo: av.analise?.ladoMaisPersuasivo || null,
          impactoAcusacao: av.analise?.impactoAcusacao ?? null,
          impactoDefesa: av.analise?.impactoDefesa ?? null,
          impressaoFinalLeiga: av.analise?.impressaoLeiga || null,
          argumentoMaisImpactante: av.analise?.argumentoMaisImpactante || null,
          pontosNaoExplorados: av.analise?.pontosNaoExplorados || null,
          climaGeralJulgamento: av.analise?.climaGeral || null,
          momentosVirada: av.analise?.momentosVirada || null,
          surpresasJulgamento: av.analise?.surpresas || null,
          observacoesAdicionais: av.analise?.observacoesAdicionais || null,
          // Status
          status: "concluida",
          criadoPorId: ctx.user.id,
        })
        .returning();

      // 2. Salvar jurados da avaliação
      const juradosInput = input.jurados || [];
      if (juradosInput.length > 0) {
        const juradosData = juradosInput.map((j, i) => ({
          avaliacaoJuriId: avaliacao.id,
          juradoId: j.juradoId || null,
          posicao: j.posicao || i + 1,
          nome: j.nome || null,
          profissao: j.profissao || null,
          idadeAproximada: j.idadeAproximada ? parseInt(j.idadeAproximada) || null : null,
          sexo: j.sexo || null,
          aparenciaPrimeiraImpressao: j.aparenciaPrimeiraImpressao || null,
          linguagemCorporalInicial: j.linguagemCorporalInicial || null,
          tendenciaVoto: (j.tendenciaVoto === "CONDENAR" || j.tendenciaVoto === "ABSOLVER" || j.tendenciaVoto === "INDECISO") ? j.tendenciaVoto as "CONDENAR" | "ABSOLVER" | "INDECISO" : null,
          nivelConfianca: (j.confianca === "BAIXA" || j.confianca === "MEDIA" || j.confianca === "ALTA") ? j.confianca as "BAIXA" | "MEDIA" | "ALTA" : null,
          justificativaTendencia: j.justificativa || null,
        }));
        await db.insert(avaliacaoJurados).values(juradosData);
      }

      // 3. Salvar testemunhas
      const testemunhasInput = (input.testemunhas || []).filter(t => t.nome?.trim());
      if (testemunhasInput.length > 0) {
        const testemunhasData = testemunhasInput.map((t) => ({
          avaliacaoJuriId: avaliacao.id,
          ordem: t.ordem,
          nome: t.nome,
          resumoDepoimento: t.resumoDepoimento || null,
          reacaoJurados: t.reacaoJurados || null,
          expressoesFaciaisLinguagem: t.expressoesFaciaisLinguagem || null,
          credibilidade: t.credibilidade ?? null,
          observacoesComplementares: t.observacoesComplementares || null,
        }));
        await db.insert(avaliacaoTestemunhasJuri).values(testemunhasData);
      }

      // 4. Salvar argumentos MP
      const argsMp = (input.argumentosMp || []).filter(a => a.descricao?.trim());
      if (argsMp.length > 0) {
        await db.insert(argumentosSustentacao).values(
          argsMp.map(a => ({
            avaliacaoJuriId: avaliacao.id,
            tipo: "mp" as const,
            ordem: a.ordem,
            descricaoArgumento: a.descricao || null,
            reacaoJurados: a.reacaoJurados || null,
            nivelPersuasao: a.nivelPersuasao ?? null,
          }))
        );
      }

      // 5. Salvar argumentos Defesa
      const argsDefesa = (input.argumentosDefesa || []).filter(a => a.descricao?.trim());
      if (argsDefesa.length > 0) {
        await db.insert(argumentosSustentacao).values(
          argsDefesa.map(a => ({
            avaliacaoJuriId: avaliacao.id,
            tipo: "defesa" as const,
            ordem: a.ordem,
            descricaoArgumento: a.descricao || null,
            reacaoJurados: a.reacaoJurados || null,
            nivelPersuasao: a.nivelPersuasao ?? null,
          }))
        );
      }

      // 6. Atualizar sessão como "realizada" com resultado
      await db
        .update(sessoesJuri)
        .set({
          status: "realizada",
          resultado,
          observacoes: input.anotacoes || null,
          updatedAt: new Date(),
        })
        .where(eq(sessoesJuri.id, sessaoJuriId));

      // 7. Atualizar histórico de votos dos jurados no banco mestre
      const juradosComId = juradosInput.filter(j => j.juradoId);
      for (const j of juradosComId) {
        if (!j.juradoId) continue;

        const votoField = resultado === "absolvicao"
          ? "votos_absolvicao"
          : resultado === "condenacao"
          ? "votos_condenacao"
          : "votos_desclassificacao";

        await db.execute(sql`
          UPDATE jurados SET
            total_sessoes = COALESCE(total_sessoes, 0) + 1,
            ${sql.raw(votoField)} = COALESCE(${sql.raw(votoField)}, 0) + 1,
            updated_at = NOW()
          WHERE id = ${j.juradoId}
        `);
      }

      return {
        avaliacaoId: avaliacao.id,
        sessaoJuriId,
        resultado,
        juradosAtualizados: juradosComId.length,
      };
    }),

  // Finalizar avaliação
  finalizar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [atualizado] = await db
        .update(avaliacoesJuri)
        .set({
          status: "concluida",
          updatedAt: new Date(),
        })
        .where(eq(avaliacoesJuri.id, input.id))
        .returning();

      return atualizado;
    }),

  // Excluir avaliação
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [excluido] = await db
        .delete(avaliacoesJuri)
        .where(eq(avaliacoesJuri.id, input.id))
        .returning();

      return excluido;
    }),

  // ==========================================
  // PERSONAGENS DO JÚRI
  // ==========================================

  // Listar personagens
  listPersonagens: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        comarca: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { tipo, comarca } = input || {};

      let conditions = [eq(personagensJuri.ativo, true)];
      if (tipo) {
        conditions.push(eq(personagensJuri.tipo, tipo));
      }
      if (comarca) {
        conditions.push(eq(personagensJuri.comarca, comarca));
      }

      const result = await db
        .select()
        .from(personagensJuri)
        .where(and(...conditions))
        .orderBy(personagensJuri.nome);

      return result;
    }),

  // Criar personagem
  createPersonagem: protectedProcedure
    .input(
      z.object({
        nome: z.string(),
        tipo: z.enum(["juiz", "promotor", "defensor", "oficial"]),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [personagem] = await db
        .insert(personagensJuri)
        .values({
          ...input,
          createdById: ctx.user.id,
        })
        .returning();

      return personagem;
    }),

  // Atualizar personagem
  updatePersonagem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        vara: z.string().optional(),
        comarca: z.string().optional(),
        estiloAtuacao: z.string().optional(),
        pontosFortes: z.string().optional(),
        pontosFracos: z.string().optional(),
        tendenciasObservadas: z.string().optional(),
        estrategiasRecomendadas: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const [atualizado] = await db
        .update(personagensJuri)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(personagensJuri.id, id))
        .returning();

      return atualizado;
    }),

  // ==========================================
  // BRIEFING PRÉ-JÚRI — Consulta inteligente
  // ==========================================
  briefingJurado: protectedProcedure
    .input(z.object({ juradoId: z.number() }))
    .query(async ({ input }) => {
      const [jurado] = await db
        .select()
        .from(jurados)
        .where(eq(jurados.id, input.juradoId));

      if (!jurado) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jurado não encontrado" });
      }

      // Buscar avaliações onde esse jurado participou
      const avaliacoesJurado = await db.query.avaliacaoJurados.findMany({
        where: eq(avaliacaoJurados.juradoId, input.juradoId),
        with: {
          avaliacaoJuri: {
            with: {
              sessaoJuri: true,
            },
          },
        },
        orderBy: desc(avaliacaoJurados.createdAt),
      });

      const participacoes = avaliacoesJurado.map(aj => ({
        data: aj.avaliacaoJuri?.dataJulgamento,
        resultado: aj.avaliacaoJuri?.sessaoJuri?.resultado,
        tendenciaRegistrada: aj.tendenciaVoto,
        confianca: aj.nivelConfianca,
        aparencia: aj.aparenciaPrimeiraImpressao,
        linguagemCorporal: aj.linguagemCorporalInicial,
        anotacoesGerais: aj.anotacoesGerais,
      }));

      const totalSessoes = jurado.totalSessoes || 0;
      const taxaAbsolvicao = totalSessoes > 0
        ? Math.round(((jurado.votosAbsolvicao || 0) / totalSessoes) * 100)
        : 50;

      return {
        jurado: {
          id: jurado.id,
          nome: jurado.nome,
          profissao: jurado.profissao,
          idade: jurado.idade,
          bairro: jurado.bairro,
          genero: jurado.genero,
          perfilPsicologico: jurado.perfilPsicologico,
          perfilTendencia: jurado.perfilTendencia,
          observacoes: jurado.observacoes,
        },
        stats: {
          totalSessoes,
          votosAbsolvicao: jurado.votosAbsolvicao || 0,
          votosCondenacao: jurado.votosCondenacao || 0,
          votosDesclassificacao: jurado.votosDesclassificacao || 0,
          taxaAbsolvicao,
        },
        participacoes,
      };
    }),

  // ==========================================
  // INTELIGÊNCIA CRUZADA — Analytics
  // ==========================================
  analytics: protectedProcedure
    .query(async () => {
      // Buscar todas as avaliações concluídas com dados relacionados
      const avaliacoes = await db.query.avaliacoesJuri.findMany({
        where: eq(avaliacoesJuri.status, "concluida"),
        with: {
          sessaoJuri: true,
          avaliacaoJurados: true,
          avaliacaoTestemunhas: true,
          argumentos: true,
        },
        orderBy: desc(avaliacoesJuri.createdAt),
      });

      // Buscar todas as sessões com resultado
      const sessoes = await db.query.sessoesJuri.findMany({
        where: eq(sessoesJuri.status, "realizada"),
        orderBy: desc(sessoesJuri.dataSessao),
      });

      // Buscar todos os jurados com histórico
      const todosJurados = await db
        .select()
        .from(jurados)
        .where(eq(jurados.ativo, true));

      const juradosComHistorico = todosJurados.filter(j => (j.totalSessoes || 0) > 0);

      // Stats gerais
      const totalSessoes = sessoes.length;
      const absolvicoes = sessoes.filter(s => s.resultado === "absolvicao").length;
      const condenacoes = sessoes.filter(s => s.resultado === "condenacao").length;
      const desclassificacoes = sessoes.filter(s => s.resultado === "desclassificacao").length;

      // Média de impacto por lado
      const avaliacoesComImpacto = avaliacoes.filter(a => a.impactoAcusacao && a.impactoDefesa);
      const mediaImpactoAcusacao = avaliacoesComImpacto.length > 0
        ? Math.round(avaliacoesComImpacto.reduce((acc, a) => acc + (a.impactoAcusacao || 0), 0) / avaliacoesComImpacto.length * 10) / 10
        : null;
      const mediaImpactoDefesa = avaliacoesComImpacto.length > 0
        ? Math.round(avaliacoesComImpacto.reduce((acc, a) => acc + (a.impactoDefesa || 0), 0) / avaliacoesComImpacto.length * 10) / 10
        : null;

      // Argumentos mais persuasivos (top por nível de persuasão)
      const todosArgumentos = avaliacoes.flatMap(a => (a.argumentos || []).map(arg => ({
        ...arg,
        resultado: a.sessaoJuri?.resultado || null,
      })));
      const argsMpTop = todosArgumentos
        .filter(a => a.tipo === "mp" && a.nivelPersuasao && a.nivelPersuasao >= 7)
        .sort((a, b) => (b.nivelPersuasao || 0) - (a.nivelPersuasao || 0))
        .slice(0, 5);
      const argsDefesaTop = todosArgumentos
        .filter(a => a.tipo === "defesa" && a.nivelPersuasao && a.nivelPersuasao >= 7)
        .sort((a, b) => (b.nivelPersuasao || 0) - (a.nivelPersuasao || 0))
        .slice(0, 5);

      // Jurados mais previsíveis (muitas sessões com tendência clara)
      const juradosMaisPrevistos = juradosComHistorico
        .map(j => {
          const total = j.totalSessoes || 1;
          const taxaAbsolvicao = Math.round(((j.votosAbsolvicao || 0) / total) * 100);
          const taxaCondenacao = Math.round(((j.votosCondenacao || 0) / total) * 100);
          const tendenciaDominante = taxaAbsolvicao >= 70 ? "absolutorio" : taxaCondenacao >= 70 ? "condenatorio" : "neutro";
          return {
            id: j.id,
            nome: j.nome,
            profissao: j.profissao,
            totalSessoes: j.totalSessoes || 0,
            taxaAbsolvicao,
            taxaCondenacao,
            tendenciaDominante,
          };
        })
        .filter(j => j.totalSessoes >= 2)
        .sort((a, b) => b.totalSessoes - a.totalSessoes)
        .slice(0, 10);

      // Histórico de resultados (timeline)
      const timeline = sessoes.slice(0, 20).map(s => ({
        id: s.id,
        data: s.dataSessao,
        resultado: s.resultado,
        assistido: s.assistidoNome,
      }));

      return {
        resumo: {
          totalSessoes,
          absolvicoes,
          condenacoes,
          desclassificacoes,
          taxaAbsolvicao: totalSessoes > 0 ? Math.round((absolvicoes / totalSessoes) * 100) : 0,
          totalJurados: todosJurados.length,
          juradosComHistorico: juradosComHistorico.length,
        },
        impacto: {
          mediaAcusacao: mediaImpactoAcusacao,
          mediaDefesa: mediaImpactoDefesa,
        },
        argumentosTop: {
          mp: argsMpTop,
          defesa: argsDefesaTop,
        },
        juradosMaisPrevistos,
        timeline,
      };
    }),

  // ==========================================
  // REGISTRO PÓS-JÚRI — Novas procedures
  // ==========================================

  // Listar sessões pendentes de registro completo
  registroPendentes: publicProcedure.query(async () => {
    const pendentes = await db.query.sessoesJuri.findMany({
      where: and(
        eq(sessoesJuri.status, "realizada"),
        or(eq(sessoesJuri.registroCompleto, false), isNull(sessoesJuri.registroCompleto))
      ),
      with: {
        processo: { with: { assistido: true } },
        defensor: true,
      },
      orderBy: desc(sessoesJuri.dataSessao),
    });

    return pendentes;
  }),

  // Buscar registro completo de uma sessão (sessão + dosimetria + documentos + quesitos)
  getRegistro: publicProcedure
    .input(z.object({ sessaoJuriId: z.number() }))
    .query(async ({ input }) => {
      const sessao = await db.query.sessoesJuri.findFirst({
        where: eq(sessoesJuri.id, input.sessaoJuriId),
        with: {
          processo: { with: { assistido: true } },
          defensor: true,
          dosimetria: true,
          documentos: true,
          conselho: { with: { jurado: true } },
        },
      });

      if (!sessao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      // Buscar quesitos vinculados a esta sessão separadamente
      // (não há relação many definida em sessoesJuriRelations para quesitos)
      const quesitosData = await db.query.quesitos.findMany({
        where: eq(quesitos.sessaoJuriId, input.sessaoJuriId),
        orderBy: [asc(quesitos.numero)],
      });

      return { ...sessao, quesitos: quesitosData };
    }),

  // Upload de documento do júri (quesitos, sentença, ata)
  uploadDocumento: publicProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        tipo: z.enum(["quesitos", "sentenca", "ata"]),
        fileUrl: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [doc] = await db
        .insert(documentosJuri)
        .values({
          sessaoJuriId: input.sessaoJuriId,
          tipo: input.tipo,
          fileName: input.fileName,
          url: input.fileUrl,
          statusProcessamento: "pendente",
        })
        .returning();

      return doc;
    }),

  // Processar documento via enrichment engine (extração de dados por IA)
  processarDocumento: publicProcedure
    .input(z.object({ documentoId: z.number() }))
    .mutation(async ({ input }) => {
      const doc = await db.query.documentosJuri.findFirst({
        where: eq(documentosJuri.id, input.documentoId),
      });

      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento não encontrado" });
      }

      // Atualizar status para processando
      await db
        .update(documentosJuri)
        .set({ statusProcessamento: "processando" })
        .where(eq(documentosJuri.id, input.documentoId));

      try {
        const enrichmentUrl = (process.env.ENRICHMENT_ENGINE_URL || "https://enrichment-engine-production.up.railway.app").trim();
        const apiKey = (process.env.ENRICHMENT_ENGINE_API_KEY || "").trim();

        const response = await fetch(`${enrichmentUrl}/api/juri/extrair`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ file_url: doc.url, tipo: doc.tipo }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`Enrichment failed: ${response.status} — ${errorText}`);
        }

        const data = await response.json();

        const [updated] = await db
          .update(documentosJuri)
          .set({
            dadosExtraidos: data.dados_extraidos,
            processadoEm: new Date(),
            statusProcessamento: "concluido",
          })
          .where(eq(documentosJuri.id, input.documentoId))
          .returning();

        return updated;
      } catch (error) {
        await db
          .update(documentosJuri)
          .set({ statusProcessamento: "erro" })
          .where(eq(documentosJuri.id, input.documentoId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Falha na extração de dados",
        });
      }
    }),

  // Salvar registro completo pós-júri (contexto + dosimetria + quesitos)
  salvarRegistro: publicProcedure
    .input(
      z.object({
        sessaoJuriId: z.number(),
        // Contexto da sessão
        juizPresidente: z.string().optional(),
        promotor: z.string().optional(),
        duracaoMinutos: z.number().optional(),
        localFato: z.string().optional(),
        tipoPenal: z.enum([
          "homicidio_simples",
          "homicidio_qualificado",
          "homicidio_privilegiado",
          "homicidio_privilegiado_qualificado",
          "homicidio_tentado",
          "feminicidio",
        ]).optional(),
        tesePrincipal: z.string().optional(),
        reuPrimario: z.boolean().optional(),
        reuIdade: z.number().optional(),
        vitimaGenero: z.string().optional(),
        vitimaIdade: z.number().optional(),
        usouAlgemas: z.boolean().optional(),
        incidentesProcessuais: z.string().optional(),
        // Dosimetria
        dosimetria: z.object({
          penaBase: z.string().optional(),
          circunstanciasJudiciais: z.string().optional(),
          agravantes: z.string().optional(),
          atenuantes: z.string().optional(),
          causasAumento: z.string().optional(),
          causasDiminuicao: z.string().optional(),
          penaTotalMeses: z.number().optional(),
          regimeInicial: z.enum(["fechado", "semiaberto", "aberto"]).optional(),
          detracaoInicio: z.string().optional(),
          detracaoFim: z.string().optional(),
          detracaoDias: z.number().optional(),
          dataFato: z.string().optional(),
          fracaoProgressao: z.string().optional(),
          incisoAplicado: z.string().optional(),
          vedadoLivramento: z.boolean().optional(),
          resultouMorte: z.boolean().optional(),
          reuReincidente: z.boolean().optional(),
        }).optional(),
        // Resultados dos quesitos
        quesitosResultados: z.array(
          z.object({
            quesitoId: z.number(),
            resultado: z.enum(["sim", "nao", "prejudicado"]),
            ordemVotacao: z.number().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessaoJuriId, dosimetria: dosimetriaInput, quesitosResultados, ...contexto } = input;

      // Verificar se a sessão existe
      const sessao = await db.query.sessoesJuri.findFirst({
        where: eq(sessoesJuri.id, sessaoJuriId),
      });

      if (!sessao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      }

      // 1. Atualizar sessoesJuri com campos de contexto + marcar registro completo
      const [sessaoAtualizada] = await db
        .update(sessoesJuri)
        .set({
          registroCompleto: true,
          juizPresidente: contexto.juizPresidente ?? null,
          promotor: contexto.promotor ?? null,
          duracaoMinutos: contexto.duracaoMinutos ?? null,
          localFato: contexto.localFato ?? null,
          tipoPenal: contexto.tipoPenal ?? null,
          tesePrincipal: contexto.tesePrincipal ?? null,
          reuPrimario: contexto.reuPrimario ?? null,
          reuIdade: contexto.reuIdade ?? null,
          vitimaGenero: contexto.vitimaGenero ?? null,
          vitimaIdade: contexto.vitimaIdade ?? null,
          usouAlgemas: contexto.usouAlgemas ?? null,
          incidentesProcessuais: contexto.incidentesProcessuais ?? null,
          updatedAt: new Date(),
        })
        .where(eq(sessoesJuri.id, sessaoJuriId))
        .returning();

      // 2. Upsert dosimetria (se fornecida)
      if (dosimetriaInput) {
        const existingDosimetria = await db.query.dosimetriaJuri.findFirst({
          where: eq(dosimetriaJuri.sessaoJuriId, sessaoJuriId),
        });

        if (existingDosimetria) {
          await db
            .update(dosimetriaJuri)
            .set({
              penaBase: dosimetriaInput.penaBase ?? null,
              circunstanciasJudiciais: dosimetriaInput.circunstanciasJudiciais ?? null,
              agravantes: dosimetriaInput.agravantes ?? null,
              atenuantes: dosimetriaInput.atenuantes ?? null,
              causasAumento: dosimetriaInput.causasAumento ?? null,
              causasDiminuicao: dosimetriaInput.causasDiminuicao ?? null,
              penaTotalMeses: dosimetriaInput.penaTotalMeses ?? null,
              regimeInicial: dosimetriaInput.regimeInicial ?? null,
              detracaoInicio: dosimetriaInput.detracaoInicio ?? null,
              detracaoFim: dosimetriaInput.detracaoFim ?? null,
              detracaoDias: dosimetriaInput.detracaoDias ?? null,
              dataFato: dosimetriaInput.dataFato ?? null,
              fracaoProgressao: dosimetriaInput.fracaoProgressao ?? null,
              incisoAplicado: dosimetriaInput.incisoAplicado ?? null,
              vedadoLivramento: dosimetriaInput.vedadoLivramento ?? null,
              resultouMorte: dosimetriaInput.resultouMorte ?? null,
              reuReincidente: dosimetriaInput.reuReincidente ?? null,
              updatedAt: new Date(),
            })
            .where(eq(dosimetriaJuri.id, existingDosimetria.id));
        } else {
          await db.insert(dosimetriaJuri).values({
            sessaoJuriId,
            penaBase: dosimetriaInput.penaBase ?? null,
            circunstanciasJudiciais: dosimetriaInput.circunstanciasJudiciais ?? null,
            agravantes: dosimetriaInput.agravantes ?? null,
            atenuantes: dosimetriaInput.atenuantes ?? null,
            causasAumento: dosimetriaInput.causasAumento ?? null,
            causasDiminuicao: dosimetriaInput.causasDiminuicao ?? null,
            penaTotalMeses: dosimetriaInput.penaTotalMeses ?? null,
            regimeInicial: dosimetriaInput.regimeInicial ?? null,
            detracaoInicio: dosimetriaInput.detracaoInicio ?? null,
            detracaoFim: dosimetriaInput.detracaoFim ?? null,
            detracaoDias: dosimetriaInput.detracaoDias ?? null,
            dataFato: dosimetriaInput.dataFato ?? null,
            fracaoProgressao: dosimetriaInput.fracaoProgressao ?? null,
            incisoAplicado: dosimetriaInput.incisoAplicado ?? null,
            vedadoLivramento: dosimetriaInput.vedadoLivramento ?? null,
            resultouMorte: dosimetriaInput.resultouMorte ?? null,
            reuReincidente: dosimetriaInput.reuReincidente ?? null,
          });
        }
      }

      // 3. Atualizar resultados dos quesitos (se fornecidos)
      if (quesitosResultados && quesitosResultados.length > 0) {
        for (const qr of quesitosResultados) {
          await db
            .update(quesitos)
            .set({
              resultado: qr.resultado,
              ordemVotacao: qr.ordemVotacao ?? null,
              updatedAt: new Date(),
            })
            .where(eq(quesitos.id, qr.quesitoId));
        }
      }

      return sessaoAtualizada;
    }),
});
