# TDD: Expansão Multi-Comarca do OMBUDS

**Data:** 2026-03-16
**Status:** Design aprovado
**Autor:** Rodrigo + Claude

## Contexto

O OMBUDS nasceu para a 7ª Regional (Camaçari). O objetivo de longo prazo é expandir para todas as comarcas da Bahia, e potencialmente substituir o sistema Solar da DPE-BA.

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Arquitetura | Banco único, isolamento lógico por `comarca` | Supabase suporta RLS; estatísticas globais triviais; manutenção centralizada |
| Features | Completas como meta, progressão controlada | Integrações (Drive, WhatsApp, Enrichment) dependem de config/credenciais por comarca |
| Importações | Nível 1 (core) | PJe/iCal são funcionalidades locais sem dependência de infra |
| Onboarding | Convite por admin | Crescimento orgânico e controlado |
| Hierarquia | Super-admin único (Rodrigo) → admin por regional depois | Simples agora, escalável quando necessário |
| Drive | Múltiplos por comarca, configurável por defensor | Flexibilidade: drive pessoal ou compartilhado |
| Assistidos/Processos | Filtro por comarca (padrão) + toggle "todas as comarcas" | Evita duplicação cross-comarca |

## Modelo de Dados

### Nova tabela: `comarcas`

```sql
CREATE TABLE comarcas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  regional VARCHAR(50),         -- "7ª Regional", "1ª Regional"
  uf VARCHAR(2) DEFAULT 'BA',   -- futuro: outros estados
  ativo BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',  -- { drive: bool, whatsapp: bool, enrichment: bool, calendar_sync: bool }
  config JSONB DEFAULT '{}',    -- configurações específicas (credenciais, URLs)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Alterações em tabelas existentes

- `users.comarca` → referência para `comarcas.nome` (ou adicionar `comarcaId INT REFERENCES comarcas(id)`)
- `assistidos` → adicionar `comarcaId`
- `drive_sync_folders` → adicionar `comarcaId` (já tem `createdById` para isolamento por defensor)

### Isolamento de dados

| Entidade | Padrão | Opção |
|----------|--------|-------|
| Demandas | Privada por defensor | Delegação (já existe) |
| Assistidos | Filtro por comarca | Toggle "todas as comarcas" |
| Processos | Filtro por comarca | Toggle "todas as comarcas" |
| Agenda | Comarca + compartilhamento interno | Configurável por comarca |
| Drive | Por defensor/comarca, configurável | Múltiplos drives por comarca |
| Estatísticas | Por comarca | Visão global (super-admin) |

## Níveis de Funcionalidade

### Nível 1 — Core (disponível para todos desde o início)

- Demandas (criar, gerenciar, delegar)
- Assistidos (cadastro, busca, histórico)
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
- Radar criminal (fontes locais)
- Transcrição de audiências (Plaud)
- IA/análise de casos

## Implementação Técnica

### Middleware `comarcaScope`

```typescript
// src/lib/trpc/comarca-scope.ts
export function getComarcaId(user: User): number {
  return user.comarcaId;
}

export function getComarcaFilter(user: User, opts?: { global?: boolean }) {
  if (opts?.global) return []; // toggle "todas as comarcas"
  return [eq(table.comarcaId, getComarcaId(user))];
}
```

### Sidebar condicional

```typescript
const { data: comarca } = trpc.comarcas.getMinhaComarca.useQuery();
// Menu items filtrados por comarca.features
{comarca?.features.drive && <DriveMenuItem />}
{comarca?.features.whatsapp && <WhatsAppMenuItem />}
```

## Migração Segura

**Princípio:** Camaçari não pode quebrar. Toda mudança é aditiva.

1. Criar tabela `comarcas` e popular Camaçari (features: all true)
2. Adicionar `comarcaId` nas tabelas (nullable primeiro → popular → NOT NULL)
3. Criar middleware `comarcaScope`
4. Sidebar condicional por features
5. Tela de convite (super-admin)
6. Popular comarcas da metropolitana + Salvador

## Roadmap

| Fase | O que | Quando |
|------|-------|--------|
| **0** | Fechar pendências Camaçari (escala, agenda, drive) | Agora |
| **1** | Tabela comarcas + comarcaScope + sidebar condicional | Quando decidir expandir |
| **2** | Convite de defensores + onboarding | Primeiro colega interessado |
| **3** | Multi-drive + config por comarca | Quando Nível 2 for necessário |
| **4** | Dashboard estadual + estatísticas cruzadas | Com 3+ comarcas ativas |
| **5** | Admin por regional | Com 10+ comarcas |

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Performance com muitas comarcas | Índice em `comarcaId`, queries já filtram por comarca |
| Credenciais Drive/WhatsApp por comarca | Campo `config` jsonb na tabela comarcas, encriptado |
| Defensor vê dados de outra comarca | RLS no Supabase + comarcaScope no tRPC (defense-in-depth) |
| Sobrecarga de admin (super-admin único) | Fase 5 adiciona admin por regional |
| Integração Solar varia por comarca | Enrichment Engine já é modular, basta config por comarca |
