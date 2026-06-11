"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Copy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Seção "Calendários (Outlook/ICS)" — URLs dos feeds para assinar no Outlook
 * institucional (Adicionar Calendário → Assinar da web). Um feed = um
 * calendário, espelhando a separação por atribuição.
 */
export function IcsFeedsSection() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.settings.icsFeeds.useQuery();
  const gerar = trpc.settings.gerarIcsToken.useMutation({
    onSuccess: () => {
      utils.settings.icsFeeds.invalidate();
      toast.success("Token gerado — as URLs abaixo já valem.");
    },
    onError: (e) => toast.error("Erro ao gerar token", { description: e.message }),
  });

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const urlDe = (slug: string) => `${base}/api/ics/${slug}?t=${data?.token}`;

  const copiar = (slug: string) => {
    navigator.clipboard.writeText(urlDe(slug));
    toast.success("URL copiada");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Calendários (Outlook / ICS)
        </CardTitle>
        <CardDescription>
          Assine cada feed no Outlook em “Adicionar Calendário → Assinar da web”.
          Cada URL vira um calendário separado (Júri, VVD, EP, substituições,
          atendimentos e prazos). As URLs são secretas — regenerar o token
          invalida as anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !data?.token ? (
          <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
            {gerar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="mr-2 h-4 w-4" />
            )}
            Gerar URLs dos calendários
          </Button>
        ) : (
          <>
            <div className="space-y-1.5">
              {data.feeds.map((f) => (
                <div
                  key={f.slug}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.nome}</p>
                    <p className="truncate font-mono text-[11px] text-neutral-500">
                      /api/ics/{f.slug}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => copiar(f.slug)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar URL
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-neutral-500"
              onClick={() => gerar.mutate()}
              disabled={gerar.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar token (invalida as URLs atuais)
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
