import { db } from "../src/lib/db";
import { driveDocumentSections, driveFiles } from "../src/lib/db/schema";
import { eq, like } from "drizzle-orm";

async function main() {
  const f = await db.query.driveFiles.findFirst({
    where: (f, { like }) => like(f.fileName, "%8003937%"),
    columns: { id: true, fileName: true },
  });
  if (f == null) {
    console.log("File not found");
    process.exit();
  }
  console.log("File:", f.id, f.fileName);

  const sections = await db
    .select({
      tipo: driveDocumentSections.tipo,
      titulo: driveDocumentSections.titulo,
      paginaInicio: driveDocumentSections.paginaInicio,
      paginaFim: driveDocumentSections.paginaFim,
      confianca: driveDocumentSections.confianca,
      resumo: driveDocumentSections.resumo,
    })
    .from(driveDocumentSections)
    .where(eq(driveDocumentSections.driveFileId, f.id))
    .orderBy(driveDocumentSections.paginaInicio);

  console.log("Total sections:", sections.length);
  sections.forEach((s, i) => {
    console.log(
      `${i + 1}. [${s.tipo}] pg ${s.paginaInicio}-${s.paginaFim} (${s.confianca}%) ${s.titulo}`
    );
    console.log(`   -> ${(s.resumo || "").substring(0, 140)}`);
  });
  process.exit();
}
main();
