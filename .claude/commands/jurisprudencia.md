# /jurisprudencia — Pesquisa de Jurisprudência

Busca jurisprudência real nos tribunais superiores brasileiros usando WebSearch.
Retorna ementas verificáveis com links diretos para as decisões.

## Uso

/jurisprudencia <tema>

Exemplos:
- /jurisprudencia legítima defesa putativa
- /jurisprudencia tráfico privilegiado art 33 §4
- /jurisprudencia feminicídio tentado desclassificação

## Instruções

Ao receber o tema "$ARGUMENTS":

1. Faça 3 buscas web em paralelo:
   - WebSearch: "site:stf.jus.br jurisprudencia $ARGUMENTS"
   - WebSearch: "site:stj.jus.br jurisprudencia $ARGUMENTS"
   - WebSearch: "súmula $ARGUMENTS STF OR STJ"

2. Para os top 3 resultados relevantes de cada tribunal, extraia:
   - Número do processo (HC, REsp, AgRg, ARE, etc.)
   - Relator
   - Órgão julgador (Turma/Plenário)
   - Data do julgamento
   - Ementa (resumida se muito longa)
   - Link direto

3. Formate a saída assim:

## Jurisprudência: "{tema}"

### STF ({N} resultados)
1. {TIPO} {NUMERO}/{UF} — Rel. Min. {NOME} — {ÓRGÃO} — j. {DATA}
   EMENTA: {texto}
   Fonte: {link}

### STJ ({N} resultados)
1. {TIPO} {NUMERO}/{UF} — Rel. Min. {NOME} — {TURMA} — j. {DATA}
   EMENTA: {texto}
   Fonte: {link}

### Súmulas aplicáveis
- Súmula {N}/{TRIBUNAL}: "{enunciado}"

4. Se não encontrar resultados para um tribunal, diga honestamente:
   "Nenhum resultado encontrado no {tribunal} para este tema."

5. NUNCA invente jurisprudência. Se não encontrou, não cite.

6. Complemente com a tool `consultar_datajud` se o usuário pedir processos específicos
   (movimentações, classe processual, assuntos).
