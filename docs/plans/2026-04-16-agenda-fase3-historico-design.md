# Agenda · Fase 3 · Histórico redesign

**Data:** 2026-04-16
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** Redesenhar a aba "Histórico" do modal de Registro de Audiência. Separar "Em edição" de "Anteriores" via sub-tabs, introduzir preview WYSIWYG e timeline compacta com accordion inline.
**Fases anteriores:** Fase 1 Sheet UX (`docs/plans/2026-04-16-agenda-fase1-sheet-ux-plan.md`), Fase 2 Documentos & Mídia (`docs/plans/2026-04-16-agenda-fase2-docs-midia-plan.md`).
**Fase seguinte (spec separado):** Fase 4 Povoamento.

---

## Contexto

A aba Histórico atual (`src/components/agenda/registro-audiencia/tabs/tab-historico.tsx`, 296 linhas) mistura:
- **"Registro Atual"** — um card emerald mostrando o snapshot do que está sendo editado agora nas outras abas (Depoentes, Anotações, Resultado).
- **Timeline de anteriores** — cards densos (InfoBlocks + DepoenteCard completo) para cada registro salvo.

Problema: redundância e densidade. O "atual" duplica o que já está visível nas outras abas. Os cards de anteriores rolam demais por usar display completo sempre aberto.

A dor primária validada no brainstorm: **não dá pra distinguir rapidamente o que estou editando vs o que já salvei** (opção A na pergunta de escopo).

## Objetivo

Dar à aba Histórico um propósito único e visual claro: mostrar a linha do tempo da audiência. O que está sendo editado ganha seu próprio espaço explícito ("Em edição") com preview WYSIWYG + badge de completude. O que já foi salvo vira timeline compacta escaneável.

## Decisões de design (brainstorming validado)

| Pergunta | Escolha | Racional |
|---|---|---|
| Separação atual vs salvos | **B — Sub-abas "Em edição" / "Anteriores"** | Valor do preview WYSIWYG de "o que vai ser salvo" |
| Conteúdo de "Em edição" | **B — Preview WYSIWYG** | Ver como vai aparecer na timeline depois do save |
| Densidade timeline | **A — Compacto** | Escanear rápido; detalhe sob demanda |
| Modo de expandir detalhe | **A — Accordion inline (1 por vez)** | Consistência com DepoenteCardV2 e DocumentosItem |

## Arquitetura

### Novos componentes (`src/components/agenda/registro-audiencia/historico/`)

```
historico/
├── historico-sub-tabs.tsx     [new]
├── registro-preview-card.tsx  [new]
├── timeline-card.tsx          [new]
├── completude-badge.tsx       [new]
└── status-tone.ts             [new helper]
```

### Modificação

```
tabs/tab-historico.tsx         [modify: 296 → ~140 linhas]
```

---

### `HistoricoSubTabs`

```tsx
interface Props {
  active: "edicao" | "anteriores";
  anterioresCount: number;
  completudeCount: number;      // quantos dos 5 itens-chave estão preenchidos
  onChange: (tab: "edicao" | "anteriores") => void;
}
```

- Border-bottom ativo, mesma tipografia das tabs externas do modal.
- Tab "Em edição" mostra `<CompletudeBadge count={completudeCount} total={5} />` no canto.
- Tab "Anteriores" mostra contador `(N)`.
- Default ativo: "edicao" se `registrosAnteriores.length === 0`; caso contrário "anteriores" (usuário em audiência consulta o histórico mais do que revê o que vai salvar).

### `CompletudeBadge`

```tsx
interface Props {
  count: number;
  total: number;
}
```

- Se `count === total`: badge verde "✓ Completo".
- Caso contrário: badge neutra "count/total preenchidos".
- Pequeno, 9px, rounded-full.

### `RegistroPreviewCard`

**Componente unificado** usado tanto em "Em edição" (preview do form atual) quanto expandido na timeline de "Anteriores".

```tsx
interface Props {
  registro: RegistroAudienciaData;   // tipo já existente em registro-audiencia/types.ts
  statusAudiencia?: string;           // ex: "concluida", "redesignada"
  variant: "preview" | "saved";
  meta?: { dataRealizacao?: Date; horarioInicio?: string; local?: string };
}
```

Renderiza (quando campo tem valor — senão oculta):
- **Header**: data + horário + status badge (via `statusTone`). Variant "preview" adiciona label emerald "EM EDIÇÃO".
- **Resultado**: chip via `InfoBlock` ("instrução encerrada", "sentenciado", etc).
- **Presença do assistido**: badge verde/vermelho (compareceu / ausente / revelia).
- **Redesignação** (se aplicável): nova data, horário, motivo.
- **Depoentes**: lista usando `DepoenteCard` do `shared/` (rich display com sínteses, perguntas sugeridas, pontos fav/desfav). **Mantém o split atual** — sheet usa V2, modal usa shared/DepoenteCard.
- **Manifestações e decisões**: MP, Defesa, Decisão (InfoBlocks existentes).
- **Encaminhamentos**: texto simples.
- **Anotações gerais**: `whitespace-pre-wrap`.

Variant "preview": wrapper com background emerald-50, border emerald-300. Variant "saved": wrapper branco padrão.

### `TimelineCard`

```tsx
interface Props {
  registro: RegistroHistoricoSalvo;   // shape dos itens de form.registrosAnteriores
  isOpen: boolean;
  onToggle: () => void;
}
```

- **Fechado (1-2 linhas)**:
  - Header: data (dd/MM/yyyy), horário, status badge.
  - Linha secundária: 1 highlight chave derivado do status:
    - `concluida` → "Resultado: X · N ouvidos"
    - `redesignada` → "Motivo: X · nova data: Y"
    - `suspensa` → "Motivo: X"
    - revelia → "Decreto de revelia · X"
  - Border-left de 3px colorida pelo `statusTone`.
- **Aberto**: renderiza `<RegistroPreviewCard registro={registro} variant="saved" meta={...} />` dentro.
- Accordion: click toggle. Pai controla qual está aberto (só 1 por vez).

### `status-tone.ts` (helper)

```ts
export type StatusTone = "emerald" | "rose" | "amber" | "neutral" | "slate";

export function statusTone(registro: { status?: string; resultado?: string; realizada?: boolean }): {
  tone: StatusTone;
  label: string;         // "Concluída", "Redesignada", etc
  shortLabel: string;    // "✓", "RED", "SUS", etc — usado em badges compactos
};
```

Mapeamento:

| Entrada | Label | Short | Tone |
|---|---|---|---|
| `realizada === true`, `resultado === "sentenciado"` | "Sentenciada" | ✓ | emerald |
| `realizada === true` | "Concluída" | ✓ | emerald |
| `resultado === "redesignada"` ou `status === "redesignada"` | "Redesignada" | RED | rose |
| `resultado === "suspensa"` | "Suspensa" | SUS | amber |
| decreto revelia campo truthy | "Decreto Revelia" | REV | neutral |
| desistência | "Desistência" | DES | slate |
| default (pendente) | "Pendente" | — | neutral |

Classes Tailwind por tone:
```ts
const BG = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", neutral: "bg-neutral-100 text-neutral-600", slate: "bg-slate-100 text-slate-600" };
const BORDER = { emerald: "border-l-emerald-400", rose: "border-l-rose-400", amber: "border-l-amber-400", neutral: "border-l-neutral-300", slate: "border-l-slate-400" };
```

### `tab-historico.tsx` refatorado

Shape geral:

```tsx
export function TabHistorico({ registrosAnteriores, registroAtual, statusAtual }: Props) {
  const [subTab, setSubTab] = useState<"edicao" | "anteriores">(
    registrosAnteriores.length === 0 ? "edicao" : "anteriores"
  );
  const [openAnteriorIdx, setOpenAnteriorIdx] = useState<number | null>(
    registrosAnteriores.length > 0 ? 0 : null  // abre o mais recente por default
  );

  const completudeCount = countCompletude(registroAtual, statusAtual);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <HistoricoSubTabs
        active={subTab}
        onChange={setSubTab}
        anterioresCount={registrosAnteriores.length}
        completudeCount={completudeCount}
      />

      {subTab === "edicao" ? (
        <RegistroPreviewCard
          registro={registroAtual}
          statusAudiencia={statusAtual}
          variant="preview"
        />
      ) : (
        <Timeline registros={registrosAnteriores} openIdx={openAnteriorIdx} onToggleIdx={setOpenAnteriorIdx} />
      )}
    </div>
  );
}
```

`countCompletude`: conta entre `[statusAudiencia, resultado, presenca, anotacoes, depoentes.length > 0]` quantos são truthy. Já existe como `completudeItems` no `registro-modal.tsx` — extrair para função pura e reusar.

## Fluxo de dados

Tudo vem do `useRegistroForm` hook existente (`src/components/agenda/registro-audiencia/hooks/use-registro-form.ts`):
- `form.registro` — snapshot atual do que o usuário está editando.
- `form.registrosAnteriores` — array de registros salvos (do banco).
- `form.statusAudiencia`, `form.registroSalvo`, etc.

**Zero mutations novas.** Zero queries novas. Apenas reorganização visual dos dados já carregados.

## Testes

### Unit (RTL + happy-dom)

`__tests__/components/historico-sub-tabs.test.tsx`:
- Renderiza 2 tabs com labels
- Badge de completude mostra "4/5 preenchidos"
- Badge verde quando completudeCount === total
- Contador de anteriores aparece na segunda tab
- Click dispara `onChange` com novo valor

`__tests__/components/registro-preview-card.test.tsx`:
- Variant "preview" renderiza com wrapper emerald
- Variant "saved" renderiza com wrapper branco
- Campos vazios não renderizam seu InfoBlock
- Depoentes lista usa `DepoenteCard` shared (valida by data-testid ou conteúdo)
- Status badge usa tone correto

`__tests__/components/timeline-card.test.tsx`:
- Fechado: 1 linha com data + status + highlight chave
- Aberto: expande `RegistroPreviewCard`
- `onToggle` dispara no click
- Border-left colorida pelo tone

`__tests__/unit/status-tone.test.ts`:
- Mapeia 7 combinações conforme tabela
- Default para input vazio

### Regressão

- `tab-historico.test.tsx`: renderiza sub-tabs; "Registro Atual" antigo (card emerald duplicando as outras abas) não aparece mais fora de "Em edição".

### Manual (Task 18-equivalente na Fase 3)

- Abrir modal de Registro → aba Histórico. Se já tem anteriores, default "Anteriores".
- Sub-tab "Em edição" mostra preview WYSIWYG do form atual. Badge 4/5 atualiza conforme preenche.
- Sub-tab "Anteriores" lista cards compactos. Click expande inline. Só 1 aberto.
- Status colors batem com as ações (concluída emerald, redesignada rose, suspensa amber).

## Padrão Defender v5

- Sub-tabs: `border-b-2 border-foreground` ativo, `text-[11px] font-semibold`, padding 3px×8px. Mesmo estilo das tabs do DocumentosBlock (Fase 2).
- CompletudeBadge: `rounded-full px-1.5 py-0.5 text-[9px]`. Emerald quando full, neutral senão.
- TimelineCard: border-left 3px pelo tone, `bg-neutral-50/50` fechado, `bg-white` aberto. Animation 150ms.
- Transições 150ms, `motion-reduce:transition-none`, `cursor-pointer` nos triggers.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `registroAtual` no preview desatualizar enquanto usuário edita outras abas | `useRegistroForm` é hook compartilhado; mudanças re-renderizam automaticamente |
| `DepoenteCard` shared divergir do que V2 precisa mostrar | Mantém split — nenhum dos dois é alterado pela Fase 3 |
| `registrosAnteriores` com shape divergente entre itens (dados antigos) | `RegistroPreviewCard` checa cada campo com optional chaining e oculta se undefined |
| `countCompletude` contar 5 quando na verdade "resultado" é vazio | Função pura com teste unitário cobrindo variantes |
| Timeline longa em audiências com muitas redesignações | Accordion compacto resolve; scroll em casos extremos |

## Critérios de aceitação

1. Aba Histórico tem 2 sub-tabs: "Em edição" e "Anteriores (N)".
2. Sub-tab "Em edição" mostra `RegistroPreviewCard` com wrapper emerald + badge de completude X/5.
3. Sub-tab "Anteriores" mostra timeline de cards compactos, um por registro salvo.
4. Click em card compacto expande `RegistroPreviewCard` inline.
5. Só 1 card da timeline aberto por vez.
6. Border-left do card compacto é colorida pelo status (emerald/rose/amber/neutral/slate).
7. Sub-tab default é "Anteriores" se houver registros anteriores; "Em edição" caso contrário.
8. Card mais recente na timeline abre por default.
9. "Registro Atual" antigo (duplicação emerald dentro da timeline) NÃO aparece mais.
10. Pre-save completude badge atualiza conforme campos são preenchidos nas outras abas.
11. Status badges usam mesmo mapeamento (helper `statusTone` pure function).
12. `tab-historico.tsx` reduz de 296 para ~140 linhas; lógica extraída para componentes novos.
13. Zero mutations/queries novas.
14. Tests unitários e de regressão verdes.

## Não-escopo (Fase 4 ou futura)

- Unificação de DepoenteCard (sheet V2 vs modal shared) — fica para quando houver dor real em ambos os contextos.
- Editar registros anteriores — read-only por agora.
- Jump-to-tab do checklist de completude (click em "Manifestações vazias" pular pra aba Resultado).
- Empty states com CTA "rodar análise IA" — Fase 4.
- Povoamento via Claude Code/Cowork — Fase 4.
