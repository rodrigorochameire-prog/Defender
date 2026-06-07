# Anexos em Registros de Demanda — Design

**Data:** 2026-06-07
**Autor:** Rodrigo Rocha Meire (+ Claude)
**Status:** Aprovado (brainstorming) — pronto para plano de implementação

## Problema

No painel de **Registros** de uma demanda (timeline com "Ciência", "Diligência", etc.) não é possível anexar fotos ou documentos. O defensor precisa juntar comprovantes, prints, ofícios e fotos a um registro, inclusive **arrastando** o arquivo sobre o registro, de forma organizada e integrada ao fluxo existente.

## Objetivo

Permitir anexar fotos e documentos a um **registro**:
- ao **criar** um registro novo (no `registro-editor`);
- **arrastando** um arquivo sobre um registro já existente (no `registro-card`);

com armazenamento no Supabase Storage e **espelho** na pasta do assistido no Google Drive.

## Decisões (do brainstorming)

1. **Escopo:** anexar ao criar **e** arrastar nos registros existentes.
2. **Fotos/tamanho:** converter HEIC→JPEG e comprimir imagens **no navegador** antes do upload (cabe no limite de 10MB sem mexer no bucket).
3. **Armazenamento:** Supabase Storage (`documents`) **+ espelho no Google Drive** (assíncrono, best-effort).

## Não-objetivos (YAGNI)

- Versionamento de anexos; edição de imagem; OCR/transcrição de documentos.
- Anexos em entidades que não sejam registro (processo/assistido) — fora de escopo.
- Upload direto via signed URL (dispensável porque comprimimos no cliente).

## Arquitetura

### 1. Modelo de dados — `registro_anexos` (1 registro → N anexos)

Tabela dedicada (drizzle, `src/lib/db/schema/agenda.ts`, junto de `registros`), com migration.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `registroId` | integer FK → `registros.id` `onDelete: cascade` | |
| `storagePath` | text notNull | `registros/{registroId}/{uuid}.{ext}` no bucket `documents` |
| `nomeOriginal` | varchar(255) | nome do arquivo original |
| `mimeType` | varchar(100) | |
| `tamanho` | integer | bytes (pós-compressão) |
| `tipo` | varchar(20) | `imagem` \| `documento` (derivado do mime) |
| `driveFileId` | varchar(100) nullable | id do espelho no Drive |
| `driveStatus` | varchar(20) default `pending` | `pending` \| `synced` \| `error` |
| `autorId` | integer FK → `users.id` | quem anexou |
| `createdAt` | timestamp defaultNow | |

Índices: `registroId`, `autorId`, `driveStatus`.

### 2. Storage e upload

- Bucket **`documents`** (já existe; privado; RLS por usuário autenticado; mimes pdf/jpeg/png/doc/docx; 10MB). Sem alteração necessária (imagens chegam como JPEG/PNG comprimidos).
- **Caminho:** `registros/{registroId}/{uuid}-{slug-do-nome}.{ext}`.
- **Rota:** `POST /api/registros/anexos` (multipart, autenticada, Supabase service-role no servidor):
  1. valida sessão + escopo (defensor dono da demanda do registro);
  2. valida mime/tamanho;
  3. faz upload ao Storage;
  4. insere linha `registro_anexos`;
  5. enfileira `mirrorAnexoToDrive(anexoId)` (não bloqueia a resposta).
- `DELETE /api/registros/anexos?id=` remove do Storage + linha (+ Drive best-effort).
- **Leitura:** signed URL de curta duração gerada server-side (tRPC `registros.anexos.list` retorna URLs assinadas) — bucket é privado.

### 3. Espelho no Drive (`mirrorAnexoToDrive`, server util)

- Reusa a integração Drive existente (`src/lib/trpc/routers/drive.ts` / `/api/drive/upload`).
- Envia o arquivo à pasta do assistido (subpasta `Registros/`); grava `driveFileId`; atualiza `driveStatus` (`synced`/`error`).
- Best-effort e idempotente: anexo é utilizável no app mesmo com Drive `pending`/`error`; reprocessável depois.

### 4. UI (componentes isolados)

- `useAnexoUpload` — hook cliente: detecta HEIC→JPEG (`heic2any`/canvas), comprime imagens (`browser-image-compression` ou canvas), `POST` multipart, expõe progresso/erro.
- `AnexoDropzone` — wrapper drag-and-drop reutilizável (realça no `dragover`, valida no `drop`).
- `AnexoList` / `AnexoThumb` — miniaturas (imagem) + chips (PDF/DOC); ações abrir/baixar/excluir; badge ☁️ quando `driveStatus=synced`, ⏳ quando `pending`.
- Integração:
  - `registro-editor.tsx`: dropzone + botão de arquivo; arquivos "pendentes" como miniatura/chip; ao salvar → cria registro → sobe anexos para `registroId`.
  - `registro-card.tsx`: `AnexoList` abaixo do conteúdo; o card inteiro vira `AnexoDropzone` (arrastar foto → solta → anexa àquele registro).

### 5. tRPC / API

- `registros.anexos.list(registroId)` → anexos + signed URLs.
- `registros.anexos.remove(id)`.
- Upload via rota Next (multipart), não tRPC (bytes).
- Escopo: herda do registro/demanda (reusa defensor-scope existente). Só o autor/dono anexa e exclui.

## Componentes e responsabilidades

| Unidade | Faz | Depende de |
|---|---|---|
| `registro_anexos` (schema+migration) | persiste metadados | drizzle |
| `POST/DELETE /api/registros/anexos` | upload/remoção + insert + enfileira Drive | Supabase service-role, db, scope |
| `mirrorAnexoToDrive` | espelha no Drive, atualiza status | drive integration |
| `useAnexoUpload` | converte/comprime/envia, progresso | heic2any, image-compression |
| `AnexoDropzone` | DnD reutilizável | — |
| `AnexoList`/`AnexoThumb` | render/abrir/excluir | tRPC list |

## Tratamento de erros

- Mime/tamanho inválido → rejeitado no cliente (mensagem) e revalidado no servidor.
- Falha de upload → estado de erro no chip + re-tentar.
- Falha do Drive → `driveStatus=error`, anexo continua válido no app; reprocessável.
- Exclusão: remove Storage e linha; falha no Drive não impede a exclusão local.

## Testes

- Puros: `mimeToTipo`, builder de `storagePath` (slug/uuid/ext), decisão de conversão/compressão (precisa converter HEIC? precisa comprimir > limite?).
- Componente: `AnexoDropzone` aceita/rejeita por mime/tamanho.
- Integração leve: insert/list/remove do anexo (mock storage).
- Migration aplicável e reversível.

## Faseamento

- **Fase 1 (núcleo):** schema+migration, rota upload, Storage, `AnexoList` no card, dropzone no editor e no card, `registros.anexos.list/remove`.
- **Fase 2:** `mirrorAnexoToDrive` + status no UI.
- **Fase 3:** polimento — progresso %, re-tentar, lightbox de imagem.

## Riscos

- HEIC no navegador exige lib (`heic2any`) — peso de bundle; carregar sob demanda (dynamic import).
- Drive mirror depende de credenciais/token válidos; manter best-effort para não travar o fluxo.
- RLS do bucket: leitura via signed URL server-side evita expor o bucket.
