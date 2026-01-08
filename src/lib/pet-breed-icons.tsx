import React from "react";
import { LucideIcon } from "lucide-react";
import {
  GoldenRetrieverIcon,
  CavalierIcon,
  ViraLataIcon,
  ShitzuIcon,
  BeagleIcon,
  SalsichaIcon,
  PomeranianIcon,
  ChihuahuaIcon,
  LabradorIcon,
  YorkshireIcon,
  PugIcon,
  FrenchBulldogIcon,
  HuskyIcon,
  PoodleIcon,
} from "@/components/pet-breed-icons";

export type BreedIconType = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  ringColor: string;
};

const breedIconMap: Record<string, BreedIconType> = {
  // Golden Retriever
  "golden": {
    icon: GoldenRetrieverIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "golden retriever": {
    icon: GoldenRetrieverIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Cavalier King Charles Spaniel
  "cavalier": {
    icon: CavalierIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "cavalier king charles spaniel": {
    icon: CavalierIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Vira-lata / Mixed Breed
  "vira lata": {
    icon: ViraLataIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "vira-lata": {
    icon: ViraLataIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "mixed breed": {
    icon: ViraLataIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "srd": {
    icon: ViraLataIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "sem raça definida": {
    icon: ViraLataIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Shitzu / Shih Tzu
  "shitzu": {
    icon: ShitzuIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "shih tzu": {
    icon: ShitzuIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Beagle
  "beagle": {
    icon: BeagleIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Salsicha / Dachshund
  "salsicha": {
    icon: SalsichaIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "dachshund": {
    icon: SalsichaIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Lulu da Pomerânia / Pomeranian
  "lulu da pomerania": {
    icon: PomeranianIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "pomeranian": {
    icon: PomeranianIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "pomerânia": {
    icon: PomeranianIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Chihuahua
  "chihuahua": {
    icon: ChihuahuaIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Labrador Retriever
  "labrador": {
    icon: LabradorIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "labrador retriever": {
    icon: LabradorIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Yorkshire Terrier
  "yorkshire": {
    icon: YorkshireIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "yorkshire terrier": {
    icon: YorkshireIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Pug
  "pug": {
    icon: PugIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Buldogue Francês / French Bulldog
  "buldogue francês": {
    icon: FrenchBulldogIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "french bulldog": {
    icon: FrenchBulldogIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "buldogue frances": {
    icon: FrenchBulldogIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Husky Siberiano
  "husky": {
    icon: HuskyIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "husky siberiano": {
    icon: HuskyIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "siberiano": {
    icon: HuskyIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  
  // Poodle
  "poodle": {
    icon: PoodleIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
  "pudel": {
    icon: PoodleIcon,
    color: "hsl(220 16% 38%)",
    bgColor: "hsl(220 14% 96%)",
    ringColor: "hsl(220 14% 88%)",
  },
};

const defaultIcon: BreedIconType = {
  icon: ViraLataIcon, // Ícone padrão para raças não mapeadas
  color: "hsl(220 16% 38%)",
  bgColor: "hsl(220 14% 96%)",
  ringColor: "hsl(220 14% 88%)",
};

export function getBreedIcon(breed?: string | null): BreedIconType {
  if (!breed) return defaultIcon;
  
  const normalizedBreed = breed.toLowerCase().trim();
  return breedIconMap[normalizedBreed] || defaultIcon;
}
