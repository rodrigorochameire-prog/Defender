import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f11] relative overflow-hidden py-10">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Image
              src="/logo-dark.png"
              alt="OMBUDS"
              width={64}
              height={64}
              priority
              className="object-contain drop-shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-neutral-100 tracking-tight">
            OMBUDS
          </h1>
          <p className="text-[10px] font-light tracking-[0.2em] uppercase text-neutral-500 mt-2">
            Gestão para Defesa Criminal
          </p>
        </div>

        <div className="w-8 h-px bg-border mx-auto mb-8" />

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="gap-2 h-12 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors duration-200"
            asChild
          >
            <Link href="/login">
              Entrar
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-border/60 bg-transparent text-neutral-300 hover:bg-neutral-900/50 hover:border-emerald-700/60 hover:text-neutral-100 transition-colors duration-200"
            asChild
          >
            <Link href="/register">Criar Conta</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
