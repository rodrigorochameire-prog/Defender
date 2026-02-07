# /browser-test - Testar no Navegador

> **Tipo**: Workflow Automatizado
> **Trigger**: "testa no browser", "abre a página", "verifica na tela"
> **Requer**: MCP Claude in Chrome

## Descrição

Abre a página no navegador, testa elementos principais, verifica erros e reporta resultado.

---

## Workflow

### 1. Preparação

```bash
# Verificar se dev server está rodando
curl -s http://localhost:3000 > /dev/null && echo "✅ Server OK" || echo "❌ Server offline"
```

Se offline:
```bash
npm run dev
```

### 2. Abrir Página

Usar MCP Chrome para:
1. Obter contexto de tabs (`tabs_context_mcp`)
2. Criar nova tab se necessário (`tabs_create_mcp`)
3. Navegar para a URL (`navigate`)

### 3. Verificações Automáticas

| Verificação | Como | Sucesso |
|-------------|------|---------|
| Página carrega | Screenshot | Conteúdo visível |
| Console errors | `read_console_messages` | Sem erros |
| Elementos chave | `find` ou `read_page` | Encontrados |
| Interatividade | `computer` click | Responde |

### 4. Testes por Tipo de Página

#### Listagem (ex: /admin/demandas)
- [ ] Tabela/cards renderizam
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Ações (editar/excluir) clicáveis

#### Formulário (ex: /admin/assistidos/novo)
- [ ] Campos renderizam
- [ ] Validação funciona
- [ ] Submit funciona
- [ ] Feedback de sucesso/erro

#### Dashboard
- [ ] Cards de stats carregam
- [ ] Gráficos renderizam
- [ ] Dados são reais (não mock)

### 5. Relatório

```markdown
## Resultado do Teste

**Página:** /admin/demandas
**Data:** YYYY-MM-DD HH:MM

### Status: ✅ OK / ⚠️ Parcial / ❌ Falha

### Verificações
- [x] Página carregou
- [x] Sem erros no console
- [x] Elementos principais visíveis
- [ ] Filtro de atribuição funciona ← Problema

### Problemas Encontrados
1. Filtro não retorna resultados (ver issue #X)

### Screenshots
[Anexar se relevante]
```

---

## Comandos Rápidos

| Comando | Ação |
|---------|------|
| "testa /admin/demandas" | Testa página específica |
| "abre a home" | Navega para localhost:3000 |
| "tem erro no console?" | Verifica console messages |
| "clica no botão X" | Testa interação específica |

---

## URLs Comuns do OMBUDS

| Página | URL |
|--------|-----|
| Dashboard | http://localhost:3000/admin/dashboard |
| Assistidos | http://localhost:3000/admin/assistidos |
| Casos | http://localhost:3000/admin/casos |
| Demandas | http://localhost:3000/admin/demandas |
| Agenda | http://localhost:3000/admin/agenda |

---

## Troubleshooting

### Página não carrega
```bash
# Verificar porta
lsof -i :3000

# Reiniciar dev server
pkill -f "next dev" && npm run dev
```

### Erro de hydration
- Verificar Server vs Client components
- Procurar por `useEffect` com dados de servidor

### Console errors
- Ler mensagem completa
- Buscar no código fonte
- Verificar network requests
