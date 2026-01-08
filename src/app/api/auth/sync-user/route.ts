import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// Lista de emails que são admin
const ADMIN_EMAILS = ["rodrigorochameire@gmail.com"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    // Verificar se usuário já existe
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Criar novo usuário
      const [newUser] = await db
        .insert(users)
        .values({
          name: name || email.split("@")[0],
          email,
          role: isAdmin ? "admin" : "user",
          emailVerified: true,
        })
        .returning();

      user = newUser;
      console.log("[SyncUser] Novo usuário criado:", email, "- Role:", user.role);
    } else {
      // Se é um admin mas não está como admin no banco, corrigir
      if (isAdmin && user.role !== "admin") {
        const [updated] = await db
          .update(users)
          .set({
            role: "admin",
            updatedAt: new Date(),
          })
          .where(eq(users.email, email))
          .returning();
        user = updated;
        console.log("[SyncUser] Admin corrigido:", email);
      } else {
        console.log("[SyncUser] Usuário existente:", email, "- Role:", user.role);
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("[SyncUser] Error:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar usuário" },
      { status: 500 }
    );
  }
}
