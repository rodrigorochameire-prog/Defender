# PDF Workbench Fase 1 — OCR + Extração de Peças

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expandir o pipeline de enrichment com OCR para PDFs escaneados, adicionar 11 novos tipos de seção processual, e permitir extrair seções individuais como PDFs separados salvos no Google Drive.

**Architecture:** O pipeline Inngest existente (`pdf/extract-and-classify` → `pdf/insert-bookmarks`) será estendido com detecção de OCR e novos tipos. Uma nova mutation tRPC `extractSectionToPdf` usará `pdf-lib` para recortar páginas e `google-drive.ts` para upload. O enrichment engine Python ganhará endpoint `/api/ocr` com Tesseract.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, pdf-lib, pdfjs-dist, Inngest, Google Gemini, Tesseract OCR (Python), Google Drive API.

---

## Task 1: Adicionar 11 Novos Tipos de Seção

**Files:**
- Modify: `src/lib/services/pdf-classifier.ts` (SECTION_TIPOS + prompt Gemini)
- Modify: `src/lib/services/pdf-bookmarker.ts` (TIPO_LABELS)
- Modify: `src/components/drive/PdfViewerModal.tsx` (SECTION_TYPE_CONFIG)

### Step 1: Atualizar SECTION_TIPOS e prompt no pdf-classifier.ts

Abrir `src/lib/services/pdf-classifier.ts`. Localizar `SECTION_TIPOS` e o `CLASSIFICATION_PROMPT`.

Adicionar os 11 novos tipos ao array:
```typescript
export const SECTION_TIPOS = [
  "denuncia", "sentenca", "decisao", "depoimento", "alegacoes",
  "certidao", "laudo", "inquerito", "recurso", "outros",
  // Novos tipos - Fase 1
  "pronuncia", "resposta_acusacao", "habeas_corpus", "diligencias_422",
  "interrogatorio", "termo_inquerito", "ata_audiencia",
  "alegacoes_mp", "alegacoes_defesa", "laudo_necroscopico", "laudo_local",
] as const;
```

Atualizar a tabela no `CLASSIFICATION_PROMPT` adicionando:
```
| pronuncia | "PRONÚNCIA", "PRONUNCIO O RÉU", "Decisão de Pronúncia" |
| resposta_acusacao | "RESPOSTA À ACUSAÇÃO", "DEFESA PRELIMINAR", "Art. 396-A CPP" |
| habeas_corpus | "HABEAS CORPUS", "HC", "ORDEM DE HABEAS CORPUS", "LIBERDADE PROVISÓRIA" |
| diligencias_422 | "ART. 422", "DILIGÊNCIAS", "REQUERIMENTO DE DILIGÊNCIAS", "ROL DE TESTEMUNHAS" |
| interrogatorio | "INTERROGATÓRIO", "TERMO DE INTERROGATÓRIO", "QUALIFICAÇÃO E INTERROGATÓRIO" |
| termo_inquerito | "TERMO DE DECLARAÇÕES DO INQUÉRITO", "AUTO DE PRISÃO", "BOLETIM DE OCORRÊNCIA", "PORTARIA DO IP" |
| ata_audiencia | "ATA DE AUDIÊNCIA", "TERMO DE AUDIÊNCIA", "AUDIÊNCIA DE INSTRUÇÃO" |
| alegacoes_mp | "ALEGAÇÕES FINAIS DO MINISTÉRIO PÚBLICO", "ALEGAÇÕES FINAIS DA ACUSAÇÃO", "MEMORIAIS DO MP" |
| alegacoes_defesa | "ALEGAÇÕES FINAIS DA DEFESA", "MEMORIAIS DA DEFESA", "RAZÕES FINAIS DEFENSIVAS" |
| laudo_necroscopico | "LAUDO NECROSCÓPICO", "EXAME CADAVÉRICO", "LAUDO DE NECROPSIA", "AUTO DE EXAME CADAVÉRICO" |
| laudo_local | "LAUDO DE LOCAL", "EXAME DE LOCAL", "LAUDO DE EXAME DO LOCAL DO FATO" |
```

Adicionar instrução no prompt: "Diferencie `alegacoes_mp` de `alegacoes_defesa` sempre que possível. Use `alegacoes` genérico apenas quando não for possível identificar a parte. Prefira `interrogatorio` para interrogatórios judiciais e `termo_inquerito` para termos do inquérito policial."

### Step 2: Atualizar TIPO_LABELS no pdf-bookmarker.ts

Abrir `src/lib/services/pdf-bookmarker.ts`. Localizar `TIPO_LABELS` e adicionar:
```typescript
pronuncia: "Pronúncia",
resposta_acusacao: "Resposta à Acusação",
habeas_corpus: "Habeas Corpus",
diligencias_422: "Diligências (Art. 422 CPP)",
interrogatorio: "Interrogatório",
termo_inquerito: "Termo do Inquérito",
ata_audiencia: "Ata de Audiência",
alegacoes_mp: "Alegações Finais (MP)",
alegacoes_defesa: "Alegações Finais (Defesa)",
laudo_necroscopico: "Laudo Necroscópico",
laudo_local: "Laudo de Local",
```

### Step 3: Atualizar SECTION_TYPE_CONFIG no PdfViewerModal.tsx

Abrir `src/components/drive/PdfViewerModal.tsx`. Localizar `SECTION_TYPE_CONFIG` e adicionar os 11 novos itens com cores e ícones. Importar ícones adicionais do lucide-react se necessário.

Cores sugeridas:
```typescript
pronuncia: { label: "Pronúncia", color: "#d97706", bgColor: "bg-amber-600/10 text-amber-600 border-amber-600/20", icon: Gavel },
resposta_acusacao: { label: "Resposta à Acusação", color: "#0d9488", bgColor: "bg-teal-600/10 text-teal-600 border-teal-600/20", icon: ShieldCheck },
habeas_corpus: { label: "Habeas Corpus", color: "#dc2626", bgColor: "bg-red-600/10 text-red-600 border-red-600/20", icon: Unlock },
diligencias_422: { label: "Diligências 422", color: "#ea580c", bgColor: "bg-orange-600/10 text-orange-600 border-orange-600/20", icon: ClipboardList },
interrogatorio: { label: "Interrogatório", color: "#2563eb", bgColor: "bg-blue-600/10 text-blue-600 border-blue-600/20", icon: MessageSquare },
termo_inquerito: { label: "Termo do Inquérito", color: "#475569", bgColor: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: FileSearch },
ata_audiencia: { label: "Ata de Audiência", color: "#4f46e5", bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: CalendarDays },
alegacoes_mp: { label: "Alegações (MP)", color: "#e11d48", bgColor: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: BookMarked },
alegacoes_defesa: { label: "Alegações (Defesa)", color: "#059669", bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: BookMarked },
laudo_necroscopico: { label: "Laudo Necroscópico", color: "#db2777", bgColor: "bg-pink-600/10 text-pink-600 border-pink-600/20", icon: Microscope },
laudo_local: { label: "Laudo de Local", color: "#c026d3", bgColor: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20", icon: MapPin },
```

Verificar que os ícones `ShieldCheck`, `Unlock`, `ClipboardList`, `MessageSquare`, `FileSearch`, `CalendarDays`, `MapPin` existem no lucide-react. Caso contrário, usar substitutos disponíveis.

### Step 4: Atualizar sectionTipoEnum no document-sections.ts router

Abrir `src/lib/trpc/routers/document-sections.ts`. Localizar o enum de validação (`z.enum(...)` ou similar) e adicionar os 11 novos tipos. Se não houver um enum Zod, verificar como `tipo` é validado no `create` e `createMany` mutations.

### Step 5: Build e verificar

```bash
npm run build
```

Verificar que não há erros de tipo. Todos os novos tipos devem ser aceitos pelo classifier, exibidos no viewer com cores corretas, e incluídos nos bookmarks.

### Step 6: Commit

```bash
git add src/lib/services/pdf-classifier.ts src/lib/services/pdf-bookmarker.ts src/components/drive/PdfViewerModal.tsx src/lib/trpc/routers/document-sections.ts
git commit -m "feat: add 11 new section types for legal document classification"
```

---

## Task 2: Mutation extractSectionToPdf — Backend

**Files:**
- Modify: `src/lib/trpc/routers/document-sections.ts` (nova mutation)
- Read: `src/lib/services/google-drive.ts` (uploadFileBuffer, downloadFileContent)
- Read: `src/lib/services/pdf-bookmarker.ts` (referência para uso de pdf-lib)

### Step 1: Adicionar mutation extractSectionToPdf

Abrir `src/lib/trpc/routers/document-sections.ts`. Adicionar nova mutation:

```typescript
extractSectionToPdf: protectedProcedure
  .input(z.object({
    sectionId: z.number(),
  }))
  .mutation(async ({ input }) => {
    // 1. Buscar seção no banco
    const [section] = await db
      .select()
      .from(driveDocumentSections)
      .where(eq(driveDocumentSections.id, input.sectionId))
      .limit(1);

    if (!section) throw new TRPCError({ code: "NOT_FOUND", message: "Seção não encontrada" });

    // 2. Buscar arquivo original
    const [file] = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.id, section.driveFileId))
      .limit(1);

    if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Arquivo não encontrado" });

    // 3. Baixar PDF do Drive
    const { downloadFileContent } = await import("@/lib/services/google-drive");
    const content = await downloadFileContent(file.driveFileId);
    const originalBuffer = Buffer.from(content);

    // 4. Extrair páginas com pdf-lib
    const { PDFDocument } = await import("pdf-lib");
    const originalPdf = await PDFDocument.load(originalBuffer);
    const extractedPdf = await PDFDocument.create();

    // pdf-lib usa index 0-based, seção usa 1-based
    const startIdx = section.paginaInicio - 1;
    const endIdx = section.paginaFim - 1;
    const pageIndices = Array.from(
      { length: endIdx - startIdx + 1 },
      (_, i) => startIdx + i
    );

    const copiedPages = await extractedPdf.copyPages(originalPdf, pageIndices);
    copiedPages.forEach((page) => extractedPdf.addPage(page));

    const extractedBuffer = Buffer.from(await extractedPdf.save());

    // 5. Gerar nome padronizado
    const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
    const cleanTitle = section.titulo.replace(/[^\w\s\-áéíóúàãõâêôçÁÉÍÓÚÀÃÕÂÊÔÇ]/g, "").trim();
    const fileName = `[${tipoLabel}] ${cleanTitle}.pdf`.substring(0, 200);

    // 6. Upload para mesma pasta no Drive
    const { uploadFileBuffer } = await import("@/lib/services/google-drive");
    const uploaded = await uploadFileBuffer(
      file.driveFolderId,
      fileName,
      "application/pdf",
      extractedBuffer
    );

    // 7. Registrar novo arquivo no banco
    const [newFile] = await db
      .insert(driveFiles)
      .values({
        driveFileId: uploaded.id,
        driveFolderId: file.driveFolderId,
        name: fileName,
        mimeType: "application/pdf",
        fileSize: extractedBuffer.length,
        webViewLink: uploaded.webViewLink || null,
        webContentLink: uploaded.webContentLink || null,
        enrichmentStatus: "completed", // já é um recorte classificado
        processoId: file.processoId,
        assistidoId: file.assistidoId,
        syncStatus: "synced",
        isFolder: false,
      })
      .returning();

    return {
      success: true,
      newFileId: newFile.id,
      fileName,
      webViewLink: uploaded.webViewLink || "",
      pageCount: pageIndices.length,
    };
  }),
```

Importar `TIPO_LABELS` ou definir inline. Verificar se `uploadFileBuffer` retorna `{ id, webViewLink, webContentLink }` — consultar `src/lib/services/google-drive.ts`.

### Step 2: Adicionar mapa TIPO_LABELS no router (ou importar)

Se `TIPO_LABELS` não é exportado pelo bookmarker, definir constante local no router:

```typescript
const TIPO_LABELS: Record<string, string> = {
  denuncia: "Denúncia",
  sentenca: "Sentença",
  decisao: "Decisão",
  depoimento: "Depoimento",
  alegacoes: "Alegações Finais",
  certidao: "Certidão",
  laudo: "Laudo Pericial",
  inquerito: "Inquérito Policial",
  recurso: "Recurso",
  outros: "Outros",
  pronuncia: "Pronúncia",
  resposta_acusacao: "Resposta à Acusação",
  habeas_corpus: "Habeas Corpus",
  diligencias_422: "Diligências 422",
  interrogatorio: "Interrogatório",
  termo_inquerito: "Termo do Inquérito",
  ata_audiencia: "Ata de Audiência",
  alegacoes_mp: "Alegações MP",
  alegacoes_defesa: "Alegações Defesa",
  laudo_necroscopico: "Laudo Necroscópico",
  laudo_local: "Laudo de Local",
};
```

### Step 3: Build e verificar

```bash
npm run build
```

### Step 4: Commit

```bash
git add src/lib/trpc/routers/document-sections.ts
git commit -m "feat: add extractSectionToPdf mutation for individual section extraction"
```

---

## Task 3: UI — Botão "Extrair" no PdfViewerModal

**Files:**
- Modify: `src/components/drive/PdfViewerModal.tsx` (botão extrair na SectionIndexPanel + modal de confirmação pós-extração)

### Step 1: Adicionar botão "Extrair" na SectionIndexPanel

Localizar o componente `SectionIndexPanel` dentro de `PdfViewerModal.tsx`. Em cada item de seção renderizado, adicionar um botão de ícone `FileDown` ao lado direito do item.

O botão deve:
- Ícone `FileDown` (já importado no arquivo)
- Tooltip: "Extrair como PDF separado"
- `onClick`: chama mutation `documentSections.extractSectionToPdf`
- Mostra `Loader2` durante loading

### Step 2: Criar state e mutation no componente principal

No componente principal `PdfViewerModal`, adicionar:

```typescript
const [extractingId, setExtractingId] = useState<number | null>(null);
const [extractResult, setExtractResult] = useState<{
  fileName: string;
  webViewLink: string;
  pageCount: number;
} | null>(null);

const extractMutation = trpc.documentSections.extractSectionToPdf.useMutation({
  onSuccess: (data) => {
    setExtractingId(null);
    setExtractResult({
      fileName: data.fileName,
      webViewLink: data.webViewLink,
      pageCount: data.pageCount,
    });
    toast.success(`Peça extraída: ${data.fileName}`);
  },
  onError: (err) => {
    setExtractingId(null);
    toast.error(`Erro ao extrair: ${err.message}`);
  },
});

const handleExtract = (sectionId: number) => {
  setExtractingId(sectionId);
  extractMutation.mutate({ sectionId });
};
```

Passar `handleExtract` e `extractingId` como props para `SectionIndexPanel`.

### Step 3: Mini modal de resultado pós-extração

Após extração bem-sucedida, exibir mini overlay com:
- Nome do arquivo criado
- Botão "Abrir no Drive" (link externo)
- Botão "Copiar link" (clipboard)
- Botão "Fechar"

```tsx
{extractResult && (
  <div className="absolute bottom-4 right-4 z-50 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded-lg shadow-xl p-4 max-w-sm">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
        <Check className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Peça extraída!</p>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{extractResult.fileName}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{extractResult.pageCount} página(s)</p>
        <div className="flex gap-2 mt-3">
          <a href={extractResult.webViewLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors">
            <ExternalLink className="w-3 h-3" /> Abrir
          </a>
          <button onClick={() => { navigator.clipboard.writeText(extractResult.webViewLink); toast.success("Link copiado!"); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors">
            <Link2 className="w-3 h-3" /> Copiar link
          </button>
        </div>
      </div>
      <button onClick={() => setExtractResult(null)} className="text-zinc-400 hover:text-zinc-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

### Step 4: Build e verificar

```bash
npm run build
```

### Step 5: Commit

```bash
git add src/components/drive/PdfViewerModal.tsx
git commit -m "feat: add extract section to PDF button in viewer with post-extract actions"
```

---

## Task 4: OCR Detection no Pipeline

**Files:**
- Modify: `src/lib/services/pdf-extractor.ts` (função de detecção de OCR)
- Modify: `src/lib/inngest/functions.ts` (adicionar step de OCR)
- Modify: `src/lib/db/schema.ts` (campo ocrApplied em driveFileContents)

### Step 1: Adicionar campo ocrApplied no schema

Abrir `src/lib/db/schema.ts`. Localizar a tabela `driveFileContents` e adicionar:

```typescript
ocrApplied: boolean("ocr_applied").default(false),
```

### Step 2: Gerar migration

```bash
npm run db:generate
```

Verificar que o migration file foi criado corretamente.

### Step 3: Aplicar migration

```bash
npm run db:push
```

### Step 4: Adicionar função detectNeedsOcr no pdf-extractor.ts

Abrir `src/lib/services/pdf-extractor.ts`. Adicionar:

```typescript
/**
 * Detecta se um PDF é escaneado (precisa de OCR).
 * Critérios:
 * - Média de caracteres por página < 50
 * - Mais de 70% das páginas com texto vazio ou muito curto
 */
export function detectNeedsOcr(pages: PageText[]): boolean {
  if (pages.length === 0) return false;

  const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0);
  const avgCharsPerPage = totalChars / pages.length;

  const emptyPages = pages.filter((p) => p.text.trim().length < 30).length;
  const emptyRatio = emptyPages / pages.length;

  return avgCharsPerPage < 50 || emptyRatio > 0.7;
}
```

### Step 5: Atualizar Inngest function para detectar OCR

Abrir `src/lib/inngest/functions.ts`. No `pdfExtractAndClassifyFn`, após o step "extract-text":

```typescript
// Step 2.5: Check if OCR is needed
const needsOcr = await step.run("check-ocr-need", async () => {
  const { detectNeedsOcr } = await import("@/lib/services/pdf-extractor");
  return detectNeedsOcr(extraction.pages);
});

// Step 2.6: If OCR needed, call enrichment engine
let ocrPages = extraction.pages;
if (needsOcr) {
  ocrPages = await step.run("run-ocr", async () => {
    const { EnrichmentClient } = await import("@/lib/services/enrichment-client");
    const client = new EnrichmentClient();
    try {
      const ocrResult = await client.ocr({
        fileUrl: `drive://${driveGoogleId}`,
        driveFileId: driveGoogleId,
      });
      return ocrResult.pages.map((p: any) => ({
        pageNumber: p.page_number,
        text: p.text,
        lineCount: p.text.split("\n").length,
      }));
    } catch (err) {
      console.error("OCR failed, continuing with original extraction:", err);
      return extraction.pages; // fallback
    }
  });
}
```

Usar `ocrPages` em vez de `extraction.pages` nos steps subsequentes de classificação.

Após store de seções, salvar flag OCR:

```typescript
// Step 5.5: Mark OCR status in driveFileContents
if (needsOcr) {
  await step.run("mark-ocr-applied", async () => {
    const { driveFileContents } = await import("@/lib/db/schema");
    await db
      .insert(driveFileContents)
      .values({
        driveFileId: driveFileId,
        extractionStatus: "COMPLETED",
        ocrApplied: true,
        contentText: ocrPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
        pageCount: ocrPages.length,
      })
      .onConflictDoUpdate({
        target: driveFileContents.driveFileId,
        set: {
          ocrApplied: true,
          contentText: ocrPages.map((p) => p.text).join("\n\n---PAGE---\n\n"),
          extractionStatus: "COMPLETED",
          extractedAt: new Date(),
        },
      });
  });
}
```

### Step 6: Adicionar método ocr() no enrichment-client.ts

Abrir `src/lib/services/enrichment-client.ts`. Adicionar método:

```typescript
async ocr(input: {
  fileUrl: string;
  driveFileId: string;
}): Promise<OcrOutput> {
  return this.request<OcrOutput>("/api/ocr", {
    file_url: input.fileUrl,
    drive_file_id: input.driveFileId,
  });
}
```

E o tipo:
```typescript
export interface OcrOutput {
  pages: { page_number: number; text: string }[];
  total_pages: number;
  ocr_engine: string;
  processing_time_ms: number;
}
```

### Step 7: Build e verificar

```bash
npm run build
```

### Step 8: Commit

```bash
git add src/lib/db/schema.ts src/lib/services/pdf-extractor.ts src/lib/inngest/functions.ts src/lib/services/enrichment-client.ts
git commit -m "feat: add OCR detection in enrichment pipeline with fallback"
```

---

## Task 5: OCR Endpoint no Enrichment Engine (Python)

**Files:**
- Create: `enrichment-engine/routers/ocr.py`
- Create: `enrichment-engine/services/ocr_service.py`
- Modify: `enrichment-engine/main.py` (registrar router)
- Modify: `enrichment-engine/requirements.txt` (adicionar pytesseract, pdf2image)

### Step 1: Adicionar dependências

No `enrichment-engine/requirements.txt` (ou `pyproject.toml`), adicionar:
```
pytesseract>=0.3.10
pdf2image>=1.16.3
Pillow>=10.0.0
```

Nota: Tesseract OCR binário precisa estar instalado no sistema. No Dockerfile ou ambiente:
```bash
apt-get install -y tesseract-ocr tesseract-ocr-por
```

### Step 2: Criar serviço OCR

Criar `enrichment-engine/services/ocr_service.py`:

```python
import io
import time
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image


async def extract_text_with_ocr(
    pdf_bytes: bytes,
    language: str = "por",
    dpi: int = 300,
) -> dict:
    """
    Converte cada página do PDF em imagem e aplica Tesseract OCR.

    Args:
        pdf_bytes: Conteúdo do PDF em bytes
        language: Idioma do Tesseract (por = português)
        dpi: Resolução para conversão (300 = boa qualidade)

    Returns:
        dict com pages[], total_pages, ocr_engine, processing_time_ms
    """
    start_time = time.time()

    # Converte PDF em lista de imagens PIL
    images = convert_from_bytes(pdf_bytes, dpi=dpi)

    pages = []
    for i, image in enumerate(images):
        # Aplica OCR em cada página
        text = pytesseract.image_to_string(image, lang=language)
        pages.append({
            "page_number": i + 1,
            "text": text.strip(),
        })

    processing_time_ms = int((time.time() - start_time) * 1000)

    return {
        "pages": pages,
        "total_pages": len(pages),
        "ocr_engine": "tesseract",
        "processing_time_ms": processing_time_ms,
    }
```

### Step 3: Criar router OCR

Criar `enrichment-engine/routers/ocr.py`:

```python
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.ocr_service import extract_text_with_ocr

router = APIRouter(prefix="/api", tags=["ocr"])


class OcrRequest(BaseModel):
    file_url: str  # URL do arquivo ou "drive://{driveFileId}"
    drive_file_id: str | None = None
    language: str = "por"
    dpi: int = 300


class OcrPage(BaseModel):
    page_number: int
    text: str


class OcrResponse(BaseModel):
    pages: list[OcrPage]
    total_pages: int
    ocr_engine: str
    processing_time_ms: int


@router.post("/ocr", response_model=OcrResponse)
async def ocr_endpoint(request: OcrRequest):
    """
    Recebe URL de um PDF e retorna texto extraído via OCR (Tesseract).
    Suporta URLs diretas ou referências ao Google Drive.
    """
    try:
        # Download do PDF
        if request.file_url.startswith("drive://"):
            # Importar serviço de download do Drive
            from services.google_drive_service import download_drive_file
            pdf_bytes = await download_drive_file(request.drive_file_id or request.file_url.replace("drive://", ""))
        else:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.get(request.file_url)
                resp.raise_for_status()
                pdf_bytes = resp.content

        # Executar OCR
        result = await extract_text_with_ocr(
            pdf_bytes,
            language=request.language,
            dpi=request.dpi,
        )

        return OcrResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
```

### Step 4: Registrar router no main.py

Abrir `enrichment-engine/main.py`. Adicionar:

```python
from routers.ocr import router as ocr_router
app.include_router(ocr_router)
```

### Step 5: Verificar que enrichment engine ainda funciona

```bash
cd enrichment-engine
pip install pytesseract pdf2image Pillow
python -c "from routers.ocr import router; print('OCR router OK')"
```

### Step 6: Commit

```bash
git add enrichment-engine/
git commit -m "feat: add OCR endpoint with Tesseract for scanned PDFs"
```

---

## Task 6: Badge OCR + Indicador Visual

**Files:**
- Modify: `src/components/drive/DriveDetailPanel.tsx` (badge OCR no painel de detalhes)

### Step 1: Adicionar badge visual quando OCR foi aplicado

Localizar a seção de `EnrichmentSection` ou `MetadataSection` no `DriveDetailPanel.tsx`. Adicionar consulta ao `driveFileContents` para verificar `ocrApplied`:

Opção simples: na query existente que traz dados do arquivo, verificar se existe entry em `driveFileContents` com `ocrApplied: true`. Se sim, exibir badge:

```tsx
<Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700">
  <ScanLine className="w-3 h-3 mr-1" />
  OCR
</Badge>
```

Importar `ScanLine` do lucide-react (ou usar `ScanEye` se disponível).

Posicionar o badge próximo ao nome do arquivo ou na seção de metadata do painel.

### Step 2: Build e verificar

```bash
npm run build
```

### Step 3: Commit

```bash
git add src/components/drive/DriveDetailPanel.tsx
git commit -m "feat: add OCR badge indicator in file detail panel"
```

---

## Verificação Final

Após implementação de todas as tasks:

1. **Build limpo**: `npm run build` sem erros
2. **Novos tipos**: Verificar que os 21 tipos aparecem no PdfViewerModal com cores corretas
3. **Extração**: Testar botão "Extrair" em uma seção — deve criar PDF no Drive
4. **OCR pipeline**: Verificar que `detectNeedsOcr` retorna `true` para PDFs com pouco texto
5. **OCR endpoint**: Verificar que `POST /api/ocr` funciona no enrichment engine (requer Tesseract instalado)
6. **Badge**: Verificar que badge OCR aparece quando `ocrApplied = true`

---

## Resumo de Arquivos

| Arquivo | Task | Ação |
|---------|------|------|
| `src/lib/services/pdf-classifier.ts` | 1 | Modify — novos tipos + prompt |
| `src/lib/services/pdf-bookmarker.ts` | 1 | Modify — novos labels |
| `src/components/drive/PdfViewerModal.tsx` | 1, 3 | Modify — config + botão extrair |
| `src/lib/trpc/routers/document-sections.ts` | 1, 2 | Modify — enum + extractSectionToPdf |
| `src/lib/services/pdf-extractor.ts` | 4 | Modify — detectNeedsOcr |
| `src/lib/inngest/functions.ts` | 4 | Modify — OCR step |
| `src/lib/services/enrichment-client.ts` | 4 | Modify — método ocr() |
| `src/lib/db/schema.ts` | 4 | Modify — campo ocrApplied |
| `enrichment-engine/services/ocr_service.py` | 5 | Create |
| `enrichment-engine/routers/ocr.py` | 5 | Create |
| `enrichment-engine/main.py` | 5 | Modify — registrar router |
| `src/components/drive/DriveDetailPanel.tsx` | 6 | Modify — badge OCR |
