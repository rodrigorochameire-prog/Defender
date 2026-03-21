"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { MapPin, Pencil, Search, Loader2, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

async function geocodificar(endereco: string): Promise<{ lat: string; lng: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat).toFixed(7), lng: parseFloat(data[0].lon).toFixed(7) };
  } catch {
    return null;
  }
}

interface Props {
  processoId: number;
  localDoFatoEndereco: string | null | undefined;
  localDoFatoLat: string | null | undefined;
  localDoFatoLng: string | null | undefined;
}

export function LocalDoFatoPanel({ processoId, localDoFatoEndereco, localDoFatoLat, localDoFatoLng }: Props) {
  const utils = trpc.useUtils();
  const [editando, setEditando] = useState(false);
  const [endereco, setEndereco] = useState(localDoFatoEndereco ?? "");
  const [lat, setLat] = useState(localDoFatoLat ? String(localDoFatoLat) : "");
  const [lng, setLng] = useState(localDoFatoLng ? String(localDoFatoLng) : "");
  const [isGeocodificando, setIsGeocodificando] = useState(false);

  const temCoordenadas = !!(localDoFatoLat && localDoFatoLng);

  const updateMutation = trpc.processos.updateLocalDoFato.useMutation({
    onSuccess: () => {
      toast.success("Local do fato atualizado");
      utils.processos.getById.invalidate({ id: processoId });
      utils.processos.mapa.invalidate();
      setEditando(false);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleGeocodificar = async () => {
    if (!endereco.trim()) {
      toast.error("Informe o endereço primeiro");
      return;
    }
    setIsGeocodificando(true);
    const resultado = await geocodificar(endereco);
    setIsGeocodificando(false);
    if (!resultado) {
      toast.error("Endereço não encontrado. Tente um endereço mais específico.");
      return;
    }
    setLat(resultado.lat);
    setLng(resultado.lng);
    toast.success("Coordenadas encontradas!");
  };

  const handleSalvar = () => {
    updateMutation.mutate({
      id: processoId,
      localDoFatoEndereco: endereco || null,
      localDoFatoLat: lat || null,
      localDoFatoLng: lng || null,
    });
  };

  const handleCancelar = () => {
    setEndereco(localDoFatoEndereco ?? "");
    setLat(localDoFatoLat ? String(localDoFatoLat) : "");
    setLng(localDoFatoLng ? String(localDoFatoLng) : "");
    setEditando(false);
  };

  if (!editando) {
    return (
      <div className="flex items-start gap-2 group">
        <MapPin className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${temCoordenadas ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600"}`} />
        <div className="flex-1 min-w-0">
          {temCoordenadas ? (
            <div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                {localDoFatoEndereco ?? `${localDoFatoLat}, ${localDoFatoLng}`}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                {localDoFatoLat}, {localDoFatoLng}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setEditando(true)}
              className="text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Adicionar local do fato...
            </button>
          )}
        </div>
        {temCoordenadas && (
          <button
            onClick={() => setEditando(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Local do Fato
      </p>
      <div className="flex gap-2">
        <Input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Ex: Rua das Flores, 123, Centro, Camaçari - BA"
          className="text-xs h-8"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGeocodificar(); } }}
        />
        <button
          onClick={handleGeocodificar}
          disabled={isGeocodificando}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer shrink-0 disabled:opacity-50"
          title="Geocodificar via OpenStreetMap"
        >
          {isGeocodificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </button>
      </div>

      {(lat || lng) && (
        <div className="flex gap-2">
          <Input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            className="text-xs h-7 font-mono"
          />
          <Input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Longitude"
            className="text-xs h-7 font-mono"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSalvar}
          disabled={updateMutation.isPending}
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Check className="h-3 w-3 mr-1" />
          )}
          Salvar
        </Button>
        <button
          onClick={handleCancelar}
          className="flex items-center gap-1 h-7 px-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
        >
          <X className="h-3 w-3" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
