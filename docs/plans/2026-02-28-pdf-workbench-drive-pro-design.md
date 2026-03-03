# PDF Workbench + Drive Hub Pro

> Design validado em 2026-02-28. Manuseio avançado de PDFs processuais com IA.

## Contexto

Defensores precisam manusear PDFs de processos com centenas de páginas diariamente. As dores principais:

1. **OCR**: PDFs escaneados sem texto selecionável inviabilizam buscas e extração
2. **Extração de peças**: Precisam separar denúncia, laudos, depoimentos como arquivos individuais
3. **Navegação**: Fechar/abrir o viewer para trocar entre arquivos é lento
4. **Anotações**: Sem forma de grifar trechos ou adicionar notas durante leitura
5. **Google Docs**: Sem integração para criar/editar petições com templates
6. **Organização**: Falta fluidez na gestão de pastas e arquivos

## Prioridade de Implementação

1. **Fase 1**: OCR + Extração de Peças (fundação)
2. **Fase 2**: Navegação entre Arquivos no Viewer
3. **Fase 3**: Anotações (Grifos + Notas)
4. **Fase 4**: Google Docs Integration
5. **Fase 5**: Organização de Arquivos

---

## Fase 1 — OCR + Extração de Peças

### 1.1 OCR no Pipeline de Enrichment

O pipeline atual extrai texto com `pdfjs-dist`, mas só funciona para PDFs com texto embutido. PDFs escaneados precisam de OCR.

**Fluxo:**
1. PDF entra no pipeline de enrichment
2. `extractTextFromPdf()` tenta extrair texto normalmente
3. Se texto vazio ou muito curto → detecta como "escaneado"
4. Chama endpoint OCR no Enrichment Engine: `/api/ocr`
5. Retorna texto por página, salva em `driveFileContents.contentText`
6. Continua o pipeline normal (classificação de seções via Gemini)

**Detecção de PDF escaneado:**
- Critério: se o texto extraído por `pdfjs-dist` tem menos de 50 caracteres por página em média
- Ou se mais de 70% das páginas retornam texto vazio

**Campo novo em `driveFileContents`:**
- `ocrApplied: boolean` — indica se OCR foi usado

**Badge visual:** No card do arquivo, mostrar badge "OCR" quando texto foi obtido via OCR.

**Tecnologia recomendada:** Tesseract OCR (via pytesseract no Enrichment Engine Python) ou Docling (já referenciado no schema).

### 1.2 Novos Tipos de Seção (11 novos)

Ampliar de 10 para ~21 tipos no prompt do Gemini:

| Tipo | Slug | Cor |
|------|------|-----|
| Pronúncia | `pronuncia` | Amber |
| Resposta à Acusação | `resposta_acusacao` | Teal |
| Habeas Corpus | `habeas_corpus` | Red |
| Diligências do 422 CPP | `diligencias_422` | Orange |
| Interrogatório | `interrogatorio` | Blue |
| Termo do Inquérito | `termo_inquerito` | Slate |
| Ata de Audiência | `ata_audiencia` | Indigo |
| Alegações Finais do MP | `alegacoes_mp` | Rose |
| Alegações Finais da Defesa | `alegacoes_defesa` | Emerald |
| Laudo Necroscópico | `laudo_necroscopico` | Pink |
| Laudo de Local | `laudo_local` | Fuchsia |

Atualizar:
- `pdf-classifier.ts` — prompt do Gemini com tipos expandidos
- `PdfViewerModal.tsx` — `getSectionConfig()` com novas cores/labels
- `document-sections.ts` — validação de tipos no router

### 1.3 Extração de Seções como PDFs Individuais

**Fluxo:**
1. Usuário vê lista de seções no PdfViewerModal
2. Clica em "Extrair" (ícone download) ao lado de uma seção
3. Backend: `pdf-lib` cria novo PDF com páginas `paginaInicio` a `paginaFim`
4. Upload automático para a mesma pasta do Drive
5. Nome padronizado: `[Tipo] Título - Processo.pdf`
   - Ex: `[Denúncia] Denúncia - 0001234-56.2024.8.05.0001.pdf`
6. Toast de confirmação com link para o arquivo criado

**Novo endpoint tRPC:**
```
documentSections.extractToPdf({
  sectionId: number,
  driveFileId: number,
})
```

**Backend:**
1. Busca seção no banco (paginaInicio, paginaFim)
2. Baixa PDF original do Drive (`downloadFileContent`)
3. `pdf-lib`: `PDFDocument.create()` + copyPages do original
4. Upload novo PDF para mesma pasta (`uploadFileBuffer`)
5. Registra novo arquivo no `driveFiles`
6. Retorna `{ newFileId, webViewLink }`

### 1.4 Compartilhar Peça Extraída

Após extração, opções:
- **Copiar link do Drive** (clipboard)
- **Enviar via WhatsApp** (reusa infra da delegação — `gerarMensagemWhatsApp`)
- **Baixar** (webContentLink)

UI: Mini modal de confirmação pós-extração com as 3 opções.

---

## Fase 2 — Navegação entre Arquivos no Viewer

### 2.1 Setas Prev/Next na Toolbar

No `PdfViewerModal`, barra superior:
- Botão ← (anterior) e → (próximo)
- Tooltip com nome do arquivo truncado
- Navegação segue ordem da pasta (mesmo `driveFolderId`)
- Atalhos: `Alt+←` e `Alt+→`
- Ao trocar: mantém modal aberto, troca conteúdo com transição suave

**Props novas:**
```typescript
siblingFiles?: { id: number; name: string; webViewLink: string; pdfUrl: string }[]
onFileChange?: (fileId: number) => void
```

### 2.2 Tab "Arquivos" no Sidebar

Painel lateral do PdfViewerModal ganha tabs:
- **Tab "Seções"** (já existe) — índice de peças do PDF atual
- **Tab "Arquivos"** (nova) — lista de arquivos da pasta
- **Tab "Anotações"** (fase 3)

Arquivo atual highlighted. Clique troca sem fechar viewer.
Ícone de tipo + badge de enrichment status.
Busca rápida por nome.

### 2.3 Painel Retrátil

- 220px aberto, 0px fechado
- Toggle com ícone ou tecla `F`
- `transition-all duration-200` para animação

---

## Fase 3 — Anotações (Grifos + Notas)

### 3.1 Modelo de Dados

Nova tabela `driveFileAnnotations`:
```sql
CREATE TABLE drive_file_annotations (
  id SERIAL PRIMARY KEY,
  drive_file_id INTEGER REFERENCES drive_files(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  tipo VARCHAR(20) NOT NULL, -- "highlight" | "note"
  pagina INTEGER NOT NULL,
  cor VARCHAR(20) DEFAULT 'yellow', -- yellow, red, green, blue, purple
  texto TEXT, -- conteúdo da nota
  texto_selecionado TEXT, -- trecho grifado
  posicao JSONB, -- { x, y, width, height } relativo à página
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_file ON drive_file_annotations(drive_file_id);
CREATE INDEX idx_annotations_page ON drive_file_annotations(drive_file_id, pagina);
```

### 3.2 UI no PdfViewerModal

**Barra de ferramentas de anotação:**
- Modo Grifo: selecionar texto → popup com 5 cores
  - Amarelo = fatos
  - Vermelho = contradições
  - Verde = teses favoráveis
  - Azul = referências legais
  - Roxo = outros
- Modo Nota: click na página → mini textarea, salva como ícone posicionado

**Implementação técnica:**
- Overlays HTML posicionados sobre o canvas do react-pdf
- NÃO modifica o PDF original
- Coordenadas salvas em JSONB, re-renderizadas ao abrir
- Componente `AnnotationLayer` renderizado sobre cada Page

### 3.3 Tab "Anotações" no Sidebar

- Lista todas anotações do documento agrupadas por página
- Filtro por cor e tipo (grifo/nota)
- Click navega para a página
- Contador de anotações por cor

---

## Fase 4 — Google Docs Integration

### 4.1 Abrir .docx no Google Docs

Para arquivos `.docx`/`.odt`/`.rtf`:
- Botão "Editar no Google Docs" no DriveDetailPanel
- Abre `webViewLink` em nova aba (Google já redireciona para o editor)
- Simples: sem backend novo necessário

### 4.2 Templates com Placeholders

**Cadastro de templates** em `/admin/settings`:
- Upload de `.docx` template para pasta `_templates/` no Drive
- Placeholders suportados:
  - `{{PROCESSO_NUMERO}}`
  - `{{ASSISTIDO_NOME}}`
  - `{{ASSISTIDO_CPF}}`
  - `{{DEFENSOR_NOME}}`
  - `{{DATA_HOJE}}`
  - `{{COMARCA}}`
  - `{{VARA}}`
  - `{{JUIZ}}`
  - `{{CRIME}}`

**Tabela `documentTemplates`:**
```
- id, name, description
- driveFileId (FK ao template no Drive)
- category: "peticao" | "hc" | "alegacoes" | "resposta" | "recurso" | "outros"
- placeholders: jsonb (lista de placeholders usados)
- createdBy, createdAt, updatedAt
```

### 4.3 Botão "Novo Documento"

Na toolbar do Drive Hub:
- Dropdown com templates disponíveis
- Seleciona → backend:
  1. `files.copy()` do template para pasta do processo
  2. Google Docs API substitui placeholders com dados reais
  3. Retorna link de edição
- Abre automaticamente no Google Docs

---

## Fase 5 — Organização de Arquivos

### 5.1 Menu de Ações Expandido

Melhorar dropdown "..." por arquivo:
- Mover para pasta (mini modal com árvore de pastas)
- Duplicar arquivo
- Baixar arquivo
- Abrir no Google Docs (para .docx)
- Extrair peças (para PDFs enriquecidos)

### 5.2 Criar Subpastas pelo App

- Botão "Nova Pasta" na toolbar do Drive Hub
- Cria no Google Drive via API + registra no banco
- Sugestões: `Inquérito/`, `Audiências/`, `Laudos/`, `Petições/`

### 5.3 Multi-select + Batch

- Selecionar múltiplos arquivos → barra de ações
- Mover, Deletar, Baixar ZIP
- Similar ao batch de delegação

### 5.4 Drag & Drop

- Arrastar arquivo para pasta no painel de navegação
- Chama `moveFile()` (já existe no backend)
- Ghost do ícone + highlight da pasta destino

### 5.5 Árvore de Pastas no Sidebar

- Mini árvore colapsável no lado esquerdo do Drive Hub
- Hierarquia de pastas com expand/collapse
- Clique navega para a pasta
- Complementa o breadcrumb existente

---

## Arquivos Impactados por Fase

### Fase 1
| Arquivo | Ação |
|---------|------|
| `enrichment-engine/services/ocr_service.py` | Criar — endpoint OCR |
| `src/lib/inngest/functions.ts` | Modificar — detectar escaneado, chamar OCR |
| `src/lib/inngest/pdf-classifier.ts` | Modificar — 11 novos tipos de seção |
| `src/components/drive/PdfViewerModal.tsx` | Modificar — botão Extrair, novas cores |
| `src/lib/trpc/routers/document-sections.ts` | Modificar — mutation `extractToPdf` |
| `src/lib/db/schema.ts` | Modificar — campo `ocrApplied` em driveFileContents |

### Fase 2
| Arquivo | Ação |
|---------|------|
| `src/components/drive/PdfViewerModal.tsx` | Modificar — setas, tab Arquivos, painel retrátil |
| `src/components/drive/DriveDetailPanel.tsx` | Modificar — passar siblingFiles |

### Fase 3
| Arquivo | Ação |
|---------|------|
| `src/lib/db/schema.ts` | Modificar — tabela driveFileAnnotations |
| `src/lib/trpc/routers/annotations.ts` | Criar — CRUD de anotações |
| `src/components/drive/AnnotationLayer.tsx` | Criar — overlay de grifos/notas |
| `src/components/drive/PdfViewerModal.tsx` | Modificar — toolbar de anotação, tab |

### Fase 4
| Arquivo | Ação |
|---------|------|
| `src/lib/db/schema.ts` | Modificar — tabela documentTemplates |
| `src/lib/trpc/routers/templates.ts` | Criar — CRUD + geração de docs |
| `src/components/drive/DriveDetailPanel.tsx` | Modificar — botão Editar no Docs |
| `src/app/admin/settings/templates/` | Criar — página de admin |

### Fase 5
| Arquivo | Ação |
|---------|------|
| `src/components/drive/FolderTree.tsx` | Criar — árvore de pastas |
| `src/components/drive/DriveTabEnhanced.tsx` | Modificar — multi-select, drag&drop |
| `src/components/drive/DriveContentArea.tsx` | Modificar — nova pasta, batch actions |
| `src/lib/trpc/routers/drive.ts` | Modificar — duplicar, ZIP download |
