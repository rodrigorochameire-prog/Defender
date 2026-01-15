#!/usr/bin/env python3
"""
Script para aplicar políticas RLS no Supabase Storage
"""

import psycopg2
from psycopg2 import sql

# Conexão direta com parâmetros separados
DB_CONFIG = {
    'host': 'db.siwapjqndevuwsluncnr.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': '[401bFr505*]',
    'sslmode': 'require'
}

SQL_COMMANDS = [
    # Habilitar RLS
    "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;",
    
    # Função auxiliar: Extrair pet_id do caminho
    """
    CREATE OR REPLACE FUNCTION storage.extract_pet_id(file_path TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      parts TEXT[];
    BEGIN
      parts := string_to_array(file_path, '/');
      IF array_length(parts, 1) >= 2 AND parts[1] = 'pets' THEN
        RETURN parts[2]::INTEGER;
      END IF;
      RETURN NULL;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
    """,
    
    # Função auxiliar: Verificar se usuário é admin
    """
    CREATE OR REPLACE FUNCTION storage.is_admin()
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE auth_id = auth.uid()::text 
        AND role = 'admin'
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """,
    
    # Função auxiliar: Verificar se usuário é tutor do pet
    """
    CREATE OR REPLACE FUNCTION storage.is_pet_tutor(pet_id_param INTEGER)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.pet_tutors pt
        JOIN public.users u ON pt.tutor_id = u.id
        WHERE pt.pet_id = pet_id_param 
        AND u.auth_id = auth.uid()::text
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    """,
    
    # Limpar políticas antigas
    "DROP POLICY IF EXISTS \"pet_photos_select\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"pet_photos_insert\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"pet_photos_update\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"pet_photos_delete\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"documents_select\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"documents_insert\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"documents_update\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"documents_delete\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"wall_media_select\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"wall_media_insert\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"wall_media_update\" ON storage.objects;",
    "DROP POLICY IF EXISTS \"wall_media_delete\" ON storage.objects;",
    
    # POLÍTICAS pet-photos
    """
    CREATE POLICY "pet_photos_select" ON storage.objects 
    FOR SELECT USING (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "pet_photos_insert" ON storage.objects 
    FOR INSERT WITH CHECK (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "pet_photos_update" ON storage.objects 
    FOR UPDATE USING (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "pet_photos_delete" ON storage.objects 
    FOR DELETE USING (
      bucket_id = 'pet-photos' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    
    # POLÍTICAS documents
    """
    CREATE POLICY "documents_select" ON storage.objects 
    FOR SELECT USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "documents_insert" ON storage.objects 
    FOR INSERT WITH CHECK (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "documents_update" ON storage.objects 
    FOR UPDATE USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    """
    CREATE POLICY "documents_delete" ON storage.objects 
    FOR DELETE USING (
      bucket_id = 'documents' 
      AND auth.role() = 'authenticated'
      AND (storage.is_admin() OR storage.is_pet_tutor(storage.extract_pet_id(name)))
    );
    """,
    
    # POLÍTICAS wall-media
    """
    CREATE POLICY "wall_media_select" ON storage.objects 
    FOR SELECT USING (bucket_id = 'wall-media' AND auth.role() = 'authenticated');
    """,
    """
    CREATE POLICY "wall_media_insert" ON storage.objects 
    FOR INSERT WITH CHECK (
      bucket_id = 'wall-media' 
      AND auth.role() = 'authenticated'
      AND storage.is_admin()
    );
    """,
    """
    CREATE POLICY "wall_media_update" ON storage.objects 
    FOR UPDATE USING (
      bucket_id = 'wall-media' 
      AND auth.role() = 'authenticated'
      AND storage.is_admin()
    );
    """,
    """
    CREATE POLICY "wall_media_delete" ON storage.objects 
    FOR DELETE USING (
      bucket_id = 'wall-media' 
      AND auth.role() = 'authenticated'
      AND storage.is_admin()
    );
    """,
]

def main():
    print("🚀 Conectando ao Supabase...")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        print("✅ Conectado!\n")
        
        for i, cmd in enumerate(SQL_COMMANDS, 1):
            cmd_preview = cmd.strip()[:60].replace('\n', ' ')
            try:
                cur.execute(cmd)
                print(f"✅ [{i}/{len(SQL_COMMANDS)}] {cmd_preview}...")
            except Exception as e:
                print(f"⚠️  [{i}/{len(SQL_COMMANDS)}] {cmd_preview}... - {str(e)[:50]}")
        
        print("\n📋 Verificando políticas criadas...")
        cur.execute("""
            SELECT policyname, cmd 
            FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage'
            ORDER BY policyname
        """)
        policies = cur.fetchall()
        
        print(f"\n✅ {len(policies)} políticas encontradas:")
        for policy in policies:
            print(f"   - {policy[0]} ({policy[1]})")
        
        print("\n📦 Verificando buckets...")
        cur.execute("SELECT id, name, public FROM storage.buckets ORDER BY name")
        buckets = cur.fetchall()
        
        print(f"\n✅ {len(buckets)} buckets encontrados:")
        for bucket in buckets:
            status = "público" if bucket[2] else "privado"
            print(f"   - {bucket[1]} ({status})")
        
        cur.close()
        conn.close()
        
        print("\n🎉 Configuração concluída com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())

