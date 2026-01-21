# 👁️ Como Ver as Mudanças Visuais

As mudanças de design foram implementadas, mas **você precisa reiniciar o servidor** para vê-las.

---

## 🚀 Método Rápido (Recomendado)

### Opção 1: Script Automático

```bash
# Dar permissão de execução (só precisa fazer uma vez)
chmod +x scripts/restart-dev.sh

# Executar o script
./scripts/restart-dev.sh

# Depois, iniciar o servidor
npm run dev
# ou
pnpm dev
```

### Opção 2: Comandos Manuais

```bash
# 1. Parar o servidor (Ctrl+C no terminal onde está rodando)

# 2. Limpar cache
rm -rf .next

# 3. Reiniciar
npm run dev
# ou
pnpm dev

# 4. Recarregar navegador com Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
```

---

## 🎨 O Que Você Verá de Novo

### 1. **Nova Logo - Escudo com X em Destaque** 🛡️
- **Sidebar**: Logo sofisticada com escudo verde-esmeralda
- **Favicon**: Novo ícone na aba do navegador
- **Letra X**: Maior, em negrito e destacada

### 2. **Nova Paleta de Cores** 🎨
- **Verde Premium**: Tom esmeralda sofisticado (#1a5f56)
- **Modo Escuro**: Verde vibrante (#2dd4bf)
- **Tons Neutros**: Cinzas premium e elegantes

### 3. **Página de Demandas Redesenhada** 📊
- **Stats Cards**: Cards clicáveis com estatísticas
- **Nova Estrutura**: Blocos bem definidos
- **Sombras Premium**: Visual mais sofisticado
- **Cores Semânticas**: Status com cores profissionais

### 4. **Componentes Padronizados** 🧩
- Tabelas/Listas unificadas
- Badges semânticos
- Filtros padronizados
- Empty states elegantes

---

## 🔧 Se Não Ver as Mudanças

### Problema: Mudanças não aparecem

**Solução 1: Limpar cache do navegador**
```
Chrome/Edge: Cmd+Shift+Delete (Mac) ou Ctrl+Shift+Delete (Windows)
Safari: Cmd+Option+E
```

**Solução 2: Hard Reset**
```bash
chmod +x scripts/hard-reset.sh
./scripts/hard-reset.sh
```

**Solução 3: Verificar arquivos**
```bash
# Verificar se os arquivos da logo existem
ls -la public/logo*.svg

# Deve mostrar:
# - logo.svg
# - logo-icon.svg
# - favicon.svg
```

---

## 📋 Checklist Pós-Reinício

Após reiniciar o servidor, verifique:

- [ ] Logo nova aparece na sidebar
- [ ] Favicon mudou na aba do navegador
- [ ] Cores da sidebar estão diferentes (mais escuras/premium)
- [ ] Página de demandas tem cards de estatísticas no topo
- [ ] Cores verde-esmeralda aparecem nos elementos primários
- [ ] Modo escuro está mais vibrante

---

## 🎯 Próximos Passos

Depois de ver as mudanças:

1. **Testar a aplicação** - Navegue pelas páginas
2. **Verificar responsividade** - Redimensione a janela
3. **Testar modo escuro** - Toggle dark/light mode
4. **Commitar mudanças** - Se gostar do resultado

```bash
git add .
git commit -m "feat: implementa design system premium"
git push origin main
```

---

## 🆘 Precisa de Ajuda?

Se ainda não estiver vendo as mudanças:

1. Verifique se está na pasta correta:
   ```bash
   pwd
   # Deve mostrar: .../DefesaHub/Defender
   ```

2. Verifique se o servidor está rodando:
   ```bash
   ps aux | grep "next dev"
   ```

3. Verifique a URL no navegador:
   ```
   http://localhost:3000
   ```

4. Veja os logs do terminal - erros aparecem lá

---

**Criado em**: 21/01/2026  
**Design System**: INTELEX v2.0
