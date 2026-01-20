"use client";

import Image from 'next/image';
import { BreedIcon } from './breed-icons';
import { cn } from '@/lib/utils';

interface PetAvatarProps {
  photoUrl?: string | null;
  breed?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  rounded?: "full" | "xl" | "lg" | "md";
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const ROUNDED_MAP = {
  full: "rounded-full",
  xl: "rounded-xl",
  lg: "rounded-lg",
  md: "rounded-md",
};

/**
 * Componente padronizado para exibir avatar de pet.
 * Usa foto do pet se disponível, senão mostra ícone da raça.
 * 
 * IMPORTANTE: Este é o componente oficial para avatares de pets.
 * NÃO use BreedIcon diretamente com posicionamento absolute sobre o avatar.
 */
export function PetAvatar({ 
  photoUrl, 
  breed, 
  name, 
  size = "md", 
  className,
  rounded = "xl"
}: PetAvatarProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const roundedClass = ROUNDED_MAP[rounded];
  
  if (photoUrl) {
    return (
      <div 
        className={cn(
          "relative overflow-hidden flex-shrink-0 bg-muted", 
          roundedClass,
          className
        )} 
        style={{ width: pixelSize, height: pixelSize }}
      >
        <Image
          src={photoUrl}
          alt={name || 'Pet'}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <BreedIcon 
      breed={breed} 
      size={pixelSize} 
      className={cn(roundedClass, className)} 
    />
  );
}

/**
 * Componente de avatar com informações do pet ao lado
 * Para uso em listas e cards
 */
interface PetAvatarWithInfoProps extends PetAvatarProps {
  petName: string;
  subtitle?: string;
  href?: string;
}

export function PetAvatarWithInfo({
  photoUrl,
  breed,
  petName,
  subtitle,
  size = "md",
  className,
  rounded = "xl",
  href,
}: PetAvatarWithInfoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <PetAvatar
        photoUrl={photoUrl}
        breed={breed}
        name={petName}
        size={size}
        rounded={rounded}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{petName}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}
