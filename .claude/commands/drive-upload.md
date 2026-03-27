# /drive-upload - Upload de Arquivos para o Google Drive

> **Tipo**: Workflow de Organização
> **Trigger**: "upload drive", "enviar pro drive", "subir pro drive", "organizar drive"

## Uso Rápido

```bash
# Upload de PDFs para pasta do Júri
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-autos-juri

# Upload para outra área (ajustar FOLDER_ID no script)
bash scripts/pje_upload_drive_curl.sh ~/Desktop/pje-autos-vvd
```

## Autenticação

**Prioridade de uso:**
1. **OAuth refresh token** → para UPLOADS (Service Account não tem storage quota)
2. **Service Account** → para CRIAR pastas, LISTAR, DELETAR

**Variáveis necessárias (.env.local):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_KEY` (base64, para operações de pasta)

**Obter token OAuth:**
```bash
curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "client_id=$GOOGLE_CLIENT_ID" \
  -d "client_secret=$GOOGLE_CLIENT_SECRET" \
  -d "refresh_token=$GOOGLE_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

**Service Account email:** `ombuds-drive@vvd-automation.iam.gserviceaccount.com`

## Pasta IDs por Área

| Área | Folder ID |
|------|-----------|
| Júri | `1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-` |
| VVD | `1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti` |
| EP | `1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q` |
| Substituição | `1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU` |
| Grupo Júri | `1LUW4yauxm6iaJYCrjRgXAnSgTZIbel2j` |

## Estrutura de Pastas

```
Processos - {Área}/
├── {Nome do Assistido}/           ← Usar pasta existente se já houver
│   ├── {TIPO} {Número Processo}/  ← AP, IP, APF, MPU, EP, IIM
│   │   └── {TIPO} {Número}.pdf
│   ├── outros documentos...       ← Já existentes no Drive
│   └── ...
```

**Tipos de processo:**
- `AP` = Ação Penal de Competência do Júri
- `IP` = Inquérito Policial
- `APF` = Ação Penal (Flagrante)
- `MPU` = Medida Protetiva de Urgência
- `EP` = Execução Penal
- `IIM` = Incidente de Insanidade Mental

## Upload Resumable (para arquivos grandes)

```bash
# Iniciar upload resumable
UPLOAD_URL=$(curl -s -i -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Upload-Content-Type: application/pdf" \
  -H "X-Upload-Content-Length: $SIZE" \
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable" \
  -d '{"name":"arquivo.pdf","parents":["FOLDER_ID"]}' \
  | grep -i "location:" | sed 's/location: //i' | tr -d '\r')

# Enviar arquivo
curl -X PUT -H "Content-Type: application/pdf" \
  --data-binary "@arquivo.pdf" "$UPLOAD_URL"
```

## Operações com Pastas

```bash
# Listar pastas
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/drive/v3/files?q='PARENT_ID'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)"

# Criar pasta
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://www.googleapis.com/drive/v3/files" \
  -d '{"name":"Nome","parents":["PARENT_ID"],"mimeType":"application/vnd.google-apps.folder"}'

# Mover arquivo entre pastas
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/drive/v3/files/FILE_ID?addParents=NEW_PARENT&removeParents=OLD_PARENT"

# Renomear
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://www.googleapis.com/drive/v3/files/FILE_ID" \
  -d '{"name":"novo-nome.pdf"}'

# Deletar (precisa ser owner)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/drive/v3/files/FILE_ID"
```

## Evitar Duplicatas

1. **Pastas de assistido**: Sempre buscar se já existe antes de criar
2. **Arquivos**: Verificar por nome dentro da pasta destino
3. **Nomes case-sensitive**: Drive trata "Felipe Da Hora" ≠ "Felipe da Hora" → cria "(1)"
4. **SA vs OAuth**: Pastas criadas pela SA só podem ser deletadas pela SA

## Solução de Problemas

| Erro | Causa | Fix |
|------|-------|-----|
| `storageQuotaExceeded` | Upload via Service Account | Usar OAuth |
| `insufficientParentPermissions` | SA sem acesso à pasta | Compartilhar pasta com SA como Editor |
| `403 Forbidden` ao deletar | Arquivo criado por outro owner | Usar credencial do owner original |
| Pasta com "(1)" | Drive auto-renomeia duplicatas visuais | Buscar pasta existente antes de criar |
| EPIPE no upload grande | Multipart base64 estoura memória | Usar resumable upload via curl |
| Token expirado | OAuth token dura 1h | Renovar a cada 15-20 operações |
