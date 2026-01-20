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
  
  // Vira-Latas Específicos
  'vira-lata caramelo': 'viralatacaramelo',
  'vira lata caramelo': 'viralatacaramelo',
  'vira-lata pretinho': 'viralatapretinho',
  'vira lata pretinho': 'viralatapretinho',
  'vira-lata preto e caramelo': 'viralatapretocaramelo',
  'vira lata preto e caramelo': 'viralatapretocaramelo',
  'vira-lata preto e caramelo forte': 'viralatapretocaramelo2',
  'vira lata preto e caramelo forte': 'viralatapretocaramelo2',
  'vira-lata fiapo de manga': 'viralatafiapodemanga',
  'vira lata fiapo de manga': 'viralatafiapodemanga',
  
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
  
  // Maltês
  'maltese': 'maltes',
  'maltes': 'maltes',
  'maltês': 'maltes',
  
  // Lhasa Apso
  'lhasa apso': 'lhasaapso',
  'lhasa': 'lhasaapso',
  
  // Buldogue Inglês
  'english bulldog': 'bulldogingles',
  'buldogue ingles': 'bulldogingles',
  'bulldog ingles': 'bulldogingles',
  'buldogue inglês': 'bulldogingles',
  
  // Jack Russell Terrier
  'jack russell terrier': 'jackrussel',
  'jack russell': 'jackrussel',
  
  // Lebrel Italiano
  'italian greyhound': 'lebrelitaliano',
  'lebrel italiano': 'lebrelitaliano',
  
  // Labrador Preto
  'black labrador': 'labradorpreto',
  'labrador preto': 'labradorpreto',
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

export function BreedIcon({ breed, className, size = 56 }: BreedIconProps) {
  // Normalizar o nome da raça
  const normalizedBreed = breed?.toLowerCase().trim();
  
  // Buscar o ícone correspondente
  const iconFile = normalizedBreed ? BREED_ICON_MAP[normalizedBreed] : null;
  
  // Imagem maior que o container para ser cortada na parte de baixo
  // A imagem tem 95% da largura e 110% da altura (para "sair" do container)
  const imageWidth = Math.round(size * 0.92);
  const imageHeight = Math.round(size * 1.15);
  
  if (iconFile) {
    return (
      <div 
        className={cn(
          "relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900",
          "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.06)]",
          "ring-1 ring-slate-200/60 dark:ring-slate-700/40",
          "transition-all duration-200 ease-out",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]",
          "hover:ring-slate-300/80 dark:hover:ring-slate-600/60",
          "hover:-translate-y-0.5",
          className
        )} 
        style={{ width: size, height: size }}
      >
        {/* Container posicionado para a imagem "sair" na parte de baixo */}
        <div 
          className="absolute left-1/2 -translate-x-1/2" 
          style={{ 
            width: imageWidth, 
            height: imageHeight,
            top: Math.round(size * 0.08), // Espaço no topo (~8% do tamanho)
          }}
        >
          <Image
            src={`/breed-icons/${iconFile}.png?v=18`}
            alt={breed || 'Pet'}
            fill
            className="object-contain object-top"
            sizes={`${imageWidth}px`}
          />
        </div>
      </div>
    );
  }
  
  // Fallback: ícone genérico de cachorro
  return (
    <div 
      className={cn(
        "rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700/40",
        className
      )} 
      style={{ width: size, height: size }}
    >
      <Dog className="text-slate-400 dark:text-slate-500" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}
