# Voice Memos Integration — Design

**Data**: 2026-03-06
**Status**: Aprovado (brainstorming concluido)

## Resumo

Adicionar Voice Memos (Notas de Voz macOS) como terceira opcao de gravacao, ao lado do Whisper (mic browser) e Plaud (hardware).

## Pontos de Integracao

| Local | Contexto pre-preenchido |
|-------|------------------------|
| Registro Rapido | `assistidoId` + `processoId` do formulario |
| DemandaQuickPreview (sheet) | `assistidoId` + `processoId` da demanda |
| Pagina do Assistido (futuro) | `assistidoId` fixo |
| Pagina do Processo (futuro) | `assistidoId` + `processoId` fixos |

## Fluxo

1. Clica no botao Voice Memos → abre app via `voicememos://` deep link
2. Grava no Voice Memos nativo do macOS
3. Volta ao OMBUDS → importa arquivo .m4a via file picker
4. Upload para `/api/voice-memos/transcribe`
5. Servidor transcreve via Google Speech-to-Text (mesmo endpoint existente)
6. Retorna transcricao ao componente
7. Componente insere texto no campo de descricao/providencias
8. Opcionalmente: salva audio no Drive vinculado ao assistido

## Componentes

### `VoiceMemosButton`
- Props: `onTranscriptReady`, `compact`, `assistidoId?`, `processoId?`
- Botao com icone Smartphone/Volume2
- Click: abre Voice Memos via deep link + mostra toast com instrucoes
- File picker para importar .m4a
- Upload + transcricao automatica
- Callback com texto transcrito

### API Route `/api/voice-memos/transcribe`
- Recebe FormData com arquivo .m4a
- Envia para `/api/ai/transcribe` (Google Speech-to-Text existente)
- Retorna `{ transcript, confidence }`

## Decisoes Tecnicas

- **Transcricao**: Google Speech-to-Text (ja integrado, suporta .m4a)
- **Deep link**: `voicememos://` para abrir app nativo
- **Futuro**: Extrair transcricao nativa Apple (tsrp atom) para custo zero
- **Armazenamento**: Opcional upload ao Drive na pasta do assistido
