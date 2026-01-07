/**
 * Dosage Progression Calculator
 * 
 * Handles progressive (increase) and regressive (decrease) dosage adjustments
 * for medications that require gradual dose changes.
 */

export interface DosageProgressionConfig {
  dosageProgression: "stable" | "increase" | "decrease";
  progressionRate: string; // e.g., "10%", "5mg", "0.5ml"
  progressionInterval: number; // adjust every X doses
  targetDosage?: string; // optional target dosage
  currentDoseCount: number; // current dose number
}

export interface ParsedDosage {
  value: number;
  unit: string; // "mg", "ml", "comprimido", etc.
}

/**
 * Parse dosage string into value and unit
 * Examples: "10mg" → {value: 10, unit: "mg"}
 *           "1.5ml" → {value: 1.5, unit: "ml"}
 *           "2 comprimidos" → {value: 2, unit: "comprimidos"}
 */
export function parseDosage(dosage: string): ParsedDosage {
  const trimmed = dosage.trim().toLowerCase();
  
  // Match number (including decimals) followed by optional unit
  const match = trimmed.match(/^([\d.]+)\s*(.*)$/);
  
  if (!match) {
    throw new Error(`Invalid dosage format: ${dosage}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || "";
  
  if (isNaN(value)) {
    throw new Error(`Invalid dosage value: ${dosage}`);
  }
  
  return { value, unit };
}

/**
 * Parse progression rate into value and type (percentage or absolute)
 * Examples: "10%" → {value: 10, isPercentage: true}
 *           "5mg" → {value: 5, isPercentage: false, unit: "mg"}
 */
export function parseProgressionRate(rate: string): {
  value: number;
  isPercentage: boolean;
  unit?: string;
} {
  const trimmed = rate.trim();
  
  // Check for percentage
  if (trimmed.endsWith("%")) {
    const value = parseFloat(trimmed.slice(0, -1));
    if (isNaN(value)) {
      throw new Error(`Invalid progression rate: ${rate}`);
    }
    return { value, isPercentage: true };
  }
  
  // Parse as absolute value with unit
  const parsed = parseDosage(trimmed);
  return {
    value: parsed.value,
    isPercentage: false,
    unit: parsed.unit,
  };
}

/**
 * Calculate the current dosage based on progression configuration
 * 
 * @param baseDosage - Initial dosage string (e.g., "10mg")
 * @param config - Progression configuration
 * @returns Current dosage string with same unit
 */
export function calculateProgressiveDosage(
  baseDosage: string,
  config: DosageProgressionConfig
): string {
  // If stable, return base dosage
  if (config.dosageProgression === "stable") {
    return baseDosage;
  }
  
  // Parse base dosage
  const base = parseDosage(baseDosage);
  
  // Calculate how many adjustments have been made
  const adjustmentCount = Math.floor(config.currentDoseCount / config.progressionInterval);
  
  // If no adjustments yet, return base dosage
  if (adjustmentCount === 0) {
    return baseDosage;
  }
  
  // Parse progression rate
  const rate = parseProgressionRate(config.progressionRate);
  
  // Validate unit compatibility for absolute adjustments
  if (!rate.isPercentage && rate.unit && rate.unit !== base.unit) {
    throw new Error(
      `Progression rate unit (${rate.unit}) doesn't match dosage unit (${base.unit})`
    );
  }
  
  // Calculate adjustment per interval
  let adjustmentPerInterval: number;
  if (rate.isPercentage) {
    adjustmentPerInterval = base.value * (rate.value / 100);
  } else {
    adjustmentPerInterval = rate.value;
  }
  
  // Apply direction (increase or decrease)
  if (config.dosageProgression === "decrease") {
    adjustmentPerInterval = -adjustmentPerInterval;
  }
  
  // Calculate current value
  let currentValue = base.value + (adjustmentPerInterval * adjustmentCount);
  
  // Ensure dosage doesn't go below zero
  if (currentValue < 0) {
    currentValue = 0;
  }
  
  // Check if target dosage is reached
  if (config.targetDosage) {
    const target = parseDosage(config.targetDosage);
    
    if (config.dosageProgression === "increase") {
      if (currentValue > target.value) {
        currentValue = target.value;
      }
    } else if (config.dosageProgression === "decrease") {
      if (currentValue < target.value) {
        currentValue = target.value;
      }
    }
  }
  
  // Format with unit
  return `${currentValue}${base.unit}`;
}

/**
 * Generate dosage progression preview
 * Shows next N doses with their calculated dosages
 */
export function generateDosagePreview(
  baseDosage: string,
  config: DosageProgressionConfig,
  previewCount: number = 10
): Array<{ doseNumber: number; dosage: string }> {
  const preview: Array<{ doseNumber: number; dosage: string }> = [];
  
  for (let i = 0; i < previewCount; i++) {
    const doseNumber = config.currentDoseCount + i + 1;
    const dosage = calculateProgressiveDosage(baseDosage, {
      ...config,
      currentDoseCount: doseNumber - 1,
    });
    
    preview.push({ doseNumber, dosage });
  }
  
  return preview;
}

/**
 * Check if target dosage has been reached
 */
export function hasReachedTarget(
  baseDosage: string,
  config: DosageProgressionConfig
): boolean {
  if (!config.targetDosage || config.dosageProgression === "stable") {
    return false;
  }
  
  const current = parseDosage(calculateProgressiveDosage(baseDosage, config));
  const target = parseDosage(config.targetDosage);
  
  if (config.dosageProgression === "increase") {
    return current.value >= target.value;
  } else {
    return current.value <= target.value;
  }
}

/**
 * Format periodicity configuration into human-readable text
 */
export function formatPeriodicity(
  periodicity: "daily" | "weekly" | "monthly" | "custom",
  customInterval?: number,
  weekDays?: string,
  monthDays?: string
): string {
  switch (periodicity) {
    case "daily":
      return "Diária";
    
    case "weekly": {
      if (!weekDays) return "Semanal";
      
      const days = JSON.parse(weekDays) as number[];
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const selectedDays = days.map(d => dayNames[d]).join(", ");
      return `Semanal: ${selectedDays}`;
    }
    
    case "monthly": {
      if (!monthDays) return "Mensal";
      
      const days = JSON.parse(monthDays) as number[];
      return `Mensal: dias ${days.join(", ")}`;
    }
    
    case "custom":
      return customInterval ? `A cada ${customInterval} dias` : "Personalizada";
    
    default:
      return "Não configurada";
  }
}
