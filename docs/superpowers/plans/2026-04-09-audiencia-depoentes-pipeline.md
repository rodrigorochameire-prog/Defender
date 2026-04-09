# Audiência Depoentes Pipeline Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que depoentes do `analysis_data` apareçam automaticamente no event-detail-sheet e no registro-modal sem depender de clique manual em "Importar", e que o tipo (réu, vítima, testemunha acusação/defesa, policial, etc.) seja categorizado corretamente.

**Architecture:** Três correções convergentes: (1) `event-detail-sheet` faz fallback para `analysis_data` via novo endpoint quando `registro_audiencia.depoentes` está vazio; (2) `use-registro-form` auto-popula depoentes do `previewPreparacao` quando abre modal com lista vazia; (3) mapeamento de tipo corrigido para distinguir ofendida, policial, testemunha acusação vs defesa.

**Tech Stack:** Next.js, tRPC, Drizzle, React, TypeScript

---

## Diagnóstico do Bug

### Estado atual (quebrado)

```
processos.analysis_data (11KB+) ──────── NÃO É LIDO ────→ event-detail-sheet
                                                           (só lê registro_audiencia.depoentes = [])

"Preparar Audiências" (botão) ──→ tabela testemunhas ──── NÃO É LIDO ────→ event-detail-sheet

"Importar p/ Depoentes" (botão) ──→ registro_audiencia.depoentes ──→ event-detail-sheet ✅
     ↑ mas requer 2 cliques manuais (abrir Preparação + clicar Importar)
```

### Estado desejado

```
processos.analysis_data ──→ previewPreparacao ──→ event-detail-sheet (fallback automático)
                                                ──→ use-registro-form (auto-populate no modal open)

Tipo correto: "ofendida" = vitima, "PM condutor" = policial, "testemunha acusação" vs "defesa" separados
```

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/components/agenda/event-detail-sheet.tsx` | Modificar | Fallback: quando `registro.depoentes` vazio, buscar `previewPreparacao` |
| `src/components/agenda/registro-audiencia/hooks/use-registro-form.ts` | Modificar | Auto-popular depoentes do `previewPreparacao` quando modal abre com lista vazia |
| `src/lib/trpc/routers/audiencias.ts` (`_mapPapelToTipo`) | Modificar | Corrigir mapeamento de tipos para ofendida, policial, lado |
| `src/components/agenda/registro-audiencia/tabs/tab-preparacao.tsx` (`tipoToDepoenteTipo`) | Modificar | Alinhar mapeamento com backend |
| `src/components/agenda/registro-audiencia/constants.ts` | Verificar | Já tem todos os tipos necessários |
| `src/components/agenda/registro-audiencia/types.ts` | Verificar | `Depoente["tipo"]` já suporta policial, vitima, etc. |

---

### Task 1: Corrigir mapeamento de tipo no backend (`_mapPapelToTipo`)

O `_analise_ia.json` produzido pela skill VVD usa campos como `vinculo: "ofendida"`, `vinculo: "PM condutor"`, `tipo_prova: "hearsay"`. O mapeamento atual no backend perde essa informação — tudo vira "COMUM" ou "ACUSACAO" genérico.

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts:79-90`

- [ ] **Step 1: Atualizar `_mapPapelToTipo` para reconhecer mais padrões**

```typescript
const _mapPapelToTipo = (papel: string): TestemunhaTipo => {
  const p = (papel || "").toLowerCase().replace(/\s+/g, "_");
  // Acusação
  if (p === "testemunha_acusacao" || p === "acusacao" || p === "testemunha_de_acusação"
      || p === "testemunha_de_acusacao") return "ACUSACAO";
  // Defesa
  if (p === "testemunha_defesa" || p === "defesa" || p === "testemunha_de_defesa") return "DEFESA";
  // Vítima / Ofendida
  if (p === "vitima" || p === "vítima" || p === "ofendida" || p === "ofendido") return "VITIMA";
  // Policial (qualquer variante)
  if (p.includes("policial") || p.includes("pm_") || p === "pm"
      || p.includes("condutor") || p.includes("militar")) return "ACUSACAO";
  // Investigador / Delegado (tratados como acusação)
  if (p.includes("investigador") || p.includes("ipc") || p.includes("delegad")) return "ACUSACAO";
  // Perito
  if (p === "perito" || p.includes("perit")) return "PERITO";
  // Informante
  if (p === "informante") return "INFORMANTE";
  // Testemunha genérica
  if (p.includes("testemunha")) return "COMUM";
  // Réu não deve virar testemunha — filtrar antes. Se chegou aqui, default.
  if (p === "reu" || p === "réu" || p === "defendido") return "COMUM";
  return "COMUM";
};
```

- [ ] **Step 2: Adicionar mapeamento do campo `vinculo` na extração de `mergedTestemunhas`**

No `computePreparacao`, onde monta `mergedTestemunhas` (linha ~241), o campo `papel` pode estar vazio mas o campo `vinculo` do JSON pode ter a informação (ex: `"vinculo": "ofendida"`). Precisamos fazer fallback:

Em `src/lib/trpc/routers/audiencias.ts`, dentro de `computePreparacao`, modificar as linhas 241-244:

```typescript
  const mergedTestemunhas: RawDep[] = [
    ...collect(ad?.testemunhas_acusacao).map((t) => ({
      ...t,
      papel: t.papel ?? t.tipo ?? t.vinculo ?? "ACUSACAO",
    })),
    ...collect(ad?.testemunhas_defesa).map((t) => ({
      ...t,
      papel: t.papel ?? t.tipo ?? t.vinculo ?? "DEFESA",
    })),
  ];
```

- [ ] **Step 3: Verificar build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors on modified file

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "fix: improve _mapPapelToTipo to recognize ofendida, policial, investigador variants"
```

---

### Task 2: Alinhar mapeamento no frontend (`tipoToDepoenteTipo`)

A função `tipoToDepoenteTipo` em `tab-preparacao.tsx` mapeia `ACUSACAO` → `testemunha` e perde a distinção policial/vítima que o backend agora dá. Além disso, o tipo "policial" da `Depoente` interface nunca é usado pelo import.

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-preparacao.tsx:47-64`

- [ ] **Step 1: Atualizar `tipoToDepoenteTipo` para preservar tipos ricos**

```typescript
const tipoToDepoenteTipo = (
  tipo: string,
): Depoente["tipo"] => {
  switch (tipo) {
    case "VITIMA":
      return "vitima";
    case "INFORMANTE":
      return "informante";
    case "PERITO":
      return "perito";
    case "DEFESA":
    case "ACUSACAO":
    case "COMUM":
    default:
      return "testemunha";
  }
};
```

Nota: este mapeamento já é basicamente o que existe. O ponto principal é que a detecção de policial precisa vir do campo `vinculo` ou `nome` do depoente. Policiais são testemunhas de acusação com vinculo "policial", então ficam como `tipo: "policial"` no `Depoente`.

Atualizar `handleImportar` (linha ~125) para detectar policial pelo vinculo:

```typescript
  const handleImportar = () => {
    if (!data || data.total === 0) return;
    const depoentes: Depoente[] = data.depoentes.map((t, i) => {
      // Detect policial from vinculo or nome patterns
      const vinculoLower = ((t as any).vinculo ?? "").toLowerCase();
      const nomeLower = (t.nome ?? "").toLowerCase();
      const isPolicial = vinculoLower.includes("policial") || vinculoLower.includes("pm ")
        || vinculoLower.includes("condutor") || vinculoLower.includes("investigador")
        || /^(cb|sd|sgt|cap|ten|ipc|del)\b/i.test(t.nome ?? "");

      let tipo: Depoente["tipo"] = tipoToDepoenteTipo(t.tipo ?? "COMUM");
      if (isPolicial) tipo = "policial";

      return {
        id: `prep-${i}-${t.nome}`,
        nome: t.nome,
        tipo,
        lado: (t.tipo === "ACUSACAO" ? "acusacao" : t.tipo === "DEFESA" ? "defesa" : undefined) as Depoente["lado"],
        intimado: false,
        presente: false,
        statusIntimacao: "pendente" as const,
        jaOuvido: (t.resumo ? "delegacia" : "nenhum") as Depoente["jaOuvido"],
        depoimentoDelegacia: t.resumo ?? "",
        depoimentoAnterior: "",
        pontosFortes: t.pontosFavoraveis ?? "",
        pontosFracos: t.pontosDesfavoraveis ?? "",
        estrategiaInquiricao: t.perguntasSugeridas ?? "",
        perguntasDefesa: "",
        depoimentoLiteral: "",
        analisePercepcoes: t.observacoes ?? "",
      };
    });
    onImportarParaDepoentes?.(depoentes);
    toast.success(`${depoentes.length} depoente(s) importado(s) com relatos e pontos fortes/fracos`);
  };
```

- [ ] **Step 2: Verificar build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/components/agenda/registro-audiencia/tabs/tab-preparacao.tsx
git commit -m "fix: detect policial tipo from vinculo/nome patterns in depoente import"
```

---

### Task 3: Event-detail-sheet — fallback para `previewPreparacao`

O `event-detail-sheet` atualmente SÓ lê `registro_audiencia.depoentes`. Quando está vazio, mostra "Análise de depoentes não disponível". O fix: quando vazio, buscar `previewPreparacao` como fallback.

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx:282-298`

- [ ] **Step 1: Adicionar query de fallback `previewPreparacao`**

Após a linha 290 (`const { data: historico } = ...`), adicionar:

```typescript
  // Fallback: when registro has no depoentes, use previewPreparacao (from analysis_data)
  const registroDepoentes: any[] = (registro as any)?.depoentes ?? [];
  const needsFallback = registroDepoentes.length === 0;

  const { data: preparacaoPreview } = trpc.audiencias.previewPreparacao.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    { enabled: needsFallback && audienciaIdNum !== null && open }
  );
```

- [ ] **Step 2: Atualizar a derivação de `depoentes` e `temEnrichment`**

Substituir as linhas 292-298 por:

```typescript
  // Prefer registro depoentes; fallback to analysis_data preview
  const depoentes: any[] = registroDepoentes.length > 0
    ? registroDepoentes
    : (preparacaoPreview?.depoentes ?? []).map((d: any) => ({
        nome: d.nome,
        tipo: d.tipo,
        status: "pendente",
        intimado: false,
        resumo: d.resumo,
        perguntasSugeridas: d.perguntasSugeridas,
        pontosFavoraveis: d.pontosFavoraveis,
        pontosDesfavoraveis: d.pontosDesfavoraveis,
        observacoes: d.observacoes,
      }));

  const fromAnalysis = registroDepoentes.length === 0 && depoentes.length > 0;
  const temEnrichment = depoentes.length > 0;
  const depoenteOuvidos = depoentes.filter((d: any) => {
    const s = d.status?.toLowerCase() ?? "";
    return s === "ouvido" || s === "ouvida";
  }).length;
```

- [ ] **Step 3: Adicionar indicador visual de "dados da análise"**

Na seção de depoentes (linha ~449), atualizar o label para indicar a fonte:

```typescript
          <SectionLabel
            icon={Users}
            label={temEnrichment
              ? fromAnalysis
                ? `Depoentes · ${depoentes.length} (da análise)`
                : `Depoentes · ${depoenteOuvidos} ouvido${depoenteOuvidos !== 1 ? "s" : ""} de ${depoentes.length}`
              : "Depoentes"}
          />
```

- [ ] **Step 4: Melhorar o tipo exibido no `DepoenteCard`**

O `DepoenteCard` (linha 140) exibe `depoente.tipo` cru (ex: "ACUSACAO", "DEFESA"). Mapear para labels legíveis. Adicionar no início do componente `DepoenteCard`:

```typescript
const TIPO_DISPLAY: Record<string, string> = {
  ACUSACAO: "Acusação",
  DEFESA: "Defesa",
  VITIMA: "Vítima",
  INFORMANTE: "Informante",
  PERITO: "Perito",
  COMUM: "Testemunha",
  // Também aceitar tipos do registro-audiencia
  testemunha: "Testemunha",
  vitima: "Vítima",
  reu: "Réu",
  perito: "Perito",
  informante: "Informante",
  policial: "Policial",
};
```

E na renderização (linha 158-161), trocar `{depoente.tipo}` por:

```typescript
{TIPO_DISPLAY[depoente.tipo] ?? depoente.tipo}
```

- [ ] **Step 5: Verificar build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat: event-detail-sheet fallback to analysis_data when registro depoentes empty"
```

---

### Task 4: Auto-populate depoentes no registro-modal

Quando o modal de registro abre e `registro.depoentes` está vazio, buscar o `previewPreparacao` automaticamente e popular a lista — sem precisar clicar em "Importar".

**Files:**
- Modify: `src/components/agenda/registro-audiencia/hooks/use-registro-form.ts:55-145`

- [ ] **Step 1: Adicionar query `previewPreparacao` no hook**

Após `const salvarMutation` (linha 71), adicionar:

```typescript
  // Auto-populate: load preview when depoentes are empty
  const { data: preparacaoData } = trpc.audiencias.previewPreparacao.useQuery(
    { audienciaId: audienciaId ?? 0 },
    { enabled: isOpen && audienciaId !== null }
  );
```

- [ ] **Step 2: Adicionar effect para auto-popular depoentes**

Após o effect de `savedRegistro` (linha 145), adicionar:

```typescript
  // Auto-populate depoentes from analysis_data when registro is empty
  const autoPopulatedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || autoPopulatedRef.current) return;
    if (!preparacaoData || preparacaoData.total === 0) return;

    // Only auto-populate if depoentes are currently empty
    // (either no saved registro, or saved registro has empty depoentes)
    const currentDepoentes = registro.depoentes;
    if (currentDepoentes.length > 0) {
      autoPopulatedRef.current = true;
      return;
    }

    // Wait for DB load to complete first
    if (audienciaId !== null && !dbLoadedRef.current && savedRegistro === undefined) return;

    const vinculoLower = (v: string) => (v ?? "").toLowerCase();
    const isPolicial = (t: any) => {
      const v = vinculoLower(t.vinculo ?? "");
      return v.includes("policial") || v.includes("pm ") || v.includes("condutor")
        || v.includes("investigador") || /^(cb|sd|sgt|cap|ten|ipc|del)\b/i.test(t.nome ?? "");
    };

    const tipoToDepoenteTipo = (tipo: string, t: any): Depoente["tipo"] => {
      if (isPolicial(t)) return "policial";
      switch (tipo) {
        case "VITIMA": return "vitima";
        case "INFORMANTE": return "informante";
        case "PERITO": return "perito";
        default: return "testemunha";
      }
    };

    const imported: Depoente[] = preparacaoData.depoentes.map((t, i) => ({
      id: `auto-${i}-${t.nome}`,
      nome: t.nome,
      tipo: tipoToDepoenteTipo(t.tipo ?? "COMUM", t),
      lado: (t.tipo === "ACUSACAO" ? "acusacao" : t.tipo === "DEFESA" ? "defesa" : undefined) as Depoente["lado"],
      intimado: false,
      presente: false,
      statusIntimacao: "pendente" as const,
      jaOuvido: (t.resumo ? "delegacia" : "nenhum") as Depoente["jaOuvido"],
      depoimentoDelegacia: t.resumo ?? "",
      depoimentoAnterior: "",
      pontosFortes: t.pontosFavoraveis ?? "",
      pontosFracos: t.pontosDesfavoraveis ?? "",
      estrategiaInquiricao: t.perguntasSugeridas ?? "",
      perguntasDefesa: "",
      depoimentoLiteral: "",
      analisePercepcoes: t.observacoes ?? "",
    }));

    if (imported.length > 0) {
      setRegistro((prev) => ({ ...prev, depoentes: imported }));
      setIsDirty(true);
      autoPopulatedRef.current = true;
    }
  }, [isOpen, preparacaoData, registro.depoentes, savedRegistro, audienciaId]);
```

- [ ] **Step 3: Resetar `autoPopulatedRef` quando modal fecha**

No effect existente de cleanup (linha ~181), adicionar reset:

```typescript
  } else if (!isOpen) {
    setRegistroSalvo(false);
    setUltimoSalvamento(null);
    dbLoadedRef.current = false;
    autoPopulatedRef.current = false;  // ← adicionar
  }
```

- [ ] **Step 4: Verificar build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/hooks/use-registro-form.ts
git commit -m "feat: auto-populate depoentes from analysis_data when registro modal opens with empty list"
```

---

### Task 5: Incluir campo `vinculo` no output do `computePreparacao`

O `PreparedDepoente` não inclui o `vinculo` original do JSON, o que impede detecção de policial no frontend. Adicionar esse campo.

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts` (tipo `PreparedDepoente` e mapeamento)

- [ ] **Step 1: Localizar o tipo `PreparedDepoente` e adicionar `vinculo`**

Buscar a interface/type `PreparedDepoente` no arquivo e adicionar:

```typescript
  vinculo?: string | null;
```

- [ ] **Step 2: No mapeamento dentro de `computePreparacao` (linha ~341), adicionar `vinculo`**

```typescript
      return {
        nome: dep.nome,
        tipo,
        vinculo: dep.vinculo?.trim() || dep.papel?.trim() || null,
        endereco: dep.endereco?.trim() || null,
        // ... rest unchanged
      };
```

- [ ] **Step 3: Atualizar `RawDep` type se necessário**

Verificar se `RawDep` já tem `vinculo`. Se não, adicionar:

```typescript
  vinculo?: string;
```

- [ ] **Step 4: Verificar build**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts
git commit -m "feat: include vinculo field in PreparedDepoente for policial detection"
```

---

### Task 6: Teste manual end-to-end

- [ ] **Step 1: Iniciar dev server**

Run: `cd /Users/rodrigorochameire/projetos/Defender && npm run dev`

- [ ] **Step 2: Verificar event-detail-sheet do André Luiz**

Abrir a agenda em `/admin/agenda`, clicar no evento de André Luiz (09/04). O painel lateral deve mostrar os depoentes da análise (Tainara, PM Elias, IPC Fábio, etc.) com tipos corretos ("Vítima", "Acusação", etc.) em vez de "Análise de depoentes não disponível".

- [ ] **Step 3: Verificar registro-modal do André Luiz**

Abrir o registro de audiência do André Luiz. A aba "Depoentes" deve já estar populada automaticamente com os depoentes da análise, sem precisar clicar em "Importar".

- [ ] **Step 4: Verificar outro caso (Jailson)**

Repetir para Jailson de Santana Santos — deve mostrar Sara (ofendida como "Vítima"), PMs como "Acusação".

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "test: verify audiencia depoentes pipeline end-to-end"
```
