"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TIPO_OPTIONS, STATUS_LABELS } from "@/lib/vida-funcional/labels";

interface EventoLike {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string | null;
  dataEvento: string;
  dataFim: string | null;
  prazo: string | null;
  status: string;
  valorCents: number | null;
  driveFolderId: string | null;
  dados: Record<string, unknown>;
}

const STATUS_VALUES = ["previsto", "em_curso", "concluido", "pendente", "arquivado"];
const TIPOS_MONETARIOS = ["DIARIA", "GRATIFICACAO", "SUBSTITUICAO", "REEMBOLSO"];
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function EventoFormDialog({
  open, onOpenChange, evento, tipoInicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  evento?: EventoLike;
  tipoInicial?: string;
}) {
  const utils = trpc.useUtils();
  const editing = !!evento;

  const [tipo, setTipo] = useState<string>(evento?.tipo ?? tipoInicial ?? "FERIAS");
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [dataEvento, setDataEvento] = useState(evento?.dataEvento ?? "");
  const [dataFim, setDataFim] = useState(evento?.dataFim ?? "");
  const [prazo, setPrazo] = useState(evento?.prazo ?? "");
  const [status, setStatus] = useState(evento?.status ?? "previsto");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [driveFolderId, setDriveFolderId] = useState(evento?.driveFolderId ?? "");
  const [valorReais, setValorReais] = useState(evento?.valorCents != null ? String(evento.valorCents / 100) : "");
  // dados condicionais
  const [vencimento, setVencimento] = useState(str(evento?.dados?.vencimento));
  const [diariaSituacao, setDiariaSituacao] = useState(str(evento?.dados?.status) || "a_requerer");
  const [seiStatus, setSeiStatus] = useState(str(evento?.dados?.seiStatus) || "pendente");

  // re-sincroniza quando abre para outro evento
  useEffect(() => {
    if (!open) return;
    setTipo(evento?.tipo ?? tipoInicial ?? "FERIAS");
    setTitulo(evento?.titulo ?? "");
    setDataEvento(evento?.dataEvento ?? "");
    setDataFim(evento?.dataFim ?? "");
    setPrazo(evento?.prazo ?? "");
    setStatus(evento?.status ?? "previsto");
    setDescricao(evento?.descricao ?? "");
    setDriveFolderId(evento?.driveFolderId ?? "");
    setValorReais(evento?.valorCents != null ? String(evento.valorCents / 100) : "");
    setVencimento(str(evento?.dados?.vencimento));
    setDiariaSituacao(str(evento?.dados?.status) || "a_requerer");
    setSeiStatus(str(evento?.dados?.seiStatus) || "pendente");
  }, [open, evento, tipoInicial]);

  const onDone = () => {
    utils.vidaFuncional.listEventos.invalidate();
    onOpenChange(false);
  };
  const createM = trpc.vidaFuncional.createEvento.useMutation({
    onSuccess: () => { toast.success("Evento criado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateM = trpc.vidaFuncional.updateEvento.useMutation({
    onSuccess: () => { toast.success("Evento atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const saving = createM.isPending || updateM.isPending;

  function buildDados(): Record<string, unknown> {
    const d: Record<string, unknown> = { ...(evento?.dados ?? {}) };
    if (tipo === "FOLGA") d.vencimento = vencimento || undefined;
    if (tipo === "DIARIA") d.status = diariaSituacao;
    if (tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") d.seiStatus = seiStatus;
    return d;
  }

  function submit() {
    if (!titulo.trim()) return toast.error("Informe um título");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEvento)) return toast.error("Informe a data do evento");
    const base = {
      tipo: tipo as any,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      dataEvento,
      dataFim: dataFim || null,
      prazo: prazo || null,
      status: status as any,
      valorCents: valorReais ? Math.round(parseFloat(valorReais) * 100) : null,
      driveFolderId: driveFolderId.trim() || null,
      dados: buildDados(),
    };
    if (editing) updateM.mutate({ id: evento!.id, ...base });
    else createM.mutate(base);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1" placeholder="ex.: Férias 2º período" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do evento</Label>
              <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data fim (opcional)</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1" />
            </div>
          </div>

          {TIPOS_MONETARIOS.includes(tipo) && (
            <div>
              <Label>Valor (R$, opcional)</Label>
              <Input type="number" step="0.01" value={valorReais} onChange={(e) => setValorReais(e.target.value)} className="mt-1" />
            </div>
          )}

          {tipo === "FOLGA" && (
            <div>
              <Label>Vencimento da folga (opcional)</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="mt-1" />
            </div>
          )}
          {tipo === "DIARIA" && (
            <div>
              <Label>Situação da diária</Label>
              <Select value={diariaSituacao} onValueChange={setDiariaSituacao}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_requerer">A requerer</SelectItem>
                  <SelectItem value="requerida">Requerida</SelectItem>
                  <SelectItem value="recebida">Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") && (
            <div>
              <Label>Status SEI</Label>
              <Select value={seiStatus} onValueChange={setSeiStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Pasta do Drive (ID, opcional)</Label>
            <Input value={driveFolderId} onChange={(e) => setDriveFolderId(e.target.value)} className="mt-1" placeholder="ID da pasta do Google Drive" />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
