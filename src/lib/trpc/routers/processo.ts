import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { driveDocumentSections, driveFiles } from "@/lib/db/schema";
import { processos } from "@/lib/db/schema/core";
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
