"use client";

import { trpc } from "@/lib/trpc/client";
import { Wifi, Database, Server } from "lucide-react";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    connected: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", label: "conectado" },
    disconnected: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: "desconectado" },
    connecting: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "conectando" },
    qr_code: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "QR pendente" },
  };
  const s = map[status] ?? { color: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400", label: status };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
  );
}

function RelativeTime({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-neutral-400">nunca</span>;
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 2) return <span className="text-emerald-600 dark:text-emerald-400">agora</span>;
  if (mins < 60) return <span className="text-neutral-500">{mins}min atrás</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span className="text-neutral-500">{hrs}h atrás</span>;
  return <span className="text-red-500">{Math.floor(hrs / 24)}d atrás</span>;
}

export function SaudeTecnica() {
  const { data, isLoading } = trpc.observatory.getSaudeTecnica.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />;
  if (!data) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Saúde Técnica
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* WhatsApp */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">WhatsApp</span>
          </div>
          <div className="space-y-2">
            {data.whatsapp.map((w) => (
              <div key={w.id} className="flex items-center gap-3 text-sm">
                <StatusBadge status={w.status} />
                <span className="flex-1 font-mono text-xs text-neutral-600 dark:text-neutral-400">{w.instance_name}</span>
                {w.phone_number && (
                  <span className="text-xs text-neutral-400">{w.phone_number}</span>
                )}
                <RelativeTime ts={w.last_sync_at} />
                {w.status !== "connected" && (
                  <Link href="/admin/whatsapp/chat" className="text-xs text-emerald-600 underline hover:text-emerald-700">
                    reconectar →
                  </Link>
                )}
              </div>
            ))}
            {data.whatsapp.length === 0 && (
              <p className="text-xs text-neutral-400">Nenhuma instância configurada.</p>
            )}
          </div>
        </div>

        {/* Infraestrutura */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Infraestrutura</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <Database className="h-3.5 w-3.5 text-neutral-400" />
              <span className="flex-1 text-neutral-600 dark:text-neutral-400">Banco de dados</span>
              <span className={`text-xs font-medium ${data.banco.latencyMs < 200 ? "text-emerald-600" : "text-amber-500"}`}>
                {data.banco.latencyMs}ms
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                ok
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Server className="h-3.5 w-3.5 text-neutral-400" />
              <span className="flex-1 text-neutral-600 dark:text-neutral-400">Vercel</span>
              <span className="font-mono text-xs text-neutral-400">{data.vercel.commit}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                ok
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
