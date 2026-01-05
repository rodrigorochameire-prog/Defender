import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// Rota para corrigir usuário para tutor
export async function GET(request: NextRequest) {
  const tutorEmail = "rodrigomeire88@gmail.com";
  
  try {
    const [updated] = await db
      .update(users)
      .set({
        role: "user",
        approvalStatus: "approved",
        updatedAt: new Date(),
      })
      .where(eq(users.email, tutorEmail))
      .returning();

    if (!updated) {
      return NextResponse.json({
        message: "Usuário não encontrado",
        email: tutorEmail,
      });
    }

    return NextResponse.json({
      message: "Usuário alterado para tutor com sucesso",
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        approvalStatus: updated.approvalStatus,
      },
    });
  } catch (error: any) {
    console.error("[FixTutor] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

