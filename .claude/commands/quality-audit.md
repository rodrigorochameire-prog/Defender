# /quality-audit - Auditoria de Qualidade Web

> **Tipo**: Workflow Especializado
> **Fonte**: Web Quality Audit (Tech Leads Club)
> **Execução**: Sob demanda - "auditar qualidade", "lighthouse audit", "revisar performance"

## Descrição

Auditoria abrangente de qualidade web baseada em Google Lighthouse. Cobre Performance, Acessibilidade, SEO e Boas Práticas.

---

## Core Web Vitals

| Métrica | Mede | Bom | Precisa Melhorar | Ruim |
|---------|------|-----|------------------|------|
| **LCP** | Carregamento | ≤ 2.5s | 2.5s – 4s | > 4s |
| **INP** | Interatividade | ≤ 200ms | 200ms – 500ms | > 500ms |
| **CLS** | Estabilidade Visual | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

---

## Performance (40% dos problemas típicos)

### Otimização de Imagens (Next.js)

```tsx
// ❌ ERRADO - Imagem não otimizada
<img src="/foto.jpg" alt="Foto" />

// ✅ CORRETO - next/image com otimização
import Image from "next/image";

<Image
  src="/foto.jpg"
  alt="Foto do assistido"
  width={300}
  height={200}
  priority // Para LCP images
/>
```

### Lazy Loading

```tsx
// ❌ ERRADO - Carrega tudo no início
import HeavyComponent from "@/components/heavy";

// ✅ CORRETO - Lazy loading
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(
  () => import("@/components/heavy"),
  { loading: () => <Skeleton /> }
);
```

### Server Components (Next.js 15)

```tsx
// ✅ Por padrão, componentes são Server Components
// Dados buscados no servidor, HTML enviado pronto

export default async function AssistidosPage() {
  const assistidos = await getAssistidos();
  return <AssistidosList data={assistidos} />;
}

// Use 'use client' apenas quando necessário
// (interatividade, hooks, eventos de browser)
```

---

## Acessibilidade (30% dos problemas típicos)

### Textos Alternativos

```tsx
// ❌ ERRADO
<img src="avatar.jpg" />
<button><IconSearch /></button>

// ✅ CORRETO
<img src="avatar.jpg" alt="Foto de João da Silva" />
<button aria-label="Buscar assistidos">
  <IconSearch aria-hidden="true" />
</button>
```

### Contraste de Cores (Padrão Defender)

```css
/* ✅ O padrão Defender já segue WCAG AA */
/* Zinc para textos + Emerald para hover = contraste adequado */

.text-zinc-900 { /* 21:1 no branco */ }
.text-zinc-700 { /* 7.5:1 no branco */ }
.text-zinc-500 { /* 4.6:1 no branco - limite para texto grande */ }
```

### Navegação por Teclado

```tsx
// ✅ Componentes shadcn/ui já são acessíveis
// Apenas garantir ordem lógica de tabulação

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    {/* Focus trap automático */}
    <DialogHeader>...</DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Labels de Formulário

```tsx
// ❌ ERRADO - Sem label associado
<Input placeholder="Nome" />

// ✅ CORRETO - Com label explícito
<div className="space-y-2">
  <Label htmlFor="nome">Nome do Assistido</Label>
  <Input
    id="nome"
    placeholder="Digite o nome completo"
    aria-describedby="nome-help"
  />
  <p id="nome-help" className="text-sm text-muted-foreground">
    Nome conforme documento oficial
  </p>
</div>
```

---

## SEO (15% dos problemas típicos)

### Metadata (Next.js 15)

```tsx
// app/admin/assistidos/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assistidos | OMBUDS",
  description: "Gerenciamento de assistidos da Defensoria Pública",
  robots: "noindex, nofollow", // Admin não deve ser indexado
};
```

### Estrutura de Headings

```tsx
// ✅ CORRETO - Hierarquia lógica
<main>
  <h1>Assistidos</h1>
  <section>
    <h2>Filtros</h2>
    ...
  </section>
  <section>
    <h2>Resultados</h2>
    <article>
      <h3>João da Silva</h3>
      ...
    </article>
  </section>
</main>

// ❌ ERRADO - Pular níveis
<h1>Assistidos</h1>
<h3>Filtros</h3> {/* Pulou h2 */}
```

---

## Boas Práticas (15% dos problemas típicos)

### Console Errors

```tsx
// ❌ ERRADO - Deixar console.log em produção
console.log("Debug:", data);

// ✅ CORRETO - Usar apenas em desenvolvimento
if (process.env.NODE_ENV === "development") {
  console.log("Debug:", data);
}

// Melhor ainda: usar logger configurável
import { logger } from "@/lib/logger";
logger.debug("Dados carregados", { count: data.length });
```

### Error Boundaries

```tsx
// app/admin/assistidos/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2>Algo deu errado!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
```

---

## Níveis de Severidade

| Nível | Descrição | Ação |
|-------|-----------|------|
| **Crítico** | Vulnerabilidades, falhas completas | Corrigir imediatamente |
| **Alto** | Core Web Vitals ruins, barreiras a11y | Corrigir antes do deploy |
| **Médio** | Oportunidades de performance, SEO | Corrigir no sprint |
| **Baixo** | Otimizações menores | Quando conveniente |

---

## Formato do Relatório

```markdown
# Auditoria de Qualidade - OMBUDS

**Data:** YYYY-MM-DD
**Páginas auditadas:** [lista]

## Resumo

- Performance: X issues (Y críticos)
- Acessibilidade: X issues (Y críticos)
- SEO: X issues
- Boas Práticas: X issues

## Issues Críticos (X encontrados)

### [PERF-001] LCP > 4s na página de assistidos
- **Arquivo:** `src/app/admin/assistidos/page.tsx`
- **Impacto:** Experiência ruim, penalização no ranking
- **Correção:** Implementar Server Components + Streaming

## Issues Altos (X encontrados)
...

## Prioridade Recomendada

1. Corrigir [PERF-001] porque...
2. Depois resolver...
```

---

## Checklist Rápido

### Antes de cada deploy

- [ ] Core Web Vitals passando
- [ ] Sem erros de acessibilidade (axe/Lighthouse)
- [ ] Sem erros no console
- [ ] HTTPS funcionando
- [ ] Meta tags presentes

### Revisão semanal

- [ ] Verificar tendências de Core Web Vitals
- [ ] Atualizar dependências
- [ ] Testar com leitor de tela

### Auditoria mensal

- [ ] Lighthouse completo
- [ ] Profiling de performance
- [ ] Auditoria de acessibilidade completa
