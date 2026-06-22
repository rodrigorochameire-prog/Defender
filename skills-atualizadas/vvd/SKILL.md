---
name: vvd
description: "Gerador de peças jurídicas VVD/Lei Maria da Penha da DPE-BA, 7ª Regional – Camaçari. Use SEMPRE que o usuário pedir: resposta à acusação VVD, apelação, contrarrazões, alegações finais, revisão/revogação de MPU, análise de caso, atualização de endereço — ou mencionar: 'VVD', 'violência doméstica', 'Lei Maria da Penha', 'medida protetiva', 'MPU', 'paz em casa', 'revogação medida protetiva', 'desvio de finalidade da MPU', 'MPU para fins patrimoniais', 'medida protetiva usada para tomar imóvel', 'disputa possessória com MPU', ou qualquer peça de defesa em violência doméstica. Inclui conhecimento estratégico para casos em que a MPU é instrumentalizada para fins patrimoniais/possessórios. Gera .docx institucional DPE-BA."
---

# Peças Jurídicas — Violência Doméstica & Lei Maria da Penha (DPE-BA, 7ª Regional – Camaçari)

Esta skill gera documentos .docx formatados com o padrão institucional da Defensoria Pública para a atribuição de **Violência Doméstica**, além de **relatórios de análise estratégica** em Markdown.

---

## Padrões Obrigatórios de Redação

Consultar **`dpe-ba-pecas/SKILL.md`** → seção "Padrões Obrigatórios" para regras compartilhadas (nome inline, nulidade ≠ ilegalidade, reconhecimento irregular, paragrafação funcional, preâmbulo padrão).

---

## SKILLS TRANSVERSAIS — CONSULTA OBRIGATÓRIA

**ANTES de redigir qualquer peça ou relatório**, consultar OBRIGATORIAMENTE estas skills:

### 1. estilo-pecas
Manual de redação anti-IA. **Aplicar em passagem dedicada de revisão após a minuta inicial.** Cortar:
- Hedging cerimonial repetido, prefaciações ampliadas ("trata-se de", "cumpre observar", "cumpre demarcar", "convém registrar", "posto isso", "examine-se").
- Auto-comentário e meta-argumentação ("esta defesa busca", "como se demonstrará", "em essência", "no fundo", "no plano técnico", "estruturalmente decisivo", "probatoriamente decisivo").
- Paralelismo retórico tríplice/quaternário ("Primeiro... Segundo... Terceiro... Quarto..."), inclusive na síntese final.
- Marcadores (i)(ii)(iii) embutidos no corpo, adjetivação intensificadora redundante (plenamente, expressamente, integralmente).
- **Travessões longos (—) no corpo: zero**. Verificar com `grep -c '—'`.
- Adjetivações duplas redundantes ("isolada e externa", "genérica e indireta").
- Sínteses redundantes que repetem o que já foi dito.

A skill `estilo-pecas` traz também a seção **"Economia probatória defensiva"** — aplicar OBRIGATORIAMENTE em peças criminais (RA, AF, memoriais, apelação, contrarrazões): não citar literalmente palavras incriminadoras, atacar a fonte e não o conteúdo, não enumerar a versão acusatória ao contrastá-la com a defesa, não transcrever lista de xingamentos, item I enxuto, mapeamento técnico da imputação típica, genericidade da imputação como argumento autônomo, detração condicional quando o defendido já está solto.

### 2. linguagem-defensiva
Aplicar em TODA peça processual e relatório:
- "defendido" (NUNCA "acusado", "réu", "agressor", "autor do fato")
- "ofendida" ou "suposta vítima" (quando houver dúvida sobre autoria/materialidade)
- "fato imputado" (NUNCA "crime cometido")
- Modalizadores obrigatórios: "segundo a denúncia", "conforme a acusação pretende"
- "declarou", "relatou", "informou" (NUNCA "confessou", "admitiu")

### 3. citacao-depoimentos
Para TODA citação de depoimento em peças e relatórios:
- **Quem perguntou**: identificar MP, Defesa ou Juíza
- **Espontaneidade**: distinguir declaração espontânea de resposta a pergunta
- **Timestamp**: `(mídia audiovisual, a partir de XXminYYs)`
- **Reiteração**: "questionado(a) novamente pela Defesa sobre..." quando a mesma pergunta é repetida
- **Contexto temporal**: "logo em seguida", "minutos depois"

### 4. citacoes-seguras
Para TODA citação normativa (artigos, súmulas, jurisprudência):
- Verificar súmulas no banco verificado antes de citar
- Buscar jurisprudência antes de incluir
- Marcar com `[VERIFICAR PRECEDENTE]` quando não houver certeza absoluta
- Preferir artigos de lei (verificáveis) a jurisprudência (alucinável)

---

## Integração com Análises Estratégicas

Para **relatórios de análise** (audiências VVD, análise para RA, justificação de MPU), a skill `analise-audiencias` é o motor central. Ela identifica que o caso é VVD, carrega esta skill para conhecimento temático, e gera tripla saída (PDF com paleta Dourada + MD + JSON).

Referências de análise exclusivas da VVD (consultadas pela analise-audiencias):
- `references/vvd_analise_para_audiencia.md`
- `references/vvd_analise_audiencia_justificacao.md`
- `references/vvd_analise_para_ra.md`

---

## Fluxo de Trabalho

1. **Consultar skills transversais** — Ler estilo-pecas, linguagem-defensiva, citacao-depoimentos e citacoes-seguras
2. **Identificar o tipo de peça/análise** — Veja a tabela abaixo e pergunte ao usuário se não ficou claro
3. **Carregar o prompt específico** — Leia o arquivo correspondente em `references/`
4. **Localizar o processo do assistido** — Busque a pasta do assistido em "Processos - VVD" e leia PDFs, transcrições e documentos
5. **Consultar modelos reais similares** — Busque peças do mesmo tipo em "Petições por assunto" → "11 Violência Doméstica"
6. **Coletar informações complementares** — Se os autos não forem suficientes, peça dados ao usuário
7. **Gerar a minuta/relatório** — Siga o prompt carregado, aplicando TODAS as skills transversais
8. **Passagem dedicada de revisão (estilo-pecas)** — Antes de salvar, percorrer o checklist anti-IA: cortar hedging repetido, prefaciações, auto-comentário, paralelismo tríplice e marcadores (i)(ii)(iii) embutidos no corpo
9. **Gerar o .docx** — Use python-docx com formatação institucional (consultar dpe-ba-pecas)
10. **Salvar na pasta do usuário**
11. **Pós-protocolo — cadastrar processo vinculado no OMBUDS (peças incidentais)** — Se a peça for **Revogação de Prisão**, **Habeas Corpus**, **RESE/Apelação**, **MPU em apartado** ou outro pedido autuado em **autos próprios distintos da AP**, oriente o usuário a:
   - Após distribuir/protocolar e receber o número dos novos autos, abrir a página da AP no OMBUDS (`/admin/processos/{id}`)
   - Clicar em **"+ Vincular"** na barra de processos vinculados (ou usar o item **"Mover para autos apartados"** no menu kebab da demanda já aberta na AP)
   - Preencher número novo + tipo (REVOGAÇÃO, HC, RECURSO, MPU, IP, PEDIDO) — o sistema cria o processo apartado, garante `casoId` compartilhado e (se chamado pela demanda) transfere a demanda para o novo processo, preservando a timeline de registros
   - Não criar processo vinculado quando a peça é **mero ato no curso da própria AP** (ex.: alegações finais, resposta à acusação, manifestação, requerimentos endoprocessuais) — esses ficam como **demanda dentro da AP**, não geram autos novos

---

## Banco de Modelos Reais (Petições por Assunto)

Peças anteriores do Defensor em violência doméstica, organizadas por tipo. Use como referência de estilo, tom e estrutura argumentativa.

**Caminho base**: `Meu Drive/1 - Defensoria 9ª DP/4 - Peças/Petições por assunto (DOC)/`

| Subpasta | Relevância para VVD |
|---|---|
| `11 Violência Doméstica/` | Peças específicas de VVD (Lei Maria da Penha) — referência principal |
| `1 Alegações Finais/` | Alegações finais — base para AF em casos de VVD |
| `2 Apelação/` | Apelações criminais — base para apelação VVD |
| `3 Contrarrazões de Apelação/` | Contrarrazões quando o MP apela |
| `4 Contrarrazões de RESE/` | Contrarrazões de RESE em VVD |
| `6 HC/` | Habeas Corpus — defendidos presos em VVD |
| `7 Prisão e cautelares/` | Revogação/relaxamento de preventiva em VVD |
| `8 RESE/` | Recurso em Sentido Estrito |
| `9 Resposta à acusação/` | RA — defesa inicial em VVD |
| `Embargos Declaração/` | Embargos de declaração |
| `Nulidades processuais/` | Nulidades em casos de VVD |

**Como usar**: Liste os .docx da subpasta correspondente. Priorize `11 Violência Doméstica/`. Identifique 1-3 modelos similares, leia-os para absorver estilo e argumentação. Adapte ao caso concreto.

---

## Pastas de Processos dos Assistidos

| Atribuição | Caminho da Pasta |
|---|---|
| VVD | `Meu Drive/1 - Defensoria 9ª DP/3 - Casos/Processos - VVD/` |

Relatórios VVD: `Meu Drive/1 - Defensoria 9ª DP/5 - Operacional/vvd_reports_final/`

---

## Tipos de Peça e Análise Disponíveis

### Peças Processuais (.docx)

| Tipo de Peça | Arquivo de Referência | Quando Usar |
|---|---|---|
| Resposta à Acusação (VVD) | `references/vvd_ra.md` | Contra denúncia/acusação em violência doméstica |
| Alegações Finais (VVD) | `references/vvd_alegacoes_finais.md` | Memoriais após instrução — **VERSÃO APRIMORADA** com skills transversais integradas |
| Apelação (VVD básica) | `references/vvd_apelacao.md` | Recurso contra sentença condenatória |
| Apelação (VVD aprimorada) | `references/vvd_apelacao_aprimorado.md` | Versão detalhada e fundamentada |
| Contrarrazões à Apelação | `references/vvd_contrarrazoes_apelacao.md` | Resposta às razões de apelação do MP |
| Contrarrazões a RESE | `references/vvd_contrarrazoes_rese.md` | Resposta a RESE em VVD |
| Contrarrazões a Embargos | `references/vvd_contrarrazoes_embargos_declaracao.md` | Resposta aos embargos |
| Revogação de MPU | `references/vvd_requerimento_revogacao_mpu.md` | Petição para revogar medida protetiva |
| Atualização de Endereço | `references/rq_atualizacao_endereco_vvd.md` | Atualizar endereço processual |
| Cota de Juntada de Áudios | `references/vvd_cota_juntada_audios.md` | Juntar mídias audiovisuais |

### Relatórios de Análise Estratégica (.md → .docx)

| Tipo de Análise | Arquivo de Referência | Quando Usar |
|---|---|---|
| Análise para Audiência | `references/vvd_analise_para_audiencia.md` | Dossiê estratégico completo pré-audiência — **VERSÃO APRIMORADA** com painel de depoentes, tabela comparativa, perguntas estratégicas e avaliação de risco |
| Análise para Justificação | `references/vvd_analise_audiencia_justificacao.md` | Análise focada em audiência de justificação de MPU |
| Análise para RA | `references/vvd_analise_para_ra.md` | Análise para estruturar resposta à acusação |

---

## Particularidades da VVD (Lei Maria da Penha)

- **Juízo**: "VARA DA JUSTIÇA PELA PAZ EM CASA" (quando aplicável)
- **Qualificação**: Defensoria Pública do Estado da Bahia, com dispensa de mandato e prerrogativas funcionais (arts. 396 e 396-A do CPP)
- **Contexto de Violência**: Considerar vulnerabilidade, ciclo de violência, trauma — SEM minimizar a violência, mas garantindo presunção de inocência
- **Teses Frequentes**: Enunciado 50 do FONAVID (autonomia da vítima), Convenção de Belém do Pará, retratação (art. 16 Lei 11.340/06)
- **Medidas Protetivas**: Atenção a revogação, atualização e desvio de finalidade da MPU
- **Desvio de Finalidade da MPU**: Quando a medida protetiva é instrumentalizada para fins patrimoniais/possessórios — disputa de imóvel, tentativa de afastar o defendido do lar para tomar posse. Argumentar que a MPU tem finalidade protetiva, não patrimonial
- **Contexto Relacional**: Disputas de guarda, pensão, patrimônio como possível motivação para denúncia

### MPU instrumentalizada — playbook quando a ameaça se concretiza

Quando a parte protegida deixa de temer e passa a usar a medida como arma (perseguição, barganha patrimonial, divulgação da medida ou da decisão a terceiros para prejudicar o requerido em outra esfera — trabalho, eleição, cargo de representação), a atuação é uma **PETIÇÃO de notícia de fato novo com pedido urgente**, estruturada assim:

- **Tese**: desvio de finalidade + abuso de direito (art. 187 CC; art. 5º CPC, boa-fé) → revogação (art. 19, §2º, Lei 11.340, revisão a qualquer tempo). A instrumentalização é, ela própria, a prova de que não subsiste o temor que a medida pressupõe.
- **Vire o precedente do MP/juízo**: se a medida foi mantida com apoio no **Tema 1.249/STJ** (a protetiva vigora enquanto persistir o risco e deve ser reavaliada quando concretamente demonstrada a cessação do perigo), use o MESMO Tema para revogar — a conduta ofensiva da "vítima" é a prova concreta da cessação. Reforce com o cumprimento integral pelo requerido (nenhum descumprimento em toda a vigência).
- **Direitos fundamentais (seção própria)**: a MPU não é título de inabilitação moral, política ou profissional. Atinge intimidade/honra/imagem (art. 5º, X), presunção de inocência (art. 5º, LVII) e direitos políticos (suspensão só por condenação transitada — art. 15, III). Fórmula de fecho: "não converter medida de proteção em causa de inelegibilidade e de morte civil, sem condenação e sem trânsito em julgado — é precisamente o que a Constituição veda".
- **Vazamento de decisão / segredo de justiça**: divulgar a terceiros conteúdo de processo sob reserva viola o art. 189 do CPC. A conduta reiterada pode caracterizar, **em tese**, perseguição (147-A), difamação (139), divulgação de segredo (153) e, conforme apuração, constrangimento ilegal/extorsão (146/158). NÃO acusar como promotor: usar "em tese" e pedir a **remessa de cópias ao MP**.
- **Perdas e danos no próprio feito**: a indenização pode ser fixada/liquidada nos próprios autos via **art. 81, caput e §3º, do CPC** (litigância de má-fé) + multa (art. 81) + ato atentatório à dignidade da justiça (art. 77, §2º). Danos amplos (decorrentes do vazamento, dano à imagem) ficam **ressalvados para ação própria** — não cabem no processo de MPU.
- **Ofício esclarecedor a terceiro (urgente)**: quando a medida está sendo usada em processo externo (ex.: impugnação eleitoral), pedir ofício do juízo ao órgão, esclarecendo a natureza cautelar/provisória (não é condenação, antecedente, inelegibilidade ou impedimento ao cargo). Dar à urgência **SEÇÃO PRÓPRIA** (periculum in mora + fumus boni iuris) e pedir expedição **liminar** quando há prazo externo (homologação iminente).
- **Reversão de estratégia anterior**: se um dossiê/peça anterior optou por NÃO expor a medida a terceiros, mas o vazamento já ocorreu, esse fundamento cai — o ofício passa a ser necessário e urgente, e o silêncio do juízo é que passa a prejudicar o requerido.

### Conferência probatória final (anti-inflação) — antes de protocolar

Conferir **cada citação "(Doc. N)" contra o que o documento realmente prova**. Detalhe que o assistido relata, mas que o documento citado não corrobora, deve ser atribuído ao relato ("segundo o requerido"), nunca pinçado como se o Doc o provasse. Citar um documento para algo que ele não mostra desmorona o argumento se o juízo/MP conferir. Complementa a auto-conferência de áudio (anti-alucinação Whisper) da skill `estilo-pecas`.

---

## Formatação e Geração de Documentos

A formatação institucional DPE-BA (margens, fonte Verdana 12pt, espaçamento 1.5, cabeçalho "paz em casa", rodapé, assinatura) está definida na skill **dpe-ba-pecas**. Consulte-a para gerar o .docx.

### Regras
- Sempre usar **python-docx** (não biblioteca npm)
- Data em português por extenso (ex: "10 de março de 2026")
- Nome do arquivo: `[Tipo da Peça] - [Nome do Assistido].docx`
- Para análises: gerar primeiro em Markdown (.md), depois .docx sob demanda
- Salvar na pasta do usuário

---

## Output Estruturado

O output estruturado `_analise_ia.json` é gerenciado pela skill `analise-audiencias` (schema centralizado).

---

## Histórico de aprimoramentos

| Data | Caso | Lição |
|---|---|---|
| 2026-06-09 | Marcos Vinício (MPU 8007061-32.2023, requerido) | **MPU instrumentalizada com ameaça concretizada.** A requerente vazou a decisão sigilosa destes autos à chapa rival, que a usou em impugnação eleitoral para barrar a posse do requerido no CRT-BA. Cristalizou-se o playbook acima: notícia de fato novo + ofício urgente (seção própria de urgência, liminar) + revogação por desvio de finalidade/abuso de direito + remessa ao MP (147-A/139/153/146/158, "em tese") + perdas e danos via art. 81 §3º CPC nos autos (danos amplos ressalvados). **Tema 1.249/STJ virado** (o precedente que manteve a medida passou a sustentar a revogação). **Direitos fundamentais** (art. 5º X/LVII, art. 15 III) ganharam seção. **Anti-inflação**: o "contrato de 20% dos ganhos do cargo" relatado pelo assistido foi atribuído ao relato dele, não ao Doc que só provava barganha de pensão. **Anexos**: processo de 390 pp enxugado para 2 pp essenciais; impugnação de 66 pp para 11 pp; cada PDF dentro do limite do PJe; termo de transcrição de áudios juntado ANTES dos áudios (ver skill `protocolar`). |
| 2026-06-09 | Sandro (MPU 8015695-51.2022, requerido) | **Revisão de MPU por fato novo + imóvel fora do escopo** (detalhe em `references/vvd_requerimento_revogacao_mpu.md`, Caso-Referência 2). Ler a DECISÃO concessiva antes de redigir (o "afastamento do lar" estava INDEFERIDO; vigiam só aproximação 100m + contato + proibir frequentar o endereço). Revisão por fato novo (art. 19 §§2º-3º, *rebus sic stantibus*) modulando **só o item territorial** quando a ofendida deixa o imóvel, mantidas aproximação/contato. Prova de não-residência por **certidão de OJ de processo cível diverso** (afasta "perseguição") + **colar a imagem da certidão** + pedir nova constatação/inspeção (art. 481 CPC). Imóvel **fora do escopo** (não nominado + além do raio) com mapa embutido → reconhecimento de que o acesso não viola a MPU. Função social/dever de conservar (CF 5º XXII-XXIII e 182§2; Estatuto da Cidade; CC 1.228/1.276/1.314). **NÃO conceder titularidade contra a vontade do assistido** (nunca "bem comum/50%"; art. 1.314 só em hipótese). Anexos seletivos (excluir página que sustenta a tese contrária). Vara "Justiça pela Paz em Casa"; peça + anexos em 1-Protocolar. |
