# Início Rápido - TucoCare Pro

## Importante: Erro de Coluna Duplicada

Se você está vendo o erro `Duplicate column name 'linkedResourceType'`, siga este guia.

## Solução Rápida

O Dockerfile foi atualizado para usar migrações seguras. Basta rebuild o contêiner:

```bash
# Para ambientes Docker/containerizados
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## 🚀 Quick Start - Deploy TucoCare Pro

## 📦 O que você tem aqui

Este é o código-fonte completo do **TucoCare Pro**, um sistema de gestão de creche para pets com:

- ✅ Autenticação completa (email/senha + OAuth)
- ✅ Gestão de pets e tutores
- ✅ Sistema de saúde (vacinas, medicamentos, preventivos)
- ✅ Gestão financeira e créditos
- ✅ Upload de fotos para S3
- ✅ Integração com Stripe para pagamentos
- ✅ Sistema de notificações
- ✅ Chat e mural
- ✅ WhatsApp Business integration
- ✅ Logs de auditoria

---

## ⚡ Deploy Rápido (3 opções)

### Opção 1: Railway (Mais Fácil) ⭐

1. Crie conta em https://railway.app
2. Clique "New Project" → "Deploy from GitHub repo"
3. Conecte este repositório
4. Adicione MySQL: "+ New" → "Database" → "Add MySQL"
5. Configure variáveis de ambiente (veja `ENV_VARIABLES_EXAMPLE.txt`)
6. Deploy automático! 🎉

**Custo:** ~$5-10/mês

### Opção 2: Render

1. Crie conta em https://render.com
2. "New Web Service" → Connect repository
3. Build: `pnpm install && pnpm build`
4. Start: `pnpm start`
5. Configure env vars
6. Deploy!

**Custo:** Grátis ou $7/mês

### Opção 3: Docker

```bash
# Build
docker build -t tucocare-pro .

# Run
docker-compose up -d
```

---

## 🔑 Variáveis de Ambiente Essenciais

Copie `ENV_VARIABLES_EXAMPLE.txt` para `.env` e preencha:

**Obrigatórias:**
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Gere com: `openssl rand -base64 32`
- `S3_*` - Credenciais AWS S3 ou DigitalOcean Spaces
- `STRIPE_*` - Chaves da conta Stripe

**Opcionais (mas recomendadas):**
- `SENDGRID_API_KEY` - Para envio de emails
- `OAUTH_*` - Se usar Manus OAuth (ou implemente alternativa)

---

## 📚 Documentação Completa

Leia `DEPLOY_GUIDE.md` para:
- Instruções detalhadas de cada plataforma
- Configuração de banco de dados
- Configuração de S3
- Configuração de email
- Troubleshooting
- Adaptações necessárias

---

## 🛠️ Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Rodar migrations (USE ESTE, NÃO db:push!)
pnpm db:migrate

# Desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Iniciar produção
pnpm start

# Rodar testes
pnpm test
```

---

## ⚠️ Importante

1. **Nunca commite o arquivo `.env`** - Ele contém segredos!
2. **Configure backup do banco** - Dados são preciosos
3. **Use HTTPS em produção** - Segurança primeiro
4. **Teste localmente antes** - `pnpm dev` e verifique tudo

---

## 📞 Precisa de Ajuda?

1. Leia `DEPLOY_GUIDE.md` (guia completo)
2. Verifique logs do servidor
3. Teste variáveis de ambiente
4. Confirme conexão com banco

---

## 🎯 Checklist de Deploy

- [ ] Banco de dados criado e `DATABASE_URL` configurada
- [ ] Todas as env vars configuradas
- [ ] S3 bucket criado
- [ ] Stripe configurado
- [ ] `pnpm db:migrate` executado
- [ ] `pnpm build` rodando sem erros
- [ ] Testes passando (`pnpm test`)
- [ ] SSL/HTTPS configurado
- [ ] Backups configurados

---

**Boa sorte! 🚀**
