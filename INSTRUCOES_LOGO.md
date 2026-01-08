# 🎨 Instruções para Atualizar a Logo

## ✅ Já Feito (Commit 56e2588)
- ✅ Removido o filtro CSS que alterava a cor da logo
- ✅ Sistema preparado para receber a nova logo

## 📋 O Que Você Precisa Fazer Agora

### Passo 1: Salvar a Nova Logo

A imagem que você anexou na conversa (golden retriever no círculo azul) precisa ser salva como:

```
/Users/rodrigorochameire/.cursor/worktrees/TeteCareHub/lfw/public/tetecare-logo.png
```

**IMPORTANTE**: Substitua o arquivo existente `tetecare-logo.png`

### Passo 2: Verificar os Locais que Usam a Logo

A logo é utilizada nos seguintes arquivos (todos já apontam para `/tetecare-logo.png`):

1. **Páginas de Autenticação**:
   - `src/app/sign-in/[[...sign-in]]/page.tsx` (2 ocorrências)
   - `src/app/sign-up/[[...sign-up]]/page.tsx` (2 ocorrências)
   - `src/app/(auth)/forgot-password/page.tsx` (1 ocorrência)

2. **Sidebars (Dashboard)**:
   - `src/components/layouts/tutor-sidebar.tsx` (2 ocorrências)
   - `src/components/layouts/admin-sidebar.tsx` (2 ocorrências)

3. **Landing Page**:
   - `src/components/landing-page.tsx` (3 ocorrências)

### Passo 3: Testar Localmente

Após salvar a logo:

```bash
cd /Users/rodrigorochameire/.cursor/worktrees/TeteCareHub/lfw
npm run dev
```

Acesse: `http://localhost:3000`

Verifique:
- ✅ Landing page mostra a nova logo
- ✅ Sidebar (expandida e colapsada) mostra a nova logo
- ✅ Páginas de sign-in e sign-up mostram a nova logo
- ✅ Página de forgot-password mostra a nova logo

### Passo 4: Deploy

```bash
# Adicionar a nova logo ao git
git add public/tetecare-logo.png

# Commit
git commit -m "Atualiza logo da aplicação - golden retriever em círculo azul"

# Push para o branch atual
git push origin HEAD:main
```

## 📝 Observações

- **Formato**: PNG com fundo transparente (recomendado)
- **Dimensões**: A logo atual tem aproximadamente 1.1MB
- **Transparência**: Mantenha o fundo transparente para melhor integração
- **Cores**: O azul do círculo deve ser profundo/escuro (como na imagem que você forneceu)

## 🎯 Resultado Esperado

Após seguir esses passos, a nova logo (golden retriever no círculo azul) aparecerá em todos os locais da aplicação, com as cores originais preservadas (sem filtros CSS).
