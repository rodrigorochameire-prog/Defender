import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db, audiencias, processos, assistidos } from "@/lib/db";
import { eq, and, gte, desc, asc, isNull, or, sql, ilike } from "drizzle-orm";
import { addDays } from "date-fns";
import { getWorkspaceScope } from "../workspace";

export const audienciasRouter = router({
  // Listar audiências
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(30),
      offset: z.number().default(0),
      responsavelId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { limit = 30, offset = 0, responsavelId } = input || {};

      const whereConditions = [];

      // Filtrar audiências futuras ou de hoje
      whereConditions.push(gte(audiencias.dataAudiencia, new Date()));

      // Filtrar por responsável se especificado
      if (responsavelId) {
        whereConditions.push(
          or(
            eq(audiencias.defensorId, responsavelId),
            isNull(audiencias.defensorId)
          )
        );
      }

      const results = await db
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
        .limit(limit)
        .offset(offset);

      return results;
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
  proximas: protectedProcedure
    .input(z.object({
      dias: z.number().default(30),
      limite: z.number().default(10),
    }).optional())
    .query(async ({ input }) => {
      const { dias = 30, limite = 10 } = input || {};
      const dataLimite = addDays(new Date(), dias);

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
          },
        })
        .from(audiencias)
        .leftJoin(processos, eq(audiencias.processoId, processos.id))
        .where(
          and(
            gte(audiencias.dataAudiencia, new Date()),
            sql`${audiencias.dataAudiencia} <= ${dataLimite}`
          )
        )
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
      const importados: number[] = [];
      const duplicados: string[] = [];
      const assistidosCriados: number[] = [];
      
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

      for (const evento of eventos) {
        try {
          // Construir data/hora completa
          const dataHora = new Date(`${evento.data}T${evento.horarioInicio}:00`);
          
          // Verificar se já existe uma audiência com mesmo processo, data e horário
          const existente = await db
            .select({ id: audiencias.id })
            .from(audiencias)
            .leftJoin(processos, eq(audiencias.processoId, processos.id))
            .where(
              and(
                eq(audiencias.dataAudiencia, dataHora),
                eq(processos.numeroAutos, evento.processo)
              )
            )
            .limit(1);

          if (existente.length > 0) {
            duplicados.push(evento.processo);
            continue;
          }

          // Buscar ou criar assistido (primeiro da lista)
          let assistidoId: number | undefined;
          const listaAssistidos = evento.assistidos || [];
          
          if (listaAssistidos.length > 0) {
            const primeiroAssistido = listaAssistidos[0];
            const nomeNormalizado = normalizarNome(primeiroAssistido.nome);
            
            // Buscar por CPF se disponível (identificador único confiável)
            if (primeiroAssistido.cpf) {
              const cpfLimpo = primeiroAssistido.cpf.replace(/\D/g, "");
              const [assistidoExistente] = await db
                .select({ id: assistidos.id })
                .from(assistidos)
                .where(sql`REPLACE(REPLACE(REPLACE(${assistidos.cpf}, '.', ''), '-', ''), ' ', '') = ${cpfLimpo}`)
                .limit(1);
              
              if (assistidoExistente) {
                assistidoId = assistidoExistente.id;
              }
            }
            
            // Se não encontrou por CPF, buscar por nome normalizado (case-insensitive)
            if (!assistidoId) {
              // Busca case-insensitive com ilike
              const candidatos = await db
                .select({ id: assistidos.id, nome: assistidos.nome })
                .from(assistidos)
                .where(ilike(assistidos.nome, `%${primeiroAssistido.nome.split(" ")[0]}%`))
                .limit(10);
              
              // Encontrar match exato normalizado ou mais similar
              for (const candidato of candidatos) {
                const similaridade = calcularSimilaridade(candidato.nome, primeiroAssistido.nome);
                if (similaridade >= 0.9) { // 90% de similaridade = mesmo assistido
                  assistidoId = candidato.id;
                  break;
                }
              }
            }
            
            // Se não encontrou, criar novo assistido
            if (!assistidoId) {
              // Formatar nome corretamente (capitalizar cada palavra)
              const nomeFormatado = primeiroAssistido.nome
                .toLowerCase()
                .split(" ")
                .map((palavra: string) => {
                  // Manter preposições em minúsculo
                  if (["de", "da", "do", "das", "dos", "e"].includes(palavra)) {
                    return palavra;
                  }
                  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                })
                .join(" ");
              
              const [novoAssistido] = await db
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  cpf: primeiroAssistido.cpf || null,
                  statusPrisional: "SOLTO",
                  workspaceId: targetWorkspaceId,
                })
                .returning({ id: assistidos.id });
              
              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);
            }
          } else {
            // Se não tem assistido identificado, buscar ou criar
            const nomeGenerico = evento.assistido || "Não identificado";
            
            // Tentar encontrar existente primeiro
            if (nomeGenerico !== "Não identificado") {
              const candidatos = await db
                .select({ id: assistidos.id, nome: assistidos.nome })
                .from(assistidos)
                .where(ilike(assistidos.nome, `%${nomeGenerico.split(" ")[0]}%`))
                .limit(10);
              
              for (const candidato of candidatos) {
                const similaridade = calcularSimilaridade(candidato.nome, nomeGenerico);
                if (similaridade >= 0.9) {
                  assistidoId = candidato.id;
                  break;
                }
              }
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
              
              const [novoAssistido] = await db
                .insert(assistidos)
                .values({
                  nome: nomeFormatado,
                  statusPrisional: "SOLTO",
                  workspaceId: targetWorkspaceId,
                })
                .returning({ id: assistidos.id });
              
              assistidoId = novoAssistido.id;
              assistidosCriados.push(novoAssistido.id);
            }
          }

          // Buscar ou criar processo
          let processoId: number | undefined;
          const [processoExistente] = await db
            .select({ id: processos.id })
            .from(processos)
            .where(eq(processos.numeroAutos, evento.processo))
            .limit(1);

          if (processoExistente) {
            processoId = processoExistente.id;
          } else {
            // Criar processo com todos os campos obrigatórios
            const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
            const areaEnum = mapArea(evento.atribuicao);
            
            const [novoProcesso] = await db
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
          }

          // Criar audiência
          const [audiencia] = await db
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
        } catch (error) {
          console.error(`Erro ao importar evento ${evento.processo}:`, error);
          // Continuar com os próximos eventos
        }
      }

      return {
        importados: importados.length,
        duplicados: duplicados.length,
        duplicadosProcessos: duplicados,
        assistidosCriados: assistidosCriados.length,
      };
    }),
});
