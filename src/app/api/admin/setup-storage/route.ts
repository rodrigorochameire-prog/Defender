import { NextRequest, NextResponse } from "next/server";
import { setupStorageBuckets } from "@/lib/supabase/setup-storage";
import { getSession } from "@/lib/auth/session";

/**
 * API Route para configurar os buckets de storage do Supabase
 * Apenas admins podem acessar
 * 
 * POST /api/admin/setup-storage
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissão de admin
    const session = await getSession();
    
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado. Apenas administradores podem executar esta ação." },
        { status: 403 }
      );
    }

    // Executar setup
    const result = await setupStorageBuckets();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Storage configurado com sucesso!",
        details: result,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Erro ao configurar storage",
        details: result,
        manualSteps: result.policies?.manual
          ? "As políticas RLS precisam ser configuradas manualmente no Supabase Dashboard. Execute o SQL do arquivo SUPABASE_STORAGE_SETUP.sql"
          : undefined,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Erro no setup de storage:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Verificar status dos buckets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 403 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requiredBuckets = ["pet-photos", "documents", "wall-media"];
    const existingBuckets = buckets?.map((b) => b.id) || [];
    const missingBuckets = requiredBuckets.filter((b) => !existingBuckets.includes(b));

    return NextResponse.json({
      configured: missingBuckets.length === 0,
      existingBuckets,
      missingBuckets,
      allBuckets: buckets,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

