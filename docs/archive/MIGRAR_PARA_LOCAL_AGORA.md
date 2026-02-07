# 🚀 Migrar Projeto para Pasta Local - Guia Rápido

## Por Que Migrar?

Ter o projeto no Google Drive causa:
- ❌ Git lento (operações demoram muito)
- ❌ Conflitos de sincronização constantes
- ❌ Risco de corrupção do repositório
- ❌ Drive sincroniza `node_modules` (desnecessário)

**Solução:** Pasta local + GitHub como backup

---

## Passo a Passo Simplificado

### 1️⃣ Criar Pasta Local

Abra o terminal/prompt e execute:

**Windows:**
```cmd
mkdir C:\Projetos
cd C:\Projetos
```

**macOS/Linux:**
```bash
mkdir ~/Projetos
cd ~/Projetos
```

---

### 2️⃣ Clonar do GitHub

```bash
git clone https://github.com/rodrigorochameire-prog/Defender.git
cd Defender
```

✅ Isso cria uma cópia limpa e atualizada do projeto.

---

### 3️⃣ Instalar Dependências

```bash
npm install
```

Aguarde a instalação completar (pode demorar alguns minutos).

---

### 4️⃣ Configurar Variáveis de Ambiente Locais

Crie o arquivo `.env.local`:

**Windows:**
```cmd
echo DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505%%40%%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres > .env.local
echo NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co >> .env.local
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc >> .env.local
```

**macOS/Linux:**
```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505%40%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc
EOF
```

---

### 5️⃣ Testar o Projeto

```bash
npm run dev
```

Abra o navegador em: **http://localhost:3000**

✅ Se abrir sem erros, está funcionando!

---

### 6️⃣ Abrir no VS Code (ou sua IDE)

**VS Code:**
```bash
code .
```

**WebStorm/IntelliJ:**
- File → Open → Selecionar pasta `C:\Projetos\Defender`

---

### 7️⃣ Deletar Pasta do Drive (CUIDADO!)

⚠️ **IMPORTANTE:** Só faça isso após confirmar que tudo funciona na pasta local!

**Opção Segura:** Mover para lixeira
- Windows: Arrastar pasta para Lixeira
- macOS: Arrastar para Trash
- Linux: Mover para `~/.local/share/Trash`

**Opção Permanente:** Deletar via terminal
```bash
# Windows
rmdir /s "C:\Users\SeuUsuario\Google Drive\Defender"

# macOS/Linux
rm -rf ~/Google\ Drive/Defender
```

---

## Estrutura Final

```
C:\Projetos\Defender\          (ou ~/Projetos/Defender/)
├── .git\                       ← Repositório Git
├── .env.local                  ← Variáveis locais (não commitado)
├── node_modules\               ← Dependências (não commitado)
├── src\
├── public\
├── package.json
└── ...

GitHub                          ← Backup automático na nuvem
```

---

## Workflow Diário

### Começar o Dia

```bash
# 1. Abrir terminal na pasta do projeto
cd C:\Projetos\Defender

# 2. Atualizar código do GitHub
git pull origin main

# 3. Instalar novas dependências (se houver)
npm install

# 4. Iniciar desenvolvimento
npm run dev
```

### Durante o Desenvolvimento

```bash
# Fazer alterações no código...

# Testar localmente
npm run dev
```

### Fim do Dia

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar alterações
git add .

# 3. Commitar com mensagem descritiva
git commit -m "Descrição das alterações"

# 4. Enviar para GitHub (backup automático)
git push origin main
```

---

## Comandos Úteis

```bash
# Ver status do Git
git status

# Ver histórico de commits
git log --oneline -10

# Desfazer alterações não commitadas
git checkout -- arquivo.js

# Ver diferenças
git diff

# Criar branch para experimentos
git checkout -b minha-feature

# Voltar para main
git checkout main
```

---

## Verificação Final

Após migrar, confirme:

- [ ] `git status` mostra repositório limpo
- [ ] `npm run dev` inicia sem erros
- [ ] Aplicação abre em http://localhost:3000
- [ ] `.env.local` está configurado
- [ ] IDE reconhece o projeto
- [ ] Git funciona rápido (commit, push, pull)

---

## Troubleshooting

### Erro: "npm: command not found"

**Solução:** Instalar Node.js
1. Baixe: https://nodejs.org
2. Instale a versão LTS
3. Reinicie o terminal
4. Verifique: `node --version`

### Erro: "git: command not found"

**Solução:** Instalar Git
1. Baixe: https://git-scm.com/downloads
2. Instale com configurações padrão
3. Reinicie o terminal
4. Verifique: `git --version`

### Erro: "EACCES: permission denied"

**Solução (macOS/Linux):**
```bash
sudo chown -R $(whoami) ~/Projetos/Defender
```

**Solução (Windows):**
- Executar terminal como Administrador

### Porta 3000 já está em uso

**Solução:**
```bash
# Usar outra porta
PORT=3001 npm run dev

# Ou matar processo na porta 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Erro de conexão com banco de dados

**Solução:** Verificar `.env.local`
```bash
# Ver conteúdo
cat .env.local

# Deve ter DATABASE_URL com senha escapada (%40%40)
```

---

## Vantagens da Nova Estrutura

✅ **Git 10x mais rápido** - Operações instantâneas  
✅ **Zero conflitos** - Sem sincronização do Drive  
✅ **Repositório íntegro** - Sem risco de corrupção  
✅ **GitHub como backup** - Código sempre seguro  
✅ **Profissional** - Padrão da indústria  

---

## Próximos Passos

Após migração bem-sucedida:

1. ✅ Configurar Vercel (já fizemos com `fix-password-encoding.sh`)
2. ✅ Testar deploy em produção
3. ✅ Fazer primeiro commit da pasta local
4. ✅ Deletar pasta do Drive (com segurança)

---

## Resumo Rápido

```bash
# 1. Criar pasta
mkdir C:\Projetos && cd C:\Projetos

# 2. Clonar
git clone https://github.com/rodrigorochameire-prog/Defender.git
cd Defender

# 3. Instalar
npm install

# 4. Configurar .env.local
# (copiar comandos acima)

# 5. Testar
npm run dev

# 6. Abrir IDE
code .

# 7. Deletar pasta do Drive (após confirmar)
```

---

## Suporte

Se tiver problemas:
1. Verifique se Node.js e Git estão instalados
2. Confirme que está na pasta correta
3. Veja os logs de erro completos
4. Teste cada passo individualmente

**Lembre-se:** Não delete a pasta do Drive até ter certeza absoluta de que tudo funciona na pasta local!

---

Pronto! Siga esses passos e seu projeto estará em uma pasta local profissional. 🚀
