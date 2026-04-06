/**
 * Serviço compartilhado de importação de demandas PJe.
 *
 * Contém a lógica de DB para upsert de assistido + processo + demanda,
 * usada tanto pelo endpoint cron /api/cron/pje-import quanto (futuramente)
 * pelo tRPC importFromSheets.
 */

import { db } from "@/lib/db";
import { demandas, processos, assistidos } from "@/lib/db/schema";
import { eq, ilike, and, gte, isNull, inArray, sql } from "drizzle-orm";

// ============================================================================
// TIPOS
// ============================================================================

export interface ImportRow {
  assistido: string;
  processoNumero?: string;
  ato: string;
  prazo?: string;
  dataEntrada?: string;
  dataExpedicaoCompleta?: string;
  dataInclusao?: string;
  status?: string;
  estadoPrisional?: string;
  providencias?: string;
  atribuicao?: string;
  importBatchId?: string;
  ordemOriginal?: number;
  assistidoMatchId?: number;
  tipoDocumento?: string;
  crime?: string;
  tipoProcesso?: string;
  vara?: string;
  idDocumentoPje?: string;
  atribuicaoDetectada?: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  assistidosSemSolar: number;
}

// ============================================================================
// CONSTANTES DE MAPEAMENTO
// ============================================================================

const STATUS_TO_DB: Record<string, string> = {
  "triagem": "5_TRIAGEM",
  "atender": "2_ATENDER",
  "analisar": "2_ATENDER",
  "elaborar": "2_ATENDER",
  "elaborando": "2_ATENDER",
  "buscar": "2_ATENDER",
  "revisar": "2_ATENDER",
  "revisando": "2_ATENDER",
  "relatorio": "2_ATENDER",
  "documentos": "2_ATENDER",
  "testemunhas": "2_ATENDER",
  "investigar": "2_ATENDER",
  "oficiar": "2_ATENDER",
  "monitorar": "4_MONITORAR",
  "protocolar": "5_TRIAGEM",
  "protocolado": "7_PROTOCOLADO",
  "ciencia": "7_CIENCIA",
  "sem_atuacao": "7_SEM_ATUACAO",
  "constituiu_advogado": "CONCLUIDO",
  "urgente": "URGENTE",
  "resolvido": "CONCLUIDO",
  "arquivado": "ARQUIVADO",
  "amanda": "2_ATENDER",
  "emilly": "2_ATENDER",
  "taissa": "2_ATENDER",
  "estágio_-_taissa": "2_ATENDER",
  "estagio_-_taissa": "2_ATENDER",
};

const ATRIBUICAO_TO_AREA: Record<string, string> = {
  "Tribunal do Júri": "JURI",
  "Grupo Especial do Júri": "JURI",
  "Violência Doméstica": "VIOLENCIA_DOMESTICA",
  "Violência Doméstica - Camaçari": "VIOLENCIA_DOMESTICA",
  "Execução Penal": "EXECUCAO_PENAL",
  "Substituição Criminal": "SUBSTITUICAO",
  "Substituição Cível": "CIVEL",
  "Curadoria Especial": "CURADORIA",
  "JURI_CAMACARI": "JURI",
  "GRUPO_JURI": "JURI",
  "VVD_CAMACARI": "VIOLENCIA_DOMESTICA",
  "EXECUCAO_PENAL": "EXECUCAO_PENAL",
  "SUBSTITUICAO": "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL": "CIVEL",
};

const ATRIBUICAO_TO_ENUM: Record<string, string> = {
  "Tribunal do Júri": "JURI_CAMACARI",
  "Grupo Especial do Júri": "GRUPO_JURI",
  "Violência Doméstica": "VVD_CAMACARI",
  "Violência Doméstica - Camaçari": "VVD_CAMACARI",
  "Execução Penal": "EXECUCAO_PENAL",
  "Substituição Criminal": "SUBSTITUICAO",
  "Substituição Cível": "SUBSTITUICAO_CIVEL",
  "Curadoria Especial": "SUBSTITUICAO_CIVEL",
  "JURI_CAMACARI": "JURI_CAMACARI",
  "GRUPO_JURI": "GRUPO_JURI",
  "VVD_CAMACARI": "VVD_CAMACARI",
  "EXECUCAO_PENAL": "EXECUCAO_PENAL",
  "SUBSTITUICAO": "SUBSTITUICAO",
  "SUBSTITUICAO_CIVEL": "SUBSTITUICAO_CIVEL",
};

const CONCLUIDA_IMPORT_KEYS = new Set([
  "protocolado", "ciencia", "sem_atuacao", "constituiu_advogado", "resolvido", "arquivado",
]);

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

function convertDate(dateStr: string | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleaned = dateStr.trim().replace(/\./g, "/");
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, dia, mes, ano] = match;
    const anoFull = ano.length === 2 ? `20${ano}` : ano;
    return `${anoFull}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  const isoMatch = cleaned.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return cleaned;
  return null;
}

function inferirFaseProcessual(tipoDocumento?: string): string | undefined {
  if (!tipoDocumento) return undefined;
  const tipo = tipoDocumento.toLowerCase();
  if (tipo.includes("sentença") || tipo.includes("sentenca")) return "sentença";
  if (tipo.includes("decisão") || tipo.includes("decisao")) return "instrução";
  if (tipo.includes("ato ordinatório") || tipo.includes("ato ordinatorio")) return "instrução";
  if (tipo.includes("despacho")) return "instrução";
  return undefined;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Importa um lote de demandas no banco de dados.
 *
 * Faz upsert de assistido (por nome ou ID) e processo (por número),
 * verifica duplicatas por processo + data de expedição, e insere a demanda.
 *
 * @param rows         Array de linhas no formato ImportRow
 * @param defensorId   ID do defensor responsável pelas demandas
 * @param atualizarExistentes  Se true, atualiza demandas duplicadas ao invés de pular
 */
export async function importarDemandas(
  rows: ImportRow[],
  defensorId: number,
  atualizarExistentes = false,
): Promise<ImportResult> {
  const results: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    assistidosSemSolar: 0,
  };

  const assistidoIdsImportados = new Set<number>();

  for (const row of rows) {
    try {
      // 1. Buscar ou criar assistido
      let assistido;

      if (row.assistidoMatchId) {
        assistido = await db.query.assistidos.findFirst({
          where: and(
            eq(assistidos.id, row.assistidoMatchId),
            isNull(assistidos.deletedAt),
          ),
        });
      }

      if (!assistido) {
        assistido = await db.query.assistidos.findFirst({
          where: and(
            ilike(assistidos.nome, row.assistido.trim()),
            isNull(assistidos.deletedAt),
          ),
        });
      }

      // Backfill: preencher atribuicaoPrimaria se estiver vazio
      if (assistido && !assistido.atribuicaoPrimaria) {
        const backfill = ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""];
        if (backfill) {
          await db.update(assistidos)
            .set({ atribuicaoPrimaria: backfill as any })
            .where(eq(assistidos.id, assistido.id));
        }
      }

      if (!assistido) {
        const statusPrisional = row.estadoPrisional === "preso"
          ? "CADEIA_PUBLICA"
          : row.estadoPrisional === "monitorado"
            ? "MONITORADO"
            : "SOLTO";

        const targetAtribuicaoPrimaria = (
          ATRIBUICAO_TO_ENUM[row.atribuicao || row.atribuicaoDetectada || ""] || "JURI_CAMACARI"
        ) as any;

        const [newAssistido] = await db.insert(assistidos).values({
          nome: row.assistido.trim(),
          statusPrisional: statusPrisional as any,
          atribuicaoPrimaria: targetAtribuicaoPrimaria,
          defensorId,
        }).returning();
        assistido = newAssistido;

        // Auto-create Drive folder (fire-and-forget)
        (async () => {
          try {
            const { isGoogleDriveConfigured, createOrFindAssistidoFolder, mapAtribuicaoToFolderKey } =
              await import("@/lib/services/google-drive");
            if (!isGoogleDriveConfigured()) return;
            const folderKey = mapAtribuicaoToFolderKey(targetAtribuicaoPrimaria);
            if (!folderKey) return;
            const folder = await createOrFindAssistidoFolder(folderKey, newAssistido.nome);
            if (folder) {
              await db.update(assistidos)
                .set({ driveFolderId: folder.id, updatedAt: new Date() })
                .where(eq(assistidos.id, newAssistido.id));
            }
          } catch (err) {
            console.error(`[pje-import] Drive folder failed for assistido ${newAssistido.id}:`, err);
          }
        })();
      }

      assistidoIdsImportados.add(assistido.id);

      // 2. Buscar ou criar processo
      const processoNumero = row.processoNumero?.trim() || "";
      const inputAtribuicao = row.atribuicao || "";
      const targetArea = (ATRIBUICAO_TO_AREA[inputAtribuicao] || "JURI") as any;
      const targetAtribuicao = (
        ATRIBUICAO_TO_ENUM[inputAtribuicao] || inputAtribuicao || "JURI_CAMACARI"
      ) as any;

      let processo;
      if (processoNumero) {
        processo = await db.query.processos.findFirst({
          where: and(
            eq(processos.numeroAutos, processoNumero),
            isNull(processos.deletedAt),
          ),
        });

        if (processo && processo.atribuicao !== targetAtribuicao) {
          const [updated] = await db.update(processos)
            .set({ atribuicao: targetAtribuicao, area: targetArea, updatedAt: new Date() })
            .where(eq(processos.id, processo.id))
            .returning();
          processo = updated;
        }
      }

      if (!processo) {
        const [newProcesso] = await db.insert(processos).values({
          assistidoId: assistido.id,
          numeroAutos: processoNumero || `SN-${Date.now()}-${results.imported}`,
          area: targetArea,
          atribuicao: targetAtribuicao,
        }).returning();
        processo = newProcesso;
      }

      // 3. Converter data de expedição para busca de duplicata
      const dataEntradaConvertida = convertDate(row.dataEntrada);
      let dataExpedicaoParaBusca = dataEntradaConvertida;

      if (row.dataExpedicaoCompleta) {
        if (row.dataExpedicaoCompleta.includes("T")) {
          dataExpedicaoParaBusca = row.dataExpedicaoCompleta.split("T")[0];
        } else if (row.dataExpedicaoCompleta.includes(" ")) {
          dataExpedicaoParaBusca = convertDate(row.dataExpedicaoCompleta.split(" ")[0]);
        } else {
          dataExpedicaoParaBusca = convertDate(row.dataExpedicaoCompleta);
        }
      }

      // 4. Verificar duplicata
      let existingDemanda;

      if (dataExpedicaoParaBusca) {
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.dataEntrada, dataExpedicaoParaBusca),
            isNull(demandas.deletedAt),
          ),
        });
      }

      if (!existingDemanda && row.ato && row.ato !== "Demanda importada") {
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            eq(demandas.ato, row.ato),
            dataExpedicaoParaBusca
              ? eq(demandas.dataEntrada, dataExpedicaoParaBusca)
              : isNull(demandas.dataEntrada),
            isNull(demandas.deletedAt),
          ),
        });
      }

      if (!existingDemanda && !dataExpedicaoParaBusca) {
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        existingDemanda = await db.query.demandas.findFirst({
          where: and(
            eq(demandas.processoId, processo.id),
            isNull(demandas.dataEntrada),
            gte(demandas.createdAt, trintaDiasAtras),
            isNull(demandas.deletedAt),
          ),
        });
      }

      // 5. Determinar status do banco
      const statusKey = (row.status || "analisar").toLowerCase().replace(/\s+/g, "_").trim();
      const dbStatus = CONCLUIDA_IMPORT_KEYS.has(statusKey)
        ? (STATUS_TO_DB[statusKey] || "5_TRIAGEM")
        : "5_TRIAGEM";
      const reuPreso = row.estadoPrisional === "preso";
      const substatus = statusKey || null;

      // 6. Atualizar existente ou inserir novo
      if (existingDemanda) {
        if (atualizarExistentes) {
          await db.update(demandas)
            .set({
              ato: row.ato,
              prazo: convertDate(row.prazo),
              dataEntrada: convertDate(row.dataEntrada),
              status: dbStatus as any,
              substatus,
              prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
              reuPreso,
              providencias: row.providencias || null,
              updatedAt: new Date(),
            })
            .where(eq(demandas.id, existingDemanda.id));
          results.updated++;
        } else {
          results.skipped++;
        }
        continue;
      }

      await db.insert(demandas).values({
        processoId: processo.id,
        assistidoId: assistido.id,
        ato: row.ato,
        prazo: convertDate(row.prazo),
        dataEntrada: convertDate(row.dataEntrada),
        status: dbStatus as any,
        substatus,
        prioridade: reuPreso ? "REU_PRESO" : "NORMAL",
        reuPreso,
        providencias: row.providencias || null,
        defensorId,
        importBatchId: row.importBatchId || null,
        ordemOriginal: row.ordemOriginal ?? null,
        enrichmentData: (row.crime || row.tipoDocumento || row.tipoProcesso) ? {
          crime: row.crime || undefined,
          artigos: [],
          fase_processual: inferirFaseProcessual(row.tipoDocumento),
          tipo_documento_pje: row.tipoDocumento || undefined,
          tipo_processo: row.tipoProcesso || undefined,
          id_documento_pje: row.idDocumentoPje || undefined,
          vara: row.vara || undefined,
        } as any : undefined,
      });

      results.imported++;
    } catch (error) {
      results.errors.push(`${row.assistido}: ${(error as Error).message}`);
    }
  }

  // Contar assistidos sem exportação ao Solar
  if (assistidoIdsImportados.size > 0) {
    const idsArray = Array.from(assistidoIdsImportados);
    const [semSolarResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assistidos)
      .where(and(
        inArray(assistidos.id, idsArray),
        isNull(assistidos.solarExportadoEm),
        isNull(assistidos.deletedAt),
      ));
    results.assistidosSemSolar = semSolarResult?.count ?? 0;
  }

  return results;
}
