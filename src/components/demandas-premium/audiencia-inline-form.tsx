"use client";

import { Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TIPOS
// ============================================================================

interface AudienciaInlineFormProps {
  data: string;        // YYYY-MM-DD or empty
  hora: string;        // HH:MM or empty
  tipo: string;        // tipo audiência or empty
  criarEvento: boolean;
  onChange: (fields: {
    data?: string;
    hora?: string;
    tipo?: string;
    criarEvento?: boolean;
  }) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

// Cobertura criminal/VVD/Júri/EP do defensor. Mantenha sincronizada com
// audiencia-confirm-modal.tsx:TIPOS_AUDIENCIA — divergência aqui significa
// que o usuário verá tipos diferentes em fluxos diferentes.
const TIPOS_AUDIENCIA = [
  "Instrução e Julgamento",
  "Instrução",
  "Julgamento",
  "Una",
  "Plenário do Júri",
  // Lei 13.431/2017 — depoimento sem dano de criança/adolescente vítima ou
  // testemunha (aplicável também em PPP de proteção de menor).
  "Oitiva Especial",
  // Art. 366 CPP — produção antecipada de prova
  "Antecipação de Prova",
  "Conciliação",
  "Justificação",
  "Custódia",
  // Art. 16 Lei Maria da Penha — renúncia da representação
  "Preliminar (Maria da Penha)",
  "Admoestação",
  "Outra",
] as const;

// ============================================================================
// COMPONENTE
// ============================================================================

export function AudienciaInlineForm({
  data,
  hora,
  tipo,
  criarEvento,
  onChange,
}: AudienciaInlineFormProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50/50">
      {/* Label */}
      <div className="flex items-center gap-1.5 text-emerald-700 shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Audiência</span>
      </div>

      {/* Data */}
      <Input
        type="date"
        value={data}
        onChange={(e) => onChange({ data: e.target.value })}
        className="h-7 w-36 text-xs border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-400 bg-white dark:bg-neutral-900"
      />

      {/* Hora */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock className="h-3.5 w-3.5 text-emerald-600" />
        <Input
          type="time"
          value={hora}
          onChange={(e) => onChange({ hora: e.target.value })}
          className="h-7 w-28 text-xs border-emerald-200 dark:border-emerald-800 focus-visible:ring-emerald-400 bg-white dark:bg-neutral-900"
        />
      </div>

      {/* Tipo de audiência */}
      <Select
        value={tipo || undefined}
        onValueChange={(value) => onChange({ tipo: value })}
      >
        <SelectTrigger className="h-7 w-48 text-xs border-emerald-200 dark:border-emerald-800 focus:ring-emerald-400 bg-white dark:bg-neutral-900">
          <SelectValue placeholder="Tipo de audiência" />
        </SelectTrigger>
        <SelectContent>
          {TIPOS_AUDIENCIA.map((t) => (
            <SelectItem key={t} value={t} className="text-xs">
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Criar evento */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Checkbox
          id="criar-evento-audiencia"
          checked={criarEvento}
          onCheckedChange={(checked) =>
            onChange({ criarEvento: checked === true })
          }
          className="h-3.5 w-3.5 border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
        <Label
          htmlFor="criar-evento-audiencia"
          className="text-xs text-emerald-700 cursor-pointer select-none"
        >
          Criar evento na agenda
        </Label>
      </div>
    </div>
  );
}
