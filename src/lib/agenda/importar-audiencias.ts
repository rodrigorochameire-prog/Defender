import { z } from "zod";
import { db, withTransaction, audiencias, processos, assistidos, sessoesJuri } from "@/lib/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { idsParaSuperar } from "@/lib/agenda/reconciliar-pauta";

// ==========================================
// Schema & types (shared with tRPC callers)
// ==========================================

export const eventoImportSchema = z.object({
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
});

export type EventoImport = z.infer<typeof eventoImportSchema>;

export interface ImportarAudienciasResult {
  superados: number;
  importados: number;
  duplicados: number;
  atualizados: number;
  duplicadosProcessos: string[];
  assistidosCriados: number;
}

// ==========================================
// Service function (core logic extracted
// from audiencias.importBatch for reuse)
// ==========================================

export async function importarAudiencias(
  eventos: EventoImport[],
  opts?: { userId?: number },
): Promise<ImportarAudienciasResult> {
  void opts; // forward-looking param — not yet consumed

  // Status canônico da audiência a partir da situação textual da pauta
  // (fonte rica), com fallback no status já mapeado pelo front. A UI
  // (status-tone, detectar-tipo-audiencia) espera exatamente estes valores:
  // agendada | redesignada | realizada | cancelada.
  const statusCanonico = (situacao?: string, statusFront?: string): string => {
    const s = (situacao ?? "").toLowerCase();
    if (s.includes("cancel") || s.includes("nao-realiz") || s.includes("não-realiz")) return "cancelada";
    if (s.includes("redesign")) return "redesignada";
    if (s.includes("realiz")) return "realizada";
    if (s.includes("design")) return "agendada";
    switch (statusFront) {
      case "cancelado": return "cancelada";
      case "remarcado": return "redesignada";
      case "concluido": return "realizada";
      default: return "agendada";
    }
  };

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
  // Force BRT (-03:00) so the Date is unambiguous regardless of server TZ
  // (Vercel runs in UTC; without the offset "08:30" would be parsed as 08:30 UTC = 05:30 BRT).
  const allDataHoras = eventos.map(e => new Date(`${e.data}T${e.horarioInicio}:00-03:00`));
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

    // Reconciliação de redesignações (ver reconciliar-pauta.ts):
    // rastreamos os processos tocados nesta importação e os ids de
    // AUDIÊNCIA tocados (criadas + atualizadas). Slots de audiência antigos
    // do mesmo processo, dentro da janela da pauta e ainda "agendada", que
    // NÃO foram tocados, são fantasmas de uma redesignação e serão superados.
    const touchedProcessoIds = new Set<number>();
    const audienciasCriadas: number[] = []; // só ids de `audiencias` (sem sessões de júri)

    for (const evento of eventos) {
      // Construir data/hora completa (forçar BRT — ver comentário no allDataHoras acima)
      const dataHora = new Date(`${evento.data}T${evento.horarioInicio}:00-03:00`);

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
            status: statusCanonico(evento.situacaoAudiencia, evento.status),
          })
          .where(eq(audiencias.id, audienciaExistente.id));

        // Atualizar processo existente com atribuição corrigida se necessário
        if (audienciaExistente.processoId) {
          const atribuicaoEnum = mapAtribuicao(evento.atribuicao);
          const areaEnum = mapArea(evento.atribuicao);

          await tx
            .update(processos)
            .set({
              atribuicao: atribuicaoEnum as typeof processos.atribuicao._.data,
              area: areaEnum as typeof processos.area._.data,
              classeProcessual: evento.classeJudicial || undefined,
              vara: evento.orgaoJulgador || undefined,
            })
            .where(eq(processos.id, audienciaExistente.processoId));
        }

        atualizados.push(audienciaExistente.id);
        if (audienciaExistente.processoId) touchedProcessoIds.add(audienciaExistente.processoId);
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
              atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
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
            atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
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
              atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
            })
            .returning({ id: assistidos.id });

          assistidoId = novoAssistido.id;
          assistidosCriados.push(novoAssistido.id);

          // Update in-memory cache
          assistidosNormalizados.push({
            id: novoAssistido.id,
            nome: nomeFormatado,
            atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data,
            nomeNormalizado: normalizarNome(nomeFormatado),
          });
        }
      }

      // Backfill atribuicaoPrimaria if null — using pre-fetched data (0 queries instead of 1)
      if (assistidoId) {
        const cached = assistidosNormalizados.find(a => a.id === assistidoId);
        if (cached && !cached.atribuicaoPrimaria) {
          await tx.update(assistidos)
            .set({ atribuicaoPrimaria: mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data })
            .where(eq(assistidos.id, assistidoId));
          // Update in-memory cache
          cached.atribuicaoPrimaria = mapAtribuicao(evento.atribuicao) as typeof assistidos.atribuicaoPrimaria._.data;
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
        // Corrige atribuição/área a partir da pauta (fonte autoritativa da vara).
        // Sem isto, um processo pré-existente classificado errado (ex.: criado
        // antes como VVD) mantinha a classificação antiga ao receber uma audiência
        // de outra atribuição — ex.: Sessão do Júri aparecia com selo "Violência
        // Doméstica". Pula o fallback genérico (SUBSTITUICAO) para não sobrescrever
        // uma classificação boa com um palpite de baixa confiança.
        const atribImport = mapAtribuicao(evento.atribuicao);
        if (atribImport !== "SUBSTITUICAO") {
          updates.atribuicao = atribImport as typeof processos.atribuicao._.data;
          updates.area = mapArea(evento.atribuicao) as typeof processos.area._.data;
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
            atribuicao: atribuicaoEnum as typeof processos.atribuicao._.data,
            area: areaEnum as typeof processos.area._.data,
            classeProcessual: evento.classeJudicial || "Não informado",
            vara: evento.orgaoJulgador || "Não informado",
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

      // Marcar processo como tocado nesta importação (para a reconciliação adiante)
      if (processoId) touchedProcessoIds.add(processoId);

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
            status: statusCanonico(evento.situacaoAudiencia, evento.status),
          })
          .returning({ id: audiencias.id });

        importados.push(audiencia.id);
        audienciasCriadas.push(audiencia.id);
      }
    }

    // ==========================================
    // RECONCILIAÇÃO: superar slots redesignados
    // ==========================================
    // Quando uma audiência é redesignada (mesmo processo, nova data), o slot
    // novo é inserido acima mas o antigo ("agendada") fica fantasma na agenda.
    // Aqui marcamos como "redesignada" os slots velhos dos processos tocados,
    // DENTRO da janela de datas da pauta (escopo proposital: uma pauta parcial
    // nunca apaga audiências fora do seu intervalo).
    let superados = 0;
    if (touchedProcessoIds.size > 0) {
      // Janela = min/max das datas dos eventos (BRT), início do dia .. fim do dia.
      const datas = eventos.map(e => e.data).sort();
      const windowStart = new Date(`${datas[0]}T00:00:00-03:00`);
      const windowEnd = new Date(`${datas[datas.length - 1]}T23:59:59-03:00`);

      // Audiências existentes dos processos tocados dentro da janela.
      const processoIdsArr = [...touchedProcessoIds];
      const existentesNaJanela = await tx
        .select({
          id: audiencias.id,
          processoId: audiencias.processoId,
          dataAudiencia: audiencias.dataAudiencia,
          status: audiencias.status,
        })
        .from(audiencias)
        .where(
          and(
            inArray(audiencias.processoId, processoIdsArr),
            gte(audiencias.dataAudiencia, windowStart),
            lte(audiencias.dataAudiencia, windowEnd),
          )
        );

      // ids tocados = audiências criadas ∪ atualizadas
      const touchedAudienciaIds = new Set<number>([...audienciasCriadas, ...atualizados]);

      const ids = idsParaSuperar({
        existing: existentesNaJanela.map(a => ({
          id: a.id,
          processoId: a.processoId,
          dataAudiencia: a.dataAudiencia as Date,
          status: a.status ?? "",
        })),
        touchedProcessoIds,
        touchedAudienciaIds,
        windowStart,
        windowEnd,
      });

      if (ids.length > 0) {
        await tx
          .update(audiencias)
          .set({ status: "redesignada", updatedAt: new Date() })
          .where(inArray(audiencias.id, ids));
        superados = ids.length;
      }
    }

    return {
      superados,
      importados: importados.length,
      duplicados: duplicados.length,
      atualizados: atualizados.length,
      duplicadosProcessos: duplicados,
      assistidosCriados: assistidosCriados.length,
    };
  });
}
