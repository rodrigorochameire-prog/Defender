---
name: citacao-depoimentos
description: Diretriz para citação precisa de depoimentos em peças jurídicas da DPE-BA. Define como citar testemunhos de audiências com rigor técnico — identificando quem perguntou (MP, Defesa, Juíza), distinguindo declarações espontâneas de respostas a perguntas, inserindo timestamps da mídia audiovisual e evidenciando consistência quando a mesma pergunta é repetida. Use SEMPRE que for citar trechos de depoimentos ou interrogatórios em qualquer peça processual (alegações finais, memoriais, resposta à acusação, HC, apelação, dossiê estratégico). Também acione quando o usuário mencionar 'citar depoimento', 'transcrição de audiência', 'inserir timestamp', 'mídia audiovisual', 'citação de testemunho', 'referência a depoimento', ou pedir para validar citações de depoimento. Esta skill deve ser consultada por TODAS as skills que geram peças com citações de oitivas (criminal-comum, juri, vvd, execucao-penal, dpe-ba-pecas, analise-audiencias).
---

# Citação de Depoimentos — Padrão DPE-BA

## Princípio orientador

A citação de depoimentos em peça defensiva não é mera transcrição. É argumentação. A forma como se apresenta uma fala — quem perguntou, se foi espontânea, se foi reiterada, em que momento do depoimento ocorreu — carrega peso argumentativo. Uma resposta espontânea tem mais força que uma induzida. Uma afirmação repetida a perguntas de partes diferentes demonstra consistência. A Defesa deve explorar essas nuances com precisão e honestidade.

---

## 1. Identificação de quem perguntou

Sempre que possível, identifique a parte que formulou a pergunta. Isso contextualiza a resposta e, em muitos casos, fortalece o argumento defensivo.

**Partes que podem perguntar:**
- Ministério Público (MP) — "indagada pelo Ministério Público"
- Defesa — "questionada pela Defesa"
- Juiz(a) — "instado(a) pela Juíza" / "indagado(a) pelo Juiz"
- Assistente de acusação — "questionada pelo assistente de acusação"

**Por que isso importa:** Uma testemunha que nega conhecer os defendidos em resposta ao MP demonstra que a própria acusação não obteve confirmação de sua tese. A mesma negativa em resposta à Defesa mostra que a pergunta não é enviesada.

**Formato:**
- ✅ "José Cloves, **questionado pela Defesa**, declarou que..."
- ✅ "Nairane, **indagada pelo Ministério Público**, afirmou que..."
- ❌ "José Cloves declarou que..." (sem indicar quem perguntou)

---

## 2. Espontaneidade vs. resposta a pergunta

Há diferença argumentativa crucial entre uma declaração espontânea (a testemunha ofereceu a informação por iniciativa própria) e uma resposta a uma pergunta direta. A declaração espontânea tem mais força porque não foi induzida.

**Formato para declarações espontâneas:**
- "declarou **espontaneamente** que..."
- "ao relatar os fatos **ao Ministério Público**, declarou espontaneamente que..."

**Formato para respostas a perguntas:**
- "questionado pela Defesa se [conteúdo da pergunta], respondeu que..."
- "indagada pelo Ministério Público, declarou que..."

**Como identificar no transcript:** Se a fala da testemunha aparece em resposta a uma pergunta direta, é resposta. Se aparece no meio de uma narrativa livre (após "conte para a gente o que aconteceu"), é espontânea.

---

## 3. Reiteração e consistência

Quando a mesma pergunta é feita por partes diferentes (MP e Defesa) e obtém a mesma resposta, isso demonstra **consistência** do depoimento. A peça deve explicitar essa repetição.

**Padrão de redação:**
1. Primeira menção: descrever a resposta normalmente
2. Segunda menção: usar "**questionado(a) novamente**", "**reiterou**", "**reafirmou**"
3. Se as perguntas vieram de partes diferentes: especificar ("questionada novamente **pela Defesa**")
4. Contexto temporal: indicar onde no depoimento cada resposta ocorreu ("já ao final do depoimento", "mais adiante", "logo em seguida")

**Exemplo completo:**
> Selma Barboza da Silva relatou que soube por terceiros que "passaram essas criaturas e dispararam" (mídia audiovisual, a partir de 01min35s). **Logo em seguida, indagada pelo Ministério Público**, declarou que não conhece nenhum dos defendidos (mídia audiovisual, a partir de 01min40s). **Questionada novamente pela Defesa, já ao final do depoimento**, se conhecia algum dos dois, **reiterou** de forma enfática: "Não, não conheço nenhum." (mídia audiovisual, a partir de 07min20s)

**Marcadores temporais úteis:**
- "logo em seguida" — para eventos consecutivos no depoimento
- "mais adiante" — para separação temporal dentro do mesmo depoimento
- "já ao final do depoimento" — para perguntas feitas pela última parte a inquirir
- "posteriormente" — para eventos separados por várias perguntas intermediárias

---

## 4. Formato de timestamps

Os timestamps da mídia audiovisual devem ser inseridos em parênteses após cada trecho citado (direto ou indireto).

**Formato padrão:**
- `(mídia audiovisual, a partir de XXminYYs)` — quando a hora é 00h (omitir a hora)
- `(mídia audiovisual, a partir de 01h02min15s)` — quando a hora é diferente de 00h
- `(mídia audiovisual, a partir de XXminYYs do interrogatório)` — para interrogatórios de réus/defendidos (distingue da oitiva de testemunhas)

**Regras:**
- Usar "a partir de" (não "aos") — indica o ponto aproximado de início da fala
- Quando a hora for 00, não indicar hora
- Incluir segundos quando possível estimar com segurança
- Para interrogatórios, adicionar "do interrogatório" para distinguir das oitivas de testemunhas
- O timestamp vai **dentro dos parênteses**, após a indicação de mídia

**Posicionamento:**
- Citação direta: timestamp após o fechamento das aspas — `"Nunca vi na minha vida." (mídia audiovisual, a partir de 06min15s)`
- Citação indireta: timestamp após a paráfrase — `declarou que não conhece nenhum dos defendidos (mídia audiovisual, a partir de 01min40s)`

---

## 5. Como extrair timestamps de transcrições

As transcrições automáticas de audiências costumam ter marcadores de minuto no formato `[00:XX:00]`. Para estimar timestamps com segundos:

1. Localize os dois marcadores de minuto que cercam a fala citada
2. Estime a posição relativa da fala entre os dois marcadores (fração do texto)
3. Calcule os segundos proporcionalmente

**Exemplo:** Se uma fala está aproximadamente no meio do texto entre `[00:04:00]` e `[00:05:00]`, o timestamp estimado é ~04min30s.

**Quando não estimar segundos:** Se a fala está muito próxima de um marcador de minuto ou se não há confiança na estimativa, use apenas minutos (ex: "a partir de 04min").

---

## 6. Citação direta vs. citação indireta

**Citação direta** (entre aspas, em itálico): Usar quando a frase exata da testemunha tem força argumentativa. Manter fidelidade absoluta ao transcript — incluindo coloquialismos, hesitações e erros gramaticais.
- ✅ `"Não, não posso provar que eu nunca vi eles."` (mantém o coloquialismo)
- ❌ `"Não posso provar que nunca os vi."` (corrigiu a gramática — perde autenticidade)

**Citação indireta** (paráfrase sem aspas): Usar para informações contextuais que não exigem a frase exata.
- ✅ "declarou que não conhecia os defendidos e que nunca os havia visto antes"

**Regra:** Se a frase pode ser usada como argumento ("veja, a testemunha disse X"), prefira citação direta. Se é apenas contexto narrativo, citação indireta basta.

---

## 7. Estrutura de um parágrafo de depoimento

O padrão ideal para citar um depoimento em peça defensiva segue esta sequência:

1. **Identificação da testemunha** (nome, relação com os fatos) — em negrito
2. **Contexto da pergunta** (quem perguntou, sobre o quê)
3. **Conteúdo da resposta** (citação direta ou indireta)
4. **Timestamp** (mídia audiovisual)
5. **Se houver reiteração:** nova pergunta por outra parte + reiteração + timestamp

**Modelo:**
> **[Nome]**, [relação com os fatos], [indagado/questionado] [pela parte], [declarou/respondeu] que [citação indireta] (mídia audiovisual, a partir de XXminYYs). [Contexto temporal], [questionado novamente pela outra parte], [reiterou/reafirmou]: "[citação direta]" (mídia audiovisual, a partir de XXminYYs)

---

## 8. Checklist de revisão

Ao revisar citações de depoimento em uma peça:

1. **Quem perguntou?** — Cada citação identifica a parte que formulou a pergunta?
2. **Espontânea ou induzida?** — Declarações voluntárias estão marcadas como "espontaneamente"?
3. **Timestamp presente?** — Toda citação (direta ou indireta relevante) tem timestamp?
4. **Fidelidade ao transcript?** — As aspas reproduzem fielmente a fala? Coloquialismos preservados?
5. **Reiterações evidenciadas?** — Quando a mesma pergunta foi repetida, a peça destaca a consistência?
6. **Contexto temporal claro?** — O leitor entende a sequência cronológica dentro do depoimento?
7. **"Do interrogatório" quando aplicável?** — Timestamps de interrogatórios de réus distinguidos de oitivas?

---

## 9. Notas sobre o contexto da DPE-BA

Na prática da DPE-BA, as audiências criminais são gravadas em mídia audiovisual e os arquivos ficam vinculados ao processo no PJe. A referência a timestamps na peça serve para que o Juízo possa conferir rapidamente o trecho citado — é um recurso de credibilidade e transparência que fortalece a defesa técnica.

Em peças para o Tribunal do Júri, timestamps são especialmente úteis no dossiê estratégico e nas alegações finais, pois permitem à Defesa preparar a sustentação oral com referências precisas.
