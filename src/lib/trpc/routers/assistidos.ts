import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { assistidos, processos, demandas, audiencias, documentos, movimentacoes, anotacoes, driveFiles } from "@/lib/db/schema";
import { eq, ilike, or, desc, sql, and, isNull, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getWorkspaceScope, resolveWorkspaceId } from "../workspace";

export const assistidosRouter = router({
  // Listar todos os assistidos
  // Assistidos são COMPARTILHADOS - todos os defensores têm acesso
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusPrisional: z.string().optional(),
        atribuicaoPrimaria: z.string().optional(), // Filtro por atribuição primária
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, statusPrisional, atribuicaoPrimaria, limit = 50, offset = 0 } = input || {};
      // Assistidos são compartilhados - não filtrar por workspace
      getWorkspaceScope(ctx.user); // Apenas para validar autenticação
      
      // Construir condições (assistidos não tem soft delete)
      const conditions: ReturnType<typeof eq>[] = [];
      
      if (search) {
        conditions.push(
          or(
            ilike(assistidos.nome, `%${search}%`),
            ilike(assistidos.cpf || "", `%${search}%`)
          )!
        );
      }
      
      if (statusPrisional && statusPrisional !== "all") {
        conditions.push(eq(assistidos.statusPrisional, statusPrisional as any));
      }

      // Filtro por atribuição primária
      if (atribuicaoPrimaria && atribuicaoPrimaria !== "all") {
        // Mapear atribuições simplificadas para valores do enum
        const atribuicaoMap: Record<string, string[]> = {
          "JURI": ["JURI_CAMACARI", "GRUPO_JURI"],
          "VVD": ["VVD_CAMACARI"],
          "EXECUCAO": ["EXECUCAO_PENAL"],
          "SUBSTITUICAO": ["SUBSTITUICAO"],
          "SUBSTITUICAO_CIVEL": ["SUBSTITUICAO_CIVEL"],
        };
        const valores = atribuicaoMap[atribuicaoPrimaria] || [atribuicaoPrimaria];
        conditions.push(inArray(assistidos.atribuicaoPrimaria, valores as any));
      }

      // Dados compartilhados - não filtrar por workspace
      
      // Query principal - buscar assistidos
      const result = await db
        .select()
        .from(assistidos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(assistidos.createdAt))
        .limit(limit)
        .offset(offset);

      if (result.length === 0) {
        return [];
      }

      // Buscar dados agregados usando Drizzle ORM
      const assistidoIds = result.map(a => a.id);
      
      // Contagem de processos por assistido
      const processosCountData = await db
        .select({
          assistidoId: processos.assistidoId,
          count: sql<number>`count(*)::int`,
        })
        .from(processos)
        .where(and(
          inArray(processos.assistidoId, assistidoIds),
          isNull(processos.deletedAt)
        ))
        .groupBy(processos.assistidoId);
      
      const processosCountMap = new Map(processosCountData.map(p => [p.assistidoId, p.count]));
      
      // Contagem de demandas por assistido
      const demandasCountData = await db
        .select({
          assistidoId: demandas.assistidoId,
          count: sql<number>`count(*)::int`,
        })
        .from(demandas)
        .where(and(
          inArray(demandas.assistidoId, assistidoIds),
          sql`${demandas.status} NOT IN ('CONCLUIDO', 'ARQUIVADO')`,
          isNull(demandas.deletedAt)
        ))
        .groupBy(demandas.assistidoId);
      
      const demandasCountMap = new Map(demandasCountData.map(d => [d.assistidoId, d.count]));

      // Contagem de arquivos do Drive por assistido (para quem tem pasta vinculada)
      const assistidosComPasta = result.filter(a => a.driveFolderId);
      let driveFilesCountMap = new Map<number, number>();

      if (assistidosComPasta.length > 0) {
        const driveFilesCountData = await db
          .select({
            assistidoId: driveFiles.assistidoId,
            count: sql<number>`count(*)::int`,
          })
          .from(driveFiles)
          .where(and(
            inArray(driveFiles.assistidoId, assistidosComPasta.map(a => a.id)),
            sql`${driveFiles.isFolder} = false` // Só conta arquivos, não pastas
          ))
          .groupBy(driveFiles.assistidoId);

        driveFilesCountMap = new Map(driveFilesCountData.map(d => [d.assistidoId!, d.count]));
      }

      // Próxima audiência por assistido
      const audienciasData = await db
        .select({
          assistidoId: audiencias.assistidoId,
          dataAudiencia: audiencias.dataAudiencia,
        })
        .from(audiencias)
        .where(and(
          inArray(audiencias.assistidoId!, assistidoIds),
          sql`${audiencias.dataAudiencia} >= NOW()`
        ))
        .orderBy(audiencias.dataAudiencia);
      
      // Agrupar por assistido (pegar a primeira - mais próxima)
      const audienciasMap = new Map<number, Date>();
      for (const a of audienciasData) {
        if (a.assistidoId && !audienciasMap.has(a.assistidoId)) {
          audienciasMap.set(a.assistidoId, a.dataAudiencia);
        }
      }
      
      // Dados dos processos por assistido
      const processosData = await db
        .select({
          assistidoId: processos.assistidoId,
          area: processos.area,
          atribuicao: processos.atribuicao,
          comarca: processos.comarca,
          numeroAutos: processos.numeroAutos,
          assunto: processos.assunto,
        })
        .from(processos)
        .where(and(
          inArray(processos.assistidoId, assistidoIds),
          isNull(processos.deletedAt)
        ))
        .orderBy(desc(processos.createdAt));
      
      // Agrupar por assistido - coletar todas as áreas e atribuições
      const processosDataMap = new Map<number, {
        areas: Set<string>;
        atribuicoes: Set<string>;
        comarcas: Set<string>;
        numeroAutos: string | null;
        assunto: string | null;
      }>();
      
      for (const p of processosData) {
        if (!processosDataMap.has(p.assistidoId)) {
          processosDataMap.set(p.assistidoId, {
            areas: new Set(),
            atribuicoes: new Set(),
            comarcas: new Set(),
            numeroAutos: p.numeroAutos,
            assunto: p.assunto,
          });
        }
        const data = processosDataMap.get(p.assistidoId)!;
        if (p.area) data.areas.add(p.area);
        if (p.atribuicao) data.atribuicoes.add(p.atribuicao);
        if (p.comarca) data.comarcas.add(p.comarca);
      }

      return result.map(a => {
        const processoData = processosDataMap.get(a.id);
        return {
          ...a,
          // Dados agregados
          processosCount: processosCountMap.get(a.id) || 0,
          demandasAbertasCount: demandasCountMap.get(a.id) || 0,
          driveFilesCount: driveFilesCountMap.get(a.id) || 0, // Contagem de arquivos no Drive
          proximaAudiencia: audienciasMap.get(a.id)?.toISOString() || null,
          areas: processoData ? Array.from(processoData.areas).join(',') : null,
          atribuicoes: processoData ? Array.from(processoData.atribuicoes).join(',') : null,
          comarcas: processoData ? Array.from(processoData.comarcas).join(',') : null,
          processoPrincipal: processoData?.numeroAutos || null,
          crimePrincipal: processoData?.assunto || null,
          proximoPrazo: null as string | null,
        };
      });
    }),

  // Buscar assistido por ID
  // Assistidos são COMPARTILHADOS
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user); // Validar autenticação
      
      const [assistido] = await db
        .select()
        .from(assistidos)
        .where(eq(assistidos.id, input.id));
      
      return assistido || null;
    }),

  // Criar novo assistido
  create: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).default("SOLTO"),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
        workspaceId: z.number().optional(),
        atribuicaoPrimaria: z.enum([
          "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
          "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"
        ]).optional(),
        driveFolderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = resolveWorkspaceId(ctx.user, input.workspaceId);

      if (!workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Defina um workspace para criar o assistido.",
        });
      }

      // Verificar se já existe assistido com mesmo CPF
      if (input.cpf) {
        const cpfLimpo = input.cpf.replace(/\D/g, "");
        const [existenteCpf] = await db
          .select({ id: assistidos.id, nome: assistidos.nome })
          .from(assistidos)
          .where(sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') = ${cpfLimpo}`)
          .limit(1);
        
        if (existenteCpf) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um assistido cadastrado com este CPF: ${existenteCpf.nome} (ID: ${existenteCpf.id})`,
          });
        }
      }

      // Verificar nomes muito similares
      const primeiroNome = input.nome.split(" ")[0];
      const candidatosSimilares = await db
        .select({ id: assistidos.id, nome: assistidos.nome, cpf: assistidos.cpf })
        .from(assistidos)
        .where(ilike(assistidos.nome, `${primeiroNome}%`))
        .limit(20);
      
      // Função para normalizar e comparar nomes
      const normalizarNome = (nome: string): string => {
        return nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
      };

      const nomeNormalizado = normalizarNome(input.nome);
      const duplicadoExato = candidatosSimilares.find(c => normalizarNome(c.nome) === nomeNormalizado);
      
      if (duplicadoExato) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Já existe um assistido com nome idêntico: ${duplicadoExato.nome} (ID: ${duplicadoExato.id})${duplicadoExato.cpf ? ` - CPF: ${duplicadoExato.cpf}` : ''}. Se for outra pessoa, adicione algum diferenciador ao nome.`,
        });
      }

      const [novoAssistido] = await db
        .insert(assistidos)
        .values({
          nome: input.nome,
          cpf: input.cpf || null,
          rg: input.rg || null,
          nomeMae: input.nomeMae || null,
          nomePai: input.nomePai || null,
          dataNascimento: input.dataNascimento || null,
          naturalidade: input.naturalidade || null,
          nacionalidade: input.nacionalidade || "Brasileira",
          statusPrisional: input.statusPrisional,
          localPrisao: input.localPrisao || null,
          unidadePrisional: input.unidadePrisional || null,
          dataPrisao: input.dataPrisao || null,
          telefone: input.telefone || null,
          telefoneContato: input.telefoneContato || null,
          nomeContato: input.nomeContato || null,
          parentescoContato: input.parentescoContato || null,
          endereco: input.endereco || null,
          observacoes: input.observacoes || null,
          defensorId: input.defensorId || ctx.user.id,
          workspaceId,
          atribuicaoPrimaria: input.atribuicaoPrimaria || "SUBSTITUICAO",
          driveFolderId: input.driveFolderId || null,
        })
        .returning();

      return novoAssistido;
    }),
  
  // Verificar duplicados potenciais antes de criar
  checkDuplicates: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      cpf: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user); // Validar autenticação
      
      const normalizarNome = (nome: string): string => {
        return nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
      };

      const calcularSimilaridade = (str1: string, str2: string): number => {
        const s1 = normalizarNome(str1);
        const s2 = normalizarNome(str2);
        if (s1 === s2) return 1;
        
        const palavras1 = s1.split(" ");
        const palavras2 = s2.split(" ");
        const palavrasComuns = palavras1.filter(p => palavras2.includes(p));
        
        return palavrasComuns.length / Math.max(palavras1.length, palavras2.length);
      };

      const duplicados: Array<{
        id: number;
        nome: string;
        cpf: string | null;
        similaridade: number;
        tipo: "exato" | "cpf" | "similar";
      }> = [];

      // Verificar CPF
      if (input.cpf) {
        const cpfLimpo = input.cpf.replace(/\D/g, "");
        const [existenteCpf] = await db
          .select({ id: assistidos.id, nome: assistidos.nome, cpf: assistidos.cpf })
          .from(assistidos)
          .where(sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') = ${cpfLimpo}`)
          .limit(1);
        
        if (existenteCpf) {
          duplicados.push({
            id: existenteCpf.id,
            nome: existenteCpf.nome,
            cpf: existenteCpf.cpf,
            similaridade: 1,
            tipo: "cpf",
          });
        }
      }

      // Verificar nomes similares
      const primeiroNome = input.nome.split(" ")[0];
      const candidatos = await db
        .select({ id: assistidos.id, nome: assistidos.nome, cpf: assistidos.cpf })
        .from(assistidos)
        .where(ilike(assistidos.nome, `%${primeiroNome}%`))
        .limit(20);

      for (const candidato of candidatos) {
        // Evitar duplicar se já encontrado por CPF
        if (duplicados.find(d => d.id === candidato.id)) continue;

        const similaridade = calcularSimilaridade(candidato.nome, input.nome);
        
        if (similaridade === 1) {
          duplicados.push({
            id: candidato.id,
            nome: candidato.nome,
            cpf: candidato.cpf,
            similaridade: 1,
            tipo: "exato",
          });
        } else if (similaridade >= 0.6) {
          duplicados.push({
            id: candidato.id,
            nome: candidato.nome,
            cpf: candidato.cpf,
            similaridade,
            tipo: "similar",
          });
        }
      }

      return {
        hasDuplicates: duplicados.length > 0,
        duplicados: duplicados.sort((a, b) => b.similaridade - a.similaridade),
      };
    }),

  // Atualizar assistido
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        nomeMae: z.string().optional(),
        nomePai: z.string().optional(),
        dataNascimento: z.string().optional(),
        naturalidade: z.string().optional(),
        nacionalidade: z.string().optional(),
        statusPrisional: z.enum([
          "SOLTO", "CADEIA_PUBLICA", "PENITENCIARIA", "COP", 
          "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"
        ]).optional(),
        localPrisao: z.string().optional(),
        unidadePrisional: z.string().optional(),
        dataPrisao: z.string().optional(),
        telefone: z.string().optional(),
        telefoneContato: z.string().optional(),
        nomeContato: z.string().optional(),
        parentescoContato: z.string().optional(),
        endereco: z.string().optional(),
        observacoes: z.string().optional(),
        defensorId: z.number().optional(),
        photoUrl: z.string().optional(),
        atribuicaoPrimaria: z.enum([
          "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
          "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"
        ]).optional(),
        driveFolderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      
      // Só incluir campos que foram enviados
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });
      
      const [atualizado] = await db
        .update(assistidos)
        .set(updateData)
        .where(
          isAdmin
            ? eq(assistidos.id, id)
            : and(eq(assistidos.id, id), workspaceId ? eq(assistidos.workspaceId, workspaceId as number) : undefined)
        )
        .returning();
      
      return atualizado;
    }),

  // Excluir assistido (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);

      const [excluido] = await db
        .update(assistidos)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? eq(assistidos.id, input.id)
            : and(eq(assistidos.id, input.id), workspaceId ? eq(assistidos.workspaceId, workspaceId as number) : undefined)
        )
        .returning();
      
      return excluido;
    }),

  // Buscar processos de um assistido
  getProcessos: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user); // Validar autenticação
      
      const result = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          area: processos.area,
          atribuicao: processos.atribuicao,
          classeProcessual: processos.classeProcessual,
          vara: processos.vara,
          situacao: processos.situacao,
          isJuri: processos.isJuri,
          createdAt: processos.createdAt,
        })
        .from(processos)
        .where(and(
          eq(processos.assistidoId, input.assistidoId),
          isNull(processos.deletedAt)
        ))
        .orderBy(desc(processos.createdAt));
      
      return result;
    }),

  // Buscar audiências de um assistido
  getAudiencias: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);
      
      const result = await db
        .select({
          id: audiencias.id,
          dataAudiencia: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          titulo: audiencias.titulo,
          local: audiencias.local,
          status: audiencias.status,
          processoId: audiencias.processoId,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .where(eq(audiencias.assistidoId, input.assistidoId))
        .orderBy(desc(audiencias.dataAudiencia));
      
      return result;
    }),

  // Buscar demandas de um assistido
  getDemandas: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {
      getWorkspaceScope(ctx.user);
      
      const result = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          prioridade: demandas.prioridade,
          processoId: demandas.processoId,
          processo: {
            id: processos.id,
            numeroAutos: processos.numeroAutos,
          },
        })
        .from(demandas)
        .leftJoin(processos, eq(demandas.processoId, processos.id))
        .where(and(
          eq(demandas.assistidoId, input.assistidoId),
          isNull(demandas.deletedAt)
        ))
        .orderBy(desc(demandas.prazo));
      
      return result;
    }),

  // Estatísticas
  stats: protectedProcedure.query(async ({ ctx }) => {
    const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
    const baseConditions = [isNull(assistidos.deletedAt)];

    if (!isAdmin && workspaceId) {
      baseConditions.push(eq(assistidos.workspaceId, workspaceId as number));
    }

    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(and(...baseConditions));
    
    // Contagem por status prisional (presos)
    const presos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          ...baseConditions,
          or(
            eq(assistidos.statusPrisional, "CADEIA_PUBLICA"),
            eq(assistidos.statusPrisional, "PENITENCIARIA"),
            eq(assistidos.statusPrisional, "COP"),
            eq(assistidos.statusPrisional, "HOSPITAL_CUSTODIA")
          )
        )
      );
    
    // Contagem soltos
    const soltos = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistidos)
      .where(
        and(
          ...baseConditions,
          or(
            eq(assistidos.statusPrisional, "SOLTO"),
            eq(assistidos.statusPrisional, "DOMICILIAR"),
            eq(assistidos.statusPrisional, "MONITORADO")
          )
        )
      );
    
    return {
      total: Number(total[0]?.count || 0),
      presos: Number(presos[0]?.count || 0),
      soltos: Number(soltos[0]?.count || 0),
    };
  }),

  // ==========================================
  // TIMELINE UNIFICADA DO ASSISTIDO
  // ==========================================
  listTimeline: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { isAdmin, workspaceId } = getWorkspaceScope(ctx.user);
      const assistidoScope = await db
        .select({ id: assistidos.id })
        .from(assistidos)
        .where(
          isAdmin
            ? eq(assistidos.id, input.assistidoId)
            : and(eq(assistidos.id, input.assistidoId), eq(assistidos.workspaceId, workspaceId as number))
        );

      if (assistidoScope.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado." });
      }

      const processosDoAssistido = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
        })
        .from(processos)
        .where(and(
          eq(processos.assistidoId, input.assistidoId),
          isNull(processos.deletedAt)
        ));

      const processoIds = processosDoAssistido.map((p) => p.id);
      const processoMap = processosDoAssistido.reduce<Record<number, string>>((acc, item) => {
        acc[item.id] = item.numeroAutos;
        return acc;
      }, {});

      const audienciasData = await db
        .select({
          id: audiencias.id,
          data: audiencias.dataAudiencia,
          tipo: audiencias.tipo,
          status: audiencias.status,
          local: audiencias.local,
          sala: audiencias.sala,
          processoId: audiencias.processoId,
        })
        .from(audiencias)
        .where(
          processoIds.length > 0
            ? or(
                eq(audiencias.assistidoId, input.assistidoId),
                inArray(audiencias.processoId, processoIds)
              )
            : eq(audiencias.assistidoId, input.assistidoId)
        );

      const demandasData = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          prazo: demandas.prazo,
          status: demandas.status,
          processoId: demandas.processoId,
        })
        .from(demandas)
        .where(and(
          eq(demandas.assistidoId, input.assistidoId),
          isNull(demandas.deletedAt)
        ));

      const anotacoesData = await db
        .select({
          id: anotacoes.id,
          conteudo: anotacoes.conteudo,
          tipo: anotacoes.tipo,
          createdAt: anotacoes.createdAt,
        })
        .from(anotacoes)
        .where(eq(anotacoes.assistidoId, input.assistidoId));

      const documentosData = await db
        .select({
          id: documentos.id,
          titulo: documentos.titulo,
          createdAt: documentos.createdAt,
          processoId: documentos.processoId,
        })
        .from(documentos)
        .where(
          processoIds.length > 0
            ? or(
                eq(documentos.assistidoId, input.assistidoId),
                inArray(documentos.processoId, processoIds)
              )
            : eq(documentos.assistidoId, input.assistidoId)
        );

      const movimentacoesData = processoIds.length
        ? await db
            .select({
              id: movimentacoes.id,
              data: movimentacoes.dataMovimentacao,
              descricao: movimentacoes.descricao,
              tipo: movimentacoes.tipo,
              processoId: movimentacoes.processoId,
            })
            .from(movimentacoes)
            .where(inArray(movimentacoes.processoId, processoIds))
        : [];

      const timeline = [
        ...audienciasData
          .filter((item) => item.data)
          .map((item) => ({
            id: `aud-${item.id}`,
            type: "audiencia",
            title: `Audiência ${item.tipo}`,
            description: [item.local, item.sala ? `Sala ${item.sala}` : null]
              .filter(Boolean)
              .join(" • "),
            date: item.data,
            processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
          })),
        ...demandasData
          .filter((item) => item.prazo)
          .map((item) => ({
            id: `dem-${item.id}`,
            type: "demanda",
            title: item.ato,
            description: `Status: ${item.status}`,
            date: item.prazo,
            processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
          })),
        ...anotacoesData.map((item) => ({
          id: `nota-${item.id}`,
          type: "nota",
          title: item.tipo === "providencia" ? "Providência" : "Nota da defesa",
          description: item.conteudo,
          date: item.createdAt,
        })),
        ...documentosData.map((item) => ({
          id: `doc-${item.id}`,
          type: "documento",
          title: item.titulo,
          description: "Documento anexado",
          date: item.createdAt,
          processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
        })),
        ...movimentacoesData.map((item) => ({
          id: `mov-${item.id}`,
          type: "movimentacao",
          title: item.descricao,
          description: item.tipo || "Movimentação processual",
          date: item.data,
          processoNumero: item.processoId ? processoMap[item.processoId] : undefined,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());

      return timeline;
    }),
});
