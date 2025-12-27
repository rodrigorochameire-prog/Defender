# 🚀 GUIA COMPLETO: INSTALAR E CONFIGURAR SUPABASE CLI

## 📋 SITUAÇÃO ATUAL

- ❌ Homebrew não instalado
- ❌ Node.js/npm não instalado
- ✅ macOS detectado

---

## 🎯 OPÇÕES DE INSTALAÇÃO

### **OPÇÃO 1: Instalar Homebrew + Supabase CLI** ⭐ (Recomendado)

#### Passo 1: Instalar Homebrew

Abra o Terminal e execute:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Siga as instruções na tela. Pode pedir sua senha.

#### Passo 2: Instalar Supabase CLI

Após o Homebrew estar instalado:

```bash
brew install supabase/tap/supabase
```

#### Passo 3: Verificar Instalação

```bash
supabase --version
```

---

### **OPÇÃO 2: Instalar Node.js + Supabase CLI via npm**

#### Passo 1: Instalar Node.js

1. Acesse: https://nodejs.org/
2. Baixe a versão LTS (Long Term Support)
3. Instale o pacote `.pkg`
4. Reinicie o Terminal

#### Passo 2: Instalar Supabase CLI

```bash
npm install -g supabase
```

#### Passo 3: Verificar Instalação

```bash
supabase --version
```

---

### **OPÇÃO 3: Download Manual do Binário** (Mais rápido, sem dependências)

#### Passo 1: Baixar Binário

1. Acesse: https://github.com/supabase/cli/releases
2. Procure pela versão mais recente
3. Baixe: `supabase_darwin_amd64.tar.gz` (para Intel) ou `supabase_darwin_arm64.tar.gz` (para Apple Silicon/M1/M2)

#### Passo 2: Extrair e Instalar

```bash
# Navegar até a pasta de Downloads
cd ~/Downloads

# Extrair o arquivo
tar -xzf supabase_darwin_*.tar.gz

# Mover para /usr/local/bin (requer senha)
sudo mv supabase /usr/local/bin/

# Ou mover para ~/.local/bin (não requer sudo)
mkdir -p ~/.local/bin
mv supabase ~/.local/bin/

# Adicionar ao PATH (se usar ~/.local/bin)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Passo 3: Verificar Instalação

```bash
supabase --version
```

---

## 🔐 CONFIGURAÇÃO DO CLI

Após instalar o CLI, configure-o:

### 1. Login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para você fazer login na sua conta Supabase.

### 2. Linkar Projeto

```bash
supabase link --project-ref siwapjqndevuwsluncnr
```

**Nota**: O `project-ref` é extraído da URL do seu projeto:
- URL: `https://siwapjqndevuwsluncnr.supabase.co`
- Project Ref: `siwapjqndevuwsluncnr`

### 3. Verificar Conexão

```bash
supabase projects list
```

Deve listar seus projetos Supabase.

---

## 🎯 EXECUTAR SCRIPT RLS

Após configurar, execute o script completo:

```bash
# Certifique-se de estar no diretório do projeto
cd "/Users/rodrigorochameire/Library/CloudStorage/GoogleDrive-rodrigorochameire@gmail.com/Meu Drive/Pessoal/Tuco Care/TeteCareHub"

# Executar script RLS
supabase db execute -f SQL_RLS_FINAL_COMPLETO.sql
```

---

## ✅ VALIDAÇÃO

Após executar o script, verifique se as políticas foram criadas:

```bash
# Conectar ao banco e verificar políticas
supabase db execute --query "
SELECT policyname, cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
"
```

**Resultado esperado**: 48 políticas listadas

---

## 🆘 TROUBLESHOOTING

### Erro: "command not found: supabase"
- Verifique se o PATH está configurado
- Reinicie o Terminal
- Verifique instalação: `which supabase`

### Erro: "Permission denied"
- Se usar `sudo`, certifique-se de ter permissões
- Ou use `~/.local/bin` em vez de `/usr/local/bin`

### Erro: "Project not found"
- Verifique se o `project-ref` está correto
- Verifique se você está logado: `supabase login`

### Erro: "must be owner of table objects"
- O CLI deve ter permissões de service_role automaticamente
- Se persistir, verifique se está usando o CLI correto

---

## 📝 RESUMO DOS COMANDOS

```bash
# 1. Instalar (escolha uma opção acima)

# 2. Login
supabase login

# 3. Linkar projeto
supabase link --project-ref siwapjqndevuwsluncnr

# 4. Executar script
supabase db execute -f SQL_RLS_FINAL_COMPLETO.sql

# 5. Validar
supabase db execute --query "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';"
```

---

## 💡 RECOMENDAÇÃO

**Use a OPÇÃO 1 (Homebrew)** se você planeja usar outras ferramentas de linha de comando no futuro. É o método mais comum no macOS.

**Use a OPÇÃO 3 (Download Manual)** se quiser algo rápido sem instalar dependências.

---

**Pronto!** Escolha uma opção e siga os passos. Se tiver dúvidas, me avise! 🚀


