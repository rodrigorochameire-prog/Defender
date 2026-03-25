# Story TD.2: Remover ignoreBuildErrors e Corrigir Erros de Tipo

## Status: Draft

## Descricao

Como desenvolvedor do OMBUDS, eu quero remover a flag `ignoreBuildErrors: true` do `next.config.js` e corrigir todos os erros de tipo que surgirem, para que o build do Next.js garanta type safety e erros nao passem despercebidos para producao.

## Contexto

A flag `ignoreBuildErrors: true` em `next.config.js:33` desativa a checagem de tipos durante o build (SYS-001). Isso significa que erros de TypeScript — que normalmente impediriam o deploy — sao silenciosamente ignorados, permitindo que codigo com bugs de tipo chegue a producao. Em um sistema com 340K LOC TypeScript e zero testes automatizados, a type safety do compilador e a unica rede de seguranca existente.

**Severidade:** CRITICAL
**Debito:** SYS-001
**Dependencia futura:** SYS-003 (CI/CD), SYS-005 (remover `any`), UX-002 (Zod client-side)

## Criterios de Aceitacao

- [ ] `ignoreBuildErrors: true` removido de `next.config.js`
- [ ] `npm run build` completa com ZERO erros de tipo
- [ ] `tsc --noEmit` passa sem erros
- [ ] Nenhuma funcionalidade existente quebrada (verificar paginas criticas manualmente)
- [ ] Nenhum uso de `@ts-ignore` ou `@ts-expect-error` introduzido como workaround (exceto casos justificados e documentados)

## Tarefas Tecnicas

- [ ] 1. Rodar `tsc --noEmit` e catalogar todos os erros de tipo existentes
- [ ] 2. Categorizar erros por tipo (missing types, wrong types, implicit any, null checks, etc.)
- [ ] 3. Priorizar correcoes: erros em routers tRPC e paginas criticas primeiro
- [ ] 4. Corrigir erros de tipo — lote por lote, testando build apos cada lote
- [ ] 5. Remover `ignoreBuildErrors: true` de `next.config.js`
- [ ] 6. Rodar `npm run build` e confirmar que completa sem erros
- [ ] 7. Testar paginas criticas no browser: login, dashboard, processos, demandas, juri
- [ ] 8. Documentar quaisquer `@ts-expect-error` residuais com justificativa

## File List

- `next.config.js` — remover `ignoreBuildErrors: true`
- `src/**/*.ts` / `src/**/*.tsx` — correcoes de tipo (multiplos arquivos, quantidade depende dos erros encontrados)

## Estimativa

16-24 horas

## Dependencias

- TD.1 (rotacao de senha) deve ser executada primeiro por urgencia, mas nao ha dependencia tecnica
- Esta story e pre-requisito para TD.7 (CI/CD) — o pipeline so faz sentido se o build passa

## Notas

- Esta e a story mais trabalhosa da Wave 1. O numero exato de erros so sera conhecido apos rodar `tsc --noEmit`.
- Estrategia recomendada: corrigir em lotes de ~20 erros, fazendo build apos cada lote para evitar regressoes.
- NAO usar `any` como escape hatch — isso apenas transfere o debito para SYS-005.
- Se um erro de tipo revelar um bug real (logica incorreta), documentar e corrigir o bug.
- Considerar ativar `strict: true` no `tsconfig.json` como step futuro (nao nesta story).
