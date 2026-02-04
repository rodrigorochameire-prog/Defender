"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Share2, Calendar, User, Clock, MapPin, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompartilharEventoModalProps {
  evento: {
    id: number;
    title: string;
    eventDate: Date | string;
    eventType: string;
    location?: string | null;
    assistido?: { nome: string } | null;
    processo?: { numeroAutos: string } | null;
  };
  profissionalAtualId: number;
  trigger?: React.ReactNode;
}

export function CompartilharEventoModal({
  evento,
  profissionalAtualId,
  trigger,
}: CompartilharEventoModalProps) {
  const [open, setOpen] = useState(false);
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [compartilharSerie, setCompartilharSerie] = useState(false);

  // Buscar profissionais (estagiários e outros)
  const { data: profissionais = [] } = trpc.profissionais.list.useQuery();

  // Filtrar apenas estagiários vinculados ao defensor atual
  const estagiarios = profissionais.filter(
    (p: any) => p.grupo === "estagiario" && p.supervisorId === profissionalAtualId
  );

  // Outros profissionais (para compartilhamento entre defensores)
  const outrosProfissionais = profissionais.filter(
    (p: any) => p.id !== profissionalAtualId && p.grupo !== "estagiario"
  );

  // Mutation para compartilhar
  const compartilharMutation = trpc.profissionais.compartilhar.useMutation({
    onSuccess: () => {
      toast.success("Evento compartilhado com sucesso!");
      setOpen(false);
      setDestinatarioId("");
      setMotivo("");
    },
    onError: (error) => {
      toast.error("Erro ao compartilhar: " + error.message);
    },
  });

  const handleCompartilhar = () => {
    if (!destinatarioId) {
      toast.error("Selecione um destinatário");
      return;
    }

    compartilharMutation.mutate({
      entidadeTipo: "audiencia", // Usando audiencia como tipo genérico para eventos
      entidadeId: evento.id,
      compartilhadoPorId: profissionalAtualId,
      compartilhadoComId: parseInt(destinatarioId),
      motivo: motivo || undefined,
    });
  };

  const eventDate = typeof evento.eventDate === "string" 
    ? new Date(evento.eventDate) 
    : evento.eventDate;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Compartilhar Evento
          </DialogTitle>
          <DialogDescription>
            Compartilhe este evento da sua agenda com um estagiário ou colega.
          </DialogDescription>
        </DialogHeader>

        {/* Preview do Evento */}
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {evento.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <Clock className="w-3 h-3" />
                {format(eventDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              {evento.location && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {evento.location}
                </div>
              )}
            </div>
          </div>
          
          {/* Tags do evento */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className="text-[10px]">
              {evento.eventType}
            </Badge>
            {evento.assistido && (
              <Badge variant="outline" className="text-[10px]">
                <User className="w-2.5 h-2.5 mr-1" />
                {evento.assistido.nome}
              </Badge>
            )}
            {evento.processo && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {evento.processo.numeroAutos}
              </Badge>
            )}
          </div>
        </div>

        {/* Formulário */}
        <div className="space-y-4 py-2">
          {/* Seleção de destinatário */}
          <div className="space-y-2">
            <Label>Compartilhar com</Label>
            <Select value={destinatarioId} onValueChange={setDestinatarioId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um destinatário" />
              </SelectTrigger>
              <SelectContent>
                {/* Estagiários vinculados */}
                {estagiarios.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 dark:bg-zinc-900">
                      Meus Estagiários
                    </div>
                    {estagiarios.map((est: any) => (
                      <SelectItem key={est.id} value={est.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-600" />
                          </div>
                          {est.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {/* Outros profissionais */}
                {outrosProfissionais.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 dark:bg-zinc-900 mt-1">
                      Outros Profissionais
                    </div>
                    {outrosProfissionais.map((prof: any) => (
                      <SelectItem key={prof.id} value={prof.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-600" />
                          </div>
                          {prof.nomeCurto || prof.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo/Observação */}
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Ex: Preciso que você prepare os documentos para esta audiência..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              O destinatário receberá uma notificação e poderá visualizar este evento na sua agenda compartilhada.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCompartilhar}
            disabled={!destinatarioId || compartilharMutation.isPending}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            {compartilharMutation.isPending ? "Compartilhando..." : "Compartilhar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompartilharEventoModal;
