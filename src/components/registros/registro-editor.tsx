"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
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
  onSaved,
  onCancel,
}: Props) {
  const [tipo, setTipo] = useState<TipoRegistro>(tipoDefault);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.registros.create.useMutation({
    onSuccess: () => {
      utils.registros.list.invalidate();
      setConteudo("");
      setTitulo("");
      onSaved?.();
    },
  });

  const tipos = tiposPermitidos ?? TIPO_KEYS;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-3 space-y-2.5">
      {/* Tipo selector — apenas o chip ativo tem tint colorido. Os demais ficam
          neutros (só ícone+texto coloridos), o que reduz drasticamente o ruído
          visual mantendo a semântica de cor. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tipos.map((t) => {
          const cfg = REGISTRO_TIPOS[t];
          const Icon = cfg.Icon;
          const active = tipo === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                active
                  ? cn(cfg.bg, cfg.text, "ring-1 ring-inset")
                  : cn(
                      "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/40",
                      cfg.text,
                    ),
              )}
              style={
                active
                  ? ({ ["--tw-ring-color"]: cfg.color } as React.CSSProperties)
                  : undefined
              }
            >
              <Icon className="w-3 h-3" />
              {cfg.shortLabel}
            </button>
          );
        })}
      </div>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        className="w-full bg-transparent text-sm font-semibold text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none border-b border-neutral-200 dark:border-neutral-800 pb-1.5 focus:border-neutral-400"
        maxLength={120}
      />

      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder="O que aconteceu..."
        rows={3}
        className="w-full bg-transparent text-[13px] text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 outline-none resize-none"
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 text-[11px]"
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
            })
          }
          className="h-7 text-[11px]"
        >
          {create.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "Salvar"
          )}
        </Button>
      </div>
    </div>
  );
}
