# Biblioteca Jurídica — Design Document

> Brainstorming realizado em 2026-03-17. Implementação: ver plano de execução.

## Visão Geral

Módulo de **Biblioteca Jurídica** para o OMBUDS com duas alas integradas:
- **Jurisprudência** — teses indexadas individualmente, alimentadas automaticamente do Dizer o Direito + entrada manual
- **Legislação** — texto completo das leis com sincronização LexML, diff de alterações e histórico de versões

## Decisões de Design

| Dimensão | Decisão |
|----------|---------|
| Layout | Search-first, inspirado em JusBrasil e Google Scholar |
| Teses | Cards individuais por holding (não por informativo inteiro) |
| Alimentação | Híbrido: auto (Dizer o Direito RSS → IA extrai tese) + manual |
| Legislação | Texto completo sincronizado com LexML + diff visual entre versões |
| Integração | "Citar em caso" + "Inserir em peça" em ambos os módulos |
| Notificação | Quando artigo citado em caso é alterado, Defensor recebe alerta |

## Layout — Jurisprudência (`/admin/jurisprudencia`)

Estende a página existente (983 linhas) com:
- Barra de tribunal colorida nos cards (vermelho STF / azul STJ)
- Badge "Aplicada em N casos seus" com dados reais do `caso_referencias`
- Hover actions: `[Citar em caso]` `[Inserir em peça]`
- Fonte badge "Dizer o Direito" nos julgados auto-importados
- Drawer lateral com análise completa + ratio decidendi

## Layout — Legislação (`/admin/legislacao`)

Estende a página existente com:
- Botão "Ver o que mudou" em artigos com alteração recente
- Componente `ArtDiff` com view lado a lado (antes/depois)
- Timeline de versões por artigo
- Badge laranja "Atualizado em DD/MM" quando sync detecta mudança
- Ribbon "REVOGADA" em leis revogadas (consultável mas sinalizado)

## Diff de Alterações Legislativas

```
Art. 25 — Legítima defesa  🟡 Atualizado em 10/03/2026
[Ver o que mudou ▾]
┌── Alteração: Lei 14.823/2025 ───────────────────────┐
│  ANTES                     DEPOIS                    │
│  Parágrafo único...        §1º Observados...         │
│  ~~texto revogado~~        §2º NOVO — texto novo     │
└──────────────────────────────────────────────────────┘
```

## "Citar em caso"

Modal → busca processo → vincula → observação opcional → salva em `referencias_biblioteca`.
No processo, aba "Fundamentos" lista todas as referências.
Badge "Aplicada em N casos" no card da tese.
Alerta quando artigo citado é alterado.

## "Inserir em peça"

Botão copia citação formatada para clipboard:
```
Nos termos da tese firmada pelo Superior Tribunal de Justiça no
Informativo 831: "[holding]" (STJ, REsp X, Rel. Min. Y, j. DD/MM/AAAA).
```

## Dizer o Direito → Auto-Extração de Teses

Quando post do Dizer o Direito é aprovado na triagem:
1. IA extrai: tribunal, número do informativo, holding (texto da tese), tema, ratio decidendi
2. Cria entrada em `jurisprudenciaJulgados` com `fonte = 'dizer_o_direito'`
3. Badge "Dizer o Direito" na tese resultante

## Tabelas Novas

```sql
-- Vinculação de teses/artigos a casos
referencias_biblioteca (
  id, tipo (tese|artigo|lei), referencia_id,
  caso_id FK, observacao, created_by, created_at
)

-- Histórico de versões de artigos
leis_versoes (
  id, lei_id, artigo_id, texto_anterior, texto_novo,
  lei_alteradora, data_vigencia, created_at
)
```
