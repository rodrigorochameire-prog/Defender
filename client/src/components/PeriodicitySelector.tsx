import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

type Periodicity = "daily" | "weekly" | "monthly" | "custom";

export interface PeriodicityConfig {
  periodicity: Periodicity;
  customInterval?: number;
  weekDays?: number[];
  monthDays?: number[];
}

interface PeriodicitySelectorProps {
  value: PeriodicityConfig;
  onChange: (config: PeriodicityConfig) => void;
  showPreview?: boolean;
}

const WEEK_DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function PeriodicitySelector({ value, onChange, showPreview = true }: PeriodicitySelectorProps) {
  const handlePeriodicityChange = (periodicity: Periodicity) => {
    onChange({
      ...value,
      periodicity,
      // Reset specific fields when changing periodicity
      customInterval: periodicity === "custom" ? value.customInterval || 7 : undefined,
      weekDays: periodicity === "weekly" ? value.weekDays || [] : undefined,
      monthDays: periodicity === "monthly" ? value.monthDays || [] : undefined,
    });
  };

  const handleWeekDayToggle = (day: number) => {
    const current = value.weekDays || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, weekDays: updated });
  };

  const handleMonthDayToggle = (day: number) => {
    const current = value.monthDays || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ ...value, monthDays: updated });
  };

  const getPreviewText = (): string => {
    switch (value.periodicity) {
      case "daily":
        return "Todos os dias";
      case "weekly":
        if (!value.weekDays || value.weekDays.length === 0) {
          return "Selecione os dias da semana";
        }
        const dayNames = value.weekDays
          .map((d) => WEEK_DAYS.find((wd) => wd.value === d)?.label)
          .join(", ");
        return `Toda semana: ${dayNames}`;
      case "monthly":
        if (!value.monthDays || value.monthDays.length === 0) {
          return "Selecione os dias do mês";
        }
        const days = value.monthDays.join(", ");
        return `Todo mês nos dias: ${days}`;
      case "custom":
        const interval = value.customInterval || 1;
        return `A cada ${interval} ${interval === 1 ? "dia" : "dias"}`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Periodicidade</Label>
        <RadioGroup
          value={value.periodicity}
          onValueChange={(v) => handlePeriodicityChange(v as Periodicity)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily" className="font-normal cursor-pointer">
              Diária (todos os dias)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly" className="font-normal cursor-pointer">
              Semanal (dias específicos da semana)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly" className="font-normal cursor-pointer">
              Mensal (dias específicos do mês)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal cursor-pointer">
              Personalizada (intervalo customizado)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Weekly - Day selector */}
      {value.periodicity === "weekly" && (
        <div>
          <Label>Dias da Semana</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`weekday-${day.value}`}
                  checked={value.weekDays?.includes(day.value) || false}
                  onCheckedChange={() => handleWeekDayToggle(day.value)}
                />
                <Label
                  htmlFor={`weekday-${day.value}`}
                  className="font-normal cursor-pointer text-sm"
                >
                  {day.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly - Day selector */}
      {value.periodicity === "monthly" && (
        <div>
          <Label>Dias do Mês</Label>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {MONTH_DAYS.map((day) => (
              <div key={day} className="flex items-center justify-center">
                <Checkbox
                  id={`monthday-${day}`}
                  checked={value.monthDays?.includes(day) || false}
                  onCheckedChange={() => handleMonthDayToggle(day)}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`monthday-${day}`}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover text-sm font-medium hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                >
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom - Interval input */}
      {value.periodicity === "custom" && (
        <div>
          <Label htmlFor="customInterval">Intervalo (dias)</Label>
          <Input
            id="customInterval"
            type="number"
            min={1}
            value={value.customInterval || 1}
            onChange={(e) =>
              onChange({
                ...value,
                customInterval: parseInt(e.target.value) || 1,
              })
            }
            placeholder="Ex: 7 para semanal, 35 para Simparic"
            className="mt-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Exemplos: 7 dias (semanal), 35 dias (Simparic), 365 dias (anual)
          </p>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Próximas aplicações:</span>
            <span className="text-muted-foreground">{getPreviewText()}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
