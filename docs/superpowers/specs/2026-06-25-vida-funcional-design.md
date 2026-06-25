# Spec — Vida Funcional (grupo "Carreira", subsistema 1)

**Data:** 2026-06-25
**Autor:** Rodrigo Rocha Meire (Defensor Público, 9ª DP Camaçari) — via brainstorming com Claude Code
**Status:** spec aprovada em design; aguardando revisão antes do plano de implementação.
**Branch:** `feat/carreira-vida-funcional`

---

## 1. Contexto e objetivo

O OMBUDS hoje cobre o trabalho jurídico (demandas, processos, audiências, atendimentos), mas **não enxerga a vida funcional do defensor** — a dimensão de carreira e administrativa: promoções, remoções, lotações, férias, afastamentos, diárias, folgas, trabalho extraordinário, substituições/gratificações, reembolsos, cooperações, convocações e solicitações administrativas.

Esse conhecimento já existe, mas vive disperso em pastas do Google Drive (`1 - Defensoria 9ª DP / 10 - Vida funcional`, `6 - Atuação extrajudicial e administrativa / Substituições e gratificações`) e em skills (`oficio-gratificacao`, `institucional`). Não há interface navegável nem banco.

**Objetivo:** criar uma interface + banco que revele a vida funcional de forma intuitiva e a facilite — um lugar único onde o defensor (a) vê sua trajetória de carreira, (b) é avisado proativamente de prazos e oportunidades, e (c) comprova sua atuação. Cada ponto vinculado às pastas adequadas do Drive.

**Escopo desta spec:** apenas o subsistema **Vida Funcional** (pessoal, privado). É o primeiro de dois subsistemas do novo grupo de navegação "Carreira". O segundo — **Observatório DPE-BA** (institucional, compartilhável) — terá sua própria spec → plano → implementação, depois.

**Não-objetivo:** o Observatório DPE-BA; qualquer visão agregada multi-defensor (admin/corregedoria); migrar o conteúdo markdown do Observatório para banco.

---

## 2. Decisões de produto (tomadas no brainstorming)

| Tema | Decisão |
|---|---|
| Estrutura de trabalho | Um grupo de navegação ("Carreira"), **dois subsistemas em sequência**: Vida Funcional primeiro, Observatório depois. Cada um com spec→plano→implementação própria. |
| Valor da interface | **Três camadas**: Linha do Tempo (base) + Radar de prazos (topo) + Produtividade (aba). |
| Integração com Drive | **Navegação embutida + indexação ativa**: a UI lista/preview os arquivos da pasta; o daemon indexa e **propõe** eventos (nunca auto-cria). |
| Privacidade | **Estritamente privada por defensor** (`defensorId`); cada um vê só o seu; sem visão agregada no MVP. |
| Modelo de dados | **Eventos polimórficos** — uma tabela única com `tipo` + `dados jsonb`. Produtividade é *view* sobre tabelas existentes. |
| Nome do grupo | **"Carreira"** (3º grupo de sidebar, após Cadastros). |
| Layout da home | **Bento híbrido**: Radar no topo → Trajetória (card/aba, peso igual) → domínios operacionais como cards de ação em **4 clusters**. |
| Tela de domínio | Sugestões do indexador (topo, confirmar) · eventos tipados (esquerda) · **Drive lateral fixo** (direita) · mini-timeline. |
| Sugestões do indexador | **Com confirmação** (nada vira evento sem ✓ do defensor). |
| Trajetória | **Peso igual** (card/aba), não herói. |
| Produtividade | **Dashboard ao vivo + exportar relatório** (reusa pipeline `oficio-gratificacao`). |

---

## 3. Arquitetura

### 3.1 Navegação

- Novo grupo de sidebar **"Carreira"** em `src/components/layouts/admin-sidebar.tsx`, posicionado **após `CADASTROS_NAV`**, seguindo o padrão existente (`*_NAV` array + componente de menu colapsável + render em `AdminSidebarContent()`).
- Itens do grupo no MVP: **Vida Funcional** (`/admin/carreira/vida-funcional`). Reserva-se **Observatório DPE-BA** para a 2ª spec.
- Páginas em `src/app/(dashboard)/admin/carreira/vida-funcional/` (App Router), seguindo a convenção `page.tsx` + `loading.tsx` + `[tipo]/page.tsx` (detalhe de domínio).

### 3.2 Privacidade e escopo

- Toda leitura/escrita filtra por `defensorId = ctx.user.id` via os helpers de `src/lib/trpc/defensor-scope.ts`.
- Regra: `getDefensoresVisiveis(user)` **não se aplica** aqui no sentido de compartilhamento — Vida Funcional é sempre `[user.id]`, mesmo para `servidor`/`estagiario`? **Decisão:** no MVP, segue a mesma semântica das demandas (estagiário vê do supervisor; servidor conforme `defensoresVinculados`; admin vê tudo). Isso mantém consistência com o resto do app e atende ao caso de servidor que ajuda o defensor a organizar a vida funcional. *Não* há visão agregada/cross-defensor de leitura institucional.
- Mutações bloqueadas em modo "view-as-peer" (middleware `blockWhenViewingAsPeer` já existente).

### 3.3 Modelo de dados — tabela polimórfica

Nova tabela em `src/lib/db/schema/` (ex.: `vida-funcional.ts`), registrada no schema Drizzle:

```
vida_funcional_eventos
  id              serial PK
  defensor_id     integer NOT NULL  -- FK users.id, privado
  tipo            enum vf_tipo_evento NOT NULL
  cluster         enum vf_cluster NOT NULL  -- derivável do tipo, materializado p/ query
  titulo          text NOT NULL
  descricao       text
  data_evento     date NOT NULL
  data_fim        date              -- p/ intervalos (férias, afastamento, cooperação)
  prazo           date              -- alimenta o Radar
  status          enum vf_status NOT NULL DEFAULT 'previsto'
  valor_cents     bigint            -- diárias, gratificações, reembolsos (opcional)
  drive_folder_id text
  drive_file_id   text
  origem          enum vf_origem NOT NULL DEFAULT 'manual'  -- manual | indexador | skill
  dados           jsonb NOT NULL DEFAULT '{}'  -- campos específicos do tipo
  created_at      timestamptz NOT NULL DEFAULT now()
  updated_at      timestamptz NOT NULL DEFAULT now()
  deleted_at      timestamptz       -- soft delete

índices:
  (defensor_id, status, deleted_at)
  (defensor_id, tipo, data_evento)
  (defensor_id, prazo) WHERE prazo IS NOT NULL AND deleted_at IS NULL
```

Enums:

- `vf_tipo_evento` (MVP): `POSSE, PROMOCAO, REMOCAO, TITULARIDADE, ACUMULO, DESIGNACAO_RELEVANTE, CONVOCACAO, FERIAS, LICENCA, AFASTAMENTO, DIARIA, FOLGA, TRABALHO_EXTRAORDINARIO, SUBSTITUICAO, GRATIFICACAO, REEMBOLSO, COOPERACAO, SOLICITACAO_ADM`. (2ª leva acrescenta `CEPRO, CORREGEDORIA`.)
- `vf_cluster`: `progressao, ausencias, contraprestacao, administrativo`.
- `vf_status`: `previsto, em_curso, concluido, pendente, arquivado`.
- `vf_origem`: `manual, indexador, skill`.

**Mapa tipo → cluster:**

| Cluster | Tipos |
|---|---|
| `progressao` | POSSE, PROMOCAO, REMOCAO, TITULARIDADE, ACUMULO |
| `ausencias` | FERIAS, LICENCA, AFASTAMENTO, CONVOCACAO, COOPERACAO, DESIGNACAO_RELEVANTE |
| `contraprestacao` | SUBSTITUICAO, GRATIFICACAO, TRABALHO_EXTRAORDINARIO, FOLGA, DIARIA, REEMBOLSO |
| `administrativo` | SOLICITACAO_ADM |

**Marcos da Trajetória** = subconjunto de tipos exibidos como espinha cronológica em destaque: `{POSSE, PROMOCAO, REMOCAO, TITULARIDADE, ACUMULO, DESIGNACAO_RELEVANTE, CONVOCACAO}`. Os demais tipos aparecem na timeline como anotações leves quando "Tudo" está ativo.

**`dados jsonb` por tipo (exemplos, não exaustivo):**
- `PROMOCAO`: `{ classeOrigem, classeDestino, criterio: 'antiguidade'|'merecimento', edital, posicaoLista, resultado }`
- `REMOCAO`/`TITULARIDADE`: `{ unidadeOrigem, unidadeDestino, comarca, modalidade: 'pedido'|'permuta'|'compulsoria', ato }`
- `AFASTAMENTO`: `{ motivo, comarca, anuente, diariaEventoId? }`
- `FOLGA`: `{ origemTrabalhoExtraordinarioId?, saldoDias, vencimento, opcaoPecunia: bool }`
- `TRABALHO_EXTRAORDINARIO`: `{ baseNormativa, atos: int, geraFolgas: int|null, geraPecunia: bool }`
- `GRATIFICACAO`/`SUBSTITUICAO`: `{ unidadeSubstituida, modalidade, periodoInicio, periodoFim, oficioId?, seiStatus }`
- `REEMBOLSO`: `{ baseNormativa: 'FAJDPE 007/2024', itens: [...], conta }`
- `DIARIA`: `{ afastamentoEventoId?, trecho, qtd, status: 'a_requerer'|'requerida'|'recebida' }`

**Produtividade não tem tabela** — é calculada por *queries* sobre `audiencias`, `demandas`, `registros` e contagem de peças, filtradas por `defensorId` e período (mesma fonte que a skill `oficio-gratificacao`).

### 3.4 Camada de API (tRPC)

Novo router `src/lib/trpc/routers/vida-funcional.ts`, registrado em `routers/index.ts` como `vidaFuncional`:

- `listEventos({ tipo?, cluster?, status?, periodo?, marcosOnly? })` — escopo `defensorId`.
- `getEvento({ id })`, `createEvento(input)`, `updateEvento({ id, ...patch })`, `deleteEvento({ id })` (soft).
- `radar()` — retorna os alertas computados (ver §4).
- `trajetoria()` — eventos-marco ordenados por `data_evento`.
- `produtividade({ periodoInicio, periodoFim, agruparPor? })` — view sobre tabelas existentes.
- `sugestoes.list()` / `sugestoes.confirmar({ id, patch? })` / `sugestoes.ignorar({ id })` — fila do indexador (ver §5).
- `drive.listFolder({ folderId })` — proxy de listagem/preview do Drive (reusa o que `/admin/drive` já faz).
- `gerarRelatorio({ periodo, tipo })` — dispara o pipeline `oficio-gratificacao` (memorial/relatório).

Procedures `protectedProcedure`. Toda mutação registra auditoria (`logAudit`) como nos demais routers.

### 3.5 Telas

1. **Home** (`/admin/carreira/vida-funcional`)
   - Cabeçalho `CollapsiblePageHeader` com **Radar** (chips/cards de alerta) e pill colapsado com contagem de pendências.
   - Abas: **Visão geral** · **Linha do Tempo** · **Produtividade**.
   - *Visão geral*: card **Trajetória** (peso igual) + domínios operacionais como cards de ação agrupados nos 4 clusters; cada card mostra contagem + próximo prazo.
2. **Linha do Tempo (Trajetória)** — cronologia vertical; marcos em destaque, operacional como anotação leve; filtros `Marcos | Operacional | Tudo`; cada marco liga ao Drive.
3. **Detalhe do domínio** (`/admin/carreira/vida-funcional/[tipo]`) — sugestões do indexador (topo, confirmar/editar/ignorar) · lista de eventos tipados (esquerda) · **Drive lateral fixo** com lista+preview (direita) · mini-timeline do domínio · botão "+ Novo evento".
4. **Produtividade** — seletor de período + agrupamento; KPIs (audiências, demandas concluídas, peças/petições, atendimentos, substituições/coberturas); breakdown por atribuição; bloco "leitura art. 92 LC 26"; botão **Gerar relatório (.pdf)**.

Estética: Padrão Defender (`design-tokens.ts`, `Card`, `CollapsiblePageHeader`), `font-mono` para números/valores, skeletons, `cursor-pointer` e `prefers-reduced-motion`.

---

## 4. Radar — motor de alertas

O Radar é uma função pura (`radar()` no router) que varre os eventos do defensor e emite alertas datados, ordenados por urgência. Cada alerta: `{ tipo, severidade: 'critico'|'atencao'|'info', titulo, prazo, eventoId, acaoSugerida }`.

Regras MVP:

| Tipo | Gatilho | Severidade |
|---|---|---|
| `FOLGA` | saldo de folga com `vencimento` próximo (Res. CSDP 06/2024 — usar ou virar pecúnia) | crítico ≤7d, atenção ≤30d |
| `FERIAS`/`LICENCA` | período do ano sem evento marcado, ou `status='previsto'` a anuir | atenção |
| `GRATIFICACAO` | `SUBSTITUICAO`/`GRATIFICACAO` com `seiStatus` pendente e período encerrado | atenção |
| `DIARIA` | `AFASTAMENTO` concluído com `DIARIA` em `a_requerer` | atenção |
| `REEMBOLSO` | janela FAJDPE 007/2024 aberta com itens não requeridos | info |
| `PROMOCAO` | janela de antiguidade/merecimento próxima (base `lce26-bahia.ts`) | info |
| `COOPERACAO`/`CONVOCACAO` | `data_fim`/`prazo` se aproximando | atenção |
| `SOLICITACAO_ADM` | `status='pendente'` há > N dias sem resposta | atenção |

Janelas legais derivam de `src/config/legislacao/data/lce26-bahia.ts` e das resoluções já catalogadas (parâmetros configuráveis, não hard-coded em regra de negócio crítica). As regras são incrementais: cada tipo ganha sua regra conforme o domínio é ativado.

---

## 5. Drive — navegação embutida + indexação ativa

- **Navegação embutida:** cada evento/domínio guarda `drive_folder_id`/`drive_file_id`; a UI lista e pré-visualiza os arquivos da pasta dentro do app, reusando a infraestrutura de `/admin/drive`. O Drive permanece a **fonte da verdade** dos documentos.
- **Indexação ativa (daemon):** um job periódico no daemon (host M4) varre as pastas mapeadas de cada domínio; para cada arquivo novo, gera uma **sugestão** em uma fila (`vida_funcional_sugestoes` ou linhas com `status='pendente_sugestao'` — decidir no plano) com `{ driveFileId, pastaOrigem, tipoSugerido, tituloSugerido, dataSugerida }`.
- **Confirmação obrigatória:** sugestões aparecem no topo da tela de domínio. Só viram evento (`origem='indexador'`) com **✓ Confirmar** (ou Editar→Confirmar). **Nunca auto-criam.** Ignorar remove a sugestão e registra para não re-sugerir o mesmo arquivo.
- Mapa pasta→tipo inicial (configurável): `Promoção por merecimento`→PROMOCAO; `CEPRO`→CEPRO(2ª leva); `DPBA - Corregedoria`→CORREGEDORIA(2ª leva); `DPBA - Convocações`→CONVOCACAO; `Cooperações`→COOPERACAO; `DPBA - Histórico funcional Rodrigo`→POSSE/REMOCAO/TITULARIDADE (heurística por nome); `Substituições e gratificações`→GRATIFICACAO.

---

## 6. Costuras com o existente

| Existente | Como Vida Funcional usa |
|---|---|
| `oficio-gratificacao` (skill) | Substituições/gratificações são **linkadas** (não duplicadas); a Produtividade chama seu pipeline em "Gerar relatório". |
| `institucional` (skill) | `SOLICITACAO_ADM` referencia/gera ofícios e requerimentos por essa skill. |
| `defensores_ba` (schema) | Fonte de unidades/lotações para `REMOCAO`/`TITULARIDADE`. |
| `lce26-bahia.ts` (legislação) | Base legal das janelas do Radar (promoção, substituição). |
| `audiencias`/`demandas`/`registros` | Fonte da aba Produtividade (view). |
| `TRABALHO_EXTRAORDINARIO`/`FOLGA` | Gancho com o futuro Observatório DPE-BA (eixo valorização). |

---

## 7. Ordem de construção (MVP → incremental)

1. **Fundação:** enums + tabela `vida_funcional_eventos` (migração Drizzle) · router `vidaFuncional` com escopo `defensorId` · grupo de nav "Carreira" + rota.
2. **Telas centrais:** Home (bento 4 clusters) + Trajetória + Detalhe de domínio com Drive embutido (`drive.listFolder`).
3. **Radar:** `radar()` + cabeçalho de alertas (regras §4, ativadas por tipo).
4. **Indexador:** job no daemon + fila de sugestões + UI de confirmação.
5. **Produtividade:** view + aba + "Gerar relatório" (integração `oficio-gratificacao`).

Todos os domínios entram como eventos desde o passo 1 (a tabela é "grátis"); a lógica fina por tipo (`dados`, radar, indexer) rola incrementalmente. **CEPRO** e **Corregedoria** ficam para a 2ª leva.

---

## 8. Critérios de aceite (MVP)

- [ ] Grupo "Carreira" aparece na sidebar após Cadastros; item "Vida Funcional" navega para a home.
- [ ] É possível criar/editar/arquivar um evento de qualquer tipo MVP, privado ao defensor logado (outro defensor não o vê).
- [ ] Home exibe Radar no topo e os 4 clusters com contagem/próximo prazo; abas Visão geral/Linha do Tempo/Produtividade funcionam.
- [ ] Trajetória mostra os marcos em ordem cronológica com link ao Drive.
- [ ] Tela de domínio lista eventos + lista/preview de arquivos da pasta do Drive vinculada.
- [ ] Radar emite ao menos as regras de `FOLGA`, `FERIAS`, `GRATIFICACAO`, `DIARIA`.
- [ ] Indexador propõe sugestões a partir de arquivos novos; nenhuma vira evento sem confirmação.
- [ ] Produtividade calcula KPIs do período a partir das tabelas existentes e gera relatório.
- [ ] `CI=1 vitest run` verde; build passa.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Escopo grande (11 tipos) | Tabela polimórfica torna novos tipos baratos; lógica fina é incremental; CEPRO/Corregedoria adiados. |
| Indexador gerar ruído | Sugestões sempre com confirmação; registro de "ignorado" evita re-sugerir. |
| Vazamento de dado privado | Escopo `defensorId` em todas as procedures; sem visão agregada; segue padrão já auditado das demandas. |
| Duplicar a skill de gratificação | Linkar, não reimplementar; Produtividade chama o pipeline existente. |
| Acoplar regras do Radar à lei | Parâmetros configuráveis derivados de `lce26-bahia.ts`, não hard-coded. |
