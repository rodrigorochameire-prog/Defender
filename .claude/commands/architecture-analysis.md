# /architecture-analysis - Análise de Arquitetura

> **Tipo**: Workflow Especializado
> **Fonte**: Architecture Skills (Tech Leads Club - DDD Strategic Design)
> **Uso**: Análise de domínios, componentes e decomposição

## Descrição

Skill para análise arquitetural seguindo princípios de Domain-Driven Design (DDD). Identifica subdomínios, bounded contexts, analisa coesão de componentes e planeja decomposição.

---

## Domínios do OMBUDS

### Core Domain (Vantagem Competitiva)

O **Core Domain** do OMBUDS é a gestão integrada de assistidos e seus casos jurídicos:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASSISTIDO (Centro)                        │
│                                                                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │ Processos│────│ Demandas │────│  Casos   │────│ Audiências│  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │Diligências│────│Documentos│────│Investigação│                │
│   └──────────┘    └──────────┘    └──────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Supporting Subdomains (Suporte ao Core)

| Subdomínio | Descrição | Componentes |
|------------|-----------|-------------|
| **Agenda** | Gerenciamento de audiências e compromissos | Calendar, eventos |
| **Workflow** | Fluxo de trabalho e atribuições | Demandas, distribuição |
| **Relatórios** | Dashboards e KPIs | Stats, métricas |

### Generic Subdomains (Funcionalidade Comum)

| Subdomínio | Descrição | Solução |
|------------|-----------|---------|
| **Auth** | Autenticação/Autorização | NextAuth |
| **Storage** | Armazenamento de arquivos | Supabase Storage |
| **Notifications** | Notificações | Future: Plaud/WhatsApp |
| **AI/LLM** | Processamento de linguagem | Gemini API |

---

## Análise de Bounded Contexts

### Contexto: Assistido

**Linguagem Ubíqua:**
- Assistido, CPF, RG, endereço, contato
- Representante legal, vulnerabilidade social

**Entidades:**
```typescript
// Entidade central - todos os outros contextos referenciam
assistidos
├── id, nome, cpf, rg
├── endereco, telefone, email
├── dataNascimento, sexo
└── createdAt, updatedAt, deletedAt
```

### Contexto: Caso Jurídico

**Linguagem Ubíqua:**
- Caso, processo, número CNJ, vara
- Polo ativo, polo passivo, tipo de ação

**Entidades:**
```typescript
casos
├── assistidoId (FK → assistidos)
├── numeroCaso, numeroProcesso
├── vara, comarca, tribunal
├── tipoAcao, assunto
└── status, prioridade
```

### Contexto: Demandas

**Linguagem Ubíqua:**
- Demanda, atribuição, status, prazo
- Tribunal do Júri, Violência Doméstica, Execução Penal

**Entidades:**
```typescript
demandas
├── casoId (FK → casos)
├── atribuicao (enum: TRIBUNAL_JURI, VD, EXEC_PENAL...)
├── status (enum: PENDENTE, EM_ANDAMENTO, CONCLUIDA...)
├── prazo, prioridade
└── descricao, observacoes
```

---

## Análise de Componentes

### Estrutura Atual do OMBUDS

```
src/
├── app/                    # Next.js App Router
│   ├── admin/              # Páginas administrativas
│   │   ├── assistidos/     # ← Componente: Gestão de Assistidos
│   │   ├── casos/          # ← Componente: Gestão de Casos
│   │   ├── demandas/       # ← Componente: Gestão de Demandas
│   │   ├── agenda/         # ← Componente: Agenda
│   │   └── dashboard/      # ← Componente: Dashboard
│   └── api/                # API Routes
├── components/
│   ├── shared/             # ← Componente Compartilhado
│   └── ui/                 # ← Componente UI (Generic)
├── lib/
│   ├── db/                 # ← Infraestrutura: Banco
│   ├── trpc/               # ← Infraestrutura: API
│   └── services/           # ← Serviços de Integração
└── config/                 # ← Configuração
```

### Métricas de Componentes

Execute para análise de tamanho:

```bash
# Contar statements por diretório
find src/app/admin -name "*.tsx" -exec wc -l {} + | sort -n

# Listar componentes por tamanho
find src/components -name "*.tsx" | xargs wc -l | sort -n

# Verificar dependências circulares
npx madge --circular src/
```

---

## Análise de Coesão

### Critérios de Avaliação

| Critério | Pontuação | Descrição |
|----------|-----------|-----------|
| Linguística | 0-3 | Vocabulário compartilhado |
| Uso | 0-3 | Frequência de uso conjunto |
| Dados | 0-2 | Relacionamentos de entidade |
| Mudança | 0-2 | Mudam juntos |

**Score Total: /10**
- 8-10: Alta Coesão ✅
- 5-7: Média Coesão ⚠️
- 0-4: Baixa Coesão ❌

### Exemplo de Análise

```markdown
## Análise: Componente Demandas

**Coesão Linguística:** 3/3
- Vocabulário consistente: demanda, atribuição, status, prazo

**Coesão de Uso:** 2/3
- Usado com Casos frequentemente
- Relacionamento direto com Assistidos

**Coesão de Dados:** 2/2
- FK para casos (que FK para assistidos)
- Entidades bem relacionadas

**Coesão de Mudança:** 2/2
- Mudanças em demandas afetam filtros e listagens
- Alterações são localizadas

**Score Total:** 9/10 ✅ Alta Coesão
```

---

## Detecção de Problemas

### Problema 1: Mistura de Vocabulário

```typescript
// ❌ ERRADO - Mistura contextos
function DemandaCard({ demanda, assistido, usuario }) {
  // Três contextos diferentes no mesmo componente
}

// ✅ CORRETO - Contexto único
function DemandaCard({ demanda }: { demanda: DemandaWithCaso }) {
  // Acessa assistido via demanda.caso.assistido
}
```

### Problema 2: Dependência Cruzada

```typescript
// ❌ ERRADO - Demandas depende diretamente de Usuarios
import { getUsuarioAtual } from "@/lib/auth";

export async function getDemandas() {
  const usuario = await getUsuarioAtual();
  // ...
}

// ✅ CORRETO - Recebe contexto de autenticação
export async function getDemandas(ctx: TRPCContext) {
  const { session } = ctx;
  // ...
}
```

### Problema 3: Código Genérico no Core

```typescript
// ❌ ERRADO - Email sending no core
export async function criarDemanda(data: DemandaInput) {
  const demanda = await db.insert(demandas).values(data);
  await sendEmail(data.responsavel, "Nova demanda"); // Generic no Core
  return demanda;
}

// ✅ CORRETO - Separar preocupações
export async function criarDemanda(data: DemandaInput) {
  const demanda = await db.insert(demandas).values(data);
  // Evento emitido, Generic subdomain escuta
  return demanda;
}
```

---

## Padrões de Integração entre Contextos

### Anti-Corruption Layer (ACL)

Para integração com sistemas externos:

```typescript
// lib/services/gemini/acl.ts
export class GeminiACL {
  // Traduz modelo interno → formato Gemini
  static toGeminiPrompt(demanda: Demanda): string {
    return `Analise a seguinte demanda jurídica: ${demanda.descricao}`;
  }

  // Traduz resposta Gemini → modelo interno
  static fromGeminiResponse(response: GeminiResponse): Analise {
    return {
      resumo: response.text,
      sugestoes: extractSugestoes(response),
    };
  }
}
```

### Shared Kernel

Conceitos compartilhados entre contextos (usar com moderação):

```typescript
// lib/shared/types.ts
export type Status = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
export type Prioridade = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

// Usado por Demandas, Casos, Diligências
```

---

## Roadmap de Decomposição

### Fase 1: Análise (1-2 semanas)

- [ ] Mapear todos os componentes
- [ ] Calcular métricas de tamanho
- [ ] Identificar problemas de coesão
- [ ] Documentar bounded contexts

### Fase 2: Organização (2-4 semanas)

- [ ] Agrupar componentes por domínio
- [ ] Separar código genérico
- [ ] Criar ACLs para integrações
- [ ] Refatorar imports cruzados

### Fase 3: Otimização (contínuo)

- [ ] Monitorar crescimento de componentes
- [ ] Revisar coesão periodicamente
- [ ] Documentar decisões arquiteturais (ADRs)

---

## Checklist de Análise

### Para Novos Componentes

- [ ] Qual bounded context pertence?
- [ ] Qual a linguagem ubíqua?
- [ ] Quais dependências terá?
- [ ] É Core, Supporting ou Generic?
- [ ] Score de coesão esperado?

### Para Refatorações

- [ ] A mudança cruza bounded contexts?
- [ ] Afeta linguagem ubíqua?
- [ ] Introduz dependência cruzada?
- [ ] Mantém coesão alta?

---

## Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `analisar domínio` | Mapear bounded contexts |
| `analisar componente [nome]` | Calcular coesão |
| `detectar problemas` | Listar issues de arquitetura |
| `planejar decomposição` | Criar roadmap |
