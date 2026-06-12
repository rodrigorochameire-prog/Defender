---
name: protocolar
description: >
  Skill para protocolar minutas da DPE-BA: copia automaticamente um documento finalizado
  para a pasta Protocolar do Google Drive (/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/Protocolar),
  gerando uma cópia em .docx e outra em .pdf, com nome padronizado no formato PJe.
  Use SEMPRE que o usuário disser: 'protocolar', 'colocar em protocolar', 'salvar na pasta protocolar',
  'adicionar à protocolar', 'gerar versão para protocolo', 'preparar para protocolo', ou qualquer
  variação de enviar/copiar/salvar uma minuta pronta na pasta de protocolo.
  Acione também quando qualquer outra skill (dpe-ba-pecas, criminal-comum, juri, vvd, execucao-penal,
  institucional) terminar de gerar um documento E o usuário indicar que está pronto para protocolar.
---

# Skill: Protocolar Minutas

## O que esta skill faz

Copia um documento finalizado (.docx) para a pasta Protocolar com:
1. Nome padronizado no formato PJe (sem acentos, vírgulas, dois-pontos ou caracteres especiais)
2. Cópia em .docx
3. Cópia convertida em .pdf (via LibreOffice)

## Caminho da pasta Protocolar

```
/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP/Protocolar
```

No ambiente da VM, este caminho aparece como:
```
/sessions/<session-id>/mnt/1 - Defensoria 9ª DP/Protocolar
```

**Importante:** Se a pasta não estiver acessível, usar `request_cowork_directory` com o path
`/Users/rodrigorochameire/Meu Drive/1 - Defensoria 9ª DP` para solicitar acesso ao usuário.

## Convenção de nomenclatura

```
TIPO - Conteudo do ato - Nome do assistido.ext
```

### Regras:
- **TIPO**: sempre em MAIÚSCULO, sem acento → exemplos: `RA`, `AF`, `RESE`, `APELACAO`, `HC`, `MANIFESTACAO`, `OFICIO`, `REQUERIMENTO`
- **Conteudo do ato**: descreve o **argumento ou pedido central** da peça, não seu tipo — primeira letra maiúscula, sem acentos. Exemplos: `Rejeicao da denuncia`, `Decote de qualificadoras`, `Excesso de linguagem`, `Progressao de regime`, `Revogacao de prisao preventiva`
- **Nome do assistido**: como consta nos autos, sem acento → exemplo: `Fulano de Tal`
- **Sem** acentos, vírgulas, dois-pontos, ponto-e-vírgula, parênteses, barras ou qualquer caractere especial

> **Atenção:** o campo "Conteudo" nunca repete o nome da peça. Uma AF não tem conteúdo "Alegacoes finais" — tem conteúdo "Decote de qualificadoras" ou "Impronuncia", dependendo do que a peça pede. Um RESE não tem conteúdo "Pronuncia" — tem conteúdo "Excesso de linguagem" ou "Impronuncia", conforme a tese.

### Exemplos corretos:
| Peça e tese central | Nome correto |
|------|-------------|
| RA pedindo rejeição da denúncia | `RA - Rejeicao da denuncia - Fulano de Tal` |
| AF pedindo decote de qualificadoras | `AF - Decote de qualificadoras - Joao da Silva` |
| AF pedindo impronúncia | `AF - Impronuncia - Joao da Silva` |
| RESE por excesso de linguagem na pronúncia | `RESE - Excesso de linguagem - Pedro Alves` |
| RESE pedindo impronúncia | `RESE - Impronuncia - Pedro Alves` |
| HC por excesso de prazo | `HC - Excesso de prazo - Carlos Souza` |
| Apelação por condenação indevida | `APELACAO - Condenacao indevida - Ana Lima` |
| Apelação pedindo absolvição | `APELACAO - Absolvicao - Ana Lima` |
| Requerimento de progressão de regime | `REQUERIMENTO - Progressao de regime - Jose Ferreira` |
| Requerimento de revogação de preventiva | `REQUERIMENTO - Revogacao de prisao preventiva - Lucas Nunes` |
| Ofício requisitando documentos | `OFICIO - Requisicao de documentos - Andre Costa` |

## Como executar

### Passo 1: Coletar informações

Se não estiverem claras no contexto, perguntar ao usuário:
- Qual o arquivo .docx de origem? (caminho completo)
- Qual o TIPO do ato? (RA, AF, RESE, APELACAO, HC, OFICIO, REQUERIMENTO, etc.)
- Qual o conteúdo/assunto resumido?
- Qual o nome do assistido?

Se o documento acabou de ser gerado na mesma conversa, essas informações geralmente já estão disponíveis — usar sem perguntar novamente.

### Passo 2: Usar o script helper

```bash
python3 /sessions/<session-id>/mnt/.skills/skills/protocolar/scripts/protocolar.py \
  --origem "/caminho/do/arquivo.docx" \
  --tipo "RA" \
  --conteudo "Rejeicao da denuncia" \
  --nome "Fulano de Tal"
```

O script:
- Normaliza o nome (remove acentos e caracteres especiais)
- Copia o .docx para a pasta Protocolar
- Converte para .pdf usando LibreOffice
- Copia o .pdf para a pasta Protocolar
- Retorna os caminhos finais dos dois arquivos

### Passo 3: Confirmar ao usuário

Informar os nomes e caminhos dos dois arquivos gerados com links `computer://` para acesso direto.

## Normalização de nomes — referência rápida

| Original | Normalizado |
|----------|-------------|
| Réjeição | Rejeicao |
| Ação | Acao |
| Citação | Citacao |
| Habeas Córpus | Habeas Corpus |
| Réu | Reu |
| João | Joao |
| Ângela | Angela |

Regra geral: substituir letra acentuada pela versão sem acento (â→a, ã→a, é→e, ê→e, í→i, ó→o, ô→o, ú→u, ç→c, ñ→n).
