# Relatorio Executivo — Saude Tecnologica do OMBUDS

> **Brownfield Discovery Phase 9** | Elaborado por @analyst (Atlas)
> **Data:** 25 de marco de 2026
> **Destinatarios:** Gestores, coordenadores e tomadores de decisao da Defensoria Publica
> **Classificacao:** USO INTERNO

---

## 1. Resumo Executivo

O OMBUDS e um sistema de gestao de casos juridicos desenvolvido internamente para a Defensoria Publica da Bahia. O sistema e robusto e abrangente: possui 134 telas funcionais, abrange mais de 130 entidades de dados e integra-se com mais de 15 servicos externos, incluindo recursos de inteligencia artificial para classificacao de documentos e transcricao de audiencias. Trata-se de uma realizacao notavel para um projeto conduzido por um unico desenvolvedor.

Porem, uma auditoria tecnica completa identificou **53 pendencias tecnicas**, sendo **9 de severidade critica**. O achado mais grave e a exposicao de credenciais de acesso ao banco de dados no codigo-fonte — o equivalente a deixar a chave do cofre dentro de um envelope aberto. Alem disso, o sistema nao possui testes automatizados, o que significa que qualquer alteracao pode causar falhas imprevisiveis. A seguranca de isolamento entre comarcas tambem precisa ser reforçada.

**Recomendacao:** Iniciar imediatamente a correcao das falhas criticas de seguranca (Semana 1), seguida de um plano estruturado de 17 semanas para elevar o sistema ao nivel exigido para adocao institucional. O investimento estimado e de **R$ 70.500 a R$ 100.500**, valor que se paga ao evitar um unico incidente de vazamento de dados ou multa por descumprimento da LGPD.

---

## 2. Analise de Custos

### 2.1 Custo para RESOLVER

| Fase | Periodo | Horas Estimadas | Custo (R$ 150/h) |
|------|---------|----------------:|------------------:|
| Emergencia de Seguranca | Semana 1 | 20-30h | R$ 3.000 - R$ 4.500 |
| Fundacao e Seguranca de Dados | Semanas 2-6 | 110-150h | R$ 16.500 - R$ 22.500 |
| Qualidade e Confiabilidade | Semanas 7-10 | 80-130h | R$ 12.000 - R$ 19.500 |
| Performance e Otimizacao | Semanas 11-17 | 110-140h | R$ 16.500 - R$ 21.000 |
| **Total** | **17 semanas** | **470-670h** | **R$ 70.500 - R$ 100.500** |

### 2.2 Custo de NAO Resolver

| Risco | Probabilidade | Impacto Financeiro Estimado |
|-------|:------------:|----------------------------:|
| Vazamento de dados pessoais (CPF, historico criminal, situacao prisional) | Alta | R$ 500.000 - R$ 5.000.000 |
| Multa LGPD (ate 2% do faturamento ou R$ 50 milhoes por infracao) | Media-Alta | R$ 50.000 - R$ 50.000.000 |
| Indisponibilidade do sistema (perda de prazos processuais) | Media | R$ 100.000 - R$ 500.000 |
| Perda de produtividade dos defensores (retrabalho, erros manuais) | Alta | R$ 200.000+/ano |
| Inviabilidade de expansao para outras Defensorias | Certa | Receita perdida incalculavel |
| Dano reputacional a Defensoria Publica | Media | Imensuravel |

### 2.3 Comparativo

| | Resolver | Nao Resolver |
|---|--------:|-------------:|
| **Custo imediato** | R$ 70.500 - R$ 100.500 | R$ 0 |
| **Risco financeiro em 12 meses** | Baixo | R$ 850.000 - R$ 55.000.000 |
| **Risco reputacional** | Eliminado | Crescente |
| **Capacidade de expansao** | Viabilizada | Bloqueada |
| **Velocidade de novas funcionalidades** | 3-5x mais rapida | Cada vez mais lenta |

**Conclusao:** O custo de correcao equivale a uma fracao minima do risco financeiro de um unico incidente. A relacao custo-beneficio e inequivoca.

---

## 3. Impacto no Negocio

### 3.1 Seguranca e Conformidade Legal

O OMBUDS armazena dados altamente sensiveis: CPF, historico criminal, situacao prisional, dados de vitimas de violencia domestica e informacoes de menores. Atualmente:

- **Credenciais de acesso ao banco estao expostas** no codigo-fonte, acessiveis a qualquer pessoa que tenha acesso ao repositorio.
- **Nao ha isolamento efetivo entre comarcas** — tecnicamente, dados de uma comarca podem ser acessados por outra.
- **Nao ha registro de auditoria para exclusao de dados** — requisito da LGPD para comprovacao de conformidade.
- **O backup depende exclusivamente do plano gratuito do provedor**, com retencao de apenas 7 dias e sem copia externa.

**Se ocorrer um vazamento**, a Defensoria estaria sujeita a multas de ate 2% do faturamento ou R$ 50 milhoes por infracao (Art. 52, LGPD), alem de acoes civis dos titulares de dados e dano reputacional severo a uma instituicao que defende direitos fundamentais.

### 3.2 Experiencia do Usuario e Produtividade

Os defensores que utilizam o OMBUDS enfrentam atualmente:

- **Erros sem explicacao** — quando o sistema encontra um problema, a tela inteira pode travar sem nenhuma mensagem orientativa. O defensor precisa recarregar e possivelmente refazer o trabalho.
- **Formularios sem validacao** — dados podem ser salvos incompletos ou incorretos, gerando retrabalho posterior.
- **Falta de estados de carregamento** — em 117 das 125 telas administrativas, nao ha indicacao visual de que o sistema esta processando, causando cliques duplicados e confusao.
- **Acessibilidade insuficiente** — defensores com deficiencia visual ou motora encontram barreiras significativas, em desacordo com o e-MAG (Modelo de Acessibilidade em Governo Eletronico) e a Lei Brasileira de Inclusao (LBI).
- **Impossibilidade de imprimir documentos** adequadamente — apenas uma tela possui formatacao para impressao.

### 3.3 Escalabilidade — Expansao para Outras Defensorias

A adocao institucional do OMBUDS por outras Defensorias Publicas — estaduais ou da Uniao — exige:

| Requisito Institucional | Situacao Atual | Apos Correcao |
|------------------------|:--------------:|:-------------:|
| Conformidade LGPD | Nao atende | Atende |
| Acessibilidade e-MAG | Parcial | Atende |
| Isolamento entre unidades | Insuficiente | Atende |
| Auditoria e rastreabilidade | Ausente | Implementada |
| Backup e recuperacao de desastres | Precario | Robusto |
| Testes e garantia de qualidade | Inexistente | Implementada |

**Sem as correcoes, o OMBUDS nao pode ser oferecido institucionalmente.** Com as correcoes, torna-se uma solucao viavel para qualquer Defensoria Publica do Brasil.

### 3.4 Velocidade de Evolucao

Atualmente, adicionar novas funcionalidades ao OMBUDS e arriscado e lento porque:

- **Nao existem testes automatizados** — qualquer mudanca pode quebrar funcionalidades existentes sem que ninguem perceba ate que um defensor reporte o problema.
- **Nao ha processo automatizado de verificacao** antes da publicacao — codigo com erros pode ir diretamente para producao.
- **Componentes visuais estao duplicados** — uma alteracao de estilo precisa ser replicada em 6 lugares diferentes.

Apos a resolucao, a velocidade de entrega de novas funcionalidades pode aumentar de **3 a 5 vezes**, pois o desenvolvedor tera confianca para modificar o sistema sem medo de quebrar o que ja funciona.

---

## 4. Timeline Recomendado

### Fase 1: Emergencia — Semana 1

**Objetivo:** Eliminar riscos iminentes de seguranca.

- Trocar imediatamente a senha do banco de dados e remover todas as credenciais expostas no codigo.
- Restringir o acesso a interface de inteligencia artificial apenas ao dominio autorizado.
- Corrigir falha que permite acesso nao autenticado a funcionalidade de integracao com Google Drive.

**Resultado esperado:** Risco de invasao externa reduzido drasticamente.

### Fase 2: Fundacao — Semanas 2 a 6

**Objetivo:** Estabelecer as bases de seguranca e confiabilidade.

- Implementar processo automatizado de verificacao antes de cada publicacao.
- Ativar mecanismos de protecao de dados em todas as 130 tabelas do banco.
- Implementar isolamento efetivo entre comarcas — dados de Salvador nao acessiveis por Feira de Santana.
- Estabelecer rotina de backup externa com documentacao de recuperacao.
- Implementar tratamento de erros que oriente o usuario em vez de travar a tela.
- Iniciar adequacoes de acessibilidade prioritarias.

**Resultado esperado:** Sistema em conformidade basica com LGPD e pronto para avaliacao institucional.

### Fase 3: Qualidade — Semanas 7 a 10

**Objetivo:** Melhorar a experiencia do usuario e a confiabilidade dos dados.

- Implementar validacao em todos os formularios principais (processos, assistidos, demandas).
- Consolidar componentes visuais duplicados para garantir consistencia.
- Eliminar inconsistencias na camada de comunicacao entre interface e servidor.

**Resultado esperado:** Reducao significativa de erros de usuario e dados inconsistentes.

### Fase 4: Otimizacao — Semanas 11 a 17

**Objetivo:** Preparar o sistema para escala e manutencao a longo prazo.

- Implementar testes automatizados nas areas mais criticas.
- Adicionar formatacao de impressao para documentos juridicos (oficios, pareceres, fichas).
- Decompor telas muito grandes para melhorar performance e facilitar manutencao.
- Adicionar estados de carregamento nas telas restantes.
- Implementar monitoramento estruturado para identificar problemas proativamente.

**Resultado esperado:** Sistema estavel, auditavel e preparado para escala institucional.

---

## 5. Retorno sobre o Investimento (ROI)

### 5.1 Investimento

| Item | Valor |
|------|------:|
| Correcao tecnica (470-670h x R$ 150/h) | R$ 70.500 - R$ 100.500 |
| **Investimento total estimado** | **R$ 70.500 - R$ 100.500** |

### 5.2 Retornos Esperados

| Beneficio | Valor Estimado | Prazo |
|-----------|---------------:|:-----:|
| Eliminacao do risco de multa LGPD | Ate R$ 50 milhoes evitados | Imediato |
| Eliminacao do risco de vazamento de dados | R$ 500K - R$ 5M evitados | Imediato |
| Ganho de produtividade (menos retrabalho, menos erros) | R$ 200.000+/ano | 3 meses |
| Viabilizacao de adocao institucional | Receita/economia recorrente | 6 meses |
| Aceleracao de novas funcionalidades (3-5x) | Reducao de custo de desenvolvimento | 4 meses |
| Reducao de suporte (menos bugs, melhor UX) | R$ 50.000+/ano | 3 meses |

### 5.3 O Que Se Torna Possivel

Apos a resolucao das pendencias tecnicas, o OMBUDS podera:

1. **Ser oferecido oficialmente a outras Defensorias Publicas** — estaduais e da Uniao — como solucao institucional de gestao de casos.
2. **Integrar-se com o PJe (Processo Judicial Eletronico)**, SOLAR, SIGAD e outros sistemas do ecossistema juridico com seguranca.
3. **Receber certificacao de conformidade LGPD**, requisito para qualquer sistema que trate dados pessoais em orgaos publicos.
4. **Escalar para centenas de usuarios simultaneos** com isolamento seguro entre comarcas e unidades.
5. **Evoluir rapidamente** com novas funcionalidades (integracao E-CPF, OpenClaw, novos modulos) sem risco de regressao.
6. **Tornar-se referencia nacional** em tecnologia aplicada a Defensoria Publica.

**ROI estimado:** Para cada R$ 1 investido na correcao, estima-se um retorno de **R$ 20 a R$ 50** considerando riscos evitados e ganhos de produtividade no primeiro ano.

---

## 6. Proximos Passos

### Acoes Imediatas (esta semana)

1. **Aprovar a execucao da Fase 1 (Emergencia)** — a exposicao de credenciais no codigo-fonte e um risco ativo que precisa ser tratado imediatamente, independentemente de qualquer outra decisao.

### Decisoes Necessarias (proximas 2 semanas)

2. **Definir modelo de execucao** — o desenvolvedor atual (Rodrigo) pode executar o plano em 17 semanas dedicadas, ou parte do trabalho pode ser paralelizado com apoio adicional.
3. **Aprovar o cronograma completo (Fases 1 a 4)** — as fases sao sequenciais e interdependentes; interromper no meio deixaria o sistema em estado parcialmente corrigido.
4. **Estabelecer governanca** — definir responsavel pela supervisao do progresso e pontos de verificacao quinzenais.

### Acompanhamento

5. **Relatorio de progresso quinzenal** com metricas objetivas: numero de pendencias criticas restantes, cobertura de testes, tabelas com protecao ativa.
6. **Revisao ao final de cada fase** para validar que os objetivos foram atingidos antes de prosseguir.
7. **Avaliacao de prontidao institucional** ao final da Fase 4, determinando se o sistema esta pronto para ser oferecido a outras Defensorias.

---

> *Este relatorio foi elaborado com base na auditoria tecnica completa realizada entre as fases 1 a 8 do Brownfield Discovery do OMBUDS. Todos os dados, estimativas e recomendacoes podem ser verificados no documento tecnico detalhado (`technical-debt-assessment.md`).*

---

*Brownfield Discovery Phase 9 — Relatorio Executivo*
*Proximo: Phase 10 (@pm — Planejamento de Epics e Stories para execucao)*
