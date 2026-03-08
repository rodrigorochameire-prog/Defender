import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, withTransaction, audiencias, processos, assistidos, sessoesJuri } from "@/lib/db";
import { eq, and, gte, desc, asc, isNull, or, sql, ilike, inArray } from "drizzle-orm";
import { addDays } from "date-fns";
import { getWorkspaceScope } from "../workspace";

export const audienciasRouter = router({
  // Listar audiências
  // NOTA: Sem limite por padrão para garantir que todos os eventos apareçam no calendário
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(10000).optional(), // Opcional - sem limite por padrão
      offset: z.number().default(0),
      responsavelId: z.number().optional(),
      apenasProximas: z.boolean().optional().default(false), // Filtrar apenas futuras
    }).optional())
    .query(async ({ input }) => {
      const { limit, offset = 0, responsavelId, apenasProximas = false } = input || {};

      const whereConditions = [];

      // Filtrar audiências futuras apenas se solicitado
      if (apenasProximas) {
        whereConditions.push(gte(audiencias.dataAudiencia, new Date()));
      }

      // Filtrar por responsável se especificado
      if (responsavelId) {
        whereConditions.push(
          or(
            eq(audiencias.defensorId, responsavelId),
            isNull(audiencias.defensorId)
          )
        );
      }

      // Construir query base
      let query = db
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          casoId: audiencias.casoId,
          assistidoId: audiencias.assistidoId,
          dataHora: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          local: audiencias.local,
          titulo: audiencias.titulo,
          descricao: audiencias.descricao,
          sala: audiencias.sala,
          horario: audiencias.horario,
          defensorId: audiencias.defensorId,
          juiz: audiencias.juiz,
          promotor: audiencias.promotor,
          status: audiencias.status,
          resultado: audiencias.resultado,
          responsavelId: audiencias.defensorId, // Alias para compatibilidade
          processo: {
            id: processos.id,
            numero: processos.numeroAutos,
            atribuicao: processos.atribuicao,
            area: processos.area,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(audiencias.dataAudiencia))
        .offset(offset);

      // Aplicar limite apenas se especificado
      if (limit !== undefined) {
        query = query.limit(limit) as any;
      }

      return await query;
    }),

  // Buscar audiência por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [audiencia] = await db
        .select()
        .from(audiencias)
        .where(eq(audiencias.id, input.id))
        .limit(1);

      return audiencia || null;
    }),

  // Próximas audiências (para dashboard)
  // Se dias=0, retorna TODAS as audiências futuras sem limite de data
  proximas: protectedProcedure
    .input(z.object({
      dias: z.number().default(0), // 0 = sem limite de dias
      limite: z.number().default(50), // Aumentado para mostrar mais eventos
    }).optional())
    .query(async ({ input }) => {
      const { dias = 0, limite = 50 } = input || {};

      const whereConditions = [gte(audiencias.dataAudiencia, new Date())];

      // Só adiciona limite de data se dias > 0
      if (dias > 0) {
        const dataLimite = addDays(new Date(), dias);
        whereConditions.push(sql`${audiencias.dataAudiencia} <= ${dataLimite}`);
      }

      const results = await db
        .select({
          id: audiencias.id,
          dataHora: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          local: audiencias.local,
          titulo: audiencias.titulo,
          descricao: audiencias.descricao,
          responsavelId: audiencias.defensorId,
          status: audiencias.status,
          processo: {
            id: processos.id,
            numero: processos.numeroAutos,
            atribuicao: processos.atribuicao,
          },
          assistido: {
            id: assistidos.id,
            nome: assistidos.nome,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .leftJoin(assistidos, eq(audiencias.assistidoId, assistidos.id))
        .where(and(...whereConditions))
        .orderBy(asc(audiencias.dataAudiencia))
        .limit(limite);

      return results;
    }),

  // Criar audiência
  create: protectedProcedure
    .input(z.object({
      processoId: z.number(),
      casoId: z.number().optional(),
      assistidoId: z.number().optional(),
      dataAudiencia: z.string().or(z.date()),
      tipo: z.string(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [audiencia] = await db
        .insert(audiencias)
        .values({
          processoId: input.processoId,
          casoId: input.casoId,
          assistidoId: input.assistidoId,
          dataAudiencia: new Date(input.dataAudiencia),
          tipo: input.tipo,
          local: input.local,
          titulo: input.titulo,
          descricao: input.descricao,
          sala: input.sala,
          horario: input.horario,
          defensorId: input.defensorId,
          juiz: input.juiz,
          promotor: input.promotor,
          status: "agendada",
        })
        .returning();

      return audiencia;
    }),

  // Atualizar audiência
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      dataAudiencia: z.string().or(z.date()).optional(),
      tipo: z.string().optional(),
      local: z.string().optional(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      sala: z.string().optional(),
      horario: z.string().optional(),
      defensorId: z.number().optional(),
      juiz: z.string().optional(),
      promotor: z.string().optional(),
      status: z.string().optional(),
      resultado: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      
      if (data.dataAudiencia) {
        updateData.dataAudiencia = new Date(data.dataAudiencia);
      }

      const [audiencia] = await db
        .update(audiencias)
        .set(updateData)
        .where(eq(audiencias.id, id))
        .returning();

      return audiencia;
    }),

  // Deletar audiência
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(audiencias).where(eq(audiencias.id, input.id));
      return { success: true };
    }),

  // ==========================================
  // REGISTRO DE AUDIÊNCIA (JSONB persistence)
  // ==========================================

  // Salvar registro de audiência (cria ou atualiza)
  salvarRegistro: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
      registro: z.any(), // RegistroAudienciaData as JSON
    }))
    .mutation(async ({ input }) => {
      const registroData = input.registro as Record<string, unknown>;
      const [updated] = await db
        .update(audiencias)
        .set({
          registroAudiencia: registroData,
          status: registroData.realizada ? "realizada" : "reagendada",
          resultado: (registroData.resultado as string) || null,
          anotacoes: (registroData.anotacoesGerais as string) || null,
          updatedAt: new Date(),
        })
        .where(eq(audiencias.id, input.audienciaId))
        .returning();
      return updated;
    }),

  // Buscar registro de audiência por ID da audiência
  buscarRegistro: protectedProcedure
    .input(z.object({
      audienciaId: z.number(),
    }))
    .query(async ({ input }) => {
      const [audiencia] = await db
        .select({
          id: audiencias.id,
          registroAudiencia: audiencias.registroAudiencia,
          status: audiencias.status,
        })
        .from(audiencias)
        .where(eq(audiencias.id, input.audienciaId))
        .limit(1);
      return audiencia?.registroAudiencia || null;
    }),

  // Buscar histórico de registros por processo ou assistido
  buscarHistoricoRegistros: protectedProcedure
    .input(z.object({
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.processoId) conditions.push(eq(audiencias.processoId, input.processoId));
      if (input.assistidoId) conditions.push(eq(audiencias.assistidoId, input.assistidoId));

      if (conditions.length === 0) return [];

      const results = await db
        .select({
          id: audiencias.id,
          registroAudiencia: audiencias.registroAudiencia,
          dataAudiencia: audiencias.dataAudiencia,
          status: audiencias.status,
          resultado: audiencias.resultado,
        })
        .from(audiencias)
        .where(or(...conditions))
        .orderBy(desc(audiencias.dataAudiencia));

      return results.filter(r => r.registroAudiencia != null);
    }),

  // Importar audiências em batch (do PJe)
  // Verifica duplicatas por número do processo + data + horário
  // Cria assistidos automaticamente se não existirem
  importBatch: protectedProcedure
    .input(z.object({
      eventos: z.array(z.object({
        titulo: z.string(),
        tipo: z.string(),
        data: z.string(),
        horarioInicio: z.string(),
        horarioFim: z.string().optional(),
        local: z.string().optional(),
        processo: z.string(),
        assistido: z.string().optional(),
        assistidos: z.array(z.object({
          nome: z.string(),
          cpf: z.string(),
        })).optional(),
        atribuicao: z.string().optional(),
        status: z.string().optional(),
        descricao: z.string().optional(),
        classeJudicial: z.string().optional(),
        situacaoAudiencia: z.string().optional(),
        orgaoJulgador: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { eventos } = input;

      // Obter workspaceId do usuário (ou usar 1 como padrão)
      const { workspaceId } = getWorkspaceScope(ctx.user);
      const targetWorkspaceId = workspaceId || 1;

      // Mapear atribuição para o enum do banco de dados
      // Valores válidos: JURI_CAMACARI, VVD_CAMACARI, EXECUCAO_PENAL, SUBSTITUICAO, SUBSTITUICAO_CIVEL, GRUPO_JURI
      const mapAtribuicao = (atrib: string | undefined): "VVD_CAMACARI" | "JURI_CAMACARI" | "EXECUCAO_PENAL" | "SUBSTITUICAO" | "SUBSTITUICAO_CIVEL" | "GRUPO_JURI" => {
        if (!atrib) return "SUBSTITUICAO";
        const a = atrib.toUpperCase();
        if (a.includes("VIOLÊNCIA") || a.includes("VIOLENCIA") || a.includes("DOMÉSTICA") || a.includes("DOMESTICA") || a.includes("VVD")) return "VVD_CAMACARI";
        if (a.includes("JÚRI") || a.includes("JURI") || a.includes("TRIBUNAL")) return "JURI_CAMACARI";
        if (a.includes("EXECUÇÃO") || a.includes("EXECUCAO")) return "EXECUCAO_PENAL";
        if (a.includes("GRUPO")) return "GRUPO_JURI";
        if (a.includes("CÍVEL") || a.includes("CIVEL") || a.includes("FAMÍLIA") || a.includes("FAMILIA") || a.includes("NÃO PENAL") || a.includes("NAO PENAL")) return "SUBSTITUICAO_CIVEL";
        return "SUBSTITUICAO";
      };

      // Mapear área para o enum do banco de dados
      // Valores válidos: JURI, EXECUCAO_PENAL, VIOLENCIA_DOMESTICA, SUBSTITUICAO, CURADORIA, FAMILIA, CIVEL, FAZENDA_PUBLICA
      const mapArea = (atrib: string | undefined): "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" => {
        if (!atrib) return "SUBSTITUICAO";
        const a = atrib.toUpperCase();
        if (a.includes("VIOLÊNCIA") || a.includes("VIOLENCIA") || a.includes("DOMÉSTICA") || a.includes("DOMESTICA") || a.includes("VVD")) return "VIOLENCIA_DOMESTICA";
        if (a.includes("JÚRI") || a.includes("JURI") || a.includes("TRIBUNAL")) return "JURI";
        if (a.includes("EXECUÇÃO") || a.includes("EXECUCAO")) return "EXECUCAO_PENAL";
        if (a.includes("CURADORIA")) return "CURADORIA";
        if (a.includes("FAMÍLIA") || a.includes("FAMILIA")) return "FAMILIA";
        if (a.includes("CÍVEL") || a.includes("CIVEL")) return "CIVEL";
        if (a.includes("FAZENDA")) return "FAZENDA_PUBLICA";
        return "SUBSTITUICAO";
      };

      // Função para normalizar nomes (remover acentos, espaços extras, padronizar case)
      const normalizarNome = (nome: string): string => {
        return nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " "); // Remove espaços extras
      };

      // Função para calcular similaridade entre strings (algoritmo de Levenshtein simplificado)
      const calcularSimilaridade = (str1: string, str2: string): number => {
        const s1 = normalizarNome(str1);
        const s2 = normalizarNome(str2);
        if (s1 === s2) return 1;

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1;

        // Verificar se um contém o outro
        if (longer.includes(shorter) || shorter.includes(longer)) {
          return shorter.length / longer.length;
        }

        // Comparar palavras
        const palavras1 = s1.split(" ");
        const palavras2 = s2.split(" ");
        const palavrasComuns = palavras1.filter(p => palavras2.includes(p));

        return palavrasComuns.length / Math.max(palavras1.length, palavras2.length);
      };

      // ==========================================
      // BATCH PRE-FETCH: Eliminate N+1 queries
      // ==========================================

      // 1. Collect all unique CPFs from import events
      const allCpfs: string[] = [];
      for (const evento of eventos) {
        const lista = evento.assistidos || [];
        for (const a of lista) {
          if (a.cpf) {
            const cpfLimpo = a.cpf.replace(/\D/g, "");
            if (cpfLimpo && !allCpfs.includes(cpfLimpo)) allCpfs.push(cpfLimpo);
          }
        }
      }

      // 2. Collect all unique processo numbers from import events
      const allProcessoNumbers = [...new Set(eventos.map(e => e.processo))];

      // 3. Batch-fetch all assistidos that have any of those CPFs (1 query instead of N)
      let cpfToAssistido = new Map<string, { id: number }>();
      if (allCpfs.length > 0) {
        const assistidosByCpf = await db
          .select({ id: assistidos.id, cpf: assistidos.cpf })
          .from(assistidos)
          .where(sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') IN (${sql.join(allCpfs.map(c => sql`${c}`), sql`, `)})`);

        for (const a of assistidosByCpf) {
          if (a.cpf) {
            const cpfLimpo = a.cpf.replace(/\D/g, "");
            cpfToAssistido.set(cpfLimpo, { id: a.id });
          }
        }
      }

      // 4. Batch-fetch all assistidos for name matching (1 query instead of N)
      // We fetch all assistidos to do in-memory similarity matching
      const allAssistidosForMatching = await db
        .select({ id: assistidos.id, nome: assistidos.nome, atribuicaoPrimaria: assistidos.atribuicaoPrimaria })
        .from(assistidos);

      // Pre-normalize all names for similarity matching
      const assistidosNormalizados = allAssistidosForMatching.map(a => ({
        ...a,
        nomeNormalizado: normalizarNome(a.nome),
      }));

      // 5. Batch-fetch all processos by numeroAutos (1 query instead of N)
      let numeroToProcesso = new Map<string, { id: number; classeProcessual: string | null; vara: string | null; isJuri: boolean | null }>();
      if (allProcessoNumbers.length > 0) {
        const processosByNumero = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            classeProcessual: processos.classeProcessual,
            vara: processos.vara,
            isJuri: processos.isJuri,
          })
          .from(processos)
          .where(inArray(processos.numeroAutos, allProcessoNumbers));

        for (const p of processosByNumero) {
          numeroToProcesso.set(p.numeroAutos, {
            id: p.id,
            classeProcessual: p.classeProcessual,
            vara: p.vara,
            isJuri: p.isJuri,
          });
        }
      }

      // 6. Batch-fetch existing audiências for duplicate detection (1 query instead of N)
      // Build all dataHora + processo combos to check
      const allDataHoras = eventos.map(e => new Date(`${e.data}T${e.horarioInicio}:00`));
      const existingAudiencias = await db
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          assistidoId: audiencias.assistidoId,
          dataAudiencia: audiencias.dataAudiencia,
          numeroAutos: processos.numeroAutos,
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .where(
          and(
            inArray(audiencias.dataAudiencia, allDataHoras),
            inArray(processos.numeroAutos, allProcessoNumbers)
          )
        );

      // Build lookup: "processo|dataISO" -> audiência data
      const duplicateMap = new Map<string, { id: number; processoId: number | null; assistidoId: number | null }>();
      for (const ea of existingAudiencias) {
        if (ea.numeroAutos && ea.dataAudiencia) {
          const key = `${ea.numeroAutos}|${ea.dataAudiencia.toISOString()}`;
          duplicateMap.set(key, { id: ea.id, processoId: ea.processoId, assistidoId: ea.assistidoId });
        }
      }

      // Helper: find assistido by name similarity from pre-fetched data
      const findAssistidoByName = (nome: string): number | undefined => {
        const nomeNorm = normalizarNome(nome);
        for (const candidato of assistidosNormalizados) {
          const similaridade = calcularSimilaridade(candidato.nomeNormalizado, nomeNorm);
          if (similaridade >= 0.9) {
            return candidato.id;
          }
        }
        return undefined;
      };

      // Entire batch wrapped in a transaction — on error, everything rolls back
      return await withTransaction(async (tx) => {
        const importados: number[] = [];
        const duplicados: string[] = [];
        const atualizados: number[] = [];
        const assistidosCriados: number[] = [];

        for (const evento of eventos) {
          // Construir data/hora completa
          const dataHora = new Date(`${evento.data}T${evento.horarioInicio}:00`);

          // Check duplicate from pre-fetched map (0 queries instead of 1)
          const dupKey = `${evento.processo}|${dataHora.toISOString()}`;
          const audienciaExistente = duplicateMap.get(dupKey);

          // Se encontrou duplicata, atualizar com os novos dados (exceto processo e assistido já vinculados)
          if (audienciaExistente) {
            // Atualizar audiência existente com novos dados
            await tx
              .update(audiencias)
              .set({
                tipo: evento.tipo,
                titulo: evento.titulo,
                descricao: evento.descricao,
                local: evento.local,
                horario: evento.horarioInicio,
                status: evento.status === "confirmado" ? "agendada" :
                       evento.status === "cancelado" ? "cancelada" :
                       evento.status === "remarcado" ? "reagendada" : "agendada",
              })
              .where(eq(audiencias.id, audienciaExistente.id));

            // Atualizar processo existente com atribuição corrigida se necessário
            if (audienciaExistente.processoId) {
              const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
              const areaEnum = mapArea(evento.atribuicao);

              await tx
                .update(processos)
                .set({
                  atribuicao: atribuicaoEnum as any,
                  area: areaEnum as any,
                  classeProcessual: evento.classeJudicial || undefined,
                  vara: evento.orgaoJulgador || undefined,
                })
                .where(eq(processos.id, audienciaExistente.processoId));
            }

            atualizados.push(audienciaExistente.id);
            duplicados.push(evento.processo);
            continue;
          }

          // Buscar ou criar assistido (primeiro da lista) — using pre-fetched Maps
          let assistidoId: number | undefined;
          const listaAssistidos = evento.assistidos || [];

          if (listaAssistidos.length > 0) {
            const primeiroAssistido = listaAssistidos[0];

            // Lookup by CPF from pre-fetched map (0 queries instead of 1)
            if (primeiroAssistido.cpf) {
              const cpfLimpo = primeiroAssistido.cpf.replace(/\D/g, "");
              const match = cpfToAssistido.get(cpfLimpo);
              if (match) {
                assistidoId = match.id;
              }
            }

            // Lookup by name from pre-fetched list (0 queries instead of 1)
            if (!assistidoId) {
              assistidoId = findAssistidoByName(primeiroAssistido.nome);
            }

            // Se não encontrou, criar novo assistido (INSERT still needs to be sequential)
            if (!assistidoId) {
              const nomeFormatado = primeiroAssistido.nome
                .toLowerCase()
                .split(" ")
                .map((palavra: string) => {
                  if (["de", "da", "do", "das", "dos", "e"].includes(palavra)) {
                    return palavra;
                  }
                  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                })
                .join(" ");

              const [novoAssistido] = await tx
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  cpf: primeiroAssistido.cpf || null,
                  statusPrisional: "SOLTO",
                  atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as any,
                  workspaceId: targetWorkspaceId,
                })
                .returning({ id: assistidos.id });

              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);

              // Update in-memory caches so subsequent iterations find this new record
              if (primeiroAssistido.cpf) {
                const cpfLimpo = primeiroAssistido.cpf.replace(/\D/g, "");
                cpfToAssistido.set(cpfLimpo, { id: novoAssistido.id });
              }
              assistidosNormalizados.push({
                id: novoAssistido.id,
                nome: nomeFormatado,
                atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as any,
                nomeNormalizado: normalizarNome(nomeFormatado),
              });
            }
          } else {
            // Se não tem assistido identificado, buscar ou criar
            const nomeGenerico = evento.assistido || "Não identificado";

            // Lookup by name from pre-fetched list (0 queries instead of 1)
            if (nomeGenerico !== "Não identificado") {
              assistidoId = findAssistidoByName(nomeGenerico);
            }

            if (!assistidoId) {
              const nomeFormatado = nomeGenerico
                .toLowerCase()
                .split(" ")
                .map((palavra: string) => {
                  if (["de", "da", "do", "das", "dos", "e"].includes(palavra)) {
                    return palavra;
                  }
                  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                })
                .join(" ");

              const [novoAssistido] = await tx
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  statusPrisional: "SOLTO",
                  atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as any,
                  workspaceId: targetWorkspaceId,
                })
                .returning({ id: assistidos.id });

              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);

              // Update in-memory cache
              assistidosNormalizados.push({
                id: novoAssistido.id,
                nome: nomeFormatado,
                atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as any,
                nomeNormalizado: normalizarNome(nomeFormatado),
              });
            }
          }

          // Backfill atribuicaoPrimaria if null — using pre-fetched data (0 queries instead of 1)
          if (assistidoId) {
            const cached = assistidosNormalizados.find(a => a.id === assistidoId);
            if (cached && !cached.atribuicaoPrimaria) {
              await tx.update(assistidos)
                .set({ atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as any })
                .where(eq(assistidos.id, assistidoId));
              // Update in-memory cache
              cached.atribuicaoPrimaria = mapAtribuicao(evento.atribuicao) as any;
            }
          }

          // Buscar ou criar processo — using pre-fetched Map (0 queries instead of 1-2)
          let processoId: number | undefined;
          const processoCache = numeroToProcesso.get(evento.processo);

          if (processoCache) {
            processoId = processoCache.id;

            // Backfill processo data if incomplete (using cached data, 0 extra SELECT)
            const updates: Record<string, any> = {};
            if ((!processoCache.classeProcessual || processoCache.classeProcessual === "Não informado") && evento.classeJudicial) {
              updates.classeProcessual = evento.classeJudicial;
            }
            if ((!processoCache.vara || processoCache.vara === "Não informado") && evento.orgaoJulgador) {
              updates.vara = evento.orgaoJulgador;
            }
            if (Object.keys(updates).length > 0) {
              await tx.update(processos).set(updates).where(eq(processos.id, processoCache.id));
              // Update cache
              if (updates.classeProcessual) processoCache.classeProcessual = updates.classeProcessual;
              if (updates.vara) processoCache.vara = updates.vara;
            }
          } else {
            // Criar processo com todos os campos obrigatórios
            const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
            const areaEnum = mapArea(evento.atribuicao);

            const [novoProcesso] = await tx
              .insert(processos)
              .values({
                assistidoId: assistidoId!,
                numeroAutos: evento.processo,
                atribuicao: atribuicaoEnum as any,
                area: areaEnum as any,
                classeProcessual: evento.classeJudicial || "Não informado",
                vara: evento.orgaoJulgador || "Não informado",
                workspaceId: targetWorkspaceId as number,
              })
              .returning({ id: processos.id });

            processoId = novoProcesso.id;

            // Update in-memory cache so subsequent iterations find this new processo
            numeroToProcesso.set(evento.processo, {
              id: novoProcesso.id,
              classeProcessual: evento.classeJudicial || "Não informado",
              vara: evento.orgaoJulgador || "Não informado",
              isJuri: null,
            });
          }

          // Verificar se é SESSÃO DE JÚRI (não apenas audiência na Vara do Júri)
          // Critério: deve ser "Sessão de Julgamento" ou "Plenário", não apenas mencionar "Júri"
          const tituloLower = evento.titulo?.toLowerCase() || "";
          const ehSessaoJuri =
            evento.tipo === "juri" ||
            tituloLower.includes("sessão de julgamento") ||
            tituloLower.includes("plenário do júri") ||
            tituloLower.includes("plenário do juri") ||
            // Padrão específico: "Júri - Nome" (título gerado pelo parser)
            (tituloLower.startsWith("júri -") && !tituloLower.includes("instrução"));

          if (ehSessaoJuri) {
            // Criar sessão de júri na tabela correta
            const [sessao] = await tx
              .insert(sessoesJuri)
              .values({
                processoId: processoId!,
                dataSessao: dataHora,
                defensorNome: "Defensor", // Será atualizado depois
                assistidoNome: evento.assistido || "Não identificado",
                status: evento.status === "cancelado" ? "CANCELADA" :
                       evento.status === "remarcado" ? "ADIADA" : "AGENDADA",
                observacoes: evento.descricao,
                workspaceId: targetWorkspaceId,
              })
              .returning({ id: sessoesJuri.id });

            // Atualizar processo com flag de júri
            await tx.update(processos)
              .set({ isJuri: true })
              .where(eq(processos.id, processoId!));

            importados.push(sessao.id);
          } else {
            // Criar audiência comum
            const [audiencia] = await tx
              .insert(audiencias)
              .values({
                processoId,
                assistidoId,
                dataAudiencia: dataHora,
                tipo: evento.tipo,
                titulo: evento.titulo,
                descricao: evento.descricao,
                local: evento.local,
                horario: evento.horarioInicio,
                status: evento.status === "confirmado" ? "agendada" :
                       evento.status === "cancelado" ? "cancelada" :
                       evento.status === "remarcado" ? "reagendada" : "agendada",
                workspaceId: targetWorkspaceId,
              })
              .returning({ id: audiencias.id });

            importados.push(audiencia.id);
          }
        }

        return {
          importados: importados.length,
          duplicados: duplicados.length,
          atualizados: atualizados.length,
          duplicadosProcessos: duplicados,
          assistidosCriados: assistidosCriados.length,
        };
      });
    }),
});
