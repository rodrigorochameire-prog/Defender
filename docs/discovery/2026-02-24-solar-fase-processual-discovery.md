# Discovery: Formulário "Nova Fase Processual" do Solar

**Data**: 24/02/2026
**Versão Solar**: v25.010.1
**Conta usada**: rodrigo.meire@defensoria.ba.def.br (admin Camaçari)

---

## 1. Navegação até o formulário

### URL Pattern
```
/atendimento/{atendimento_numero}/#/processo/{numero_puro}/grau/{grau}
```

Exemplo:
```
/atendimento/260120000756/#/processo/80001893020258050039/grau/1
```

### Como chegar
1. `/processo/listar/` — Lista de processos (filtrar por defensor)
2. Clicar no nome da parte (link) → Navega para detalhe do processo
3. Aba "Processos" → Selecionar processo no painel esquerdo
4. Seção "Fases Processuais" → Botão "+ Nova Fase"

### Alternativa: busca direta
- Filtros: `?defensor=875&` (filtro por ID do defensor)
- Campo de busca: N° do processo, nome ou CP

---

## 2. Formulário "Fase Processual" (CadastroFaseForm)

### Form action
```
POST /processo/fase/salvar/
```

### Form name
```
CadastroFaseForm
```

### Campos ng-model

| Campo | ng-model | Tipo HTML | Select2? | Obrigatório |
|-------|----------|-----------|----------|-------------|
| ID (hidden) | `audiencia.id` | input hidden | N | - |
| Defensor | `audiencia.defensor` / `.defensor.id` | Select2 | **S** | S |
| Defensoria | `audiencia.defensoria` / `.defensoria.id` | Select2 | **S** | S |
| **Tipo** | `audiencia.tipo` / `.tipo.id` | Select2 | **S** | **S** (vermelho) |
| Data | `audiencia.data` | input text | N | S |
| Horário | `audiencia.hora` | input text | N | S |
| Status | `audiencia.audiencia_status` | Select2 | **S** | N |
| Itinerante | `audiencia.itinerante` / `.itinerante.id` | Select2 | **S** | N |
| **Descrição** | `audiencia.descricao` | textarea | N | N |
| Custódia | `audiencia.custodia` | checkbox? | N | N |
| Conciliação | `audiencia.conciliacao` | checkbox? | N | N |
| Honorário | `audiencia.honorario.*` | vários | N | N |
| Data/Hora Protocolo | `audiencia.data_hora_protocolo` | hidden | N | auto |
| Data Término | `audiencia.data_termino_protocolo` | hidden | N | auto |

### Hidden fields
- `csrfmiddlewaretoken` — CSRF do Django
- Processo ID (value: "25617")
- Atendimento número (value: "260120000756")

### Botões
- **Salvar**: `type="submit"`, `ng-click="salvando=true;"`, class `btn btn-primary`
- **Anexar Arquivos**: `type="submit"` (form `CadastroDocumentoFaseForm`)
- **Cancelar**: link
- **Fechar**: link

### Documento attachment form
```
POST /processo/fase/documento/salvar/
Form name: CadastroDocumentoFaseForm
```

---

## 3. Tipos de Atividade (263 opções)

### Estrutura do tipo
```json
{
  "id": 1,
  "nome": "Petição",
  "judicial": true,
  "extrajudicial": false,
  "audiencia": false,
  "juri": false,
  "sentenca": false,
  "recurso": false
}
```

### Tipos mais relevantes para OMBUDS

#### Atendimentos e Orientações
| ID | Nome |
|----|------|
| 52 | Consulta/Orientação |
| 29 | Assistência |
| 107 | Atendimento ao Sistema Criminal |

#### Petições e Manifestações
| ID | Nome |
|----|------|
| 1 | Petição |
| 210 | Petição Intermediaria |
| 51 | Alegações Finais/memoriais |
| 221 | Alegações finais |
| 170 | CONTESTAÇÃO |
| 267 | Resposta à acusação |
| 167 | Razões/contrarrazões |

#### Audiências
| ID | Nome |
|----|------|
| 2 | Audiência de Conciliação |
| 3 | Audiência de Instrução e Julgamento |
| 4 | Sessão do Tribunal do Júri |
| 21 | Audiência judicial |
| 22 | Audiência ANPP |
| 25 | Audiência Custódia |
| 48 | Audiência De Justificação |
| 50 | Audiência De Conciliação / Mediação |
| 101 | Audiência de Custódia |
| 109 | Audiência Admonitória |
| 225 | Audiência - Escuta especializada |
| 226 | Audiência condicional do processo |
| 227 | Audiência de Acordo de não Persecução Penal (ANPP) |
| 228 | Audiência de Advertência |
| 229 | Audiência de Apresentação |
| 232 | Audiência de suspensão condicional do processo |
| 233 | Audiência de transação penal |
| 268 | Sessão Plenária do Júri |

#### Recursos
| ID | Nome |
|----|------|
| 7 | Recurso de Apelação |
| 8 | Recurso de Agravo |
| 9 | Habeas Corpus |
| 27 | Apelação Cível |
| 28 | Agravo de Instrumento |
| 53 | Apelação |
| 65 | Apelação Criminal |
| 103 | Ação Rescisória |
| 104 | Agravo em Execução |
| 106 | Agravo em Execução Penal |
| 108 | Habeas Corpus Cível |
| 212 | Agravo de Instrumento - Razões |
| 213 | Agravo de instrumento - Contrarrazões |
| 222 | Apelação - Contrarrazões |
| 223 | Apelação - Interposição |
| 224 | Apelação - Razões |

#### Decisões e Sentenças
| ID | Nome |
|----|------|
| 5 | Sentença |
| 6 | Decisão Interlocutória |
| 10 | Cumprimento de Sentença |
| 123 | Intimação de Sentença |
| 237 | Ciência de Acórdão |
| 239 | Ciência de decisão |
| 240 | Ciência de despacho |
| 241 | Ciência de sentença |

#### Criminal Específico
| ID | Nome |
|----|------|
| 87 | Pedido de Liberdade Provisória |
| 88 | Pedido de Revogação de Prisão Preventiva |
| 90 | Resposta Acusação |
| 128 | Pedido de Revogação de Medida Protetiva |
| 163 | Pedido de Extinção de Punibilidade em Razão da Prescrição |
| 165 | Pedido de Flexibilização de Medida Protetiva de Urgência |
| 169 | Transação Penal |
| 261 | Medidas protetivas de urgência (Lei Maria da penha) criminal |
| 263 | Reabilitação criminal |

#### Execução Penal
| ID | Nome |
|----|------|
| 93 | Progressão de Regime |
| 94 | Livramento Condicional |
| 95 | Indulto |
| 96 | Comutação de Pena |
| 97 | Detração |
| 98 | Remição |
| 99 | Unificação |
| 100 | Visitas em Estabelecimentos Prisionais |
| 111 | Embargos de Execução da Pena de Multa |
| 113 | Impugnação ao Atestado de Pena |
| 115 | Remição de Pena |
| 116 | Saída Temporária |
| 253 | Execuções penais e medidas alternativas |

#### Diversos
| ID | Nome |
|----|------|
| 236 | Certidão |
| 256 | Juntada de documento |
| 257 | Juntada de ofício/resposta |
| 259 | Justificativa |
| 211 | Arquivamento |
| 171 | Notificação |
| 254 | Expedição de ofício |

---

## 4. Scope AngularJS do Modal

### Controller functions disponíveis
```
listar_documentos, forcar_atulizacao, download_unificado, novo, carregar,
buscar, buscar_numero, buscar_key, buscar_itinerantes, editar_processo,
transferir_processo, carregar_processo_permissao_botoes, carregar_processo,
carregar_eproc, carregar_eproc_vinculado, carregar_prazos_vinculados,
escutar_eproc, carregar_substitutos, set_data_protocolo,
set_data_termino_protocolo, realizada, carregar_defensorias, limpar_busca,
load_data, init, removerNaoNumericos, novo_processo,
novo_processo_extrajudicial, set_pessoa, carregar_modal, salvar_situacao_parte
```

### Objeto `audiencia` (scope)
Keys: `audiencia_realizada`, `audiencia_status`, `custodia`, `data`,
`data_hora_protocolo`, `data_protocolo`, `data_termino`,
`data_termino_protocolo`, `defensor`, `defensoria`, `honorario`, `hora`,
`hora_termino`, `itinerante`, `processo`

### Dados pré-carregados no scope
- `tipos`: 263 objetos {id, nome, judicial, extrajudicial, audiencia, juri, sentenca, recurso}
- `defensorias`: lista de defensorias
- `defensores`: lista de defensores
- `itinerantes`: lista de itinerantes

---

## 5. Abas do Atendimento

| Aba | Hash route | Conteúdo |
|-----|-----------|----------|
| Histórico | `#/historico` | Timeline: anotações, criação do fluxo |
| Documentos | `#/documentos` | Gestão de documentos |
| Tarefas/Cooperações | `#/tarefas` | Tarefas e cooperações entre defensores |
| **Processos** | `#/processo/{num}/grau/{g}` | Dados, Assuntos, **Fases Processuais** |
| PJE | `#/eproc/{num}/grau/{g}` | Dados do PROCAPI (movimentações, partes) |
| Outros | `#/outros` | Dados adicionais |
| Propacs | `#/propacs` | Processos administrativos |

### Botões de ação (Histórico tab)
- **Agendar** (verde) — Agendar atendimento
- **Apoio Operacional** (cinza) — Solicitar apoio
- **Anotação** (laranja) — Criar anotação no atendimento

### Botões de ação (Processos tab)
- **Visualizar** — Ver detalhes do processo
- **Cadastrar Prisão** — Registrar prisão
- **Editar** — Editar dados do processo
- **Transferir** — Transferir processo
- **Excluir** — Excluir processo (vermelho)
- **Nova Fase** — Criar fase processual

### Botões de ação (PJE tab)
- **Forçar atualização do Processo** (laranja)
- **Materialização Completa** — Download completo dos autos

---

## 6. Estrutura de dados Solar

### Defensor
```json
{
  "id": 875,
  "nome": "JULIANE ANDRADE PEREIRA",
  "servidor": 875,
  "usuario": 876,
  "ativo": true
}
```

### Defensoria
```json
{
  "id": 161,
  "codigo": "7DPC",
  "nome": "7ª DP de Camaçari",
  "atuacao": "Júri, Execução Penal e Violência Doméstica (acusado)",
  "pode_vincular_processo_judicial": true,
  "comarca": 32
}
```

### Processo na lista
```json
{
  "id": 38899,
  "numero": "0502340-58.2019.8.05.0039",
  "comarca__nome": "...",
  "area__nome": "...",
  "vara__nome": "...",
  "numero_puro": "05023405820198050039",
  "grau": 1,
  "partes": [...]
}
```

### Link do processo na lista
```
/atendimento/{atendimento_numero}/#/processo/{numero_puro}/grau/{grau}
```

---

## 7. Mapeamento OMBUDS Tipo → Solar Tipo ID

| OMBUDS tipo anotação | Solar tipo_id | Solar nome |
|---------------------|---------------|------------|
| nota | 52 | Consulta/Orientação |
| atendimento | 52 | Consulta/Orientação |
| audiencia | 3 | Audiência de Instrução e Julgamento |
| peticao | 1 | Petição |
| recurso | 53 | Apelação |
| sentenca | 5 | Sentença |
| decisao | 6 | Decisão Interlocutória |
| habeas_corpus | 9 | Habeas Corpus |
| contestacao | 170 | CONTESTAÇÃO |
| alegacoes_finais | 221 | Alegações finais |
| resposta_acusacao | 267 | Resposta à acusação |

---

## 8. Estratégia de preenchimento via Playwright

### Select2 (todos os dropdowns)
```python
# 1. Clicar no container Select2
await page.click('.select2-container a.select2-choice')

# 2. Digitar no campo de busca
await page.fill('.select2-search input', 'texto de busca')

# 3. Aguardar resultados
await page.wait_for_selector('.select2-results li')

# 4. Clicar no primeiro resultado
await page.click('.select2-results li:first-child')
```

### Campos de texto
```python
# Data (já vem pré-preenchida)
await page.fill('[ng-model="audiencia.data"]', '24/02/2026')

# Hora (já vem pré-preenchida)
await page.fill('[ng-model="audiencia.hora"]', '10:30')

# Descrição
await page.fill('[ng-model="audiencia.descricao"]', 'Texto da fase...')
```

### Salvar
```python
# Click save button
await page.click('.modal.in .btn-primary[type="submit"]')
```

### Alternativa: AngularJS scope injection
```python
script = """
var scope = angular.element(document.querySelector('.modal.in')).scope();
scope.$apply(function() {
  scope.audiencia.tipo = { id: 52 };  // Consulta/Orientação
  scope.audiencia.descricao = 'Texto da fase...';
  scope.audiencia.data = '24/02/2026';
  scope.audiencia.hora = '10:30';
});
"""
await page.evaluate(script)
```

---

## 9. Formulário de Anotação (Histórico)

### URL Pattern
```
POST /atendimento/{atendimento_numero}/anotacao/nova/
```

### Tipo de formulário
**Django puro** — NÃO usa AngularJS ng-model. Formulário HTML padrão com CSRF.

### Como abrir
1. Navegar para `/atendimento/{id}/#/historico`
2. Clicar botão laranja "Anotação" no rodapé
3. Aparece um popup inline (não modal Bootstrap)

### Campos

| Campo | HTML | ID | Tipo |
|-------|------|----|------|
| CSRF | input hidden | csrfmiddlewaretoken | auto |
| Next | input hidden | next | auto (redirect pós-save) |
| Atuação | select | #id_atuacao | Defensoria + Defensor |
| Qualificação | select | #id_qualificacao | Tipo da anotação |
| Histórico | textarea | name="historico" | Texto livre |

### Qualificações (12 opções)

| ID | Nome |
|----|------|
| 302 | ANOTAÇÕES |
| 303 | ARQUIVAMENTO |
| 304 | ANDAMENTO DE PROCESSO VINCULADO |
| 305 | DESPACHO DO(A) DEFENSOR(A) |
| 306 | DILIGÊNCIAS |
| 307 | LEMBRETE |
| 308 | NÃO COMPARECIMENTO DO ASSISTIDO |
| 309 | RECEBIMENTO DE EXPEDIENTES (CARTAS, OFÍCIOS, ETC.) |
| 310 | REGISTRO DE TENTATIVA DE CONTATO COM ASSISTIDO |
| 311 | VISTA DE PROCESSO |
| 312 | ENTREGA/RECEBIMENTO DE DOCUMENTOS |

### Botões
- **Salvar**: `button:has-text("Salvar")`
- **Cancelar**: `button:has-text("Cancelar")`

### Estratégia de preenchimento
```python
# Anotação é Django form — usar page.fill() e page.select_option()
await page.select_option('#id_atuacao', value='1459')  # Defensoria
await page.select_option('#id_qualificacao', value='302')  # ANOTAÇÕES
await page.fill('textarea[name="historico"]', 'Texto da anotação...')
await page.click('button:has-text("Salvar")')
```

---

## 10. Aba Documentos

### Hash route
```
#/documentos
```

### Estrutura
- **Documentos do Atendimento**: arquivos enviados pelo defensor
  - Organizados em pastas ("SEM PASTA" default)
  - Cada documento: nome, tamanho, quem enviou, data
  - Botões: "Desmarcar todos", "Selecionar todos", "Baixar"
- **Documentos Pessoais**: pasta com nome do assistido

### Exemplo de documento
```
📎 Revogação preventiva Josivaldo (120.66 kb)
   Enviado por juliane.pereira em 20/01/2026 10:05
```

---

## 11. Aba Tarefas / Cooperações

### Hash route
```
#/tarefas
```

### Estrutura
- Botão "+ Nova Cooperação" (com outros setores)
- Seção TAREFAS: lista de tarefas atribuídas
- Normalmente vazio se não há cooperações ativas

---

## 12. Aba Outros

### Hash route
```
#/outros
```

### Seções
- **PROCESSOS SEM ATENDIMENTO VINCULADO**: processos da pessoa sem fluxo
- **ATENDIMENTOS COMO REQUERENTE**: outros atendimentos onde é parte ativa
- **ATENDIMENTOS COMO REQUERIDO**: outros atendimentos como parte passiva

---

## 13. Peticionamento (/processo/peticionamento/buscar/)

### Status cards
| Status | Cor |
|--------|-----|
| Erro no protocolo | Vermelho |
| Aguardando análise | Laranja |
| Analisados | Amarelo |
| Na fila para protocolo | Verde |
| Protocoladas | Azul |

### Filtros
- Data Inicial / Data Final
- Defensorias (multi-select)
- Responsáveis (multi-select)
- Tipo
- Sistema
- Etiquetas
- Campo de busca: "Nº do atendimento, nome, CPF"

### Botões de ação
- **Associações**: vincular peticionamentos
- **Protocolar** (verde): enviar ao PJe
- **Etiquetas**: gerenciar tags

### Tabela
Colunas: Número, Tipo, Processo/Classe, Vara/Comarca, Requerente, Defensoria, Data Registro, Data Resposta, Situação, Ações

---

## 14. Sidebar — Menus do Solar

| Menu | URL | Descrição |
|------|-----|-----------|
| Buscar | dropdown | Busca rápida por atendimento |
| Recepção | /atendimento/recepcao/ | Triagem de atendimentos |
| GED | /ged/painel/ | Gestão Eletrônica de Documentos |
| Defensor | /atendimento/perfil/ | Perfil do defensor logado |
| Processos | submenu | → Processos, Peticionamentos, Avisos, Audiências, Propacs |
| Livre | submenu | Menu customizável |
| Relatórios | /relatorios/ | Relatórios do Solar |
| Admin | submenu | Configurações administrativas |
| Ajuda | submenu | Documentação/suporte |
