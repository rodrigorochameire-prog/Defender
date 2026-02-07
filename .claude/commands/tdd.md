# /tdd - Technical Design Document

> **Tipo**: Workflow de Documentação Técnica
> **Fonte**: Tech Leads Club - Create Technical Design Doc
> **Trigger**: "criar TDD", "design doc", "documentar feature", "especificação técnica"

## Descrição

Criar documentos de design técnico completos para features do OMBUDS, seguindo padrões de indústria (Google, Amazon, RFC).

---

## Quando Usar

- Antes de implementar features complexas (>1 semana)
- Integrações com sistemas externos (Gemini, WhatsApp, Calendar)
- Mudanças arquiteturais significativas
- Features que envolvem dados sensíveis (PII, jurídicos)
- Quando precisa de alinhamento com stakeholders

---

## Estrutura do TDD

### Seções Obrigatórias

1. **Cabeçalho & Metadados**
2. **Contexto**
3. **Definição do Problema**
4. **Escopo** (Dentro / Fora)
5. **Solução Técnica**
6. **Riscos**
7. **Plano de Implementação**

### Seções Críticas (para OMBUDS)

8. **Considerações de Segurança** - OBRIGATÓRIO (dados jurídicos sensíveis)
9. **Estratégia de Testes**
10. **Monitoramento**
11. **Plano de Rollback**

### Seções Sugeridas

12. Métricas de Sucesso
13. Glossário Jurídico
14. Alternativas Consideradas
15. Dependências
16. Requisitos de Performance

---

## Template Completo

```markdown
# TDD - [Nome da Feature]

| Campo | Valor |
|-------|-------|
| Tech Lead | @Nome |
| Time | Nomes |
| Status | Rascunho / Em Revisão / Aprovado |
| Criado | YYYY-MM-DD |
| Atualizado | YYYY-MM-DD |

---

## Contexto

[2-4 parágrafos descrevendo o contexto]

**Domínio**: [Assistidos / Casos / Demandas / Agenda / Investigação]

**Stakeholders**: [Defensores, Assistidos, Gestores]

---

## Definição do Problema

### Problemas que Estamos Resolvendo

- **Problema 1**: [Descrição com impacto]
  - Impacto: [quantificar se possível]
- **Problema 2**: [Descrição]
  - Impacto: [quantificar]

### Por Que Agora?

- [Driver de negócio / técnico / usuário]

### Impacto de NÃO Resolver

- **Defensores**: [impacto]
- **Assistidos**: [impacto]
- **Sistema**: [impacto técnico]

---

## Escopo

### ✅ Dentro do Escopo (V1)

- Feature/capacidade 1
- Feature/capacidade 2
- Feature/capacidade 3

### ❌ Fora do Escopo (V1)

- Feature X (adiada para V2)
- Integração Y (não necessária para MVP)

### 🔮 Considerações Futuras (V2+)

- Feature A
- Feature B

---

## Solução Técnica

### Visão Geral da Arquitetura

[Descrição de alto nível da solução]

**Componentes Principais**:

- Componente A: [responsabilidade]
- Componente B: [responsabilidade]

**Diagrama de Arquitetura**:

\`\`\`mermaid
graph LR
    A[Frontend] -->|tRPC| B[Backend]
    B -->|Drizzle| C[(PostgreSQL)]
    B -->|API| D[Serviço Externo]
\`\`\`

### Fluxo de Dados

1. **Passo 1**: Ação do usuário → Frontend
2. **Passo 2**: Frontend → tRPC Router
3. **Passo 3**: Router → Service Layer
4. **Passo 4**: Service → Banco de Dados
5. **Passo 5**: Resposta → Frontend

### APIs & Endpoints (tRPC)

| Procedure | Tipo | Descrição | Input | Output |
|-----------|------|-----------|-------|--------|
| `create` | mutation | Cria recurso | `CreateInput` | `Resource` |
| `getById` | query | Busca por ID | `string` | `Resource` |
| `list` | query | Lista recursos | `ListInput` | `Resource[]` |

**Exemplo de Input/Output**:

\`\`\`typescript
// Input
{
  nome: "João Silva",
  cpf: "12345678901",
  casoId: "uuid"
}

// Output
{
  id: "uuid",
  nome: "João Silva",
  createdAt: "2024-01-01T00:00:00Z"
}
\`\`\`

### Mudanças no Banco de Dados

**Novas Tabelas**:

- `nova_tabela` - [descrição]
  - Campos: id, nome, status, createdAt, updatedAt, deletedAt
  - Índices: status (para filtros)
  - FK: casoId → casos

**Alterações em Tabelas Existentes**:

- Adicionar coluna `novoCampo` em `tabela_existente`
  - Tipo: varchar/integer/jsonb
  - Nullable: sim/não

**Estratégia de Migração**:

- Gerar migration com `npm run db:generate`
- Testar em staging primeiro
- Executar em janela de baixo tráfego
- Ter migration de rollback pronta

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| API externa indisponível | Alto | Média | Circuit breaker, cache, modo degradado |
| Migração de dados falha | Alto | Baixa | Testar em staging, dry-run, script de rollback |
| Performance degradada | Médio | Média | Load test antes do deploy, caching, monitorar latência |
| Vulnerabilidade de segurança | Alto | Baixa | Security review, OWASP guidelines |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Estimativa | Status |
|------|--------|-----------|------------|--------|
| **Fase 1 - Setup** | Schema | Criar tabelas e migrations | 1d | ⬜ |
| | Router | Criar router tRPC base | 1d | ⬜ |
| **Fase 2 - Core** | Services | Implementar lógica de negócio | 3d | ⬜ |
| | Validação | Schemas Zod e validações | 1d | ⬜ |
| **Fase 3 - UI** | Página | Criar página admin | 2d | ⬜ |
| | Componentes | Componentes específicos | 2d | ⬜ |
| **Fase 4 - Testes** | Unitários | Testar services | 1d | ⬜ |
| | E2E | Testar fluxo completo | 1d | ⬜ |
| **Fase 5 - Deploy** | Staging | Deploy e smoke test | 0.5d | ⬜ |
| | Produção | Rollout gradual | 0.5d | ⬜ |

**Estimativa Total**: ~13 dias

---

## Considerações de Segurança

### Autenticação & Autorização

- **Autenticação**: NextAuth com sessões
- **Autorização**: Verificar se usuário tem acesso ao recurso
- Usar `protectedProcedure` em todos os endpoints

### Proteção de Dados

**Criptografia**:

- Em repouso: PostgreSQL encryption (Supabase)
- Em trânsito: TLS 1.3

**Dados Sensíveis (PII)**:

- CPF, RG: Armazenar com cuidado
- Dados jurídicos: Acesso restrito por caso
- Soft delete: Nunca deletar permanentemente

### Boas Práticas

- ✅ Validação de input com Zod
- ✅ Prevenção de SQL injection (Drizzle ORM)
- ✅ Rate limiting em endpoints públicos
- ✅ Audit logging para operações sensíveis

---

## Estratégia de Testes

| Tipo | Escopo | Cobertura | Abordagem |
|------|--------|-----------|-----------|
| Unitários | Services, utils | > 80% | Vitest com mocks |
| Integração | tRPC endpoints | Paths críticos | Test DB |
| E2E | Fluxos completos | Happy path + erros | Playwright |

### Cenários de Teste

**Unitários**:
- ✅ Lógica de negócio do service
- ✅ Validações Zod
- ✅ Tratamento de erros

**E2E**:
- ✅ Usuário cria recurso → sucesso
- ✅ Usuário tenta acessar recurso de outro → negado
- ✅ Validação falha → mensagem de erro clara

---

## Monitoramento

### Métricas

| Métrica | Tipo | Alerta |
|---------|------|--------|
| `api.latency` | Latência | p95 > 1s por 5min |
| `api.errors` | Taxa de erro | > 1% por 5min |
| `db.query_time` | Duração | p95 > 100ms |

### Logs Estruturados

\`\`\`json
{
  "level": "info",
  "timestamp": "2024-01-01T00:00:00Z",
  "message": "Recurso criado",
  "context": {
    "userId": "user-123",
    "resourceId": "res-456",
    "action": "create"
  }
}
\`\`\`

---

## Plano de Rollback

### Triggers de Rollback

| Trigger | Ação |
|---------|------|
| Taxa de erro > 5% por 5min | Rollback imediato |
| Latência > 3s (p95) por 10min | Investigar, rollback se não resolver |
| Falha na migração de banco | PARAR, não prosseguir |

### Passos de Rollback

1. **Rollback Imediato** (< 5 min):
   - Reverter deploy via Vercel
   - Ou: desabilitar via feature flag

2. **Rollback de Banco** (se schema mudou):
   - Executar down migration
   - Verificar integridade dos dados

3. **Comunicação**:
   - Notificar time
   - Criar ticket de incidente
   - Agendar post-mortem em 24h

---

## Glossário Jurídico

| Termo | Definição |
|-------|-----------|
| **Assistido** | Cidadão que recebe assistência jurídica gratuita |
| **Caso** | Processo ou demanda jurídica de um assistido |
| **Demanda** | Solicitação específica dentro de um caso |
| **Atribuição** | Área de atuação (Tribunal do Júri, VD, etc.) |
| **Diligência** | Ação externa a ser realizada (visita, perícia) |

---

## Checklist de Validação

### Seções Obrigatórias

- [ ] Cabeçalho com Tech Lead e Time
- [ ] Contexto com 2+ parágrafos
- [ ] Pelo menos 2 problemas identificados
- [ ] Escopo claro (dentro/fora) com 3+ itens cada
- [ ] Diagrama de arquitetura
- [ ] Pelo menos 3 riscos com mitigação
- [ ] Plano de implementação com fases

### Seções Críticas (OMBUDS)

- [ ] Segurança: autenticação definida
- [ ] Segurança: proteção de PII documentada
- [ ] Testes: pelo menos 2 tipos definidos
- [ ] Monitoramento: métricas definidas
- [ ] Rollback: triggers e passos documentados
```

---

## Processo Interativo

### Fase 1: Coletar Informações

```
Para criar o TDD, preciso das seguintes informações:

1. **Nome da Feature**: Como você quer chamar?
2. **Problema**: Qual dor estamos resolvendo?
3. **Escopo**: O que SERÁ e o que NÃO SERÁ entregue?
4. **Abordagem**: Já tem uma ideia de como resolver?

Pode fornecer essas informações?
```

### Fase 2: Validar Seções Críticas

```
Esta feature envolve [dados sensíveis/produção]. Preciso de detalhes sobre:

❗ **Segurança** - Como tratar dados de assistidos?
❗ **Monitoramento** - Quais métricas importam?
❗ **Rollback** - Como reverter se algo der errado?
```

### Fase 3: Gerar Documento

1. Gerar TDD em Markdown
2. Validar contra checklists
3. Salvar em `.specs/features/[feature]/tdd.md`

---

## Integração com Outras Skills

| Após TDD | Próxima Skill |
|----------|---------------|
| Aprovado | `/spec-driven` para criar tasks |
| Implementando | `/coding-guidelines` durante código |
| Pronto | `/validate` para verificar |
| Deploy | `/deploy` para publicar |

---

## Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `criar TDD para [feature]` | Inicia processo de criação |
| `revisar TDD` | Valida TDD existente |
| `atualizar TDD` | Atualiza documento existente |
