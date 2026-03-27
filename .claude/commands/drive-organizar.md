# /drive-organizar - Organizar Arquivos no Google Drive

> **Tipo**: Workflow de Organização
> **Trigger**: "organizar drive", "arrumar pastas", "mover pro drive", "organizar processos"

## O que faz

Organiza documentos no Google Drive seguindo a estrutura padrão da Defensoria:
`Processos - {Área} / {Nome Assistido} / {TIPO} {Número} / {Arquivo}.pdf`

## Uso com Cowork (interativo)

Exemplos de pedidos:
- "Organiza esses PDFs no Drive na pasta do Júri"
- "Move esses documentos para a pasta do Diego Bonfim Almeida"
- "Cria a pasta do novo assistido Fulano e coloca os documentos lá"
- "Renomeia os arquivos da pasta de Gabriel para o padrão"
- "Verifica se tem duplicatas no Drive do Júri"

## Estrutura Padrão

```
Meu Drive/
├── 1 - Defensoria 9ª DP/
│   ├── Processos - Júri/
│   │   ├── {Nome Assistido}/
│   │   │   ├── AP {Número Processo}/
│   │   │   │   ├── AP {Número}.pdf          ← Autos Digitais
│   │   │   │   ├── Intimação - {Data} - {Tipo}.pdf
│   │   │   │   └── ...
│   │   │   ├── Relatório inicial.pdf         ← Docs soltos do caso
│   │   │   ├── Plano de instrução.pdf
│   │   │   └── Entrevistas/
│   │   │       └── ...
│   ├── Processos - VVD (Criminal)/
│   ├── Processos - VVD (MPU)/
│   ├── Processos - Execução Penal/
│   └── Expedientes administrativos/
```

## Convenções de Nomenclatura

| Tipo de Arquivo | Formato do Nome |
|----------------|-----------------|
| Autos Digitais | `{TIPO} {Número}.pdf` |
| Intimação | `Intimação - {YYYY-MM-DD} - {Tipo do Ato}.pdf` |
| Entrevista | `{Data} Entrevista - {Nome da Pessoa} - {Resumo}.pdf` |
| Audiência | `{Data} Audiência - {Tipo} - {Resumo}.pdf` |
| Análise | `Análise - {Assunto}.pdf` |
| Relatório | `Relatório - {Assunto}.pdf` |

## Operações Comuns via CLI

### Upload de arquivo
```bash
source ~/Projetos/Defender/.env.local
TOKEN=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=$GOOGLE_CLIENT_ID" -d "client_secret=$GOOGLE_CLIENT_SECRET" \
  -d "refresh_token=$GOOGLE_REFRESH_TOKEN" -d "grant_type=refresh_token" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

# Upload resumable
SIZE=$(stat -f%z arquivo.pdf)
URL=$(curl -s -i -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Upload-Content-Type: application/pdf" \
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable" \
  -d '{"name":"arquivo.pdf","parents":["FOLDER_ID"]}' \
  | grep -i "location:" | sed 's/location: //i' | tr -d '\r')
curl -X PUT -H "Content-Type: application/pdf" --data-binary "@arquivo.pdf" "$URL"
```

### Buscar pasta por nome
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/drive/v3/files?q=name='Nome'+and+'PARENT_ID'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)"
```

### Listar conteúdo de pasta
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/drive/v3/files?q='FOLDER_ID'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)"
```

## Folder IDs de Referência

| Pasta | ID |
|-------|-----|
| 1 - Defensoria 9ª DP | `1bxPN_PF-wC0XNX79UXCSi5UVDuIHt5Lf` |
| Processos - Júri | `1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-` |
| Processos - VVD | `1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti` |
| Processos - EP | `1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q` |
| Substituição | `1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU` |

## Service Account
- Email: `ombuds-drive@vvd-automation.iam.gserviceaccount.com`
- Pode: criar pastas, listar, deletar (suas próprias)
- NÃO pode: fazer upload (sem storage quota desde 2024)
- Para upload: usar **OAuth** (`GOOGLE_REFRESH_TOKEN`)

## Cuidados
- **Não criar pastas duplicadas** — sempre buscar se existe antes
- **macOS mostra "(1)"** quando nomes são iguais após normalização de acentos/case
- **Após reorganizar**: reiniciar Google Drive for Desktop para limpar cache
  ```bash
  killall "Google Drive" && sleep 3 && open -a "Google Drive"
  ```
