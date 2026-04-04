"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { FileSpreadsheet, CheckCircle2, ExternalLink, Link2, AlertTriangle, Unlink } from "lucide-react";

export default function PlanilhaPage() {
  const { data: gs, isLoading, refetch } = trpc.googleIntegration.myStatus.useQuery();
  const { data: authUrl } = trpc.googleIntegration.getAuthUrl.useQuery({ returnTo: "/admin/settings/planilha" });
  const createSheets = trpc.googleIntegration.createSheets.useMutation({ onSuccess: () => refetch() });
  const unlink = trpc.googleIntegration.unlink.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64 bg-neutral-800" />
      <Skeleton className="h-48 bg-neutral-800 rounded-lg" />
    </div>
  );

  // State 1: Google not linked
  if (!gs?.googleLinked) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-lg font-bold text-neutral-100 mb-6 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
          Sincronizar com Google Sheets
        </h1>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-neutral-400">Sincronize suas demandas com uma planilha do Google para acompanhar de qualquer lugar.</p>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300">Use sua conta Google pessoal (@gmail.com). Contas institucionais podem ter restrições.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-300">Passo a passo:</p>
              <ol className="text-xs text-neutral-500 space-y-1 list-decimal list-inside">
                <li>Clique no botão abaixo</li>
                <li>Uma janela do Google vai abrir</li>
                <li>Faça login com seu email Google</li>
                <li>Clique em &quot;Permitir&quot;</li>
                <li>Pronto! Voltará automaticamente</li>
              </ol>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              if (authUrl?.url) window.location.href = authUrl.url;
            }}>
              <Link2 className="h-4 w-4 mr-2" /> Vincular minha conta Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 2: Google linked, no spreadsheet
  if (!gs.sheetsSpreadsheetUrl) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-lg font-bold text-neutral-100 mb-6 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
          Sincronizar com Google Sheets
        </h1>
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-400">Google vinculado: {gs.googleEmail}</p>
            </div>
            <p className="text-sm text-neutral-400">Sua planilha personalizada será criada com abas para cada área que você atua.</p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => createSheets.mutate()}
              disabled={createSheets.isPending}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {createSheets.isPending ? "Criando planilha..." : "Criar minha planilha"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State 3: Everything linked
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-bold text-neutral-100 mb-6 flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
        Google Sheets — Sincronizado
      </h1>
      <Card className="bg-neutral-900 border-emerald-800/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm text-emerald-400">Conta: {gs.googleEmail}</p>
          </div>
          <a href={gs.sheetsSpreadsheetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-800 hover:border-emerald-800/50 transition-colors">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-200 truncate">Abrir planilha</p>
              <p className="text-xs text-neutral-500 truncate">{gs.sheetsSpreadsheetUrl}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-500" />
          </a>
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-800">
            <span>Sync: {gs.sheetsSyncEnabled ? "Ativo" : "Desativado"}</span>
            <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300"
              onClick={() => { if (confirm("Desvincular Google? Isso não apaga a planilha.")) unlink.mutate(); }}>
              <Unlink className="h-3 w-3 mr-1" /> Desvincular
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
