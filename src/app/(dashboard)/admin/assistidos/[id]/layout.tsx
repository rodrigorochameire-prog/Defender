"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { User, Briefcase, ClipboardList, CalendarDays, FileText, Microscope, Contact, Clock, Newspaper, MessageCircle, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { statusConfig } from "../_components/assistido-config";
import { AtendimentoFormModal } from "@/components/atendimentos/atendimento-form-modal";
import { whatsappUrl } from "@/components/atendimentos/config";
import { statusPrisionalInfo } from "@/lib/config/tipologia";

const NIVEL_1_TABS = [
  { key: "geral",       label: "Geral",       icon: User,          path: "" },
  { key: "casos",       label: "Casos",       icon: Briefcase,     path: "casos" },
  { key: "demandas",    label: "Demandas",    icon: ClipboardList, path: "demandas" },
  { key: "audiencias",  label: "Audiências",  icon: CalendarDays,  path: "audiencias" },
  { key: "documentos",  label: "Documentos",  icon: FileText,      path: "documentos" },
  { key: "investigacao", label: "Investigação", icon: Microscope,  path: "investigacao" },
  { key: "pessoas",     label: "Pessoas",     icon: Contact,       path: "pessoas" },
  { key: "timeline",    label: "Timeline",    icon: Clock,         path: "timeline" },
  { key: "radar",       label: "Radar",       icon: Newspaper,     path: "radar" },
] as const;

export default function AssistidoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = Number(params?.id);
  const [agendar, setAgendar] = useState(false);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });

  const base = `/admin/assistidos/${id}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" || sub === "caso" ? "geral" : sub;

  // Identidade persistente (header único de todas as abas do assistido).
  const sp = String(assistido?.statusPrisional ?? "").toUpperCase();
  const preso = /CADEIA|PENITENC|PRESO|FECHADO|SEMIABERTO|REGIME|COP|HOSPITAL/.test(sp);
  const monit = /MONITOR|TORNOZEL|DOMICILIAR/.test(sp);
  const statusLabel =
    statusConfig[assistido?.statusPrisional ?? ""]?.label ?? (preso ? "Preso" : monit ? "Monitorado" : "Solto");
  // Cores do badge de status vêm da tipologia central (statusPrisionalInfo);
  // fallback no 3-way preso/monit/solto para valores de status livres.
  const spInfo = statusPrisionalInfo(assistido?.statusPrisional);
  const zap = whatsappUrl(assistido?.telefone) ?? whatsappUrl(assistido?.telefoneContato);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-6 py-3 bg-white dark:bg-neutral-950">
        <div className="flex flex-wrap items-center gap-3">
          <AssistidoAvatar
            nome={assistido?.nome ?? "—"}
            photoUrl={assistido?.photoUrl}
            size="md"
            statusPrisional={assistido?.statusPrisional}
            showStatusDot
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-[17px] font-semibold tracking-tight truncate text-neutral-900 dark:text-neutral-100">
                {assistido?.nome ?? "Carregando…"}
              </h1>
              {assistido && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    spInfo
                      ? cn(spInfo.bg, spInfo.color)
                      : cn(
                          preso && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
                          monit && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                          !preso && !monit && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                        ),
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", preso ? "bg-rose-500" : monit ? "bg-amber-500" : "bg-emerald-500")} />
                  {spInfo?.label ?? statusLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex-wrap">
              {assistido?.cpf && <span className="font-mono tabular-nums">{assistido.cpf}</span>}
              {assistido?.telefone && <span>☎ {assistido.telefone}</span>}
            </div>
          </div>
          {assistido && (
            <div className="flex w-full sm:w-auto shrink-0 items-center justify-end gap-2 flex-wrap">
              {zap && (
                <a
                  href={zap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setAgendar(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" /> Atendimento
              </button>
            </div>
          )}
        </div>
      </header>

      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950 overflow-x-auto scrollbar-hide">
        {NIVEL_1_TABS.map((t) => {
          const Icon = t.icon;
          const href = t.path ? `${base}/${t.path}` : base;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1 px-3 py-2 text-xs border-b-2 whitespace-nowrap",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>

      <AtendimentoFormModal
        open={agendar}
        onClose={() => setAgendar(false)}
        prefill={
          assistido
            ? { assistidoId: id, assistidoNome: assistido.nome, subtipo: "inicial" }
            : null
        }
      />
    </div>
  );
}
