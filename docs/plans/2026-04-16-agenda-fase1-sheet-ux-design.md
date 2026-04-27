# Agenda · Fase 1 · Sheet UX redesign

**Data:** 2026-04-16
**Status:** Design aprovado — aguardando implementação
**Escopo:** `src/components/agenda/event-detail-sheet.tsx` e componentes relacionados
**Fases seguintes (spec separado):** Fase 2 Documentos & Mídia · Fase 3 Histórico redesign · Fase 4 Povoamento

---

## Contexto

O sheet lateral da agenda (`event-detail-sheet.tsx`, 774 linhas) concentra a leitura do caso no dia da audiência. Problemas atuais:

- **Bug crítico:** bloco "Depoentes" renderiza duas vezes (linhas 421-523 em lista simples, 617-638 via `DepoenteCard`). Fonte de confusão visual.
- Onze `SectionCard` sempre abertos, sem navegação — scroll longo, sem como saltar para Depoentes ou Teses.
- Único CTA: "Abrir Registro Completo". Ações frequentes da audiência (concluir, redesignar, decreto de revelia) exigem abrir o modal, entrar na aba Resultado, rolar e salvar — 3-4 cliques para algo feito várias vezes ao dia.
- Ações de depoente (marcar ouvido, redesignar só um, adicionar pergunta) não existem no sheet.
- Bloco "Documentos" = 2 links externos. Sem preview.
- Anotação rápida mostra toast "em breve persistida" — não salva.

## Objetivo

Transformar o sheet em ferramenta de trabalho durante a audiência: navegação rápida entre blocos, ações frequentes a um clique, e card de depoente único, rico e acionável.

## Decisões de design (brainstorming validado)

| Pergunta | Escolha | Racional |
|---|---|---|
| Padrão de navegação | **Híbrido:** ToC sticky de chips + colapso | Navegação rápida (chips) sem esconder conteúdo; defensor pode abrir/fechar o que não interessa |
| Ações | **Visíveis no footer + chips inline no card** | Defensor não tem tempo de caçar menu; Concluir/Redesignar são as ações mais frequentes |
| Card de depoente | **Rico expansível, accordion de 1 por vez** | Durante audiência, 1 depoente ativo por vez; outros colapsam |

## Arquitetura

### Novos componentes (`src/components/agenda/sheet/`)

```
sheet/
├── event-detail-sheet.tsx          (refactor: 774 → ~350 linhas)
├── sheet-toc.tsx                   (novo)
├── collapsible-section.tsx         (novo, substitui SectionCard interno)
├── sheet-action-footer.tsx         (novo)
└── depoente-card-v2.tsx            (substitui shared/depoente-card.tsx)
```

### `SheetToC`

Barra horizontal sticky no topo do scroll do sheet.

```tsx
interface SheetToCProps {
  sections: Array<{ id: string; label: string; count?: number }>;
  activeId?: string;           // destacado pelo scroll-spy
  onJump: (id: string) => void;
}
```

- Deriva as seções do conteúdo real (seção vazia não vira chip).
- Scroll-spy via `IntersectionObserver` marca chip ativo.
- Sempre visível — `position: sticky; top: 0` dentro do scroll container do sheet.
- Padrão Defender v5: background `bg-neutral-100/95` com `backdrop-blur-md`, chips `rounded-full`, ativo com `bg-foreground text-background`.

### `CollapsibleSection`

Substitui o `SectionCard` interno atual. Radix `Collapsible`.

```tsx
interface CollapsibleSectionProps {
  id: string;                    // usado pelo ToC para scroll-target
  label: string;
  count?: number;                // exibido no header quando presente
  defaultOpen?: boolean;
  children: React.ReactNode;
}
```

- Header com chevron animado 150ms.
- `defaultOpen` por seção:
  - **Abertas:** Imputação, Fatos (Denúncia), Depoentes.
  - **Fechadas:** Versão do Acusado, Contradições, Laudos e Perícias, Investigação Defensiva, Pendências, Teses, Documentos.
- Persistir o estado de colapso por usuário (localStorage key `agenda-sheet-sections-open`) — abrir da mesma forma na próxima audiência.

### `SheetActionFooter`

Substitui o footer atual (que tinha apenas "Abrir Registro Completo").

Layout:
```
┌───────────────────────────────────────────────┐
│ [input] Anotação rápida…              [Send]  │
├───────────────────────────────────────────────┤
│ [ ✓ Concluir ]  [ ↷ Redesignar ]    [ ⋯ ]    │
└───────────────────────────────────────────────┘
```

- **Concluir** (primary emerald): abre mini-modal com campo `resultado` (select: sentenciado, instrução encerrada, outra) e confirma. Chama `marcarConcluida`.
- **Redesignar** (outline): abre mini-modal com date/time pickers + motivo. Chama `redesignarAudiencia`.
- **⋯ menu:** Decretar revelia · Suspender · Abrir registro completo (texto, sem destaque) · Compartilhar evento.
- Link "Abrir registro completo" migra do CTA verde atual para o menu ⋯ (uso é menos frequente do que Concluir/Redesignar agora que as ações estão no footer).
- Estado disable quando `statusAudiencia === "concluida"` (tudo cinza exceto "ver registro").

### `DepoenteCardV2`

Substitui `shared/depoente-card.tsx`. **Deleta** o segundo bloco duplicado (linhas 617-638 do sheet atual). Único componente de depoente usado tanto no sheet quanto no modal.

```tsx
interface DepoenteCardV2Props {
  depoente: Depoente;
  isOpen: boolean;
  onToggle: () => void;
  variant: "sheet" | "modal";
  onMarcarOuvido: (id: number, sintese?: string) => void;
  onRedesignar: (id: number) => void;
  onAdicionarPergunta: (id: number) => void;
  onAbrirAudio?: (id: number) => void;    // conecta com Fase 2
}
```

- **Fechado (1 linha):** border-left colorida por lado (rose = acusação, emerald = defesa, neutral = comum), nome, qualidade em pequeno, badge de status (Ouvido/Pendente/Redesignado).
- **Aberto:**
  - Header completo: nome, qualidade (vítima/testemunha/informante), lado (ACUS/DEF/COMUM), CPF mascarado se houver.
  - Bloco "🏛 Delegacia": síntese de `versao_delegacia` (ou "vazio" em itálico).
  - Bloco "⚖ Em Juízo": síntese de `versao_juizo` (ou "vazio").
  - Bloco "🎯 Perguntas preparadas" (contador) se houver perguntas associadas.
  - Ações inline: **+ Pergunta** · **↷ Redesignar** · **▶ Áudio** (se existir vinculado) · **⋯** (menu: excluir, mover para outra fase).
  - Chip de status no topo direito: "✓ Ouvido" (emerald), "Pendente" (neutral), "Redesignado" (amber).
- **Accordion de 1 por vez.** Abrir um fecha o outro. Primeiro depoente com status "Pendente" abre por default; fallback: primeiro da lista.

## Fluxo de dados

### Mutations tRPC novas (`src/server/routers/audiencias.ts`)

```ts
// 1. Concluir audiência
marcarConcluida: protectedProcedure
  .input(z.object({
    audienciaId: z.number(),
    resultado: z.enum(["sentenciado", "instrucao_encerrada", "outra"]),
    observacao: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Update audiencias.statusAudiencia = "concluida"
    // 2. Insert registro_historico com tipo "conclusao"
    // 3. Log activity
  }),

// 2. Redesignar audiência
redesignarAudiencia: protectedProcedure
  .input(z.object({
    audienciaId: z.number(),
    novaData: z.string(),        // ISO date
    novoHorario: z.string(),     // HH:mm
    motivo: z.string().optional(),
  }))
  .mutation(/* cria registro histórico + atualiza próxima data */),

// 3. Marcar depoente ouvido
marcarDepoenteOuvido: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    sinteseJuizo: z.string().optional(),
  }))
  .mutation(/* flag testemunha.ouvido=true + timestamp + sintese opcional */),

// 4. Redesignar depoente
redesignarDepoente: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    novaData: z.string().optional(),
    motivo: z.string().optional(),
  }))
  .mutation(/* marca depoente como redesignado e vincula a próxima audiência se novaData informada */),

// 5. Anotação rápida (bug fix)
addQuickNote: protectedProcedure
  .input(z.object({
    audienciaId: z.number(),
    texto: z.string().min(1),
  }))
  .mutation(/* insere em audiencias.anotacoes_rapidas (JSONB array) com timestamp */),
```

### Schema DB

- `audiencias`: já tem `statusAudiencia`. Adicionar coluna JSONB `anotacoes_rapidas` (default `[]`).
- `testemunhas`: adicionar `ouvidoEm timestamptz`, `redesignadoPara timestamptz`. Schema Drizzle em `src/db/schema.ts`. Migration via `npm run db:generate`.
- Reaproveita `registro_historico` existente para conclusão/redesignação.

### React Query / tRPC

- Todas as mutations invalidam `audiencias.getAudienciaContext` para o `audienciaId`.
- Optimistic update no `marcarDepoenteOuvido` (toggle do badge).

## Bug: duplicação de Depoentes

Fonte: `event-detail-sheet.tsx` tem dois blocos:
- **Bloco 1** (linhas 421-523): lista manual com `<button>` e `setExpandedDepoente` state local. Renderiza `d.versao_delegacia`, `d.versao_juizo`, etc. direto.
- **Bloco 2** (linhas 617-638): usa `DepoenteCard` do `shared/` com `variant="compact"`.

**Correção:** deletar bloco 1. Migrar toda a lógica (accordion, ações inline) para `DepoenteCardV2`, que é fonte única de verdade.

## Padrão Defender v5

- Chips do ToC: `rounded-full px-2.5 py-1 text-[11px]`, ativo `bg-foreground text-background`, inativo `bg-white border`.
- CollapsibleSection: mesmo estilo do `SectionCard` atual (shadow-sm, border neutral, rounded-xl) + chevron animado.
- Ações footer: emerald primary (`bg-emerald-500 hover:bg-emerald-600`), outline secondary.
- Animations: `transition-all duration-150`.
- `cursor-pointer` em todos os alvos clicáveis.
- `prefers-reduced-motion`: desabilita collapse animation.

## Testes

### Unit (Vitest) — `__tests__/unit/audiencias-mutations.test.ts`
- `marcarConcluida` cria registro_historico e atualiza status.
- `redesignarAudiencia` cria histórico e registra nova data.
- `marcarDepoenteOuvido` seta flag + timestamp.
- `redesignarDepoente` vincula a próxima audiência se informada.
- `addQuickNote` append em JSONB.

### Component (Vitest + Testing Library)
- `SheetToC` renderiza apenas seções não-vazias.
- `SheetToC` scroll-spy destaca chip correto.
- `CollapsibleSection` persiste estado em localStorage.
- `DepoenteCardV2` accordion: abrir um fecha outro.
- `DepoenteCardV2` variant sheet vs modal.

### Smoke (Playwright) — `e2e/agenda-sheet.spec.ts`
- Abrir evento com dados completos → todas as seções carregam.
- Clicar chip no ToC → scroll leva à seção.
- Clicar "Concluir" no footer → mini-modal → confirma → sheet atualiza.
- Depoente aberto → clicar "Marcar ouvido" → badge muda.
- Regressão: bloco Depoentes aparece uma única vez.

## Não-escopo (Fases seguintes)

- Preview/upload de documentos inline → **Fase 2**.
- Player de áudio/vídeo → **Fase 2**.
- Redesenho da aba Histórico do modal → **Fase 3**.
- Pipeline de povoamento e empty states com CTA de análise → **Fase 4**.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Refactor grande do sheet quebra integrações | Tests de snapshot no sheet + PR em branch feat isolada |
| Mini-modais de Concluir/Redesignar duplicam lógica da aba Resultado | Extrair hook `useAudienciaStatusActions` compartilhado entre sheet e modal |
| Scroll-spy do ToC com performance ruim em sheets longos | `IntersectionObserver` com `rootMargin` tunado; evita listener de scroll |
| DepoenteCardV2 único quebra aba Depoentes do modal | Prop `variant` + spec test dos dois casos antes de migrar |

## Critérios de aceitação

1. Bloco Depoentes renderiza uma única vez.
2. ToC aparece ao abrir o sheet, some se o sheet está vazio, destaca seção ativa no scroll.
3. Footer mostra Concluir + Redesignar visíveis + ⋯ com Revelia/Suspender/Registro completo/Compartilhar.
4. Clicar Concluir abre mini-modal, salva, fecha sheet e atualiza agenda.
5. Clicar Redesignar abre mini-modal com date/time, salva, e cria registro histórico.
6. DepoenteCardV2: 1 aberto por vez, pendente abre por default, ações inline funcionam.
7. Anotação rápida persiste (sem mais `em breve`).
8. Estado de colapso das seções persiste entre aberturas.
9. Tests unitários e componente verdes.
10. Sheet atual (774 linhas) reduz para ~350 linhas, com lógica extraída para os novos componentes.
