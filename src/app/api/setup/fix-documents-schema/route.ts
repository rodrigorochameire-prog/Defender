import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    /**
     * Ajusta ambientes que foram criados com schema antigo:
     * - name -> title
     * - created_by_id -> uploaded_by_id
     *
     * Além disso, garante que colunas essenciais existam (como nullable, para não quebrar ambientes com dados).
     */
    await db.execute(sql`
      DO $$
      BEGIN
        IF to_regclass('public.documents') IS NULL THEN
          RAISE EXCEPTION 'Tabela public.documents não existe';
        END IF;

        -- Renomear created_by_id -> uploaded_by_id (se necessário)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='created_by_id'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='uploaded_by_id'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents RENAME COLUMN created_by_id TO uploaded_by_id';
        END IF;

        -- Renomear name -> title (se necessário)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='name'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='title'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents RENAME COLUMN name TO title';
        END IF;

        -- Garantir colunas (como nullable)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='uploaded_by_id'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents ADD COLUMN uploaded_by_id integer';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='title'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents ADD COLUMN title varchar(200)';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='description'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents ADD COLUMN description text';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='file_type'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents ADD COLUMN file_type varchar(50)';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='documents' AND column_name='file_size'
        ) THEN
          EXECUTE 'ALTER TABLE public.documents ADD COLUMN file_size integer';
        END IF;
      END $$;
    `);

    return NextResponse.json({
      success: true,
      message: "Schema de documents ajustado com sucesso.",
    });
  } catch (error: any) {
    console.error("[fix-documents-schema] Erro:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao ajustar schema de documents" },
      { status: 500 }
    );
  }
}

