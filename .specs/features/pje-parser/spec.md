# Feature: PJe Parser

## Contexto
Parser de intimacoes copy-paste do PJe (Processo Judicial Eletronico) e SEEU (Sistema Eletronico de Execucao Unificada). Permite ao defensor copiar texto do painel do PJe e importar automaticamente como demandas no OMBUDS.

## Arquitetura

### Arquivos
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/pje-parser.ts` | 1.527 | Parser principal, SEEU, VVD, dedup, utilidades |
| `src/components/demandas-premium/pje-import-modal.tsx` | 894 | Modal de importacao 3 etapas |
| `src/components/agenda/pje-agenda-import-modal.tsx` | 1.007 | Parser de pautas/agenda (separado) |
| `src/lib/trpc/routers/vvd.ts` | 662 | Mutation importarIntimacoesPJe |

### Interfaces Exportadas (6)
- `IntimacaoPJeSimples` — Dados basicos de uma intimacao
- `ResultadoParser` — Resultado com intimacoes + metadados
- `ResultadoParserVVD` — Extensao com separacao MPU/Gerais
- `ResultadoVerificacaoDuplicatas` — Resultado de checagem contra demandas existentes
- `IntimacaoSEEU` — Formato estendido para Execucao Penal
- `ResultadoParserSEEU` — Resultado do parser SEEU

### Funcoes Exportadas (21)
**Parsing (5):** parsePJeIntimacoes, parsePJeIntimacoesCompleto, parsePJeIntimacoesVVD, parseSEEUIntimacoes, parseIntimacoesUnificado
**Utilidades (6):** detectarAtribuicao, toTitleCase, calcularPrazoDefensoria, converterDataParaISO, gerarProvidencias, intimacaoToDemanda
**Dedup (4):** verificarDuplicatas, normalizarNome, calcularSimilaridade, calcularDistanciaLevenshtein
**VVD (2):** separarIntimacoesVVD, formatarResumoComDuplicatas
**SEEU (3):** intimacaoSEEUToDemanda, isSEEU, extrairDadosBlocoSEEU
**Formatacao (2):** formatarResumoImportacao, formatarResumoComDuplicatas

## Parsers

### 1. Parser Principal (parsePJeIntimacoesCompleto)
Pipeline:
1. Pre-processing: remover paginacao, normalizar whitespace
2. Filtrar linhas de ruido (77 prefixos + regex)
3. Loop por linha: extrair documento, data expedicao, prazo, tipo processo, partes
4. Dedup: chave dupla (processo+data, processo+assistido)
5. Fallback: se 0 resultados, chamar parser legado

### 2. Parser Legado (parsePJeIntimacoesLegado)
- Aceita apenas nomes em MAIUSCULAS
- 72 palavras excluidas
- Formato simplificado para Juri

### 3. Parser SEEU (parseSEEUIntimacoes)
- Detecta sistema automaticamente (isSEEU)
- Extrai blocos por processo CNJ
- Campos especificos: Seq, classeProcessual, assuntoPrincipal, preAnalise
- Suporta abas Manifestacao e Ciencia

### 4. Parser VVD (parsePJeIntimacoesVVD)
- Wrapper que separa MPUMPCrim (Medidas Protetivas) das demais
- MPUs vao para pagina especial, gerais para demandas

## Deteccao de Ruido
- **77 prefixos** de ruido (UI, navegacao, weekdays, VVD labels)
- **Regex extra**: paginacao, contadores, simbolos de navegacao
- **Protecao**: nunca filtra linhas com data de expedicao ou ID de documento

## Tipos Suportados
- **8 tipos de documento**: Intimacao, Sentenca, Decisao, Despacho, Certidao, Ato Ordinatorio, Termo, Edital
- **12 tipos de processo**: MPUMPCrim, APOrd, APSum, APri, PetCrim, AuPrFl, Juri, InsanAc, LibProv, EP, VD, APFD
- **3 tipos de expedicao**: Expedicao eletronica, Diario Eletronico, Edital
- **7 atribuicoes detectaveis**: Violencia Domestica, Juri, Execucao Penal, Criminal, Infancia, Familia, Civel, Fazenda Publica

## Deduplicacao

### Nivel 1: Durante parsing
Set `processados` com chave `processo-data` (sem hora)

### Nivel 2: Post-processing
Map `dedupSeen` com chave dupla:
- Primaria: `processo-data`
- Secundaria: `processo-assistido` (lowercase)
Mantem copia com mais campos preenchidos

### Nivel 3: Verificacao contra demandas existentes
- Por ID documento PJe (mais confiavel)
- Por processo + data de expedicao
- Por similaridade Levenshtein >85% (fallback)

## Fluxo de Dados
```
Texto copiado do PJe
  -> parsePJeIntimacoesCompleto() [pre-processing + regex + dedup]
  -> verificarDuplicatas() [checa contra demandas existentes]
  -> separarIntimacoesVVD() [se VVD: MPU vs Gerais]
  -> Modal UI exibe resultados
  -> Usuario confirma importacao
  -> intimacaoToDemanda() [conversao para formato demanda]
  -> tRPC mutation (importarDemandas ou vvd.importarIntimacoesPJe)
  -> DB: cria assistidos + processos + demandas
```

## Melhorias Futuras (v2)
- [ ] Testes unitarios para cada parser
- [ ] Parser para "Painel do Defensor" com 100+ resultados
- [ ] Cache de resultados de parsing
- [ ] Suporte a intimacoes do TJBA (formato diferente)
