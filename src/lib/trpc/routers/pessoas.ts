import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { pessoas, participacoesProcesso, pessoasDistinctsConfirmed, processos, pessoaRecortes, pessoaRelacoes, assistidos, testemunhas, lugares, participacoesLugar } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { normalizarNome } from "@/lib/pessoas/normalize";
import { PAPEIS_VALIDOS } from "@/lib/pessoas/intel-config";
import { agruparEnvolvimento } from "@/lib/pessoas/agrupar-envolvimento";

const papelEnum = z.enum(PAPEIS_VALIDOS as unknown as [string, ...string[]]);

const pessoaInputSchema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  cpf: z.string().max(14).optional(),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  categoriaPrimaria: z.string().max(30).optional(),
  fonteCriacao: z.enum([
    "manual",
    "backfill",
    "ia-atendimento",
    "ia-denuncia",
    "import-pje",
  ]),
});

export const pessoasRouter = router({
  create: protectedProcedure
    .input(pessoaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const nomeNorm = normalizarNome(input.nome);
      if (!nomeNorm) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nome inválido" });
      }
      try {
        const [row] = await db
          .insert(pessoas)
          .values({
            nome: input.nome.trim(),
            nomeNormalizado: nomeNorm,
            cpf: input.cpf || null,
            rg: input.rg || null,
            dataNascimento: input.dataNascimento || null,
            telefone: input.telefone || null,
            endereco: input.endereco || null,
            observacoes: input.observacoes || null,
            categoriaPrimaria: input.categoriaPrimaria || null,
            fonteCriacao: input.fonteCriacao,
            criadoPor: ctx.user?.id ?? null,
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "CPF já cadastrado" });
        }
        throw e;
      }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      cpf: z.string().max(14).nullable().optional(),
      rg: z.string().nullable().optional(),
      dataNascimento: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
      endereco: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
      categoriaPrimaria: z.string().max(30).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      if (input.nome !== undefined) {
        updates.nome = input.nome.trim();
        updates.nomeNormalizado = normalizarNome(input.nome);
      }
      for (const k of ["cpf", "rg", "dataNascimento", "telefone", "endereco", "observacoes", "categoriaPrimaria"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(pessoas)
        .set(updates)
        .where(eq(pessoas.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pessoas).where(eq(pessoas.id, input.id));
      return { ok: true };
    }),

  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      papel: papelEnum.optional(),
      categoria: z.string().optional(),
      hasProcessos: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      orderBy: z.enum(["nome", "recente"]).default("nome"),
    }))
    .query(async ({ input }) => {
      const where = [isNull(pessoas.mergedInto)];
      if (input.search) {
        const searchNorm = normalizarNome(input.search);
        where.push(sql`${pessoas.nomeNormalizado} ILIKE ${'%' + searchNorm + '%'}`);
      }
      if (input.categoria) where.push(eq(pessoas.categoriaPrimaria, input.categoria));

      const orderByCol = input.orderBy === "recente" ? desc(pessoas.updatedAt) : asc(pessoas.nome);

      const items = await db
        .select()
        .from(pessoas)
        .where(and(...where))
        .orderBy(orderByCol)
        .limit(input.limit)
        .offset(input.offset);

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(pessoas)
        .where(and(...where));

      return { items, total: Number(total) };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [pessoa] = await db.select().from(pessoas).where(eq(pessoas.id, input.id));
      if (!pessoa) throw new TRPCError({ code: "NOT_FOUND" });
      const parts = await db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.pessoaId, input.id))
        .orderBy(desc(participacoesProcesso.createdAt));
      return { pessoa, participacoes: parts };
    }),

  // Envolvimento cruzado (Ficha 360°): todas as participações da pessoa, agrupadas
  // por processo (papel/lado/subpapel + metadados do processo), mais os endereços
  // geocodificados ligados à pessoa para o mapa. Uma chamada alimenta a Ficha.
  getEnvolvimento: protectedProcedure
    .input(z.object({ pessoaId: z.number() }))
    .query(async ({ input }) => {
      // 1) Participações × processos.
      const rows = await db
        .select({
          participacaoId: participacoesProcesso.id,
          processoId: participacoesProcesso.processoId,
          papel: participacoesProcesso.papel,
          lado: participacoesProcesso.lado,
          subpapel: participacoesProcesso.subpapel,
          resumoNestaCausa: participacoesProcesso.resumoNestaCausa,
          numeroAutos: processos.numeroAutos,
          area: processos.area,
          fase: processos.fase,
          atribuicao: processos.atribuicao,
          classeProcessual: processos.classeProcessual,
          assistidoId: processos.assistidoId,
        })
        .from(participacoesProcesso)
        .innerJoin(
          processos,
          and(eq(processos.id, participacoesProcesso.processoId), isNull(processos.deletedAt)),
        )
        .where(eq(participacoesProcesso.pessoaId, input.pessoaId))
        .orderBy(asc(participacoesProcesso.processoId), asc(participacoesProcesso.papel));

      // Agrupa por processo: 1 card por processo, com N papéis/lados (helper puro).
      const envolvimento = agruparEnvolvimento(rows);

      // 2) Endereços geocodificados ligados à pessoa (para o mapa da Ficha).
      const lugaresRows = await db
        .select({
          lugarId: lugares.id,
          latitude: lugares.latitude,
          longitude: lugares.longitude,
          enderecoCompleto: lugares.enderecoCompleto,
          bairro: lugares.bairro,
          tipo: participacoesLugar.tipo,
          processoId: participacoesLugar.processoId,
        })
        .from(participacoesLugar)
        .innerJoin(lugares, eq(lugares.id, participacoesLugar.lugarId))
        .where(
          and(
            eq(participacoesLugar.pessoaId, input.pessoaId),
            isNull(lugares.mergedInto),
          ),
        );

      // Um ponto por lugar (dedup), só os geocodificados (lat/lng presentes).
      const porLugar = new Map<
        number,
        {
          lugarId: number;
          latitude: number;
          longitude: number;
          endereco: string | null;
          bairro: string | null;
          tipos: string[];
          processoIds: number[];
          count: number;
        }
      >();
      for (const r of lugaresRows) {
        const lat = r.latitude != null ? parseFloat(String(r.latitude)) : NaN;
        const lng = r.longitude != null ? parseFloat(String(r.longitude)) : NaN;
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
        let g = porLugar.get(r.lugarId);
        if (!g) {
          g = {
            lugarId: r.lugarId,
            latitude: lat,
            longitude: lng,
            endereco: r.enderecoCompleto,
            bairro: r.bairro,
            tipos: [],
            processoIds: [],
            count: 0,
          };
          porLugar.set(r.lugarId, g);
        }
        if (r.tipo && !g.tipos.includes(r.tipo)) g.tipos.push(r.tipo);
        if (r.processoId && !g.processoIds.includes(r.processoId)) g.processoIds.push(r.processoId);
      }
      const enderecos = [...porLugar.values()].map((g) => ({
        ...g,
        count: g.processoIds.length,
      }));

      return {
        envolvimento,
        totalProcessos: envolvimento.length,
        enderecos,
      };
    }),

  // === BUSCA ===
  searchForAutocomplete: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      papel: papelEnum.optional(),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const q = normalizarNome(input.query);
      const rows = await db
        .select({
          id: pessoas.id,
          nome: pessoas.nome,
          nomeNormalizado: pessoas.nomeNormalizado,
          categoriaPrimaria: pessoas.categoriaPrimaria,
          confidence: pessoas.confidence,
        })
        .from(pessoas)
        .where(
          and(
            isNull(pessoas.mergedInto),
            sql`${pessoas.nomeNormalizado} ILIKE ${'%' + q + '%'}`,
          ),
        )
        .limit(input.limit);
      return rows;
    }),

  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string().min(11) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(pessoas)
        .where(and(eq(pessoas.cpf, input.cpf), isNull(pessoas.mergedInto)));
      return row ?? null;
    }),

  // === PARTICIPAÇÕES ===
  addParticipacao: protectedProcedure
    .input(z.object({
      pessoaId: z.number(),
      processoId: z.number(),
      papel: papelEnum,
      lado: z.enum(["acusacao", "defesa", "neutro"]).optional(),
      subpapel: z.string().max(40).optional(),
      testemunhaId: z.number().optional(),
      resumoNestaCausa: z.string().optional(),
      observacoesNestaCausa: z.string().optional(),
      fonte: z.enum(["manual", "backfill", "ia-atendimento", "ia-denuncia", "import-pje"]).default("manual"),
      confidence: z.number().min(0).max(1).default(1.0),
    }))
    .mutation(async ({ input }) => {
      try {
        const [row] = await db
          .insert(participacoesProcesso)
          .values({
            pessoaId: input.pessoaId,
            processoId: input.processoId,
            papel: input.papel,
            lado: input.lado ?? null,
            subpapel: input.subpapel ?? null,
            testemunhaId: input.testemunhaId ?? null,
            resumoNestaCausa: input.resumoNestaCausa ?? null,
            observacoesNestaCausa: input.observacoesNestaCausa ?? null,
            fonte: input.fonte,
            confidence: String(input.confidence),
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "Pessoa já tem esse papel nesse processo" });
        }
        throw e;
      }
    }),

  updateParticipacao: protectedProcedure
    .input(z.object({
      id: z.number(),
      papel: papelEnum.optional(),
      lado: z.enum(["acusacao", "defesa", "neutro"]).nullable().optional(),
      subpapel: z.string().max(40).nullable().optional(),
      testemunhaId: z.number().nullable().optional(),
      resumoNestaCausa: z.string().nullable().optional(),
      observacoesNestaCausa: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: any = { updatedAt: new Date() };
      for (const k of ["papel", "lado", "subpapel", "testemunhaId", "resumoNestaCausa", "observacoesNestaCausa"] as const) {
        if (input[k] !== undefined) updates[k] = input[k];
      }
      const [row] = await db
        .update(participacoesProcesso)
        .set(updates)
        .where(eq(participacoesProcesso.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  removeParticipacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(participacoesProcesso).where(eq(participacoesProcesso.id, input.id));
      return { ok: true };
    }),

  getParticipacoesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(participacoesProcesso)
        .where(eq(participacoesProcesso.processoId, input.processoId))
        .orderBy(asc(participacoesProcesso.papel));
    }),

  // Pessoas do processo COM nome — para o picker do capturador de recortes.
  getPessoasDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select({
          pessoaId: pessoas.id,
          nome: pessoas.nome,
          papel: participacoesProcesso.papel,
          lado: participacoesProcesso.lado,
        })
        .from(participacoesProcesso)
        .innerJoin(pessoas, eq(participacoesProcesso.pessoaId, pessoas.id))
        .where(eq(participacoesProcesso.processoId, input.processoId))
        .orderBy(asc(participacoesProcesso.papel));
    }),

  // Partes do processo p/ o capturador: réu (assistido) + testemunhas + pessoas
  // já no grafo, num único seletor. Entradas sem pessoaId são criadas ao salvar.
  getPartesDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number().nullish(), assistidoId: z.number().nullish() }))
    .query(async ({ input }) => {
      type Parte = {
        key: string;
        kind: "assistido" | "testemunha" | "pessoa";
        nome: string;
        papel: string;
        pessoaId: number | null;
        assistidoId: number | null;
      };
      const out: Parte[] = [];

      // 1) Réu = assistido (do input ou resolvido pelo processo)
      let assistidoId = input.assistidoId ?? null;
      if (!assistidoId && input.processoId) {
        const [proc] = await db
          .select({ assistidoId: processos.assistidoId })
          .from(processos)
          .where(eq(processos.id, input.processoId))
          .limit(1);
        assistidoId = proc?.assistidoId ?? null;
      }
      if (assistidoId) {
        const [a] = await db
          .select({ id: assistidos.id, nome: assistidos.nome })
          .from(assistidos)
          .where(eq(assistidos.id, assistidoId))
          .limit(1);
        if (a) out.push({ key: `assistido:${a.id}`, kind: "assistido", nome: a.nome, papel: "REU", pessoaId: null, assistidoId: a.id });
      }

      if (input.processoId) {
        // 2) Testemunhas / vítima / informantes / peritos
        const tt = await db
          .select({ id: testemunhas.id, nome: testemunhas.nome, tipo: testemunhas.tipo })
          .from(testemunhas)
          .where(eq(testemunhas.processoId, input.processoId));
        for (const t of tt) {
          if (!t.nome) continue;
          const papel =
            t.tipo === "VITIMA" ? "VITIMA" : t.tipo === "INFORMANTE" ? "INFORMANTE" : t.tipo === "PERITO" ? "PERITO" : "TESTEMUNHA";
          out.push({ key: `testemunha:${t.id}`, kind: "testemunha", nome: t.nome, papel, pessoaId: null, assistidoId: null });
        }

        // 3) Pessoas já no grafo do processo
        const pp = await db
          .select({ pessoaId: pessoas.id, nome: pessoas.nome, papel: participacoesProcesso.papel })
          .from(participacoesProcesso)
          .innerJoin(pessoas, eq(participacoesProcesso.pessoaId, pessoas.id))
          .where(eq(participacoesProcesso.processoId, input.processoId));
        for (const p of pp) {
          out.push({ key: `pessoa:${p.pessoaId}`, kind: "pessoa", nome: p.nome, papel: (p.papel ?? "outro").toUpperCase(), pessoaId: p.pessoaId, assistidoId: null });
        }
      }

      // Dedup por nome (a pessoa que também é testemunha aparece uma vez só).
      const seen = new Set<string>();
      return out.filter((o) => {
        const k = o.nome.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }),

  // Avatares (rostos) por pessoaId — para os cards de depoentes do sheet.
  getAvatares: protectedProcedure
    .input(z.object({ pessoaIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      if (!input.pessoaIds.length) return [] as { pessoaId: number; avatarDataUrl: string | null }[];
      return db
        .select({ pessoaId: pessoas.id, avatarDataUrl: pessoas.avatarDataUrl })
        .from(pessoas)
        .where(inArray(pessoas.id, input.pessoaIds));
    }),

  // === MERGE / DEDUP ===
  suggestMerges: protectedProcedure
    .input(z.object({
      pessoaId: z.number().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      if (input.pessoaId) {
        const [p] = await db.select().from(pessoas).where(eq(pessoas.id, input.pessoaId));
        if (!p) return [];
        const candidates = await db
          .select()
          .from(pessoas)
          .where(
            and(
              eq(pessoas.nomeNormalizado, p.nomeNormalizado),
              sql`${pessoas.id} != ${input.pessoaId}`,
              isNull(pessoas.mergedInto),
            ),
          )
          .limit(input.limit);

        const excluded = await db.select().from(pessoasDistinctsConfirmed);
        const excludedIds = new Set(
          excluded
            .filter((r) => r.pessoaAId === input.pessoaId || r.pessoaBId === input.pessoaId)
            .map((r) => (r.pessoaAId === input.pessoaId ? r.pessoaBId : r.pessoaAId)),
        );
        return candidates.filter((c) => !excludedIds.has(c.id));
      }

      // Sem pessoaId: top pares globais por nome_normalizado duplicado
      const rows = await db.execute(sql`
        SELECT p1.id AS a, p2.id AS b, p1.nome_normalizado AS nome
        FROM pessoas p1
        JOIN pessoas p2 ON p1.nome_normalizado = p2.nome_normalizado
          AND p1.id < p2.id
          AND p1.merged_into IS NULL AND p2.merged_into IS NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM pessoas_distincts_confirmed
          WHERE pessoa_a_id = p1.id AND pessoa_b_id = p2.id
        )
        LIMIT ${input.limit}
      `);
      return (rows as any).rows ?? rows;
    }),

  merge: protectedProcedure
    .input(z.object({ fromId: z.number(), intoId: z.number(), reason: z.string().min(3) }))
    .mutation(async ({ input, ctx }) => {
      if (input.fromId === input.intoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "fromId = intoId" });
      }
      await db
        .update(participacoesProcesso)
        .set({ pessoaId: input.intoId, updatedAt: new Date() })
        .where(eq(participacoesProcesso.pessoaId, input.fromId));

      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: input.intoId,
          mergeReason: input.reason,
          mergedAt: new Date(),
          mergedBy: ctx.user?.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.fromId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),

  unmerge: protectedProcedure
    .input(z.object({ pessoaId: z.number() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(pessoas)
        .set({
          mergedInto: null,
          mergeReason: null,
          mergedAt: null,
          mergedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(pessoas.id, input.pessoaId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  markAsDistinct: protectedProcedure
    .input(z.object({ pessoaAId: z.number(), pessoaBId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [a, b] = input.pessoaAId < input.pessoaBId
        ? [input.pessoaAId, input.pessoaBId]
        : [input.pessoaBId, input.pessoaAId];
      await db
        .insert(pessoasDistinctsConfirmed)
        .values({
          pessoaAId: a,
          pessoaBId: b,
          confirmadoPor: ctx.user?.id ?? null,
        } as any)
        .onConflictDoNothing();
      return { ok: true };
    }),

  getParticipacoesDoCaso: protectedProcedure
    .input(z.object({ casoId: z.number() }))
    .query(async ({ input, ctx }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const procs = await db.select({ id: processos.id })
        .from(processos)
        .where(and(eq(processos.casoId, input.casoId), eq(processos.workspaceId, wid)));
      if (procs.length === 0) return [];
      const procIds = procs.map((p) => p.id);
      return await db.select().from(participacoesProcesso)
        .where(inArray(participacoesProcesso.processoId, procIds));
    }),

  getBatchSignals: protectedProcedure
    .input(z.object({
      pessoaIds: z.array(z.number()).max(500).default([]),
    }))
    .query(async ({ input }) => {
      if (input.pessoaIds.length === 0) return [];
      const idList = sql.join(input.pessoaIds.map((id) => sql`${id}`), sql`, `);
      const rows = await db.execute<{
        pessoa_id: number;
        total_casos: number;
        casos_recentes_6m: number;
        casos_recentes_12m: number;
        papeis_count: Record<string, number>;
        papel_primario: string | null;
        lado_acusacao: number;
        lado_defesa: number;
        last_seen_at: Date | null;
        first_seen_at: Date | null;
        ambiguity_flag: boolean;
        contradicoes_conhecidas: number;
        consistencias_detectadas: number;
        high_value_flag: boolean;
      }>(sql`
        SELECT
          pessoa_id, total_casos, casos_recentes_6m, casos_recentes_12m,
          papeis_count, papel_primario, lado_acusacao, lado_defesa,
          last_seen_at, first_seen_at, ambiguity_flag,
          contradicoes_conhecidas, consistencias_detectadas, high_value_flag
        FROM pessoas_intel_signals
        WHERE pessoa_id IN (${idList})
      `);

      const data = (rows as any).rows ?? rows;
      return data.map((r: any) => ({
        pessoaId: r.pessoa_id,
        totalCasos: r.total_casos,
        casosRecentes6m: r.casos_recentes_6m,
        casosRecentes12m: r.casos_recentes_12m,
        papeisCount: r.papeis_count,
        papelPrimario: r.papel_primario,
        ladoAcusacao: r.lado_acusacao,
        ladoDefesa: r.lado_defesa,
        lastSeenAt: r.last_seen_at,
        firstSeenAt: r.first_seen_at,
        sameComarcaCount: 0,  // calculado client-side com processo atual
        ambiguityFlag: r.ambiguity_flag,
        contradicoesConhecidas: r.contradicoes_conhecidas,
        consistenciasDetectadas: r.consistencias_detectadas,
        highValueFlag: r.high_value_flag,
      }));
    }),

  // ── Recortes de imagem do PDF vinculados a pessoa + papel ──────────
  salvarRecorte: protectedProcedure
    .input(
      z.object({
        pessoaId: z.number().nullish(),
        assistidoId: z.number().nullish(),
        processoId: z.number().nullish(),
        driveFileId: z.number().nullish(),
        tipo: z.string().max(20).nullish(), // rosto | assinatura | laudo | peticao | outro
        papel: z.string().max(30).nullish(),
        rotulo: z.string().max(200).nullish(),
        imagem: z.string().min(10), // data URL base64
        pagina: z.number().nullish(),
        posicao: z
          .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
          .nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.pessoaId && !input.assistidoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe pessoaId ou assistidoId" });
      }
      const tipo = input.tipo ?? "rosto";
      const [row] = await db
        .insert(pessoaRecortes)
        .values({
          pessoaId: input.pessoaId ?? null,
          assistidoId: input.assistidoId ?? null,
          processoId: input.processoId ?? null,
          driveFileId: input.driveFileId ?? null,
          tipo,
          papel: input.papel ?? null,
          rotulo: input.rotulo ?? null,
          imagem: input.imagem,
          pagina: input.pagina ?? null,
          posicao: input.posicao ?? null,
          criadoPor: ctx.user?.id ?? null,
        } as any)
        .returning();

      // Rosto vira avatar: foto do assistido (réu) ou avatar da pessoa.
      if (tipo === "rosto") {
        if (input.assistidoId) {
          await db.update(assistidos).set({ photoUrl: input.imagem }).where(eq(assistidos.id, input.assistidoId));
        } else if (input.pessoaId) {
          await db.update(pessoas).set({ avatarDataUrl: input.imagem }).where(eq(pessoas.id, input.pessoaId));
        }
      }
      return row;
    }),

  getRecortesByPessoa: protectedProcedure
    .input(z.object({ pessoaId: z.number(), processoId: z.number().nullish() }))
    .query(async ({ input }) => {
      const conds = [eq(pessoaRecortes.pessoaId, input.pessoaId)];
      if (input.processoId) conds.push(eq(pessoaRecortes.processoId, input.processoId));
      return db
        .select()
        .from(pessoaRecortes)
        .where(and(...conds))
        .orderBy(desc(pessoaRecortes.createdAt));
    }),

  deleteRecorte: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pessoaRecortes).where(eq(pessoaRecortes.id, input.id));
      return { ok: true };
    }),

  // ── Familiares / contatos do assistido (réu) — pessoa_relacoes ─────
  getFamiliares: protectedProcedure
    .input(z.object({ pessoaId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(pessoaRelacoes)
        .where(eq(pessoaRelacoes.pessoaId, input.pessoaId))
        .orderBy(asc(pessoaRelacoes.grau), asc(pessoaRelacoes.nomeLivre));
    }),

  addFamiliar: protectedProcedure
    .input(
      z.object({
        pessoaId: z.number(),
        relacionadaPessoaId: z.number().nullish(),
        grau: z.enum(["mae", "pai", "conjuge", "filho", "irmao", "contato", "outro"]),
        nomeLivre: z.string().min(1).nullish(),
        telefone: z.string().max(20).nullish(),
        endereco: z.string().nullish(),
        confirmado: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.relacionadaPessoaId && !input.nomeLivre) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe nomeLivre ou relacionadaPessoaId" });
      }
      try {
        const [row] = await db
          .insert(pessoaRelacoes)
          .values({
            pessoaId: input.pessoaId,
            relacionadaPessoaId: input.relacionadaPessoaId ?? null,
            grau: input.grau,
            nomeLivre: input.nomeLivre ?? null,
            telefone: input.telefone ?? null,
            endereco: input.endereco ?? null,
            fonte: "manual",
            confirmado: input.confirmado,
          } as any)
          .returning();
        return row;
      } catch (e: any) {
        if (e?.code === "23505") {
          throw new TRPCError({ code: "CONFLICT", message: "Essa relação já existe" });
        }
        throw e;
      }
    }),

  removeFamiliar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pessoaRelacoes).where(eq(pessoaRelacoes.id, input.id));
      return { ok: true };
    }),
});
