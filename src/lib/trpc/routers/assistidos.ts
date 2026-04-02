import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { assistidos, processos, demandas, audiencias, documentos, movimentacoes, anotacoes, driveFiles, assistidosProcessos, users, comarcas, casos } from "@/lib/db/schema";
import { getAssistidosVisibilityFilter, getComarcaId } from "@/lib/trpc/comarca-scope";
import { eq, ilike, or, desc, sql, and, isNull, inArray, asc, getTableColumns, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { uploadImageBuffer } from "@/lib/supabase/storage";

// Drive lifecycle: cria ou move pasta em background (fire-and-forget)
async function ensureDriveFolderForAssistido(
  assistidoId: number,
  nome: string,
  atribuicao: string,
  oldAtribuicao?: string | null,
  existingFolderId?: string | null,
) {
  try {
    const {
      createOrFindAssistidoFolder,
      moveAssistidoFolder,
      mapAtribuicaoToFolderKey,
      isGoogleDriveConfigured,
    } = await import("@/lib/services/google-drive");

    if (!isGoogleDriveConfigured()) return;

    const folderKey = mapAtribuicaoToFolderKey(atribuicao);
    if (!folderKey) return;

    // Se mudando de atribuição e já tem pasta → mover
    if (oldAtribuicao && existingFolderId && oldAtribuicao !== atribuicao) {
      const oldKey = mapAtribuicaoToFolderKey(oldAtribuicao);
      if (oldKey && oldKey !== folderKey) {
        const moveResult = await moveAssistidoFolder(existingFolderId, oldKey, folderKey);
        if (!moveResult.success) {
          console.error(`[Drive] Erro ao mover pasta do assistido ${assistidoId}:`, moveResult.error);
        }
      }
      return;
    }

    // Se já tem pasta, não precisa criar
    if (existingFolderId) return;

    // Criar pasta no Drive
    const folder = await createOrFindAssistidoFolder(folderKey, nome);
    if (folder) {
      await db
        .update(assistidos)
        .set({ driveFolderId: folder.id, updatedAt: new Date() })
        .where(eq(assistidos.id, assistidoId));
    }
  } catch (error) {
    console.error(`[Drive] Erro ao gerenciar pasta para assistido ${assistidoId}:`, error);
  }
}

export const assistidosRouter = router({
  // Listar assistidos — visibilidade por comarca em 3 camadas (ver comarca-scope.ts)
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusPrisional: z.string().optional(),
        atribuicaoPrimaria: z.string().optional(), // Filtro por atribuição primária
        verRMS: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search, statusPrisional, atribuicaoPrimaria, verRMS } = input || {};

      // Construir condições (assistidos não tem soft delete)
      const conditions: SQL<unknown>[] = [];

      // Filtro de visibilidade em 3 camadas (comarca própria + RMS opcional + processo local automático)
      if (ctx.user.role !== "admin") {
        const visibilityFilter = await getAssistidosVisibilityFilter(ctx.user, { verRMS });
        conditions.push(visibilityFilter);
      }
      
      if (search) {
        // Detectar se o termo parece um número de processo (dígitos + traços/pontos)
        const isProcessoSearch = /\d{4,}/.test(search) && (search.includes('-') || search.includes('.'));

        if (isProcessoSearch) {
          // Buscar IDs de assistidos que possuem um processo com numeroAutos correspondente
          const matchingProcessos = await db
            .select({ assistidoId: processos.assistidoId })
            .from(processos)
            .where(
              and(
                ilike(processos.numeroAutos, `%${search}%`),
                isNull(processos.deletedAt)
              )
            );

          const assistidoIdsFromProcessos = [...new Set(matchingProcessos.map(p => p.assistidoId))];

          if (assistidoIdsFromProcessos.length > 0) {
            conditions.push(
              or(
                ilike(assistidos.nome, `%${search}%`),
                ilike(assistidos.cpf || "", `%${search}%`),
                inArray(assistidos.id, assistidoIdsFromProcessos)
              )!
            );
          } else {
            // Nenhum processo encontrado, manter busca normal por nome/CPF
            conditions.push(
              or(
                ilike(assistidos.nome, `%${search}%`),
                ilike(assistidos.cpf || "", `%${search}%`)
              )!
            );
          }
        } else {
          conditions.push(
            or(
              ilike(assistidos.nome, `%${search}%`),
              ilike(assistidos.cpf || "", `%${search}%`)
            )!
          );
        }
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

      // Query principal - buscar assistidos
      const result = await db
        .select({
          ...getTableColumns(assistidos),
          comarcaNome: comarcas.nome,
        })
        .from(assistidos)
        .leftJoin(comarcas, eq(assistidos.comarcaId, comarcas.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(assistidos.createdAt));

      if (result.length === 0) {
        return [];
      }

      // Buscar dados agregados em paralelo usando Promise.all
      const assistidoIds = result.map(a => a.id);
      const assistidosComPasta = result.filter(a => a.driveFolderId);

      const [
        processosCountData,
        demandasCountData,
        driveFilesCountData,
        audienciasData,
        processosData,
      ] = await Promise.all([
        // Contagem de processos por assistido
        db
          .select({
            assistidoId: processos.assistidoId,
            count: sql<number>`count(*)::int`,
          })
          .from(processos)
          .where(and(
            inArray(processos.assistidoId, assistidoIds),
            isNull(processos.deletedAt)
          ))
          .groupBy(processos.assistidoId),

        // Contagem de demandas por assistido
        db
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
          .groupBy(demandas.assistidoId),

        // Contagem de arquivos do Drive por assistido
        assistidosComPasta.length > 0
          ? db
              .select({
                assistidoId: driveFiles.assistidoId,
                count: sql<number>`count(*)::int`,
              })
              .from(driveFiles)
              .where(and(
                inArray(driveFiles.assistidoId, assistidosComPasta.map(a => a.id)),
                sql`${driveFiles.isFolder} = false`
              ))
              .groupBy(driveFiles.assistidoId)
          : Promise.resolve([] as { assistidoId: number | null; count: number }[]),

        // Próxima audiência por assistido
        db
          .select({
            assistidoId: audiencias.assistidoId,
            dataAudiencia: audiencias.dataAudiencia,
          })
          .from(audiencias)
          .where(and(
            inArray(audiencias.assistidoId!, assistidoIds),
            sql`${audiencias.dataAudiencia} >= NOW()`
          ))
          .orderBy(audiencias.dataAudiencia),

        // Dados dos processos por assistido
        db
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
          .orderBy(desc(processos.createdAt)),
      ]);

      const processosCountMap = new Map(processosCountData.map(p => [p.assistidoId, p.count]));
      const demandasCountMap = new Map(demandasCountData.map(d => [d.assistidoId, d.count]));
      const driveFilesCountMap = new Map(driveFilesCountData.map(d => [d.assistidoId!, d.count]));

      // Agrupar audiências por assistido (pegar a primeira - mais próxima)
      const audienciasMap = new Map<number, Date>();
      for (const a of audienciasData) {
        if (a.assistidoId && !audienciasMap.has(a.assistidoId)) {
          audienciasMap.set(a.assistidoId, a.dataAudiencia);
        }
      }
      
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
        // Derivar atribuicaoPrimaria dos processos quando o valor do assistido é o default
        const atribuicaoDerived = (a.atribuicaoPrimaria === "SUBSTITUICAO" && processoData && processoData.atribuicoes.size > 0)
          ? Array.from(processoData.atribuicoes)[0]
          : a.atribuicaoPrimaria;
        return {
          ...a,
          atribuicaoPrimaria: atribuicaoDerived,
          // Dados agregados
          processosCount: processosCountMap.get(a.id) || 0,
          demandasAbertasCount: demandasCountMap.get(a.id) || 0,
          driveFilesCount: driveFilesCountMap.get(a.id) || 0, // Contagem de arquivos no Drive
          proximaAudiencia: audienciasMap.get(a.id)?.toISOString() || null,
          areas: processoData ? Array.from(processoData.areas) : [],
          atribuicoes: processoData ? Array.from(processoData.atribuicoes) : [],
          comarcas: processoData ? Array.from(processoData.comarcas) : [],
          processoPrincipal: processoData?.numeroAutos || null,
          crimePrincipal: processoData?.assunto || null,
          proximoPrazo: null as string | null,
        };
      });
    }),

  // Buscar assistido por ID (enriquecido)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {

      const [baseRows, processosRows, audienciasRows, demandasRows, driveFilesRows] =
        await Promise.all([
          // Base
          db
            .select()
            .from(assistidos)
            .where(eq(assistidos.id, input.id))
            .limit(1),

          // Processos vinculados via assistidos_processos
          db
            .select({
              id: processos.id,
              numeroAutos: processos.numeroAutos,
              vara: processos.vara,
              assunto: processos.assunto,
              fase: processos.fase,
              situacao: processos.situacao,
              papel: assistidosProcessos.papel,
            })
            .from(assistidosProcessos)
            .innerJoin(processos, eq(assistidosProcessos.processoId, processos.id))
            .where(
              and(
                eq(assistidosProcessos.assistidoId, input.id),
                isNull(processos.deletedAt),
              ),
            ),

          // Audiências
          db
            .select({
              id: audiencias.id,
              dataAudiencia: audiencias.dataAudiencia,
              tipo: audiencias.tipo,
              local: audiencias.local,
              status: audiencias.status,
              processoId: audiencias.processoId,
            })
            .from(audiencias)
            .where(eq(audiencias.assistidoId, input.id))
            .orderBy(desc(audiencias.dataAudiencia)),

          // Demandas — todos defensores
          db
            .select({
              id: demandas.id,
              ato: demandas.ato,
              tipoAto: demandas.tipoAto,
              status: demandas.status,
              prazo: demandas.prazo,
              processoId: demandas.processoId,
              defensorId: demandas.defensorId,
              defensorNome: users.name,
            })
            .from(demandas)
            .leftJoin(users, eq(demandas.defensorId, users.id))
            .where(
              and(
                eq(demandas.assistidoId, input.id),
                isNull(demandas.deletedAt),
              ),
            )
            .orderBy(asc(demandas.prazo)),

          // Drive files
          db
            .select({
              id: driveFiles.id,
              driveFileId: driveFiles.driveFileId,
              name: driveFiles.name,
              mimeType: driveFiles.mimeType,
              webViewLink: driveFiles.webViewLink,
              lastModifiedTime: driveFiles.lastModifiedTime,
              isFolder: driveFiles.isFolder,
              parentFileId: driveFiles.parentFileId,
              driveFolderId: driveFiles.driveFolderId,
              enrichmentStatus: driveFiles.enrichmentStatus,
              documentType: driveFiles.documentType,
              categoria: driveFiles.categoria,
            })
            .from(driveFiles)
            .where(eq(driveFiles.assistidoId, input.id))
            .orderBy(desc(driveFiles.lastModifiedTime))
            .limit(100),
        ]);

      if (baseRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      // Verificar visibilidade por comarca para não-admins
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin) {
        const visibilityFilter = await getAssistidosVisibilityFilter(ctx.user);
        const check = await db
          .select({ id: assistidos.id })
          .from(assistidos)
          .where(and(eq(assistidos.id, input.id), visibilityFilter))
          .limit(1);
        if (!check[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      // Group processes by caso
      // First get casoIds from the assistido's processes
      const assistidoProcessoRows = await db
        .select({
          processoId: assistidosProcessos.processoId,
          ativo: assistidosProcessos.ativo,
          papel: assistidosProcessos.papel,
        })
        .from(assistidosProcessos)
        .where(eq(assistidosProcessos.assistidoId, input.id));

      // Get the processo details to find casoIds
      const assistidoProcessoIds = assistidoProcessoRows.map((r) => r.processoId);
      const processosComCaso = assistidoProcessoIds.length > 0
        ? await db
            .select({ id: processos.id, casoId: processos.casoId })
            .from(processos)
            .where(and(
              inArray(processos.id, assistidoProcessoIds),
              isNull(processos.deletedAt),
            ))
        : [];

      const casoIds = [...new Set(processosComCaso.map((p) => p.casoId).filter((id): id is number => id !== null))];

      let casosAgrupados: {
        id: number;
        titulo: string;
        processos: {
          id: number;
          numeroAutos: string | null;
          tipoProcesso: string | null;
          isReferencia: boolean | null;
          ativo: boolean;
          papel: string;
          isDoProprio: boolean;
        }[];
      }[] = [];

      if (casoIds.length > 0) {
        const casoRows = await db
          .select({ id: casos.id, titulo: casos.titulo })
          .from(casos)
          .where(inArray(casos.id, casoIds));

        const todosProcessosCaso = await db
          .select({
            id: processos.id,
            casoId: processos.casoId,
            numeroAutos: processos.numeroAutos,
            tipoProcesso: processos.tipoProcesso,
            isReferencia: processos.isReferencia,
          })
          .from(processos)
          .where(
            and(
              inArray(processos.casoId, casoIds),
              isNull(processos.deletedAt),
            ),
          );

        const vinculacaoMap = new Map(
          assistidoProcessoRows.map((v) => [v.processoId, v])
        );

        casosAgrupados = casoRows.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          processos: todosProcessosCaso
            .filter((p) => p.casoId === c.id)
            .map((p) => {
              const v = vinculacaoMap.get(p.id);
              return {
                id: p.id,
                numeroAutos: p.numeroAutos,
                tipoProcesso: p.tipoProcesso,
                isReferencia: p.isReferencia,
                ativo: v?.ativo ?? false,
                papel: v?.papel ?? "",
                isDoProprio: !!v,
              };
            }),
        }));
      }

      return {
        ...baseRows[0],
        processos: processosRows,
        audiencias: audienciasRows,
        demandas: demandasRows,
        driveFiles: driveFilesRows,
        casosAgrupados,
      };
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
        atribuicaoPrimaria: z.enum([
          "JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL",
          "SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"
        ]).optional(),
        driveFolderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

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
          atribuicaoPrimaria: input.atribuicaoPrimaria || "SUBSTITUICAO",
          driveFolderId: input.driveFolderId || null,
          comarcaId: getComarcaId(ctx.user),
        })
        .returning();

      // Drive lifecycle: await folder creation, but don't block assistido creation on failure
      let driveFolderError = false;
      if (!input.driveFolderId) {
        try {
          await ensureDriveFolderForAssistido(
            novoAssistido.id,
            novoAssistido.nome,
            input.atribuicaoPrimaria || "SUBSTITUICAO",
          );
        } catch {
          driveFolderError = true;
          console.error(`[Drive] Falha ao criar pasta para assistido ${novoAssistido.id}, mas assistido foi criado com sucesso.`);
        }
      }

      return { ...novoAssistido, driveFolderError };
    }),
  
  // Verificar duplicados potenciais antes de criar
  checkDuplicates: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      cpf: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {

      
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

      const isAdmin = ctx.user.role === "admin";
      const comarcaCondition = isAdmin ? undefined : eq(assistidos.comarcaId, getComarcaId(ctx.user));

      // Verificar CPF
      if (input.cpf) {
        const cpfLimpo = input.cpf.replace(/\D/g, "");
        const [existenteCpf] = await db
          .select({ id: assistidos.id, nome: assistidos.nome, cpf: assistidos.cpf })
          .from(assistidos)
          .where(
            and(
              sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') = ${cpfLimpo}`,
              comarcaCondition
            )
          )
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
        .where(and(ilike(assistidos.nome, `%${primeiroNome}%`), comarcaCondition))
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
      const isAdmin = ctx.user.role === "admin";

      // Buscar estado anterior para detectar mudança de atribuição
      let oldAssistido: { atribuicaoPrimaria: string | null; driveFolderId: string | null; nome: string } | null = null;
      if (input.atribuicaoPrimaria) {
        const [existing] = await db
          .select({
            atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
            driveFolderId: assistidos.driveFolderId,
            nome: assistidos.nome,
          })
          .from(assistidos)
          .where(eq(assistidos.id, id))
          .limit(1);
        oldAssistido = existing || null;
      }

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
            : eq(assistidos.id, id)
        )
        .returning();

      // Drive lifecycle: mover pasta se atribuição mudou, ou criar se necessário
      if (input.atribuicaoPrimaria && oldAssistido) {
        ensureDriveFolderForAssistido(
          id,
          atualizado.nome,
          input.atribuicaoPrimaria,
          oldAssistido.atribuicaoPrimaria,
          oldAssistido.driveFolderId,
        ).catch(() => {}); // fire-and-forget
      }

      return atualizado;
    }),

  // Upload de foto do assistido
  uploadPhoto: protectedProcedure
    .input(z.object({
      assistidoId: z.number(),
      imageBase64: z.string(),
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const { url } = await uploadImageBuffer(
        buffer,
        input.fileName,
        input.contentType,
        "assistidos"
      );
      await db
        .update(assistidos)
        .set({ photoUrl: url, updatedAt: new Date() })
        .where(eq(assistidos.id, input.assistidoId));
      return { photoUrl: url };
    }),

  // Analisar todos os documentos da pasta Drive com IA
  analyzeAllDocuments: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input }) => {
      // 1. Buscar assistido
      const [assistido] = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          driveFolderId: assistidos.driveFolderId,
        })
        .from(assistidos)
        .where(eq(assistidos.id, input.assistidoId))
        .limit(1);

      if (!assistido) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
      }

      if (!assistido.driveFolderId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Assistido não possui pasta no Google Drive",
        });
      }

      // 2. Listar arquivos PDF na pasta
      const { listFilesInFolder, downloadFileContent, isGoogleDriveConfigured } =
        await import("@/lib/services/google-drive");

      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Drive não configurado",
        });
      }

      const filesResult = await listFilesInFolder(assistido.driveFolderId);
      const pdfFiles = (filesResult?.files || []).filter(
        (f: any) => f.mimeType === "application/pdf" || f.name?.endsWith(".pdf")
      );

      if (pdfFiles.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum arquivo PDF encontrado na pasta do assistido",
        });
      }

      // 3. Download e converter para base64 (máx 10 arquivos)
      const documents: Array<{ name: string; base64: string; mimeType: string }> = [];
      const limit = Math.min(pdfFiles.length, 10);

      for (let i = 0; i < limit; i++) {
        try {
          const content = await downloadFileContent(pdfFiles[i].id);
          if (content) {
            const base64 = Buffer.from(content).toString("base64");
            documents.push({
              name: pdfFiles[i].name || `documento_${i + 1}.pdf`,
              base64,
              mimeType: "application/pdf",
            });
          }
        } catch (error) {
          console.error(`[AI] Erro ao baixar arquivo ${pdfFiles[i].name}:`, error);
        }
      }

      if (documents.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível baixar nenhum documento",
        });
      }

      // 4. Analisar com IA
      const { analyzeMultipleDocuments, isPdfExtractionConfigured } =
        await import("@/lib/ai/pdf-extraction");

      if (!isPdfExtractionConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Extração de PDF não configurada. Verifique a API key do Gemini.",
        });
      }

      const result = await analyzeMultipleDocuments(documents);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Erro na análise multi-documento",
        });
      }

      // 5. Atualizar assistido com dados consolidados
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (result.dadosConsolidados.cpf && !assistido.cpf) {
        updateData.cpf = result.dadosConsolidados.cpf;
      }

      await db
        .update(assistidos)
        .set(updateData)
        .where(eq(assistidos.id, input.assistidoId));

      return {
        ...result,
        assistidoId: input.assistidoId,
        totalPdfs: pdfFiles.length,
        processados: documents.length,
      };
    }),

  // Excluir assistido (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin";

      const [excluido] = await db
        .update(assistidos)
        .set({ deletedAt: new Date() })
        .where(
          isAdmin
            ? eq(assistidos.id, input.id)
            : eq(assistidos.id, input.id)
        )
        .returning();
      
      return excluido;
    }),

  // Buscar processos de um assistido
  getProcessos: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .query(async ({ ctx, input }) => {

      
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
    const isAdmin = ctx.user.role === "admin";
    const baseConditions = isAdmin
      ? [isNull(assistidos.deletedAt)]
      : [isNull(assistidos.deletedAt), eq(assistidos.comarcaId, getComarcaId(ctx.user))];


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
      const isAdmin = ctx.user.role === "admin";
      const assistidoScope = await db
        .select({ id: assistidos.id })
        .from(assistidos)
        .where(
          isAdmin
            ? eq(assistidos.id, input.assistidoId)
            : eq(assistidos.id, input.assistidoId)
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

  linkDriveFolder: protectedProcedure
    .input(
      z.object({
        assistidoId: z.number(),
        driveFileId: z.string(), // driveFiles.driveFileId da pasta a vincular
      })
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        // 1. Atualiza o assistido
        await tx
          .update(assistidos)
          .set({ driveFolderId: input.driveFileId, updatedAt: new Date() })
          .where(eq(assistidos.id, input.assistidoId));

        // 2. Marca a pasta em driveFiles com o assistidoId
        await tx
          .update(driveFiles)
          .set({ assistidoId: input.assistidoId, updatedAt: new Date() })
          .where(eq(driveFiles.driveFileId, input.driveFileId));

        // 3. Vincula os arquivos filhos diretos (aqueles cujo driveFolderId aponta para esta pasta)
        await tx
          .update(driveFiles)
          .set({ assistidoId: input.assistidoId, updatedAt: new Date() })
          .where(
            and(
              eq(driveFiles.driveFolderId, input.driveFileId),
              isNull(driveFiles.assistidoId)
            )
          );
      });

      return { success: true };
    }),
});
