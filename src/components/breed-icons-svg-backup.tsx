import { Dog } from "lucide-react";
import {
  GoldenRetrieverIcon,
  CavalierIcon,
  MixedBreedIcon,
  ShihTzuIcon,
  BeagleIcon,
  DachshundIcon,
  PomeranianIcon,
  ChihuahuaIcon,
  LabradorIcon,
  YorkshireIcon,
  PugIcon,
  FrenchBulldogIcon,
  GermanShepherdIcon,
  BoxerIcon,
  DalmatianIcon,
  CockerSpanielIcon,
  SaintBernardIcon,
  HuskyIcon,
  PoodleIcon,
  ShibaInuIcon,
  GreyhoundIcon,
  BorderCollieIcon,
  MalamuteIcon,
  ChowChowIcon,
} from "./breed-icon-svgs";

// Mapeamento de raças para ícones customizados
export const BREED_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "golden retriever": GoldenRetrieverIcon,
  "cavalier king charles spaniel": CavalierIcon,
  "cavalier": CavalierIcon,
  "vira-lata": MixedBreedIcon,
  "mixed breed": MixedBreedIcon,
  "sem raça definida": MixedBreedIcon,
  "srd": MixedBreedIcon,
  "shitzu": ShihTzuIcon,
  "shih tzu": ShihTzuIcon,
  "beagle": BeagleIcon,
  "salsicha": DachshundIcon,
  "dachshund": DachshundIcon,
  "lulu da pomerania": PomeranianIcon,
  "pomeranian": PomeranianIcon,
  "spitz alemao": PomeranianIcon,
  "chihuahua": ChihuahuaIcon,
  "labrador retriever": LabradorIcon,
  "labrador": LabradorIcon,
  "yorkshire terrier": YorkshireIcon,
  "yorkshire": YorkshireIcon,
  "pug": PugIcon,
  "buldogue frances": FrenchBulldogIcon,
  "bulldog frances": FrenchBulldogIcon,
  "french bulldog": FrenchBulldogIcon,
  "pastor alemao": GermanShepherdIcon,
  "german shepherd": GermanShepherdIcon,
  "boxer": BoxerIcon,
  "dalmata": DalmatianIcon,
  "dalmatian": DalmatianIcon,
  "cocker spaniel": CockerSpanielIcon,
  "sao bernardo": SaintBernardIcon,
  "saint bernard": SaintBernardIcon,
  "husky siberiano": HuskyIcon,
  "siberian husky": HuskyIcon,
  "poodle": PoodleIcon,
  "shiba inu": ShibaInuIcon,
  "galgo": GreyhoundIcon,
  "greyhound": GreyhoundIcon,
  "border collie": BorderCollieIcon,
  "malamute do alasca": MalamuteIcon,
  "alaskan malamute": MalamuteIcon,
  "chow chow": ChowChowIcon,
};

export function getBreedIcon(breed: string | null | undefined): React.ComponentType<{ className?: string }> {
  if (!breed) return Dog;
  
  const normalizedBreed = breed.toLowerCase().trim();
  return BREED_ICONS[normalizedBreed] || Dog;
}

export function BreedIcon({ 
  breed, 
  className = "h-8 w-8" 
}: { 
  breed: string | null | undefined; 
  className?: string;
}) {
  const Icon = getBreedIcon(breed);
  return <Icon className={className} />;
}
