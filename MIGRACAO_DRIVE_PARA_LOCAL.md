# Guia de Migração: Drive → Pasta Local

## Por que Migrar?

Ter um repositório Git dentro de uma pasta sincronizada com Drive causa:
- ❌ Conflitos de sincronização constantes
- ❌ Performance degradada (operações Git lentas)
- ❌ Risco de corrupção do repositório
- ❌ Sincronização desnecessária de `node_modules` (milhares de arquivos)
- ❌ Problemas de lock de arquivos

**Solução:** Mover projeto para pasta local + usar GitHub como backup.

---

## Passo a Passo da Migração

### Passo 1: Verificar Estado Atual

Antes de migrar, certifique-se de que todas as alterações estão commitadas:

```bash
# Navegar para pasta atual (Drive)
cd "C:\Users\SeuUsuario\Google Drive\Defender"
# ou no macOS/Linux:
cd ~/Google\ Drive/Defender

# Verificar status do Git
git status

# Se houver alterações não commitadas, commitar:
git add .
git commit -m "Backup antes da migração"
git push origin main
```

### Passo 2: Criar Pasta Local

```bash
# Windows
mkdir C:\Projetos
cd C:\Projetos

# macOS/Linux
mkdir ~/Projetos
cd ~/Projetos
```

### Passo 3: Clonar Repositório do GitHub

```bash
# Clonar do GitHub (versão limpa e atualizada)
git clone https://github.com/rodrigorochameire-prog/Defender.git

# Entrar na pasta
cd Defender

# Verificar se está tudo ok
git status
git log --oneline -5
```

### Passo 4: Copiar Arquivos de Configuração

Se você tinha arquivos locais importantes na pasta do Drive:

```bash
# Copiar .env.local (se existir)
# Windows
copy "C:\Users\SeuUsuario\Google Drive\Defender\.env.local" .

# macOS/Linux
cp ~/Google\ Drive/Defender/.env.local .

# Copiar outros arquivos de configuração local (se houver)
# Exemplos: .vscode/settings.json, .idea/, etc.
```

### Passo 5: Instalar Dependências

```bash
# Instalar todas as dependências
npm install

# ou se usar pnpm
pnpm install

# ou yarn
yarn install
```

### Passo 6: Testar o Projeto

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir no navegador: http://localhost:3000
# Verificar se tudo funciona corretamente
```

### Passo 7: Configurar IDE

Abra o projeto na sua IDE favorita apontando para a **nova pasta local**:

**VS Code:**
```bash
code C:\Projetos\Defender
# ou
code ~/Projetos/Defender
```

**WebStorm/IntelliJ:**
- File → Open → Selecionar `C:\Projetos\Defender`

### Passo 8: Limpar Pasta do Drive

**⚠️ IMPORTANTE:** Só faça isso após confirmar que tudo funciona na pasta local!

```bash
# Opção 1: Deletar completamente
# Windows
rmdir /s "C:\Users\SeuUsuario\Google Drive\Defender"

# macOS/Linux
rm -rf ~/Google\ Drive/Defender

# Opção 2: Mover para lixeira (mais seguro)
# Windows: Arrastar para lixeira no Explorer
# macOS: Arrastar para Trash no Finder
# Linux: Mover para ~/.local/share/Trash
```

### Passo 9: Atualizar Atalhos e Bookmarks

- Atualizar favoritos do navegador
- Atualizar projetos recentes na IDE
- Atualizar atalhos do terminal/prompt

---

## Estrutura Final Recomendada

```
C:\Projetos\                    (ou ~/Projetos/)
└── Defender\                   ← Projeto local com Git
    ├── .git\                   ← Repositório Git
    ├── .env.local              ← Configurações locais (não commitado)
    ├── node_modules\           ← Dependências (não commitado)
    ├── src\
    ├── public\
    ├── package.json
    └── ...

C:\Users\...\Google Drive\      (ou ~/Google Drive/)
└── Defender-Docs\              ← Apenas documentação (opcional)
    ├── designs\
    ├── requisitos.pdf
    ├── assets\
    └── ...
```

---

## Checklist de Verificação

Após a migração, verifique:

- [ ] `git status` mostra repositório limpo
- [ ] `git remote -v` aponta para GitHub correto
- [ ] `npm run dev` inicia sem erros
- [ ] Aplicação abre no navegador
- [ ] `.env.local` está configurado (se necessário)
- [ ] IDE reconhece o projeto corretamente
- [ ] Git funciona normalmente (commit, push, pull)
- [ ] Performance do Git melhorou significativamente

---

## Workflow Recomendado

### Desenvolvimento Diário

```bash
# 1. Abrir terminal na pasta local
cd C:\Projetos\Defender

# 2. Atualizar código do GitHub
git pull origin main

# 3. Instalar novas dependências (se houver)
npm install

# 4. Iniciar desenvolvimento
npm run dev

# 5. Fazer alterações...

# 6. Commitar e enviar para GitHub
git add .
git commit -m "Descrição das alterações"
git push origin main
```

### Backup Automático

O GitHub já serve como backup automático. Cada `git push` salva seu código na nuvem.

**Dica:** Configure commits frequentes:
```bash
# Criar alias para commit rápido
git config --global alias.save '!git add -A && git commit -m "WIP: Auto-save"'

# Usar:
git save
git push
```

---

## Configurações Adicionais Recomendadas

### 1. Adicionar .gitignore Completo

Certifique-se de que `.gitignore` inclui:

```gitignore
# Dependências
node_modules/
.pnp
.pnp.js

# Ambiente
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build
dist/
build/
.next/
out/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage/
.nyc_output/
```

### 2. Configurar Git Global

```bash
# Nome e email
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Editor padrão
git config --global core.editor "code --wait"

# Aliases úteis
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
```

### 3. Configurar SSH para GitHub (Opcional mas Recomendado)

```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "seu@email.com"

# Copiar chave pública
# Windows
type %USERPROFILE%\.ssh\id_ed25519.pub

# macOS/Linux
cat ~/.ssh/id_ed25519.pub

# Adicionar em: https://github.com/settings/keys

# Testar conexão
ssh -T git@github.com

# Atualizar remote para SSH
git remote set-url origin git@github.com:rodrigorochameire-prog/Defender.git
```

---

## Solução de Problemas

### Erro: "fatal: not a git repository"

**Causa:** Você não está na pasta correta

**Solução:**
```bash
cd C:\Projetos\Defender
git status
```

### Erro: "npm: command not found"

**Causa:** Node.js não instalado ou não está no PATH

**Solução:**
1. Instalar Node.js: https://nodejs.org
2. Reiniciar terminal
3. Verificar: `node --version`

### Erro: "EACCES: permission denied"

**Causa:** Permissões incorretas

**Solução:**
```bash
# macOS/Linux
sudo chown -R $(whoami) ~/Projetos/Defender

# Windows: Executar terminal como Administrador
```

### Projeto não abre no navegador

**Causa:** Porta 3000 já está em uso

**Solução:**
```bash
# Verificar processos na porta 3000
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Matar processo ou usar outra porta
PORT=3001 npm run dev
```

---

## Vantagens da Nova Estrutura

✅ **Performance:** Operações Git 10x mais rápidas  
✅ **Estabilidade:** Zero conflitos de sincronização  
✅ **Segurança:** GitHub como backup automático  
✅ **Organização:** Código local, docs no Drive  
✅ **Colaboração:** Fácil para outros desenvolvedores  
✅ **Profissional:** Segue boas práticas da indústria  

---

## Próximos Passos

Após a migração bem-sucedida:

1. ✅ Configurar Vercel com `./setup-vercel-env.sh`
2. ✅ Testar deploy em produção
3. ✅ Configurar CI/CD (se necessário)
4. ✅ Documentar fluxo de trabalho da equipe
5. ✅ Fazer backup do `.env.local` em local seguro

---

## Dúvidas Frequentes

**Q: Posso ter o projeto em múltiplos computadores?**  
A: Sim! Clone do GitHub em cada máquina e sincronize via `git pull/push`.

**Q: E se eu perder meu computador?**  
A: Seu código está seguro no GitHub. Basta clonar novamente.

**Q: Posso voltar para o Drive depois?**  
A: Tecnicamente sim, mas não é recomendado pelos problemas mencionados.

**Q: Como compartilhar com outros desenvolvedores?**  
A: Adicione como colaboradores no GitHub. Eles clonam e trabalham localmente.

**Q: Preciso fazer backup manual?**  
A: Não! Cada `git push` já é um backup automático no GitHub.

---

## Suporte

Se encontrar problemas durante a migração:

1. Verifique o status do Git: `git status`
2. Verifique o remote: `git remote -v`
3. Verifique as dependências: `npm list`
4. Consulte os logs: `npm run dev` e veja erros
5. Peça ajuda com prints dos erros específicos

**Importante:** Não delete a pasta do Drive até ter certeza absoluta de que tudo funciona na pasta local!
