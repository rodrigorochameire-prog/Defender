# Story TD.5: Restringir CORS do Enrichment Engine

## Status: Draft

## Descricao

Como desenvolvedor do OMBUDS, eu quero que o CORS do enrichment engine (FastAPI) seja restrito ao dominio da aplicacao Vercel, para que apenas o frontend autorizado possa fazer requisicoes a API Python, bloqueando acesso de origens maliciosas.

## Contexto

O enrichment engine (FastAPI/Python no Railway) esta configurado com `allow_origins=["*"]` (SYS-006), permitindo que QUALQUER site na internet faca requisicoes a API. Combinado com uma API key unica e sem rate limiting efetivo, isso expoe os endpoints de AI (classificacao, extracao, transcricao) a abuso externo, consumo nao autorizado de creditos de API (OpenAI, etc.) e potencial exfiltracao de dados.

**Severidade:** HIGH
**Debito:** SYS-006

## Criterios de Aceitacao

- [ ] CORS configurado para permitir APENAS o(s) dominio(s) da aplicacao Vercel (ex: `https://ombuds.vercel.app`, dominio customizado se houver)
- [ ] Requisicoes de origens nao autorizadas sao bloqueadas com erro CORS
- [ ] Ambiente de desenvolvimento (`localhost:3000`) tambem permitido (via env var ou condicional)
- [ ] Nenhuma funcionalidade existente quebrada — frontend continua se comunicando normalmente com a API

## Tarefas Tecnicas

- [ ] 1. Localizar a configuracao de CORS no enrichment engine (FastAPI `main.py` ou equivalente)
- [ ] 2. Substituir `allow_origins=["*"]` por lista explicita de dominios autorizados
- [ ] 3. Ler dominios de variavel de ambiente `ALLOWED_ORIGINS` para flexibilidade
- [ ] 4. Incluir `localhost:3000` apenas quando `ENVIRONMENT=development`
- [ ] 5. Testar requisicao do frontend Vercel — deve funcionar
- [ ] 6. Testar requisicao de origem nao autorizada (ex: curl com header Origin diferente) — deve ser bloqueada
- [ ] 7. Configurar variavel `ALLOWED_ORIGINS` no Railway

## File List

- `enrichment-engine/main.py` (ou arquivo equivalente com config CORS) — restringir origins
- Railway env vars — adicionar `ALLOWED_ORIGINS`

## Estimativa

1 hora

## Dependencias

- Nenhuma dependencia tecnica
- Requer conhecimento do(s) dominio(s) Vercel da aplicacao
- Requer acesso ao Railway para configurar env var

## Notas

- Padrao recomendado para FastAPI:
  ```python
  import os
  allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
  app.add_middleware(
      CORSMiddleware,
      allow_origins=allowed_origins,
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- Se a aplicacao usa multiplos dominios Vercel (preview deployments), considerar usar regex ou wildcard para `*.vercel.app` — mas isso e menos seguro que listar dominios especificos.
- Esta correcao e independente e pode ser feita em paralelo com qualquer outra story da Wave 1.
