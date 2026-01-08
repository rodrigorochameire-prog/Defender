import { Dog } from "lucide-react";

// Mapeamento de raças para ícones simplificados
// Como não temos os SVGs originais, vamos usar o ícone Dog do Lucide com diferentes classes
export const BREED_ICONS: Record<string, typeof Dog> = {
  "golden retriever": Dog,
  "cavalier king charles spaniel": Dog,
  "vira-lata": Dog,
  "mixed breed": Dog,
  "shitzu": Dog,
  "shih tzu": Dog,
  "beagle": Dog,
  "salsicha": Dog,
  "dachshund": Dog,
  "lulu da pomerania": Dog,
  "pomeranian": Dog,
  "chihuahua": Dog,
  "labrador retriever": Dog,
  "labrador": Dog,
  "yorkshire terrier": Dog,
  "yorkshire": Dog,
  "pug": Dog,
  "buldogue frances": Dog,
  "bulldog frances": Dog,
  "french bulldog": Dog,
  "pastor alemao": Dog,
  "german shepherd": Dog,
  "boxer": Dog,
  "dalmata": Dog,
  "dalmatian": Dog,
  "cocker spaniel": Dog,
  "sao bernardo": Dog,
  "saint bernard": Dog,
  "husky siberiano": Dog,
  "siberian husky": Dog,
  "poodle": Dog,
  "shiba inu": Dog,
  "galgo": Dog,
  "greyhound": Dog,
  "border collie": Dog,
  "malamute do alasca": Dog,
  "alaskan malamute": Dog,
  "chow chow": Dog,
};

export function getBreedIcon(breed: string | null | undefined): typeof Dog {
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
