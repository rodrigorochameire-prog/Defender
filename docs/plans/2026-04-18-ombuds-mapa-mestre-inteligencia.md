# OMBUDS · Mapa Mestre de Inteligência Estratégica

**Data:** 2026-04-18
**Autor:** Defensor Rodrigo + Claude
**Propósito:** Roadmap consolidado para transformar OMBUDS de gestor de processos em app de inteligência estratégica para defesa criminal. Serve como north star e contexto-semente para os brainstormings/specs futuros. Cada fase tem resumo de ~1 página; spec detalhado é escrito sob demanda quando a fase chega.

---

## Visão

Defensor público em Camaçari / 9ª DP atua em Júri, Violência Doméstica (VVD), Execução Penal, ANPP, tráfico, roubo e outros. Hoje, cada caso é uma ilha. Testemunhas são strings, delitos são enum genérico, lugares são texto livre, fatos são descritos em prosa. O valor acumulado de meses/anos de trabalho fica inacessível — ninguém consegue cruzar.

O objetivo é transformar os dados que já existem (e os que vão sendo coletados) em **inteligência acionável**: padrões, cruzamentos, alertas oportunos. Sem ruído, sem poluição visual, sem exigir leitura densa. O defensor **vê o que importa, quando importa, onde importa**.

## Framework de 3 camadas

Toda informação estratégica pertence a uma dessas três camadas:

### Camada 1 · Entidades cruzáveis
Catálogo global. Cada instância tem participações N:N com processos. Serve pra contar, agregar, correlacionar entre casos.
- **Pessoas** (✅ Fase I-A)
- **Lugares** (🟡 Fase II)
- **Delitos/Tipificações** (🟡 Fase III)
- **Objetos apreendidos** (🟡 Fase V)
- **Locais de cumprimento de pena alternativa** (🟡 com Fase IX)
- **Medidas Protetivas — tipos** (🟡 com Fase VII)
- **Órgãos/Instituições** (opcional, baixa prioridade em comarca única)

### Camada 2 · Atributos estruturados ricos
Blocos tipados dentro do processo. Não são catálogo global, mas transformam o caso de prosa livre em dado comparável.
- Cronologia processual (Fase IV)
- Prisões e cautelares (Fase IV)
- Modus operandi / circunstâncias do fato (Fase VI)
- Medidas protetivas — bloco MPU (Fase VII)
- Violência sexual contra menor — bloco específico (Fase VIII)
- Execução penal — cronologia executiva (Fase IX)
- ANPP / tráfico / roubo — blocos específicos (Fase X)
- Histórico penal do assistido (Fase XI)

### Camada 3 · Flags detectores de padrão
Calculados a partir das camadas 1-2. Sinalizam situação estratégica, risco, oportunidade, urgência. Aqui mora a inteligência real — transformam dado bruto em alerta/recomendação.

Exemplos (distribuídos pelas fases):
- Uso instrumental da LMP
- Alienação parental potencial
- Padrão de falsa acusação em violência sexual contra menor
- Prescrição executória iminente
- Indulto/comutação aplicável
- Risco de regressão por desatualização cadastral
- Excesso de prazo de prisão preventiva
- ANPP cabível não oferecido
- Abordagem sem fundada suspeita (nulidade tráfico)
- Pessoa recorrente na comarca

## Princípios invariantes

1. **Coleta silenciosa antes de apresentação** — cada fase separa fundação (dados) de sinalização (UX). Isso evita calibrar sinalização no vazio.
2. **Papéis rotativos vs estáveis** — em comarca única, juiz/promotor/servidor não ganham sinalização (titularidade constante = ruído). Só pessoas rotativas (testemunha, policial, perito, etc).
3. **Ausência comunica** — sem sinal visual = "nada relevante detectado". É informação útil.
4. **Pull antes de push** — hover/click preferíveis; alerta/banner só pra alto valor.
5. **Ambiguidade com humildade** — "?" onde há incerteza, confidence explícita onde importa.
6. **Threshold rigoroso** — melhor não mostrar do que mostrar fraco.
7. **LGPD como feature** — dados de profissionais públicos livres; testemunhas/vítimas/menores com ACL granular + audit.
8. **Cada fase entrega valor sozinha** — sistema melhora em camadas, nunca depende de fase N+1 pra valer.

---

# FASES

## ✅ Fase I-A · Pessoas · Fundação Silenciosa

**Status:** implementado 2026-04-18 (commits `88f1e4da` → `755ec85b` + `c21e6939` cleanup).
**Spec:** `docs/plans/2026-04-18-pessoas-fase1a-fundacao-silenciosa-design.md`.
**Plan:** `docs/plans/2026-04-18-pessoas-fase1a-fundacao-silenciosa-plan.md`.

Catálogo global `pessoas` + participações N:N com processos. 14 procedures tRPC, backfill idempotente, páginas `/admin/pessoas/*`, componentes `PessoaChip` + `PessoaSheet` silenciosos. Merge-queue pra dedup humano. 41 testes, zero edição em agenda.

---

## 🟡 Fase I-B · Pessoas · Apresentação de Inteligência

**Status:** specado, aguardando implementação.
**Spec:** `docs/plans/2026-04-18-pessoas-fase1b-apresentacao-design.md`.
**Esforço:** M (5-7 dias). **Valor:** ⭐⭐⭐. **Depende de:** I-A.

Liga as luzes sobre a fundação. Materialized view `pessoas_intel_signals` pré-computa recorrência, papéis, proximidade temporal. Componentes novos: `IntelDot` (6 níveis), `PessoaPeek` (hover card 250ms delay), `BannerInteligencia` (threshold rigoroso, dismissível 30d). Integração cirúrgica com sheet+modal da agenda. Aba "Pessoas" no processo com grupo Judicial desdestacado (papéis estáveis não sinalizam). Flags iniciais: recorrência + depoente contra mesmo assistido antes. Fases III-V ativam amber/emerald/red conforme dados chegam.

---

## 🟡 Fase II · Lugares

**Objetivo:** Transformar endereços soltos em entidade navegável + integração com mapa.
**Esforço:** M (5-7 dias). **Valor:** ⭐⭐⭐. **Depende de:** I-A (padrão arquitetural).

### Camada 1 · Entidade `lugares`
Schema:
```sql
lugares(id, logradouro, numero, bairro, cidade, uf, cep, latitude, longitude,
        endereco_completo_normalizado, observacoes, fonte_criacao)
participacoes_lugar(id, lugar_id, processo_id, pessoa_id?, tipo, data_relacionada, fonte)
```

Tipos de participação: `local-do-fato`, `endereco-assistido`, `endereco-testemunha`, `local-abordagem-policial`, `local-apreensao`, `domicilio-vitima`, `local-cumprimento-pena-alternativa`.

### Camada 3 · Flags
- **"Bairro recorrente"** — casos no mesmo bairro em janela de 12 meses.
- **"Endereço comum testemunha-vítima"** — detector de vizinhança pra testemunha presencial.
- **"Local de abordagem sem fundada suspeita documentada"** — integra com Fase X (tráfico).

### UI
- `/admin/lugares` catálogo.
- `LugarChip` + `LugarSheet` reutilizáveis.
- Integração com `/admin/cadastro/mapa` existente — pins por tipo.
- Sheet de processo ganha bloco "Local do fato" com mini-mapa.

### Backfill
Extrair de `assistidos.endereco/bairro/cidade`, `processos.localDoFato*`, texto livre em `atendimentos`.

### Dependências / LGPD
Endereços são sensíveis. ACL por workspace + audit em cada consulta.

---

## 🟡 Fase III · Delitos / Tipificações

**Objetivo:** Precisão do tipo penal + qualificadoras + complementos pra cruzar estratégias.
**Esforço:** M (4-6 dias). **Valor:** ⭐⭐⭐. **Depende de:** I-A.

### Camada 1 · Entidade `delitos_catalogo` e `tipificacoes`
```sql
delitos_catalogo(id, codigo_cp, artigo, paragrafo, inciso, descricao_curta, descricao_longa,
                 natureza (acao-publica-incondicionada | condicionada | privada),
                 hediondo, equiparado_hediondo, pena_min, pena_max)
tipificacoes(id, processo_id, delito_id, qualificadoras_aplicadas jsonb,
             majorantes jsonb, minorantes jsonb, modalidade (consumada | tentada),
             concurso_com[], confidence, fonte)
```

Catálogo pré-populado com CP + leis especiais (11.340, 8.069, 11.343, etc). Qualificadoras como taxonomia (121 §2º: motivo fútil, feminicídio, traição, meio cruel, emboscada, etc).

### Camada 3 · Flags
- **"Qualificadora argumentável"** — quando há qualificadora sem elemento factual claro.
- **"Minorante não aplicada"** — quando requisitos presentes mas MP não propôs.

### UI
- Chip de delito em todo lugar que hoje aparece `area`/`tipoAto` genérico.
- Busca no catálogo em forms de novo processo.
- Seleção estruturada de qualificadoras/majorantes.
- Detalhe do processo mostra card "Imputação estruturada" com artigo + qualificadoras tipadas.

### Value específico
Cruzamento: "todos os meus casos 121 §2º com feminicídio" → comparar teses, sentenças, juízes, réus primários vs reincidentes.

---

## 🟡 Fase IV · Cronologia Processual + Prisões/Cautelares

**Objetivo:** Marcos temporais tipados do processo + estado prisional vivo.
**Esforço:** M (5-7 dias). **Valor:** ⭐⭐⭐. **Depende de:** nada crítico (independente).

### Camada 2 · Atributos estruturados

**Bloco Cronologia** (atributo do processo):
```
marcos_processo: Array<{
  tipo: "fato" | "apf" | "denuncia" | "recebimento-denuncia" | "resposta-acusacao"
      | "aij-data" | "aij-realizada" | "memoriais" | "sentenca" | "acordao-recurso"
      | "transito-julgado" | "execucao-inicio" | "outro",
  data: Date,
  documentoReferencia?: string,
  observacoes?: string,
}>
```

**Bloco Prisões/Cautelares** (atributo):
```
prisoes: Array<{
  tipo: "flagrante" | "temporaria" | "preventiva" | "decorrente-sentenca",
  data_inicio: Date, data_fim?: Date, motivo?: string,
  unidade?: string, situacao: "ativa" | "relaxada" | "revogada" | "extinta"
}>
cautelares: Array<{
  tipo: "monitoramento-eletronico" | "comparecimento-periodico" | "recolhimento-noturno"
      | "proibicao-contato" | "proibicao-frequentar" | "afastamento-lar" | "fianca" | "outro",
  data_inicio: Date, data_fim?: Date, status: "ativa" | "cumprida" | "descumprida"
}>
```

### Camada 3 · Flags
- **"Excesso de prazo — prisão preventiva"** — calcula dias de preso × padrão jurisprudencial (STJ).
- **"Prisão em flagrante sem audiência de custódia documentada em 24h"** → nulidade.
- **"Cautelar descumprida sem incidente instaurado"** → alerta administrativo.
- **"Tempo entre fato e denúncia excessivo"** → argumento de prescrição intercorrente.

### UI
- **Timeline visual horizontal** no topo do processo (componente novo `ProcessoTimeline`).
- Bloco lateral "Situação prisional" no sheet da agenda e na página do processo.
- Badge "preso há X dias" quando aplicável.

### Value
Fase IV é a **transformação temporal** — o caso deixa de ser foto e vira filme. Útil pra todas as áreas.

---

## 🟡 Fase V · Objetos Apreendidos

**Objetivo:** Armas, drogas, veículos, bens — como entidades cruzáveis.
**Esforço:** M (5 dias). **Valor:** ⭐⭐⭐ (especial pra júri e tráfico). **Depende de:** I-A.

### Camada 1 · Entidade `objetos`
```sql
objetos(id, tipo, subtipo, numero_serie?, placa?, modelo?, marca?, ano?,
        calibre?, tipo_droga?, quantidade?, unidade?, valor_estimado?,
        descricao_livre, fotos_drive_ids[], fonte_criacao, confidence)
participacoes_objeto(id, objeto_id, processo_id, papel (apreendido | utilizado | produto-do-crime),
                     destino (devolvido | periciado | incinerado | em-custodia), data)
```

Tipos top: `arma-fogo`, `arma-branca`, `droga`, `veiculo`, `celular`, `dinheiro`, `joia`, `outro-bem`.

### Camada 3 · Flags
- **"Mesmo objeto em 2+ casos"** — flagrante pra arma, veículo, celular.
- **"Arma não periciada"** — majorante §2º-A do 157 questionável.
- **"Droga sem laudo definitivo"** → prova precária.

### UI
- `ObjetoChip` com ícone por tipo.
- Catálogo `/admin/objetos`.
- Bloco "Objetos apreendidos" no processo.

### Value extremo em júri
Arma do crime como entidade permite rastrear: "este revólver foi apreendido em 3 casos diferentes" → bomba de defesa (testemunha-chave mente ou há algo fora da órbita).

---

## 🟡 Fase VI · Modus Operandi

**Objetivo:** Circunstâncias do fato estruturadas em tags — pattern detection.
**Esforço:** M (4 dias). **Valor:** ⭐⭐. **Depende de:** nada crítico.

### Camada 2 · Atributo
```
modus_operandi: {
  abordagem?: "denuncia-anonima" | "flagrante-ronda" | "bloqueio" | "investigacao-previa"
             | "mandado" | "apresentacao-espontanea" | "outro",
  fundada_suspeita_documentada?: boolean,
  arma_usada?: "fogo" | "branca" | "impropriada" | "nenhuma" | "simulada",
  relacao_autor_vitima?: "desconhecido" | "conhecido-esporadico" | "familiar"
                      | "conjugal-atual" | "conjugal-ex" | "laboral" | "vizinho",
  horario_fato?: "madrugada" | "manha" | "tarde" | "noite",
  contexto?: "domicilio" | "via-publica" | "estabelecimento-comercial"
          | "escolar" | "transito" | "virtual" | "outro",
  num_agentes_crime?: number, num_agentes_apreensao?: number,
  tags_adicionais: string[]  // texto livre categorizado
}
```

### Camada 3 · Flags
- **"Abordagem sem fundada suspeita + droga apreendida"** → nulidade probatória.
- **"Padrão repetido no mesmo bairro"** — cruzamento com Lugares (Fase II).

### UI
- Bloco "Modus Operandi" no processo com chips das tags ativas.
- Filtro na listagem de processos por tags.

---

## 🟡 Fase VII · VVD · MPU + Ação Penal

**Objetivo:** Estruturar completamente o fluxo de violência doméstica — incluindo detectores de abuso da LMP.
**Esforço:** G (8-10 dias). **Valor:** ⭐⭐⭐. **Depende de:** I-A, II, III (lugares, tipificações, pessoas).

### Camada 1
- **Entidade `medidas_protetivas_catalogo`**: 20+ tipos canônicos de medidas.

### Camada 2 · Atributos

**Bloco MPU** (novo bloco no processo quando tipo=VVD):
```
mpu: {
  data_pedido: Date,
  tipos_violencia: Array<"fisica"|"psicologica"|"sexual"|"patrimonial"|"moral">,
  local_fato_tipo: "residencia-comum"|"via-publica"|"trabalho"|"outro",
  coabitacao_atual: "sim"|"nao"|"alternada"|"desconhecida",
  filhos_em_comum: number,
  idades_filhos: number[],
  filhos_presentes_fato: boolean,
  medidas_solicitadas: Array<MedidaCodigo>,
  medidas_deferidas: Array<MedidaCodigo>,
  distancia_minima_metros?: number,
  prazo_vigencia_dias: number,
  prorrogacoes: number,
  liminar: "deferida-total" | "deferida-parcial" | "negada",
  descumprimento_registrado: boolean,
  descumprimentos: Array<{ data, descricao }>,
  revogacao: { data, motivo } | null,
  bam_emitido: boolean,
  botao_panico_entregue: boolean,
}
```

**Bloco Relações patrimoniais conectadas** (detector de abuso):
```
contexto_civel: {
  divorcio_em_curso: boolean,
  divorcio_data_inicio?: Date,
  guarda_em_disputa: boolean,
  guarda_data_inicio?: Date,
  alimentos_em_curso: boolean,
  inventario_pendente: boolean,
  reintegracao_posse_ativa: boolean,
  imovel_conjugal_em_disputa: boolean,
  observacoes: string,
}
```

**Bloco Ação Penal VVD:**
```
acao_penal_vvd: {
  denuncia_oferecida: boolean, data_denuncia?: Date,
  arquivada: boolean,
  retratacao_fase_policial: { data, documento } | null,
  retratacao_audiencia: { data, art_16_aplicado: boolean } | null,
  condenacao: boolean, pena_anos?: number, pena_meses?: number, regime?: string,
  substituicao_restritiva: boolean,
}
```

### Camada 3 · Flags VVD

**Flag "Uso instrumental da LMP"** (liga ≥2 indicadores):
```
score = sum(
  contexto_civel.divorcio_em_curso && dias(contexto_civel.divorcio_data_inicio, mpu.data_pedido) < 90 ? 2 : 0,
  contexto_civel.guarda_em_disputa && dias(contexto_civel.guarda_data_inicio, mpu.data_pedido) < 90 ? 2 : 0,
  contexto_civel.imovel_conjugal_em_disputa ? 1 : 0,
  !tipos_violencia.contains("fisica") && !tipos_violencia.contains("sexual") ? 1 : 0,
  historico_denuncias_ciclicas_entre_mesmas_partes ? 2 : 0,
  retratacao_policial_seguida_de_nova_denuncia ? 2 : 0,
)
liga se score >= 3
```

**Flag "Reconciliação declarada"** — sinal processual (art. 16 LMP aplicável).

**Flag "Alienação parental potencial"** — cruza com Fase VIII.

### UI
- Bloco MPU no sheet da agenda (evento tipo Justificação).
- Bloco colateral "Contexto cível conectado" — coletável via form rápido.
- Badge amber no sheet quando flag "uso instrumental" ativa — com dismiss + justificativa obrigatória antes de adotar tese.

### Sensibilidade
Flag de uso instrumental é delicada. UI **nunca** rotula a vítima como mentirosa; apenas alerta o defensor pra investigar. Badge copy: "Fatores conectados merecem análise" (não "suspeita de falsa denúncia").

---

## 🟡 Fase VIII · VVD · Violência Sexual contra Menor

**Objetivo:** Estruturar dados pra detectar padrões de abuso real vs possível calúnia/alienação.
**Esforço:** G (8-10 dias). **Valor:** ⭐⭐⭐ (casos gravíssimos, condenações elevadas). **Depende de:** I-A, III, VII.

### Camada 2 · Atributos — bloco específico

```
violencia_sexual_menor: {
  vitima: { idade_fato: number, genero: "F"|"M"|"O", data_nascimento?: Date },
  acusado: { idade_fato: number, relacao: RelacaoAutorVitima },
  dependencia_autoridade: "guarda" | "professor" | "religioso" | "vizinho" | "desconhecido" | null,
  local_fato: LugarId | string,
  periodo_fato: { tipo: "data-especifica" | "periodo-estimado",
                  data_inicio: Date, data_fim?: Date },

  relato: {
    primeiro_relato_data: Date,
    primeiro_relato_para: "mae" | "pai" | "professora" | "psicologa" | "familiar" | "policia" | "outro",
    intervalo_fato_relato_dias: number,  // calculado
    intervalo_relato_denuncia_dias: number,  // calculado
    contexto_relato: "espontaneo" | "induzido-pergunta" | "apos-gatilho-especifico",
    gatilho_descricao?: string,
  },

  depoimento_especial: {
    realizado: boolean, data?: Date, profissional?: string,
    videogravacao: boolean, sala_adequada: boolean,
    presenca_terceiros: string[],
  },

  provas_tecnicas: {
    exame_conjuncao_carnal: { realizado: boolean, resultado?: "positivo"|"negativo"|"inconclusivo" },
    laudo_psicologico: { realizado: boolean, conclusao?: string, profissional?: string },
    laudo_social: { realizado: boolean, conclusao?: string },
    gestacao: boolean,
    lesoes_fisicas_compativeis: boolean,
  },

  contexto_familiar: {
    disputa_guarda_em_curso: boolean,
    disputa_guarda_data_inicio?: Date,
    alienacao_parental_alegada: boolean,
    genitor_alienador_identificado?: PessoaId,
    acompanhamento_psicologico_previo: boolean,  // antes do relato
  }
}
```

### Camada 3 · Dois flags espelhos

**Flag "Padrão suspeito de falsa acusação"** (liga ≥3 indicadores — MUITO CUIDADO):
- Primeiro relato tardio (>90 dias) após gatilho de disputa familiar
- Genitor alienador presente no depoimento
- Intervalo relato→denúncia curto após decisão cível desfavorável
- Troca substancial de versão entre fases
- Detalhes incompatíveis com idade/contexto
- Laudo psicológico apontando indução/repetição artificial
- Pronomes externos no depoimento ("mamãe disse")
- Ausência de indicadores comportamentais (escola, médico)
- Relato único sem reiteração

**Flag "Indicadores fortes de abuso real"** (protege contra defesa equivocada):
- Laudo pericial com lesões compatíveis
- Depoimento espontâneo reiterado
- Alterações comportamentais documentadas
- Corroboradores adultos independentes
- Detalhes coerentes com idade

### UI crítica
- Bloco dedicado no processo quando tipificação for 213/217-A/215-A/216-A/217 e vítima menor.
- Dashboard de "contexto clínico" com timeline relato-depoimento-laudo.
- Badges amber/emerald espelhos — **ambos sempre presentes** pra forçar leitura equilibrada.
- Copy ultra-cuidadosa: "indicadores que merecem análise aprofundada" (nunca afirmativo).

### Sensibilidade ética
Esta fase exige review ético dedicado. Designer de UX deve ser envolvido. Teste com casos reais antes de liberar flag em prod.

---

## 🟡 Fase IX · Execução Penal Completa

**Objetivo:** Transformar execução penal de processo opaco em dashboard vivo.
**Esforço:** G (10-12 dias). **Valor:** ⭐⭐⭐. **Depende de:** I-A, IV.

### Camada 1
- **Entidade `locais_cumprimento_alternativo`**: ONGs, escolas, órgãos.
- **Entidade `unidades_prisionais`** (catálogo).

### Camada 2 · 5 blocos estruturados

**Bloco Título Executivo:**
```
{ sentenca_data, pena_anos, pena_meses, pena_dias, regime_inicial,
  tipo ("condenatoria"|"c/c-substituicao"|"c/c-suspensao"),
  transito_julgado_data, acordao_recursal?, juizo_executivo_id, numero_processo_execucao,
  unidade_atual_id, regime_atual }
```

**Bloco Cronologia Executiva:**
```
{ inicio_cumprimento,
  progressoes: [{ data, de, para, pena_restante_dias }],
  regressoes: [{ data, de, para, motivo }],
  reconversoes: [{ data, motivo }],
  remissoes: [{ data, tipo: "trabalho"|"estudo"|"leitura", dias }],
  detracao_dias, unificacoes: [{ data, processos_unificados[] }],
  beneficios_negados: [{ data, tipo, motivo }] }
```

**Bloco Comportamento/Faltas:**
```
{ faltas: [{ data, grau: "leve"|"media"|"grave", motivo, apurada, sancao }],
  atestado_conduta_atualizado: Date,
  saidas_temporarias_calendario: [{ periodo, solicitada, obtida }] }
```

**Bloco Endereço/Contato do Executado** (CRÍTICO):
```
{ endereco_principal: { logradouro, numero, bairro, cidade, uf, cep,
                        data_ultima_confirmacao },
  telefones: [{ numero, tipo, data_ultima_confirmacao }],
  endereco_alternativo?, local_trabalho?: LugarId,
  local_curso_psc?: LugarCumprimentoAlternativoId,
  carga_horaria_mensal_devida, horas_cumpridas,
  faltas_comparecimento: [{ data, justificada }] }
```

**Bloco Benefícios Pleiteados:**
```
{ progressao: [{ data_pleito, decisao, data_decisao }],
  livramento_condicional: [...],
  indulto: [{ decreto_ano, decisao, data_decisao }],
  saida_temporaria: [...],
  trabalho_externo: [...] }
```

### Camada 3 · 5 flags detectores

**Flag "Prescrição executória iminente"** ⭐⭐⭐ (urgente, pode extinguir a pena):
```
pena_residual = pena_total - tempo_cumprido - remissoes - detracao
prazo_prescricao = tabela_109_cp(pena_residual)
                 × (reincidente ? 4/3 : 1)
                 × (menor_21_ou_maior_70 ? 1/2 : 1)
marco_interruptivo = max(inicio_cumprimento, data_recaptura_pos_fuga, continuacao_cumprimento)
dias_desde_marco = now - marco_interruptivo
liga se (prazo_prescricao - dias_desde_marco) <= 180 dias
```

**Flag "Indulto/comutação aplicável este ano"**:
- Compara decreto atual vs (tempo cumprido, comportamento, tipo crime)
- Detecta exclusões (hediondo, LMP, dignidade sexual)
- Pontua elegibilidade

**Flag "Risco de regressão por desatualização cadastral"**:
- Última confirmação endereço/telefone > 60 dias
- Falta ao comparecimento recente
- Último atestado de frequência desatualizado
- Sugere ligação/visita imediata

**Flag "Saída temporária possível"** — primário 1/6, reincidente 1/4, conduta ok, calendário do ano não solicitado.

**Flag "Livramento condicional possível"** — considera (primário/reincidente/hediondo), tempo cumprido, trabalho/curso, endereço confirmado.

### UI
- Nova rota `/admin/execucao-penal` — dashboard com 5 blocos.
- Timeline horizontal da execução (reusa `ProcessoTimeline` da Fase IV).
- Dashboard de alertas: os 5 flags viram cards no topo ordenados por urgência.
- Integração com `/admin/demandas` — flags geram demandas automáticas com prazo.

### Value extremo
Execução Penal é onde mais se perde prazo silenciosamente. Esta fase tem potencial de mudar a vida de assistidos (extinção de pena, saída temporária obtida, regressão evitada).

---

## 🟡 Fase X · ANPP + Tráfico + Roubo

**Objetivo:** Blocos específicos pra áreas penais de alta incidência.
**Esforço:** G (8 dias, 3 sub-blocos). **Valor:** ⭐⭐. **Depende de:** III (tipificações), IV (cronologia).

### ANPP
Bloco: cabimento (pena mín<4a, sem violência/grave ameaça, primariedade), confissão formal, propostas estruturadas (reparação/PSC/multa/curso), homologação, cumprimento, descumprimento.
Flag: **"ANPP cabível não oferecido"** (argumento recursal).

### Tráfico (art. 33 + 35)
Bloco: quantidade/tipo/valor, local apreensão (LugarId — Fase II), circunstâncias abordagem (Modus — Fase VI), tese usuário×traficante×privilegiado §4º, co-réus (PessoaIds — Fase I), objetos periciados (Fase V).
Flag: **"Abordagem sem fundada suspeita documentada + droga apreendida"** → nulidade probatória.
Flag: **"Minorante §4º aplicável não considerada"**.

### Roubo
Bloco: majorantes (uso arma tipo §2º-A, coautoria, restrição liberdade, transporte valores), bens subtraídos com valor, latrocínio (resulta morte).
Flag: **"Arma não periciada → majorante §2º-A questionável"**.

---

## 🟡 Fase XI · Histórico Penal do Assistido

**Objetivo:** Antecedentes, primariedade, condenações anteriores estruturados.
**Esforço:** P (3-4 dias). **Valor:** ⭐⭐. **Depende de:** III (tipificações).

### Camada 2
```
historico_penal: {
  primariedade: "primario"|"reincidente-especifico"|"reincidente-generico",
  condenacoes_anteriores: Array<{
    delito_id, pena, regime, data_trans_julgado, extinta?: { data, motivo }
  }>,
  passagens_policiais_sem_condenacao: number,
  maus_antecedentes_alegados: boolean,
  processo_em_curso_outros: Array<ProcessoId>,
  anpp_anterior: boolean,
}
```

### Flag
**"Primariedade arguível apesar de maus antecedentes"** — quando não há condenação transitada.

### Value
Preenchido uma vez por assistido, reusa em todo processo ativo. Feed pra flags de outras fases (ANPP, minorantes, regimes iniciais).

---

## 🟡 Fase XII · Apresentação Cross-Dimension

**Objetivo:** Unificar tudo em um dashboard de inteligência operacional + busca cruzada.
**Esforço:** G (10-12 dias). **Valor:** ⭐⭐⭐ (culminação). **Depende de:** I-B + todas as fases anteriores.

### Escopo

**Dashboard `/admin/inteligencia`** — visão de comando:
- Alertas urgentes (prescrições iminentes, excessos de prazo, flags ativas)
- Pessoas recorrentes top 20
- Bairros recorrentes top 10
- Objetos em múltiplos casos
- Estatística mensal (casos entrada/saída, taxa de condenação por delito, ANPP oferecidos)

**Busca unificada (Cmd+K upgrade)** — uma query cruza pessoas, lugares, delitos, objetos, processos.

**Sheet de caso integrado** — todos os blocos das fases 1-XI compondo visão 360°: timeline + pessoas + local + modus + objetos + flags ativas + próximas ações.

**Relatórios exportáveis**:
- "Defesas em execução penal" — lista todos os assistidos em execução + flags ativas.
- "Cases VVD com contexto patrimonial" — pra estudo estatístico.
- "Meu ano em números" — relatório anual do defensor.

### Integração com fluxo diário
- Widget no dashboard principal: "3 flags ativas hoje" com link.
- Notificação push/email diária: resumo de flags que mudaram de estado.

---

## Dependency graph

```
I-A (feito) ──┬─► I-B (apresentação pessoas)
              ├─► II (lugares)
              ├─► III (delitos)
              ├─► V (objetos)
              ├─► VII (VVD MPU)
              ├─► VIII (VVD menor)
              ├─► IX (execução penal)
              └─► X (ANPP/tráfico/roubo)

IV (cronologia/cautelares) ── independente, usado por IX, X

VI (modus) ── independente, usado por X

XI (histórico penal) ── depende de III, usado por X, IX

XII (apresentação cross) ── depende de TUDO
```

## Ordem recomendada

1. **I-B** (próxima — pessoas-apresentação)
2. **II** (lugares — mapa ganha vida)
3. **IV** (cronologia/cautelares — transformação temporal universal)
4. **III** (delitos/tipificações)
5. **V** (objetos)
6. **IX** (execução penal — alto ganho operacional)
7. **VI** (modus operandi)
8. **VII** (VVD MPU)
9. **VIII** (VVD violência sexual menor — especial cuidado)
10. **X** (ANPP/tráfico/roubo)
11. **XI** (histórico penal)
12. **XII** (dashboard cross-dimension — colheita)

Ordem otimiza por: (a) dependências, (b) valor imediato no dia a dia, (c) sensibilidade (VIII fica tardia pra ter tempo de calibrar).

## Esforço total estimado

| Fase | Esforço dias | Acumulado |
|---|---|---|
| I-A ✅ | — | 0 |
| I-B | 5-7 | 5-7 |
| II | 5-7 | 10-14 |
| III | 4-6 | 14-20 |
| IV | 5-7 | 19-27 |
| V | 5 | 24-32 |
| VI | 4 | 28-36 |
| VII | 8-10 | 36-46 |
| VIII | 8-10 | 44-56 |
| IX | 10-12 | 54-68 |
| X | 8 | 62-76 |
| XI | 3-4 | 65-80 |
| XII | 10-12 | 75-92 |

**Total estimado: 75 a 92 dias** de trabalho concentrado após I-A (≈4-5 meses em ritmo real considerando revisão, testes, manual verification, ajustes pós-uso real).

## Como usar este mapa

- **Antes de cada fase nova**: reler a seção correspondente como seed do brainstorming.
- **Spec detalhado**: escrito quando a fase começa (não antecipadamente).
- **Revisão**: a cada 2 fases concluídas, revisar o mapa. Insights de uso real podem reordenar ou refinar fases futuras.
- **Ética/sensibilidade**: Fases VII e VIII exigem review ético antes do spec final.
- **LGPD**: cada fase que toca dado sensível (testemunha, vítima, menor, executado) precisa secção LGPD dedicada no spec.

---

## Sobre como a inteligência aparece

Ao final das 12 fases, o defensor em Camaçari abre um evento na agenda e vê:

- Chip do juiz sem dot (titular estável).
- Chip da testemunha com dot âmbar — contradição registrada em caso passado.
- Badge emerald no bloco "Imputação" — analisado ontem.
- Bloco "Local do fato" com mini-mapa mostrando 2 outros casos no mesmo bairro.
- Bloco "Objetos" listando a arma — revólver calibre 38, periciado, com link pra caso irmão.
- Timeline visual do processo — 4 meses preso preventivo, alerta âmbar "aproxima-se do limite".
- Flag emerald "ANPP cabível, foi oferecida" (ou amber "ANPP cabível, não foi oferecida").
- Se VVD: bloco MPU estruturado, sem flag de uso instrumental, defensor prossegue com estratégia normal.
- Se execução penal: prescrição executória a 4 meses, alerta vermelho, demanda criada.

Tudo isso sem scroll denso. Apenas sinais calibrados quando merecem atenção.

Esse é o destino do OMBUDS.
