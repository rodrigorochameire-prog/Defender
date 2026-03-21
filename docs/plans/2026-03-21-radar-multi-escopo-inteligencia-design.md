# Radar Criminal — Multi-Escopo + Sistema de Inteligência

**Data**: 2026-03-21  
**Status**: Aprovado  

## Objetivo

Expandir o Radar Criminal para cobrir Camaçari (foco operacional), RMS e Salvador
(inteligência comparativa + matching cross-cidade), com UI de alto padrão.

## Modelo de Dados

```sql
ALTER TABLE radar_noticias ADD COLUMN municipio TEXT NOT NULL DEFAULT 'camacari';
CREATE INDEX radar_noticias_municipio_idx ON radar_noticias(municipio);
```

Valores: `'camacari'` | `'rms'` | `'salvador'`

## Feeds RSS Novos

| Escopo | Query | Propósito |
|--------|-------|-----------|
| RMS | simões filho crime | Município vizinho |
| RMS | lauro de freitas preso | Município vizinho |
| Salvador | operação policial salvador | Ops estruturadas |
| Salvador | homicídio salvador | Crimes letais |
| Salvador | baralho do crime salvador | Crime organizado |
| Salvador | feminicídio salvador | VVD cross-cidade |

## Detecção de Município

Lógica no scraper: RMS keywords → `rms`, Salvador keywords → `salvador`, default → `camacari`.

## Estratégia de IA por Escopo

- **Camaçari**: extração completa em batch (status quo)
- **RMS**: extração em batch (volume menor)
- **Salvador**: matching automático + extração apenas on-demand

## UI

- Scope selector: [ Camaçari ] [ RMS ] [ Salvador ] — persistido em localStorage
- Stats bar contextual por escopo
- Intelligence Panel: Top Bairros + Crime Ranking + Comparativo 30d
- Toast com progresso: 4 steps animados
- Cards expandíveis inline (sheet continua disponível)
