import Image from 'next/image';
import { Dog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreedIconProps {
  breed?: string | null;
  className?: string;
  size?: number;
}

// Mapeamento de raças para arquivos de ícones
const BREED_ICON_MAP: Record<string, string> = {
  // Golden Retriever
  'golden retriever': 'golden_retriever',
  'golden': 'golden_retriever',
  
  // Cavalier King Charles Spaniel
  'cavalier king charles spaniel': 'cavalier_king_charles_spaniel',
  'cavalier': 'cavalier_king_charles_spaniel',
  
  // Vira-Lata / Mixed Breed
  'vira-lata': 'vira_lata_mixed_breed',
  'vira lata': 'vira_lata_mixed_breed',
  'mixed breed': 'vira_lata_mixed_breed',
  'sem raça definida': 'vira_lata_mixed_breed',
  'srd': 'vira_lata_mixed_breed',
  
  // Shih Tzu
  'shih tzu': 'shitzu',
  'shitzu': 'shitzu',
  
  // Beagle
  'beagle': 'beagle',
  
  // Dachshund (Salsicha)
  'dachshund': 'salsicha_dachshund',
  'salsicha': 'salsicha_dachshund',
  'teckel': 'salsicha_dachshund',
  
  // Pomeranian (Lulu da Pomerânia)
  'pomeranian': 'lulu_da_pomerania_pomeranian',
  'lulu da pomerania': 'lulu_da_pomerania_pomeranian',
  'lulu': 'lulu_da_pomerania_pomeranian',
  'spitz alemao anao': 'lulu_da_pomerania_pomeranian',
  
  // Chihuahua
  'chihuahua': 'chihuahua',
  
  // Labrador Retriever
  'labrador retriever': 'labrador_retriever',
  'labrador': 'labrador_retriever',
  
  // Yorkshire Terrier
  'yorkshire terrier': 'yorkshire_terrier',
  'yorkshire': 'yorkshire_terrier',
  'york': 'yorkshire_terrier',
  
  // Pug
  'pug': 'pug',
  
  // French Bulldog (Buldogue Francês)
  'french bulldog': 'buldogue_frances_french_bulldog',
  'buldogue frances': 'buldogue_frances_french_bulldog',
  'bulldog frances': 'buldogue_frances_french_bulldog',
  
  // German Shepherd (Pastor Alemão)
  'german shepherd': 'pastor_alemao',
  'pastor alemao': 'pastor_alemao',
  'pastor': 'pastor_alemao',
  
  // Boxer
  'boxer': 'boxer',
  
  // Dalmatian (Dálmata)
  'dalmatian': 'dalmata',
  'dalmata': 'dalmata',
  
  // Cocker Spaniel
  'cocker spaniel': 'cocker_spaniel',
  'cocker': 'cocker_spaniel',
  
  // Saint Bernard (São Bernardo)
  'saint bernard': 'sao_bernardo',
  'sao bernardo': 'sao_bernardo',
  'são bernardo': 'sao_bernardo',
  
  // Siberian Husky
  'siberian husky': 'husky_siberiano',
  'husky siberiano': 'husky_siberiano',
  'husky': 'husky_siberiano',
  
  // Poodle
  'poodle': 'poodle',
  
  // Shiba Inu
  'shiba inu': 'shiba_inu',
  'shiba': 'shiba_inu',
  
  // Greyhound (Galgo)
  'greyhound': 'galgo',
  'galgo': 'galgo',
  
  // Border Collie
  'border collie': 'border_collie',
  'border': 'border_collie',
  
  // Alaskan Malamute
  'alaskan malamute': 'malamute_do_alasca',
  'malamute': 'malamute_do_alasca',
  
  // Chow Chow
  'chow chow': 'chow_chow',
  'chow': 'chow_chow',
};

// Função auxiliar para compatibilidade com código antigo
export function getBreedIcon(breed: string | null | undefined) {
  // Retorna um componente wrapper que usa BreedIcon
  const BreedIconWrapper = ({ className }: { className?: string }) => (
    <BreedIcon breed={breed} className={className} size={32} />
  );
  BreedIconWrapper.displayName = `BreedIconWrapper(${breed || 'unknown'})`;
  return BreedIconWrapper;
}

export function BreedIcon({ breed, className, size = 48 }: BreedIconProps) {
  // Normalizar o nome da raça
  const normalizedBreed = breed?.toLowerCase().trim();
  
  // Buscar o ícone correspondente
  const iconFile = normalizedBreed ? BREED_ICON_MAP[normalizedBreed] : null;
  
  if (iconFile) {
    return (
      <div 
        className={cn(
          "relative rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-black/5",
          className
        )} 
        style={{ width: size, height: size }}
      >
        <Image
          src={`/breed-icons/${iconFile}.png`}
          alt={breed || 'Pet'}
          fill
          className="object-cover scale-[1.02]"
          sizes={`${size}px`}
        />
      </div>
    );
  }
  
  // Fallback: ícone genérico de cachorro
  return (
    <div 
      className={cn(
        "rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm ring-1 ring-black/5",
        className
      )} 
      style={{ width: size, height: size }}
    >
      <Dog className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
