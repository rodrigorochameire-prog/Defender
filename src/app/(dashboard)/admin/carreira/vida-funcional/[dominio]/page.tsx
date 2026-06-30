"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { getDominio } from "@/lib/vida-funcional/dominios";
import { type VfTipo } from "@/lib/vida-funcional/tipo-cluster";
import { vfIcon } from "../_components/icon-map";
import { DrivePanel } from "./_components/drive-panel";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EventoFormDialog } from "../_components/evento-form-dialog";
import { tipoLabel, statusLabel } from "@/lib/vida-funcional/labels";
import { CarreiraCard } from "@/components/carreira";

export default function DominioPage({ params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = use(params);
  const cfg = getDominio(dominio);
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | undefined>(undefined);
  const [toDelete, setToDelete] = useState<{ id: number; titulo: string } | null>(null);
  const delM = trpc.vidaFuncional.deleteEvento.useMutation({
    onSuccess: () => { utils.vidaFuncional.listEventos.invalidate(); setToDelete(null); },
    onError: (e) => toast.error(e.message),
  });

  const { data: eventos = [], isLoading } = trpc.vidaFuncional.listEventos.useQuery(
    { tipos: cfg?.tipos as VfTipo[] | undefined },
    { enabled: !!cfg },
  );

  if (!cfg) {
    return (
      <div className="p-8">
        <Link href="/admin/carreira/vida-funcional" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <p className="mt-4 text-muted-foreground">Domínio &quot;{dominio}&quot; não encontrado.</p>
      </div>
    );
  }

  const Icon = vfIcon(cfg.icon);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-4 border-b border-border/60 bg-white dark:bg-neutral-900/50">
        <Link href="/admin/carreira/vida-funcional" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Vida Funcional
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <Icon className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-semibold">{cfg.label}</h1>
          <span className="text-sm text-muted-foreground tabular-nums">({eventos.length})</span>
          <Button size="sm" className="ml-auto cursor-pointer" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo evento
          </Button>
        </div>
      </div>

      <div className="px-5 md:px-8 py-4 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento neste domínio ainda.</p>
        ) : (
          eventos.map((e) => {
            const open = openId === e.id;
            return (
              <CarreiraCard key={e.id}>
                <div className="w-full text-left p-4 flex items-center gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId(open ? null : e.id)}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setOpenId(open ? null : e.id); } }}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    {e.driveFolderId ? (open ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />) : <span className="w-4" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{e.titulo}</p>
                      <p className="text-xs text-muted-foreground font-mono">{e.dataEvento} · {statusLabel(e.status)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400">{tipoLabel(e.tipo)}</span>
                    <button
                      className="p-1 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer"
                      onClick={() => { setEditing(e); setFormOpen(true); }}
                      aria-label="Editar evento"
                    >
                      <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                      onClick={() => setToDelete({ id: e.id, titulo: e.titulo })}
                      aria-label="Excluir evento"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                {open && e.driveFolderId && (
                  <div className="px-4 pb-4">
                    <DrivePanel folderId={e.driveFolderId} />
                  </div>
                )}
              </CarreiraCard>
            );
          })
        )}
      </div>
      <EventoFormDialog open={formOpen} onOpenChange={setFormOpen} evento={editing} tipoInicial={cfg.tipos[0]} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>Excluir &quot;{toDelete?.titulo}&quot;? Esta ação arquiva o evento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={() => toDelete && delM.mutate({ id: toDelete.id })}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
