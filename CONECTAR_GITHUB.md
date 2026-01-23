# Guia para Conectar com GitHub

## Passo 1: Criar repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique no botão "+" no canto superior direito
3. Selecione "New repository"
4. Escolha um nome para o repositório (ex: `Defender`)
5. **NÃO** inicialize com README, .gitignore ou licença (já temos esses arquivos)
6. Clique em "Create repository"

## Passo 2: Inicializar Git no projeto

Execute os seguintes comandos no terminal, dentro da pasta do projeto:

```bash
# Navegar para a pasta do projeto
cd "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/Pessoal/DefesaHub/Defender"

# Inicializar o repositório Git
git init

# Adicionar todos os arquivos (exceto os ignorados pelo .gitignore)
git add .

# Fazer o primeiro commit
git commit -m "Initial commit: Defender project"

# Adicionar o remote do GitHub (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/Defender.git

# Verificar se o remote foi adicionado corretamente
git remote -v

# Fazer push para o GitHub
git branch -M main
git push -u origin main
```

## Passo 3: Autenticação

Se você usar HTTPS, o GitHub pode pedir suas credenciais:
- **Username**: Seu username do GitHub
- **Password**: Use um Personal Access Token (não sua senha normal)

### Como criar um Personal Access Token:

1. Vá em GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Clique em "Generate new token (classic)"
3. Dê um nome (ex: "Defender")
4. Selecione os escopos: `repo` (acesso completo aos repositórios)
5. Clique em "Generate token"
6. **Copie o token imediatamente** (você não poderá vê-lo novamente)
7. Use este token como senha quando o Git pedir

## Alternativa: Usar SSH

Se preferir usar SSH (mais seguro e não precisa digitar credenciais):

```bash
# Adicionar remote usando SSH (substitua SEU_USUARIO)
git remote set-url origin git@github.com:SEU_USUARIO/Defender.git
```

Para usar SSH, você precisa ter uma chave SSH configurada no GitHub. Veja: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

## Comandos úteis depois de conectar

```bash
# Ver status dos arquivos
git status

# Adicionar arquivos modificados
git add .

# Fazer commit
git commit -m "Descrição das mudanças"

# Enviar para o GitHub
git push

# Baixar atualizações do GitHub
git pull
```
