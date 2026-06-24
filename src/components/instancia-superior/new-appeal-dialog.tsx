// ─── Novo Recurso — intake "dossiê" recursal (4 blocos) ───────────────────
// Inaugura um dossiê recursal: identificação → órgão julgador → contexto
// (vínculo assistido/processo) → acompanhamento. Backend já suporta os campos
// (createRecurso aceita assistidoId/processoOrigemId/dataInterposicao/teses).
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Landmark, Scale, FileText, CalendarClock, ChevronsUpDown, Check,
  User, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { TRIBUNAIS, TIPO_LABELS, TIPO_SHORT } from "./ds";
import { Lbl } from "./primitives";
import { formatarNumeroRecurso, validarNumeroRecurso } from "./logic";

// Câmara/turma/seção contextual ao tribunal.
const CAMARA_OPTS: Record<string, string[]> = {
  TJBA: ["1ª Câmara Criminal", "2ª Câmara Criminal", "Seção Criminal"],
  STJ: ["5ª Turma", "6ª Turma", "3ª Seção"],
  STF: ["1ª Turma", "2ª Turma", "Plenário"],
};

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

type AssistidoSel = { id: number; nome: string } | null;
type ProcessoSel = { id: number; numeroAutos: string | null } | null;

export function NewAppealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tipo, setTipo] = useState("APELACAO");
  const [tribunal, setTribunal] = useState<"TJBA" | "STJ" | "STF">("TJBA");
  const [numero, setNumero] = useState("");
  const [camara, setCamara] = useState("");
  const [assistido, setAssistido] = useState<AssistidoSel>(null);
  const [processo, setProcesso] = useState<ProcessoSel>(null);
  const [teses, setTeses] = useState("");
  const [resumo, setResumo] = useState("");
  const [dataInterposicao, setDataInterposicao] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.instanciaSuperior.createRecurso.useMutation({
    onSuccess: () => {
      toast.success("Dossiê recursal aberto");
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function reset() {
    setTipo("APELACAO"); setTribunal("TJBA"); setNumero(""); setCamara("");
    setAssistido(null); setProcesso(null); setTeses(""); setResumo(""); setDataInterposicao("");
  }

  // Câmara é resetada quando o tribunal muda (opções contextuais).
  function changeTribunal(t: "TJBA" | "STJ" | "STF") { setTribunal(t); setCamara(""); }
  // Processo depende do assistido — trocar de assistido limpa o processo.
  function changeAssistido(a: AssistidoSel) { setAssistido(a); setProcesso(null); }

  const numeroPreenchido = numero.trim().length > 0;
  const numeroValido = validarNumeroRecurso(numero);
  const camaras = CAMARA_OPTS[tribunal] ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Novo recurso
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Inaugure o dossiê recursal: identifique o recurso, o órgão julgador e os vínculos do caso.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Bloco 1 — Identificação */}
          <Block n={1} title="Identificação" icon={Scale}>
            <div>
              <Lbl>Tribunal</Lbl>
              <div className="flex gap-1.5">
                {TRIBUNAIS.map((t) => (
                  <button key={t.key} type="button" onClick={() => changeTribunal(t.key as "TJBA" | "STJ" | "STF")} title={t.full}
                    className={cn(
                      "text-[13px] px-3 py-2 rounded-lg border transition-all flex-1",
                      tribunal === t.key ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                    )}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <Lbl>Tipo de recurso</Lbl>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setTipo(k)}
                    className={cn(
                      "text-[13px] px-3 py-2.5 rounded-lg border transition-all text-left",
                      tipo === k ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm shadow-emerald-500/10" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                    )}>
                    <span className="text-[9px] font-mono font-bold text-neutral-400 mr-1.5">{TIPO_SHORT[k]}</span>{v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Lbl>Número do recurso</Lbl>
              <div className="relative">
                <Input
                  value={numero}
                  onChange={(e) => setNumero(formatarNumeroRecurso(e.target.value))}
                  placeholder="0000000-00.0000.0.00.0000"
                  inputMode="numeric"
                  className={cn("font-mono text-[13px] h-10 pr-9",
                    numeroPreenchido && !numeroValido && "border-amber-400 focus-visible:ring-amber-400",
                    numeroValido && "border-emerald-400 focus-visible:ring-emerald-400")}
                />
                {numeroPreenchido && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {numeroValido
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  </span>
                )}
              </div>
              {numeroPreenchido && !numeroValido && (
                <p className="text-[10.5px] text-amber-600 dark:text-amber-400 mt-1">Formato CNJ incompleto — opcional, pode salvar mesmo assim.</p>
              )}
            </div>
          </Block>

          {/* Bloco 2 — Órgão julgador */}
          <Block n={2} title="Órgão julgador" icon={Landmark}>
            <div>
              <Lbl>{tribunal === "TJBA" ? "Câmara criminal" : tribunal === "STF" ? "Turma / Plenário" : "Turma / Seção"}</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {camaras.map((c) => (
                  <button key={c} type="button" onClick={() => setCamara(camara === c ? "" : c)}
                    className={cn(
                      "text-[12.5px] px-3 py-2 rounded-lg border transition-all",
                      camara === c ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                    )}>{c}</button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">O relator pode ser definido depois, ao acompanhar o recurso.</p>
            </div>
          </Block>

          {/* Bloco 3 — Contexto */}
          <Block n={3} title="Contexto do caso" icon={User}>
            <div>
              <Lbl>Assistido</Lbl>
              <AssistidoPicker value={assistido} onChange={changeAssistido} />
            </div>
            <div>
              <Lbl>Processo de origem</Lbl>
              <ProcessoPicker assistidoId={assistido?.id ?? null} value={processo} onChange={setProcesso} />
              {!assistido && <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">Selecione o assistido para listar os processos vinculados.</p>}
            </div>
            <div>
              <Lbl>Tese central</Lbl>
              <Input value={teses} onChange={(e) => setTeses(e.target.value)} placeholder="Insuficiência probatória, Nulidade… (separe por vírgula)" className="text-[13px] h-9" />
            </div>
            <div>
              <Lbl>Resumo do pedido</Lbl>
              <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Breve descrição do recurso ou pedido…"
                className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[72px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
            </div>
          </Block>

          {/* Bloco 4 — Acompanhamento inicial */}
          <Block n={4} title="Acompanhamento" icon={CalendarClock}>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Lbl>Data de interposição</Lbl>
                <Input type="date" value={dataInterposicao} onChange={(e) => setDataInterposicao(e.target.value)} className="text-[13px] h-9" />
              </div>
              <p className="text-[11px] text-muted-foreground/80 pb-2">Fase inicial: <span className="font-medium text-foreground/80">Interposto</span>.</p>
            </div>
          </Block>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
          <Button
            onClick={() => create.mutate({
              tipo, tribunal,
              numeroRecurso: numero || undefined,
              camara: camara || undefined,
              resumo: resumo || undefined,
              tesesInvocadas: teses.split(",").map((t) => t.trim()).filter(Boolean),
              assistidoId: assistido?.id,
              processoOrigemId: processo?.id,
              dataInterposicao: dataInterposicao || undefined,
            })}
            disabled={create.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            {create.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Abrindo…</> : "Abrir dossiê recursal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Blocos ───────────────────────────────────────────────────────────────

function Block({ n, title, icon: Icon, children }: { n: number; title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-neutral-100 dark:bg-white/[0.06] text-[10px] font-bold text-muted-foreground tabular-nums">{n}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</span>
      </div>
      <div className="pl-7 space-y-3">{children}</div>
    </div>
  );
}

// ─── Pickers (combobox shadcn Command + Popover) ──────────────────────────

function AssistidoPicker({ value, onChange }: { value: AssistidoSel; onChange: (a: AssistidoSel) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data, isLoading } = trpc.assistidos.list.useQuery(
    { search: dq || undefined },
    { enabled: open },
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-9 text-[13px]">
          <span className="truncate text-left">{value?.nome ?? "Buscar assistido…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nome ou CPF…" value={q} onValueChange={setQ} />
          <CommandList>
            {isLoading && <div className="py-4 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…</div>}
            {!isLoading && (data?.length ?? 0) === 0 && <CommandEmpty>Nenhum assistido encontrado.</CommandEmpty>}
            <CommandGroup>
              {(data as any[] | undefined)?.map((a) => (
                <CommandItem key={a.id} value={String(a.id)} onSelect={() => { onChange({ id: a.id, nome: a.nome }); setOpen(false); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", value?.id === a.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{a.nome}</span>
                  {a.cpf && <span className="ml-auto text-[10px] font-mono text-muted-foreground">{a.cpf}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProcessoPicker({ assistidoId, value, onChange }: { assistidoId: number | null; value: ProcessoSel; onChange: (p: ProcessoSel) => void }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = trpc.processos.listByAssistido.useQuery(
    { assistidoId: assistidoId! },
    { enabled: open && assistidoId != null },
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={assistidoId == null}
          className="w-full justify-between font-normal h-9 text-[13px]">
          <span className="truncate text-left font-mono">{value?.numeroAutos ?? "Selecionar processo…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Número ou assunto…" />
          <CommandList>
            {isLoading && <div className="py-4 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…</div>}
            {!isLoading && (data?.length ?? 0) === 0 && <CommandEmpty>Nenhum processo vinculado.</CommandEmpty>}
            <CommandGroup>
              {(data as any[] | undefined)?.map((p) => (
                <CommandItem key={p.id} value={`${p.numeroAutos ?? ""} ${p.assunto ?? ""}`} onSelect={() => { onChange({ id: p.id, numeroAutos: p.numeroAutos }); setOpen(false); }}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", value?.id === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-[12px] flex items-center gap-1.5"><FileText className="w-3 h-3 text-muted-foreground shrink-0" />{p.numeroAutos ?? "—"}</span>
                    {p.assunto && <span className="block truncate text-[10px] text-muted-foreground">{p.assunto}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
