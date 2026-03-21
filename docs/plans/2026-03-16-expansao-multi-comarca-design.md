# TDD: Expansão Multi-Comarca do OMBUDS

**Data:** 2026-03-16
**Atualizado:** 2026-03-20
**Status:** Design aprovado (v2 — modelo de visibilidade em 3 camadas)
**Autor:** Rodrigo + Claude

## Contexto

O OMBUDS nasceu para a 7ª Regional (Camaçari). O objetivo de longo prazo é expandir para todas as comarcas da Bahia, e potencialmente substituir o sistema Solar da DPE-BA.

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Arquitetura | Banco único, isolamento lógico por `comarcaId` | Supabase suporta RLS; estatísticas globais triviais; manutenção centralizada |
| Features | Completas como meta, progressão controlada | Integrações (Drive, WhatsApp, Enrichment) dependem de config/credenciais por comarca |
| Importações | Nível 1 (core) | PJe/iCal são funcionalidades locais sem dependência de infra |
| Onboarding | Convite por admin | Crescimento orgânico e controlado |
| Hierarquia | Super-admin único (Rodrigo) → admin por regional depois | Simples agora, escalável quando necessário |
| Drive | Múltiplos por comarca, configurável por defensor | Flexibilidade: drive pessoal ou compartilhado |
| Assistidos/Processos | **Modelo 3 camadas** (ver seção abaixo) | Foco no dia a dia + flexibilidade cross-comarca quando necessário |

## Modelo de Visibilidade de Assistidos — 3 Camadas

Este é o coração do isolamento. As três camadas são avaliadas em `OR` — o assistido aparece se atender qualquer uma.

### Camada 1 — Padrão (comarca própria)

Comportamento padrão. Defensor vê apenas assistidos cadastrados na sua comarca.

```
comarcaId do assistido = comarcaId do defensor
```

### Camada 2 — Toggle opcional (Região Metropolitana / Salvador)

O defensor pode ativar manualmente para cruzar dados regionais. Preferência salva em `user_settings`.

```
Toggle "Ver RMS" → expande para todas as comarcas da Região Metropolitana de Salvador
Toggle "Ver Salvador" → inclui também a capital
```

Comarcas da RMS para o filtro:
- Camaçari, Lauro de Freitas, Simões Filho, Dias d'Ávila, Candeias,
  São Francisco do Conde, Madre de Deus, São Sebastião do Passé

### Camada 3 — Automática (assistido com processo na comarca)

Sem necessidade de toggle. Se um assistido de outra comarca tem processo tramitando na comarca do defensor, ele aparece automaticamente — com integração completa (processos, audiências, demandas vinculadas).

**Caso de uso:** réu de Salvador com processo em Camaçari — o defensor de Camaçari vê a ficha completa do assistido, incluindo processos, sem precisar acionar nada.

```sql
-- Assistidos visíveis para defensor (comarcaId = X):
WHERE assistidos.comarcaId = X                          -- Camada 1
UNION
WHERE assistidos.comarcaId IN (:rms_comarca_ids)        -- Camada 2 (se toggle ativo)
UNION
WHERE EXISTS (                                           -- Camada 3 (sempre)
  SELECT 1 FROM assistidos_processos ap
  JOIN processos p ON p.id = ap.processo_id
  WHERE ap.assistido_id = assistidos.id
    AND p.comarcaId = X
)
```

### Indicadores visuais na UI

| Situação | Visual |
|----------|--------|
| Assistido da comarca própria | Normal, sem marcação |
| Assistido de outra comarca via toggle | Badge com nome da comarca (ex: `· Salvador`) |
| Assistido de outra comarca via processo local | Badge da comarca + ícone de processo vinculado |

### Isolamento por entidade

| Entidade | Padrão | Opção |
|----------|--------|-------|
| Demandas | Privada por defensor (já implementado) | Delegação (já existe) |
| Assistidos | Comarca própria (Camada 1) | Toggle RMS/Salvador (Camada 2) + processo local automático (Camada 3) |
| Processos | Filtro por comarca | Toggle segue o de assistidos |
| Configs (WhatsApp, Drive, Evolution) | Por comarca | Sem cross-comarca |
| Agenda | Comarca + compartilhamento interno | Configurável por comarca |
| Radar criminal | Comarca própria | Toggle "Ver RMS" expande o radar |
| Estatísticas | Por comarca | Visão global (super-admin) |

## Modelo de Dados

### Nova tabela: `comarcas`

```sql
CREATE TABLE comarcas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  regional VARCHAR(50),         -- "7ª Regional", "1ª Regional"
  regiao_metro VARCHAR(50),     -- "RMS", "RMF" etc. — para filtro da Camada 2
  uf VARCHAR(2) DEFAULT 'BA',   -- futuro: outros estados
  ativo BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',  -- { drive: bool, whatsapp: bool, enrichment: bool, calendar_sync: bool }
  config JSONB DEFAULT '{}',    -- configurações específicas (credenciais, URLs)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial
INSERT INTO comarcas (nome, regional, regiao_metro, features) VALUES
  ('Camaçari',              '7ª Regional', 'RMS', '{"drive":true,"whatsapp":true,"enrichment":true,"calendar_sync":true}'),
  ('Salvador',              '1ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Lauro de Freitas',      '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Simões Filho',          '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Dias d''Ávila',         '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Candeias',              '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Francisco do Conde','7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('Madre de Deus',         '7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}'),
  ('São Sebastião do Passé','7ª Regional', 'RMS', '{"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}');
```

### Alterações em tabelas existentes

| Tabela | Alteração | Observação |
|--------|-----------|------------|
| `users` | Adicionar `comarcaId INT REFERENCES comarcas(id)` | Substituir `comarca varchar` atual |
| `assistidos` | Adicionar `comarcaId INT REFERENCES comarcas(id)` | Nullable → popular → NOT NULL |
| `processos` | Adicionar `comarcaId INT REFERENCES comarcas(id)` | `comarca varchar` já existe, adicionar FK |
| `drive_sync_folders` | Adicionar `comarcaId` | Isolamento de Drive por comarca |
| `evolution_config` | Adicionar `comarcaId` | Cada comarca tem sua instância WhatsApp |
| `whatsapp_config` | Adicionar `comarcaId` | Idem |
| `escalas_atribuicao` | Adicionar `comarcaId` | Escala é por comarca |

## Implementação Técnica

### `comarca-scope.ts`

```typescript
// src/lib/trpc/comarca-scope.ts
import { eq, or, inArray, exists } from "drizzle-orm";
import type { User } from "@/lib/db/schema";

// Comarcas da Região Metropolitana de Salvador
export const RMS_COMARCA_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // populado após seed

export function getComarcaId(user: User): number {
  return user.comarcaId!;
}

/**
 * Filtro de visibilidade de assistidos — 3 camadas em OR
 */
export function getAssistidosFilter(
  user: User,
  opts?: { verRMS?: boolean }
) {
  const comarcaId = getComarcaId(user);
  const camadas = [];

  // Camada 1: comarca própria (sempre)
  camadas.push(eq(assistidos.comarcaId, comarcaId));

  // Camada 2: toggle RMS (opcional)
  if (opts?.verRMS) {
    camadas.push(inArray(assistidos.comarcaId, RMS_COMARCA_IDS));
  }

  // Camada 3: assistido com processo na comarca (sempre automático)
  camadas.push(
    exists(
      db.select({ one: sql`1` })
        .from(assistidosProcessos)
        .innerJoin(processos, eq(processos.id, assistidosProcessos.processoId))
        .where(and(
          eq(assistidosProcessos.assistidoId, assistidos.id),
          eq(processos.comarcaId, comarcaId)
        ))
    )
  );

  return or(...camadas);
}

/**
 * Filtro simples por comarca (para entidades sem as 3 camadas)
 * Ex: agenda, configs, escala
 */
export function getComarcaFilter(user: User) {
  return eq(table.comarcaId, getComarcaId(user));
}
```

### Sidebar condicional por features

```typescript
const { data: comarca } = trpc.comarcas.getMinhaComarca.useQuery();

{comarca?.features.drive      && <DriveMenuItem />}
{comarca?.features.whatsapp   && <WhatsAppMenuItem />}
{comarca?.features.enrichment && <EnrichmentMenuItem />}
```

### Preferência de toggle (user_settings)

```typescript
// Salvo em user_settings.settings JSONB
{
  "comarcaVisibilidade": {
    "verRMS": true,
    "verSalvador": false
  }
}
```

## Migração Segura

**Princípio:** Camaçari não pode quebrar. Toda mudança é aditiva.

1. Criar tabela `comarcas` + seed com Camaçari e comarcas da RMS
2. Adicionar `comarcaId` nas tabelas (nullable → `UPDATE ... SET comarca_id = 1` → NOT NULL)
3. Criar `comarca-scope.ts` com as 3 camadas
4. Aplicar filtro nos routers: `assistidos.list`, `processos.list`, `radar.list`
5. Sidebar condicional por `comarca.features`
6. Tela de convite (super-admin define comarca ao convidar)
7. Toggle "Ver RMS" na UI de assistidos (salvo em user_settings)

## Níveis de Funcionalidade

### Nível 1 — Core (disponível para todos desde o início)

- Demandas (criar, gerenciar, delegar)
- Assistidos (cadastro, busca, histórico) — com modelo de 3 camadas
- Processos (vinculação, acompanhamento)
- Agenda (eventos, audiências, prazos)
- Escala de revezamento (configurável por comarca)
- Importação PJe (demandas e agenda)
- Importação iCal
- Estatísticas básicas (dashboard por comarca)

### Nível 2 — Integrações (habilitado por comarca quando configurado)

- Google Drive (pasta própria ou compartilhada)
- WhatsApp (instância Evolution API própria)
- Google Calendar sync
- Notificações avançadas

### Nível 3 — Avançado (requer infra dedicada)

- Enrichment Engine (Solar/SIGAD scraping)
- Radar criminal (fontes locais + toggle RMS)
- Transcrição de audiências (Plaud)
- IA/análise de casos

## Roadmap

| Fase | O que | Quando |
|------|-------|--------|
| **0** | Fechar pendências Camaçari (escala, agenda, drive) | Agora |
| **1** | Tabela comarcas + comarcaScope (3 camadas) + sidebar condicional | Quando decidir expandir |
| **2** | Convite de defensores + onboarding com comarca pré-definida | Primeiro colega interessado |
| **3** | Toggle "Ver RMS" na UI + preferência em user_settings | Junto com Fase 2 |
| **4** | Multi-drive + config por comarca | Quando Nível 2 for necessário |
| **5** | Dashboard estadual + estatísticas cruzadas por região | Com 3+ comarcas ativas |
| **6** | Admin por regional | Com 10+ comarcas |

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Performance com muitas comarcas | Índice em `comarcaId`; Camada 3 usa EXISTS (para com o primeiro match) |
| Credenciais Drive/WhatsApp expostas cross-comarca | `comarcaId` em evolution_config, whatsapp_config — cada comarca vê só a sua |
| Defensor vê dados de outra comarca sem toggle | RLS no Supabase + comarcaScope no tRPC (defense-in-depth) |
| Sobrecarga de admin (super-admin único) | Fase 6 adiciona admin por regional |
| Integração Solar varia por comarca | Enrichment Engine já é modular, basta config por comarca |
| Assistido duplicado cross-comarca (mesmo CPF) | Camada 3 resolve — o assistido é único, só a visibilidade varia |
