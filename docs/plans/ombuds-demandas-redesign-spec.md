# OMBUDS — Redesign completo da tela Demandas (SPEC)

> Fonte de verdade do redesign da tela `admin/demandas`. Execução spec-driven, TDD, fatiada em fases, com validação incremental. Quando houver conflito entre o visual antigo e esta proposta, **prevalece esta proposta** — desde que regra de negócio e fluxos críticos sejam preservados.

## Objetivo
Transformar `admin/demandas` numa experiência **clean, premium, menos poluída e mobile-first**, preservando a identidade jurídica do produto. Não copiar Astrea/ADVBOX.

## Resultado esperado
- Mais refinada, calma e premium; menos poluição visual.
- Hierarquia clara entre contexto, filtros, lista, detalhe e ações.
- Alta densidade funcional sem sobrecarga.
- Excelente adaptação mobile (navegação e painéis ergonômicos por toque).
- Padrão visual reutilizável no resto do OMBUDS.

## Princípios
1. **Sobriedade jurídica premium** — precisão, confiança, ordem, discrição.
2. **Hierarquia forte** — explicitar contexto / filtro / dado de referência / item de trabalho / ação primária / ação secundária.
3. **Progressão orientada por tarefa** — fluxos (importação, análise) mostram onde estou, o que fazer agora, o que o sistema fará depois (wizard + revisão guiada).
4. **Context preservation** — aprofundar uma demanda sem perder a lista (side sheet contextual).
5. **Mobile real** — repensado, não comprimido (prioridade visual, menos opções simultâneas, painéis full-screen).

## Escopo (Opção A — redesign completo da tela)
Sidebar · Header · Métricas/resumos · Filtros+busca · Lista/cards · Ações por item · Sistema de botões/chips/switches/inputs · Sheet lateral · Modos internos do sheet · Modal de importação PJe · Estados (loading/vazio/erro/sucesso) · Layout mobile completo.

**Fora de escopo:** refactor global de todas as telas; mudanças profundas de regra de negócio; reescrita de backend; rebranding.

## Arquitetura alvo

### Desktop
Sidebar · Header · Faixa de filtros persistentes · Lista (região principal) · Sheet contextual à direita · Modais/takeovers para tarefas multietapa (PJe).

### Mobile
Header compacto + busca · Filtros em drawer/trilha horizontal · Lista vertical de cards compactos · Detalhe em full-screen sheet · Importação em full-screen wizard · Barra inferior de ações (se aplicável).

## Requisitos por área (resumo dos critérios de aceite)

- **Sidebar**: item ativo identificável <1s; mais leve sem perder densidade; sem competição de ícones/chips/contadores.
- **Header**: linha 1 título + ação primária global; linha 2 busca + filtros essenciais; linha 3 opcional indicadores discretos. CTA principal não concorre.
- **Métricas**: cards baixos/compactos; poucos; cor só para sinal importante; não desviam da lista.
- **Filtros/busca**: essenciais vs avançados; chips ativos; limpar rápido; busca central; mobile recolhido por padrão.
- **Lista**: anatomia padronizada (título, processo, assistido, prazo, status, urgência, atribuição, ação principal, overflow). Escaneável em 2–3s; sem 4–5 CTAs concorrentes; layout estável.
- **Ações por item**: 1 principal + 1–2 rápidas críticas; resto em overflow; sheet absorve ações detalhadas.
- **Sheet**: Faixa 1 header fixo (título/tipo/processo/status/urgência/responsável + 1 CTA primário + 1 secundário + menu) · Faixa 2 stepper visual discreto · Faixa 3 navegação interna por **modos** · Faixa 4 conteúdo do modo (rolagem interna) · Faixa 5 barra inferior contextual. Mobile = full-screen.
- **Modos internos do sheet**:
  - **Registros** (aba padrão; centro narrativo; busca/filtros sticky; cards leves; ações em overflow).
  - **Dados** (Identificação + Cronologia & Prazo; grid compacto; mini-cards de tempo: prazo/importação/atualização/eventos).
  - **Autos** (atos, peças, Smart Extract, documentos; empty states desenhados; CTA de extração/classificação; agrupamento por tipo).
  - **Produção** (ofícios, peças, nota privada, encaminhamento; cards com status e última atualização).
- **Modal PJe (wizard)**: Etapa 1 Configuração (atribuição + o que será automatizado) · Etapa 2 Texto (textarea protagonista + ajuda recolhível "Como copiar do PJe" + validação) · Etapa 3 Revisão (dados extraídos, inconsistências, correção, confirmação). Stepper compacto; mobile full-screen.
- **Estados**: loading (skeleton coerente); empty (mensagem útil + ação); error (específico + recuperação); success (breve, contextual; em import = resumo do criado).

## Sistema visual
- **Tipografia** de produto refinada/compacta; títulos contidos; texto funcional domina.
- **Botões**: primário / secundário / terciário-ghost / destrutivo / link utilitário. 1 primário por região; secundários não competem em cor; ghost para utilidades; links externos viram controles consistentes.
- **Chips/status**: cor só semântica; saturação limitada; padronizar urgente/concluído/pendente/informativo; legível em tamanhos compactos.
- **Inputs/switches**: borda sutil; foco elegante visível; altura confortável p/ toque; placeholder legível; labels estáveis.

## Épicos
1. Fundamentos visuais da tela.
2. Arquitetura da tela principal (sidebar/header/métricas/filtros/layout).
3. Lista operacional de demandas.
4. Sheet lateral contextual (header/stepper/modos/barra inferior; mobile).
5. Modal de importação PJe (wizard).
6. Estados especiais + polimento (loading/empty/error/success/a11y/QA).

## TDD
Testar **contrato/comportamento/fluxo/acessibilidade/responsividade**, não estética. Níveis: unit/component (vitest + @testing-library), integration (fluxos), e2e (Playwright — jornada principal), visual regression (snapshots por breakpoint, se aplicável). Escrever/ajustar testes **antes** de refatorações estruturais.

## Critérios globais de aceite
Tela mais limpa/estável/sofisticada; hierarquia clara; lista com menos ações simultâneas; sheet com modos; PJe como fluxo guiado; mobile coerente; testes dos fluxos críticos; a11y básica; sem regressões graves.

---
*(Spec fornecida pelo usuário; salva como fonte de verdade para execução por Claude Code. Versão integral original no histórico da conversa.)*
