# 🔐 Credenciais de Acesso - Defender

## Login Administrativo

### Credenciais Configuradas

```
Email: rodrigorochameire@gmail.com
Senha: Defesa9dp*
Role: admin
```

## Como Fazer Login

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse a página de login:**
   ```
   http://localhost:3000/login
   ```

3. **Insira as credenciais:**
   - **Email:** rodrigorochameire@gmail.com
   - **Senha:** Defesa9dp*

4. **Clique em "Entrar"**

5. **Você será redirecionado para:** `/admin`

## ⚡ Sistema de Fallback

O sistema agora possui um **mecanismo de fallback** que permite login mesmo sem conexão com o banco de dados Supabase:

- ✅ **Funciona offline** - Não depende de conexão com banco
- ✅ **Credenciais hardcoded** - Email e senha configurados no código
- ✅ **Acesso total** - Role de administrador
- ✅ **Seguro** - Hash bcrypt da senha

## 🧪 Testar Credenciais

Execute o script de teste para verificar se as credenciais estão funcionando:

```bash
npx tsx scripts/test-login.ts
```

## 📝 Detalhes Técnicos

### Hash da Senha (bcrypt)
```
$2a$10$Hy9MfkPeH.PL75ttDLpOteoxyQRzQr4WhLXwCWdwsZI2ixoLsH1M6
```

### Localização no Código
- **Arquivo:** `src/app/(auth)/login/actions.ts`
- **Constante:** `FALLBACK_USER`

### Como Funciona

1. Usuário insere email e senha no formulário
2. Sistema verifica se é o email do fallback (`rodrigorochameire@gmail.com`)
3. Se sim, compara a senha com o hash hardcoded
4. Se válido, cria sessão JWT com role "admin"
5. Se não for o fallback, tenta buscar no banco de dados
6. Em caso de erro de conexão, fallback já foi testado

## 🔧 Alteração da Senha

Para alterar a senha do fallback:

1. **Gere um novo hash:**
   ```bash
   npx tsx scripts/generate-password-hash.ts
   ```
   (Edite o script para usar a nova senha)

2. **Atualize o código:**
   - Abra `src/app/(auth)/login/actions.ts`
   - Localize `FALLBACK_USER.passwordHash`
   - Substitua pelo novo hash

## ⚠️ Avisos de Segurança

- **Desenvolvimento:** Este sistema de fallback é ideal para desenvolvimento e testes
- **Produção:** Remova ou proteja adequadamente as credenciais hardcoded em produção
- **Ambiente:** Configure variáveis de ambiente para credenciais sensíveis
- **Auditoria:** Registre todos os acessos usando o sistema de fallback

## 📚 Scripts Disponíveis

```bash
# Testar login
npx tsx scripts/test-login.ts

# Gerar hash de senha
npx tsx scripts/generate-password-hash.ts

# Listar administradores (requer conexão com banco)
npx tsx scripts/list-admins.ts

# Criar novo admin (requer conexão com banco)
npx tsx scripts/create-admin.ts
```

---

**Última atualização:** 2026-01-23
**Sistema:** Defender - Sistema de Gestão para Defensoria Pública
