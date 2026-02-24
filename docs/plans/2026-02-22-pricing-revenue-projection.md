# OMBUDS SaaS — Análise de Pricing e Projeção de Receita

> **Data**: 22/02/2026
> **Objetivo**: Definir preço mensal viável por usuário e projetar lucro em 12 meses
> **Base**: Pesquisa de mercado real (concorrentes, custos infra, salários, tamanho do mercado)

---

## 1. Tamanho do Mercado (TAM / SAM / SOM)

### 1.1 Defensores Públicos no Brasil

| Métrica | Valor | Fonte |
|---------|-------|-------|
| **Total de defensores públicos** | **7.520** | Pesquisa Nacional da Defensoria Pública 2025 |
| Proporção defensor/habitante | 1 para cada 31.107 | ANADEP / Pesquisa Nacional 2025 |
| Comarcas atendidas | 52% (1.334 de 2.563) | Pesquisa Nacional 2025 |
| Atendimentos em 2024 | 25,9 milhões (recorde) | Agência Brasil |
| Processos judiciais iniciados 2024 | 4,4 milhões | Pesquisa Nacional 2025 |

### 1.2 Salários por Estado (Referência de Poder Aquisitivo)

| Estado | Salário Inicial | Observação |
|--------|----------------|------------|
| **Bahia** | R$ 29.421 | Concurso previsto 2026 (FCC) |
| **Ceará** | R$ 35.877 | Reajuste fev/2025, maior da lista |
| **São Paulo** | R$ 29.716 | 140 novos cargos aprovados 2025 |
| **Mato Grosso** | R$ 35.660 | Concurso 30 vagas aberto |
| **Rio de Janeiro** | ~R$ 31.000 | Estimativa |
| **Média nacional** | **~R$ 30.000-35.000** | Varia por entrância |

> **Insight**: Com salários de R$ 30K+, defensores têm poder aquisitivo para investir R$ 100-200/mês em ferramentas que economizem horas de trabalho manual.

### 1.3 Funil de Mercado

| Nível | Descrição | Tamanho |
|-------|-----------|---------|
| **TAM** (Total) | Todos os defensores públicos do Brasil | 7.520 |
| **SAM** (Acessível) | Defensores < 50 anos, tech-savvy, que usam PJe ativamente | ~4.000-5.000 |
| **SOM Ano 1** (Realista) | Alcançáveis via word-of-mouth, WhatsApp groups | 200-800 |
| **SOM Ano 3** (Ambicioso) | Com marketing ativo + parcerias institucionais | 1.500-3.000 |

### 1.4 Expansão Futura (Além de Defensores)

| Segmento | Tamanho | Potencial |
|----------|---------|-----------|
| Advogados dativos/nomeados | ~50.000 | Médio (usam PJe, workflow similar) |
| Advogados criminalistas | ~200.000 | Médio (penal, workflow próximo) |
| Advogados gerais (OAB total) | ~1.400.000 | Longo prazo |

---

## 2. Análise de Concorrentes e Preços

### 2.1 Concorrentes Diretos para Defensores Públicos

| Produto | Target | Preço/mês | Ameaça |
|---------|--------|-----------|--------|
| **Nenhum encontrado** | — | — | **Oceano azul** |

> **Não existe SaaS específico para defensores públicos.** Todos os produtos jurídicos miram advogados privados.

### 2.2 Concorrentes Indiretos (Legal Tech Brasil)

| Produto | O que faz | Preço mensal | Target |
|---------|-----------|-------------|--------|
| **Jusbrasil Pro** | Pesquisa jurisprudência + IA | R$ 98,90/mês (Avançado) | Advogados privados |
| **JusIA** (Jusbrasil) | IA jurídica conversacional | A partir de R$ 9,90 (1º mês) | Advogados privados |
| **Astrea** (Aurum) | Gestão processos + prazos + IA | R$ 21-109/mês | Escritórios advocacia |
| **Astrea Light** | Versão gratuita | R$ 0 (40 processos, 1 usuário) | Advogados iniciantes |
| **ADVBOX** | Gestão escritório completa | R$ 360+/mês (sem limite de usuários) | Escritórios médios/grandes |
| **LegalNote** | Monitoramento DJe | R$ 59-149/mês | Advogados privados |
| **Escavador Pro** | Busca informações jurídicas | R$ 49-199/mês | Advogados privados |

### 2.3 Ferramentas Internacionais (Referência)

| Produto | Preço/mês | Mercado |
|---------|-----------|---------|
| **Clio** | $49-89 USD/user | EUA/Canadá |
| **MyCase** | $49-79 USD/user | EUA |
| **PracticePanther** | $59-89 USD/user | EUA |
| **CoCounsel** (Thomson Reuters) | ~$100 USD/user | EUA (IA jurídica) |

### 2.4 O que Defensores JÁ Pagam (Do Próprio Bolso)

| Ferramenta | Gasto estimado/mês | % que usa |
|-----------|-------------------|-----------|
| Jusbrasil PRO | R$ 49-99 | ~30-40% |
| Astrea ou LegalNote | R$ 79-149 | ~15-25% |
| ChatGPT Plus | R$ 100 | ~20-30% |
| **Total típico** | **R$ 150-350/mês** | — |

> **Insight**: Defensores que pagam por ferramentas já gastam R$ 150-350/mês. O OMBUDS precisa se posicionar ABAIXO desse gasto agregado para ser atrativo, ou demonstrar que SUBSTITUI múltiplas ferramentas.

---

## 3. Custos de Infraestrutura

### 3.1 Stack Atual do OMBUDS

| Serviço | Plano | Custo/mês | Uso |
|---------|-------|-----------|-----|
| **Vercel** | Pro | $20/mês (~R$ 116) | Frontend Next.js + API Routes |
| **Supabase** | Pro | $25/mês (~R$ 145) | PostgreSQL + Auth + Storage |
| **Railway** | Hobby→Pro | $5-20/mês (~R$ 29-116) | Enrichment Engine (FastAPI + Playwright) |
| **Google Gemini API** | Pay-per-use | Variável | IA para análise de documentos |
| **Domínio + DNS** | Anual | ~R$ 15/mês | domínio .com.br |
| **TOTAL BASE** | — | **~R$ 305-392/mês** | Sem usuários |

### 3.2 Custo do Gemini API por Usuário

Usando **Gemini 2.5 Flash** (melhor custo-benefício):

| Métrica | Valor |
|---------|-------|
| Input price | $0.15 / 1M tokens |
| Output price | $0.60 / 1M tokens |
| Tokens por request típico | ~2.000 input + 1.000 output |
| **Custo por request** | **~$0.0009 (~R$ 0,005)** |
| Requests/usuário/mês (estimativa) | 50-100 |
| **Custo IA/usuário/mês** | **R$ 0,25 - R$ 0,52** |

Com Gemini 2.0 Flash (ainda mais barato):

| Métrica | Valor |
|---------|-------|
| Input price | $0.10 / 1M tokens |
| Output price | $0.40 / 1M tokens |
| **Custo por request** | **~$0.0006 (~R$ 0,003)** |
| **Custo IA/usuário/mês** | **R$ 0,17 - R$ 0,35** |

> **IA é quase de graça.** O custo de Gemini por usuário é desprezível (~R$ 0,50/mês).

### 3.3 Custo por Usuário (Escala)

| Nº Usuários | Vercel | Supabase | Railway | Gemini | Total Infra | **Custo/usuário** |
|-------------|--------|----------|---------|--------|------------|-------------------|
| **10** | R$ 116 | R$ 145 | R$ 29 | R$ 5 | R$ 295 | **R$ 29,50** |
| **50** | R$ 116 | R$ 145 | R$ 60 | R$ 25 | R$ 346 | **R$ 6,92** |
| **100** | R$ 116 | R$ 175 | R$ 116 | R$ 50 | R$ 457 | **R$ 4,57** |
| **250** | R$ 150 | R$ 250 | R$ 200 | R$ 125 | R$ 725 | **R$ 2,90** |
| **500** | R$ 200 | R$ 400 | R$ 350 | R$ 250 | R$ 1.200 | **R$ 2,40** |
| **1.000** | R$ 350 | R$ 700 | R$ 600 | R$ 500 | R$ 2.150 | **R$ 2,15** |

> **Economia de escala forte**: Com 100+ usuários pagantes, o custo marginal por usuário cai para ~R$ 3-5/mês. Margem bruta potencial de 90%+.

### 3.4 Custos Operacionais (Além de Infra)

| Item | Custo/mês | Quando |
|------|-----------|--------|
| **Gateway de pagamento** (Stripe/Asaas) | 3,5-5% da receita | Desde o início |
| **Suporte** (WhatsApp group, founder-led) | R$ 0 (seu tempo) | Meses 1-12 |
| **Marketing** | R$ 0-500 | Orgânico no início |
| **Contabilidade MEI/ME** | R$ 50-150 | Desde o início |
| **Impostos (Simples Nacional)** | 6-15,5% da receita | Faixa I-III |

---

## 4. Estratégia de Pricing Recomendada

### 4.1 Princípios

1. **Preço de entrada baixo** — defensores são funcionários públicos, sensíveis a preço
2. **Valor demonstrável** — cada R$ investido deve economizar horas de trabalho manual
3. **Freemium hook** — funcionalidade gratuita que vicia (parser PJe)
4. **Upsell claro** — features de automação e IA justificam o upgrade
5. **Abaixo do gasto atual** — cobrar menos que Jusbrasil + Astrea combinados

### 4.2 Modelo de Tiers Recomendado

| Tier | Preço/mês | Features | Target |
|------|-----------|----------|--------|
| **🆓 Grátis** | R$ 0 | Parser PJe (5 processos), dashboard básico, 3 análises IA/mês | Hook/trial |
| **⭐ Essencial** | **R$ 49/mês** | Processos ilimitados, alertas intimação, 50 análises IA/mês, sync manual Solar | Individual |
| **🚀 Profissional** | **R$ 97/mês** | Tudo do Essencial + automação Playwright, sync automático Solar, análise IA ilimitada, relatórios | Power user |
| **🏢 Núcleo** | **R$ 249/assento/mês** (mín. 5) | Tudo do Pro + dashboard equipe, atribuição processos, analytics, API acesso | Núcleos/equipes |

### 4.3 Justificativa do Preço — R$ 49-97/mês

**Por que R$ 49 (Essencial)?**
- É **50% do Jusbrasil Avançado** (R$ 98,90/mês)
- É **45% do Astrea pago** (R$ 109/mês)
- É **13% do ADVBOX** (R$ 360/mês)
- Está dentro da faixa que **57% dos softwares jurídicos BR** cobram (R$ 30-100/mês)
- Representa **0,16% do salário** de um defensor (R$ 30K) — custo desprezível
- Barreira psicológica: abaixo de R$ 50 = "compra por impulso" profissional

**Por que R$ 97 (Profissional)?**
- Equivalente a **1 hora de trabalho** do defensor (~R$ 100/hora*)
- Se a automação economiza **4+ horas/mês**, o ROI é 4x
- Abaixo do ChatGPT Plus (R$ 100/mês) que muitos já pagam
- Posiciona entre Astrea (R$ 109) e Jusbrasil Avançado (R$ 99) mas com features únicas

> *Cálculo: R$ 30.000/mês ÷ ~160h úteis ≈ R$ 187/hora. Mesmo usando ½ como proxy para "valor percebido" = ~R$ 94/hora.

### 4.4 Pricing Anual (Incentivo de Retenção)

| Tier | Mensal | Anual (2 meses grátis) | Desconto |
|------|--------|----------------------|----------|
| Essencial | R$ 49/mês | R$ 490/ano (~R$ 40,83/mês) | 17% |
| Profissional | R$ 97/mês | R$ 970/ano (~R$ 80,83/mês) | 17% |
| Núcleo | R$ 249/assento/mês | R$ 2.490/assento/ano | 17% |

---

## 5. Projeção de Receita — 12 Meses

### 5.1 Premissas Comuns

| Premissa | Valor | Justificativa |
|----------|-------|---------------|
| **Conversão freemium → pago** | 8-12% | Benchmark SaaS B2B profissional |
| **Mix pagantes**: Essencial/Pro/Núcleo | 65% / 30% / 5% | Maioria individual |
| **ARPU blended** | ~R$ 65/mês | (0.65×49 + 0.30×97 + 0.05×249) |
| **Churn mensal** | 3-4% (início), 2% (estável) | Workflow tool = baixo churn |
| **Custo infra variável/usuário** | R$ 3-5/mês | Ver seção 3.3 |
| **Gateway pagamento** | 4% da receita | Stripe/Asaas |
| **Impostos (Simples Nacional)** | 6% da receita | Faixa I (até R$ 180K/ano) |
| **Custo fixo base** | R$ 350/mês | Infra mínima (Vercel+Supabase+Railway) |

### 5.2 Cenário A — Conservador 🐢

*Crescimento orgânico puro. WhatsApp + boca-a-boca. Sem marketing pago.*

| Mês | Usuários Total | Pagantes | MRR (R$) | Custos (R$) | **Lucro (R$)** |
|-----|---------------|----------|----------|-------------|----------------|
| 1 | 15 | 1 | 65 | 370 | **-305** |
| 2 | 28 | 2 | 130 | 380 | **-250** |
| 3 | 42 | 3 | 195 | 395 | **-200** |
| 4 | 58 | 5 | 325 | 415 | **-90** |
| 5 | 75 | 6 | 390 | 430 | **-40** |
| 6 | 95 | 8 | 520 | 460 | **+60** |
| 7 | 115 | 10 | 650 | 490 | **+160** |
| 8 | 138 | 12 | 780 | 530 | **+250** |
| 9 | 160 | 14 | 910 | 570 | **+340** |
| 10 | 185 | 16 | 1.040 | 610 | **+430** |
| 11 | 210 | 18 | 1.170 | 660 | **+510** |
| 12 | 240 | 21 | 1.365 | 710 | **+655** |

**Resumo Conservador Ano 1:**

| Métrica | Valor |
|---------|-------|
| Usuários totais | 240 |
| Usuários pagantes | 21 |
| MRR mês 12 | **R$ 1.365** |
| Receita anual total | **~R$ 7.540** |
| Custos anuais | ~R$ 5.920 |
| **Lucro líquido anual** | **~R$ 1.620** |
| Break-even | **Mês 6** |
| Margem no mês 12 | ~48% |

### 5.3 Cenário B — Moderado 🚀

*Marketing ativo: WhatsApp groups de defensores, presença em eventos (ANADEP, Condege), content marketing, demos ao vivo.*

| Mês | Usuários Total | Pagantes | MRR (R$) | Custos (R$) | **Lucro (R$)** |
|-----|---------------|----------|----------|-------------|----------------|
| 1 | 35 | 3 | 195 | 400 | **-205** |
| 2 | 65 | 5 | 325 | 430 | **-105** |
| 3 | 100 | 9 | 585 | 480 | **+105** |
| 4 | 140 | 13 | 845 | 550 | **+295** |
| 5 | 185 | 17 | 1.105 | 640 | **+465** |
| 6 | 240 | 22 | 1.430 | 750 | **+680** |
| 7 | 300 | 28 | 1.820 | 870 | **+950** |
| 8 | 370 | 35 | 2.275 | 1.000 | **+1.275** |
| 9 | 440 | 42 | 2.730 | 1.150 | **+1.580** |
| 10 | 520 | 50 | 3.250 | 1.310 | **+1.940** |
| 11 | 600 | 58 | 3.770 | 1.480 | **+2.290** |
| 12 | 700 | 68 | 4.420 | 1.700 | **+2.720** |

**Resumo Moderado Ano 1:**

| Métrica | Valor |
|---------|-------|
| Usuários totais | 700 |
| Usuários pagantes | 68 |
| MRR mês 12 | **R$ 4.420** |
| ARR (Annual Run Rate) mês 12 | **R$ 53.040** |
| Receita anual total | **~R$ 22.750** |
| Custos anuais | ~R$ 10.760 |
| **Lucro líquido anual** | **~R$ 11.990** |
| Break-even | **Mês 3** |
| Margem no mês 12 | ~62% |

### 5.4 Cenário C — Agressivo 🔥

*Parceria com 2-3 Defensorias (BA, CE, TO), endorsement ANADEP/Condege, viral adoption, apresentação em conferências, contrato institucional com 1+ Defensoria.*

| Mês | Usuários Total | Pagantes | MRR (R$) | Custos (R$) | **Lucro (R$)** |
|-----|---------------|----------|----------|-------------|----------------|
| 1 | 60 | 4 | 260 | 420 | **-160** |
| 2 | 120 | 10 | 650 | 500 | **+150** |
| 3 | 200 | 20 | 1.300 | 650 | **+650** |
| 4 | 300 | 33 | 2.145 | 850 | **+1.295** |
| 5 | 420 | 50 | 3.250 | 1.100 | **+2.150** |
| 6 | 550 | 70 | 4.550 | 1.400 | **+3.150** |
| 7 | 700 | 95 | 6.175 | 1.750 | **+4.425** |
| 8 | 860 | 120 | 7.800 | 2.100 | **+5.700** |
| 9 | 1.020 | 145 | 9.425 | 2.500 | **+6.925** |
| 10 | 1.180 | 172 | 11.180 | 2.900 | **+8.280** |
| 11 | 1.350 | 200 | 13.000 | 3.350 | **+9.650** |
| 12 | 1.500 | 225 | 14.625 | 3.750 | **+10.875** |

**Resumo Agressivo Ano 1:**

| Métrica | Valor |
|---------|-------|
| Usuários totais | 1.500 |
| Usuários pagantes | 225 |
| MRR mês 12 | **R$ 14.625** |
| ARR mês 12 | **R$ 175.500** |
| Receita anual total | **~R$ 74.360** |
| Custos anuais | ~R$ 21.270 |
| **Lucro líquido anual** | **~R$ 53.090** |
| Break-even | **Mês 2** |
| Margem no mês 12 | ~74% |

---

## 6. Visão Comparativa dos Cenários

### 6.1 MRR no Mês 12

```
Conservador: R$ 1.365/mês  ████
Moderado:    R$ 4.420/mês  █████████████
Agressivo:   R$ 14.625/mês ██████████████████████████████████████████
```

### 6.2 Lucro Acumulado Ano 1

| Cenário | Receita Total | Custos Total | **Lucro Ano 1** | Margem Média |
|---------|---------------|-------------|-----------------|-------------|
| 🐢 Conservador | R$ 7.540 | R$ 5.920 | **R$ 1.620** | 21% |
| 🚀 Moderado | R$ 22.750 | R$ 10.760 | **R$ 11.990** | 53% |
| 🔥 Agressivo | R$ 74.360 | R$ 21.270 | **R$ 53.090** | 71% |

### 6.3 Projeção Ano 2 (se tendência continuar)

| Cenário | MRR Mês 24 | ARR Ano 2 | Lucro Mensal Mês 24 |
|---------|-----------|-----------|---------------------|
| 🐢 Conservador | ~R$ 3.500 | R$ 42.000 | ~R$ 2.000/mês |
| 🚀 Moderado | ~R$ 12.000 | R$ 144.000 | ~R$ 8.000/mês |
| 🔥 Agressivo | ~R$ 35.000 | R$ 420.000 | ~R$ 25.000/mês |

---

## 7. Unit Economics

### 7.1 Por Usuário Pagante

| Métrica | Valor | Benchmark SaaS |
|---------|-------|----------------|
| **ARPU** (Avg Revenue Per User) | R$ 65/mês | Bom para nicho BR |
| **Custo variável/usuário** | ~R$ 5/mês | Infra + IA + gateway |
| **Margem bruta/usuário** | R$ 60/mês (92%) | Excelente |
| **Payback period** | 0 meses (se CAC ≈ R$ 0) | Perfeito |
| **LTV (12 meses, 3% churn)** | R$ 540 | Com ARPU R$ 65, retenção 69% anual |
| **LTV (24 meses, 2% churn)** | R$ 1.020 | Com churn estabilizado |
| **LTV:CAC** | 54:1 (se CAC = R$ 10) | >3:1 é saudável |

### 7.2 Break-Even Mínimo

| Métrica | Cálculo |
|---------|---------|
| Custo fixo mensal | R$ 350 (infra) + R$ 100 (contabilidade) = R$ 450 |
| ARPU por pagante | R$ 65 |
| **Break-even = 450/65** | **≈ 7 pagantes** |

> **Com apenas 7 usuários pagantes, o OMBUDS já cobre seus custos.** Isso é extraordinariamente baixo para um SaaS.

---

## 8. Análise de Sensibilidade

### 8.1 E Se o Preço Fosse Diferente?

| Preço Essencial | Preço Pro | ARPU | Break-even (usuários) | MRR com 50 pagantes |
|----------------|-----------|------|----------------------|---------------------|
| R$ 29 | R$ 59 | ~R$ 40 | 12 | R$ 2.000 |
| **R$ 49** | **R$ 97** | **~R$ 65** | **7** | **R$ 3.250** |
| R$ 69 | R$ 129 | ~R$ 88 | 6 | R$ 4.400 |
| R$ 99 | R$ 199 | ~R$ 130 | 4 | R$ 6.500 |

### 8.2 Por que NÃO cobrar R$ 99+ desde o início?

1. **Fricção de entrada alta** → menos sign-ups → mais lento para atingir massa crítica
2. **Defensores comparam com Jusbrasil** (R$ 99/mês) → se for o mesmo preço, escolhem o mais estabelecido
3. **Sem network effects** → precisa de volume primeiro para criar valor comunitário
4. **Risco de mercado não validado** → preço baixo = mais dados de validação mais rápido

### 8.3 Quando Aumentar o Preço?

| Momento | Ação | Justificativa |
|---------|------|---------------|
| **0-6 meses** | R$ 49/97 | Conquistar primeiros 100 usuários |
| **6-12 meses** | Manter | Validar product-market fit |
| **12-18 meses** | R$ 59/119 (+20%) | Se NPS > 50 e churn < 3% |
| **18-24 meses** | R$ 79/149 | Com features premium maduras |
| **24+ meses** | Tier Enterprise | Contratos anuais com Defensorias |

---

## 9. Fatores Críticos de Sucesso

### 9.1 Distribuição (O Mais Importante)

| Canal | Custo | Eficácia | Prioridade |
|-------|-------|----------|-----------|
| **WhatsApp groups de defensores** | R$ 0 | ⭐⭐⭐⭐⭐ | #1 |
| **Recomendação pessoal** (viral K=0.3-0.5) | R$ 0 | ⭐⭐⭐⭐⭐ | #1 |
| **Eventos ANADEP/Condege** | R$ 500-2K | ⭐⭐⭐⭐ | #2 |
| **LinkedIn/Instagram jurídico** | R$ 0-200 | ⭐⭐⭐ | #3 |
| **Blog/YouTube** (PJe tips, templates) | R$ 0 (tempo) | ⭐⭐⭐ | #3 |
| **Parceria com Defensorias** (institucional) | Longo prazo | ⭐⭐⭐⭐⭐ | #2 (M6+) |

### 9.2 Ativação (Hook do Gratuito)

O plano grátis precisa entregar **valor imediato e óbvio**:
- Parser PJe → colar texto, receber dados estruturados em segundos
- Dashboard de processos → ver tudo em um lugar
- Alertas de intimação → "nunca mais perder prazo"

Se o free tier não convence em **5 minutos de uso**, a conversão será perto de 0%.

### 9.3 Retenção (Hábito Diário)

| Hábito | Frequência | Feature |
|--------|-----------|---------|
| Checar intimações do dia | Diário | Push notification + dashboard |
| Ver prazos da semana | Semanal | Calendário de deadlines |
| Analisar documento novo | Sob demanda | IA resumo de peças |
| Sync com Solar/PJe | Semanal | Automação Playwright |

> Meta: o defensor abrir o OMBUDS **toda manhã** como primeiro ato profissional.

### 9.4 Moat (Vantagem Competitiva)

1. **First-mover** em nicho específico (defensores públicos)
2. **Network effects** — mais usuários = melhores modelos de IA para texto jurídico penal
3. **Switching costs** — depois de configurar processos, é difícil migrar
4. **Integração Solar** — única ferramenta que se conecta ao Solar via Playwright
5. **Conhecimento de domínio** — built by a defensor, for defensores

---

## 10. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Baixa adoção (produto ≠ workflow) | Média | Alto | Entrevistar 10-20 defensores antes de features pagas |
| PJe muda interface e quebra scraping | Alta | Médio | Parser abstrato, múltiplos métodos de extração |
| Concorrente entra no mercado | Baixa (curto prazo) | Médio | Vantagem de first-mover, comunidade |
| Resistência institucional | Média | Médio | Focar em adoção individual primeiro |
| Custos de IA disparam | Baixa | Médio | Modelos mais baratos (Flash-Lite), cache |
| Preocupações com segurança/LGPD | Média | Alto | Criptografia, política transparente, SOC2-lite |
| Defensorias desenvolvem ferramenta interna | Baixa | Alto | Velocidade de iteração > governo |

---

## 11. Resposta Direta às Suas Perguntas

### "Qual valor mensal seria cabível de vender o SaaS OMBUDS por pessoa?"

**R$ 49/mês (plano Essencial) e R$ 97/mês (plano Profissional).**

Justificativa:
- É **0,16% do salário** de um defensor (R$ 30K) — imperceptível no orçamento pessoal
- **Mais barato** que Jusbrasil Pro (R$ 99), Astrea (R$ 109) e ADVBOX (R$ 360)
- **ROI claro**: se economizar 2 horas/mês de trabalho manual, já vale (hora do defensor ≈ R$ 100-187)
- Break-even com **apenas 7 pagantes** — risco financeiro quase zero
- Espaço para **aumentar 50-100% em 18 meses** quando o produto estiver maduro

### "Qual lucro eu poderia ter ao mês daqui a um ano?"

| Cenário | Esforço | Lucro no Mês 12 | Lucro Acumulado Ano 1 |
|---------|---------|-----------------|----------------------|
| 🐢 **Conservador** | Orgânico, tempo parcial | **R$ 655/mês** | R$ 1.620 |
| 🚀 **Moderado** | Marketing ativo, WhatsApp, eventos | **R$ 2.720/mês** | R$ 11.990 |
| 🔥 **Agressivo** | Parcerias institucionais, full-time | **R$ 10.875/mês** | R$ 53.090 |

**O cenário mais provável é o Moderado** — com marketing ativo na comunidade de defensores (WhatsApp groups, LinkedIn, eventos), é realista alcançar:
- **~700 usuários cadastrados**
- **~68 pagantes**
- **~R$ 4.420 de MRR**
- **~R$ 2.720 de lucro líquido mensal**

No **Ano 2**, mantendo o crescimento:
- **~R$ 12.000 de MRR**
- **~R$ 8.000 de lucro mensal**
- **ARR de R$ 144.000**

---

## 12. Próximos Passos Recomendados

| # | Ação | Prazo | Impacto |
|---|------|-------|---------|
| 1 | Validar preço com 10-20 defensores (pesquisa rápida WhatsApp) | 1 semana | Crítico |
| 2 | Implementar plano gratuito com parser PJe como hook | 2 semanas | Alto |
| 3 | Configurar gateway de pagamento (Stripe ou Asaas) | 1 semana | Alto |
| 4 | Lançar MVP pago (Essencial R$ 49) para early adopters | 1 mês | Alto |
| 5 | Criar grupo WhatsApp "OMBUDS Beta" com defensores | 1 semana | Alto |
| 6 | Publicar conteúdo sobre "como otimizar PJe" (LinkedIn/YouTube) | Contínuo | Médio |
| 7 | Apresentar em evento ANADEP/Condege | 3-6 meses | Alto |
| 8 | Buscar contrato piloto com DPE-BA ou DPE-CE | 6-12 meses | Muito Alto |

---

## Fontes da Pesquisa

- [Pesquisa Nacional da Defensoria Pública 2025](https://pesquisanacionaldefensoria.com.br/)
- [ANADEP — IV Diagnóstico](https://www.anadep.org.br/wtk/pagina/materia?id=25830)
- [Agência Brasil — Recorde Atendimentos 2024](https://agenciabrasil.ebc.com.br/justica/noticia/2025-05/defensorias-publicas-batem-recorde-de-atendimentos-em-2024)
- [Migalhas — 1 Defensor para 30 mil](https://www.migalhas.com.br/quentes/400634/brasil-tem-1-defensor-publico-para-cada-30-mil-cidadaos)
- [Jusbrasil Pro — Planos](https://www.jusbrasil.com.br/pro)
- [JusIA — Planos](https://ia.jusbrasil.com.br/planos)
- [Astrea — Planos e Preços](https://www.aurum.com.br/astrea/planos-e-precos/)
- [ADVBOX — Planos](https://advbox.com.br/planos)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Railway — Pricing](https://railway.com/pricing)
- [Vercel — Pricing](https://vercel.com/pricing)
- [Google Gemini API — Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Concurso DPE-BA — Salário R$ 29.421](https://blog.grancursosonline.com.br/concurso-dpe-ba-defensor/)
- [DPE-CE — Estrutura Remuneratória](https://www.defensoria.ce.def.br/portal-da-transparencia/gestao-de-pessoas/estrutura-remuneratoria/)
- [Concurso DPE-SP — Salário R$ 29.716](https://blog.grancursosonline.com.br/concurso-dpe-sp-defensor/)
- [Estratégia Concursos — Quanto ganha Defensor](https://cj.estrategia.com/portal/quanto-ganha-um-defensor-publico/)
