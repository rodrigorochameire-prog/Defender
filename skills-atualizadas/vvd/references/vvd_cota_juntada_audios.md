# VVD — Cota de Juntada de Áudios (WhatsApp)

## Quando Usar

Sempre que o assistido tiver mensagens de áudio enviadas pela requerente — via WhatsApp ou similar — que contenham declarações favoráveis à defesa: admissões sobre posse/propriedade do imóvel, temporalidade da permanência, motivação não-protetiva da vinda, ausência de medo, planos patrimoniais, etc. Aplicável tanto à primeira juntada quanto à versão revisada em substituição a cota anterior já protocolada.

---

## Estrutura Geral da Cota

A cota é composta por três seções:

**I — DOS DOCUMENTOS JUNTADOS**
Identifica a natureza e origem dos arquivos (WhatsApp .ogg), as datas de encaminhamento ao Defensor (≠ data de emissão original), e os metadados do WhatsApp. Encerra com parágrafo declarando disponibilização do celular do assistido para inspeção judicial se necessário.

**II — TRANSCRIÇÃO E CONTEXTUALIZAÇÃO DE CADA ÁUDIO**
Bloco individual para cada arquivo, com: (a) cabeçalho identificando o arquivo, (b) transcrição em itálico recuada, (c) parágrafo de contextualização estratégica.

**III — DO PEDIDO**
Pedidos em cascata: (a) juntada dos arquivos; (b) oitiva pelo Juízo com apreciação conjunta ao pedido de revogação; (c) manifestação da requerente sobre autenticidade; (d) disponibilização do celular para perícia técnica se determinado.

---

## Metadados do WhatsApp — Ponto Crítico

> O nome do arquivo .ogg gerado pelo WhatsApp ao **encaminhar** uma mensagem reflete a **data do encaminhamento**, não a data de emissão original pela requerente. Nunca afirmar que os áudios foram enviados "após" determinado evento com base apenas no nome do arquivo — isso pode ser contestado.

**Como redigir:** "Essas datas correspondem ao encaminhamento dos arquivos ao Defensor — não necessariamente à data em que a requerente os enviou originalmente."

**Estratégia:** O conteúdo dos áudios é o que importa, não a data. Focar na análise do conteúdo.

---

## Verificação de Duplicatas Antes de Listar

Antes de montar a lista de arquivos, comparar tamanhos em bytes. Arquivos com o mesmo tamanho são idênticos mesmo com nomes distintos — não listá-los como arquivos separados. Exemplo do caso-referência: Audio 02 e Audio 06 tinham nomes diferentes mas eram o mesmo arquivo (confirmado por tamanho idêntico).

---

## Metodologia de Transcrição Recomendada

O processo usado no caso-referência (Jailson — Proc. nº 8007048-28.2026.8.05.0039) resultou em transcrições de alta fidelidade:

1. **Whisper AI (OpenAI, modelo small)** — transcrição automática com prompt de contexto contendo nomes próprios do caso e marcadores regionais. Fornece a base.
2. **App de transcrição (ex.: transcription app nativo iOS/Mac)** — gera PDFs com timestamps por segmento. Usados como "ground truth" para corrigir nomes, gírias e trechos mal captados pelo Whisper.
3. **Revisão manual pelo Defensor** — confirma expressões coloquiais e gírias regionais. Ex.: "fichar a carteira" (= registro formal do vínculo empregatício — CTPS) vs. "fechar"; "anticipei" (forma regional de "antecipei"); "caba no meu bolso" (= cabe).

**Se apenas o Whisper estiver disponível:** aplicar prompt de contexto com nomes (assistido, requerente, filhos, local) e revisar manualmente os trechos de nomes próprios, que são os mais sujeitos a erro.

**Nota sobre ambiente:** modelo Whisper medium (~1.5GB) pode causar OOM em ambientes com RAM limitada. Usar modelo small (~470MB). Modelos ficam em cache em `.cache/whisper/` e ocupam espaço considerável — limpar após uso se necessário.

---

## Estrutura de Cada Bloco de Áudio (python-docx)

```python
def audio_bloco(doc, numero, arquivo, transcricao, contexto_bold, contexto_texto):
    empty(doc)
    # Cabeçalho: "Áudio N — [nome do arquivo em itálico]"
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Twips(720)
    r = p.add_run(f"Áudio {numero} — "); r.bold=True
    r2 = p.add_run(arquivo); r2.italic=True

    # Transcrição recuada em itálico (bloco citação)
    p2 = doc.add_paragraph()
    p2.paragraph_format.left_indent = Twips(720)
    p2.paragraph_format.right_indent = Twips(360)
    p2.paragraph_format.first_line_indent = Pt(0)
    r3 = p2.add_run(f"Transcrição: \"{transcricao}\"")
    r3.italic = True; r3.font.size = Pt(11)

    # Contextualização estratégica
    p3 = body(doc)
    r4 = p3.add_run(contexto_bold); r4.bold = True
    r5 = p3.add_run(contexto_texto)
```

**Título do bloco:** sempre em negrito + nome do arquivo em itálico — facilita localização pelo Juízo.
**Transcrição:** sempre entre aspas, em itálico, fonte 11pt, recuo bilateral — visualmente distinta do corpo da peça.
**Contextualização:** começa com rótulo de relevância em negrito (ex.: "Relevância (admissão central): "), seguido do texto analítico.

---

## Versão Revisada — Como Substituir Cota Anterior

Quando uma cota já foi protocolada e as transcrições precisam ser corrigidas:

1. **Título da peça:** acrescentar "— VERSÃO REVISADA" em negrito
2. **Parágrafo de qualificação:** mencionar expressamente "em substituição à cota anteriormente protocolada nestes autos"
3. **Segundo parágrafo de metodologia:** explicar que a revisão incorporou transcrições automatizadas + ajustes manuais pelo Defensor, e que esta versão "reflete com fidelidade o conteúdo efetivo de cada mídia"
4. **Pedido final:** "Requer-se que a presente versão seja considerada em substituição à anterior para todos os fins processuais."

**O que NÃO fazer:** re-juntar os mesmos arquivos de áudio. Os arquivos já estão nos autos. Protocolar apenas a cota revisada evita duplicidade e confusão no sistema.

---

## Disponibilização do Celular para Inspeção Judicial

Incluir sempre dois pontos — um na seção I (declaração factual) e um no pedido (item d):

**Seção I:**
> "Para fins de eventual perícia técnica de autenticidade, o assistido declara que **o aparelho celular do qual os arquivos foram extraídos encontra-se em sua posse e disponível para inspeção judicial**, bastando que Vossa Excelência assim o determine."

**Pedido d):**
> "caso Vossa Excelência entenda pertinente a realização de perícia técnica para verificação da autenticidade, integralidade ou origem dos arquivos, informa-se que o assistido **disponibiliza o aparelho celular** do qual os áudios foram extraídos para inspeção judicial, bastando que seja determinada a forma e o prazo para sua apresentação em Juízo."

---

## Linguagem de Contextualização Estratégica por Tipo de Admissão

| Tipo de admissão | Como nomear no rótulo | Argumento central |
|---|---|---|
| Reconhecimento de propriedade alheia | "Relevância (admissão central):" | Confissão extrajudicial espontânea que afasta pretensão possessória |
| Declaração de temporalidade | "Relevância (temporalidade declarada):" | Permanência condicionada e com prazo — sem direito à moradia permanente |
| Convite para encontro presencial | "Relevância (ausência de medo):" | Comportamento radicalmente incompatível com narrativa de vítima |
| Motivação real da vinda (não violência) | "Relevância (motivação extrínseca):" | Desmonta nexo causal entre presença no imóvel e violência do requerido |
| Antecipação não acordada | "Relevância (admissão mais relevante):" | Chegada não combinada — afasta qualquer suposto convite ou autorização |
| Planos de obra/investimento | "Relevância (dimensão patrimonial):" | Trata o bem como próprio — dimensão possessória, não protetiva |
| Conflito patrimonial com terceiro | "Relevância (admissões patrimoniais e temporalidade):" | Revela pano de fundo civil — vendas, investimentos, expectativas patrimoniais |

---

## Expressões Regionais Frequentes nos Áudios (Nordeste/Bahia)

| Expressão ouvida | Significado | Observação |
|---|---|---|
| "fichar a carteira" / "fichou" | Ter o contrato registrado na CTPS (carteira de trabalho) | Gíria regional para o registro formal do vínculo empregatício |
| "caba no meu bolso" | Cabe no meu orçamento | Forma regional de "cabe" |
| "anticipei" | Antecipei | Forma regional — confirma autenticidade da fala |
| "nas carreiras" | Às pressas, de afogadilho | |
| "tá em pingo e pingo d'água" | Situação precária/instável | Expressão idiomática regional |
| "não honrou suas calças" | Não cumpriu sua palavra | Expressão de comprometimento pessoal |
| "comeu os 10 mil" | Gastou/consumiu o dinheiro (conotação de má-gestão) | Mais forte que "usou" — implica dissipação |
| "não vou adular ninguém" | Não vou bajular/me submeter a ninguém | |
| "cabeça a prêmio" | Situação de incerteza no emprego | |
| "meter mão na massa" / "meter mão" | Começar a trabalhar/construir | |

---

## Caso-Referência Completo: Jailson — Proc. nº 8007048-28.2026.8.05.0039

### Dados do Caso

| Campo | Dado |
|---|---|
| Assistido | Jailson Rufino Santos de Santana |
| Requerente | Maria da Purificação Vieira Santos |
| Processo | 8007048-28.2026.8.05.0039 — VVD Camaçari |
| MPU concedida | 26/02/2026 |
| Áudios encaminhados | 06/03/2026 (Áudios 1–8) e 19/03/2026 (Áudios 9–10) |
| Cotas protocoladas | Versão original + Versão revisada (19/03/2026) |

### Resumo dos 10 Áudios e Sua Relevância

**Áudio 1 — Audio 01 - 11.45.06.ogg**
*"Boa tarde, deixa eu te falar um negócio. Eu tô aqui em Camaçari com o Jaciane, aqui na casa que o Ninho mora. Rolou uma confusão, eu tive que sair de lá. Aí vou ficar lá na casa, com o Jaci, o Ninho e a menina."*
→ Chegada anunciada como instalação, não como fuga. Tom informativo e tranquilo.

**Áudio 2 — Audio 02 - 11.45.42.ogg**
*"Porque a casa é sua. Eu abri a boca pra dizer que a casa é minha? Não."*
→ **Admissão central de propriedade.** Confissão extrajudicial espontânea. Afasta qualquer pretensão possessória.

**Áudio 3 — Audio 03 - 11.45.41.ogg**
*"porque eu não vou alugar a casa confiando em porra do trabalho, que ainda nem fechou a carteira. [...] não vou depender de filho nem de ninguém pra poder pagar o meu aluguel. [...] não vou adular ninguém."*
→ Permanência temporária condicionada à estabilidade no emprego. Motivação logística, não protetiva. Menciona escola da filha como critério de escolha do novo imóvel.

**Áudio 4 — Audio 04 - 11.45.43.ogg** *(mais longo — maior riqueza probatória)*
*"o máximo três meses [...] Vendeu a casa de lá, comeu os 10 mil [...] não honrou suas calças [...] A empresa lá me fichar [...] Se o Moacir quiser me ajudar, tudo bem [...] não vou obrigar os meninos a fazerem uma coisa nas carreiras [...] você venha, nós senta e conversa."*
→ (a) Prazo máximo de 3 meses declarado; (b) conflito patrimonial subjacente — venda de imóvel anterior; (c) idioma regional "não honrou suas calças"; (d) decisão anterior da Defensoria como contexto; (e) convite para encontro presencial = ausência de medo.

**Áudio 5 — Audio 05 - 11.45.42 (1).ogg**
*"a firma ainda não me fichou. [...] A partir de janeiro, aqui vai ver quem fica [...] Eu não vou começar uma construção [...] A firma me fichar direitinho — aí sim, eu meto mão na obra."*
→ Planos de reforma/obra no imóvel condicionados ao emprego fixo. Trata o bem como próprio — dimensão patrimonial.

**Áudio 6 — Audio 06 - 11.45.42 (2).ogg**
*"Não vou depender dos outros para comprar um broco, comprar uma areia, comprar um cimento [...] Se o Moçinho vai ajudar, tudo bem [...] falei aqui a sua mulher quando ela vinha dormir aqui [...] Quando eu fechar minha carteira, eu vou meter a mão na massa [...] não venha pra cá com sua ignorância, e com sua valentia, não."*
→ Convivência com mulher de Jailson sem conflito. Planos de obra reiterados. Postura confrontacional — advertência, não fuga.

**Áudio 7 — Audio 07 - 11.45.43 (1).ogg**
*"Jardim cresceu uma pessoa amargurada. [...] Não vou cometer o mesmo erro que eu fiz com o Jadinho, com o Nininho. [...] Só largo Jaciane quando ela estiver de maior."*
→ Motivação declarada da permanência: acompanhar filha menor Jaciane. Sem qualquer menção a medo ou violência de Jailson.

**Áudio 8 — Audio 08 - 11.45.43 (2).ogg**
*"Jaciane me disse que você esteve lá falando um bocado de coisa, um bocado de merda, coisa, e perguntou a hora que eu chego. Eu mesmo vou te dizer, tô lá cinco horas. Se você quiser aparecer lá, estou lá te aguardando, viu? Pra conversar."*
→ **Ausência de medo.** Informada pela filha da presença de Jailson, convida-o a aparecer pessoalmente. Radicalmente incompatível com narrativa de vítima de violência psicológica.

**Áudio 9 — Audio 09 - 09.31.23.ogg**
*"o colégio de Jaciane só deu 15 dias ou um mês [...] Eu não quero ficar na sua casa, eu não quero [...] Porque a Jaciana estava sendo ameaçada no colégio [...] Daqui a 15 dias ou mês, se eu não arrumar um lugar barato [...] eu volto para o meu lugar para terminar o ano."*
→ Dupla relevância: (1) recusa expressa à permanência com prazo declarado; (2) revelação da motivação real da vinda — ameaças à filha na escola de origem, não violência de Jailson. Desmonta nexo causal da MPU.

**Áudio 10 — Audio 10 - 09.35.26.ogg**
*"eu falei a você que vinha no final do ano, mas anticipei [...] vou ficar aqui até eu arrumar uma casinha que caba no meu bolso [...] Eu só vou ficar aqui temporariamente [...] Mas antes de vir aqui, eu procurei saber direitinho. Não tô tomando nada, não tô invadindo nada. Só tô passando o tempo."*
→ **Admissão mais relevante do conjunto.** (a) Chegada não combinada com Jailson; (b) motivação: briga externa em seu local de origem; (c) permanência declarada como temporária; (d) "não tô tomando nada, não tô invadindo nada" — nega ocupação coercitiva com as próprias palavras. Forma regional "anticipei" e "caba" confirmam autenticidade.

### Nomes dos Filhos (para identificação em transcrições)

| Nome/Apelido | Quem é |
|---|---|
| Jaciane / Jaci / Jaciana / Jaciano | Filha caçula de Maria, menor de idade |
| Jardim / Jadinho | Filho adulto de Jailson |
| Nininho / Ninho | Filho adulto de Jailson que morava no imóvel |
| Jayane | Filho(a) adulto(a) — mencionado como caso anterior de ausência paterna |
| Moçinho / Moacir | Pessoa que ofereceu ajuda financeira para obras |

> **Atenção:** Whisper frequentemente confunde "Jaciane" com "Jaciânico", "Jadinho" com "Jardim", "Moçinho" com "Jadinho". Sempre corrigir com base no PDF de transcrição ou na escuta manual.

---

## Checklist de Revisão Antes de Protocolar

- [ ] Verificou duplicatas por tamanho de arquivo?
- [ ] Todas as transcrições foram conferidas (PDF app ou escuta manual)?
- [ ] Nomes próprios estão corretos (Jaciane, Jardim, Nininho, Moacir/Moçinho)?
- [ ] Expressões regionais foram mantidas com explicação entre colchetes ou no contextualização?
- [ ] Metadados de data foram redigidos com cautela (data de encaminhamento ≠ data de emissão)?
- [ ] Parágrafo de disponibilização do celular incluído na seção I?
- [ ] Pedido d) com disponibilização do celular incluído na seção III?
- [ ] Se versão revisada: menção expressa de substituição da cota anterior?
- [ ] Se versão revisada: NÃO re-juntou os mesmos arquivos de áudio?
