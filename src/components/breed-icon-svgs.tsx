// Componentes SVG customizados para cada raça de cachorro
// Baseados nas ilustrações fornecidas

export const GoldenRetrieverIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 35 Q25 30 25 25 Q25 20 30 18 Q35 20 35 25 Q35 30 30 35" />
    <path d="M50 20 Q40 15 35 25 L30 35 Q28 45 30 55 L35 65 Q40 70 50 70 Q60 70 65 65 L70 55 Q72 45 70 35 L65 25 Q60 15 50 20" />
    <path d="M70 35 Q75 30 75 25 Q75 20 70 18 Q65 20 65 25 Q65 30 70 35" />
    <path d="M42 35 Q42 38 45 38 Q48 38 48 35" />
    <path d="M52 35 Q52 38 55 38 Q58 38 58 35" />
    <path d="M50 42 L50 48 M45 52 Q50 55 55 52" />
    <path d="M35 65 L30 80" strokeWidth="3" />
  </svg>
);

export const CavalierIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M28 30 Q22 25 20 30 Q18 35 20 40 L25 45" />
    <path d="M72 30 Q78 25 80 30 Q82 35 80 40 L75 45" />
    <ellipse cx="50" cy="45" rx="22" ry="25" />
    <path d="M40 40 Q40 43 42 43 Q44 43 44 40" />
    <path d="M56 40 Q56 43 58 43 Q60 43 60 40" />
    <path d="M50 48 L50 52 M46 55 Q50 58 54 55" />
    <path d="M28 45 Q25 50 25 58 L28 65" strokeWidth="3" />
    <path d="M72 45 Q75 50 75 58 L72 65" strokeWidth="3" />
  </svg>
);

export const MixedBreedIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 28 Q28 22 30 18 Q35 20 35 25 L32 32" />
    <path d="M68 28 Q72 22 70 18 Q65 20 65 25 L68 32" />
    <ellipse cx="50" cy="45" rx="20" ry="22" />
    <path d="M42 42 Q42 45 44 45 Q46 45 46 42" />
    <path d="M54 42 Q54 45 56 45 Q58 45 58 42" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M35 62 L32 75" strokeWidth="3" />
  </svg>
);

export const ShihTzuIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="50" cy="45" rx="25" ry="28" />
    <path d="M30 25 Q25 20 22 25 L25 35" strokeWidth="3" />
    <path d="M70 25 Q75 20 78 25 L75 35" strokeWidth="3" />
    <path d="M40 42 Q40 45 42 45 Q44 45 44 42" />
    <path d="M56 42 Q56 45 58 45 Q60 45 60 42" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M30 30 Q28 35 28 42" strokeWidth="2" />
    <path d="M70 30 Q72 35 72 42" strokeWidth="2" />
  </svg>
);

export const BeagleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M28 32 Q25 28 25 35 L28 48" strokeWidth="3" />
    <path d="M72 32 Q75 28 75 35 L72 48" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="20" ry="23" />
    <path d="M42 45 Q42 48 44 48 Q46 48 46 45" />
    <path d="M54 45 Q54 48 56 48 Q58 48 58 45" />
    <path d="M50 52 L50 56 M45 59 Q50 62 55 59" />
    <path d="M35 68 L32 78" strokeWidth="3" />
  </svg>
);

export const DachshundIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 35 Q28 30 28 38 L30 48" strokeWidth="3" />
    <path d="M70 35 Q72 30 72 38 L70 48" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="18" ry="20" />
    <path d="M43 45 Q43 48 45 48 Q47 48 47 45" />
    <path d="M53 45 Q53 48 55 48 Q57 48 57 45" />
    <path d="M50 52 L50 56 M46 58 Q50 61 54 58" />
    <path d="M38 65 L35 75" strokeWidth="3" />
  </svg>
);

export const PomeranianIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="45" r="22" strokeWidth="3" />
    <path d="M32 28 Q28 25 30 30 L32 35" />
    <path d="M68 28 Q72 25 70 30 L68 35" />
    <path d="M42 43 Q42 46 44 46 Q46 46 46 43" />
    <path d="M54 43 Q54 46 56 46 Q58 46 58 43" />
    <path d="M50 50 L50 53 M46 56 Q50 59 54 56" />
    <path d="M35 35 Q30 38 30 45" strokeWidth="2" />
    <path d="M65 35 Q70 38 70 45" strokeWidth="2" />
  </svg>
);

export const ChihuahuaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 25 L28 18 L35 20 L35 30" />
    <path d="M68 25 L72 18 L65 20 L65 30" />
    <ellipse cx="50" cy="45" rx="18" ry="20" />
    <path d="M42 42 Q42 45 44 45 Q46 45 46 42" />
    <path d="M54 42 Q54 45 56 45 Q58 45 58 42" />
    <path d="M50 49 L50 53 M46 55 Q50 58 54 55" />
    <path d="M38 62 L35 72" strokeWidth="3" />
  </svg>
);

export const LabradorIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 32 Q26 28 26 35 L28 45" strokeWidth="3" />
    <path d="M70 32 Q74 28 74 35 L72 45" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="21" ry="24" />
    <path d="M42 44 Q42 47 44 47 Q46 47 46 44" />
    <path d="M54 44 Q54 47 56 47 Q58 47 58 44" />
    <path d="M50 52 L50 56 M45 59 Q50 62 55 59" />
    <path d="M34 66 L30 78" strokeWidth="3" />
  </svg>
);

export const YorkshireIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M35 30 Q32 25 30 28 Q28 32 30 38" strokeWidth="2" />
    <path d="M65 30 Q68 25 70 28 Q72 32 70 38" strokeWidth="2" />
    <ellipse cx="50" cy="45" rx="16" ry="18" />
    <path d="M43 42 Q43 45 45 45 Q47 45 47 42" />
    <path d="M53 42 Q53 45 55 45 Q57 45 57 42" />
    <path d="M50 49 L50 52 M46 54 Q50 57 54 54" />
    <path d="M30 38 Q28 42 28 48" strokeWidth="2" />
    <path d="M70 38 Q72 42 72 48" strokeWidth="2" />
  </svg>
);

export const PugIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="50" cy="45" rx="22" ry="24" />
    <path d="M38 40 Q38 43 40 43 Q42 43 42 40" />
    <path d="M58 40 Q58 43 60 43 Q62 43 62 40" />
    <path d="M50 48 L50 52 M44 55 Q50 58 56 55" />
    <path d="M35 35 Q32 38 32 45" strokeWidth="3" />
    <path d="M65 35 Q68 38 68 45" strokeWidth="3" />
    <path d="M40 50 Q45 53 50 53 Q55 53 60 50" strokeWidth="2" />
  </svg>
);

export const FrenchBulldogIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 22 L28 18 L32 28 L35 35" strokeWidth="3" />
    <path d="M68 22 L72 18 L68 28 L65 35" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="20" ry="22" />
    <path d="M40 44 Q40 47 42 47 Q44 47 44 44" />
    <path d="M56 44 Q56 47 58 47 Q60 47 60 44" />
    <path d="M50 51 L50 55 M45 58 Q50 61 55 58" />
    <path d="M38 66 L35 75" strokeWidth="3" />
  </svg>
);

export const GermanShepherdIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 20 L28 12 L35 18 L38 28" strokeWidth="2.5" />
    <path d="M68 20 L72 12 L65 18 L62 28" strokeWidth="2.5" />
    <ellipse cx="50" cy="45" rx="20" ry="23" />
    <path d="M42 42 Q42 45 44 45 Q46 45 46 42" />
    <path d="M54 42 Q54 45 56 45 Q58 45 58 42" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M35 64 L32 76" strokeWidth="3" />
  </svg>
);

export const BoxerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 35 Q28 30 28 38 L30 48" strokeWidth="3" />
    <path d="M70 35 Q72 30 72 38 L70 48" strokeWidth="3" />
    <ellipse cx="50" cy="50" rx="19" ry="21" />
    <path d="M42 46 Q42 49 44 49 Q46 49 46 46" />
    <path d="M54 46 Q54 49 56 49 Q58 49 58 46" />
    <path d="M50 53 L50 57 M45 60 Q50 63 55 60" />
    <path d="M36 66 L33 76" strokeWidth="3" />
  </svg>
);

export const DalmatianIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 32 Q26 28 26 35 L28 45" strokeWidth="3" />
    <path d="M70 32 Q74 28 74 35 L72 45" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="20" ry="23" />
    <circle cx="38" cy="38" r="2" fill="currentColor" />
    <circle cx="45" cy="50" r="2" fill="currentColor" />
    <circle cx="55" cy="50" r="2" fill="currentColor" />
    <circle cx="62" cy="38" r="2" fill="currentColor" />
    <path d="M42 44 Q42 47 44 47 Q46 47 46 44" />
    <path d="M54 44 Q54 47 56 47 Q58 47 58 44" />
    <path d="M50 52 L50 56 M45 59 Q50 62 55 59" />
  </svg>
);

export const CockerSpanielIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M25 30 Q20 28 18 33 Q18 40 22 48" strokeWidth="3" />
    <path d="M75 30 Q80 28 82 33 Q82 40 78 48" strokeWidth="3" />
    <ellipse cx="50" cy="48" rx="22" ry="25" />
    <path d="M41 44 Q41 47 43 47 Q45 47 45 44" />
    <path d="M55 44 Q55 47 57 47 Q59 47 59 44" />
    <path d="M50 52 L50 56 M45 59 Q50 62 55 59" />
  </svg>
);

export const SaintBernardIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M28 35 Q24 30 24 38 L26 48" strokeWidth="3.5" />
    <path d="M72 35 Q76 30 76 38 L74 48" strokeWidth="3.5" />
    <ellipse cx="50" cy="50" rx="24" ry="27" />
    <path d="M40 46 Q40 49 42 49 Q44 49 44 46" />
    <path d="M56 46 Q56 49 58 49 Q60 49 60 46" />
    <path d="M50 54 L50 58 M44 61 Q50 64 56 61" />
    <path d="M32 68 L28 80" strokeWidth="4" />
  </svg>
);

export const HuskyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 20 L28 12 L35 18 L38 28" strokeWidth="2.5" />
    <path d="M68 20 L72 12 L65 18 L62 28" strokeWidth="2.5" />
    <ellipse cx="50" cy="46" rx="21" ry="24" />
    <path d="M41 42 Q41 45 43 45 Q45 45 45 42" />
    <path d="M55 42 Q55 45 57 45 Q59 45 59 42" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M35 30 L40 40" strokeWidth="2" />
    <path d="M65 30 L60 40" strokeWidth="2" />
  </svg>
);

export const PoodleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="42" r="18" strokeWidth="3" />
    <path d="M35 28 Q32 24 32 30 L34 36" />
    <path d="M65 28 Q68 24 68 30 L66 36" />
    <path d="M43 40 Q43 43 45 43 Q47 43 47 40" />
    <path d="M53 40 Q53 43 55 43 Q57 43 57 40" />
    <path d="M50 47 L50 50 M46 52 Q50 55 54 52" />
    <circle cx="40" cy="65" r="5" strokeWidth="2.5" />
    <circle cx="60" cy="65" r="5" strokeWidth="2.5" />
  </svg>
);

export const ShibaInuIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 20 L28 14 L34 18 L36 28" strokeWidth="2.5" />
    <path d="M68 20 L72 14 L66 18 L64 28" strokeWidth="2.5" />
    <ellipse cx="50" cy="45" rx="19" ry="22" />
    <path d="M42 42 Q42 45 44 45 Q46 45 46 42" />
    <path d="M54 42 Q54 45 56 45 Q58 45 58 42" />
    <path d="M50 49 L50 53 M45 56 Q50 59 55 56" />
    <path d="M36 63 L33 73" strokeWidth="3" />
  </svg>
);

export const GreyhoundIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 32 Q28 28 28 35 L30 45" strokeWidth="2.5" />
    <path d="M70 32 Q72 28 72 35 L70 45" strokeWidth="2.5" />
    <ellipse cx="50" cy="48" rx="17" ry="20" />
    <path d="M43 44 Q43 47 45 47 Q47 47 47 44" />
    <path d="M53 44 Q53 47 55 47 Q57 47 57 44" />
    <path d="M50 51 L50 55 M46 57 Q50 60 54 57" />
    <path d="M38 65 L35 78" strokeWidth="2.5" />
  </svg>
);

export const BorderCollieIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 28 Q26 24 26 32 L28 42" strokeWidth="3" />
    <path d="M70 28 Q74 24 74 32 L72 42" strokeWidth="3" />
    <ellipse cx="50" cy="46" rx="20" ry="23" />
    <path d="M42 43 Q42 46 44 46 Q46 46 46 43" />
    <path d="M54 43 Q54 46 56 46 Q58 46 58 43" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M35 64 L32 75" strokeWidth="3" />
    <path d="M40 35 L45 42" strokeWidth="2" />
    <path d="M60 35 L55 42" strokeWidth="2" />
  </svg>
);

export const MalamuteIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 18 L28 10 L35 16 L38 26" strokeWidth="2.5" />
    <path d="M68 18 L72 10 L65 16 L62 26" strokeWidth="2.5" />
    <ellipse cx="50" cy="46" rx="22" ry="25" />
    <path d="M41 42 Q41 45 43 45 Q45 45 45 42" />
    <path d="M55 42 Q55 45 57 45 Q59 45 59 42" />
    <path d="M50 50 L50 54 M45 57 Q50 60 55 57" />
    <path d="M34 66 L30 78" strokeWidth="3.5" />
  </svg>
);

export const ChowChowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="45" r="24" strokeWidth="3.5" />
    <path d="M32 28 Q28 25 30 32 L32 38" strokeWidth="2.5" />
    <path d="M68 28 Q72 25 70 32 L68 38" strokeWidth="2.5" />
    <path d="M41 42 Q41 45 43 45 Q45 45 45 42" />
    <path d="M55 42 Q55 45 57 45 Q59 45 59 42" />
    <path d="M50 50 L50 53 M46 56 Q50 59 54 56" />
    <path d="M35 35 Q30 38 30 45" strokeWidth="2.5" />
    <path d="M65 35 Q70 38 70 45" strokeWidth="2.5" />
  </svg>
);
