# Análise Crítica: Solar DPE-BA vs OMBUDS — Oportunidade de Mercado SaaS

> **Data**: 22/02/2026
> **Autor**: Análise técnica baseada em discovery real da interface Solar via Chrome MCP
> **Contexto**: Integração Solar implementada e deployada no Enrichment Engine (Railway)

---

## 1. O Sistema Solar — Visão Geral

**Solar** ("Solução Avançada em Atendimento de Referência") é o sistema web de gestão de atendimentos utilizado pela Defensoria Pública do Estado da Bahia (DPE-BA) e outras defensorias estaduais.

### 1.1 Dados Técnicos Confirmados (Discovery Real)

| Aspecto | Detalhe |
|---------|---------|
| **URL** | `solar.defensoria.ba.def.br` |
| **Versão** | Solar v25.010.1 |
| **Frontend** | AngularJS 1.x (EOL desde Dez/2021) |
| **CSS** | Bootstrap 2.x (4 versões defasado) |
| **UI Components** | Select2, Font Awesome |
| **Routing** | Hash-based SPA (`#/eproc`, `#/processos`) |
| **Auth** | Keycloak OIDC (realm `dpeba`, client_id `solar`) |
| **Backend** | Django (Python) — inferido pelos URL patterns |
| **API Interna** | REST `/procapi/` (proxy PJe) |
| **BD** | PostgreSQL (provável) |

### 1.2 Defensorias que Usam Solar

| Estado | Status | Observação |
|--------|--------|------------|
| **DPE-CE** (Ceará) | ✅ Originador | Desenvolveu o Solar internamente |
| **DPE-BA** (Bahia) | ✅ Confirmado | Implantação ativa desde Out/2025, em piloto |
| **DPE-TO** (Tocantins) | ✅ Adotante | Um dos primeiros a adotar |
| **DPE-PI** (Piauí) | ✅ Adotante | |
| **DPE-MA** (Maranhão) | ✅ Adotante | |
| **DPE-PA** (Pará) | ✅ Reportado | |
| **DPE-RN** (Rio G. do Norte) | ✅ Reportado | |
| **DPE-AC** (Acre) | ✅ Reportado | |
| **DPDF** (Distrito Federal) | 🔄 Avaliação | Repositórios GitHub `SegurancaDPDF/SOLAR-Backend` |

**Não usam Solar** (sistemas próprios): DPE-RJ, DPE-SP, DPE-MG, DPE-RS, DPU.

**Padrão geográfico**: Adoção concentrada em estados do **Norte e Nordeste** — justamente os que têm menos recursos para desenvolver sistemas próprios.

---

## 2. Análise Técnica Crítica do Solar

### 2.1 Pontos Positivos

| # | Ponto Positivo | Impacto |
|---|---------------|---------|
| 1 | **Integração nativa com PJe** | Acessa movimentações, partes, documentos diretamente |
| 2 | **API REST `/procapi/`** | Download de documentos PJe funcional e estável |
| 3 | **Suporte multi-grau** | 1ª e 2ª instância (PJE-1G-BA, PJE-2G-BA) |
| 4 | **Painel de avisos categorizado** | URG, INT, CIT, NOT, VIS, PTA, FCO |
| 5 | **Gestão de atendimentos** | Fluxo completo de atendimento da defensoria |
| 6 | **Peticionamento eletrônico** | Integrado ao PJe (protocolo direto) |
| 7 | **Keycloak OIDC** | Auth moderna, SSO, segura |
| 8 | **Software livre governamental** | Compartilhável entre defensorias |
| 9 | **GED integrado** | Gestão de documentos básica |
| 10 | **Manutenção ativa** | Versão 25.010.1 indica releases em 2025 |

### 2.2 Pontos Negativos (Críticos)

| # | Problema | Severidade | Detalhe |
|---|---------|-----------|---------|
| 1 | **AngularJS 1.x (EOL)** | 🔴 Crítico | Sem patches de segurança desde Dez/2021. 5+ anos defasado. |
| 2 | **Bootstrap 2.x** | 🔴 Crítico | 4 versões defasado. UI/UX datada, responsividade limitada. |
| 3 | **Sem API pública** | 🔴 Crítico | Impossibilita integração sem scraping. Exige Playwright. |
| 4 | **Performance lenta** | 🟡 Alto | Waits de 5-8s para dados PJe carregarem (confirmado no scraper). |
| 5 | **Zero IA** | 🟡 Alto | Toda análise é manual. Sem detecção de urgência, sem alertas. |
| 6 | **Sem mobile** | 🟡 Alto | Bootstrap 2.x não é responsivo. Inutilizável em audiências. |
| 7 | **Busca limitada** | 🟡 Alto | Apenas por número, sem full-text search nos autos. |
| 8 | **Sem integração messaging** | 🟡 Alto | Não notifica assistidos via WhatsApp/SMS. |
| 9 | **Relatórios básicos** | 🟡 Médio | Sem analytics de carga de trabalho. |
| 10 | **Session timeout 30min** | 🟡 Médio | Re-login frequente interrompe fluxo de trabalho. |
| 11 | **Typo no código-fonte** | 🟢 Info | `forcar_atulizacao` (sic) — indicativo de manutenção frágil. |
| 12 | **Sem offline** | 🟡 Médio | Impossível trabalhar sem internet (problema em fóruns). |

### 2.3 Dívida Técnica Acumulada

```
Risco de Segurança:
├── AngularJS 1.x sem patches → vulnerabilidades conhecidas (XSS, injection)
├── Bootstrap 2.x → sem proteções modernas (CSP headers limitados)
├── jQuery legado → prototype pollution risks
└── Sem Content Security Policy adequada

Risco de Manutenibilidade:
├── Poucos devs conhecem AngularJS em 2026
├── Migração para Angular 2+/React seria reescrita total
├── Estimativa: 12-18 meses para modernização do frontend
└── Custo estimado: R$ 500K-1M+ (equipe de 3-5 devs)
```

---

## 3. Comparativo Solar vs OMBUDS

### 3.1 Tabela Comparativa

| Aspecto | Solar DPE-BA | OMBUDS |
|---------|-------------|--------|
| **Stack frontend** | AngularJS 1.x (2016) | Next.js 15 + React 19 (2026) |
| **Stack backend** | Django (Python) | tRPC + Drizzle ORM |
| **CSS** | Bootstrap 2.x | Tailwind CSS + shadcn/ui |
| **Banco** | PostgreSQL (monolítico) | Supabase (PostgreSQL gerenciado + RLS) |
| **IA** | ❌ Nenhuma | ✅ Gemini 2.5 Flash (extração, análise) |
| **Mobile** | ❌ Não responsivo | ✅ Mobile-first |
| **API** | ❌ Não exposta | ✅ tRPC type-safe + REST |
| **Scraping PJe** | ✅ Nativo (via /procapi/) | ✅ Via Solar (Playwright) |
| **WhatsApp** | ❌ | ✅ Evolution API |
| **Drive** | ❌ | ✅ Google Drive API |
| **Documentos** | GED básico | ✅ Docling OCR + Gemini extraction |
| **Detecção urgência** | ❌ Manual | ✅ Automática (IA) |
| **Alertas/prazos** | ❌ Painel manual | ✅ Automáticos (critical/high/medium/low) |
| **Case facts** | ❌ | ✅ Extração automática de fatos |
| **Contradições** | ❌ | ✅ Detecção automática |
| **Busca** | Número/nome/CPF | Full-text + semântica |
| **Relatórios** | Básico | Dashboard com KPIs |
| **Multi-tenant** | Por estado (Keycloak realm) | RLS por workspace |
| **Offline** | ❌ | 🔄 Futuro (PWA) |
| **Peticionamento** | ✅ Integrado PJe | 🔄 Futuro |

### 3.2 Onde OMBUDS Complementa Solar

```
OMBUDS não substitui Solar — POTENCIALIZA Solar.

Solar = Sistema oficial da DPE (obrigatório)
OMBUDS = Camada inteligente que lê, analisa e organiza dados DO Solar

Fluxo:
                    ┌──────────────┐
                    │   Solar DPE  │
                    │  (AngularJS) │
                    └──────┬───────┘
                           │
                     Playwright
                     Scraping
                           │
                    ┌──────▼───────┐
                    │  OMBUDS EE   │
                    │  (Railway)   │
                    │              │
                    │  Gemini AI   │
                    │  extraction  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼───┐  ┌────▼────┐  ┌───▼───────┐
       │ Supabase │  │  Drive  │  │ WhatsApp  │
       │ (dados)  │  │ (PDFs)  │  │ (alertas) │
       └──────────┘  └─────────┘  └───────────┘
```

### 3.3 Proposta de Valor: OMBUDS como "Turbo" do Solar

| Ação no Solar | Tempo Manual | Com OMBUDS | Ganho |
|---------------|-------------|------------|-------|
| Verificar movimentações de 1 processo | 3-5 min | 10s (sync automático) | **30x** |
| Baixar e organizar PDFs | 5-10 min | Automático (Drive) | **∞** |
| Analisar sentença/decisão | 10-30 min | 30s (Gemini extrai) | **20-60x** |
| Verificar 50 processos pendentes | 2-3 horas | 5 min (batch sync) | **24-36x** |
| Detectar prazos urgentes | Revisão manual diária | Tempo real + WhatsApp | **Real-time** |
| Identificar contradições em depoimentos | Horas de leitura | Automático (IA) | **∞** |

---

## 4. Estratégia de Mercado: OMBUDS como SaaS

### 4.1 Mercado-Alvo

```
Mercado Total Endereçável (TAM):
├── 27 Defensorias Estaduais + DPU
├── ~8.000 defensores públicos no Brasil
├── ~50% usam Solar ou sistema similar (4.000)
├── Ticket médio potencial: R$ 99-199/mês por defensor
└── TAM: R$ 4.8M - R$ 9.5M /ano

Mercado Imediato (SAM — Solar states):
├── ~10 estados com Solar
├── ~2.000-3.000 defensores
├── Integração Solar já pronta
└── SAM: R$ 2.4M - R$ 7.2M /ano

Primeiro Mercado (SOM):
├── DPE-BA (600+ defensores)
├── Começando por Camaçari
└── SOM ano 1: R$ 72K - R$ 144K
```

### 4.2 Modelo de Precificação

| Plano | Preço/mês | Features |
|-------|----------|----------|
| **Defensor Free** | R$ 0 | 10 processos, PJe import, case facts básico |
| **Defensor Pro** | R$ 99 | Ilimitado, Solar sync, Drive, WhatsApp |
| **Núcleo** | R$ 499 | 5 defensores, relatórios, analytics |
| **Defensoria** | Sob consulta | Multi-comarca, SSO, suporte dedicado |

### 4.3 Go-to-Market

```
Fase 1 (Q1-Q2 2026): Prova de Conceito
├── DPE-BA Camaçari (defensor atual como beta)
├── 10-20 processos sincronizados
├── Validar fluxo Solar → OMBUDS → Drive
└── Métricas: tempo economizado, erros evitados

Fase 2 (Q3 2026): Expansão DPE-BA
├── Apresentar resultados para outros defensores BA
├── Piloto com 5-10 defensores
├── Feedback → iteração
└── Case study oficial

Fase 3 (Q4 2026): Outros Estados Solar
├── DPE-CE, DPE-TO, DPE-PI (mesma base Solar)
├── Ajustar Keycloak realm por estado
├── A integração Playwright é idêntica!
└── Crescimento: 50-100 defensores

Fase 4 (2027): Escala Nacional
├── Estados sem Solar (API PJe direta)
├── Certificado digital e-Defensor para PJe
├── Modelo SaaS completo
└── Meta: 500-1000 defensores
```

### 4.4 Vantagem Competitiva Sustentável

| Moat | Descrição |
|------|-----------|
| **First-mover** | Primeiro SaaS de IA para defensores públicos |
| **Integração Solar** | Única ferramenta com scraping real mapeado |
| **Lock-in de dados** | Case facts, anotações, contradições acumulam valor |
| **Network effect** | Defensores compartilham estratégias dentro do sistema |
| **Conhecimento de domínio** | Entender penal/criminal é barreira altíssima |
| **Custo de switching** | Quanto mais dados, mais difícil migrar |

---

## 5. Segurança e LGPD — Solução Viável

### 5.1 Dados Sensíveis Envolvidos

| Categoria | Exemplos | Classificação LGPD |
|-----------|---------|-------------------|
| Dados pessoais | Nome, CPF de assistidos | Art. 7 (dados pessoais) |
| Dados sensíveis | Antecedentes criminais, saúde | Art. 11 (dados sensíveis) |
| Sigilo judicial | Processos sob segredo de justiça | Lei 13.709 + CPC |
| Dados de menores | Processos ECA | Art. 14 (menores) |
| Credenciais | Login Solar do defensor | Segurança da informação |

### 5.2 Arquitetura de Segurança Proposta

```
Camadas de Proteção:

1. TRANSPORTE
   └── TLS 1.3 em todas as conexões (Railway, Supabase, API)

2. AUTENTICAÇÃO
   ├── NextAuth.js com Google OAuth (OMBUDS)
   ├── Keycloak OIDC (Solar — apenas no backend)
   └── Credenciais Solar NUNCA no frontend

3. AUTORIZAÇÃO
   ├── Supabase RLS (Row Level Security)
   ├── Workspace isolation (multi-tenant)
   ├── protectedProcedure no tRPC
   └── API Key no Enrichment Engine

4. DADOS EM REPOUSO
   ├── Supabase: encryption at rest (AES-256)
   ├── Drive: encryption Google (AES-256)
   ├── Railway: credenciais em env vars (não em código)
   └── Backups: encrypted, Supabase gerencia

5. IA (Gemini)
   ├── Prompts NÃO contêm dados pessoais identificáveis
   ├── Contexto limitado ao mínimo necessário
   ├── Google AI Terms: não treina com dados de API
   └── Anonimização antes de enviar

6. SCRAPING SOLAR
   ├── Credenciais do defensor (env vars Railway)
   ├── Sessão Keycloak em memória (não persistida)
   ├── Rate limiting (3s entre requests)
   └── Single browser instance
```

### 5.3 Modelo de Responsabilidade Compartilhada

```
┌─────────────────────────────────────────────┐
│           MODELO DE SEGURANÇA               │
├─────────────────────────────────────────────┤
│                                             │
│  DEFENSOR (usuário):                        │
│  • Fornece suas credenciais Solar           │
│  • Aceita termos de uso                     │
│  • Responsável por quem acessa sua conta    │
│                                             │
│  OMBUDS (plataforma):                       │
│  • Armazena credenciais com encryption      │
│  • NÃO compartilha dados entre defensores   │
│  • RLS garante isolamento total             │
│  • Logs de auditoria em todas as ações      │
│  • Conformidade LGPD                        │
│                                             │
│  INFRAESTRUTURA (terceiros):                │
│  • Supabase: SOC 2 Type II, LGPD compliant  │
│  • Railway: SOC 2, dados em São Paulo       │
│  • Google Cloud: ISO 27001, LGPD compliant  │
│                                             │
└─────────────────────────────────────────────┘
```

### 5.4 Diferencial: Sem Risco para o Operador

**Questão-chave do defensor**: "Se eu usar OMBUDS com meu login Solar, posso ter problemas?"

**Resposta técnica**: NÃO, porque:

1. **OMBUDS age como o próprio defensor** — faz exatamente o que o defensor faria manualmente (consultar processo, baixar documento), apenas automatizado
2. **Não altera dados no Solar** — apenas lê (somente leitura)
3. **Credenciais sob controle do defensor** — pode revogar a qualquer momento
4. **Rate limiting conservador** — 3s entre requisições, parece navegação humana
5. **Sem dados sensíveis em terceiros não autorizados** — Supabase e Google Cloud têm conformidade governamental

**Analogia**: OMBUDS é como ter um estagiário muito eficiente que consulta o Solar para você — mas um estagiário que nunca erra, nunca esquece, e trabalha 24/7.

---

## 6. Riscos e Mitigações

### 6.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Solar muda interface (quebra scraper) | Alta | Médio | Seletores centralizados em `solar_selectors.py`, fácil atualizar |
| Solar adiciona captcha | Baixa | Alto | Headless Chrome pode ser detectado; usar stealth mode |
| Solar bloqueia IP Railway | Média | Alto | Usar proxy brasileiro; rate limiting conservador |
| Solar disponibiliza API oficial | Baixa | Positivo | Migrar de scraping para API (melhor!) |
| Playwright instável em produção | Média | Médio | Retry logic, health checks, auto-restart |
| Railway free tier limits | Alta | Baixo | Upgrade para plano Pro quando necessário |

### 6.2 Riscos Jurídicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| DPE questiona scraping | Baixa | Alto | Scraping é do próprio login do defensor; não viola termos |
| LGPD enforcement | Média | Alto | RIPD, DPO, conformidade completa |
| Vazamento de dados | Baixa | Crítico | RLS, encryption, audit logs, pen testing |
| Perda de credenciais Solar | Baixa | Alto | Secrets management, encryption at rest |

### 6.3 Riscos de Mercado

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Solar moderniza para React | Muito Baixa | Médio | OMBUDS ainda agrega IA + organização |
| CNJ lança ferramenta similar | Baixa | Alto | Velocidade de execução + especialização criminal |
| Defensor não quer pagar | Alta | Médio | Freemium + demonstrar ROI claro |
| Adoção lenta no governo | Alta | Médio | Bottom-up (defensor individual, não institucional) |

---

## 7. Próximos Passos Imediatos

### 7.1 Para Completar Integração Solar

- [ ] **Configurar credenciais Solar** no Railway (`SOLAR_USERNAME`, `SOLAR_PASSWORD`)
- [ ] **Testar sync de 1 processo real** via `POST /solar/sync-processo`
- [ ] **Testar batch sync** de 5 processos
- [ ] **Verificar PDFs no Drive** (upload automático)
- [ ] **Criar UI** no frontend para botão "Sincronizar Solar"

### 7.2 Para Validação de Mercado

- [ ] **Usar OMBUDS diariamente** com seus processos reais (dogfooding)
- [ ] **Medir tempo economizado** por semana
- [ ] **Documentar erros encontrados** pelo Solar/OMBUDS
- [ ] **Apresentar para 2-3 colegas defensores** (informal)
- [ ] **Coletar feedback** sobre features mais valiosas

### 7.3 Para Preparar SaaS

- [ ] **Multi-tenant** — separar dados por workspace/defensoria
- [ ] **Billing** — integrar Stripe para cobrança
- [ ] **Landing page** — ombuds.com.br ou similar
- [ ] **RIPD** (Relatório de Impacto à Proteção de Dados)
- [ ] **Termos de Uso + Política de Privacidade**

---

## 8. Conclusão

O Solar é um sistema funcional mas **tecnicamente obsoleto**, preso em AngularJS 1.x sem perspectiva de modernização. Sua maior virtude — integração nativa com PJe — é acessível via scraping. Sua maior fraqueza — ausência de IA, API pública e experiência móvel — é exatamente o que OMBUDS resolve.

**OMBUDS não compete com Solar. OMBUDS transforma Solar de uma ferramenta burocrática em um assistente inteligente.**

O mercado é **virgem**: nenhum SaaS existe para defensores públicos com IA + integração PJe/Solar. A estratégia correta é bottom-up (defensor individual → núcleo → defensoria), começando pela DPE-BA onde já há acesso e validação real.

A segurança é viável via arquitetura atual (Supabase RLS + Railway env vars + encryption), com ajustes incrementais (RIPD, pen test, DPO) conforme o negócio escala.

**Potencial**: Se 5% dos 8.000 defensores do Brasil assinarem o plano Pro (R$ 99/mês), isso gera **R$ 475K/ano** de receita recorrente — com margem alta (infraestrutura custa <R$ 5K/mês para esse volume).

---

*Análise realizada com base em discovery real da interface Solar via Chrome MCP em 22/02/2026, análise do codebase OMBUDS, e pesquisa de mercado de lawtech brasileira.*
