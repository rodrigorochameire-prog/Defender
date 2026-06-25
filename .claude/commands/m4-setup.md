# /m4-setup — Configurar o Mac mini M4 (host do daemon) no plano Claude Max

Diagnostica e configura a máquina do daemon para rodar análises do OMBUDS
**exclusivamente pela conta Claude Max** (`claude -p`), sem custo de API.

## Gatilho (linguagem natural)

Acione esta skill SEMPRE que o usuário, **na sessão rodando no Mac mini M4**,
disser algo como: "configura o M4", "configurar o mac mini", "prepara o daemon",
"deixa o daemon funcional", "faz as configurações necessárias nessa máquina",
"o M4 precisa configurar", "ativa o host do daemon", "bootstrap do M4",
"deixa o Claude Code Max funcional aqui".

## Ação automática

Ao ser acionada, **execute imediatamente** (não só descreva):

```bash
node scripts/m4-bootstrap.mjs --fix
```

Depois, **leia a saída e aja**:
- Se "login Max FALHOU" → instrua o usuário a rodar `claude` e fazer `/login` na
  conta Max, e ofereça reexecutar `--fix` em seguida.
- Se houver "chaves de API paga no ambiente" → oriente remover
  `ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/`OPENAI_API_KEY` do `.env`/shell do M4.
- Se tudo verde (login Max OK + daemon + launchd) → confirme que a máquina está
  pronta e que o batch de análise pode ser re-enfileirado
  (`scripts/enqueue-analise-orfaos.mjs`).

> Fora do host (ex.: o M1 de dev) o `--fix` apenas reporta — não marca o host
> nem mexe em launchd a não ser que seja realmente a máquina do daemon.

## Quando usar

- Primeira configuração do Mac mini M4 (host do daemon).
- Quando análises do daemon falham (ex.: `Process exited with code 1`).
- Para checar se o login Max está válido e o daemon está rodando.

## Como funciona

O script `scripts/m4-bootstrap.mjs`:

1. Identifica a máquina e se ela é o **host do daemon** (marcador
   `~/.ombuds-daemon-host` ou `OMBUDS_ROLE=daemon`).
2. Verifica o `claude` CLI.
3. Sinaliza **chaves de API paga** no ambiente (risco de cobrança).
4. **Testa o login Max de verdade**: roda `claude -p` com as chaves pagas
   removidas — se responder, o plano Max está funcional na máquina.
5. Checa se o daemon está em execução e se há serviço `launchd`.
6. Com `--fix`: marca o host, instala/atualiza o `launchd`
   (`com.ombuds.daemon`, com `DAEMON_STRICT_NO_API=true`) e o carrega.

> Após o `--fix` inicial, o hook `SessionStart` (em `.claude/settings.json`)
> mantém o host saudável a cada abertura do Claude Code **apenas nessa
> máquina** — no M1 de dev o modo `--session` sai em silêncio.

## Passos

```bash
# 1. Diagnóstico (qualquer máquina)
node scripts/m4-bootstrap.mjs

# 2. No Mac mini M4, primeira configuração (marca o host + instala launchd)
node scripts/m4-bootstrap.mjs --fix

# 3. Se o teste de login Max falhar, autentique a conta Max e repita o --fix:
claude            # rode interativo → /login (conta Max, NÃO API key)
```

## Regra de ouro

Nunca deixe `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` no
ambiente do daemon. O daemon já as remove do `claude -p` (firewall de custo em
`scripts/claude-code-daemon.mjs`) e o app bloqueia chamadas pagas
(`paid-api-guard.ts`), mas o ideal é não tê-las no `.env`/shell do M4.
