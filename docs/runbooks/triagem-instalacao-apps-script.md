# Instalação do Apps Script — Triagem Criminal

## Pré-requisitos
- Spreadsheet "Triagem Criminal — DP Camaçari" já criada (rodar `npm run triagem:setup-sheet`)
- Acesso de Editor à planilha
- Mesmo `SHEETS_WEBHOOK_SECRET` que está no `.env.local` do OMBUDS

## Passos

1. Abrir a planilha no Google Sheets
2. Menu **Extensões → Apps Script**
3. Apagar o conteúdo padrão de `Code.gs`
4. Colar o conteúdo de `docs/triagem-script.gs` (deste repo)
5. **Configurar Script Properties:**
   - Ícone de engrenagem (esquerda) → "Propriedades do script"
   - Adicionar duas propriedades:
     - `SHEETS_WEBHOOK_SECRET` = mesmo valor do .env do OMBUDS
     - `OMBUDS_BASE_URL` = `https://ombuds.vercel.app` (ou URL de prod atual)
6. Salvar (Ctrl+S)
7. Executar `instalarTriggers` no menu superior (▶️)
8. Autorizar permissões solicitadas pelo Google
9. Recarregar a planilha — o menu **⚡ Triagem** deve aparecer na barra superior

## Verificação

1. Ir na aba "Juri"
2. Linha 2 (abaixo do cabeçalho): preencher
   - Assistido: `Teste Instalação`
   - Telefone: `71999999999`
   - Demanda: `Atendimento de teste — ignorar`
3. A coluna **Status sync** (última) deve mostrar `✓ #N` em segundos (link clicável)
4. Abrir OMBUDS em `/triagem` — o atendimento `Teste Instalação` deve aparecer
5. No OMBUDS, clicar **Ações → Arquivar** para remover o registro de teste

## Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `❌ SECRET ausente` | Script Properties não configurado | Voltar ao passo 5 |
| `❌ 401` | SECRET com valor errado | Verificar que bate com `.env.local` do OMBUDS |
| `❌ 400 assistido_nome é obrigatório` | Coluna Assistido vazia | Preencher antes de preencher Demanda |
| `❌ 400 CNJ inválido: ...` | Número de processo com formato errado | Apagar e digitar só o CNJ padrão (20 dígitos, com ou sem pontuação) |
| Nada acontece ao editar linha | Trigger não foi instalado | Executar `instalarTriggers` manualmente |
| Menu `⚡ Triagem` não aparece | Arquivo não foi salvo ou autorização pendente | Recarregar planilha e reautorizar |

## Logs e diagnóstico

- No Apps Script: **Execuções** (ícone de relógio à esquerda) — mostra histórico de triggers e erros
- Filtrar por status `Failed` para ver falhas
- Clicar em uma execução mostra stack trace

## Rollback

Se precisar desinstalar:
1. Apps Script → **Triggers** (ícone de relógio)
2. Deletar todos os triggers listados
3. Esvaziar `Code.gs` (ou sobrescrever com `function onEditTrigger(){}` vazio)
