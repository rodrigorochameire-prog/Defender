# Surface de Revisão para a Estagiária (sub-projeto 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na página `/admin/delegacoes` (view da estagiária), destacar as considerações da revisão (`delegacoes_historico.observacoes`) com um badge "Revisão disponível" no card e um botão "Copiar para WhatsApp" no detalhe.

**Architecture:** Sem backend novo (`minhasDelegacoes` já retorna `observacoes`). Um helper puro `montarMensagemRevisao` (testado por unidade), um componente pequeno `CopiarRevisaoButton` (reusa `copyToClipboard`), e duas inserções na página de delegações (bloco no detalhe + badge no card).

**Tech Stack:** Next.js + React + tRPC + vitest. Reuso: `src/lib/clipboard.ts`, padrão de `src/components/demandas/delegacao-message.ts`.

**Spec:** `docs/superpowers/specs/2026-06-17-revisao-surface-estagiaria-design.md`

---

### Task 1: Helper `montarMensagemRevisao`

**Files:**
- Create: `src/components/demandas/revisao-message.ts`
- Test: `src/components/demandas/__tests__/revisao-message.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { montarMensagemRevisao } from "../revisao-message";

describe("montarMensagemRevisao", () => {
  it("monta saudação pelo horário + primeiro nome + corpo", () => {
    const msg = montarMensagemRevisao("Emilly Teste", "Ficou bom. Ajustei X.", 9);
    expect(msg).toContain("Bom dia, Emilly!");
    expect(msg).toContain("Ficou bom. Ajustei X.");
  });
  it("usa Boa tarde/Boa noite conforme a hora", () => {
    expect(montarMensagemRevisao("Ana", "ok", 15)).toContain("Boa tarde, Ana!");
    expect(montarMensagemRevisao("Ana", "ok", 20)).toContain("Boa noite, Ana!");
  });
  it("não quebra com nome vazio", () => {
    expect(montarMensagemRevisao("", "ok", 9)).toContain("Bom dia");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/demandas/__tests__/revisao-message.test.ts`
Expected: FAIL (Cannot find module '../revisao-message').

- [ ] **Step 3: Write minimal implementation**

```typescript
/** Monta a mensagem de WhatsApp com a orientação da revisão para a estagiária. */
export function montarMensagemRevisao(
  destinatarioNome: string,
  consideracoes: string,
  horaDoDia: number,
): string {
  const saudacao = horaDoDia < 12 ? "Bom dia" : horaDoDia < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = (destinatarioNome || "").split(" ")[0] || "";
  const abertura = primeiroNome ? `${saudacao}, ${primeiroNome}!` : `${saudacao}!`;
  return `${abertura}\n\n${consideracoes.trim()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/demandas/__tests__/revisao-message.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas/revisao-message.ts src/components/demandas/__tests__/revisao-message.test.ts
git commit -m "feat(revisao-surface): helper montarMensagemRevisao + testes"
```

---

### Task 2: Componente `CopiarRevisaoButton`

**Files:**
- Create: `src/components/demandas/copiar-revisao-button.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { montarMensagemRevisao } from "./revisao-message";

export function CopiarRevisaoButton({
  consideracoes,
  destinatarioNome,
}: {
  consideracoes: string;
  destinatarioNome: string;
}) {
  async function handleCopiar() {
    const hora = new Date().getHours();
    const msg = montarMensagemRevisao(destinatarioNome, consideracoes, hora);
    await copyToClipboard(msg, "Orientação copiada para o WhatsApp");
  }
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopiar}>
      <Send className="h-3.5 w-3.5" />
      Copiar para WhatsApp
    </Button>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep copiar-revisao-button || echo "OK"`
Expected: `OK` (sem erros nesse arquivo).

- [ ] **Step 3: Commit**

```bash
git add src/components/demandas/copiar-revisao-button.tsx
git commit -m "feat(revisao-surface): CopiarRevisaoButton"
```

---

### Task 3: Bloco no detalhe + badge no card (página de delegações)

**Files:**
- Modify: `src/app/(dashboard)/admin/delegacoes/page.tsx`

Contexto: o detalhe da delegação já renderiza `delegacaoDetalhes.observacoes` (~linhas 863-869). O card é o componente `DelegacaoCard` (renderiza `statusConfig` Badge ~linha 183 e `delegacao.instrucoes` ~linha 242).

- [ ] **Step 1: Importar os novos artefatos no topo do arquivo**

Adicionar aos imports existentes:

```tsx
import { CopiarRevisaoButton } from "@/components/demandas/copiar-revisao-button";
```

- [ ] **Step 2: Substituir o bloco de exibição de `observacoes` no detalhe**

Localizar o bloco existente (a condicional `delegacaoDetalhes.observacoes &&` por volta da linha 863) e substituí-lo por um bloco rotulado com o botão. O `destinatarioNome` vem do usuário logado (a estagiária) — usar o nome disponível no escopo do detalhe (ex.: `delegacaoDetalhes.delegadoPara?.name` ou o nome do usuário da sessão já usado na página; se o detalhe não tiver, usar `""`, o helper tolera):

```tsx
{delegacaoDetalhes.observacoes && (
  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-emerald-900">
        O que o Defensor validou e ajustou
      </span>
      <CopiarRevisaoButton
        consideracoes={delegacaoDetalhes.observacoes}
        destinatarioNome={delegacaoDetalhes.delegadoPara?.name ?? ""}
      />
    </div>
    <p className="whitespace-pre-wrap text-sm text-neutral-700">
      {delegacaoDetalhes.observacoes}
    </p>
  </div>
)}
```

(Se `delegacaoDetalhes.delegadoPara` não existir no objeto carregado, usar `destinatarioNome=""`; o helper produz "Bom dia!" sem nome.)

- [ ] **Step 3: Adicionar badge "Revisão disponível" no card**

No `DelegacaoCard`, logo após o Badge de status (por volta da linha 183-186), adicionar, condicional a `observacoes` não-vazio:

```tsx
{delegacao.observacoes && delegacao.observacoes.trim().length > 0 && (
  <Badge className="gap-1 bg-emerald-100 text-[10px] font-medium text-emerald-700">
    Revisão disponível
  </Badge>
)}
```

- [ ] **Step 4: Build/typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "delegacoes/page" || echo "OK"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/delegacoes/page.tsx"
git commit -m "feat(revisao-surface): bloco de considerações + badge na página de delegações"
```

---

### Task 4: Aceitação (rodar o app como a estagiária)

- [ ] **Step 1: Subir o app e logar como Emilly**

Seguir o padrão de validação E2E autenticada (memória `reference_ombuds_e2e_validation`):
mintar `defesahub_session` (JWT AUTH_SECRET) para `userId=14` (emilly.teste, role
`estagiario`), `channel:chrome`, prod build ou warmup. Navegar para `/admin/delegacoes`, aba "Recebidas".

- [ ] **Step 2: Verificar**

Expected:
- As delegações de Valmir (#14), Leomar (#15) e Selton (#16) aparecem com o badge **"Revisão disponível"**.
- Abrir o detalhe → bloco "O que o Defensor validou e ajustou" com o texto da orientação.
- Clicar "Copiar para WhatsApp" → toast "Orientação copiada..."; colar e conferir saudação + corpo.

- [ ] **Step 3: Rodar a suíte de testes**

Run: `npx vitest run src/components/demandas/__tests__/revisao-message.test.ts`
Expected: PASS.

---

## Self-Review

- **Spec coverage:** bloco rotulado + copiar-WhatsApp (T1+T2+T3 Step2), badge no card
  (T3 Step3), filtro/aba Recebidas (já existente; T4 verifica), helper isolado e
  testado (T1), `CopiarRevisaoButton` isolado (T2), sem backend novo (confirmado:
  `minhasDelegacoes` retorna `observacoes`). Fora-de-v1 (peça, DemandaQuickPreview)
  não entram — ok.
- **Placeholders:** nenhum; todo código está completo. Caminho do `delegadoPara?.name`
  tem fallback explícito.
- **Type consistency:** `montarMensagemRevisao(nome, consideracoes, hora)` usado
  igual em T1 e T2; `CopiarRevisaoButton({consideracoes, destinatarioNome})` igual em
  T2 e T3.
