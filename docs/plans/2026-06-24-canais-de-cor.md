# Canais de cor — regra do design system

> Origem: refino UI/UX Fase 1, lane F2 (consolidação de criticidade de prazo).
> Status: regra normativa. Travada por teste arquitetural (`__tests__/lib/prazo.test.ts`)
> e, a partir de F7, por lint.

## A regra

Em qualquer superfície do OMBUDS, **cor carrega no máximo um significado por canal**.
Existem dois canais semânticos independentes — e eles **nunca compartilham o mesmo
veículo visual**:

| Canal | Significa | Veículo visual | Fonte única |
|-------|-----------|----------------|-------------|
| **ATRIBUIÇÃO** | *Identidade* (de quem é / qual área) | borda lateral, ícone de atribuição, tag de área | `src/lib/config/atribuicoes.ts` (+ `tipologia/`) |
| **SEVERIDADE** | *Urgência* (quão perto do limite) | badge de prazo, fundo crítico, realce de alerta | `src/lib/prazo.ts` |

Ou seja:

- A **cor da borda/ícone/tag** de um card responde só à pergunta *"qual atribuição?"*
  (Execução Penal = azul, Júri = vermelho-tijolo, VVD = roxo, …). Ela **não** muda
  porque o prazo está vencido.
- A **cor do badge de prazo / do fundo de alerta** responde só à pergunta
  *"quão urgente?"* (vencido = vermelho, ≤3d = âmbar, …). Ela **não** muda porque a
  atribuição é tal.

Quando os dois canais coincidiriam na mesma cor (ex.: atribuição vermelha + prazo
vencido vermelho), eles continuam separados por **veículo**: a borda fica na cor da
atribuição; a urgência aparece no badge/fundo. O olho lê duas informações, não uma
ambígua.

## Severidade — escala canônica e configs de domínio

A criticidade de prazo vem **sempre** de `@/lib/prazo`. Há uma escala padrão (litígio)
e configs por domínio — porque um prazo processual e o monitoramento de uma MPU têm
janelas legitimamente diferentes. O que **não** pode existir é cada tela inventar a sua.

| Escala | Uso | Buckets (dias → cor) |
|--------|-----|----------------------|
| `ESCALA_LITIGIO` (default) | Prazos processuais (Demandas, Prazos, Assistidos) | `<0` red · `0` red · `1–3` amber · `4–7` green · `8+` gray |
| `ESCALA_MPU` | Monitoramento de medida protetiva (VVD/MPU) | `<0` red · `≤7` red · `≤30` amber · `31+` green |
| `ESCALA_INTIMACAO` | Prazo de manifestação de intimação | `<0` red · `≤2` red · `≤5` amber · `6+` green |

> Um prazo de MPU a **280 dias** no futuro é **verde** — baixa urgência. Isso é
> correto, não incoerente: severidade mede distância ao limite, não importância.

### API

```ts
import { prazoSeveridade, calcularPrazo, ESCALA_MPU } from "@/lib/prazo";

// a partir de um número de dias (puro):
prazoSeveridade(-141);              // { nivel: "vencido", cor: "red", dias: -141 }
prazoSeveridade(5);                 // { nivel: "tranquilo", cor: "green", dias: 5 }
prazoSeveridade(5, ESCALA_MPU);     // { nivel: "vencido"?... } → red (≤7 na MPU)

// a partir de uma string "dd/mm/aaaa" ou ISO:
calcularPrazo("31/12/2026");        // { nivel, cor, dias } | null
```

`nivel ∈ {vencido, critico, alerta, tranquilo}`, `cor ∈ {red, amber, green, gray}`.
A camada de UI traduz `cor`/`nivel` para classes Tailwind próprias da superfície — o
módulo é framework-agnóstico (sem React/Tailwind).

## O que isto eliminou

Antes da F2 conviviam ~7 implementações ad-hoc de criticidade de prazo, cada uma com
seus próprios thresholds e cores (algumas rose-outline, demandas com bucket `yellow`
extra, VVD com escalas próprias soltas). Um mesmo prazo vencido podia aparecer âmbar
numa tela e vermelho noutra. Agora todas consomem `@/lib/prazo`; as diferenças que
sobrevivem são **de domínio** (config explícita), não acidentais.

## Para quem for adicionar uma lista nova

1. Importe `calcularPrazo`/`prazoSeveridade` de `@/lib/prazo`. Não recalcule dias→cor.
2. Escolha a escala de domínio certa (ou a default de litígio).
3. Use a `cor` retornada para o **badge/fundo de urgência** — nunca para a borda/ícone,
   que pertencem ao canal de atribuição.
4. Ordene por severidade decrescente quando a lista for de prazos.
