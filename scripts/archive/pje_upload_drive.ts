/**
 * Upload Autos Digitais para Google Drive
 *
 * Usa as funções existentes do projeto (criarPastaProcesso, uploadFileBuffer)
 * para fazer upload dos PDFs baixados para a pasta correta no Drive.
 *
 * Uso: npx tsx scripts/pje_upload_drive.ts [diretório-dos-pdfs] [area]
 * Exemplo: npx tsx scripts/pje_upload_drive.ts ~/Desktop/pje-autos-juri Júri
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { db } from "@/lib/db";
import { processos, assistidos } from "@/lib/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import {
  uploadFileBuffer,
  createFolder,
  ATRIBUICAO_FOLDER_IDS
} from "@/lib/services/google-drive";

// Config
const PDF_DIR = process.argv[2] || `${process.env.HOME}/Desktop/pje-autos-juri`;
const AREA = process.argv[3] || "Júri";
const AREA_FOLDER_ID = ATRIBUICAO_FOLDER_IDS.JURI;

interface ProcessoInfo {
  id: number;
  numero: string;
  driveFolderId: string | null;
  assistidoNome: string;
}

async function getProcessoInfo(numero: string): Promise<ProcessoInfo | null> {
  // Buscar processo pelo número
  const proc = await db.query.processos.findFirst({
    where: or(
      eq(processos.numeroAutos, numero),
      ilike(processos.numeroAutos, `%${numero}%`),
    ),
    with: {
      assistido: true,
    },
  });

  if (!proc) return null;

  return {
    id: proc.id,
    numero: proc.numeroAutos,
    driveFolderId: proc.driveFolderId,
    assistidoNome: proc.assistido?.nome || "Sem Assistido",
  };
}

async function ensureDriveFolder(proc: ProcessoInfo): Promise<string | null> {
  // Se já tem pasta no Drive, usar
  if (proc.driveFolderId) return proc.driveFolderId;

  // Criar pasta: "Nome Assistido - Número"
  const folderName = `${proc.assistidoNome} - ${proc.numero}`;

  // Criar dentro da pasta da área (Júri)
  const folder = await createFolder(folderName, AREA_FOLDER_ID);

  if (folder) {
    // Atualizar processo com o link do Drive
    await db.update(processos)
      .set({
        linkDrive: folder.webViewLink,
        driveFolderId: folder.id,
        updatedAt: new Date(),
      })
      .where(eq(processos.id, proc.id));

    console.log(`  [DRIVE] Pasta criada: ${folderName}`);
    return folder.id;
  }

  return null;
}

async function main() {
  console.log(`=== Upload Autos Digitais → Google Drive ===`);
  console.log(`PDFs: ${PDF_DIR}`);
  console.log(`Área: ${AREA} (folder: ${AREA_FOLDER_ID})`);
  console.log();

  // Listar PDFs
  const files = readdirSync(PDF_DIR)
    .filter(f => f.endsWith(".pdf") && f.startsWith("autos-"))
    .sort();

  console.log(`${files.length} PDFs encontrados\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = join(PDF_DIR, file);
    const size = statSync(filePath).size;

    // Extrair número do processo do nome do arquivo
    // autos-8015405-36.2022.8.05.0039.pdf → 8015405-36.2022.8.05.0039
    const match = file.match(/^autos-(.+)\.pdf$/);
    if (!match) {
      console.log(`  ${file}: nome inválido, pulando`);
      errors++;
      continue;
    }
    const numero = match[1];

    console.log(`[${uploaded + skipped + errors + 1}/${files.length}] ${numero} (${Math.round(size / 1024 / 1024)}MB): `, "");

    // Buscar processo no banco
    const proc = await getProcessoInfo(numero);

    if (!proc) {
      // Processo não existe no banco — criar pasta genérica
      console.log("processo não encontrado no banco, uploading para pasta genérica...");

      const folderName = `${numero}`;
      const folder = await createFolder(folderName, AREA_FOLDER_ID);

      if (!folder) {
        console.log("  ERRO: não conseguiu criar pasta");
        errors++;
        continue;
      }

      const buffer = readFileSync(filePath);
      const result = await uploadFileBuffer(
        buffer,
        `Autos Digitais - ${numero}.pdf`,
        "application/pdf",
        folder.id,
        `Autos Digitais completos do processo ${numero}`,
        { preventDuplicates: true }
      );

      if (result) {
        console.log(`  OK → ${folder.webViewLink}`);
        uploaded++;
      } else {
        console.log("  ERRO no upload");
        errors++;
      }
      continue;
    }

    // Garantir pasta no Drive
    const folderId = await ensureDriveFolder(proc);
    if (!folderId) {
      console.log("ERRO: não conseguiu criar pasta no Drive");
      errors++;
      continue;
    }

    // Upload do PDF
    const buffer = readFileSync(filePath);
    const result = await uploadFileBuffer(
      buffer,
      `Autos Digitais - ${numero}.pdf`,
      "application/pdf",
      folderId,
      `Autos Digitais completos do processo ${numero} - ${proc.assistidoNome}`,
      { preventDuplicates: true }
    );

    if (result) {
      if (result.name === `Autos Digitais - ${numero}.pdf`) {
        console.log(`OK (${proc.assistidoNome})`);
      } else {
        console.log(`CACHED (já existia)`);
        skipped++;
        continue;
      }
      uploaded++;
    } else {
      console.log("ERRO no upload");
      errors++;
    }

    // Delay para não sobrecarregar API
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${files.length}`);

  process.exit(0);
}

main().catch(e => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
