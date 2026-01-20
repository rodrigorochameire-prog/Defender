# 📐 Sistema Tipográfico Hierárquico - Defender

## 🎯 Objetivo

Criar harmonia visual através de uma escala tipográfica consistente, eliminando "magic numbers" (tamanhos arbitrários como 10px, 11px, 13px) e estabelecendo hierarquia clara.

---

## 📊 Escala Tipográfica

### Modo Padrão (Densidade + Legibilidade)

| Elemento | Tamanho | Classe Tailwind | Peso | Uso |
|----------|---------|----------------|------|-----|
| **Micro/Label** | 12px | `text-xs` | Medium/Semibold | Tags, legendas, datas secundárias |
| **Corpo UI** | 14px | `text-sm` | Regular/Medium | Tabelas, inputs, menus, cards |
| **Corpo Leitura** | 16px | `text-base` | Regular | Descrições longas, anotações |
| **Subtítulo** | 18px | `text-lg` | Semibold | Títulos de widgets, seções |
| **Título Página** | 24px | `text-2xl` | Bold (Serif) | Nome da página |

### Modo Ampliado (Acessibilidade)

| Elemento | Tamanho | Classe Tailwind | Diferença |
|----------|---------|----------------|-----------|
| **Micro/Label** | 14px | `text-sm` | +2px |
| **Corpo UI** | 16px | `text-base` | +2px |
| **Corpo Leitura** | 18px | `text-lg` | +2px |
| **Subtítulo** | 20px | `text-xl` | +2px |
| **Título Página** | 30px | `text-3xl` | +6px |

---

## 🎨 Classes Utilitárias

### Substituição de Magic Numbers

#### ❌ ANTES (Problemático)
```tsx
// Ruim: Tamanhos arbitrários
<span className="text-[10px]">Label</span>  // Muito pequeno
<span className="text-[11px]">Texto</span>  // Não é padrão
<span className="text-[13px]">Menu</span>   // Quebre a escala
```

#### ✅ DEPOIS (Harmonioso)
```tsx
// Bom: Classes do sistema
<span className="text-ui-label">Label</span>     // 12px (text-xs)
<span className="text-ui-micro">Texto</span>     // 12px (text-xs)
<span className="text-sidebar-item">Menu</span>  // 14px (text-sm)
```

### Classes Disponíveis

```css
/* Corpo de UI - Texto padrão (14px) */
.text-ui-body {
  @apply text-sm leading-relaxed text-zinc-700 dark:text-zinc-300;
}

/* Label de UI - Tags, legendas (12px) */
.text-ui-label {
  @apply text-xs font-medium tracking-wide text-zinc-500 uppercase;
}

/* Micro texto - Elementos secundários (12px) */
.text-ui-micro {
  @apply text-xs text-muted-foreground/80;
}

/* Sidebar - Itens de menu (14px) */
.text-sidebar-item {
  @apply text-sm font-medium transition-colors;
}

/* Sidebar - Seções (12px) */
.text-sidebar-section {
  @apply text-xs font-semibold uppercase tracking-wider;
}

/* Badge/Tag (12px) */
.text-badge {
  @apply text-xs font-semibold uppercase tracking-wide;
}

/* Dados mono (14px) - Processos, datas */
.text-data {
  @apply font-mono text-sm tracking-tight tabular-nums;
}
```

---

## 🔄 Como Funciona o Modo Ampliado

O sistema usa a estratégia de escalar o `font-size` base do HTML:

```css
/* Base: 16px = 1rem */
html {
  font-size: 16px;
}

/* Modo Ampliado: 18px = 1rem */
html.font-large {
  font-size: 18px;
}
```

**Resultado**: Todas as classes que usam `rem` (ex: `text-sm`, `p-4`) escalam automaticamente em 12.5% quando o usuário ativa o modo de letra grande.

---

## 📏 Hierarquia Visual

### Títulos (Headings)

```tsx
// H1 - Título de Página
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
  Assistidos
</h1>

// H2 - Título de Seção
<h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
  Dados Pessoais
</h2>

// H3 - Subtítulo
<h3 className="text-lg sm:text-xl font-semibold">
  Endereço
</h3>
```

### Labels e Corpo

```tsx
// Label de campo
<label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
  Nome Completo
</label>

// Texto de corpo
<p className="text-sm text-foreground">
  João da Silva Santos
</p>

// Número de processo (mono)
<span className="text-data">
  0001234-56.2024.8.26.0100
</span>
```

---

## 🚫 Regras de Ouro (NUNCA QUEBRE)

### ❌ Proibido

1. **NUNCA use tamanhos menores que 12px** (text-xs)
   - Ilegível em interfaces modernas
   - Causa fadiga visual

2. **NUNCA use magic numbers**
   ```tsx
   // ❌ ERRADO
   <span className="text-[10px]">Texto</span>
   <span className="text-[11px]">Texto</span>
   <span className="text-[13px]">Texto</span>
   ```

3. **NUNCA use `font-bold` em labels**
   ```tsx
   // ❌ ERRADO
   <label className="font-bold">Campo</label>
   
   // ✅ CERTO
   <label className="font-semibold">Campo</label>
   ```

### ✅ Obrigatório

1. **SEMPRE use classes do sistema**
   ```tsx
   // ✅ Classes utilitárias
   <span className="text-ui-label">Label</span>
   <span className="text-sidebar-item">Menu</span>
   ```

2. **SEMPRE respeite a escala**
   - text-xs (12px) → text-sm (14px) → text-base (16px) → text-lg (18px)

3. **SEMPRE teste em modo ampliado**
   - Adicione `font-large` no `<html>` e verifique se está legível

---

## 🎯 Benefícios

### Antes (Problemático)
- 10px, 11px, 13px, 15px (sem padrão)
- Fadiga visual (olho se ajustando constantemente)
- Texto pequeno demais
- "Muita informação" na tela

### Depois (Harmonioso)
- 12px, 14px, 16px, 18px, 24px (escala clara)
- Ritmo visual consistente
- Legibilidade confortável
- Hierarquia óbvia

---

## 📚 Referências

- [Tailwind Typography](https://tailwindcss.com/docs/font-size)
- [Material Design Type Scale](https://m2.material.io/design/typography/the-type-system.html)
- [WCAG 2.1 - Minimum Font Size](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html)

---

## 🔧 Migração

### Checklist para Componentes

- [ ] Substituir `text-[10px]` → `text-xs` ou `text-ui-label`
- [ ] Substituir `text-[11px]` → `text-xs`
- [ ] Substituir `text-[13px]` → `text-sm`
- [ ] Substituir `text-[15px]` → `text-base`
- [ ] Substituir `font-bold` em labels → `font-semibold`
- [ ] Testar em modo ampliado (`html.font-large`)
- [ ] Verificar espaçamento (aumentar padding se necessário)

---

**Versão**: 1.0  
**Data**: Janeiro 2026  
**Status**: Implementado
