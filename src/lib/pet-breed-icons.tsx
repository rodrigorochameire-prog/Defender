import { 
  Circle, 
  Hexagon, 
  Pentagon, 
  Square, 
  Triangle, 
  Sparkles,
  LucideIcon
} from "lucide-react";

export type BreedIconType = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  ringColor: string;
};

const breedIconMap: Record<string, BreedIconType> = {
  "golden": {
    icon: Circle,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "golden retriever": {
    icon: Circle,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "cavalier": {
    icon: Hexagon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "cavalier king charles spaniel": {
    icon: Hexagon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "shitzu": {
    icon: Pentagon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "shih tzu": {
    icon: Pentagon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "labrador": {
    icon: Square,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "labrador retriever": {
    icon: Square,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "beagle": {
    icon: Triangle,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "vira lata": {
    icon: Sparkles,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "srd": {
    icon: Sparkles,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "sem raça definida": {
    icon: Sparkles,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
};

const defaultIcon: BreedIconType = {
  icon: Circle,
  color: "hsl(220 16% 38%)",
  bgColor: "hsl(220 14% 96%)",
  ringColor: "hsl(220 14% 88%)",
};

export function getBreedIcon(breed?: string | null): BreedIconType {
  if (!breed) return defaultIcon;
  
  const normalizedBreed = breed.toLowerCase().trim();
  return breedIconMap[normalizedBreed] || defaultIcon;
}
