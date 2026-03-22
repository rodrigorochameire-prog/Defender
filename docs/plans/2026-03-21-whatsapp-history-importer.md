# WhatsApp History Importer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Importar o histórico completo do WhatsApp Business (iOS) para o OMBUDS via backup do iTunes/Finder no Mac, usando um script Python para extração e uma interface de upload no app.

**Architecture:** Um script Python extrai `ChatStorage.sqlite` do backup local do iPhone (iTunes/Finder), gera um JSON normalizado. O OMBUDS recebe esse JSON via upload em `/admin/whatsapp/importar`, parseia e insere contatos/mensagens no Supabase com flag `imported: true`. As mensagens importadas aparecem normalmente na tela de chat.

**Tech Stack:** Python 3 (script local no Mac), Next.js 15, tRPC, Drizzle ORM, Supabase PostgreSQL, shadcn/ui

---

## Contexto do Banco de Dados

### Tabelas relevantes (`src/lib/db/schema/comunicacao.ts`)

- `evolution_config` — instância da Evolution API (tem um `id` usado como `configId`)
- `whatsapp_contacts` — contatos com `(configId, phone)` unique
- `whatsapp_chat_messages` — mensagens com `contactId`, `waMessageId`, `direction`, `type`, `content`, `status`

### Schema atual de `whatsapp_chat_messages` (linha 275)
```
id, contactId, waMessageId, direction, type, content, mediaUrl,
mediaMimeType, mediaFilename, replyToId, status, metadata, createdAt
```

---

## Formato do iOS Backup

O backup local do iPhone (Finder/iTunes sem criptografia) fica em:
`~/Library/Application Support/MobileSync/Backup/<uuid>/`

O WhatsApp Business armazena suas mensagens em:
- Arquivo: `ChatStorage.sqlite`
- Domínio: `AppDomain-net.whatsapp.WhatsAppSMB`
- Hash do arquivo no backup: SHA1 de `"AppDomain-net.whatsapp.WhatsAppSMB-Documents/ChatStorage.sqlite"`

O SQLite tem as tabelas principais:
- `ZWACHATSESSION` — uma linha por conversa (contacto ou grupo)
  - `ZCONTACTJID` — identificador do contato (ex: `5571XXXXX@s.whatsapp.net`)
  - `ZPARTNERNAME` — nome do contato
- `ZWAMESSAGE` — mensagens
  - `ZCHATSESSION` — FK para ZWACHATSESSION.Z_PK
  - `ZFROMJID` — quem enviou (`null` = você mesmo)
  - `ZTEXT` — texto da mensagem
  - `ZMESSAGEDATE` — timestamp em formato Apple (segundos desde 2001-01-01)
  - `ZMESSAGETYPE` — tipo (0=texto, 1=imagem, 2=áudio, 3=vídeo, 4=contato, 5=localização, 8=documento)
  - `ZMEDIASECTIONID` — referência a mídia

---

## Tarefa 1 — Script Python de Extração

**Arquivo a criar:** `scripts/extract_whatsapp_ios.py`

Este script roda localmente no Mac do usuário para extrair o histórico.

**Passo 1: Criar o script**

```python
#!/usr/bin/env python3
"""
Extrai histórico do WhatsApp Business do backup iOS (iTunes/Finder).
Uso: python3 scripts/extract_whatsapp_ios.py
Saída: ~/Desktop/whatsapp-ombuds-export.json
"""

import sqlite3
import json
import hashlib
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

APPLE_EPOCH_OFFSET = 978307200  # segundos entre 1970-01-01 e 2001-01-01

MESSAGE_TYPES = {
    0: "text",
    1: "image",
    2: "audio",
    3: "video",
    4: "contact",
    5: "location",
    8: "document",
    14: "document",
    15: "image",  # GIF
}

def find_backup_dir():
    backup_root = Path.home() / "Library/Application Support/MobileSync/Backup"
    if not backup_root.exists():
        raise FileNotFoundError(f"Diretório de backup não encontrado: {backup_root}")

    backups = [d for d in backup_root.iterdir() if d.is_dir()]
    if not backups:
        raise FileNotFoundError("Nenhum backup encontrado. Faça backup não criptografado no Finder.")

    # Usa o backup mais recente
    backups.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    print(f"Usando backup: {backups[0].name}")
    return backups[0]

def find_whatsapp_db(backup_dir: Path) -> Path:
    # Hash do arquivo ChatStorage.sqlite do WhatsApp Business
    domain_path = "AppDomain-net.whatsapp.WhatsAppSMB-Documents/ChatStorage.sqlite"
    file_hash = hashlib.sha1(domain_path.encode()).hexdigest()

    db_path = backup_dir / file_hash[:2] / file_hash

    if not db_path.exists():
        # Tenta WhatsApp regular (não Business)
        domain_path = "AppDomain-net.whatsapp.WhatsApp-Documents/ChatStorage.sqlite"
        file_hash = hashlib.sha1(domain_path.encode()).hexdigest()
        db_path = backup_dir / file_hash[:2] / file_hash

    if not db_path.exists():
        raise FileNotFoundError(
            "Banco do WhatsApp não encontrado no backup.\n"
            "Certifique-se que o backup foi feito sem criptografia no Finder."
        )

    return db_path

def apple_timestamp_to_iso(ts: float) -> str:
    if not ts:
        return datetime.now(timezone.utc).isoformat()
    unix_ts = ts + APPLE_EPOCH_OFFSET
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat()

def extract_contacts_and_messages(db_path: Path) -> dict:
    # Copia o DB para temp para não bloquear o backup
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tmp:
        tmp_path = tmp.name
    shutil.copy2(db_path, tmp_path)

    try:
        conn = sqlite3.connect(tmp_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Busca todas as sessões de chat individuais (não grupos)
        cur.execute("""
            SELECT Z_PK, ZCONTACTJID, ZPARTNERNAME, ZMESSAGECOUNTER
            FROM ZWACHATSESSION
            WHERE ZCONTACTJID NOT LIKE '%@g.us'
              AND ZCONTACTJID NOT LIKE 'status@broadcast'
              AND ZCONTACTJID IS NOT NULL
            ORDER BY ZLASTMESSAGEDATE DESC
        """)
        sessions = cur.fetchall()
        print(f"Encontradas {len(sessions)} conversas individuais")

        chats = []
        total_messages = 0

        for session in sessions:
            session_pk = session["Z_PK"]
            contact_jid = session["ZCONTACTJID"]
            partner_name = session["ZPARTNERNAME"] or ""

            # Extrai número do JID (ex: 5571XXXXX@s.whatsapp.net -> 5571XXXXX)
            phone = contact_jid.replace("@s.whatsapp.net", "").replace("@c.us", "")

            # Busca mensagens da conversa
            cur.execute("""
                SELECT
                    ZMESSAGEDATE,
                    ZFROMJID,
                    ZTEXT,
                    ZMESSAGETYPE,
                    ZMEDIASECTIONID,
                    ZISFROMME,
                    Z_PK
                FROM ZWAMESSAGE
                WHERE ZCHATSESSION = ?
                  AND ZMESSAGETYPE IN (0, 1, 2, 3, 4, 5, 8, 14, 15)
                ORDER BY ZMESSAGEDATE ASC
            """, (session_pk,))

            messages = cur.fetchall()
            if not messages:
                continue

            chat_messages = []
            for msg in messages:
                msg_type = MESSAGE_TYPES.get(msg["ZMESSAGETYPE"], "text")
                from_me = bool(msg["ZISFROMME"]) or msg["ZFROMJID"] is None

                chat_messages.append({
                    "id": str(msg["Z_PK"]),
                    "timestamp": apple_timestamp_to_iso(msg["ZMESSAGEDATE"]),
                    "fromMe": from_me,
                    "type": msg_type,
                    "content": msg["ZTEXT"] or None,
                    "hasMedia": msg["ZMEDIASECTIONID"] is not None,
                })

            total_messages += len(chat_messages)
            chats.append({
                "phone": phone,
                "name": partner_name,
                "messages": chat_messages,
            })

        conn.close()
        print(f"Total: {total_messages} mensagens em {len(chats)} conversas")
        return {"chats": chats, "exportedAt": datetime.now(timezone.utc).isoformat()}

    finally:
        os.unlink(tmp_path)

def main():
    print("=== Extrator WhatsApp Business iOS → OMBUDS ===\n")

    backup_dir = find_backup_dir()
    db_path = find_whatsapp_db(backup_dir)
    print(f"Banco encontrado: {db_path}\n")

    data = extract_contacts_and_messages(db_path)

    output_path = Path.home() / "Desktop/whatsapp-ombuds-export.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Arquivo gerado: {output_path}")
    print(f"   {len(data['chats'])} conversas exportadas")
    print(f"\nAgora faça upload desse arquivo no OMBUDS em:")
    print("   /admin/whatsapp/importar")

if __name__ == "__main__":
    main()
```

**Passo 2: Testar manualmente**
```bash
cd /Users/rodrigorochameire/Projetos/Defender
python3 scripts/extract_whatsapp_ios.py
```
Esperado: arquivo `~/Desktop/whatsapp-ombuds-export.json` com estrutura `{chats: [...], exportedAt: "..."}`.

**Passo 3: Commit**
```bash
git add scripts/extract_whatsapp_ios.py
git commit -m "feat(whatsapp): script Python de extração do histórico iOS"
```

---

## Tarefa 2 — Migração do Schema

**Arquivo a modificar:** `src/lib/db/schema/comunicacao.ts` (linha 275 — tabela `whatsappChatMessages`)

**Passo 1: Adicionar coluna `imported` e `importedAt`**

Na definição de `whatsappChatMessages`, adicionar após o campo `metadata`:
```typescript
// Import flag
imported: boolean("imported").default(false).notNull(),
importedAt: timestamp("imported_at"),
```

**Passo 2: Aplicar migração**
```bash
npm run db:push
```
Confirmar com `y` quando perguntado.

**Passo 3: Verificar no Supabase Studio**
```bash
npm run db:studio
```
Verificar que `whatsapp_chat_messages` tem as colunas `imported` e `imported_at`.

**Passo 4: Commit**
```bash
git add src/lib/db/schema/comunicacao.ts
git commit -m "feat(whatsapp): adicionar flag imported em whatsapp_chat_messages"
```

---

## Tarefa 3 — tRPC Mutation `importHistory`

**Arquivo a modificar:** `src/lib/trpc/routers/whatsapp-chat.ts`

Adicionar o schema e mutation ao router existente.

**Passo 1: Adicionar schema de validação** (após os schemas existentes no topo do router, ~linha 90)

```typescript
const importHistorySchema = z.object({
  configId: z.number(),
  jsonContent: z.string().min(1), // conteúdo do arquivo JSON
});
```

**Passo 2: Adicionar mutation** (antes do fechamento do `router({})`)

```typescript
importHistory: protectedProcedure
  .input(importHistorySchema)
  .mutation(async ({ input }) => {
    const { configId, jsonContent } = input;

    // Valida que config existe
    const [config] = await db
      .select()
      .from(evolutionConfig)
      .where(eq(evolutionConfig.id, configId))
      .limit(1);

    if (!config) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Instância não encontrada" });
    }

    // Parse do JSON
    let parsed: { chats: Array<{
      phone: string;
      name: string;
      messages: Array<{
        id: string;
        timestamp: string;
        fromMe: boolean;
        type: string;
        content: string | null;
        hasMedia: boolean;
      }>;
    }>};

    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new TRPCError({ code: "BAD_REQUEST", message: "JSON inválido" });
    }

    if (!parsed.chats || !Array.isArray(parsed.chats)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Formato inválido: campo 'chats' não encontrado" });
    }

    let contactsCreated = 0;
    let contactsUpdated = 0;
    let messagesImported = 0;
    let messagesSkipped = 0;

    for (const chat of parsed.chats) {
      if (!chat.phone || !Array.isArray(chat.messages) || chat.messages.length === 0) {
        continue;
      }

      // Normaliza o telefone
      const phone = chat.phone.replace(/\D/g, "");
      if (phone.length < 8) continue;

      // Calcula lastMessageAt
      const lastMsg = chat.messages[chat.messages.length - 1];
      const lastMessageAt = lastMsg?.timestamp ? new Date(lastMsg.timestamp) : null;

      // Upsert do contato
      const [existing] = await db
        .select({ id: whatsappContacts.id })
        .from(whatsappContacts)
        .where(and(
          eq(whatsappContacts.configId, configId),
          eq(whatsappContacts.phone, phone)
        ))
        .limit(1);

      let contactId: number;

      if (existing) {
        // Atualiza nome e lastMessageAt se não tiver valor mais recente
        await db
          .update(whatsappContacts)
          .set({
            ...(chat.name ? { pushName: chat.name } : {}),
            ...(lastMessageAt ? { lastMessageAt } : {}),
            updatedAt: new Date(),
          })
          .where(eq(whatsappContacts.id, existing.id));
        contactId = existing.id;
        contactsUpdated++;
      } else {
        const [created] = await db
          .insert(whatsappContacts)
          .values({
            configId,
            phone,
            pushName: chat.name || null,
            lastMessageAt,
            unreadCount: 0,
          })
          .returning({ id: whatsappContacts.id });
        contactId = created.id;
        contactsCreated++;
      }

      // Insere mensagens
      for (const msg of chat.messages) {
        // Usa id do iOS como waMessageId com prefixo para evitar colisão
        const waMessageId = `ios_import_${msg.id}`;

        // Verifica duplicata
        const [dup] = await db
          .select({ id: whatsappChatMessages.id })
          .from(whatsappChatMessages)
          .where(eq(whatsappChatMessages.waMessageId, waMessageId))
          .limit(1);

        if (dup) {
          messagesSkipped++;
          continue;
        }

        const msgType = (["text","image","audio","video","document","contact","location","sticker"].includes(msg.type)
          ? msg.type
          : "text") as "text" | "image" | "audio" | "video" | "document" | "contact" | "location" | "sticker";

        await db.insert(whatsappChatMessages).values({
          contactId,
          waMessageId,
          direction: msg.fromMe ? "outbound" : "inbound",
          type: msgType,
          content: msg.content || (msg.hasMedia ? `[${msgType}]` : null),
          status: msg.fromMe ? "sent" : "received",
          imported: true,
          importedAt: new Date(),
          metadata: { importedFrom: "ios_backup", originalTimestamp: msg.timestamp },
          createdAt: new Date(msg.timestamp),
        });

        messagesImported++;
      }
    }

    return {
      contactsCreated,
      contactsUpdated,
      messagesImported,
      messagesSkipped,
      total: parsed.chats.length,
    };
  }),
```

**Passo 3: Verificar que o TypeScript compila**
```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```
Esperado: sem erros de tipo.

**Passo 4: Commit**
```bash
git add src/lib/trpc/routers/whatsapp-chat.ts
git commit -m "feat(whatsapp): mutation importHistory para importar backup iOS"
```

---

## Tarefa 4 — Página de Importação

**Arquivo a criar:** `src/app/(dashboard)/admin/whatsapp/importar/page.tsx`

**Passo 1: Criar a página**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, FileJson, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportarWhatsAppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    contactsCreated: number;
    contactsUpdated: number;
    messagesImported: number;
    messagesSkipped: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Busca a primeira config disponível
  const { data: configs } = trpc.whatsappChat.listConfigs.useQuery();
  const configId = configs?.[0]?.id;

  const importMutation = trpc.whatsappChat.importHistory.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file || !configId) return;
    const content = await file.text();
    importMutation.mutate({ configId, jsonContent: content });
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/whatsapp/chat">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Importar Histórico WhatsApp</h1>
          <p className="text-sm text-zinc-500">Importe conversas do backup do seu iPhone</p>
        </div>
      </div>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como gerar o arquivo de exportação</CardTitle>
          <CardDescription>Execute os passos abaixo no seu Mac antes de importar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="font-medium">1. Fazer backup do iPhone</p>
            <p className="text-zinc-500">
              Conecte o iPhone ao Mac → abra o Finder → selecione o iPhone → clique em
              {" "}<strong>"Fazer backup agora"</strong> → sem senha (não criptografado).
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">2. Executar o script de extração</p>
            <pre className="bg-zinc-950 text-zinc-100 rounded-md p-3 text-xs overflow-x-auto">
{`python3 scripts/extract_whatsapp_ios.py`}
            </pre>
            <p className="text-zinc-500">
              O arquivo <code className="text-xs bg-zinc-100 px-1 rounded">whatsapp-ombuds-export.json</code> será gerado na sua Área de Trabalho.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium">3. Fazer upload abaixo</p>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileJson className="h-10 w-10 text-emerald-600" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-zinc-300" />
                <p className="text-sm font-medium">
                  {isDragActive ? "Solte o arquivo aqui" : "Arraste o JSON ou clique para selecionar"}
                </p>
                <p className="text-xs text-zinc-400">whatsapp-ombuds-export.json</p>
              </div>
            )}
          </div>

          {file && !result && (
            <div className="mt-4">
              <Button
                onClick={handleImport}
                disabled={!configId || importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending ? "Importando..." : "Iniciar importação"}
              </Button>
              {!configId && (
                <p className="text-xs text-zinc-400 text-center mt-2">
                  Nenhuma instância WhatsApp configurada
                </p>
              )}
            </div>
          )}

          {importMutation.isPending && (
            <div className="mt-4 space-y-2">
              <Progress value={undefined} className="h-1" />
              <p className="text-xs text-center text-zinc-500">Processando mensagens...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      {result && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <p className="font-medium">Importação concluída</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.messagesImported}</p>
                <p className="text-zinc-500 text-xs">mensagens importadas</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.contactsCreated}</p>
                <p className="text-zinc-500 text-xs">contatos criados</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.contactsUpdated}</p>
                <p className="text-zinc-500 text-xs">contatos atualizados</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.messagesSkipped}</p>
                <p className="text-zinc-500 text-xs">duplicatas ignoradas</p>
              </div>
            </div>
            <Link href="/admin/whatsapp/chat">
              <Button className="w-full mt-4" variant="outline">
                Ver conversas importadas
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

**Passo 2: Verificar se `react-dropzone` está instalado**
```bash
grep "react-dropzone" package.json
```
Se não estiver: `npm install react-dropzone --legacy-peer-deps`

**Passo 3: Adicionar link na página de chat**

Em `src/app/(dashboard)/admin/whatsapp/chat/page.tsx`, adicionar botão "Importar histórico" no header, ao lado dos botões existentes:
```tsx
import Link from "next/link";
// ...
<Link href="/admin/whatsapp/importar">
  <Button variant="outline" size="sm">
    <Upload className="h-4 w-4 mr-2" />
    Importar histórico
  </Button>
</Link>
```

**Passo 4: Testar localmente**
```bash
npm run dev
```
- Acessar `http://localhost:3000/admin/whatsapp/importar`
- Verificar que a página carrega sem erros
- Verificar as instruções e o dropzone

**Passo 5: Build**
```bash
npm run build 2>&1 | tail -20
```
Esperado: sem erros.

**Passo 6: Commit**
```bash
git add src/app/\(dashboard\)/admin/whatsapp/importar/page.tsx src/app/\(dashboard\)/admin/whatsapp/chat/page.tsx
git commit -m "feat(whatsapp): página de importação de histórico iOS"
```

---

## Tarefa 5 — Deploy e Teste End-to-End

**Passo 1: Deploy**
```bash
vercel --prod --yes
```

**Passo 2: Teste no Mac do usuário**

1. Conectar iPhone ao Mac via cabo
2. Abrir Finder → iPhone → "Fazer backup agora" (sem senha)
3. Aguardar backup completar
4. Executar:
   ```bash
   cd /Users/rodrigorochameire/Projetos/Defender
   python3 scripts/extract_whatsapp_ios.py
   ```
5. Verificar que `~/Desktop/whatsapp-ombuds-export.json` foi gerado
6. Acessar `https://ombuds.vercel.app/admin/whatsapp/importar`
7. Fazer upload do JSON
8. Verificar resultado: contatos e mensagens importados
9. Ir para `/admin/whatsapp/chat` e confirmar que as conversas aparecem

---

## Notas de Implementação

### Timestamps no iOS
O iOS usa "Apple Epoch" (segundos desde 2001-01-01 UTC). A conversão é:
```
unix_timestamp = apple_timestamp + 978307200
```

### Mensagens de mídia
O script marca `hasMedia: true` para mensagens com mídia, mas não extrai os arquivos de mídia (imagens, áudios, etc.) pois ficam em locais separados no backup e seriam muito pesados. O texto da mensagem fica `[image]`, `[audio]`, etc.

### Deduplicação
O `waMessageId` importado usa o prefixo `ios_import_` + ID do SQLite. Se o usuário importar o mesmo arquivo duas vezes, as mensagens são ignoradas (campo `messagesSkipped`).

### Flag `imported`
Mensagens importadas têm `imported: true` e `importedAt` preenchido. Podem ser filtradas ou identificadas visualmente no futuro se necessário.
