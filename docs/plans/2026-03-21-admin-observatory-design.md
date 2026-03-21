# Admin Observatory — Design Document

**Data:** 2026-03-21
**Status:** Aprovado
**Autor:** Rodrigo Rocha Meire (via brainstorming)

---

## Objetivo

Painel exclusivo para o administrador acompanhar adoção, volume de trabalho, saúde técnica e alertas críticos da plataforma OMBUDS — projetado para escalar de 1 para 10+ defensores em múltiplas comarcas.

---

## Contexto

- **Usuário atual:** administrador único (Rodrigo)
- **Futuro:** extensível para coordenadores/gestores DPE-BA
- **Gatilho:** expansão para 10+ defensores em 5 comarcas (Camaçari, Salvador, Lauro de Freitas, Simões Filho, Candeias)
- **Filosofia de comparativo:** distribuição de carga e adoção de ferramentas — nunca ranking entre defensores

---

## Abordagem Escolhida

**Página única com scroll** — `/admin/observatory`

Página longa dividida em 5 blocos verticais. Seletor de período global (padrão: últimos 30 dias) afeta Adoção e Volume. Resumo Rápido e Saúde Técnica são sempre em tempo real. Alertas Críticos aparecem como banner fixo no topo apenas quando há condições ativas.

---

## Estrutura da Página

```
┌─────────────────────────────────────────────┐
│ 🔴 ALERTAS CRÍTICOS (banner, some se vazio) │
├─────────────────────────────────────────────┤
│ RESUMO RÁPIDO  [sempre 30 dias]             │
│ [Atendimentos] [Demandas] [Processos] [...]  │
├──────────────────────────[Período: ▼]───────┤
│ ADOÇÃO — quem está usando o quê             │
├─────────────────────────────────────────────┤
│ VOLUME — quanto trabalho está sendo feito   │
├─────────────────────────────────────────────┤
│ SAÚDE TÉCNICA — integrações e sistema       │
└─────────────────────────────────────────────┘
```

---

## Bloco 1: Alertas Críticos

Banner vermelho/âmbar que aparece automaticamente. Some quando não há alertas ativos.

| Alerta | Condição | Severidade | Ação |
|--------|----------|-----------|------|
| WhatsApp desconectado | `evolution_config.status != "connected"` | 🔴 crítico | → config instância |
| Defensor inativo | Sem login há >7 dias | 🔴 crítico | → perfil usuário |
| Convite expirado | Criado há >14 dias sem aceite | 🟡 aviso | → reenviar convite |
| Enrichment engine offline | Última chamada falhou | 🟡 aviso | → integrações |
| Solar sem sync | Última sync há >48h | 🟡 aviso | → sync |

**Comportamento:**
- 0 alertas → banner não renderiza
- 1–3 alertas → banner compacto
- 4+ alertas → banner expansível com contador
- Polling a cada 5 minutos (sem websocket)

**Fonte de dados:**
- `evolution_config.status` (WhatsApp)
- `users.updatedAt` / último login via `activity_logs`
- `user_invitations.createdAt` + `user_invitations.usedAt`
- Endpoint do enrichment engine (`/health`)
- `solar_sync_logs` ou similar

---

## Bloco 2: Resumo Rápido

6 cards fixos, sempre últimos 30 dias. Cada card mostra variação (↑↓%) vs. 30 dias anteriores.

| Card | Métrica | Fonte |
|------|---------|-------|
| Atendimentos | COUNT atendimentos no período | `atendimentos` |
| Demandas | COUNT demandas criadas | `demandas` |
| Processos | COUNT processos cadastrados | `processos` |
| Defensores ativos | COUNT logins últimos 3 dias / total | `activity_logs` |
| Assistidos novos | COUNT assistidos criados | `assistidos` |
| Análises IA | COUNT agent_analyses criadas | `agent_analyses` |

**Variação:** `(atual - anterior) / anterior * 100` — seta verde se positivo, vermelha se negativo, cinza se zero.

---

## Bloco 3: Adoção por Defensor

Tabela responsiva, período controlado pelo seletor global.

**Colunas:**
- Indicador de atividade (🟢🟡🔴)
- Nome do defensor
- Comarca
- Último acesso (relativo: "hoje", "ontem", "4d atrás")
- Atendimentos no período
- Demandas no período
- Processos no período
- Barra de onboarding (4 etapas)
- WhatsApp ✅/❌
- IA ✅/❌

**Indicador de atividade:**
- 🟢 ativo: login nos últimos 3 dias
- 🟡 morno: 4–7 dias sem login
- 🔴 inativo: >7 dias sem login → dispara alerta crítico

**Onboarding (4 etapas):**
1. Convite aceito
2. Primeiro login
3. Primeiro atendimento criado
4. Primeira demanda criada

**Filosofia de comparativo saudável:**
- Mostra volume absoluto de cada defensor (não % relativo entre colegas)
- Adoção de ferramentas é ✅/❌ (binário, não quantidade)
- Ordenação padrão: por comarca, não por volume

---

## Bloco 4: Volume de Trabalho

Três gráficos, período controlado pelo seletor global.

**A — Distribuição por comarca** (barras horizontais)
- Atendimentos totais agrupados por `comarcaId`
- Mostra onde está a carga — não quem trabalhou mais

**B — Tendência mensal** (linha, últimos 6 meses)
- Total de atendimentos da plataforma por mês
- Uma única linha — mostra crescimento de adoção

**C — Tipos de demanda** (donut)
- Agrupamento por `atribuicao` (crime comum, júri, VVD, execução penal, etc.)
- Útil para priorizar funcionalidades de IA por área

**Biblioteca:** Recharts (já em uso no projeto)

---

## Bloco 5: Saúde Técnica

Status em tempo real. Sem seletor de período.

**Seção WhatsApp:**
- Uma linha por instância em `evolution_config`
- Status: 🟢 conectado / 🔴 desconectado / 🟡 QR pendente
- Ação inline: "Reconectar" ou "Escanear QR"

**Seção Integrações:**
- Enrichment Engine: status + timestamp última chamada bem-sucedida
- Solar DPEBA: timestamp última sync
- Google Drive: status + quota usada

**Seção Infraestrutura:**
- Banco de dados: latência média (ping)
- Vercel: timestamp último deploy

---

## Fonte de Dados — Novo Router tRPC

Criar `src/lib/trpc/routers/observatory.ts` com procedures:

```typescript
// adminProcedure (apenas admin)
getAlertas()           // polling 5min
getResumoRapido()      // últimos 30 dias + 30 anteriores
getAdocao(periodo)     // por defensor, período variável
getVolume(periodo)     // por comarca + tendência + tipos
getSaudeTecnica()      // tempo real
```

---

## Requisitos Técnicos

- **Rota:** `/admin/observatory` — nova página, sem conflito com rotas existentes
- **Permissão:** `adminProcedure` (apenas `role === "admin"`)
- **Polling:** `refetchInterval: 5 * 60 * 1000` nos cards de alertas e saúde técnica
- **Gráficos:** Recharts (já instalado)
- **Sem novas tabelas** — toda informação já existe no schema
- **Sidebar:** adicionar "Observatory" ao grupo de admin com ícone `Activity` (Lucide)

---

## O que NÃO está no escopo (v1)

- Export para PDF/Excel
- Notificações por e-mail/WhatsApp (pode vir depois)
- Customização de widgets pelo usuário
- Acesso para outros gestores (além do admin)
- Histórico de alertas

---

## Critérios de Sucesso

- [ ] Admin consegue saber em <30 segundos se alguma integração está offline
- [ ] Admin consegue identificar defensores que precisam de suporte de onboarding
- [ ] Comparativo de volume nunca expõe ranking individual entre defensores
- [ ] Página carrega em <2s (queries paralelas via tRPC batch)
