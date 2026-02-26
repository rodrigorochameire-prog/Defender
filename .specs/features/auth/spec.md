# Feature: Autenticacao e Usuarios

## Contexto
Sistema de autenticacao com email/senha e OAuth (Google). Suporta convites, roles por funcao, isolamento por workspace/nucleo e configuracoes persistentes por usuario.

## Arquitetura

### Arquivos
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/trpc/routers/auth.ts` | 33 | Router de autenticacao (getSession) |
| `src/lib/trpc/routers/users.ts` | 839 | Router de usuarios (CRUD, convites, perfil) |
| `src/lib/trpc/routers/settings.ts` | 87 | Router de configuracoes do usuario |
| `src/lib/trpc/routers/workspaces.ts` | 119 | Router de workspaces |
| `src/middleware.ts` | ~50 | Protecao de rotas |
| `src/app/(auth)/login/` | ~200 | Pagina de login |
| `src/app/(auth)/register/` | ~300 | Pagina de registro |
| `src/app/(auth)/forgot-password/` | ~150 | Recuperacao de senha |
| `src/app/(auth)/reset-password/` | ~150 | Reset de senha |

### Schema
| Tabela | Funcao |
|--------|--------|
| `users` | Dados do usuario (email, nome, role, funcao, nucleo, oab) |
| `userSettings` | Configuracoes por usuario (JSON key-value) |
| `userInvitations` | Convites pendentes (token 64 chars, 7 dias) |
| `sessions` | Sessoes ativas |
| `workspaces` | Separacao multi-tenant |

## Roles e Funcoes

### Roles
| Role | Acesso |
|------|--------|
| admin | Tudo |
| defensor_titular | Suas demandas + gerenciamento |
| servidor | Multiplos defensores (administrativo) |
| estagiario | Demandas do supervisor |

### Funcoes (funcao)
- defensor_titular, defensor_substituto
- servidor, estagiario
- coordenador, diretor

### Nucleo (localizacao)
- Camacari, Candeias, Salvador, etc.

## Sistema de Convites
1. Admin cria convite via `/admin/usuarios/convite`
2. Sistema gera token `crypto.randomBytes(32).toString("hex")`
3. Link enviado: `/register?convite={token}`
4. Registro valida token (existe, nao expirado, email bate)
5. Auto-aprova usuario com permissoes do convite (nucleo, funcao, oab, visibilidade)
6. Marca convite como aceito com acceptedUserId

## Isolamento de Dados
| Flag | Efeito |
|------|--------|
| podeVerTodosAssistidos | Ver todos assistidos do nucleo |
| podeVerTodosProcessos | Ver todos processos do nucleo |
| defensorId (em demandas) | Isolamento primario |

## OAuth
- Google OAuth para integracao com Drive
- Refresh token armazenado para sync continuo
- Callback em `/api/google/callback`

## Melhorias Futuras
- [ ] 2FA (autenticacao de dois fatores)
- [ ] Login com certificado digital (ICP-Brasil)
- [ ] Audit log de acessos
- [ ] SSO com LDAP da Defensoria
