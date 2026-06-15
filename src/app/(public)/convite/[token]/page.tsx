import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { comarcas } from "@/lib/db/schema/comarcas";
import { eq } from "drizzle-orm";
import Image from "next/image";
import { ActivateForm } from "./activate-form";

export const dynamic = "force-dynamic";

function Header() {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <Image
          src="/logo-dark.png"
          alt="OMBUDS"
          width={52}
          height={52}
          priority
          className="object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]"
        />
      </div>
      <h1 className="font-serif text-2xl font-semibold text-neutral-100 tracking-tight">
        OMBUDS
      </h1>
      <p className="text-[10px] font-light tracking-[0.2em] uppercase text-neutral-500 mt-1">
        Gestão para Defesa Criminal
      </p>
    </div>
  );
}

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Buscar usuario pelo token
  const user = await db.query.users.findFirst({
    where: eq(users.inviteToken, token),
  });

  // Token invalido ou ja utilizado
  if (!user || !user.mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f11] relative overflow-hidden py-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm mx-auto px-6">
          <Header />

          <div className="w-8 h-px bg-border mx-auto mb-6" />

          <div className="text-center">
            <p className="text-sm text-red-400">
              Link inválido ou já utilizado.
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              Se você já ativou sua conta, faça login normalmente.
            </p>
            <a
              href="/login"
              className="inline-block mt-4 text-xs text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
            >
              Ir para o login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Buscar comarca
  const comarca = await db.query.comarcas.findFirst({
    where: eq(comarcas.id, user.comarcaId),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f11] relative overflow-hidden py-10">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        <Header />

        <div className="w-8 h-px bg-border mx-auto mb-6" />

        {/* Saudação minimalista */}
        <div className="text-center mb-6">
          <p className="text-xs text-neutral-500">Bem-vindo(a) ao OMBUDS</p>
          <p className="text-sm font-medium text-neutral-200 mt-1">
            {user.name}
          </p>
          {comarca && (
            <p className="text-[11px] text-neutral-500 mt-1">{comarca.nome}</p>
          )}
        </div>

        {/* Formulario */}
        <ActivateForm token={token} userEmail={user.email} />
      </div>
    </div>
  );
}
