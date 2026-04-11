---
name: dev-server
description: Gerencia o servidor de desenvolvimento Next.js do projeto OMBUDS/Defender. Use quando o usuário relatar "internal server error", "não abre em local", "servidor travou", "localhost não responde", "erro 500", "página não carrega", ou qualquer sinal de que o dev server está com problema. Também use proativamente antes de abrir o browser, para garantir que o servidor está limpo e rodando.
---

# Dev Server — OMBUDS/Defender

## Diagnóstico rápido

```bash
# 1. Verificar se há processo rodando
lsof -i :3000 | head -5

# 2. Checar status HTTP
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/dashboard
```

- HTTP **200** → servidor OK, problema pode ser de cache no browser → instruir Cmd+Shift+R
- HTTP **500** ou sem resposta → servidor travado → executar Reinicialização Limpa abaixo

## Reinicialização Limpa (receita padrão)

**IMPORTANTE**: NÃO usar `npm run dev` — ele usa `--turbopack` que TRAVA na compilação. Usar `npx next dev` diretamente.

```bash
# Matar TODOS os processos next dev e node na porta 3000/3002
pkill -9 -f "next" 2>/dev/null
kill $(lsof -ti :3000) 2>/dev/null
kill $(lsof -ti :3002) 2>/dev/null
sleep 1

# Verificar AUTH_SECRET
grep "^AUTH_SECRET" .env.local || echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local

# Subir SEM TURBOPACK em background
npx next dev --port 3000 > /tmp/defender-dev.log 2>&1 &

# Aguardar e confirmar
sleep 4 && tail -15 /tmp/defender-dev.log
```

Confirmar que a saída mostra `✓ Ready` e `localhost:3000` (não 3002).

## Verificação após reinicialização

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/dashboard
```

Deve retornar `200`. Se retornar `500`, verificar logs:

```bash
tail -30 /tmp/defender-dev.log
```

## Abrir no browser

```bash
open -a "Google Chrome" "http://localhost:3000/admin/dashboard"
```

## Causas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Porta 3002 em vez de 3000 | Processo antigo travado na 3000 | Reinicialização Limpa |
| Internal Server Error (500) | Node em estado corrompido | Reinicialização Limpa |
| Página em branco | Cache do browser | Cmd+Shift+R no Chrome |
| "Cannot find module" no log | .next corrompido | `rm -rf .next && npm run dev` |
| Erro de hidratação | Server/Client mismatch no código | Verificar console do browser |
| Trava ao carregar | `--turbopack` no npm run dev | Usar `npx next dev` sem turbopack |
| "Configuração de autenticação" | AUTH_SECRET faltando no .env.local | `echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local` |

## Comportamento proativo

Sempre que for testar algo no browser (`/browser-test`), verificar silenciosamente se o servidor responde com 200 antes de abrir. Se não responder, executar a Reinicialização Limpa sem precisar que o usuário relate o problema.
