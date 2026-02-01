import { LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
  icon?: LucideIcon;
  isGroup?: boolean;
}

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function CustomSelect({ value, onValueChange, options, placeholder }: CustomSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.isGroup}>
            <div className="flex items-center gap-2">
              {option.icon && <option.icon className="w-4 h-4" />}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
