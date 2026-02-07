# /fix-style - Skill para Padronizar Estilos

> **Tipo**: Workflow Especializado
> **Execução**: No contexto principal

## Descrição
Corrige e padroniza estilos de componentes para o padrão Defender.

## Checklist de Verificação

### 1. Stats Cards
```tsx
// ❌ ERRADO - Gradientes coloridos
<KPICardPremium gradient="emerald" />
<KPICardPremium gradient="blue" />
<KPICardPremium gradient="rose" />

// ✅ CORRETO - Sempre zinc
<KPICardPremium gradient="zinc" />
```

### 2. Hover Effects
```tsx
// ❌ ERRADO - Cores variadas no hover
className="hover:border-blue-500"
className="hover:bg-rose-50"

// ✅ CORRETO - Sempre emerald
className="hover:border-emerald-200/50 dark:hover:border-emerald-800/30"
```

### 3. Badges
```tsx
// ❌ ERRADO - Cores sólidas
<Badge className="bg-red-500 text-white">Urgente</Badge>

// ✅ CORRETO - Outline style
<StatusBadge status="urgente" />
// ou
<Badge variant="destructive">Urgente</Badge>
```

### 4. Tipografia
```tsx
// ❌ ERRADO - Magic numbers
<p className="text-[11px]">Label</p>
<p className="text-[13px]">Texto</p>

// ✅ CORRETO - Classes do sistema
<p className="text-xs">Label</p>
<p className="text-sm">Texto</p>
```

### 5. Bordas
```tsx
// ❌ ERRADO - Preto puro
className="border-black"
className="border-gray-900"

// ✅ CORRETO - Zinc suave
className="border-zinc-200 dark:border-zinc-800"
```

### 6. Backgrounds de Cards
```tsx
// ❌ ERRADO - Cores de fundo
<Card className="bg-blue-50">
<div className="bg-emerald-100">

// ✅ CORRETO - Branco/zinc
<Card className="bg-white dark:bg-zinc-900">
<SwissCard>
```

## Comandos de Busca

### Encontrar gradientes coloridos
```bash
grep -r 'gradient="emerald"\|gradient="blue"\|gradient="rose"\|gradient="amber"\|gradient="violet"' src/app/
```

### Encontrar magic numbers de fonte
```bash
grep -r 'text-\[1[0-9]px\]' src/
```

### Encontrar hover não-emerald
```bash
grep -r 'hover:border-blue\|hover:border-rose\|hover:bg-blue\|hover:bg-rose' src/
```

## Processo de Correção

1. **Identificar arquivo**
   - Ler o arquivo completo
   - Identificar todos os pontos a corrigir

2. **Corrigir gradientes**
   - Trocar todos para `gradient="zinc"`

3. **Corrigir hover**
   - Padronizar para emerald

4. **Corrigir tipografia**
   - Remover magic numbers
   - Usar classes do sistema

5. **Testar**
   - Verificar dark mode
   - Verificar responsividade

6. **Commit**
   ```bash
   git add <arquivo>
   git commit -m "style(<escopo>): padronizar ao padrão Defender"
   ```

## Arquivos de Referência

| Componente | Arquivo |
|------------|---------|
| KPICardPremium | `src/components/shared/kpi-card-premium.tsx` |
| StatusBadge | `src/components/shared/status-badge.tsx` |
| SwissCard | `src/components/ui/swiss-card.tsx` |
| Design Tokens | `src/app/globals.css` |
