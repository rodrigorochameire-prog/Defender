# Depoentes UX Overhaul + Transcrição de Áudio

**Data**: 2026-03-08
**Status**: Aprovado

## 1. Transcrição nos Depoentes

Cada campo de texto do depoente (Depoimento, Estratégia, Análise) ganha botões de mic/upload no header da seção:
- `AudioRecorderButton` compact — grava via browser mic → Google Speech v2 → append no textarea
- `VoiceMemosButton` compact — iOS Shortcuts / importar .m4a → transcrição → append

Componentes já existentes: `src/components/shared/audio-recorder.tsx`, `voice-memos-button.tsx`
Rota: `/api/ai/transcribe` (Google Speech-to-Text v2)

## 2. Depoentes UX Simplificado

### De 4 seções → 1 principal + 2 secundárias
- **Campo principal**: "Depoimento" — sempre visível, textarea grande (12 rows), com mic/upload
- **Secundários colapsados**: "Estratégia" e "Análise" — 1 linha header, expandem sob demanda
- **Removido**: "Perguntas da Defesa" fundido com "Estratégia de Inquirição"

### Mobile: Accordion em vez de dual-panel
- Lista de depoentes como cards compactos
- Clicar expande inline o form do depoente (accordion)
- Sem painel lateral separado

### Header simplificado
- Toggle pills inline: `[Intimado ↔ Não] [Presente ↔ Ausente]`
- Detalhes tipo-específicos em toggle discreto (colapsado por padrão)

## 3. Tab Mídia: Upload de Áudio

Seção no topo da tab Mídia com:
- Botão gravar (AudioRecorderButton)
- Botão iOS/Upload (VoiceMemosButton)
- Preview do texto transcrito com botão copiar
- Mantém seções existentes (Drive files + Plaud recordings) abaixo

## Arquivos Impactados

- `src/components/agenda/registro-audiencia/tabs/tab-depoente-form.tsx` — simplificação + mic buttons
- `src/components/agenda/registro-audiencia/tabs/tab-depoentes.tsx` — mobile accordion
- `src/components/agenda/registro-audiencia/tabs/tab-midia.tsx` — seção upload áudio
