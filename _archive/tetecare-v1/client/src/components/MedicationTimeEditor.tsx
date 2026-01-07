import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MedicationTimeEditorProps {
  times: string[];
  onChange: (times: string[]) => void;
  disabled?: boolean;
}

export function MedicationTimeEditor({ times, onChange, disabled }: MedicationTimeEditorProps) {
  const [newTime, setNewTime] = useState("08:00");

  const addTime = () => {
    if (newTime && !times.includes(newTime)) {
      const updatedTimes = [...times, newTime].sort();
      onChange(updatedTimes);
      setNewTime("08:00");
    }
  };

  const removeTime = (timeToRemove: string) => {
    onChange(times.filter(t => t !== timeToRemove));
  };

  const suggestedTimes = [
    { label: "Manhã (08:00)", value: "08:00" },
    { label: "Meio-dia (12:00)", value: "12:00" },
    { label: "Tarde (16:00)", value: "16:00" },
    { label: "Noite (20:00)", value: "20:00" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horários de Administração
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Defina os horários em que o medicamento deve ser administrado
        </p>
      </div>

      {/* Current Times */}
      {times.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {times.map((time) => (
            <Badge
              key={time}
              variant="secondary"
              className="text-sm px-3 py-1.5 gap-2"
            >
              <Clock className="h-3 w-3" />
              {time}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTime(time)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {!disabled && (
        <>
          {/* Add New Time */}
          <div className="flex gap-2">
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1"
            />
            <Button type="button" onClick={addTime} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {/* Quick Add Suggestions */}
          <Card className="p-3 bg-muted/50">
            <p className="text-xs font-medium mb-2">Horários Sugeridos:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTimes
                .filter(({ value }) => !times.includes(value))
                .map(({ label, value }) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewTime(value);
                      if (!times.includes(value)) {
                        onChange([...times, value].sort());
                      }
                    }}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
