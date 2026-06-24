# Painel de Depoentes — Esquema obrigatório

> Esta é a **REGRA DE OURO** da skill. **Toda** análise individual e o relatório consolidado têm que conter este painel, completo, para cada depoente arrolado nos autos. **Nunca** suprima.

## Por que é essencial

Em audiência criminal, o que define a viabilidade de quase qualquer estratégia é **quem efetivamente vai ser ouvido naquele dia**. Sem isso, a defesa entra cega: prepara perguntas para uma testemunha que não comparecerá, deixa de pedir adiamento por desconhecer falha de intimação, perde oportunidade de manifestar dispensa, ou é pega de surpresa por depoente que já tinha sido ouvido em audiência anterior.

Por isso, **antes** de qualquer perguntário, qualquer tese, qualquer manifestação verbal — o defensor precisa saber, com precisão:

1. Quem é cada arrolado.
2. Foi intimado? Por qual via? Está válido?
3. Comparecerá hoje? (presente, ausente, dispensado, ouvido por precatória)
4. Já foi ouvido em alguma audiência anterior do mesmo processo?
5. Foi feito juramento, ou é informante?
6. Há pedido pendente sobre essa testemunha (substituição, dispensa, contradita)?

## Tabela do Painel — formato canônico

```
| # | Nome | Tipo | Intimação | Motivo (se NI) | Comparecimento | Já ouvido | Forma | Observação |
|---|------|------|-----------|----------------|----------------|-----------|-------|------------|
| 1 | ... | Ofendida | INTIMADA | — | A VERIFICAR | NÃO | presencial | Confirmou presença em 28/04 |
| 2 | ... | Test. acusação | NÃO INTIMADA | mandado não cumprido | NÃO COMPARECERÁ | NÃO | precatória pendente | CP devolvida 12/04, sem cumprimento |
| 3 | ... | Test. defesa | INTIMADA | — | DISPENSADA | NÃO | — | Defesa pediu dispensa em 22/04 (audiência 30/04) |
| 4 | ... | Test. acusação | INTIMADA | — | OUVIDO ANTERIORMENTE | SIM (16/06/2025) | precatória | AIJ-1 — degravação ID 543… (fl. 87) |
```

## Vocabulário controlado

### Tipo (sempre minúsculo, snake_case no JSON)
- `ofendida`
- `testemunha_acusacao` (arrolada pela acusação)
- `testemunha_defesa` (arrolada pela defesa)
- `informante` (parente/cônjuge sem juramento — art. 208 CPP)
- `interrogando` (o próprio defendido)
- `vitima_indireta` (quando a ofendida é menor e quem fala é o representante legal — usar com cautela)
- `perito` (perito oficial)
- `assistente_tecnico`

### Intimação
- `INTIMADO` — mandado cumprido com ciência válida do depoente.
- `NÃO INTIMADO` — mandado existe mas não foi cumprido / endereço inválido / nunca emitido.
- `INTIMAÇÃO PENDENTE` — mandado expedido, ainda em diligência (sem certidão final).
- `INTIMAÇÃO DISPENSADA` — depoente compareceu por iniciativa própria sem mandado, ou está ciente por outra forma (e.g., advogado constituído já intimado pelo PJe).
- `DESCONHECIDO` — autos não esclarecem; pedir esclarecimento ao cartório.

### Motivo (se NI ou pendente)
- `nao_localizado` — OJ não encontrou em diligência.
- `mandado_nao_cumprido` — mandado emitido, sem retorno positivo.
- `endereco_invalido` — endereço incorreto/desatualizado nos autos.
- `em_diligencia` — OJ ainda em busca.
- `recusa_recebimento` — depoente recusou ciência.
- `precatoria_devolvida` — CP devolvida sem cumprimento.
- `precatoria_pendente` — CP em curso na comarca deprecada.
- `mandado_nao_emitido` — cartório ainda não emitiu (lapso) — APONTAR como pendência.
- `falta_de_informacoes` — autos sem dado suficiente.

### Comparecimento (preencher na manhã/véspera da audiência ou após verificação)
- `COMPARECEU` — confirmação positiva nos autos ou por contato direto.
- `NÃO COMPARECEU` — registrado em ata anterior; ou ausência justificada/injustificada hoje.
- `PRESENÇA EXIGIDA NÃO VERIFICADA` — autos silentes; assumir comparecimento e estar pronto.
- `DISPENSADA` — petição de dispensa deferida (ou pedido pendente).
- `OUVIDO ANTERIORMENTE` — já depôs em ato anterior do mesmo processo (ver "Já ouvido").
- `SUBSTITUÍDA` — depoente foi formalmente substituído por outro nos autos.
- `CONTRADITADA` — defesa pretende contraditar (registrar a tese da contradita).

### Já ouvido (sempre estruturado)
Se SIM, anotar:
- **Data**: data da audiência anterior.
- **Peça/Ato**: identificação (AIJ-1, oitiva precatória, BO, etc.).
- **Onde encontrar**: ID do PJe + fl., timestamp da mídia, link da degravação se houver.
- **Resumo do que disse**: 2-3 linhas com o ponto-chave para a defesa (consistência, contradição etc.).
- **Necessidade de reinquirição**: SIM/NÃO com justificativa.

### Forma
- `presencial`
- `videoconferencia`
- `precatoria` (quando colhido em outra comarca)
- `escuta_especial` / `depoimento_especial` (Lei 13.431/2017 — criança/adolescente)
- `domiciliar` (excepcional — saúde, idoso etc.)

### Observação (texto livre, mas conciso)
Anotar pendências práticas que mudam a estratégia — exemplos:
- "Confirmou presença em ligação no dia 28/04 — providenciada lista da escola da filha como prova."
- "Pedido de dispensa pela defesa em 22/04 — aguarda manifestação do MP."
- "Testemunha contraditada (cunhada da ofendida) — ouvida como informante."
- "Convocada por carta precatória à Vara Criminal de Salvador — degravação na fl. 87, ID 543…"
- "Sem juramento — irmão do defendido."

## Como extrair do PJe / dos autos

A skill `scraping_pje.md` faz o download dos autos. Dentro dos autos, o defensor (ou o automatizador) verifica:

1. **Decisão / despacho que designa a audiência** — lista geralmente os arrolados e ordena intimação.
2. **Mandados e suas certidões** — a certidão do OJ é a fonte primária do status (cumprido, frustrado, motivo).
3. **Ato Ordinatório de redesignação** — se a audiência foi adiada, ver se as testemunhas foram re-intimadas ou ficaram cientes.
4. **Petições de dispensa / substituição / contradita** — buscar movimentações entre a designação e a data da audiência.
5. **Atas anteriores e degravações** — para identificar quem JÁ foi ouvido.
6. **Precatórias** — buscar deprecações em curso ou devolvidas.
7. **Despachos de saneamento** — podem ter consolidado a lista após substituições.

## Heurística para preencher rapidamente

Quando os autos têm muitos documentos e o tempo é curto:

1. Localizar o **último despacho** ou **ata de adiamento** mais recente — esse documento condensa o que será produzido na próxima audiência.
2. Conferir as **certidões de mandado** das últimas 4 semanas — fonte imediata do status de intimação.
3. Para depoimentos já colhidos, conferir **degravações** em PDF (palavras "DEPOIMENTO", "OITIVA", "INQUIRIÇÃO", "INTERROGATÓRIO" no índice do PJe) e atas (`AUDIÊNCIA REALIZADA`, `ATO REALIZADO`).
4. Quando houver dúvida sobre intimação, marcar `DESCONHECIDO` — não inventar `INTIMADO`.

## Integração com OMBUDS

Persistir no campo JSON `audiencias.registro_audiencia.depoentes`. Schema:

```json
{
  "depoentes": [
    {
      "nome": "Marinilda Rocha da Silva",
      "tipo": "ofendida",
      "intimacao": "intimado",
      "motivo_nao_intimacao": null,
      "comparecimento": "presenca_nao_verificada",
      "ja_ouvido": null,
      "forma": "presencial",
      "observacao": "Confirmou presença em ligação 28/04. Pediu acompanhamento pelo CRAM."
    }
  ]
}
```

## Apresentação no PDF consolidado

No relatório do dia, **cada audiência** abre com a tabela do painel. Não é opcional. Quando uma audiência tem 0 depoentes (e.g., audiência de custódia), o painel é substituído por uma linha explícita: *"Não se aplica — audiência de custódia, sem depoentes arrolados."*

## Anti-padrões (NÃO fazer)

- Listar nomes sem status — produz falsa sensação de preparo.
- Usar "intimado(a)" sem evidência (autos vagos) — sempre usar `DESCONHECIDO` em caso de dúvida.
- Inferir comparecimento por silêncio dos autos — assumir `PRESENÇA EXIGIDA NÃO VERIFICADA`.
- Ignorar testemunhas já ouvidas em ato anterior — elas mudam a estratégia (não precisa repetir, só pedir esclarecimento).
- Tratar "ofendida" como testemunha — ela é parte material, ouvida sem juramento e com tratamento especial (Lei 13.431, se vulnerável).
