# /coding-guidelines - Diretrizes de Código

> **Tipo**: Regras Comportamentais
> **Fonte**: Karpathy Guidelines (Tech Leads Club)
> **Aplicação**: Sempre que escrever, modificar ou revisar código

## Descrição

Diretrizes comportamentais para reduzir erros comuns em código gerado por LLMs. Estes princípios priorizam cautela sobre velocidade.

---

## 1. Pense Antes de Codar

**Não assuma. Não esconda confusão. Exponha trade-offs.**

Antes de implementar:

- Declare suposições explicitamente. Se incerto, pergunte.
- Se existem múltiplas interpretações, apresente-as - não escolha silenciosamente.
- Se existe uma abordagem mais simples, diga. Questione quando necessário.
- Se algo não está claro, pare. Nomeie a confusão. Pergunte.
- Discorde honestamente. Se a abordagem parece errada, diga - não seja bajulador.

---

## 2. Simplicidade Primeiro

**Código mínimo que resolve o problema. Nada especulativo.**

- Nenhum recurso além do solicitado.
- Nenhuma abstração para código de uso único.
- Nenhuma "flexibilidade" ou "configurabilidade" não solicitada.
- Nenhum tratamento de erro para cenários impossíveis.
- Se você escrever 200 linhas e poderia ser 50, reescreva.

**Pergunta-chave:** "Um engenheiro sênior diria que isso está complicado demais?" Se sim, simplifique.

---

## 3. Mudanças Cirúrgicas

**Toque apenas no necessário. Limpe apenas sua própria bagunça.**

Ao editar código existente:

- NÃO "melhore" código adjacente, comentários ou formatação.
- NÃO refatore coisas que não estão quebradas.
- Corresponda ao estilo existente, mesmo se faria diferente.
- Se notar código morto não relacionado, mencione - não delete.

Quando suas mudanças criam órfãos:

- Remova imports/variáveis/funções que SUAS mudanças tornaram não utilizados.
- NÃO remova código morto pré-existente a menos que solicitado.

**Teste:** Cada linha alterada deve rastrear diretamente ao pedido do usuário.

---

## 4. Execução Orientada a Objetivos

**Defina critérios de sucesso. Itere até verificar.**

Transforme tarefas em objetivos verificáveis:

- "Adicionar validação" → "Escrever testes para inputs inválidos, depois fazê-los passar"
- "Corrigir o bug" → "Escrever teste que reproduz, depois fazê-lo passar"
- "Refatorar X" → "Garantir que testes passam antes e depois"

Para tarefas multi-etapas, declare um plano breve:

```
1. [Etapa] → verificar: [check]
2. [Etapa] → verificar: [check]
3. [Etapa] → verificar: [check]
```

Critérios de sucesso fortes permitem iterar independentemente. Critérios fracos ("fazer funcionar") requerem clarificação constante.

---

## Aplicação no OMBUDS

### Padrões Obrigatórios

```typescript
// ✅ CORRETO - Código mínimo e direto
export async function getAssistido(id: number) {
  return await db.query.assistidos.findFirst({
    where: eq(assistidos.id, id),
  });
}

// ❌ ERRADO - Over-engineering
export async function getAssistido(
  id: number,
  options?: {
    includeRelations?: boolean;
    cache?: boolean;
    timeout?: number;
  }
) {
  // Opções desnecessárias não solicitadas
}
```

### Mudanças Cirúrgicas

```typescript
// Se pedido: "adicionar campo telefone ao form"

// ✅ CORRETO - Apenas o campo pedido
<Input name="telefone" label="Telefone" />

// ❌ ERRADO - "Melhorias" não solicitadas
<Input name="telefone" label="Telefone" />
<Input name="celular" label="Celular" />  // Não pedido
<Input name="whatsapp" label="WhatsApp" /> // Não pedido
```

### Critérios de Sucesso

Antes de cada tarefa, defina:

```markdown
## Tarefa: Adicionar filtro por status

### Critérios de Sucesso:
1. [ ] Select com opções de status visível
2. [ ] Query filtra corretamente por status
3. [ ] URL mantém estado do filtro
4. [ ] TypeScript compila sem erros
5. [ ] Testes existentes continuam passando
```

---

## Checklist Rápido

Antes de submeter código:

- [ ] Cada mudança está diretamente ligada ao pedido?
- [ ] Existe código que poderia ser removido sem afetar a funcionalidade?
- [ ] O estilo corresponde ao código adjacente?
- [ ] Evitei "melhorar" código não relacionado?
- [ ] Os critérios de sucesso estão definidos e verificados?
