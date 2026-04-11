# Notebooks — Análise Exploratória OMBUDS

Pasta de notebooks Python para explorar dados do OMBUDS diretamente do Supabase.
Sem deploy, sem produção — ferramenta de análise local para o defensor e time.

---

## O que é cada arquivo

| Arquivo | O que faz |
|---|---|
| `01-kpis-operacionais.ipynb` | KPIs base: throughput, backlog, prazos, top atos, carga por defensor |
| `requirements.txt` | Dependências Python (1 linha pra instalar) |

---

## Setup (uma vez só, ~3 minutos)

### 1. Criar ambiente Python isolado

Na raiz do projeto `Defender`:

```bash
cd ~/Projetos/Defender
python3 -m venv notebooks/.venv
source notebooks/.venv/bin/activate
pip install -r notebooks/requirements.txt
```

Isso cria um "venv" (ambiente virtual Python) só pros notebooks, sem bagunçar seu Python do sistema.

### 2. Garantir que o `.env.local` existe

O notebook lê `DATABASE_URL` do arquivo `.env.local` na raiz do projeto. Esse arquivo já existe normalmente. Se não existir, copie de `.env.example`.

### 3. Abrir o notebook

**Opção A — VS Code / Cursor (mais fácil)**:

```bash
code notebooks/01-kpis-operacionais.ipynb
```

Na primeira vez que rodar uma célula, o VS Code vai perguntar qual Python usar — escolha o `notebooks/.venv/bin/python`.

Cada bloco de código tem um botão ▶ do lado esquerdo. Clica pra rodar. Ou `Shift+Enter` com o cursor no bloco.

**Opção B — Jupyter Lab no browser**:

```bash
source notebooks/.venv/bin/activate
jupyter lab notebooks/
```

Abre uma aba no navegador. Clica duplo no `.ipynb` pra abrir.

---

## Como rodar um notebook

1. Abre o arquivo `.ipynb`.
2. Clica no primeiro bloco de código.
3. `Shift+Enter` — roda esse bloco e pula pro próximo.
4. Repete até o fim.
5. Se quiser rodar **tudo de uma vez**: menu "Run" → "Run All Cells".

**Não precisa re-rodar os blocos anteriores quando muda um gráfico**. Os dados já carregados ficam na memória.

**Se algo travar ou quiser começar do zero**: menu "Kernel" → "Restart Kernel". Aí roda tudo de novo limpo.

---

## Atualizar o notebook (rodar com dados novos)

Os dados vêm do Supabase em tempo real. Basta re-rodar o bloco que faz `pd.read_sql(...)` e tudo se atualiza — você não precisa baixar CSV nem nada.

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `ModuleNotFoundError: pandas` | venv não ativado | `source notebooks/.venv/bin/activate` |
| `could not connect to server` | `.env.local` faltando | Copia de `.env.example` ou pede pro Rodrigo |
| VS Code não mostra ▶ nos blocos | Extensão Jupyter não instalada | Instala "Jupyter" da Microsoft no VS Code |
| Gráfico Plotly não aparece | Navegador bloqueado | Menu "View" → "Enable Scrolling Outputs" no VS Code |

---

## Contribuindo

Novos notebooks seguem a convenção:

- `NN-nome-curto.ipynb` (NN = número sequencial)
- Começam com uma célula Markdown explicando o objetivo
- Separam em seções (uma Markdown + 1-3 code cells por seção)
- Não commitam outputs (`Cell > All Output > Clear` antes de commitar)
- Dados sensíveis nunca entram em saída: salve em `/tmp/` ou configure Plotly pra não serializar dados pesados
