# Status System & Kanban Premium Redesign

**Data**: 2026-03-07
**Status**: Em implementação

## Decisões do Brainstorming

### Arquitetura de Status

**4 Colunas Kanban** (em vez das 7 atuais):
1. **Triagem** — Nova demanda, precisa de decisão
2. **Em Andamento** — Expandível em 3 sub-colunas:
   - **Preparação**: elaborar, elaborando, revisar, revisando, analisar, relatorio
   - **Diligências**: documentos, testemunhas, investigar, buscar, oficiar
   - **Saída**: protocolar, monitorar
3. **Concluída** — Protocolado, ciência, resolvido, constituiu advogado, sem atuação
4. **Arquivado** — Off-kanban, lista separada com batch archive

### 20 Status + 2 Flags

**Triagem (3):** fila, atender, urgente
**Preparação (6):** elaborar, elaborando, analisar, relatorio, revisar, revisando
**Diligências (5):** documentos, testemunhas, investigar, buscar, oficiar
**Saída (2):** protocolar, monitorar
**Concluída (5):** protocolado, ciencia, resolvido, constituiu_advogado, sem_atuacao
**Arquivado (1):** arquivado

**Flags:** 🔴 Urgente, ⏳ Aguardando (overlays, não colunas)

### UI/UX Design: Linear + Premium

**Estilo**: Linear-style clean com toques Dashboard-premium
- Cards flat com shadow sutil, hover lift + border-emerald
- 4 camadas: initials+nome, ato, processo, status+prazo
- Split animado com CSS Grid para expandir "Em Andamento"
- **Destaque forte na cor do grupo** (feedback final do usuário):
  - Barra lateral esquerda 3px na cor do grupo (não da atribuição)
  - Header da coluna com fundo tinted na cor do grupo
  - Badge de status com fundo mais saturado (20% opacidade vs 6% atual)

### Cores dos Grupos

| Grupo | Cor | Uso |
|-------|-----|-----|
| Triagem | `#A1A1AA` (zinc) | Fila, entrada |
| Preparação | `#E8C87A` (amber) | Trabalho ativo |
| Diligências | `#8DB4D2` (blue) | Investigação |
| Saída | `#D4A574` (orange) | Protocolo/envio |
| Concluída | `#84CC9B` (green) | Finalizado |
| Arquivado | `#71717A` (dark zinc) | Off-kanban |

### Mapeamento DB → Frontend

DB `status` enum | DB `substatus` | Frontend grupo
--- | --- | ---
5_FILA | null | Triagem
2_ATENDER | null | Triagem
URGENTE | null | Triagem (flag)
5_FILA | elaborar/elaborando/analisar/relatorio/revisar/revisando | Preparação
5_FILA | documentos/testemunhas/investigar/buscar/oficiar | Diligências
5_FILA | protocolar/monitorar | Saída
7_PROTOCOLADO | * | Concluída
7_CIENCIA | * | Concluída
7_SEM_ATUACAO | * | Concluída
CONCLUIDO | * | Concluída
ARQUIVADO | * | Arquivado

### Implementação

1. Refatorar `demanda-status.ts` — nova estrutura de grupos e mapeamento
2. Criar componente `KanbanPremium` — substituir inline kanban atual
3. Integrar no `demandas-premium-view.tsx`
4. (Futuro) Migration DB para status configurável via Settings
