# Spec — Demandas: validação de CNJ + debounce na busca (editar/vincular)

> Track C. Spec-driven + TDD. Util puro `src/lib/format/cnj.ts` + hook
> `src/hooks/use-debounced-value.ts`; wiring no campo "Editar / vincular".

## Problema

No campo "Editar / vincular" (sob o nº do processo, `DemandaQuickPreview`):
1. **Sem validação de CNJ** — aceita qualquer texto como número de processo; um dígito
   trocado vira um vínculo silenciosamente errado.
2. **Busca sem debounce** — a query de processos/assistidos dispara a cada tecla.

## Decisão

### CNJ (`src/lib/format/cnj.ts`)
Número unificado do CNJ: `NNNNNNN-DD.AAAA.J.TR.OOOO` (20 dígitos). DV de 2 dígitos
calculado por ISO 7064 MOD 97-10 sobre `seq(7) ano(4) justiça(1) tribunal(2)
origem(4)`.

| Função | Regra |
|---|---|
| `onlyDigits(s)` | remove tudo que não é dígito |
| `computeCnjCheckDigits(d18)` | DV de 2 dígitos a partir dos 18 dígitos sem DV |
| `isValidCnj(input)` | 20 dígitos **e** DV confere |
| `formatCnj(input)` | aplica a máscara (parcial enquanto incompleto) |

### Debounce (`src/hooks/use-debounced-value.ts`)
`useDebouncedValue(value, delayMs)` — só propaga o valor após `delayMs` estável.

## Wiring

- Ao editar o número: `formatCnj` na exibição; se 20 dígitos e `!isValidCnj` →
  `toast.warning` ("DV do CNJ não confere — confira o número"), **sem bloquear** (o
  defensor pode registrar provisório). Se válido, salva normalizado.
- Busca de processos passa pelo `useDebouncedValue` (≈250 ms).

## Aceite

- [ ] testes: número real válido (`2000109-71.2025.8.05.0039`), DV trocado inválido,
      tamanho errado, `formatCnj` parcial e completo, `onlyDigits`.
- [ ] hook testado com fake timers (não propaga antes do delay; propaga depois).
- [ ] wiring sem bloquear entrada; warning apenas informativo.
