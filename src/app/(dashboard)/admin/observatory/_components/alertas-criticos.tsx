"use client";

import { trpc } from "@/lib/trpc/client";
import { AlertTriangle, Wifi, UserX, Mail } from "lucide-react";
import Link from "next/link";

export function AlertasCriticos() {
  const { data } = trpc.observatory.getAlertas.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  if (!data) return null;

  const total =
    data.whatsappDesconectados.length +
    data.defensoresInativos.length +
    data.convitesExpirados.length;

  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="font-medium text-red-800 dark:text-red-200">
            {total} {total === 1 ? "alerta requer" : "alertas requerem"} atenção
          </p>
          <ul className="mt-2 space-y-1">
            {data.whatsappDesconectados.map((w) => (
              <li key={w.id} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <Wifi className="h-3.5 w-3.5 flex-shrink-0" />
                WhatsApp <strong>{w.instance_name}</strong> desconectado
                <Link href="/admin/whatsapp/chat" className="ml-auto text-xs underline">
                  Reconectar →
                </Link>
              </li>
            ))}
            {data.defensoresInativos.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <UserX className="h-3.5 w-3.5 flex-shrink-0" />
                <strong>{d.name}</strong> sem acesso há mais de 7 dias
                <Link href="/admin/usuarios" className="ml-auto text-xs underline">
                  Ver usuário →
                </Link>
              </li>
            ))}
            {data.convitesExpirados.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                Convite para <strong>{c.email}</strong> pendente há mais de 14 dias
                <Link href="/admin/usuarios/convite" className="ml-auto text-xs underline">
                  Reenviar →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
