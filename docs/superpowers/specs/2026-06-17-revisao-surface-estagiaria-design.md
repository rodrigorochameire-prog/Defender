# Surface de revisão para a estagiária (sub-projeto 2) — design

**Data:** 2026-06-17
**Autor:** Rodrigo (Defensor) + Claude Code
**Status:** aprovado (brainstorming) — aguardando spec review
**Contexto:** sub-projeto 2 de [[2026-06-16-revisar-minutas-estagiaria-design]]. O
sub-projeto 1 (engine `revisar-minutas`) já grava as considerações (Layer-2) em
`delegacoes_historico.observacoes` e harmoniza a demanda em `substatus='revisar'`.

## Problema

A engine grava a orientação da revisão no kanban, mas a estagiária não tem uma
forma boa de **ver o que foi validado/ajustado** e **levar isso para o WhatsApp**.
Hoje a página `/admin/delegacoes` (view dela) já exibe `observacoes` no detalhe da
delegação, porém sem destaque e sem ação de copiar.

## Não-objetivos (YAGNI / v1)

- Sem link/preview da peça final (ela vê pelo PJe/Drive).
- Sem replicar no `DemandaQuickPreview` (painel defensor-cêntrico).
- Sem backend novo: `minhasDelegacoes` já retorna `observacoes`. Sem migração.

## Escopo (v1)

Home: `/admin/delegacoes`, aba "Recebidas" (estagiária).

1. **Bloco "Considerações da revisão"** no detalhe da delegação (onde
   `observacoes` já é renderizado): rótulo claro ("O que o Defensor validou e
   ajustou") + botão **"Copiar para WhatsApp"**.
2. **Indicador no card:** badge "Revisão disponível" quando a delegação tem
   `observacoes` não-vazio — para ela notar sem abrir o detalhe.
3. **Filtro:** as delegações com considerações (`aguardando_revisao`/`revisado`)
   aparecem na aba Recebidas.

## Arquitetura / unidades (isolamento)

- **`montarMensagemRevisao(consideracoes: string, nome: string, horaDoDia: number): string`**
  — helper puro e testável (espelha `montarMensagemDelegacao`). Monta a mensagem
  de WhatsApp: saudação pelo horário + o texto das considerações. Vive em
  `src/components/demandas/revisao-message.ts`. Depende só dos args.
- **`CopiarRevisaoButton`** — componente pequeno: recebe `consideracoes` + `nome`,
  chama `montarMensagemRevisao` + `copyToClipboard` (`src/lib/clipboard.ts`, já
  trata focus-trap em sheet/modal). Mostra toast de sucesso.
- **Bloco no detalhe** (em `src/app/(dashboard)/admin/delegacoes/page.tsx`):
  renderiza o rótulo + texto de `observacoes` + `<CopiarRevisaoButton>`.
- **Badge no card** (mesmo arquivo): condicional a `observacoes` não-vazio.

## Fluxo de dados

`minhasDelegacoes` (tRPC, já existente) → cada delegação traz `observacoes`. UI lê
`delegacao.observacoes`; nada novo no servidor. O badge e o bloco são puramente
client-side sobre o dado já carregado.

## Erros / bordas

- `observacoes` vazio/nulo → não mostra bloco nem badge (sem ruído).
- Clipboard indisponível → `copyToClipboard` já cai no fallback `execCommand` e
  emite toast de erro se falhar.
- Texto muito longo → bloco com `whitespace-pre-wrap` e rolagem natural.

## Teste / aceitação

Logar como Emilly (role `estagiario`, user 14) → `/admin/delegacoes` aba
Recebidas → ver as considerações de Valmir/Leomar/Selton com o badge "Revisão
disponível" e copiar a orientação para WhatsApp (texto formatado com saudação).
Teste unitário do helper `montarMensagemRevisao` (saudação por horário; corpo).

## Critério de sucesso

A estagiária vê, na própria tela dela, o que foi validado/ajustado em cada minuta
revisada e copia a orientação para o WhatsApp em um clique, sem depender do
Defensor reencaminhar.
