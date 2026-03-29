import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { comarcas } from "@/lib/db/schema/comarcas";
import { eq } from "drizzle-orm";
import Image from "next/image";
import { ActivateForm } from "./activate-form";

export const dynamic = "force-dynamic";

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
            <h1 className="font-serif text-xl font-semibold text-zinc-100 tracking-tight">
              OMBUDS
            </h1>
            <p className="text-[10px] font-light tracking-[0.2em] uppercase text-zinc-500 mt-1">
              Gestao para Defesa Criminal
            </p>
          </div>

          <div className="w-8 h-px bg-zinc-800 mx-auto mb-6" />

          <div className="text-center">
            <p className="text-sm text-red-400">
              Link invalido ou ja utilizado.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Se voce ja ativou sua conta, faca login normalmente.
            </p>
            <a
              href="/login"
              className="inline-block mt-4 text-xs text-emerald-500 hover:text-emerald-400 transition-colors duration-200"
            >
              Ir para o login
            </a>
          </div>

          <div className="mt-10 pt-5 border-t border-zinc-800/50">
            <p className="text-center text-[10px] text-zinc-700 tracking-wide">
              Defensoria Publica do Estado da Bahia
            </p>
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
        {/* Logo + Identidade */}
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
          <h1 className="font-serif text-xl font-semibold text-zinc-100 tracking-tight">
            OMBUDS
          </h1>
          <p className="text-[10px] font-light tracking-[0.2em] uppercase text-zinc-500 mt-1">
            Gestao para Defesa Criminal
          </p>
        </div>

        <div className="w-8 h-px bg-zinc-800 mx-auto mb-6" />

        {/* Boas-vindas + Info do usuario */}
        <div className="text-center mb-6">
          <p className="text-sm text-zinc-300">
            Bem-vindo ao OMBUDS!
          </p>
          <p className="text-base font-semibold text-zinc-100 mt-2">
            {user.name}
          </p>

          {/* Comarca badge */}
          {comarca && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                {comarca.nome}
              </span>
            </div>
          )}

          {/* Areas badges */}
          {user.areasPrincipais && user.areasPrincipais.length > 0 && (
            <div className="mt-2 flex justify-center flex-wrap gap-1.5">
              {user.areasPrincipais.map((area) => (
                <span
                  key={area}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getAreaStyle(area)}`}
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-8 h-px bg-zinc-800 mx-auto mb-6" />

        {/* Formulario */}
        <ActivateForm token={token} userEmail={user.email} />

        {/* Footer institucional */}
        <div className="mt-10 pt-5 border-t border-zinc-800/50">
          <p className="text-center text-[10px] text-zinc-700 tracking-wide">
            Defensoria Publica do Estado da Bahia
          </p>
        </div>
      </div>
    </div>
  );
}

function getAreaStyle(area: string): string {
  const lower = area.toLowerCase();
  if (lower.includes("criminal") || lower.includes("penal")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (lower.includes("civel") || lower.includes("cível")) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (lower.includes("infancia") || lower.includes("infância") || lower.includes("juventude")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (lower.includes("familia") || lower.includes("família")) {
    return "bg-pink-500/10 text-pink-400 border-pink-500/20";
  }
  if (lower.includes("fazenda") || lower.includes("publica") || lower.includes("pública")) {
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  }
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}
