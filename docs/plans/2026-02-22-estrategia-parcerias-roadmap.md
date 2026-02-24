# OMBUDS — Estratégia, Parcerias e Roadmap

> **Data**: 22/02/2026
> **Status**: Projeto em desenvolvimento ativo — fase de uso próprio + testes
> **Mantra**: *"Engatinhar antes de correr. Validar antes de escalar."*

---

## 1. Visão do Produto

O OMBUDS é um **sistema nervoso defensivo inteligente e integrado** — não apenas um gestor de casos, mas uma camada de inteligência que:

- **Captura** dados de múltiplas fontes (PJe, Solar, Drive, WhatsApp)
- **Processa** com IA (Gemini) extraindo fatos, prazos, decisões
- **Organiza** em estrutura navegável e acionável
- **Alerta** sobre o que precisa de atenção imediata
- **Automatiza** o trabalho manual repetitivo
- **Aprende** com o uso — fica mais preciso com o tempo

É o que o defensor deveria ter desde sempre: **tudo em um lugar, funcionando junto.**

---

## 2. Parcerias Estratégicas

### 2.1 Eduardo Lucca (DPE-BA) ⭐⭐⭐⭐⭐

**Quem é**: Defensor Público da Bahia, formado em Ciência da Computação, compõe a equipe administrativa da DPE-BA, participou da implementação do sistema Solar.

**Por que é estratégico**:
- Conhece o Solar **por dentro** — APIs internas, vulnerabilidades de UX, possibilidades de integração oficial
- Pode antecipar **mudanças na interface** antes que quebrem o scraper
- Tem **autoridade institucional** para abrir portas para piloto na DPE-BA
- É **usuário + desenvolvedor + insider** — combinação impossível de encontrar em outra pessoa
- Pode ser um **advisor técnico** sem precisar de papel formal no início

**Status**: Contato planejado para março de 2026

**Como abordar** (framing recomendado):
> *"Eduardo, estou desenvolvendo o OMBUDS — uma ferramenta de produtividade para defensores que automatiza a extração de dados do PJe e do Solar, usando IA. Você é a pessoa mais indicada que conheço para feedback técnico. Não preciso de nada institucional agora — só quero sua visão sobre o que faz sentido integrar. Topa um café/chamada de 30 min?"*

**Progressão natural da parceria**:
1. Café/call → feedback técnico informal (março 2026)
2. Acesso beta → ele usa e reporta bugs (abril 2026)
3. Advisor técnico → consultas pontuais sobre Solar (mês 3+)
4. Eventualmente: co-autor / equity leve (ano 2, se produto validado)

**⚠️ Atenção legal**: Como servidor público, Eduardo pode ter restrições para participar de negócio privado com órgão onde trabalha. Verificar Lei Orgânica da DPE-BA antes de formalizar.

---

### 2.2 Victor Linhares / Grupo RDP ⭐⭐⭐⭐

**Quem é**: Defensor Público do Maranhão (DPE-MA), fundador do Grupo Educacional RDP — "O maior ecossistema de Defensoria Pública" (fundado 2018).

**O ecossistema RDP**:
- Site: [rumoadefensoriacursos.com](https://rumoadefensoriacursos.com)
- Cursos: Extensivo DPE, Extensivo MPE, Extensivo Magis (magistratura)
- Plataforma própria: questões, simulados, rankings, PDFs, planejamento diário
- Parceria institucional: DPE-MA (curso gratuito oficial)
- Design: dark mode profissional, bem elaborado
- Vagas "limitadíssimas" — posicionamento premium

**Por que é estratégico**:
- Acesso à maior comunidade de **futuros e recém-aprovados defensores** do Brasil
- Credibilidade consolidada no nicho (7 anos de operação)
- Ciclo perfeito: RDP prepara quem quer ser defensor → OMBUDS atende quem já é
- Sem conflito de interesse direto

**Status**: Conexão pessoal disponível — acesso facilitado

**Proposta de parceria inicial** (simples, sem complexidade):
- Victor recebe acesso gratuito ao OMBUDS
- Se gostar, menciona organicamente para ex-alunos aprovados
- Formalizar como afiliado (20-30% comissão no 1º ano) quando produto estiver maduro
- Eventualmente: "OMBUDS para Aprovados RDP" — desconto de entrada para recém-aprovados

**Timing**: Contato após produto ter ao menos 10-20 usuários ativos (mês 3-4)

---

### 2.3 ANADEP / CONDEGE ⭐⭐⭐

**O que são**:
- ANADEP: Associação Nacional das Defensoras e Defensores Públicos
- CONDEGE: Conselho Nacional dos Defensores Públicos-Gerais

**Por que são estratégicos**: Legitimidade institucional + acesso a todos os 7.520 defensores

**Timing**: Mês 6-12, após produto validado com usuários reais

---

### 2.4 Parceiros de Infraestrutura (quando necessário)

| Parceiro | Área | Quando acionar |
|----------|------|----------------|
| **Asaas** | Pagamentos BR (Pix nativo) | Antes de lançar plano pago |
| **Hetzner/Contabo** | VPS dedicado para Playwright | 100+ usuários |
| **Browserless.io** | Playwright gerenciado na nuvem | Se Railway não escalar |

---

## 3. Roadmap de Execução

### AGORA — Fase de Desenvolvimento e Uso Próprio ✅

**Objetivo**: Usar muito, testar muito, aprimorar continuamente

- [x] MVP técnico: Solar integrado, Railway deployado, 18 arquivos
- [x] Análise de mercado e pricing definido
- [x] Análise crítica do Solar DPE-BA documentada
- [ ] Configurar credenciais Solar (`SOLAR_USERNAME` + `SOLAR_PASSWORD`)
- [ ] Testar sync Solar com processos reais
- [ ] Usar o OMBUDS todo dia — mapear dores reais do workflow
- [ ] Identificar o que funciona vs. o que frustra no uso diário

### Março 2026 — Validação Técnica Fechada

**Objetivo**: Primeiro contato externo — Eduardo Lucca

- [ ] Entrar em contato com Eduardo Lucca (café/call)
- [ ] Apresentar o produto, coletar feedback técnico sobre Solar
- [ ] 2-3 colegas de confiança: "testa isso pra mim?" (sem pressão)
- [ ] Refinar com base no feedback real

### Abril-Maio 2026 — Produto Pagável

**Objetivo**: Primeiros pagantes, break-even (7 pagantes já cobre infra)

- [ ] Implementar gateway de pagamento (Asaas recomendado)
- [ ] Plano Grátis + Essencial (R$ 49) com cobrança automática
- [ ] Abrir para primeiros grupos WhatsApp de defensores
- [ ] Monitorar: conversão, churn, NPS informal

### Junho-Agosto 2026 — Crescimento Controlado

**Objetivo**: 50-100 pagantes, MRR ~R$ 3.000-6.000

- [ ] Primeiro contato com Victor Linhares/RDP
- [ ] Lançar plano Profissional (R$ 97) com automação Solar completa
- [ ] Aparecer em 1 evento da categoria (ANADEP, encontros estaduais)
- [ ] Estabilizar Solar scraper (maior fragilidade técnica)

### Setembro-Dezembro 2026 — Institucionalização

**Objetivo**: 100-300 pagantes, primeiro contrato institucional

- [ ] Parceria piloto com DPE-BA ou DPE-CE (via Eduardo Lucca)
- [ ] Plano Núcleo (R$ 249/assento) para equipes
- [ ] Suporte part-time (estagiário)
- [ ] Integrar com outros sistemas (e-Proc, PROJUDI)

---

## 4. Princípios Inegociáveis

### Segurança
- Credenciais Solar sempre em env vars — nunca no código
- Logs sem dados sensíveis (CPF, nomes de assistidos)
- Rate limiting em todas as automações
- Sessões do Playwright nunca persistidas em disco

### Controle de Crescimento
- **Regra dos 30 dias**: só escala quando o passo anterior está estável há 30 dias
- Usar lista de espera antes de abrir para grupos grandes
- Crescimento rápido sem suporte = churn alto + reputação destruída

### Sustentabilidade Financeira
- Não contratar antes de R$ 5.000 MRR estável
- Não migrar de infra atual antes de R$ 8.000 MRR
- Manter 3 meses de runway em caixa
- Priorizar pagamento anual (2 meses grátis) desde o início

### Prioridade de Features
- O que usuários reais pedem > o que o fundador acha que é bom
- YAGNI: não construir antes de validar necessidade
- Estabilidade > features novas enquanto base de usuários for pequena

---

## 5. Métricas para Acompanhar

| Métrica | Alvo Mês 6 | Alvo Mês 12 |
|---------|-----------|------------|
| Usuários totais | 90-500 | 230-1.400 |
| Pagantes | 7-60 | 18-210 |
| MRR | R$ 350-4.260 | R$ 1.365-14.625 |
| Churn mensal | <5% | <3% |
| NPS informal | >40 | >50 |

---

## 6. Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/plans/2026-02-22-analise-critica-solar-ombuds.md` | Análise técnica do Solar DPE-BA + oportunidade de mercado |
| `docs/plans/2026-02-22-pricing-revenue-projection.md` | Pricing (R$49/97/249), projeção de receita 12 meses |
| `docs/plans/mossy-soaring-swan.md` | Plano técnico da integração Solar (implementado) |

---

*"O melhor produto do mundo sem distribuição vale zero. A melhor distribuição com produto ruim é só mais rápido para o fracasso. O OMBUDS precisa dos dois — e nessa ordem: produto primeiro."*
