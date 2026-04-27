# Agenda · Fase 2 · Documentos & Mídia

**Data:** 2026-04-16
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** Adicionar `DocumentosBlock` e `MidiaBlock` ao sheet lateral. Reusa integração Drive existente (`trpc.drive.*`).
**Fases anteriores:** Fase 1 Sheet UX (mergeada) — ver `docs/plans/2026-04-16-agenda-fase1-sheet-ux-plan.md`.
**Fases seguintes (spec separado):** Fase 3 Histórico redesign · Fase 4 Povoamento.

---

## Contexto

A Fase 1 entregou o sheet redesenhado com ToC, seções colapsáveis e card de depoente rico. O bloco "Documentos" atual mostra apenas 2 links para `/admin/assistidos/:id?tab=drive` e `/admin/processos/:id?tab=drive` — nenhum preview, nenhuma mídia, nenhum upload inline. Durante audiência, consultar um laudo ou ouvir oitiva exige sair do Defender para abrir Drive em outra aba.

## Objetivo

Trazer documentos e mídia do Drive para dentro do sheet: preview inline de PDFs, player de áudio embutido, upload por drag-and-drop — tudo sem perder o contexto do evento/caso.

## Decisões de design (brainstorming validado)

| Pergunta | Escolha | Racional |
|---|---|---|
| Uso primário do bloco Docs | **A — Ler autos em audiência** (B upload secundário) | Consulta é a ação mais frequente durante instrução |
| Preview de PDF | **A — Iframe inline** (em vez de modal ou abrir-em-nova-aba) | Zero context switch; Drive oferece URL `/preview` que renderiza bem em iframe |
| Listagem | **A — Tabs Autos/Assistido** (default Autos) | Foco na audiência, mas Assistido acessível em 1 clique |
| Mídia | **A — Bloco Mídia dedicado** | Áudio e vídeo ganham espaço próprio; `▶ Áudio` do DepoenteCardV2 rola até lá |

## Reuso do que já existe

O `src/lib/trpc/routers/drive.ts` (5917 linhas, 93 procedures) já tem tudo que precisamos:

| Procedure | Uso em Fase 2 |
|---|---|
| `drive.filesByProcesso({ processoId })` | Tab Autos |
| `drive.filesByAssistido({ assistidoId })` | Tab Assistido |
| `drive.midiasByAssistido({ assistidoId })` | Bloco Mídia |
| `drive.uploadWithLink({ file, entityType, entityId })` | Drop zone com auto-link |
| `drive.fileInfo({ fileId })` | Metadados para preview |
| `drive.renameFile`, `drive.deleteFile`, `drive.moveFile` | Menu ⋯ por item |
| `drive.isConfigured` | Empty state quando Drive não conectado |

**Nenhuma mutation nova.** Nenhuma coluna nova no schema. Fase 2 é 100% nova UI consumindo tRPC existente.

## Arquitetura

### Novos componentes (`src/components/agenda/sheet/`)

```
sheet/
├── documentos-block.tsx      [new]  orquestra tabs + lista + upload
├── documentos-item.tsx       [new]  item de arquivo com preview expansível
├── drive-preview-iframe.tsx  [new]  embed iframe para drive.google.com/.../preview
├── drop-zone.tsx             [new]  área drag-and-drop + botão upload
├── midia-block.tsx           [new]  lista unificada áudio/vídeo
├── audio-player-inline.tsx   [new]  HTML5 <audio> estilizado
└── video-modal.tsx           [new]  modal overlay para vídeo
```

### `DocumentosBlock`

```tsx
interface Props {
  processoId: number | null;
  assistidoId: number | null;
}
```

- State interno: `activeTab: "autos" | "assistido"`, `openItemId: string | null` (accordion), `filter: "all" | "pdf" | "imagem" | "outros"`
- Duas queries em paralelo:
  ```ts
  const autos = trpc.drive.filesByProcesso.useQuery({ processoId }, { enabled: !!processoId });
  const assistidoFiles = trpc.drive.filesByAssistido.useQuery({ assistidoId }, { enabled: !!assistidoId });
  ```
- Layout: barra de tabs com contador (`Autos (8) · Assistido (3)`) + `DropZone` discreta no topo da tab ativa + lista de `DocumentosItem`s.
- Filtros como chips horizontais abaixo das tabs (all/pdf/imagem/outros). Ordenação fixa: data desc.
- Empty states:
  - Drive não conectado: CTA "Conectar Google Drive" → `/admin/configuracoes/drive`.
  - Pasta existe mas vazia: "Nenhum arquivo ainda — arraste para cá ou clique abaixo."

### `DocumentosItem`

```tsx
interface Props {
  file: {
    driveFileId: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
    modifiedAt?: Date;
    webViewLink?: string;
  };
  isOpen: boolean;
  onToggle: () => void;
  entityType: "processo" | "assistido";
  entityId: number;
}
```

- Fechado (1 linha): ícone por mimeType + nome truncate + data pequena + seta `↗` abrindo em nova aba.
- Aberto: nome + metadados (tamanho, data completa) + `DrivePreviewIframe` (altura 480px) + botões "Abrir no Drive" / "Baixar" / menu ⋯ (renomear/deletar/mover).
- Só 1 item aberto por vez dentro do bloco (accordion).

### `DrivePreviewIframe`

```tsx
interface Props {
  driveFileId: string;
  height?: number;
  mimeType?: string;
}
```

- Renderiza `<iframe src="https://drive.google.com/file/d/{driveFileId}/preview" loading="lazy" ... />`.
- Loading skeleton enquanto iframe carrega.
- Fallback se mimeType não-suportado (ex: .doc sem conversão): mensagem + botão abrir no Drive.
- `sandbox="allow-scripts allow-same-origin"` para bloquear downloads indesejados mas permitir navegação Drive.

### `DropZone`

```tsx
interface Props {
  destino: "processo" | "assistido";
  processoId?: number;
  assistidoId?: number;
  onUploaded?: () => void;
}
```

- Drag-and-drop + fallback `<input type="file" multiple>`.
- Validação cliente: máx 50 MB por arquivo, mimeTypes aceitos (PDF, imagem, áudio, vídeo, doc).
- Upload chama `trpc.drive.uploadWithLink.useMutation({ ...args, entityType, entityId })`.
- Progress: toast sonner com percentage (usa `onUploadProgress` do fetch).
- Erro: toast com mensagem.
- Sucesso: invalidate `filesByProcesso` / `filesByAssistido` + `onUploaded?.()` para fechar collapse se quiser.

### `MidiaBlock`

```tsx
interface Props {
  assistidoId: number | null;
  atendimentosComAudio: Array<{ id: number; data: Date; audioDriveFileId: string; transcricaoResumo?: string }>;
}
```

- Query: `trpc.drive.midiasByAssistido.useQuery({ assistidoId }, { enabled: !!assistidoId })`.
- Lista unificada = `[...midias, ...atendimentosComAudio.map(a => ({ source: "atendimento", ...a }))]`.
- Ordenação: data desc.
- Tipo áudio → renderiza `AudioPlayerInline`. Tipo vídeo → thumbnail + ▶ → abre `VideoModal`.
- Para atendimentos: se `transcricaoResumo` existe, exibe bloco colapsável abaixo do player com o texto.
- Empty state: "Nenhuma mídia vinculada a este assistido."

### `AudioPlayerInline`

```tsx
interface Props {
  driveFileId: string;
  title: string;
  duration?: number; // segundos, se conhecido
  autoPlay?: boolean; // quando vier de "▶ Áudio" do depoente
}
```

- `<audio controls preload="metadata">` com `src` apontando para `https://drive.google.com/uc?export=download&id={driveFileId}` (embed direto — requer que o arquivo tenha permissão de leitura pela conta autenticada).
- Alternativa se não rolar: botão "Abrir no Drive" como fallback.
- Waveform placeholder: barra cinza com gradient (não é análise real de áudio; fica pra futuro).
- Expõe `ref` para auto-play programático.

### `VideoModal`

```tsx
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driveFileId: string;
  title: string;
}
```

- Radix Dialog 80% da tela.
- `DrivePreviewIframe` internamente com altura auto.
- ESC fecha.

## Integração com DepoenteCardV2

O botão `▶ Áudio` hoje está cinza com toast "Em breve (Fase 2)" (linha no `event-detail-sheet.tsx`). Na Fase 2:

1. Heurística: ao montar o sheet, para cada depoente busca em `midiasByAssistido` + `atendimentosComAudio` um item cujo `name` contenha o primeiro nome do depoente (normalizado, lowercase, sem acentos). Se encontrar, guarda o `driveFileId` num map `depoenteNome → driveFileId`.
2. No `DepoenteCardV2`, passa `audioDriveFileId` via props quando existe no map.
3. Botão `▶ Áudio` fica ativo. Clicar:
   - Rola sheet até bloco Mídia (`scrollIntoView`).
   - Abre o item correspondente no `MidiaBlock`.
   - Chama `play()` no player com pequeno delay (ref imperativo).

A coluna `testemunhas.audioDriveFileId` (link explícito em vez de heurística) fica para Fase 4.

## Fluxo de dados

```
┌─ sheet ─────────────────────────────────┐
│                                         │
│ <CollapsibleSection id="documentos">    │
│   <DocumentosBlock                      │
│     processoId={…} assistidoId={…} />   │
│                                         │
│ <CollapsibleSection id="midia">         │
│   <MidiaBlock                           │
│     assistidoId={…}                     │
│     atendimentosComAudio={…} />         │
│                                         │
└─────────────────────────────────────────┘
          │                  │
          ▼                  ▼
 trpc.drive.*         trpc.audiencias
 ─ filesByProcesso    .getAudienciaContext
 ─ filesByAssistido   (já carrega atendimentos)
 ─ midiasByAssistido
 ─ uploadWithLink
 ─ renameFile / deleteFile
```

`event-detail-sheet.tsx` adiciona as duas novas seções à lista de `CollapsibleSection`s (ids `documentos` e `midia`) e ao `tocSections` (chips "Docs" e "Mídia"). A seção atual "Documentos" com 2 links é substituída pelo `DocumentosBlock`.

## Testes

### Unit (RTL + happy-dom)

`__tests__/components/documentos-block.test.tsx`:
- Tabs renderizam contadores corretos
- Click em tab troca a listagem
- Filtro "pdf" esconde imagens
- Item click abre preview, reclick fecha
- Só 1 item aberto por vez (accordion)
- DropZone visível na tab ativa, escondida quando Drive não conectado

`__tests__/components/documentos-item.test.tsx`:
- Ícone correto por mimeType
- Click no botão externo abre `webViewLink` em nova aba
- Menu ⋯ mostra renomear/deletar

`__tests__/components/drop-zone.test.tsx`:
- Aceita file via click (`<input type="file">`)
- Aceita drop event
- Rejeita arquivo > 50 MB com toast
- Progress bar aparece durante upload

`__tests__/components/audio-player-inline.test.tsx`:
- Renderiza `<audio>` com src correto
- `autoPlay` prop dispara play() no mount
- Mostra título e duração

`__tests__/components/midia-block.test.tsx`:
- Lista unificada ordenada por data desc
- Atendimento com `transcricaoResumo` mostra collapse de transcrição
- Vídeo abre `VideoModal` no click

### Regressão
- Sheet renderiza bloco "Documentos" antigo (só links) ZERO vezes depois da refactor.

### Manual (Task 18)
- Abrir sheet com audiência que tem processo + assistido → ambas tabs populam
- Arrastar PDF para DropZone → toast "Upload concluído" → arquivo aparece na lista
- Click no arquivo → preview iframe carrega em &lt;2s
- Click em áudio → player toca sem sair do sheet
- Click em "▶ Áudio" em depoente com nome matching → rola e toca

## Padrão Defender v5

- Tabs: mesmo estilo das abas do modal Registro (border-bottom ativo, tipografia tight)
- Chips de filtro: rounded-full, mesma família dos chips do ToC
- Iframe: border subtle, rounded-lg, shadow-inner
- Drop zone: borda dashed `border-neutral-300`, hover emerald-500, drag-over emerald + fundo emerald-50/30
- Progress bar: emerald-500, altura 2px
- Player áudio: background white, border neutral, botão play emerald circular

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| iframe do Drive bloqueado por X-Frame-Options | Testar com conta autenticada; fallback: botão "abrir no Drive" |
| `uploadWithLink` performance com arquivos grandes | Cap de 50 MB + spinner; arquivos maiores caem no Drive Web |
| Audio src com URL de download pode exigir OAuth | Validar com áudio real da conta; se falhar, fetchar blob via tRPC proxy e usar object URL |
| Heurística nome→depoente falhar (homônimos, nome parcial) | Aceitar; botão áudio fica inativo, usuário acessa via bloco Mídia. Fase 4 resolve com coluna explícita |
| Accordion Docs + accordion Depoentes compete por state | Scope state local de cada bloco; não compartilhar |

## Critérios de aceitação

1. Tabs Autos/Assistido renderizam com contador correto.
2. Click em arquivo expande preview iframe sem sair do sheet.
3. Só 1 arquivo aberto por vez (accordion).
4. Filtros PDF/Imagem/Outros funcionam.
5. Upload por drag OR click funciona; arquivo aparece imediatamente após sucesso.
6. Upload > 50 MB rejeitado com toast.
7. Bloco Mídia lista áudios + vídeos unificados.
8. Player áudio HTML5 controla play/pause/seek sem context switch.
9. Vídeo abre em modal 80% tela.
10. Transcrição do atendimento aparece colapsada abaixo do player quando existe.
11. Botão "▶ Áudio" do DepoenteCardV2 ativa quando heurística encontra match.
12. Empty states: "Drive não conectado" e "Pasta vazia" com CTAs claros.
13. Seção antiga "Documentos" (2 links externos) não aparece mais.
14. Zero mutations novas no backend — só consumo de tRPC existente.
15. Tests unitários verdes para todos os novos componentes.
