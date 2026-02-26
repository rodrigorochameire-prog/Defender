# Feature: Tribunal do Juri

## Contexto
Sistema especializado para gestao de sessoes do Tribunal do Juri. Inclui cockpit de sessao, avaliacao de jurados, controle de provas, teses de defesa, investigacao e historico de julgamentos.

## Arquitetura

### Arquivos
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/trpc/routers/juri.ts` | 270 | Router tRPC (sessoes, quesitos) |
| `src/lib/trpc/routers/casos.ts` | 1.391 | Router de casos (base para Juri) |
| `src/lib/trpc/routers/teses.ts` | 204 | Router CRUD de teses de defesa |
| `src/components/juri/jurados-monitor.tsx` | 678 | Monitor de jurados em tempo real |
| `src/components/juri/juri-tabs-view.tsx` | 280 | Navegacao por abas do Juri |

### Paginas (10 sub-paginas, ~8.362 linhas total)
| Pagina | Linhas | Funcao |
|--------|--------|--------|
| `juri/page.tsx` | 519 | Dashboard principal do Juri |
| `juri/cockpit/page.tsx` | 2.428 | Cockpit de sessao (maior pagina) |
| `juri/jurados/page.tsx` | 1.990 | Gestao e avaliacao de jurados |
| `juri/avaliacao/page.tsx` | 1.880 | Avaliacao pos-sessao |
| `juri/investigacao/page.tsx` | 444 | Painel de investigacao |
| `juri/laboratorio/page.tsx` | 322 | Laboratorio de teses |
| `juri/provas/page.tsx` | 201 | Gestao de provas |
| `juri/teses/page.tsx` | 191 | Teses de defesa |
| `juri/nova/page.tsx` | 184 | Nova sessao de Juri |
| `juri/historico/page.tsx` | 131 | Historico de julgamentos |
| `juri/[id]/page.tsx` | 72 | Detalhes de sessao |

## Funcionalidades

### Cockpit de Sessao (2.428 linhas)
- Controle em tempo real da sessao do Juri
- Gestao de quesitos ao conselho de sentenca
- Cronometro de fases (debate, replica, treplica)
- Votacao e apuracao

### Jurados (1.990 linhas)
- Cadastro e perfil de jurados
- Historico de participacoes
- Avaliacao de perfil (favoravel/desfavoravel)
- Recusas peremptarias e motivadas

### Avaliacao (1.880 linhas)
- Analise pos-julgamento
- Metricas de performance
- Comparativo com historico

### Investigacao (444 linhas)
- Painel estilo "quadro de investigacao"
- Conexoes entre pessoas e fatos
- Timeline de eventos

### Laboratorio de Teses (322 linhas)
- Experimentacao com teses de defesa
- Analise de viabilidade

## Modelo de Dados
- Usa tabela `casos` como base (1.391 linhas router)
- Tabela `teses` (CRUD completo, 204 linhas router)
- Sessoes, quesitos, jurados via router juri

## Integracao
- Demandas com atribuicao "Tribunal do Juri" alimentam este modulo
- PJe parser detecta tipo "Juri" automaticamente
- Drive sincroniza documentos do caso
- Calculadora de prazos reconhece atos especificos do Juri

## Melhorias Futuras
- [ ] Cockpit mobile para uso em plenario
- [ ] Analytics de jurados com ML
- [ ] Compartilhamento de perfis entre comarcas
