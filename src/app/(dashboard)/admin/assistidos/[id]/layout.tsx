"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { User, Briefcase, ClipboardList, CalendarDays, FileText, Microscope, Contact, Clock, Newspaper, MessageCircle, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { statusConfig } from "../_components/assistido-config";
import { AtendimentoFormModal } from "@/components/atendimentos/atendimento-form-modal";
import { whatsappUrl } from "@/components/atendimentos/config";
import { statusPrisionalInfo } from "@/lib/config/tipologia";
import { EntityPageHeader } from "@/components/layouts/entity-page-header";

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

const STATUS_CONCLUIDO = new Set(["CONCLUIDO", "ARQUIVADO"]);

export default function AssistidoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = Number(params?.id);
  const [agendar, setAgendar] = useState(false);

  const { data: assistido } = trpc.assistidos.getById.useQuery({ id }, { enabled: !isNaN(id) });

  // Contadores por aba (do payload já cacheado do getById): casos, demandas em
  // aberto e audiências futuras — orientação imediata na nav.
  const contadores = useMemo(() => {
    if (!assistido) return { casos: 0, demandas: 0, audiencias: 0, demandasAtrasadas: 0, audienciasHoje: 0 };
    const agora = Date.now();
    const hojeStr = new Date().toDateString();
    const demandasAbertas = (assistido.demandas ?? []).filter(
      (d) => !STATUS_CONCLUIDO.has(String(d.status ?? "").toUpperCase()),
    );
    const demandasAtrasadas = demandasAbertas.filter(
      (d) => d.prazo && new Date(d.prazo).getTime() < agora,
    ).length;
    const audFuturas = (assistido.audiencias ?? []).filter((a) => {
      const t = new Date(a.dataAudiencia).getTime();
      return t >= agora && !String(a.status ?? "").toLowerCase().includes("cancel");
    });
    const audienciasHoje = audFuturas.filter(
      (a) => new Date(a.dataAudiencia).toDateString() === hojeStr,
    ).length;
    return {
      casos: (assistido.casosAgrupados ?? []).length,
      demandas: demandasAbertas.length,
      audiencias: audFuturas.length,
      demandasAtrasadas,
      audienciasHoje,
    };
  }, [assistido]);

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

  // Faixa de abas (nav nível 1) — renderada como banda inferior do header de
  // entidade, dentro do mesmo shell sticky charcoal. Visual de abas preservado.
  const tabNav = (
    <nav className="border-b border-white/[0.08] bg-[#464649] dark:bg-[#1e1e20] px-4 sm:px-5 flex gap-1 overflow-x-auto scrollbar-hide">
      {NIVEL_1_TABS.map((t) => {
        const Icon = t.icon;
        const href = t.path ? `${base}/${t.path}` : base;
        const isActive = activeKey === t.key;
        const count = t.key === "casos" ? contadores.casos : t.key === "demandas" ? contadores.demandas : t.key === "audiencias" ? contadores.audiencias : 0;
        const urgente = t.key === "demandas" ? contadores.demandasAtrasadas : t.key === "audiencias" ? contadores.audienciasHoje : 0;
        const urgenteTone = t.key === "demandas" ? "bg-rose-500/30 text-rose-100" : "bg-amber-500/30 text-amber-100";
        return (
          <Link
            key={t.key}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1 px-3 py-2 text-xs border-b-2 whitespace-nowrap transition-colors",
              isActive
                ? "border-emerald-400 text-white font-medium"
                : "border-transparent text-white/55 hover:text-white/85",
            )}
          >
            <Icon className="w-3 h-3" />
            {t.label}
            {count ? (
              <span
                className={cn(
                  "ml-0.5 min-w-[15px] rounded-full px-1 text-center text-[9px] font-semibold tabular-nums",
                  isActive
                    ? "bg-emerald-500/25 text-emerald-200"
                    : "bg-white/[0.08] text-white/55",
                )}
              >
                {count}
              </span>
            ) : null}
            {urgente ? (
              <span
                className={cn("min-w-[15px] rounded-full px-1 text-center text-[9px] font-bold tabular-nums", urgenteTone)}
                title={t.key === "demandas" ? `${urgente} atrasada(s)` : `${urgente} hoje`}
              >
                {urgente}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col h-full">
      <EntityPageHeader
        name={assistido?.nome ?? "Carregando…"}
        avatar={
          <AssistidoAvatar
            nome={assistido?.nome ?? "—"}
            photoUrl={assistido?.photoUrl}
            size="md"
            statusPrisional={assistido?.statusPrisional}
            showStatusDot
          />
        }
        metadata={
          <>
            {assistido && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  preso && "bg-rose-500/20 text-rose-200",
                  monit && "bg-amber-500/20 text-amber-200",
                  !preso && !monit && "bg-emerald-500/20 text-emerald-200",
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", preso ? "bg-rose-400" : monit ? "bg-amber-400" : "bg-emerald-400")} />
                {spInfo?.label ?? statusLabel}
              </span>
            )}
            {assistido?.cpf && (
              <span className="font-mono tabular-nums text-[11px] text-white/55">{assistido.cpf}</span>
            )}
            {assistido?.telefone && (
              <span className="text-[11px] text-white/55">☎ {assistido.telefone}</span>
            )}
          </>
        }
        actions={
          assistido ? (
            <>
              {zap && (
                <a
                  href={zap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium bg-green-500/20 text-green-200 hover:bg-green-500/30 transition-colors cursor-pointer"
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
            </>
          ) : null
        }
        belowBand={tabNav}
      />

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
