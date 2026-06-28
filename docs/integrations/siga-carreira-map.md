# SIGA (DPE-BA) — Mapa do módulo Carreira e alinhamento com OMBUDS

**Recon:** 2026-06-28, via CDP (Chrome em `127.0.0.1:9222`, sessão autenticada do defensor).
**Sistema:** SIGA — `https://siga.defensoria.ba.def.br` (ASP.NET MVC, rotas PascalCase, tabelas jQuery DataTables, server-rendered).

> ⚠️ **Caveat da conta usada na recon:** a sessão estava com a conta marcada **"Defensor(a) Inativo"** — um modal de troca de senha cobre as páginas e todas as tabelas mostram "Nenhum registro encontrado". A **estrutura** (cabeçalhos, filtros, taxonomias de motivo, opções de situação) está 100% visível e foi mapeada; **dados reais** exigem conta ativa.

---

## 1. Módulo Carreira — seções (menu real)

| Seção | Rota | Em OMBUDS? |
|---|---|---|
| Dados Cadastrais | `/Carreira/DadosCadastrais` | — (perfil) |
| **Afastamentos** | `/Carreira/Afastamentos` (+ `/Historico`) | parcial (`afastamentos` = só cobertura) |
| **Férias** | `/Carreira/Ferias` | **sim** (Módulo Férias, PR #289) — faltam campos |
| **Licenças** | `/Carreira/Licenca` | **não** (só tipo `LICENCA` em vida_funcional) |
| **Outras Ausências** | `/Carreira/OutrasAusencias` | **não** |
| Licença Prêmio | `/Carreira/LicencaPremio` | não |
| Compensação Plantão | `/Carreira/GerirCompensacaoPlantao` + `/CompensacaoPlantao` | não (há `TRABALHO_EXTRAORDINARIO`/`FOLGA`) |
| Compensação Acervo | `/Carreira/CompensacaoAcervo` | não |
| Averbação | `/Carreira/Averbacao` | não |
| Passivos Funcionais | `/Carreira/PassivosFuncionais` | não |
| Cargo Designado | `/Carreira/CargoDesignado` | parcial (designações) |
| Carreira (Membro) | `/Carreira/CarreiraMembro` | parcial (vida funcional progressão) |
| Título / Artigos / Declaração de Bens | `/Carreira/Titulo` etc. | não |

**Não existe "Diárias" no SIGA Carreira.** Diárias são geridas em outro sistema (financeiro/SEI) — nosso Módulo Diárias é OMBUDS-nativo e **não sincroniza do SIGA**.

Outros módulos SIGA: `Consulta` (Geral OU, Lista de Antiguidade), `Processos` (Processo Eletrônico), `GuiaDefensor` (Tutoriais/Manual/Modelos/Informes).

---

## 2. Modelo de dados por seção (colunas reais das tabelas)

### Férias (`/Carreira/Ferias`)
Colunas: **Número Solicitação · Data Início · Data Final · Situação · Provimento · Duração · Data Publicação · Nº Siga · Suspensão**.
Filtro de exibição (situações): **Férias não gozadas · Férias Gozadas · Conversão em pecúnia · Férias Suspensas**.
Ações: "Solicitar Férias do ano", "Alterar Férias - Provimento".

### Afastamentos (`/Carreira/Afastamentos`, `/Historico`)
Colunas: **Número da Solicitação · Duração · Data de Publicação · Data Inicial · Data Final · Situação**.
Sub-fluxos (exibição): Solicitações de **Gozo** · de **Indenização** · de **Suspensão** · de **Interrupção** · Anexos · **Endereços de Afastamento** · **Comunicação de Afastamento**.

### Licenças (`/Carreira/Licenca`)
Colunas: **Número Solicitação · Data Início · Data Final · Situação · Motivo Ausência · Duração · Data Publicação · Nº Siga · Observação · Interrupção · Suspensão**.
Motivos (taxonomia oficial): ACIDENTE EM SERVIÇO · CASAMENTO · CESSÃO · DOENÇA DE PESSOA DA FAMÍLIA · EM CARÁTER ESPECIAL/INTERESSE PARTICULAR · EXERCER MANDATO ELETIVO · LUTO · MATERNIDADE (ABORTO OU NATIMORTO) · MATERNIDADE (OU ADOTANTE) · PARA CONCORRER A MANDATO ELETIVO · PATERNIDADE (OU ADOTANTE).
Situações: Solicitadas e Passíveis de Prorrogação · Gozadas · Indeferidas/Desistência · Suspensas.

### Outras Ausências (`/Carreira/OutrasAusencias`)
Colunas: **Número Solicitação · Data Início · Data Final · Situação · Duração · Publicação · Motivo Ausência · Observação · Interrupção · Nº Siga**.
Situações: Solicitadas · Gozadas · Indeferidas/Desistência · Suspensas.

---

## 3. Conceitos transversais do SIGA (ausentes no nosso modelo)

Todo "situação administrativa" no SIGA é uma **Solicitação formal** com:
- **Número da Solicitação** + **Nº Siga** (id interno do sistema).
- **Situação** (status) — vocabulário: *Solicitada → Gozada / Indeferida / Desistência / Suspensa / Interrompida* (+ "Passível de Prorrogação").
- **Provimento / Nº do Ato** + **Data de Publicação** (o ato oficial que defere).
- **Duração** (dias, computada).
- **Suspensão** e **Interrupção** como eventos do ciclo de vida.
- Para férias: **Conversão em pecúnia** (= abono pecuniário) e estado **Gozada vs Não gozada**.
- **Anexos**, e para afastamento: **Endereços de Afastamento** + **Comunicação de Afastamento**.

---

## 4. Lacunas vs OMBUDS (alinhamento)

**Módulo Férias (temos):** falta `numeroSolicitacao`, `provimento`/`numeroAto`, `dataPublicacao`, `nSiga`, `situacao` (vocabulário SIGA), `suspensao`, **conversão em pecúnia (abono — estava diferido p/ v2; SIGA confirma que é de 1º nível)**, estado gozada/não-gozada. Nosso lifecycle (`programada→homologada→em_fruicao→concluida`) precisa mapear p/ o do SIGA.

**Afastamentos:** nosso `afastamentos` é só **cobertura** (defensor↔substituto). O SIGA trata afastamento como **solicitação formal** com gozo/indenização/suspensão/interrupção. São conceitos distintos — manter cobertura como está e, se sincronizar, criar entidade "situação funcional" espelhando o SIGA.

**Novos módulos que o SIGA implica:** **Licenças** (com taxonomia de motivo), **Outras Ausências**, **Licença Prêmio**, **Compensação Plantão/Acervo**.

---

## 5. Integração via scraping (arquitetura)

Padrão comprovado (igual ao SIGAD/Solar): `enrichment-engine/services/siga_scraper_service.py` (Playwright) → `routers/siga.py` (FastAPI) → `enrichment-client.ts` → `trpc/routers/siga.ts` → staging (`siga_import_staging` + ledger, padrão `pje_import_staging`) → revisão/dedup → grava em `ferias`/`afastamentos`/novas tabelas.

**Autenticação:** SIGA usa sessão (cookie) — duas opções: (a) **CDP** numa Chrome autenticada pelo defensor (igual ao PJe scraper, `connect_over_cdp:9222`) — recomendado, sem credenciais; (b) login automatizado por formulário (achar o form de login do SIGA — não mapeado, sessão já estava aberta).
**Extração:** tabelas são DataTables server-rendered → extração por DOM (igual SIGAD). Cada `/Carreira/<Seção>` tem filtro `select[name=exibicao]` p/ alternar entre situações.
**Caveat:** scraping de dados reais precisa de conta ativa (a usada na recon é inativa, sem registros).

Artefatos da recon: `scratchpad/siga_*.json` (estrutura por página) + `siga_*.png` (screenshots).
