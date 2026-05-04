# Heurísticas de classificação — Varredura da Triagem

Tabela de regras para mapear o conteúdo lido de uma intimação ao `ato` e demais
campos da demanda. Aplicar **em ordem** — a primeira regra que casa vence.

## Padrão de matching

Cada regra tem:
- **Pattern** — regex ou keyword no `innerText` do documento (case-insensitive,
  sem acentos para reduzir false-negative)
- **ato** — valor exato em `atos-por-atribuicao.ts` (case-sensitive!)
- **prioridade** — `URGENTE` | `ALTA` | `NORMAL` | `BAIXA`
- **prazo** — dias ou `null`
- **registro_tipo** — `ciencia` | `diligencia` | `anotacao`
- **side_effects** — ex.: `agendar_audiencia`, `marcar_concluido`, `marcar_sem_atuacao`

---

## VVD (Violência Doméstica)

```yaml
- nome: AIJ designada
  pattern: '(designo|designada|fica designada).{0,40}(audiencia|aij|instrucao e julgamento)'
  ato: 'Ciência designação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]
  campos_extras:
    tipo_audiencia: INSTRUCAO

- nome: AIJ redesignada
  pattern: '(redesigno|redesignada|fica redesignada).{0,40}(audiencia|aij)'
  ato: 'Ciência redesignação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [reagendar_audiencia]
  campos_extras:
    tipo_audiencia: INSTRUCAO

- nome: Justificação designada
  pattern: 'designada.{0,30}audiencia.{0,15}justificacao'
  ato: 'Ciência designação de audiência'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]
  campos_extras:
    tipo_audiencia: JUSTIFICACAO

- nome: Resposta à acusação
  pattern: '(nomeada a defensoria|vistas? a dpe).{0,80}resposta a acusacao|apresente.{0,20}resposta a acusacao'
  ato: 'Resposta à Acusação'
  prioridade: URGENTE
  prazo: 10
  registro_tipo: diligencia

- nome: Alegações finais
  pattern: 'prazo (sucessivo )?de \d+ dias.{0,40}alegacoes finais|memoriais finais'
  ato: 'Alegações finais'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Memoriais
  pattern: 'apresentar memoriais|prazo.{0,30}memoriais'
  ato: 'Memoriais'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Manifestação sobre laudo
  pattern: 'manifeste-?se sobre o laudo|vistas?.{0,15}laudo'
  ato: 'Manifestação sobre laudo'
  prioridade: NORMAL
  prazo: 5
  registro_tipo: diligencia

- nome: Manifestação sobre revogação MPU
  pattern: 'manifeste-?se.{0,30}(revogacao|modulacao).{0,15}(mpu|medida protetiva)'
  ato: 'Manifestação sobre MPU'
  prioridade: NORMAL
  prazo: 5
  registro_tipo: diligencia

- nome: Cumprir despacho
  pattern: 'deixo de conhecer|formular em autos proprios|providencie .{0,40}'
  ato: 'Cumprir despacho'
  prioridade: URGENTE
  registro_tipo: diligencia

- nome: Sentença absolutória
  pattern: '(sentenca|julgo).{0,200}absolv'
  ato: 'Ciência absolvição'
  prioridade: NORMAL
  registro_tipo: ciencia

- nome: Sentença condenatória
  pattern: '(sentenca|julgo).{0,200}condeno'
  ato: 'Ciência condenação'
  prioridade: ALTA
  registro_tipo: ciencia

- nome: Sentença genérica
  pattern: '\bsentenca\b'
  ato: 'Analisar sentença'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Acórdão improvido
  pattern: '\bacordao\b.{0,500}(improvido|desprovido|nao provido)'
  ato: 'Ciência acórdão'
  prioridade: NORMAL
  registro_tipo: ciencia

- nome: Acórdão genérico
  pattern: '\bacordao\b'
  ato: 'Analisar acórdão'
  prioridade: URGENTE
  prazo: 15
  registro_tipo: diligencia

- nome: Decisão interlocutória
  pattern: '\bdecisao\b'
  ato: 'Analisar decisão'
  prioridade: NORMAL
  registro_tipo: diligencia

- nome: Arquivamento definitivo
  pattern: 'arquivado definitivamente|arquivamento definitivo'
  ato: 'Ciência'
  prioridade: BAIXA
  registro_tipo: ciencia
  side_effects: [marcar_concluido]

- nome: Sigiloso sem visibilidade
  pattern: 'sigiloso.{0,30}sem visibilidade|peticionar.{0,30}fora dos autos'
  ato: 'Outro'
  prioridade: BAIXA
  registro_tipo: anotacao
  side_effects: [marcar_sem_atuacao]

- nome: Renúncia indeferida (réu com particular)
  pattern: 'reu.{0,40}advogado particular|renuncia.{0,30}indeferida'
  ato: 'Ciência'
  prioridade: BAIXA
  registro_tipo: anotacao
```

---

## Júri (Tribunal do Júri)

Acrescenta sobre VVD:

```yaml
- nome: Sessão de Julgamento (plenário)
  pattern: 'sessao de julgamento.{0,30}(tribunal do juri|plenario)'
  ato: 'Ciência sessão de julgamento'
  prioridade: ALTA
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]
  campos_extras:
    tipo_audiencia: JURI

- nome: Pronúncia
  pattern: '\bpronunci(o|a)\b'
  ato: 'Ciência da pronúncia'
  prioridade: ALTA
  registro_tipo: ciencia

- nome: Impronúncia
  pattern: 'improvincio|impronunci(o|a)'
  ato: 'Ciência da impronúncia'
  prioridade: ALTA
  registro_tipo: ciencia

- nome: Desclassificação
  pattern: 'desclassific'
  ato: 'Ciência desclassificação'
  prioridade: ALTA
  registro_tipo: ciencia

- nome: Diligências do art. 422
  pattern: 'art\.?\s*422|diligencias do 422'
  ato: 'Diligências do 422'
  prioridade: ALTA
  prazo: 5
  registro_tipo: diligencia
```

---

## Execução Penal

```yaml
- nome: Designação justificação
  pattern: 'designada.{0,30}audiencia.{0,15}justificacao'
  ato: 'Designação de justificação'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]

- nome: Designação admonitória
  pattern: 'designada.{0,30}audiencia admonitoria'
  ato: 'Designação admonitória'
  prioridade: NORMAL
  registro_tipo: ciencia
  side_effects: [agendar_audiencia]

- nome: Reconversão (manifestação)
  pattern: 'manifeste-?se.{0,30}reconversao'
  ato: 'Manifestação contra reconversão'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia

- nome: Regressão (manifestação)
  pattern: 'manifeste-?se.{0,30}regressao'
  ato: 'Manifestação contra regressão'
  prioridade: URGENTE
  prazo: 5
  registro_tipo: diligencia
```

---

## Fallback (qualquer atribuição)

```yaml
- nome: PDF (binário) — leitura manual
  pattern: __frame_binario__   # detectado no extractor
  ato: 'Analisar decisão'
  prioridade: NORMAL
  registro_tipo: diligencia
  campos_extras:
    revisao_pendente: true

- nome: Conteúdo curto / sem match
  pattern: __no_match__
  ato: 'Ciência'                # mantém default
  prioridade: NORMAL
  registro_tipo: anotacao
  campos_extras:
    revisao_pendente: true
```

---

## Notas operacionais

- **Sempre normalizar acentos antes do regex** (`unicodedata.normalize('NFD', text).encode('ascii','ignore').decode().lower()`).
- **Não mexer em `status`** — a varredura não altera o ponto do kanban; isso é
  decisão do Rodrigo após revisar.
- **Prazo expresso vence presunção** — se o doc diz "5 dias", usar isso ao
  invés do default da regra.
- **Datas relativas** — `prazo` deve ser convertido para data absoluta usando
  data de intimação eletrônica (expedição + 10 dias corridos), conforme
  `reference_prazo_intimacao_eletronica.md`.
