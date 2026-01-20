'use client';

import { cn } from '@/lib/utils';

interface BreedIconWrapperProps {
  iconFile: string;
  breed?: string;
  size?: number;
  className?: string;
}

export function BreedIconWrapper({ iconFile, breed, size = 48, className }: BreedIconWrapperProps) {
  const imageUrl = `/breed-icons/${iconFile}.png?v=3`;
  
  return (
    <div 
      className={cn("relative flex-shrink-0", className)} 
      style={{ 
        width: size, 
        height: size,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
      role="img"
      aria-label={breed || 'Pet'}
    />
  );
}
