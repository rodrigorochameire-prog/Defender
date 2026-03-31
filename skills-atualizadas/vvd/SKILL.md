---
name: vvd
description: "Gerador de peças jurídicas VVD/Lei Maria da Penha da DPE-BA, 7ª Regional – Camaçari. Use SEMPRE que o usuário pedir: resposta à acusação VVD, apelação, contrarrazões, alegações finais, revisão/revogação de MPU, análise de caso, atualização de endereço — ou mencionar: 'VVD', 'violência doméstica', 'Lei Maria da Penha', 'medida protetiva', 'MPU', 'paz em casa', 'revogação medida protetiva', 'desvio de finalidade da MPU', 'MPU para fins patrimoniais', 'medida protetiva usada para tomar imóvel', 'disputa possessória com MPU', ou qualquer peça de defesa em violência doméstica. Inclui conhecimento estratégico para casos em que a MPU é instrumentalizada para fins patrimoniais/possessórios. Gera .docx institucional DPE-BA."
---

# Peças Jurídicas — Violência Doméstica & Lei Maria da Penha (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Violência Doméstica**. Cada tipo de peça possui um prompt especializado na pasta `references/`.

## Fluxo de Trabalho

1. **Identificar o tipo de peça** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
2. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
3. **Coletar informações do caso** — Peça dados do assistido, número dos autos, fatos relevantes, contexto de violência
4. **Gerar a minuta** — Siga o prompt carregado para compor o conteúdo jurídico
5. **Gerar o .docx** — Use python-docx com a formatação institucional (veja seção abaixo)
6. **Salvar na pasta do usuário**

## Tipos de Peça Disponíveis

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Resposta à Acusação (VVD) | `references/vvd_ra.md` | Contra denúncia/acusação em caso de violência doméstica |
| Apelação (VVD básica) | `references/vvd_apelacao.md` | Recurso contra sentença condenatória em violência doméstica |
| Apelação (VVD aprimorada) | `references/vvd_apelacao_aprimorado.md` | Versão mais detalhada e fundamentada de apelação VVD |
| Contrarrazões à Apelação | `references/vvd_contrarrazoes_apelacao.md` | Resposta às razões de apelação do MP/querelante |
| Contrarrazões a RESE | `references/vvd_contrarrazoes_rese.md` | Resposta a recurso em sentido estrito em VVD |
| Contrarrazões a Embargos de Declaração | `references/vvd_contrarrazoes_embargos_declaracao.md` | Resposta aos embargos de declaração |
| Alegações Finais (VVD) | `references/vvd_alegacoes_finais.md` | Memoriais após instrução em causa de violência doméstica |
| Requerimento de Revogação de MPU | `references/vvd_requerimento_revogacao_mpu.md` | Petição para revogação de medida protetiva de urgência — inclusive casos em que a MPU foi instrumentalizada para fins patrimoniais/possessórios (desvio de finalidade) |
| Atualização de Endereço (VVD) | `references/rq_atualizacao_endereco_vvd.md` | Atualizar endereço processual da vítima ou acusado |
| Análise para Audiência | `references/vvd_analise_para_audiencia.md` | Análise de caso antes de audiência de instrução |
| Análise + Justificação de Audiência | `references/vvd_analise_audiencia_justificacao.md` | Análise com foco em justificação durante audiência |
| Análise para RA | `references/vvd_analise_para_ra.md` | Análise estratégica para estruturar resposta à acusação |
| Cota de Juntada de Áudios | `references/vvd_cota_juntada_audios.md` | Juntada de mensagens de áudio do WhatsApp (formato .ogg ou similar) com transcrição integral revisada e contextualização estratégica de cada mídia — inclusive versão revisada em substituição a cota anterior já protocolada |

## Como Usar os Prompts de Referência

Cada arquivo em `references/` contém o prompt completo extraído do Gemini Gem correspondente. Ao gerar uma peça:

1. **Leia o arquivo de referência** correspondente ao tipo de peça solicitado
2. **Siga as instruções do prompt** como se fossem suas instruções de trabalho
3. **Adapte com os dados reais** fornecidos pelo usuário (nomes, números de processo, datas, fatos)
4. **Aplique a formatação DPE-BA** descrita abaixo ao gerar o .docx

## Formatação Institucional e Geração .docx

> Padrões de página, margens, fontes, cabeçalho/rodapé e instruções python-docx: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).

> ⚠️ **Exceção — Análises**: Documentos do tipo "análise para audiência", "análise para RA" e afins são **documentos internos de trabalho** e **NÃO levam assinatura**. Encerram com Rodapé do Relatório (fundo `FFFBEB`, borda top `92400E`). Ver [`_shared/padrao-relatorio.md`](../_shared/padrao-relatorio.md).

## Particularidades da VVD (Lei Maria da Penha)

- **Juízo**: Utilizar "VARA DA JUSTIÇA PELA PAZ EM CASA" (quando aplicável)
- **Qualificação**: Sempre mencionar que o patrocinado é assistido pela Defensoria Pública do Estado da Bahia, com dispensa de mandato e uso das prerrogativas funcionais (artigos 396 e 396-A do CPP)
- **Contexto de Violência**: Sempre considerar aspectos de vulnerabilidade, ciclo de violência, trauma, segurança da vítima
- **Teses Frequentes**: Enunciado 50 do FONAVID (autonomia da vítima), direitos humanos, Convenção Interamericana para Prevenir, Punir e Erradicar a Violência contra a Mulher (Convenção de Belém do Pará)
- **Medidas Protetivas**: Dar atenção especial a pedidos de revogação ou atualização de MPU, considerando segurança

## Importante

> Regras gerais de nomenclatura e salvamento: [`_shared/formatacao-dpe-ba.md`](../_shared/formatacao-dpe-ba.md).
> Para análises (não peças formais), pode gerar em formato texto ou Markdown antes de .docx.

## Integração OMBUDS — `_analise_ia.json`

> Campos comuns, regras de preenchimento e localização: [`_shared/schema-base.md`](../_shared/schema-base.md).

### Payload específico da VVD

```json
{
  "payload": {
    "tipo_peca": "<nome da peça gerada>",
    "tipo_violencia": "<fisica|psicologica|moral|patrimonial|sexual|multipla>",
    "mpu_vigente": "<sim|nao|revogada|null>",
    "mpu_desvio_finalidade": "<true|false|null>",
    "relacao_partes": "<ex-companheiros|conjuges|namorados|pai_filha|outro>",
    "teses_subsidiarias": [],
    "pedidos": [],
    "orientacao_ao_assistido": "<orientação de postura e pontos a enfatizar>"
  }
}
```

> `mpu_desvio_finalidade`: marcar `true` quando houver indícios de instrumentalização da MPU para fins patrimoniais/possessórios.

### Valores de `tipo`
`vvd_ra` · `vvd_apelacao` · `vvd_contrarrazoes` · `vvd_alegacoes_finais` · `vvd_revogacao_mpu` · `vvd_atualizacao_endereco` · `vvd_analise_audiencia` · `vvd_analise_ra` · `vvd_cota_juntada`

---

## Linguagem Estratégica da Defesa

> Diretrizes completas: [`_shared/linguagem-estrategica.md`](../_shared/linguagem-estrategica.md).
