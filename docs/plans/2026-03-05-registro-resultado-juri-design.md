# Design: Registro de Resultado do Júri + Dashboard Analítico + Calculadora de Execução Penal

> Data: 2026-03-05
> Status: Aprovado (brainstorming)

---

## 1. Visão Geral

Três features interconectadas para o pós-júri:

1. **Registro de Resultado** — Upload de documentos oficiais (quesitos, sentença, ata) → extração por AI → revisão humana → persistência
2. **Dashboard Analítico** — Cosmovisão dos plenários com cruzamento de variáveis (tipo penal, jurado, juiz, promotor, tese, local, duração, perfil)
3. **Calculadora de Execução Penal** — Timeline visual com marcos de progressão, livramento condicional, detração, exportável como diagrama Excalidraw para mostrar ao assistido e família

---

## 2. Registro de Resultado

### 2.1 Fluxo — Dois Momentos Separados

**Momento 1 — No plenário (já existe)**
- Encerra sessão no cockpit → salva observações + resultado básico (absolvição/condenação)
- `sessoesJuri.status = 'realizada'`, `sessoesJuri.registroCompleto = false`
- Aparece como **pendência** na hub do júri com badge amarelo "Registro pendente"

**Momento 2 — Quando o defensor quiser (horas, dias depois)**
- Acessa a pendência → abre tela de registro em 3 etapas
- Dados do cockpit (observações, jurados, argumentos) já presentes como contexto
- Ao completar: `registroCompleto = true`, badge some

### 2.2 Etapas do Registro

**Etapa 1 — Upload de Documentos**
- Dropzone para 3 tipos: Folha de Quesitos, Sentença, Ata da Sessão
- Aceita PDF e foto (JPG/PNG)
- Envia ao enrichment-engine → OCR (Docling) + extração estruturada (Anthropic Claude)
- Indicador de processamento por documento

**Etapa 2 — Revisão dos Dados Extraídos**
- Formulário pré-preenchido pela AI, organizado em abas:
  - **Quesitos**: lista ordenada, texto, resultado (SIM/NÃO/prejudicado), ordem de votação, tipo
  - **Dosimetria**: pena-base, circunstâncias judiciais (art. 59), agravantes, atenuantes, causas de aumento/diminuição, pena total, regime inicial
  - **Contexto**: juiz presidente, promotor, duração da sessão, testemunhas ouvidas, uso de algemas, incidentes processuais
  - **Perfil do caso**: tipo penal, tese principal, perfil réu (primário/reincidente, idade), perfil vítima (gênero, idade), local do fato
  - **Detração**: data início da preventiva, data da condenação, total de dias
- Cada campo editável — defensor corrige erros da AI
- Badge "extraído por AI" vs "editado manualmente"

**Etapa 3 — Confirmação e Salvar**
- Resumo visual do que será salvo
- Botão confirmar → persiste tudo no banco
- Se condenação: oferece link para calculadora de execução penal

### 2.3 Processamento via Enrichment Engine

Novo endpoint: `POST /juri/extrair-documentos`

Prompts específicos por tipo de documento:
- **Quesitos**: extrair cada quesito em ordem, texto, resultado, se prejudicado
- **Sentença**: extrair dosimetria completa (cada fase), tipo penal, qualificadoras, pena total, regime
- **Ata**: extrair juiz, promotor, horários (início/fim), testemunhas, incidentes

---

## 3. Dashboard Analítico — Cosmovisão dos Plenários

### 3.1 Filtros Globais (topo da página)
- Período: ano / quadrimestre / mês / custom
- Comarca
- Defensor (para visão gerencial)

### 3.2 Bloco 1 — Panorama Geral (cards KPI)
- Total de sessões | Absolvições | Condenações | Desclassificações
- Comparativo com período anterior (seta + %)

### 3.3 Bloco 2 — O Mapa dos Júris (visualização central)
- Gráfico temporal com resultados empilhados
- Overlay de eventos relevantes (mudança de lei, troca de juiz titular — anotações manuais)
- Permite ver ondas e tendências

### 3.4 Bloco 3 — Dinâmicas do Plenário
Cards clicáveis com drill-down:

| Dimensão | Pergunta que responde |
|----------|----------------------|
| **Teses × Resultado** | Quais teses funcionam em quais contextos? |
| **Tipo penal × Resultado** | Taxa de absolvição por crime |
| **Duração × Resultado** | Sessões longas tendem a qual desfecho? |
| **Perfil do caso × Resultado** | Primário vs reincidente, idade vítima, local — o que mais influencia? |

### 3.5 Bloco 4 — Os Atores
| Ator | O que mostra |
|------|-------------|
| **Jurados** | Mapa de tendências do corpo de jurados da comarca — histórico de votos agregado |
| **Juízes presidentes** | Padrão de resultado sob cada presidência |
| **Promotores** | Padrões argumentativos e resultados |

### 3.6 Bloco 5 — Insights Cruzados
- Correlações detectadas automaticamente pelo sistema
- Ex: "Sessões com mais de 5h têm 70% de condenação"
- Ex: "Negativa de autoria + réu primário = 60% absolvição"
- Mais sessões registradas → mais insights

---

## 4. Calculadora de Execução Penal

### 4.1 Input
- Tipo penal + qualificadoras
- Pena total aplicada
- Regime inicial
- Data do fato (determina qual lei aplicar)
- Primário ou reincidente
- Data de início da prisão preventiva (busca no processo ou manual)
- Data da condenação
- Se houve resultado morte
- Se é feminicídio

### 4.2 Tabela de Frações — Art. 112, LEP

**Pós-Pacote Anticrime (fato ≥ 23/01/2020):**

| Inciso | Fração | Cenário | Livr. Cond. |
|--------|--------|---------|-------------|
| III | 25% | Primário + violência (hom. simples, privilegiado) | Sim |
| IV | 30% | Reincidente + violência | Sim |
| V | 40% | Hediondo, primário (hom. qualificado) | Sim |
| VI-a | 50% | Hediondo + resultado morte, primário | **Vedado** |
| VI-A | 55% | Feminicídio, primário (Lei 14.994/2024, vigente 10/10/2024) | **Vedado** |
| VII | 60% | Reincidente hediondo | Sim |
| VIII | 70% | Reincidente hediondo + resultado morte | **Vedado** |

**Pré-Pacote Anticrime (fato < 23/01/2020):**

| Fração | Cenário |
|--------|---------|
| 1/6 | Comum (homicídio simples/privilegiado) |
| 2/5 | Hediondo, primário |
| 3/5 | Hediondo, reincidente |

**Feminicídio 55%**: somente fatos ≥ 10/10/2024 (Lei 14.994/2024).

### 4.3 Motor de Cálculo
1. Identifica fração: data do fato × tipo penal × primariedade × resultado morte
2. Calcula detração: data início preventiva → data condenação = X dias
3. Saldo de pena = pena total − detração
4. Calcula marcos sobre o saldo:
   - **Progressão 1** (fechado → semiaberto): fração × saldo
   - **Progressão 2** (semi → aberto): fração × saldo restante
   - **Saída temporária**: regime semiaberto + 1/6
   - **Livramento condicional** (se não vedado): 1/3 primário, 1/2 reincidente, 2/3 hediondo
   - **Remição projetada**: 3 dias trabalhados : 1 dia remido

### 4.4 Output — Timeline Visual

```
|--[DETRAÇÃO: preventiva]--|------[fechado]------|----[semi]-----|--[aberto]--|
  dd/mm/aa → dd/mm/aa       ^progressão 1        ^progressão 2   ^LC
  (X dias descontados)       dd/mm/aaaa           dd/mm/aaaa      dd/mm/aaaa
```

- Cards com cada marco: data projetada, fração aplicada, fundamento legal
- Alerta visual quando livramento condicional é vedado
- Botão "Exportar PDF"

### 4.5 Diagrama Excalidraw para o Assistido
- Gerado automaticamente a partir dos dados calculados
- Linguagem acessível (não jurídica): "Você já cumpriu X", "Pode pedir mudança de regime em dd/mm/aaaa"
- Visual limpo com cores: verde (cumprido), azul (regime atual), cinza (futuro)
- Marcos destacados com ícones intuitivos
- Exportável como imagem para mostrar em atendimento presencial ou enviar por WhatsApp

---

## 5. Schema do Banco

### Campos adicionais em `sessoesJuri`:
```
registroCompleto: boolean (default false)
juizPresidente: text
promotor: text
duracaoMinutos: integer
localFato: text
tipoPenal: enum (homicidio_simples, homicidio_qualificado, homicidio_privilegiado,
                 homicidio_privilegiado_qualificado, homicidio_tentado, feminicidio)
tesePrincipal: text
reuPrimario: boolean
reuIdade: integer
vitimaGenero: text
vitimaIdade: integer
usouAlgemas: boolean
incidentesProcessuais: text
```

### Nova tabela: `quesitosJuri`
```
id: uuid (PK)
sessaoJuriId: uuid (FK → sessoesJuri)
ordem: integer (sequência de votação)
texto: text
resultado: enum (sim, nao, prejudicado)
tipo: enum (materialidade, autoria, absolvicao, qualificadora, privilegio,
            causa_aumento, causa_diminuicao, custom)
createdAt: timestamp
```

### Nova tabela: `dosimetriaJuri`
```
id: uuid (PK)
sessaoJuriId: uuid (FK → sessoesJuri)
penaBase: text
circunstanciasJudiciais: text (art. 59)
agravantes: text
atenuantes: text
causasAumento: text
causasDiminuicao: text
penaTotalAnos: integer
penaTotalMeses: integer
regimeInicial: enum (fechado, semiaberto, aberto)
detracaoInicio: date (início da preventiva)
detracaoFim: date (data da condenação)
detracaoDias: integer
dataFato: date
fracaoProgressao: text (ex: "40%")
incisoAplicado: text (ex: "art. 112, V")
vedadoLivramento: boolean
createdAt: timestamp
```

### Nova tabela: `documentosJuri`
```
id: uuid (PK)
sessaoJuriId: uuid (FK → sessoesJuri)
tipo: enum (quesitos, sentenca, ata)
url: text (storage URL)
dadosExtraidos: jsonb (raw da AI)
processadoEm: timestamp
createdAt: timestamp
```

---

## 6. Ordem de Implementação

1. **Schema** — Migração com novas tabelas e campos
2. **Pendências na hub** — Badge "Registro pendente" + listagem
3. **Upload + Extração** — Endpoint no enrichment-engine + dropzone no frontend
4. **Formulário de Revisão** — Tela de 3 etapas com dados pré-preenchidos
5. **Calculadora de Execução Penal** — Motor de cálculo + timeline visual
6. **Diagrama Excalidraw** — Geração automática para o assistido
7. **Dashboard Analítico** — KPIs + gráficos + drill-down + insights cruzados
