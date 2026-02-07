# /ideias-defesa - Gerador de Ideias para Defensoria

> **Tipo**: Workflow Criativo + Análise de Viabilidade
> **Trigger**: "ideias", "sugere funcionalidade", "o que mais posso fazer?", "próxima feature"

## Descrição

Gerar ideias de funcionalidades alinhadas com:
1. Necessidades reais da Defensoria Pública
2. Estrutura técnica existente do OMBUDS
3. Viabilidade de implementação

---

## Contexto da Defensoria Pública

### Missão
Garantir assistência jurídica gratuita e integral aos cidadãos que não podem pagar advogado.

### Desafios Comuns
- Alto volume de demandas
- Prazos judiciais apertados
- Documentação extensa
- Comunicação com assistidos
- Acompanhamento de múltiplos processos
- Relatórios para gestão

### Atores do Sistema
| Ator | Necessidades |
|------|--------------|
| **Defensor** | Gerenciar casos, prazos, audiências |
| **Assistido** | Acompanhar seu processo, comunicar-se |
| **Gestor** | Relatórios, distribuição de trabalho |
| **Estagiário** | Apoio em tarefas, aprendizado |

---

## Processo de Geração de Ideias

### Fase 1: Identificar Área de Melhoria

```markdown
Perguntas guia:
1. Qual dor do usuário queremos resolver?
2. Qual processo manual pode ser automatizado?
3. Onde há gargalo no fluxo atual?
4. Que informação falta para tomar decisões?
```

### Fase 2: Avaliar Viabilidade Técnica

Para cada ideia, analisar:

| Critério | Perguntas |
|----------|-----------|
| **Schema** | Precisa de novas tabelas? Quais campos? |
| **Backend** | Novos routers tRPC? Integrações externas? |
| **Frontend** | Novas páginas? Componentes complexos? |
| **Integrações** | API externa? Gemini? Serviços? |
| **Esforço** | Horas/dias estimados? |

### Fase 3: Priorizar

```
Matriz de Priorização:

         Alto Valor
              │
    ┌─────────┼─────────┐
    │ FAZER   │ PLANEJAR│
    │ AGORA   │ BEM     │
Fácil────────┼─────────Difícil
    │ QUICK  │ AVALIAR │
    │ WIN    │ DEPOIS  │
    └─────────┼─────────┘
              │
         Baixo Valor
```

---

## Catálogo de Ideias por Área

### 📋 Gestão de Casos

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Timeline visual do caso | Alto | Médio | ✅ Componente React |
| Alertas de prazo | Alto | Baixo | ✅ Cron + notificação |
| Checklist de documentos | Médio | Baixo | ✅ JSON no caso |
| Modelos de petição | Alto | Médio | ✅ Templates + Gemini |
| Duplicação de caso similar | Médio | Baixo | ✅ Clone de dados |

### 🤖 Automação com IA (Gemini)

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Resumo automático de processo | Alto | Médio | ✅ Gemini API |
| Sugestão de tese de defesa | Alto | Alto | ✅ Prompt engineering |
| Análise de jurisprudência | Alto | Alto | ⚠️ Precisa base de dados |
| Transcrição de audiência | Alto | Médio | ✅ Gemini + áudio |
| Geração de petição inicial | Alto | Alto | ✅ Templates + Gemini |

### 📊 Relatórios e Métricas

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Dashboard de produtividade | Alto | Médio | ✅ Agregações SQL |
| Relatório de atendimentos | Alto | Baixo | ✅ Query + export |
| Mapa de calor de demandas | Médio | Médio | ✅ Chart.js |
| Previsão de carga de trabalho | Médio | Alto | ⚠️ ML necessário |
| Comparativo mensal | Médio | Baixo | ✅ Queries existentes |

### 📱 Comunicação

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Notificação WhatsApp | Alto | Médio | ⚠️ API WhatsApp Business |
| Portal do assistido | Alto | Alto | ✅ Nova área pública |
| Agendamento online | Alto | Médio | ✅ Integração agenda |
| Chatbot de dúvidas | Médio | Alto | ✅ Gemini + contexto |
| SMS de lembrete | Médio | Baixo | ⚠️ Gateway SMS |

### 📅 Agenda e Prazos

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Sincronização Google Calendar | Alto | Médio | ✅ API já integrada |
| Cálculo automático de prazos | Alto | Médio | ✅ Regras processuais |
| Conflito de audiências | Alto | Baixo | ✅ Query de overlap |
| Preparação para audiência | Médio | Médio | ✅ Checklist + docs |
| Roteirização de diligências | Médio | Alto | ⚠️ API de mapas |

### 🔍 Investigação

| Ideia | Valor | Esforço | Viabilidade |
|-------|-------|---------|-------------|
| Linha do tempo de investigação | Alto | Médio | ✅ Componente visual |
| Mapa de relacionamentos | Médio | Alto | ⚠️ Grafo complexo |
| Repositório de evidências | Alto | Médio | ✅ Upload + metadata |
| Análise de contradições | Médio | Alto | ✅ Gemini comparison |

---

## Template de Especificação de Ideia

```markdown
# Feature: [Nome da Feature]

## Problema
Qual dor resolve? Quem sofre com isso hoje?

## Solução Proposta
Descrição em 2-3 frases.

## Valor para o Usuário
- [ ] Economia de tempo
- [ ] Redução de erros
- [ ] Melhor experiência
- [ ] Novos insights

## Análise Técnica

### Schema (Banco de Dados)
- Nova tabela? Campos novos?
- Relacionamentos?

### Backend (tRPC)
- Novos procedures?
- Integrações externas?

### Frontend
- Novas páginas?
- Componentes necessários?

### Integrações
- Gemini AI?
- APIs externas?

## Estimativa
- **Esforço**: [Baixo/Médio/Alto]
- **Tempo**: [X horas/dias]
- **Complexidade**: [1-5]

## Dependências
- Precisa de algo antes?
- Bloqueia algo?

## Critérios de Sucesso
- [ ] Métrica 1
- [ ] Métrica 2
```

---

## Ideias Rápidas (Quick Wins)

Funcionalidades que podem ser implementadas em **< 4 horas**:

1. **Duplicar caso** - Botão para clonar caso existente
2. **Exportar para PDF** - Ficha do assistido/caso
3. **Filtro salvo** - Guardar filtros favoritos
4. **Notas rápidas** - Campo de anotações no caso
5. **Contador de prazos** - Dias até vencimento
6. **Favoritos** - Marcar casos prioritários
7. **Histórico de alterações** - Log de mudanças
8. **Busca global** - Pesquisar em tudo

---

## Como Usar Esta Skill

### Modo Exploratório
```
"me dá ideias para melhorar a gestão de casos"
"o que posso automatizar com IA?"
"sugere quick wins"
```

### Modo Específico
```
"analisa viabilidade de [ideia X]"
"especifica a feature de [nome]"
"quanto tempo leva para fazer [Y]?"
```

### Modo Priorização
```
"quais as 3 melhores ideias para implementar agora?"
"o que dá mais valor com menos esforço?"
```

---

## Integração com Outras Skills

Após escolher uma ideia:

1. `/spec-driven` - Especificar requisitos detalhados
2. `/architecture-analysis` - Avaliar impacto na arquitetura
3. `/coding-guidelines` - Implementar seguindo boas práticas
4. `/validate` - Verificar implementação
5. `/deploy` - Publicar

---

## Próximas Ideias Sugeridas para OMBUDS

Baseado na estrutura atual:

### Prioridade Alta (Implementar Primeiro)
1. **Alertas de prazo** - Notificação de prazos vencendo
2. **Resumo de caso com IA** - Gemini gera resumo
3. **Dashboard de produtividade** - KPIs do defensor

### Prioridade Média
4. **Timeline visual do caso** - Histórico visual
5. **Modelos de petição** - Templates + IA
6. **Sincronização Google Calendar** - Audiências no GCal

### Prioridade Futura
7. **Portal do assistido** - Área pública
8. **Chatbot de dúvidas** - Gemini responde
9. **Análise de jurisprudência** - Base de decisões
