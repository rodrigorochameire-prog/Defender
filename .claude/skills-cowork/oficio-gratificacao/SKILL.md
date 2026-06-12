---
name: oficio-gratificacao
description: "Pipeline da gratificação por substituição (DPE-BA). Use quando o usuário disser que CONCLUIU uma substituição (automática/cumulativa/extraordinária) e quiser o ofício + relatório de atividades para requerer a gratificação e enviar ao SEI. Gatilhos: 'concluí a substituição', 'gratificação da substituição', 'ofício de substituição', 'relatório de substituição', 'fazer o ofício do 7DP', 'requerer gratificação'. Puxa os dados do OMBUDS (audiências, demandas/atos, atendimentos) + Drive (petições por data de assinatura), agrupando POR VARA para o usuário confirmar o escopo; gera ofício (próximo número livre) + relatório dos modelos; salva os canônicos e monta o par no outbox _Enviar ao SEI."
---

# /oficio-gratificacao — Ofício + Relatório de gratificação por substituição

Fluxo recorrente: **substituição → relatório de atividades → ofício à SubDPG → envio ao SEI → arquivamento**. O usuário avisa que concluiu uma substituição; esta skill monta o ofício e o relatório com os dados reais do período.

## Estrutura de pastas (zona 6 — reorg 2026-06-10)

```
6 - Atuação extrajudicial e administrativa/
├── Ofícios/                      ← canônico do ofício: ano corrente solto na raiz; anos antigos em <ANO>/
└── Substituições e gratificações/
    ├── Relatórios/               ← canônico do relatório (movido da zona 5)
    │   ├── Relatórios substituições automáticas/
    │   └── Relatórios substituição cumulativa/
    └── _Enviar ao SEI/           ← OUTBOX (par ofício+relatório por substituição; APAGAR após enviar)
        └── <N>-<ANO> - <unidade> <mes> .../
```
O outbox é descartável: depois de subir ao SEI, apaga-se só a subpasta. Os canônicos (ofício em `Ofícios/`, relatório em `Relatórios/`) ficam intactos.

## Conhecimento de estrutura (CRÍTICO p/ o escopo)

- **9ª DP (própria do Rodrigo)**: VVD (atribuição `VVD_CAMACARI`). Audiências/petições VVD são acervo PRÓPRIO — **não entram** na gratificação de substituição de outra DP.
- **7ª DP (substituída)**: **Vara do Júri e de Execuções Penais de Camaçari** (`JURI_CAMACARI` + execução penal). Substituição da 7ª DP = trabalho de **Júri + EP**.
- A vara aparece no corpo das petições como "VARA DO JÚRI E DE EXECUÇÕES PENAIS DA COMARCA DE CAMAÇARI" — usar isso para filtrar.
- Por isso a skill **agrupa por vara/atribuição e pede confirmação** do escopo antes de gerar — nunca assume.

## Passos

### 1. Parâmetros
- Unidade substituída (ex.: 7º DP), tipo (automática | cumulativa | extraordinária), período (dd/mm a dd/mm/aaaa).

### 2. Próximo número de ofício
`scripts/proximo_numero.py <ANO>` — varre `Ofícios/` (raiz + `<ANO>/`), pega o MAIOR número usado +1. **Sempre rodar** (a numeração tem saltos; já houve colisão por olhar só parte da pasta).

### 3. Levantar dados (OMBUDS + Drive), agrupado por vara
- **Audiências** (OMBUDS `audiencias`): `WHERE DATE(data_audiencia AT TIME ZONE 'America/Bahia') BETWEEN ini AND fim` → agrupar por `processos.atribuicao`. Substituição 7ª DP = `JURI_CAMACARI` (+ EP). Excluir `VVD_CAMACARI` (acervo próprio), salvo confirmação.
- **Demandas/atos** (OMBUDS `demandas`): por `data_conclusao`/`data_entrada` no período + atribuição.
- **Atendimentos** (OMBUDS `registros` com `tipo` de atendimento): por `data_registro` no período.
- **Petições assinadas** (Drive `4 - Peças/Petições por assunto (DOC)/**`): varrer `.docx`, ler a data de assinatura real "Camaçari/BA, DD de MMMM de AAAA", manter as do período; classificar pela **vara citada no corpo** (Júri e Execuções Penais = substituição). HC e ações autônomas → "Ações ajuizadas"; o resto → "Manifestações processuais". (As datas de modificação de arquivo NÃO servem — usar a assinatura.)
- Apresentar o agrupamento e **confirmar o escopo** com o usuário.

### 4. Gerar ofício (modelo)
Copiar o ofício-modelo mais recente (`Ofícios/Oficio n. 11 - 26 ...` ou o último de gratificação) preservando timbre/rodapé; trocar: número (passo 2), data (hoje), destinatária (**SubDPG atual — conferir memória `reference_subdpg_atual`**), assunto (automática/cumulativa), e o parágrafo do período/unidade. Salvar em `1 - Protocolar/` e na pasta de Ofícios do ano.

### 5. Gerar relatório (modelo)
Copiar o relatório-modelo da mesma natureza (`Relatórios/.../Relatorio de substituicao ... - <ref>.docx`). Preencher as tabelas: PERÍODO, UNIDADE ("9º DP em substituição no <N>º DP (vara)"), ATENDIMENTOS (do OMBUDS, ou em branco se o usuário pedir), AÇÕES AJUIZADAS, MANIFESTAÇÕES PROCESSUAIS (tipo | nº do processo), AUDIÊNCIAS (lista de CNJ), OFÍCIOS, REUNIÕES, OBSERVAÇÕES. Salvar em `Relatórios/Relatórios substituições <tipo>/`.

### 6. Outbox SEI + PDFs
Converter os dois p/ PDF (LibreOffice). Criar `_Enviar ao SEI/<N>-<ANO> - <unidade> <mes>/` com os **dois PDFs juntos**. Avisar: enviar ao SEI e depois apagar só essa subpasta.

### 7. Resumo
Reportar: número do ofício, período, totais por seção, caminhos. Lembrar de conferir destinatária e, se houver, a cláusula de cessação da substituição (ex.: exoneração da titular).

## Modelos de referência
- Ofício: `6 - Atuação.../Ofícios/Oficio n. 11 - 26 - ...Candeias...docx` (2026, Mônica, timbre) ou `2024/Oficio n. 07-24 ...7DP 07a20fev24` (análogo automática 7DP).
- Relatório: `Substituições e gratificações/Relatórios/Relatórios substituições automáticas/Relatorio de substituicao automatica - 7dp (juri, EP e VVD) - fev 2026.docx` (modelo recente, 9 tabelas).
- Próxima destinatária (SubDPG): memória `reference_subdpg_atual` (Mônica Christianne Soares de Oliveira; confirmar).

## Acionamento automático
Sem digitar `/oficio-gratificacao`, ativa quando o usuário disser: "concluí a substituição [do X]", "faz o ofício de gratificação", "relatório da substituição [período]", "requerer gratificação da substituição".


## Modo daemon (acionado pelo OMBUDS — SEM custo de API)

Quando a skill é disparada pelo daemon (`claude -p`, conta Max) a partir do botão
"Gerar gratificação" do OMBUDS, o prompt já traz **unidade, período, tipo e o ESCOPO
DE VARA decidido**. Nesse modo, rodar de forma AUTÔNOMA: não perguntar o escopo (usar
o informado), executar os passos 2–6 e retornar no final um JSON único:
`{oficio_numero, oficio_pdf, relatorio_pdf, manifestacoes, audiencias, observacoes}`.
O OMBUDS é apenas o ativador; toda a geração roda localmente pelo Claude Code (Max).
