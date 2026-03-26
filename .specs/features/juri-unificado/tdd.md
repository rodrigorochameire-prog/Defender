# TDD - Unificação da Página do Júri

| Campo | Valor |
|-------|-------|
| Tech Lead | @rodrigo |
| Status | Aprovado |
| Criado | 2026-03-25 |

---

## Contexto

A seção do Júri no OMBUDS está fragmentada em múltiplas páginas independentes (sessões, distribuição, jurados, cockpit) com redundância visual, navegação confusa e falta de coesão no design. A página principal (`/admin/juri`) empilha 5 seções verticais que competem por atenção e repetem dados.

**Domínio**: Tribunal do Júri — Gestão de sessões e julgamentos

---

## Definição do Problema

- **Fragmentação**: 4 páginas separadas para funcionalidades que se complementam
- **Redundância**: "Próximas Sessões" e "Todas as Sessões" mostram os mesmos dados com layouts diferentes
- **Grid de ferramentas** ocupa espaço valioso no meio da página, sendo apenas links para sub-páginas
- **Incoerência visual**: Página de sessões usa estilo antigo, distribuição usa estilo novo (Radar Switch, proximity colors)
- **Navegação excessiva**: Usuário precisa ir e voltar entre 4 páginas para gerenciar o fluxo do júri

---

## Escopo

### Dentro do Escopo (V1)

- Unificar sessões, distribuição e jurados em uma página com 4 tabs
- Tab "Pauta" (distribuição) — mover código existente de `/admin/juri/distribuicao`
- Tab "Sessões" — reescrever lista com design atualizado, eliminar redundâncias
- Tab "Jurados" — mover conteúdo existente de `/admin/juri/jurados`
- Tab "Cockpit" — redirect ou embed do cockpit existente
- Stats ribbon compacto no header (sempre visível)
- Simplificar sidebar (1 entrada "Júri" em vez de 3)
- Registro pendente como badge/alerta no header

### Fora do Escopo (V1)

- Reescrever cockpit interno
- Alterar lógica de dados/queries existentes
- Alterar schema do banco
- Cosmovisão, Recursos, Execução (mantêm páginas próprias)

---

## Solução Técnica

### Visão Geral

Página única `/admin/juri` com tabs no estilo Radar Switch. Cada tab renderiza um componente lazy-loaded. Header compartilhado com stats + ações.

### Componentes Principais

```
/admin/juri/page.tsx (orquestrador)
├── JuriHeader (stats + actions + tabs)
├── Tab: PautaTab (distribuição — código existente adaptado)
├── Tab: SessoesTab (lista limpa de sessões)
├── Tab: JuradosTab (conteúdo de /admin/juri/jurados migrado)
└── Tab: CockpitTab (redirect para /admin/juri/cockpit)
```

### Arquivo Principal: `/admin/juri/page.tsx`

- Reescrever completamente (~400 linhas)
- Import lazy dos tabs
- Stats ribbon compacto (4 KPIs inline)
- Tabs estilo Radar Switch: Pauta | Sessões | Jurados | Cockpit
- Registro pendente como badge no header

### Sidebar: `admin-sidebar.tsx`

- JURI_SECTIONS "Gestão" simplifica para: `{ label: "Júri", path: "/admin/juri", icon: "Gavel" }`
- Remove: "Distribuição", "Jurados" (agora são tabs)
- Mantém seção "Pós-Júri": Cosmovisão, Recursos, Execução

### Queries (reutilizar existentes)

- `trpc.juri.list` — Tab Sessões
- `trpc.juri.distribuicao` — Tab Pauta
- `trpc.juri.proximas` — Stats ribbon
- `trpc.avaliacaoJuri.registroPendentes` — Badge header
- Queries de jurados — Tab Jurados

---

## Plano de Implementação

| Fase | Tarefa | Descrição |
|------|--------|-----------|
| **1** | Extrair PautaTab | Mover lógica de `distribuicao/page.tsx` para componente `PautaTab.tsx` |
| **2** | Extrair SessoesTab | Criar lista de sessões limpa em `SessoesTab.tsx` (baseada no código atual mas simplificada) |
| **3** | Extrair JuradosTab | Criar wrapper que importa conteúdo de jurados |
| **4** | Reescrever page.tsx | Orquestrador com header + tabs + lazy loading |
| **5** | Atualizar sidebar | Simplificar JURI_SECTIONS |
| **6** | Cleanup | Remover páginas obsoletas, redirecionar rotas antigas |

---

## Considerações de Segurança

- Sem mudanças em autenticação/autorização — todas as rotas já usam `protectedProcedure`
- Sem mudanças em schema
- Sem novos endpoints

---

## Plano de Rollback

- Git revert do commit
- Páginas antigas preservadas até validação completa
- Redirects de `/admin/juri/distribuicao` → `/admin/juri?tab=pauta`
