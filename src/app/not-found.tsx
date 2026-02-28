import Link from "next/link";
import Image from "next/image";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-[#0f0f11] p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-6 max-w-md">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 flex items-center justify-center">
          <Image
            src="/logo-light.png"
            alt="OMBUDS"
            width={72}
            height={72}
            priority
            className="object-contain dark:hidden opacity-30"
          />
          <Image
            src="/logo-dark.png"
            alt="OMBUDS"
            width={72}
            height={72}
            priority
            className="object-contain hidden dark:block opacity-30"
          />
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-zinc-900 dark:text-zinc-100">404</h1>
          <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Página não encontrada
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            A página que você procura não existe ou foi movida.
          </p>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-zinc-300 dark:bg-zinc-700 mx-auto" />

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="gap-2 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors duration-200"
            asChild
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Ir para o início
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-200"
            asChild
          >
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600 pt-4">
          OMBUDS — Ecossistema de Defesa Criminal
        </p>
      </div>
    </div>
  );
}
