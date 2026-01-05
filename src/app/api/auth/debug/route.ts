import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Buscar usuário por email (case insensitive)
    const targetEmail = "rodrigorochameire@gmail.com";
    
    // Buscar exato
    const exactUser = await db.query.users.findFirst({
      where: eq(users.email, targetEmail),
    });

    // Buscar todos os usuários para debug
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
    }).from(users).limit(10);

    // Forçar atualização para admin
    if (exactUser && exactUser.role !== "admin") {
      const [updated] = await db
        .update(users)
        .set({
          role: "admin",
          approvalStatus: "approved",
          updatedAt: new Date(),
        })
        .where(eq(users.id, exactUser.id))
        .returning();

      return NextResponse.json({
        message: "Admin FORÇADO com sucesso",
        before: exactUser,
        after: updated,
        allUsers,
      });
    }

    return NextResponse.json({
      targetEmail,
      exactUser,
      allUsers,
      isAdmin: exactUser?.role === "admin",
    });
  } catch (error: any) {
    console.error("[Debug] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

