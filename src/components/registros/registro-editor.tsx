"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnexoDropzone } from "./anexos/anexo-dropzone";
import { useAnexoUpload } from "./anexos/use-anexo-upload";
import {
  REGISTRO_TIPOS,
  TIPO_KEYS,
  type TipoRegistro,
} from "./registro-tipo-config";

interface Props {
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tipoDefault: TipoRegistro;
  tiposPermitidos?: TipoRegistro[];
  // Tipos mostrados inline. Os demais ficam num popover "Mais ▾" (Task 3).
  // Sem a prop, mostra todos os tipos permitidos inline (compat).
  tiposPrimarios?: TipoRegistro[];
  onSaved?: () => void;
  onCancel?: () => void;
}

export function RegistroEditor({
  assistidoId,
  processoId,
  demandaId,
  audienciaId,
  tipoDefault,
  tiposPermitidos,
  tiposPrimarios,
  onSaved,
  onCancel,
}: Props) {
  const [tipo, setTipo] = useState<TipoRegistro>(tipoDefault);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [prazo, setPrazo] = useState("");

  // Arquivos "staged" em memória — enviados após a criação do registro (precisa do id).
  const [staged, setStaged] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<File[]>([]);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  const { upload } = useAnexoUpload(() => {});

  const conteudoRef = useRef(conteudo);
  const tituloRef = useRef(titulo);
  const prazoRef = useRef(prazo);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    conteudoRef.current = conteudo;
    tituloRef.current = titulo;
    prazoRef.current = prazo;
  });
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  // Prazo só faz sentido para diligência: ao trocar para outro tipo, limpa o
  // valor para não enviar um prazo "fantasma" num registro sem campo visível.
  useEffect(() => {
    if (tipo !== "diligencia") setPrazo("");
  }, [tipo]);
  const utils = trpc.useUtils();

  const create = trpc.registros.create.useMutation({
    onSuccess: (data) => {
      utils.registros.list.invalidate();
      if (data?.audienciaCriada) {
        // ciência com designação detectada → audiência agendada automaticamente
        utils.audiencias.invalidate();
        const { data: dia, horario, tipo: tipoAud } = data.audienciaCriada;
        const [y, m, d] = dia.split("-");
        toast.success(`Audiência agendada automaticamente`, {
          description: `${tipoAud} — ${d}/${m}/${y} às ${horario}`,
        });
      }
      if (data?.atoAtualizado) {
        // designação/redesignação detectada → o ato da demanda foi reclassificado
        utils.demandas.invalidate();
        toast.success("Ato da demanda atualizado", {
          description: `Reclassificado para "${data.atoAtualizado}".`,
        });
      }
      if (data?.medidasCriadas && data.medidasCriadas.length > 0) {
        // ciência de MPU com medidas protetivas detectadas
        const n = data.medidasCriadas.length;
        const lista = data.medidasCriadas
          .map((m) =>
            m.distanciaMetros ? `${m.codigo} (${m.distanciaMetros}m)` : m.codigo
          )
          .join(", ");
        toast.success(`${n} medida(s) protetiva(s) detectada(s)`, {
          description: lista,
        });
      }
      setConteudo("");
      setTitulo("");
      setPrazo("");
      onSaved?.();
      // Envia os arquivos staged ao registro recém-criado (fire-and-forget).
      const files = stagedRef.current;
      if (files.length && data?.id) {
        void upload(data.id, files);
        setStaged([]);
      }
    },
  });

  const tipos = tiposPermitidos ?? TIPO_KEYS;
  // Preserva a ordem do array tiposPrimarios (callsite controla a sequência);
  // se o tipo ativo não está entre os primários, anexa no final.
  const inlineTipos = tiposPrimarios
    ? Array.from(new Set([
        ...tiposPrimarios.filter((t) => tipos.includes(t)),
        ...(tipos.includes(tipo) && !tiposPrimarios.includes(tipo) ? [tipo] : []),
      ]))
    : tipos;

  const secondaryTipos = tiposPrimarios
    ? tipos.filter((t) => !tiposPrimarios.includes(t) && t !== tipo)
    : [];

  const activeCfg = REGISTRO_TIPOS[tipo];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditableField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      // ⌘↵ / Ctrl↵ → salva (funciona dentro do textarea também)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const conteudoNow = conteudoRef.current;
        if (conteudoNow.trim() && !create.isPending) {
          e.preventDefault();
          create.mutate({
            tipo,
            assistidoId,
            processoId,
            demandaId,
            audienciaId,
            titulo: tituloRef.current.trim() || undefined,
            conteudo: conteudoNow.trim(),
            prazo: prazoRef.current || undefined,
          });
        }
        return;
      }

      // Esc → cancela (em qualquer lugar)
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }

      // 1–7 → troca tipo primário (só fora de input/textarea)
      if (!inEditableField && /^[1-7]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const lista = tiposPrimarios ?? tipos;
        const next = lista[idx];
        if (next) {
          e.preventDefault();
          setTipo(next);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tipo, tiposPrimarios, tipos, create, assistidoId, processoId, demandaId, audienciaId, onCancel]);

  return (
    <AnexoDropzone
      onFiles={(files) => setStaged((s) => [...s, ...files])}
      dragHint="Solte para anexar"
      className="rounded-xl"
    >
    <div
      className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden border-l-2 transition-colors"
      style={{ borderLeftColor: `${activeCfg.color}66` }}
    >
      {/* Tipo selector — single row icon-only.
          O ativo expande pra mostrar label completa com tint colorido.
          Os demais ficam icon-only neutros com tooltip — quase 0 ruído visual. */}
      <div className="flex items-center gap-0.5 px-2.5 pt-2.5 pb-1.5 flex-wrap">
        {inlineTipos.map((t) => {
          const cfg = REGISTRO_TIPOS[t];
          const Icon = cfg.Icon;
          const active = tipo === t;
          const lista = tiposPrimarios ?? tipos;
          const idx = lista.indexOf(t);
          const shortcut = idx >= 0 && idx < 7 ? ` (${idx + 1})` : "";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              title={`${cfg.label}${shortcut}`}
              aria-label={cfg.label}
              aria-pressed={active}
              className={cn(
                "rounded-md transition-all duration-150 flex items-center gap-1 text-[11px] font-semibold",
                active
                  ? cn("px-2 py-1 ring-1 ring-inset", cfg.bg, cfg.text)
                  : "w-7 h-7 justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              )}
              style={
                active
                  ? ({ ["--tw-ring-color"]: `${cfg.color}66` } as React.CSSProperties)
                  : undefined
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {active && <span>{cfg.label}</span>}
            </button>
          );
        })}
        {secondaryTipos.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Mais"
                title="Mais tipos"
                className="rounded-md w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-44 p-1"
            >
              {secondaryTipos.map((t) => {
                const cfg = REGISTRO_TIPOS[t];
                const Icon = cfg.Icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="px-3.5 pb-3 space-y-1.5">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título (opcional)"
          className="w-full bg-transparent text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 placeholder:font-normal outline-none py-1"
          maxLength={120}
        />

        <textarea
          ref={textareaRef}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="O que aconteceu..."
          rows={3}
          className="w-full bg-transparent text-[13px] text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 outline-none resize-none leading-relaxed"
        />

        {/* Campo de prazo — exibido apenas para diligências */}
        {tipo === "diligencia" && (
          <div className="flex items-center gap-2 py-0.5">
            <label
              htmlFor="registro-prazo"
              className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
            >
              Prazo
            </label>
            <input
              id="registro-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="text-[12px] bg-transparent text-neutral-700 dark:text-neutral-300 outline-none border-b border-neutral-200 dark:border-neutral-700 py-0.5 cursor-pointer"
            />
          </div>
        )}

        {/* Input de arquivo oculto — acionado pelo clipe no rodapé */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            setStaged((s) => [...s, ...Array.from(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />

        {/* Chips compactos dos arquivos selecionados (só aparecem quando há algum) */}
        {staged.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {staged.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 max-w-[160px] pl-2 pr-1 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-300"
              >
                <Paperclip className="w-3 h-3 shrink-0 text-neutral-400" />
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remover ${f.name}`}
                  onClick={() => setStaged((s) => s.filter((_, j) => j !== i))}
                  className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Footer com counter + actions */}
        <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800/60">
          <span className={cn(
            "text-[10px] tabular-nums transition-colors",
            conteudo.length > 1000
              ? "text-amber-500"
              : "text-neutral-400 dark:text-neutral-500",
          )}>
            {conteudo.length > 0 ? `${conteudo.length} caracteres` : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
              className="h-7 w-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-7 text-[11px] px-2.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Cancelar
              </Button>
            )}
            <Button
              size="sm"
              disabled={!conteudo.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  tipo,
                  assistidoId,
                  processoId,
                  demandaId,
                  audienciaId,
                  titulo: titulo.trim() || undefined,
                  conteudo: conteudo.trim(),
                  prazo: prazo || undefined,
                })
              }
              style={
                conteudo.trim() && !create.isPending
                  ? { backgroundColor: activeCfg.color, color: "#111" }
                  : undefined
              }
              className="h-7 text-[11px] px-3 cursor-pointer transition-all"
            >
              {create.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </AnexoDropzone>
  );
}
