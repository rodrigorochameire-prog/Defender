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
import sys
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

def find_backup_dir(custom_path: str = None):
    if custom_path:
        p = Path(custom_path).expanduser()
        if not p.exists():
            raise FileNotFoundError(f"Caminho informado não encontrado: {p}")
        # Se o usuário apontou para a pasta raiz do backup (com subpastas de 2 chars), usa diretamente
        # Se apontou para a pasta MobileSync/Backup, pega o mais recente dentro dela
        children = [d for d in p.iterdir() if d.is_dir()]
        # Heurística: pasta de backup tem subpastas com nomes de 2 chars (ex: "00", "ab")
        two_char = [d for d in children if len(d.name) == 2]
        if two_char:
            print(f"Usando backup: {p.name}")
            return p
        # Caso contrário, é a pasta raiz — pega o mais recente
        if children:
            children.sort(key=lambda d: d.stat().st_mtime, reverse=True)
            print(f"Usando backup: {children[0].name}")
            return children[0]
        raise FileNotFoundError(f"Nenhuma subpasta encontrada em: {p}")
    backup_root = Path.home() / "Library/Application Support/MobileSync/Backup"
    if not backup_root.exists():
        raise FileNotFoundError(f"Diretório de backup não encontrado: {backup_root}")
    backups = [d for d in backup_root.iterdir() if d.is_dir()]
    if not backups:
        raise FileNotFoundError("Nenhum backup encontrado. Faça backup não criptografado no Finder.")
    backups.sort(key=lambda d: d.stat().st_mtime, reverse=True)
    print(f"Usando backup: {backups[0].name}")
    return backups[0]

def find_whatsapp_db(backup_dir: Path) -> Path:
    # Tenta WhatsApp Business primeiro
    for domain_path in [
        "AppDomain-net.whatsapp.WhatsAppSMB-Documents/ChatStorage.sqlite",
        "AppDomain-net.whatsapp.WhatsApp-Documents/ChatStorage.sqlite",
    ]:
        file_hash = hashlib.sha1(domain_path.encode()).hexdigest()
        db_path = backup_dir / file_hash[:2] / file_hash
        if db_path.exists():
            print(f"Banco encontrado: {'WhatsApp Business' if 'SMB' in domain_path else 'WhatsApp'}")
            return db_path
    raise FileNotFoundError(
        "Banco do WhatsApp não encontrado no backup.\n"
        "Certifique-se que o backup foi feito sem criptografia no Finder."
    )

def apple_timestamp_to_iso(ts):
    if not ts:
        return None
    unix_ts = float(ts) + APPLE_EPOCH_OFFSET
    return datetime.fromtimestamp(unix_ts, tz=timezone.utc).isoformat()

def extract_contacts_and_messages(db_path: Path) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False) as tmp:
        tmp_path = tmp.name
    shutil.copy2(db_path, tmp_path)

    conn = None
    try:
        conn = sqlite3.connect(tmp_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("""
            SELECT Z_PK, ZCONTACTJID, ZPARTNERNAME
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
            phone = contact_jid.replace("@s.whatsapp.net", "").replace("@c.us", "")

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
                msg_type = MESSAGE_TYPES.get(msg["ZMESSAGETYPE"], "unknown")
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

        print(f"Total: {total_messages} mensagens em {len(chats)} conversas")
        return {"chats": chats, "exportedAt": datetime.now(timezone.utc).isoformat()}
    finally:
        if conn:
            conn.close()
        os.unlink(tmp_path)

def main():
    print("=== Extrator WhatsApp Business iOS -> OMBUDS ===\n")
    custom_path = sys.argv[1] if len(sys.argv) > 1 else None
    try:
        backup_dir = find_backup_dir(custom_path)
        db_path = find_whatsapp_db(backup_dir)
        data = extract_contacts_and_messages(db_path)
        output_path = Path.home() / "Desktop/whatsapp-ombuds-export.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nArquivo gerado: {output_path}")
        print(f"   {len(data['chats'])} conversas exportadas")
        print(f"\nAgora faca upload desse arquivo no OMBUDS em:")
        print("   /admin/whatsapp/importar")
    except FileNotFoundError as e:
        print(f"\nErro: {e}")
    except Exception as e:
        print(f"\nErro inesperado: {e}")

if __name__ == "__main__":
    main()
