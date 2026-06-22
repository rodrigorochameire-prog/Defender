# Rubric de Revisão de Minuta

Para cada dimensão, dar veredito: **Manter** (bom, preservar com no máximo ajuste
de modalizador) · **Ajustar** (ideia certa, execução fraca) · **Substituir**
(errado/ausente/arriscado). Registrar 1 frase de motivo por veredito.

## 1. Cabeçalho / qualificação  (âncora: linguagem-defensiva, peca-*)
- Juízo/vara de endereçamento corretos para o ato e a fase.
- CNJ com dígito verificador válido (conferir DV).
- "defendido" — nunca "réu/acusado/agressor/autor do fato"; "ofendida".
- Qualificação do assistido completa e correta.

## 2. Fatos / objeto da prova  (âncora: peca-vvd §economia probatória)
- Item dos Fatos simplifica a imputação (artigos, data, local) — não repete a
  narrativa acusatória.
- Não cita literalmente frase incriminadora; ataca a fonte, não o conteúdo.
- Não lista xingamentos/versão acusatória para depois refutar.

## 3. Tese principal + coerência defensiva  (âncora: coerencia-defensiva)
- Subsidiária NÃO contamina a tese principal (hierarquia clara).
- Sem confissão policial dentro de tese de absolvição.
- Sem leitura alternativa do próprio fato que entregue o caso.
- A tese escolhida é a mais favorável sustentável pelos autos (conferir no dossiê).

## 4. Fundamentação + jurisprudência  (âncora: citacoes-seguras, peca-* §jurisprudência)
- Zero acórdão inventado — todo precedente conferível (número/relator/turma/data)
  ou fórmula genérica sem número.
- Precedente do MP/juízo lido na íntegra e, quando útil, virado contra a acusação.
- Súmulas conferidas (ex.: Súmula 593 não barra erro de tipo; Súmula 362 é dano
  moral, não alimentos).

## 5. Prova / citações  (âncora: citacao-depoimentos)
- Timestamps no formato canônico; identifica quem perguntou; espontaneidade.
- Citações seguras; nada citado da mídia sem conferência.

## 6. Pedidos
- Pedidos claros, corretos para o ato, completos (principal + subsidiários na
  ordem certa). Formato: **alíneas `a) b) c)`** (letra em negrito), recuo de bloco,
  **nunca bolinha (•)** — bolinha foge do padrão do Defensor. Lead em prosa
  ("requer o conhecimento e provimento... para:") seguido das alíneas.

## 6b. Desenvolvimento (não enxugar demais)
- A peça revisada deve ser **bem desenvolvida**, no padrão das peças protocoladas
  do Defensor (prosa argumentada por parágrafos, cláusula condicionante da própria
  sentença virada a favor, precedentes verificados). Não encurtar a fundamentação
  só porque o mérito é fraco: o recurso é direito do assistido. Concisão é cortar
  barroquismo (dim. 7), não cortar argumento.

## 7. Estilo anti-IA-look  (âncora: estilo-pecas)
- Travessão longo (—) no corpo: 0 (conferir por contagem).
- Prosa integrada, não listas; sem subdivisões A.1/B.2 em excesso.
- Sem barroquismo/hedging/auto-comentário/paralelismos perfeitos (rodar a
  verificação operacional do estilo-pecas).
- **Títulos de seção sóbrios, em substantivo** ("II – DA INSUFICIÊNCIA
  PROBATÓRIA", "Do superior interesse..."), **nunca frase-tese** com verbo/predicado
  ("...REVELAM QUEM AGIU") — frase no título é assinatura de IA. Modelo: as peças
  protocoladas do Defensor.

## 8b. Contextualização visual (prints dos autos)
- Embutir, no ponto pertinente, **print do trecho-chave dos autos** que ancora o
  argumento (sentença contraditória, denúncia sem valor, alegação do MP, BO).
  Helper `scripts/print_autos.py` (`recortar(pdf, busca, out_png, linhas_abaixo=N)`):
  acha a frase no PDF e recorta o parágrafo. Embutir centralizado, com legenda em
  itálico 10pt + `keep_with_next` na legenda (não separar da imagem na quebra).
  Largura ~5,9in. Só de trechos COM texto pesquisável (laudo escaneado pode falhar).

## 8. Linguagem defensiva  (âncora: linguagem-defensiva)
- Modalizadores presentes; presunção de inocência na redação; "fato imputado".

## 9. Fidelidade aos autos  (âncora: dossiê da Fase 1 + grep nos autos)
- CADA fato/data/ID afirmado na minuta conferido nos autos (lição Nailton: laudo
  "fabricado" que era só requisição). Marcar divergências como Substituir.
- Prescrição checada quando cabível (VVD/vias de fato).
