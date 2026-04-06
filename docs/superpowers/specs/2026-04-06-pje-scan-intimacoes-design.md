# PJe Scan Intimações — Escaneamento Automático

**Data**: 2026-04-06
**Tipo**: Botão no modal de importação do OMBUDS (Phase B direto)

## Problema

O texto colado do PJe só contém a lista de intimações (tipo, processo, data, partes). Não traz o conteúdo — o defensor precisa abrir cada processo manualmente para entender a pendência.

## Arquitetura

```
Modal OMBUDS (Vercel)
  → tRPC mutation scanIntimacoessPje
    → Next.js API
      → Enrichment Engine (FastAPI local)
        → Chrome CDP (localhost:9222, PJe já logado)
          → Para cada processo:
            1. Navega ao processo
            2. Lê conteúdo da intimação/decisão
            3. Baixa PDF dos autos
            4. Upload Drive (pasta do assistido)
            5. Retorna: ato, providências, audiência
```

O Chrome já está aberto com PJe logado (o usuário acabou de copiar as intimações de lá).

## Componentes

### 1. Enrichment Engine — Novo endpoint

**Arquivo**: `enrichment-engine/routers/pje_scan.py`

**Endpoint**: `POST /pje/scan-intimacoes`

**Input**:
```json
{
  "intimacoes": [
    {
      "numero_processo": "8003490-82.2025.8.05.0039",
      "assistido_nome": "George Ferreira dos Santos",
      "atribuicao": "Violência Doméstica",
      "id_documento": "63261696"
    }
  ],
  "drive_base_path": "/Users/.../Meu Drive/1 - Defensoria 9ª DP"
}
```

**Para cada intimação**:

1. **Navegar ao processo no PJe**
   - URL: `https://pje.tjba.jus.br/pje/ConsultaProcesso/listView.seam` → busca por número
   - Ou navegar direto: link do processo se disponível
   - Usar CDP connection existente (`pje_cdp_url` em config)

2. **Ler conteúdo da intimação**
   - Localizar documento mais recente endereçado à DPE
   - Extrair texto da decisão/despacho (innerText do iframe)
   - Se houver `id_documento`, ir direto a ele

3. **Identificar ato e gerar providências**
   - Usar Gemini Flash (já configurado no enrichment engine) para analisar o texto
   - Prompt: "Dado o conteúdo desta intimação, identifique: (1) qual ato processual a Defensoria deve praticar, (2) resumo de 2-3 frases do que foi intimada para e contexto do processo"
   - Retornar: `ato`, `providencias`, `audiencia_data`, `audiencia_hora`, `audiencia_tipo`

4. **Baixar PDF**
   - Usar estratégia expect_download existente
   - Salvar temporariamente

5. **Upload Drive**
   - Pasta: `Processos - {atribuição_pasta}/{assistido_nome}/`
   - Criar pasta se não existir
   - Nome: `{numero_processo}-processo.pdf`
   - Mover arquivo baixado para a pasta

**Output** (por intimação):
```json
{
  "numero_processo": "8003490-82.2025.8.05.0039",
  "status": "success",
  "ato_sugerido": "Resposta à Acusação",
  "ato_confianca": "high",
  "providencias": "Intimado para apresentar Resposta à Acusação no prazo de 10 dias (art. 396 CPP). Processo de ameaça (art. 147 CP) em contexto de VD.",
  "audiencia": null,
  "pdf_path": "/Meu Drive/.../George Ferreira dos Santos/8003490-82.2025.8.05.0039-processo.pdf",
  "conteudo_resumo": "Despacho determinando intimação da DPE para RA..."
}
```

**Output** (erro):
```json
{
  "numero_processo": "...",
  "status": "error",
  "error": "Processo não encontrado no PJe"
}
```

### 2. Enrichment Client — Novo método

**Arquivo**: `src/lib/services/enrichment-client.ts`

Adicionar método `scanIntimacoePje()` que faz POST para `/pje/scan-intimacoes`.

### 3. tRPC Router — Novo mutation

**Arquivo**: `src/server/routers/enrichment.ts` (ou novo `pje-scan.ts`)

Mutation `scanIntimacoessPje`:
- Input: lista de intimações selecionadas do modal
- Chama enrichment client
- Retorna resultados

### 4. Modal UI — Botão + Progress

**Arquivo**: `src/components/demandas-premium/pje-import-modal.tsx`

Na etapa de revisão:

- **Botão "Escanear"** na barra de filtros (ao lado dos bulk actions)
  - Ícone: `ScanSearch` (Lucide)
  - Estilo: `bg-blue-50 text-blue-600 border border-blue-200`
  - Click: dispara scan para todas as intimações selecionadas (não excluídas) que têm ato vazio
  - Ou: scan individual por row (ícone de scan em cada card)

- **Progress**:
  - Contador: "Escaneando 3/38..."
  - Cada row atualiza conforme resultado chega
  - Row que está sendo escaneada: borda pulsante ou spinner
  - Row concluída: ato preenchido + providências preenchidas

- **Botão individual por row**:
  - Ícone `ScanSearch` pequeno ao lado do ato (quando ato está vazio)
  - Click: escaneia só aquele processo

### 5. Mapeamento atribuição → pasta Drive

```typescript
const PASTA_ATRIBUICAO: Record<string, string> = {
  "Violência Doméstica": "Processos - VVD (Criminal)",
  "Júri": "Processos - Júri",
  "Execução Penal": "Processos - Execução Penal",
  "Criminal": "Processos - Criminal",
};
```

## Fluxo do Usuário

1. Cola intimações no modal → revisa
2. Clica **"Escanear"** (ou "Escanear vazios")
3. Modal mostra progress: "Escaneando 1/38... George Ferreira"
4. Conforme cada processo é escaneado:
   - Ato é preenchido automaticamente
   - Providências são preenchidas com resumo
   - PDF é baixado e salvo no Drive
   - Card row atualiza visualmente (spinner → check)
5. Ao final: "Scan completo. 35 OK, 3 erros"
6. Usuário ajusta o que precisar e importa

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `enrichment-engine/routers/pje_scan.py` | **Novo** — endpoint de scan |
| `enrichment-engine/main.py` | Registrar novo router |
| `src/lib/services/enrichment-client.ts` | Novo método `scanIntimacoePje` |
| `src/server/routers/enrichment.ts` | Novo mutation tRPC |
| `src/components/demandas-premium/pje-import-modal.tsx` | Botão scan + progress |
| `src/components/demandas-premium/pje-review-table.tsx` | Botão scan individual por row |

## Dependências

- Enrichment Engine rodando localmente (`localhost:8000`)
- Chrome com PJe logado (`localhost:9222` via CDP)
- Google Drive montado (`Meu Drive/`)
- Gemini API key configurada (para análise de conteúdo)
