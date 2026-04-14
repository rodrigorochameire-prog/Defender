import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { driveDocumentSections, driveFiles } from "@/lib/db/schema";
import { processos, assistidos } from "@/lib/db/schema/core";
import { eq } from "drizzle-orm";

const GROUP_MAPPING: Record<string, string[]> = {
  acusacao: ["denuncia", "alegacoes_mp"],
  decisoes: ["sentenca", "pronuncia", "decisao"],
  depoimentos: [
    "depoimento_vitima",
    "depoimento_testemunha",
    "depoimento_investigado",
    "interrogatorio",
    "ata_audiencia",
    "acareacao",
  ],
  laudos: [
    "laudo_pericial",
    "laudo_necroscopico",
    "laudo_toxicologico",
    "laudo_balistico",
    "laudo_medico_legal",
    "laudo_psiquiatrico",
    "pericia_digital",
  ],
  defesa: ["resposta_acusacao", "alegacoes_defesa", "recurso", "habeas_corpus"],
  investigacao: [
    "boletim_ocorrencia",
    "portaria_ip",
    "relatorio_policial",
    "auto_prisao",
    "termo_inquerito",
    "auto_apreensao",
    "mandado",
    "reconhecimento_formal",
    "diligencias_422",
  ],
};

const GROUP_ORDER = ["acusacao", "decisoes", "depoimentos", "laudos", "defesa", "investigacao", "outros"];

function tipoToGroup(tipo: string): string {
  for (const [group, tipos] of Object.entries(GROUP_MAPPING)) {
    if (tipos.includes(tipo)) return group;
  }
  return "outros";
}

export const processoRouter = router({
  getGroupedSections: protectedProcedure
    .input(z.object({
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
    }).refine((v) => v.processoId || v.assistidoId, {
      message: "Either processoId or assistidoId is required",
    }))
    .query(async ({ input }) => {
      // Filter: prefer processoId if given, otherwise use assistidoId (catches sections
      // linked only to the assistido, e.g. when files live in the assistido folder but
      // not in a processo subfolder)
      const whereClause = input.processoId
        ? eq(driveFiles.processoId, input.processoId)
        : eq(driveFiles.assistidoId, input.assistidoId!);

      const rows = await db
        .select({
          id: driveDocumentSections.id,
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          resumo: driveDocumentSections.resumo,
          textoExtraido: driveDocumentSections.textoExtraido,
          confianca: driveDocumentSections.confianca,
          reviewStatus: driveDocumentSections.reviewStatus,
          fichaData: driveDocumentSections.fichaData,
          metadata: driveDocumentSections.metadata,
          createdAt: driveDocumentSections.createdAt,
          fileId: driveFiles.id,
          fileName: driveFiles.name,
          fileWebViewLink: driveFiles.webViewLink,
          fileDriveId: driveFiles.driveFileId,
          fileMimeType: driveFiles.mimeType,
          fileProcessoId: driveFiles.processoId,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(whereClause)
        .orderBy(driveDocumentSections.paginaInicio);

      const groups: Record<string, typeof rows> = {};
      for (const s of rows) {
        const g = tipoToGroup(s.tipo);
        if (!groups[g]) groups[g] = [];
        groups[g].push(s);
      }

      const depoimentos = groups.depoimentos || [];
      const depoimentosByPessoa: Record<string, typeof rows> = {};
      for (const d of depoimentos) {
        const pessoas = (d.metadata as any)?.pessoas as Array<{ nome: string }> | undefined;
        const nome = pessoas?.[0]?.nome || "Não identificado";
        if (!depoimentosByPessoa[nome]) depoimentosByPessoa[nome] = [];
        depoimentosByPessoa[nome].push(d);
      }

      const orderedGroups = GROUP_ORDER
        .filter((g) => g !== "depoimentos" && groups[g])
        .map((g) => ({ key: g, sections: groups[g] }));

      return {
        groups: orderedGroups,
        depoimentos: Object.entries(depoimentosByPessoa).map(([pessoa, sections]) => ({
          pessoa,
          sections,
        })),
        total: rows.length,
      };
    }),

  /**
   * Quick summary based on already-classified sections.
   * No Railway dependency — uses Claude API directly with section resumos only.
   */
  quickSummary: protectedProcedure
    .input(z.object({ assistidoId: z.number() }))
    .mutation(async ({ input }) => {
      // 1. Fetch all classified sections for the assistido (with metadata)
      const sections = await db
        .select({
          tipo: driveDocumentSections.tipo,
          titulo: driveDocumentSections.titulo,
          resumo: driveDocumentSections.resumo,
          paginaInicio: driveDocumentSections.paginaInicio,
          paginaFim: driveDocumentSections.paginaFim,
          metadata: driveDocumentSections.metadata,
          confianca: driveDocumentSections.confianca,
        })
        .from(driveDocumentSections)
        .innerJoin(driveFiles, eq(driveDocumentSections.driveFileId, driveFiles.id))
        .where(eq(driveFiles.assistidoId, input.assistidoId));

      if (sections.length === 0) {
        throw new Error("Nenhuma peça classificada. Classifique os autos primeiro.");
      }

      // 2. Aggregate KPIs (no LLM needed)
      const pessoasSet = new Set<string>();
      const eventosSet = new Set<string>();
      const nulidadesSet = new Set<string>();
      const tesesSet = new Set<string>();
      const contradicoesSet = new Set<string>();

      for (const s of sections) {
        const m = (s.metadata as any) ?? {};
        for (const p of (m.pessoas ?? []) as Array<{ nome: string }>) {
          if (p.nome) pessoasSet.add(p.nome.trim());
        }
        for (const c of (m.cronologia ?? []) as Array<{ descricao: string }>) {
          if (c.descricao) eventosSet.add(c.descricao.substring(0, 80));
        }
        for (const t of (m.tesesDefensivas ?? []) as Array<{ tipo: string; descricao: string }>) {
          if (t.descricao) tesesSet.add(`${t.tipo}: ${t.descricao.substring(0, 120)}`);
        }
        for (const ct of (m.contradicoes ?? []) as string[]) {
          if (ct) contradicoesSet.add(ct.substring(0, 120));
        }
      }

      const kpis = {
        totalPessoas: pessoasSet.size,
        totalEventos: eventosSet.size,
        totalNulidades: nulidadesSet.size,
        totalAcusacoes: sections.filter((s) => s.tipo === "denuncia" || s.tipo === "alegacoes_mp").length,
        totalRelacoes: contradicoesSet.size,
        totalDocumentosAnalisados: sections.length,
      };

      // 3. Build a compact context for Claude (só resumos, não texto completo)
      const sectionDigest = sections
        .filter((s) => s.tipo !== "burocracia" && s.resumo)
        .map((s) => {
          const pessoas = ((s.metadata as any)?.pessoas ?? [])
            .slice(0, 3)
            .map((p: any) => p.nome)
            .join(", ");
          return `[${s.tipo}] ${s.titulo} (pp ${s.paginaInicio}-${s.paginaFim}${pessoas ? ", " + pessoas : ""}): ${s.resumo}`;
        })
        .join("\n");

      // 4. Single Claude call to generate structured summary
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic();

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 16000,
        system: "Você é um assistente jurídico especializado em Defensoria Pública. Analisa autos processuais e gera sumários estratégicos para o Defensor Público.",
        messages: [
          {
            role: "user",
            content: `Com base nas peças já classificadas abaixo, gere um sumário estratégico do processo.

PEÇAS CLASSIFICADAS:
${sectionDigest}

DADOS AGREGADOS:
- ${kpis.totalPessoas} pessoas envolvidas: ${Array.from(pessoasSet).slice(0, 10).join(", ")}
- ${kpis.totalEventos} eventos na cronologia
- ${tesesSet.size} teses defensivas identificadas
- ${contradicoesSet.size} contradições detectadas
- ${kpis.totalDocumentosAnalisados} documentos analisados

Responda APENAS com JSON válido (sem markdown, sem texto antes/depois) no formato:
{
  "resumo": "Parágrafo de 3-5 frases sobre o caso: acusação, fatos, peças disponíveis, fase processual",
  "achadosChave": ["Ponto crítico 1", "Ponto crítico 2", ...],
  "recomendacoes": ["Ação recomendada 1", "Ação recomendada 2", ...],
  "inconsistencias": ["Contradição/problema 1", ...]
}`,
          },
        ],
      });

      // 5. Parse JSON response
      let summary: any = {};
      const textBlock = response.content.find((b: any) => b.type === "text") as any;
      if (textBlock?.text) {
        try {
          // Handle markdown code blocks if Claude added them
          const jsonText = textBlock.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          summary = JSON.parse(jsonText);
        } catch {
          summary = { resumo: textBlock.text };
        }
      }

      // 6. Persist to assistidos.analysisData (same shape the UI already reads)
      await db
        .update(assistidos)
        .set({
          analysisStatus: "completed",
          analyzedAt: new Date(),
          analysisData: {
            resumo: summary.resumo ?? "",
            achadosChave: summary.achadosChave ?? [],
            recomendacoes: summary.recomendacoes ?? [],
            inconsistencias: summary.inconsistencias ?? [],
            kpis,
            fonte: "quickSummary-claude-opus-4-6",
            versaoModelo: "claude-opus-4-6",
            documentosProcessados: sections.length,
            documentosTotal: sections.length,
          },
        })
        .where(eq(assistidos.id, input.assistidoId));

      return { success: true, kpis, resumo: summary.resumo };
    }),

  getInfo: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const [proc] = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          vara: processos.vara,
          assunto: processos.assunto,
          fase: processos.fase,
          situacao: processos.situacao,
          tipoProcesso: processos.tipoProcesso,
          isReferencia: processos.isReferencia,
          casoId: processos.casoId,
          driveFolderId: processos.driveFolderId,
          linkDrive: processos.linkDrive,
        })
        .from(processos)
        .where(eq(processos.id, input.processoId))
        .limit(1);

      return proc ?? null;
    }),
});
