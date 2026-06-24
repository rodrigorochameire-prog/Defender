# OMBUDS — Doutrina de Redesign (North Star transversal)

> **Status:** Vigente — fonte de verdade de UX/UI para todo novo trabalho de produto.
> **Data:** 2026-06-24
> **Escopo:** Orientação transversal que governa todas as features e aprimoramentos do OMBUDS.
> **Relação com as specs de módulo:** este documento é a *camada de princípios*. As specs por
> módulo (Demandas, WhatsApp, Assistidos, Instância Superior — ver §11) são as *fontes de
> verdade de execução*. Em conflito de detalhe, prevalece a spec do módulo; em conflito de
> princípio, prevalece esta doutrina.

---

## 0. Como usar este documento

- **Antes de iniciar qualquer feature/aprimoramento de UI**, leia §1 (princípio-mestre), §2
  (direção global) e §9 (padrões transversais). Eles valem para o produto inteiro.
- **Ao mexer num módulo específico**, combine esta doutrina com a spec do módulo (§11).
- **Ao revisar/entregar**, rode o checklist "Definition of Premium Done" (§10).
- **Não é um restyling cosmético.** É refatoração de hierarquia, estados e navegação. Por isso
  o trabalho é spec-driven, com TDD nos estados críticos e subagentes especializados (§8).

---

## 1. Princípio-mestre

> **O OMBUDS já parece um sistema inteligente, mas ainda não parece um sistema refinado na
> mesma proporção da sua inteligência.** Toda decisão de design existe para fechar essa lacuna.

O produto já tem boa inteligência de negócio, mas hoje a apresenta com **excesso de
concorrência visual, baixa orquestração de prioridades, densidade não hierarquizada e estados
ricos tratados como blocos meramente funcionais.**

O foco **não** é adicionar feature por adicionar. É:

- organizar melhor o que já existe;
- tornar os estados mais claros;
- reduzir carga cognitiva;
- dar dignidade visual à informação relevante;
- construir navegação mais calma, elegante e segura.

### Os 5 princípios de execução

1. **Reduzir poluição visual sem empobrecer a potência funcional.**
2. **Preservar a identidade do OMBUDS** — absorver lógica de refinamento e clareza de
   referências (Astrea, ADVBOX), nunca copiá-las.
3. **Reorganizar telas por prioridade cognitiva**, não por mera disponibilidade de dados.
4. **Experiência premium em desktop *e* mobile**, com linguagem sóbria e jurídica.
5. **Executar spec-driven, com TDD e fases pequenas**, para evitar refatoração caótica.

---

## 2. Direção global de UX/UI

### 2.1 Sobriedade jurídica premium
Superfícies neutras; tipografia firme e compacta; pouco ruído cromático; badges/chips
discretos; **cor apenas para exceção, urgência, risco e estados críticos.** O produto trabalha
com contexto criminal e operacional denso — decoração excessiva reduz a confiabilidade percebida.

### 2.2 Menos botões visíveis, mais hierarquia de ação
Recolher ações secundárias para menus contextuais, split buttons ou overflow. **Uma ação
principal claramente dominante por tela ou bloco.** Excesso de CTAs rouba protagonismo da
informação e deixa a interface tensa e utilitária demais.

### 2.3 Informação antes de ação
A interface primeiro torna claro **o estado da situação**; só depois destaca a melhor ação.
Em ambiente jurídico de alta consequência, agir sem leitura contextual aumenta risco operacional.

### 2.4 Estado crítico deve parecer crítico
Cadastro 0%, processo sem caso, demanda atrasada, audiência próxima, ausência de contato,
radar ativo sem menções, processo órfão e empty states institucionais **precisam de semântica
própria** — não podem aparecer como blocos comuns. O sistema já detecta as exceções; a UI
precisa encená-las.

### 2.5 Mobile como reinterpretação, não miniaturização
Mobile é redesenhado em cards, blocos colapsáveis, navegação em etapas, sticky actions
seletivas e hierarquia vertical. Telas densas, se apenas comprimidas, perdem legibilidade.

---

## 3. Módulo Demandas — diagnóstico e diretrizes

**Observado:** densidade funcional alta (sidebar, métricas no topo, filtros, busca, ações
globais, lista com muitas ações repetidas por item). **Diagnóstico:** lógica forte, mas
concorrência visual entre métricas, filtros, comandos, lista e botões por linha.

**Diretrizes:**
- reorganizar em camadas: contexto → filtros → ações → lista;
- recolher ações repetidas para overflow;
- anatomia estável por demanda (título, processo, assistido, prazo, status, urgência,
  atribuição, ação principal, overflow);
- status como chips discretos;
- mobile com navegação e operação sofisticadas.

**Por quê:** Demandas é tela de uso frequente e alta densidade; se continuar ruidosa, contamina
a percepção de qualidade do sistema inteiro.

> Execução detalhada: `ombuds-demandas-redesign-spec.md` + `ombuds-demandas-redesign-backlog.md`.

---

## 4. Módulo WhatsApp — diagnóstico e diretrizes

**Observado:** lista lateral, conversa, composer e, sobretudo, ações sobre mensagens (em
especial áudios). **Diagnóstico:** o ruído está no microdesign das interações contextuais —
mensagens/áudios competem com toolbars, tooltips e ações jurídicas.

**Diretrizes:**
- mensagem como protagonista;
- ações contextuais discretas;
- chat como superfície de leitura serena;
- painel jurídico contextual integrado sem roubar foco da conversa;
- mobile como chat premium e operacional.

**Por quê:** em chat jurídico o usuário lê, escuta e decide por muito tempo; quando a mensagem
perde protagonismo, a experiência cansa.

> Execução: `2026-03-25-whatsapp-redesign.md`, `2026-03-10-whatsapp-defender-design.md` e a
> ponte `2026-06-23-whatsapp-atendimento-bridge-design.md`.

---

## 5. Módulo Assistidos — espinha dorsal

O módulo mais profundamente analisado. Deve operar como **cadastro mestre vivo + cockpit
operacional**: cada superfície responde em segundos *quem é, quão confiável está o cadastro, o
que está urgente, o que falta estruturar, qual a próxima ação, o que aconteceu até aqui.*

> **Reconciliação crítica (spec × código):** muito do que a análise tratou como
> "ausente/embrionário" **já existe e é robusto** (timeline real, radar real, grafo de pessoas
> maduro, casos com personas/facts/evidence). O trabalho é **adopt + extend**, não greenfield.
> Detalhe em `2026-06-24-assistidos-ui-reform-plan.md`.

| Subárea | Diagnóstico | Diretriz |
|---|---|---|
| **Lista / preview master-detail** | preview com blocos heterogêneos sem orquestração | master-detail real; coluna esquerda para seleção rápida; preview em 4 blocos: Resumo / Atividade / Pendências / Ações |
| **Página principal** | inteligência empilhada como blocos úteis, não command center | 4 zonas: identidade → atenção imediata → estrutura jurídica → memória operacional; CTA contextual pelo estado real |
| **Casos** | ausência de caso tratada como vazio passivo | empty state inteligente; processo órfão em card robusto; CTA "Criar caso a partir deste processo"; explicar impacto da ausência |
| **Processo** | painel intermediário, não cockpit | cabeçalho com fase/vínculo/audiência/urgência; registros → timeline semântica (no contexto aninhado existente) |
| **Demandas do assistido** | correta, pouco hierarquizada por criticidade | faixa resumo (atrasadas/em aberto/concluídas); ordenar por criticidade; separar crítico de informativo |
| **Audiências** | tratada como agendamento | briefing operacional da próxima sessão: countdown + preparação pendente + vínculos com demandas/documentos/processo |
| **Documentos** | tipos jurídicos no mesmo regime visual | biblioteca jurídica contextual; taxonomia documental; rótulos humanos, não nomes técnicos |
| **Pessoas** | parece cadastro de contatos | rede de apoio: familiares / contato principal / rede / pessoas do caso; empty state com justificativa + CTA |
| **Timeline** | embrionária | memória cronológica consolidada; múltiplos tipos de evento; low-state honesto |
| **Radar** | comunica ausência, não monitoramento vivo | empty state = status de monitoramento ativo (escopo, termos, última varredura, confiança) |
| **Nova Demanda** | formulário técnico denso | fluxo premium de triagem: etapas explícitas; protagonismo ao cálculo de prazo (prazo em dobro); providências orientadas e legíveis |

---

## 6. Módulo Instância Superior — Centro de Recursos e Inteligência Recursal

**Observado:** visão institucional/analítica (tribunais, comparativo por comarca, modo
Institucional/Meus, relatorias, novo recurso). **Diagnóstico:** modelagem promissora, mas presa
entre analytics embrionário, comparativo organizacional e operação recursal, sem hierarquia.

**Diretrizes:**
- reposicionar como **Centro de Recursos e Inteligência Recursal**;
- separar camada estratégica/institucional da camada operacional/recursal;
- cabeçalho refinado: contexto + KPIs + controles;
- comparativo por comarca/unidade aprimorado;
- carteira principal de recursos abaixo da camada analítica;
- papel conceitual claro para Relatorias;
- Novo Recurso como intake recursal premium.

**Por quê:** tem potencial para ser uma das áreas mais sofisticadas — mas só se a UI conectar
análise institucional a ação recursal concreta.

> Execução base: `2026-03-07-recursos-execucao-design.md`. Memória: módulo Instância Superior.

---

## 7. Estrutura de backlog (padrão para todo módulo)

Toda spec progride em fases pequenas e auditáveis:

1. **Fundamentos** e design system local/delta.
2. **Estrutura e hierarquia** da superfície principal.
3. **Módulos/subáreas centrais.**
4. **Fluxos operacionais e formulários.**
5. **Memória, apoio, analytics** e áreas complementares.
6. **Mobile, QA e polimento final.**

Isso força o sistema a amadurecer como arquitetura, não como cosmética.

---

## 8. Por que spec-driven + TDD + subagentes

**Spec-driven:** evita retrabalho desordenado; protege a lógica de negócio já boa; permite
progresso em fases com revisão humana; mantém rastreabilidade diagnóstico → decisão →
implementação.

**TDD nos estados críticos:** os módulos acumulam estados delicados (urgência, ausência de
caso, audiência próxima, cálculo de prazo, radar vazio, comparativos, filtros múltiplos). TDD
preserva comportamento durante a refatoração de UI, testa a **hierarquia de estados críticos**
(não só renderização) e garante que reorganizar o visual não esconda informação importante.

**Subagentes especializados:** cada módulo combina navegação, design system, empty states,
operação jurídica, forms complexos, analytics, mobile e QA. Especialização eleva qualidade,
separa responsabilidades, facilita backlog por fases e preserva consistência entre módulos.

---

## 9. Padrões transversais (regra de produto, não de um módulo)

1. **Hero/header com contexto útil** — onde estou, qual o objeto da tela, qual a melhor ação.
2. **Cards silenciosos e hierarquia limpa** — KPIs e blocos de apoio comparáveis, nunca gritantes.
3. **Empty states com promessa de uso futuro** — explicar para que a área serve e o que aparecerá ali.
4. **Exceções com semântica própria** — cadastro crítico, processo órfão, demanda atrasada,
   audiência próxima, radar ativo-vazio, ausência de contatos.
5. **Ações secundárias em overflow** — botões demais achatam a hierarquia.
6. **Tipologia e taxonomia importam** — documentos, eventos, contatos, recursos e registros
   precisam de classificação humana e semântica. (Usar o registry `src/lib/config/tipologia/*`,
   não badges inline.)
7. **Mobile é reinterpretação** — etapas, cards, painéis colapsáveis, prioridade vertical.

---

## 10. Direções adicionais para elevar a "premium" (extensão da doutrina)

> Complementos práticos para empurrar o produto de "limpo" para "premium e coeso". Cada item é
> uma alavanca de qualidade percebida; adotar incrementalmente, validando por módulo.

### 10.1 Camada de tokens semânticos (sobre `design-tokens.ts`)
Formalizar tokens semânticos acima da paleta zinc/emerald: `surface`/`elevation`,
`status.{urgente,atrasado,ok,info,neutro}`, `border.{subtle,strong}`. Assim "cor = exceção"
deixa de ser disciplina manual e passa a ser garantido pelo token. Nenhuma cor crua hex/HSL
solta em componente novo.

### 10.2 Disciplina de motion
Sistema de motion restrito: durações 150–250ms, easing padrão único, `transition` só em
hover/foco/entrada de painel. **Skeletons em vez de spinners**, casados ao layout final (zero
layout shift). **Respeitar `prefers-reduced-motion`** sempre. Premium vem de movimento
consistente e contido, não de animação chamativa.

### 10.3 Ritmo de espaçamento e densidade
Grade de 4/8px como ritmo único. Avaliar um **toggle de densidade** (confortável vs compacto):
usuários jurídicos escaneiam muito; densidade controlada eleva produtividade sem virar poluição.

### 10.4 Tipografia e numerais
Escala tipográfica curta (≈5 tamanhos). **Numerais tabulares/mono (`tabular-nums`/`font-mono`)
para CPF, número de processo, prazos e contadores** — alinhamento de colunas comunica rigor.

### 10.5 "Next Best Action" como serviço único
Generalizar o `ContextualCTA` do plano de Assistidos: uma fonte única que computa a ação
recomendada a partir do estado da entidade, reutilizada em todos os módulos. É a espinha de
"informação antes de ação" virando código compartilhado.

### 10.6 Command palette (⌘K)
Busca/comando global: saltar para assistido/processo/demanda e executar ações sem caçar botões.
Reforça "menos botões visíveis, mais hierarquia de ação" e dá sensação de ferramenta de poder.

### 10.7 Quarteto de estados padronizado
Um conjunto único de componentes para **loading / vazio / erro / sucesso**, para que todo módulo
os renderize igual. Reaproveitar `EmptyState`/`StatusChip` de `components/agenda/ds` e **promover
para um DS compartilhado** (`components/ds/`) — eliminar duplicação por módulo.

### 10.8 Teclado e foco
Operabilidade total por teclado: focus rings visíveis, navegação `j/k` em listas master-detail,
`Esc` fecha sheets, atalho da ação primária. Premium é também ergonomia de quem usa o dia todo.

### 10.9 Acessibilidade como orçamento, não enfeite
Contraste WCAG AA garantido por token; `aria` em chips/status/ações de ícone; alvos de toque
≥44px no mobile; `prefers-reduced-motion`. Sem emoji como ícone — **somente Lucide**, stroke e
tamanho consistentes.

### 10.10 Percepção de performance
Prefetch on hover no master-detail; suspense boundaries por zona; optimistic UI nas ações
rápidas (com rollback). Velocidade percebida é parte do "premium".

### 10.11 Segurança de ação
**Undo em ações destrutivas** (em vez de só confirmar); toasts curtos e contextuais; confirmação
reservada ao irreversível. Reduz medo de operar → interface parece confiável.

### 10.12 Paridade dark/light e responsividade verificada
Validar ambos os modos e os breakpoints 375 / 768 / 1024 / 1440 em cada entrega. A doutrina só
"existe" quando atravessa tema e tamanho de tela.

### 10.13 Governança de Design System
Promover `components/agenda/ds/*` + tokens + `tipologia/*` a um **DS de produto compartilhado**.
Toda primitive nova nasce no DS, não no módulo. É o que mantém a coerência premium entre áreas.

---

## 11. Mapa de specs de execução (fontes de verdade por módulo)

| Módulo / área | Documento(s) de execução |
|---|---|
| Demandas | `ombuds-demandas-redesign-spec.md` · `ombuds-demandas-redesign-backlog.md` |
| Assistidos | `2026-06-24-assistidos-ui-reform-plan.md` |
| WhatsApp | `2026-03-25-whatsapp-redesign.md` · `2026-03-10-whatsapp-defender-design.md` · `2026-06-23-whatsapp-atendimento-bridge-design.md` |
| Instância Superior / Recursos | `2026-03-07-recursos-execucao-design.md` |
| Design system (base) | `src/lib/config/design-tokens.ts` · `src/lib/config/tipologia/*` · skill `padrao-defender` |
| Roadmap macro | `2026-06-22-aprimoramentos-ombuds-spec-master.md` |

---

## 12. Definition of Premium Done (checklist de entrega)

```
[ ] Hierarquia: 1 ação primária dominante por região; secundárias em overflow
[ ] Estado da situação legível ANTES da ação (informação antes de ação)
[ ] Exceções (crítico/atrasado/órfão/próximo) com semântica própria, não bloco comum
[ ] Cor só como sinal semântico, via token (sem hex/HSL solto)
[ ] Empty/loading/erro/sucesso pelo quarteto padronizado; empty com promessa de uso
[ ] Skeletons casados ao layout (zero layout shift); prefers-reduced-motion respeitado
[ ] Numerais tabulares/mono em CPF, processo, prazos
[ ] Tipologia via registry central (sem badge inline)
[ ] Sem emoji como ícone (somente Lucide); cursor-pointer em clicáveis
[ ] Foco visível + operável por teclado; alvos de toque ≥44px
[ ] Contraste WCAG AA; paridade dark/light verificada
[ ] Mobile reinterpretado (375/768/1024/1440), não comprimido
[ ] Primitives novas nascem no DS compartilhado
[ ] TDD cobrindo os estados críticos da superfície
```

---

## 13. Resultado esperado

Aparência mais clean e premium; melhor hierarquia visual; menos poluição; mais clareza
operacional; maior confiança institucional; navegação mais agradável; excelente adaptação
mobile — e a sensação de software jurídico **maduro**, não apenas funcional. Não só visual:
percepção de qualidade do produto como um todo.
