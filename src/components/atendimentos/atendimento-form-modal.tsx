"use client";

// Modal de criação/edição de atendimento — grava via registros.agendar /
// registros.update. Autocomplete de assistido ao vivo (vincula por id, sem
// duplicar) e CNJs citados como chips livres.

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AudioRecorder, uploadAudioAtendimento, type AudioGravado } from "@/components/atendimentos/audio-recorder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X, Check } from "lucide-react";
import {
  AREA_OPTIONS,
  SUBTIPO_OPTIONS,
  AREA_TO_ATRIBUICAO_ENUM,
  type AtendimentoListItem,
} from "./config";
import { OutcomeChoiceCardGroup } from "./outcome-choice-card-group";

/** Pré-preenchimento para criar (ex.: agendar retorno a partir de outro atendimento). */
export interface AtendimentoPrefill {
  assistidoId: number;
  assistidoNome: string;
  processoId?: number | null;
  area?: string | null;
  subtipo?: "inicial" | "retorno";
  pedido?: string | null;
}

interface AtendimentoFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Quando presente, o modal edita em vez de criar. */
  editing?: AtendimentoListItem | null;
  /** Cria já preenchido e com o assistido travado (ex.: retorno). */
  prefill?: AtendimentoPrefill | null;
  /** Data inicial (yyyy-MM-dd) ao criar — ex.: clique num dia da agenda. */
  initialDate?: string | null;
}

interface FormState {
  assistidoId: number | null;
  assistidoNome: string;
  data: string;
  hora: string;
  subtipo: string;
  area: string;
  pedido: string;
  numeroSolar: string;
  local: string;
  assunto: string;
  anotacoesRecepcao: string;
  processoId: number | null;
  /** CNJ do processo a vincular quando o assistido ainda não tem processo no sistema. */
  numeroAutosNovo: string;
  cnjsCitados: string[];
}

const EMPTY_FORM: FormState = {
  assistidoId: null,
  assistidoNome: "",
  data: "",
  hora: "",
  subtipo: "inicial",
  area: "CRIMINAL",
  pedido: "Consulta-Orientação",
  numeroSolar: "",
  local: "",
  assunto: "",
  anotacoesRecepcao: "",
  processoId: null,
  numeroAutosNovo: "",
  cnjsCitados: [],
};

export function AtendimentoFormModal({ open, onClose, editing, prefill, initialDate }: AtendimentoFormModalProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [cnjDraft, setCnjDraft] = useState("");
  // Walk-in: assistido apareceu na sede sem agendamento — registra direto como realizado
  const [registrarRealizado, setRegistrarRealizado] = useState(false);
  const [relato, setRelato] = useState("");
  // Desfecho: o "gerar demanda" agora é passo natural do atendimento.
  const [desfecho, setDesfecho] = useState<"nenhuma" | "demanda" | "orientacao">("nenhuma");
  const [desfechoAto, setDesfechoAto] = useState("");
  // Assistido travado: na edição e no retorno pré-preenchido (vínculo já definido).
  const assistidoTravado = !!editing || !!prefill;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const dt = new Date(editing.dataRegistro);
      setForm({
        assistidoId: editing.assistidoId,
        assistidoNome: editing.assistido?.nome ?? "",
        data: format(dt, "yyyy-MM-dd"),
        hora: format(dt, "HH:mm"),
        subtipo: editing.subtipo ?? "inicial",
        area: editing.area ?? "CRIMINAL",
        pedido: editing.pedido ?? "",
        numeroSolar: editing.numeroSolar ?? "",
        local: editing.local ?? "",
        assunto: editing.assunto ?? "",
        anotacoesRecepcao: editing.anotacoesRecepcao ?? "",
        processoId: editing.processoId,
        numeroAutosNovo: "",
        cnjsCitados: (editing.processosCitados ?? []).map((p) => p.cnj),
      });
    } else if (prefill) {
      setForm({
        ...EMPTY_FORM,
        assistidoId: prefill.assistidoId,
        assistidoNome: prefill.assistidoNome,
        subtipo: prefill.subtipo ?? "retorno",
        area: prefill.area ?? "CRIMINAL",
        pedido: prefill.pedido ?? "",
        processoId: prefill.processoId ?? null,
      });
    } else {
      setForm({ ...EMPTY_FORM, ...(initialDate ? { data: initialDate } : {}) });
    }
    setCnjDraft("");
    setRegistrarRealizado(false);
    setRelato("");
    setDesfecho("nenhuma");
    setDesfechoAto("");
  }, [open, editing, prefill, initialDate]);

  const { data: processosAssistido = [] } = trpc.atendimentos.processosByAssistido.useQuery(
    { assistidoId: form.assistidoId ?? 0 },
    { enabled: open && !!form.assistidoId }
  );

  // Default: quando o assistido tem exatamente um processo, já vincula a ele
  // (em vez de "Sem vínculo"), para o atendimento nascer ligado ao processo.
  const autoVinculouRef = useRef<number | null>(null);
  useEffect(() => {
    if (editing) return;
    if (!form.assistidoId || form.processoId != null) return;
    if (processosAssistido.length === 1 && autoVinculouRef.current !== form.assistidoId) {
      autoVinculouRef.current = form.assistidoId;
      setForm((f) => ({ ...f, processoId: processosAssistido[0].id }));
    }
  }, [processosAssistido, form.assistidoId, form.processoId, editing]);

  const invalidate = () => {
    utils.registros.listAtendimentos.invalidate();
    utils.registros.atendimentosKpis.invalidate();
    utils.registros.listAgendados.invalidate();
  };

  // Áudio gravado no modal (antes do registro existir) — sobe após criar.
  const audioPendenteRef = useRef<AudioGravado | null>(null);

  const agendar = trpc.registros.agendar.useMutation({
    onSuccess: async (registro) => {
      const aud = audioPendenteRef.current;
      if (aud && registro?.id) {
        const r = await uploadAudioAtendimento(registro.id, aud);
        toast[r.ok ? "success" : "error"](
          r.ok ? "Áudio salvo no Drive. Transcrição enfileirada." : (r.error ?? "Falha ao salvar o áudio."),
        );
        audioPendenteRef.current = null;
      }
      toast.success("Atendimento agendado");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(`Erro ao agendar: ${e.message}`),
  });

  const atualizar = trpc.registros.update.useMutation({
    onSuccess: () => {
      toast.success("Atendimento atualizado");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  // Demanda gerada do atendimento (desfecho) — encadeada após salvar o atendimento.
  const criarDemanda = trpc.demandas.createFromForm.useMutation({
    onSuccess: () => utils.demandas.list.invalidate(),
    onError: (e) => toast.error(`Atendimento salvo, mas falhou ao gerar demanda: ${e.message}`),
  });

  const salvando = agendar.isPending || atualizar.isPending;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addCnj = () => {
    const cnj = cnjDraft.trim();
    if (!cnj) return;
    if (form.cnjsCitados.includes(cnj)) {
      setCnjDraft("");
      return;
    }
    set("cnjsCitados", [...form.cnjsCitados, cnj]);
    setCnjDraft("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assistidoId) {
      toast.error("Selecione um assistido do cadastro");
      return;
    }
    if (!form.data || !form.hora) {
      toast.error("Informe data e horário");
      return;
    }
    if (!editing && desfecho === "demanda" && !desfechoAto.trim()) {
      toast.error("Informe o ato a praticar da demanda");
      return;
    }
    const dataRegistro = new Date(`${form.data}T${form.hora}:00`).toISOString();
    const subtipoLabel = form.subtipo === "retorno" ? "retorno" : "inicial";
    const payloadComum = {
      dataRegistro,
      subtipo: form.subtipo as "inicial" | "retorno",
      area: form.area as
        | "CRIMINAL" | "VIOLENCIA_DOMESTICA" | "JURI" | "EXECUCAO_PENAL"
        | "CIVEL" | "FAMILIA" | "OUTRA",
      pedido: form.pedido || undefined,
      numeroSolar: form.numeroSolar || undefined,
      anotacoesRecepcao: form.anotacoesRecepcao || undefined,
      processosCitados: form.cnjsCitados.map((cnj) => ({
        cnj,
        origem: "anotacao" as const,
      })),
    };

    if (editing) {
      atualizar.mutate({
        id: editing.id,
        ...payloadComum,
        assunto: form.assunto || null,
        local: form.local || null,
        processoId: form.processoId,
      });
    } else {
      const registro = await agendar.mutateAsync({
        assistidoId: form.assistidoId,
        titulo: `Atendimento ${subtipoLabel} — ${form.assistidoNome}`,
        ...payloadComum,
        assunto: form.assunto || undefined,
        local: form.local || undefined,
        processoId: form.processoId ?? undefined,
        // CNJ colado (assistido sem processo) → o servidor faz find-or-create do
        // processo real e vincula o atendimento, em vez de cair em stub "SN-…".
        ...(!form.processoId && form.numeroAutosNovo.trim()
          ? {
              numeroAutos: form.numeroAutosNovo.trim(),
              atribuicao: AREA_TO_ATRIBUICAO_ENUM[form.area] ?? "SUBSTITUICAO",
            }
          : {}),
        ...(registrarRealizado
          ? { status: "realizado" as const, conteudo: relato.trim() || undefined }
          : {}),
      });
      // Desfecho: gera a demanda encadeada (vínculo bidirecional + processo do atendimento).
      if (desfecho !== "nenhuma" && registro?.id) {
        await criarDemanda.mutateAsync({
          assistidoNome: form.assistidoNome,
          assistidoId: form.assistidoId,
          ...(form.processoId ? { processoId: form.processoId } : {}),
          atendimentoId: registro.id,
          atribuicao: AREA_TO_ATRIBUICAO_ENUM[form.area] ?? "SUBSTITUICAO",
          ato: desfecho === "demanda" ? desfechoAto.trim() : "Atendimento e orientação",
          status: desfecho === "demanda" ? "triagem" : "sem_atuacao",
        });
        toast.success(
          desfecho === "demanda"
            ? "Demanda gerada do atendimento"
            : "Registrado no cadastro (atendimento e orientação)",
        );
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Editar atendimento"
              : prefill?.subtipo === "retorno"
                ? "Agendar retorno"
                : "Novo atendimento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground">Agendamento</p>
          <div className="space-y-2">
            <Label>Assistido *</Label>
            {assistidoTravado ? (
              <Input value={form.assistidoNome} disabled className="h-9 text-sm" />
            ) : (
              <AssistidoAutocomplete
                value={form.assistidoNome}
                valueId={form.assistidoId}
                onSelect={(id, nome) =>
                  setForm((f) => ({ ...f, assistidoId: id, assistidoNome: nome, processoId: null }))
                }
                onTextChange={(text) =>
                  setForm((f) => ({ ...f, assistidoNome: text, assistidoId: null, processoId: null }))
                }
              />
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="atd-data">Data *</Label>
              <Input
                id="atd-data"
                type="date"
                value={form.data}
                onChange={(e) => set("data", e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atd-hora">Horário *</Label>
              <Input
                id="atd-hora"
                type="time"
                value={form.hora}
                onChange={(e) => set("hora", e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.subtipo} onValueChange={(v) => set("subtipo", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBTIPO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={form.area} onValueChange={(v) => set("area", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground pt-1 border-t border-neutral-100 dark:border-neutral-800/60">Contexto</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="atd-pedido">Pedido</Label>
              <Input
                id="atd-pedido"
                value={form.pedido}
                onChange={(e) => set("pedido", e.target.value)}
                placeholder="Consulta-Orientação"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atd-solar">Nº SOLAR</Label>
              <Input
                id="atd-solar"
                value={form.numeroSolar}
                onChange={(e) => set("numeroSolar", e.target.value)}
                placeholder="260610.002.780"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="atd-local">Local</Label>
              <Input
                id="atd-local"
                value={form.local}
                onChange={(e) => set("local", e.target.value)}
                placeholder="9ª DP de Camaçari"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {form.assistidoId && (
            <div className="space-y-2">
              <Label>Processo vinculado</Label>
              {processosAssistido.length > 0 && (
                <Select
                  value={form.processoId ? String(form.processoId) : "none"}
                  onValueChange={(v) => set("processoId", v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {processosAssistido.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <span className="font-mono text-xs">{p.numeroAutos}</span>
                        {p.area ? ` · ${p.area}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Sem processo selecionado: permite colar o CNJ real para vincular
                  (find-or-create), evitando que o atendimento caia em stub "SN-…". */}
              {form.processoId == null && (
                <Input
                  value={form.numeroAutosNovo}
                  onChange={(e) => set("numeroAutosNovo", e.target.value)}
                  placeholder={
                    processosAssistido.length > 0
                      ? "ou cole o nº do processo (CNJ) para vincular"
                      : "nº do processo (CNJ) para vincular"
                  }
                  className="h-9 text-sm font-mono"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="atd-cnj">Processos citados (CNJ)</Label>
            <div className="flex gap-2">
              <Input
                id="atd-cnj"
                value={cnjDraft}
                onChange={(e) => setCnjDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCnj();
                  }
                }}
                placeholder="0000000-00.0000.8.05.0000"
                className="h-9 text-sm font-mono"
              />
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={addCnj}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {form.cnjsCitados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.cnjsCitados.map((cnj) => (
                  <span
                    key={cnj}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-mono text-neutral-700 dark:text-neutral-300"
                  >
                    {cnj}
                    <button
                      type="button"
                      onClick={() => set("cnjsCitados", form.cnjsCitados.filter((c) => c !== cnj))}
                      className="cursor-pointer text-neutral-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="atd-assunto">Assunto</Label>
            <Input
              id="atd-assunto"
              value={form.assunto}
              onChange={(e) => set("assunto", e.target.value)}
              placeholder="Resumo do que será tratado"
              className="h-9 text-sm"
            />
          </div>

          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground pt-1 border-t border-neutral-100 dark:border-neutral-800/60">Registro complementar</p>
          <div className="space-y-2">
            <Label htmlFor="atd-anotacoes">Anotações da recepção</Label>
            <Textarea
              id="atd-anotacoes"
              value={form.anotacoesRecepcao}
              onChange={(e) => set("anotacoesRecepcao", e.target.value)}
              placeholder="Anotação do agendamento (SOLAR/recepção)"
              rows={3}
              className="text-sm"
            />
          </div>

          {!editing && (
            <div className="rounded-lg border border-neutral-200/70 dark:border-neutral-800 p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={registrarRealizado}
                  onChange={(e) => setRegistrarRealizado(e.target.checked)}
                  className="accent-emerald-600 cursor-pointer"
                />
                <span className="font-medium">Registrar como realizado</span>
                <span className="text-[11px] text-muted-foreground">
                  (atendimento na sede, sem agendamento prévio)
                </span>
              </label>
              {registrarRealizado && (
                <Textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  placeholder="Relato do atendimento — o que o assistido trouxe, orientações dadas, providências"
                  rows={4}
                  className="text-sm"
                />
              )}
            </div>
          )}

          {!editing && (
            <div className="space-y-1">
              <Label className="text-xs">Áudio do atendimento (opcional)</Label>
              <AudioRecorder onRecorded={(a) => { audioPendenteRef.current = a; }} />
            </div>
          )}

          {!editing && (
            <div className="rounded-lg border border-neutral-200/70 dark:border-neutral-800 p-3 space-y-2">
              <Label className="text-xs font-medium">Desfecho do atendimento</Label>
              <OutcomeChoiceCardGroup value={desfecho} onChange={setDesfecho} />
              {desfecho === "demanda" && (
                <Input
                  value={desfechoAto}
                  onChange={(e) => setDesfechoAto(e.target.value)}
                  placeholder="Ato a praticar — ex.: Elaborar petição de…"
                  className="h-9 text-sm mt-1"
                />
              )}
            </div>
          )}

          {/* Footer: uma CTA primária só (o Dialog já fecha por X/overlay/Esc — sem "Cancelar" redundante) */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={salvando} className="gap-2 w-full sm:w-auto">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing ? "Salvar alterações" : registrarRealizado ? "Registrar atendimento" : "Agendar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Autocomplete de assistido (busca ao vivo, vínculo por id) ─────────────

function AssistidoAutocomplete({
  value,
  valueId,
  onSelect,
  onTextChange,
}: {
  value: string;
  valueId: number | null;
  onSelect: (id: number, nome: string) => void;
  onTextChange: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  const { data: results = [], isFetching } = trpc.atendimentos.searchAssistidos.useQuery(
    { search: debounced },
    { enabled: open && debounced.length >= 2 }
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite o nome ou CPF — buscamos no cadastro"
          autoComplete="off"
          className="h-9 text-sm pr-8"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {isFetching ? (
            <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
          ) : valueId ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : null}
        </div>
      </div>
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 && !isFetching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum assistido encontrado no cadastro.
            </p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(r.id, r.nome);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <span className="font-medium">{r.nome}</span>
                {r.cpf && (
                  <span className="ml-2 text-[11px] font-mono text-muted-foreground">{r.cpf}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
