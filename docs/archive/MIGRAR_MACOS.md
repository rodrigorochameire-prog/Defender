# 🍎 Migrar Projeto para Local - macOS

## Passo a Passo para macOS

### 1️⃣ Limpar Pasta Criada por Engano

Primeiro, vamos deletar a pasta "C" que foi criada:

```bash
# Voltar para a pasta do Drive onde você está
cd ~/Google\ Drive/Defender

# Deletar pasta C criada por engano
rm -rf C
```

---

### 2️⃣ Criar Pasta Local

```bash
# Criar pasta Projetos na sua home
mkdir ~/Projetos

# Entrar na pasta
cd ~/Projetos
```

---

### 3️⃣ Clonar Repositório do GitHub

```bash
git clone https://github.com/rodrigorochameire-prog/Defender.git
cd Defender
```

✅ Isso cria uma cópia limpa do projeto fora do Google Drive.

---

### 4️⃣ Instalar Dependências

```bash
npm install
```

Aguarde a instalação (pode demorar alguns minutos).

---

### 5️⃣ Configurar Variáveis de Ambiente

Crie o arquivo `.env.local`:

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[REDACTED]%40%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc
EOF
```

---

### 6️⃣ Testar o Projeto

```bash
npm run dev
```

Abra o navegador em: **http://localhost:3000**

✅ Se abrir sem erros, está funcionando!

Para parar o servidor: **Ctrl + C**

---

### 7️⃣ Abrir no VS Code

```bash
code .
```

Se o comando `code` não funcionar, abra o VS Code manualmente:
1. Abra o VS Code
2. File → Open Folder
3. Selecione: `/Users/seu-usuario/Projetos/Defender`

---

### 8️⃣ Deletar Pasta do Drive (CUIDADO!)

⚠️ **IMPORTANTE:** Só faça isso após confirmar que tudo funciona na pasta local!

**Opção 1: Mover para Lixeira (Recomendado)**

```bash
# Mover para Trash (pode recuperar depois se necessário)
mv ~/Google\ Drive/Defender ~/.Trash/
```

**Opção 2: Deletar Permanentemente**

```bash
# CUIDADO: Isso é irreversível!
rm -rf ~/Google\ Drive/Defender
```

---

## Estrutura Final

```
/Users/seu-usuario/
├── Projetos/
│   └── Defender/              ← Projeto local
│       ├── .git/              ← Repositório Git
│       ├── .env.local         ← Variáveis locais
│       ├── node_modules/      ← Dependências
│       ├── src/
│       ├── public/
│       └── package.json
│
└── Google Drive/
    └── (Defender deletado)
```

---

## Comandos Úteis para macOS

### Terminal

```bash
# Ver onde você está
pwd

# Listar arquivos
ls -la

# Ir para home
cd ~

# Ir para pasta do projeto
cd ~/Projetos/Defender

# Abrir Finder na pasta atual
open .
```

### Git

```bash
# Ver status
git status

# Ver histórico
git log --oneline -10

# Atualizar do GitHub
git pull origin main

# Commitar alterações
git add .
git commit -m "Descrição"
git push origin main
```

### Node/NPM

```bash
# Ver versão do Node
node --version

# Ver versão do NPM
npm --version

# Iniciar servidor de desenvolvimento
npm run dev

# Instalar dependências
npm install

# Limpar cache (se necessário)
npm cache clean --force
```

---

## Workflow Diário

### Manhã (Começar o Dia)

```bash
# 1. Abrir terminal
# Cmd + Space → digite "Terminal" → Enter

# 2. Ir para pasta do projeto
cd ~/Projetos/Defender

# 3. Atualizar código do GitHub
git pull origin main

# 4. Instalar novas dependências (se houver)
npm install

# 5. Iniciar desenvolvimento
npm run dev
```

### Durante o Dia

```bash
# Fazer alterações no código...
# Salvar arquivos no VS Code (Cmd + S)

# O servidor recarrega automaticamente
# Veja as mudanças em http://localhost:3000
```

### Noite (Fim do Dia)

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar alterações
git add .

# 3. Commitar com mensagem
git commit -m "Descrição do que você fez hoje"

# 4. Enviar para GitHub (backup automático)
git push origin main
```

---

## Troubleshooting macOS

### Erro: "npm: command not found"

**Solução:** Instalar Node.js

1. Baixe: https://nodejs.org
2. Instale a versão LTS (recomendada)
3. Feche e abra o Terminal novamente
4. Verifique: `node --version`

### Erro: "git: command not found"

**Solução:** Instalar Xcode Command Line Tools

```bash
xcode-select --install
```

Ou baixe Git: https://git-scm.com/download/mac

### Erro: "EACCES: permission denied"

**Solução:** Corrigir permissões

```bash
sudo chown -R $(whoami) ~/Projetos/Defender
```

### Porta 3000 já está em uso

**Solução:** Matar processo na porta 3000

```bash
lsof -ti:3000 | xargs kill -9
```

Ou usar outra porta:
```bash
PORT=3001 npm run dev
```

### Erro: "xcrun: error: invalid active developer path"

**Solução:** Reinstalar Command Line Tools

```bash
xcode-select --install
```

---

## Atalhos Úteis do macOS

### Terminal
- **Cmd + T** - Nova aba
- **Cmd + N** - Nova janela
- **Cmd + K** - Limpar tela
- **Ctrl + C** - Parar processo
- **Ctrl + D** - Sair do terminal

### VS Code
- **Cmd + P** - Buscar arquivo
- **Cmd + Shift + P** - Command Palette
- **Cmd + B** - Toggle sidebar
- **Cmd + J** - Toggle terminal
- **Cmd + /** - Comentar linha

---

## Verificação Final

Após migrar, confirme:

- [ ] Terminal está em `~/Projetos/Defender`
- [ ] `git status` funciona
- [ ] `npm run dev` inicia sem erros
- [ ] Aplicação abre em http://localhost:3000
- [ ] `.env.local` existe e tem as variáveis
- [ ] VS Code abre o projeto corretamente
- [ ] Git funciona rápido (sem delay do Drive)

---

## Resumo dos Comandos

```bash
# 1. Limpar pasta C criada por engano
cd ~/Google\ Drive/Defender
rm -rf C

# 2. Criar pasta local
mkdir ~/Projetos
cd ~/Projetos

# 3. Clonar do GitHub
git clone https://github.com/rodrigorochameire-prog/Defender.git
cd Defender

# 4. Instalar dependências
npm install

# 5. Configurar .env.local
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[REDACTED]%40%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc
EOF

# 6. Testar
npm run dev

# 7. Abrir VS Code
code .

# 8. Deletar pasta do Drive (após confirmar que funciona)
mv ~/Google\ Drive/Defender ~/.Trash/
```

---

## Próximos Passos

1. ✅ Seguir os comandos acima
2. ✅ Testar que tudo funciona
3. ✅ Configurar Vercel (já fizemos)
4. ✅ Deletar pasta do Drive com segurança

---

Pronto! Agora você tem os comandos corretos para macOS. Copie e cole cada bloco no Terminal! 🚀
