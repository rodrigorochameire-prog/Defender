# 🐕 Como Usar os Ícones de Raças em PNG

Os ícones de raças de cães foram integrados ao aplicativo TeteCare em formato PNG.

## 📁 Localização dos Arquivos

Todos os 24 ícones estão em: `public/breed-icons/`

## 🎨 Ícones Disponíveis

1. golden_retriever.png
2. cavalier_king_charles_spaniel.png
3. vira_lata_mixed_breed.png
4. shitzu.png
5. beagle.png
6. salsicha_dachshund.png
7. lulu_da_pomerania_pomeranian.png
8. chihuahua.png
9. labrador_retriever.png
10. yorkshire_terrier.png
11. pug.png
12. buldogue_frances_french_bulldog.png
13. pastor_alemao.png
14. boxer.png
15. dalmata.png
16. cocker_spaniel.png
17. sao_bernardo.png
18. husky_siberiano.png
19. poodle.png
20. shiba_inu.png
21. galgo.png
22. border_collie.png
23. malamute_do_alasca.png
24. chow_chow.png

## 💻 Como Usar no Código

### Opção 1: Importar o Componente React

```tsx
import { GoldenRetrieverIcon, BeagleIcon, PugIcon } from '@/components/breed-icon-pngs';

// Usar no JSX
<GoldenRetrieverIcon className="w-16 h-16" />
<BeagleIcon className="w-12 h-12" />
```

### Opção 2: Usar Diretamente com Next.js Image

```tsx
import Image from 'next/image';

<Image 
  src="/breed-icons/golden_retriever.png" 
  alt="Golden Retriever" 
  width={64} 
  height={64}
  className="rounded-full"
/>
```

### Opção 3: Usar como Background ou IMG

```tsx
// Como background
<div 
  style={{ backgroundImage: 'url(/breed-icons/beagle.png)' }}
  className="w-16 h-16 bg-cover bg-center"
/>

// Como img tag
<img 
  src="/breed-icons/pug.png" 
  alt="Pug" 
  className="w-16 h-16"
/>
```

## 📦 Componentes Disponíveis

Todos os componentes estão em `src/components/breed-icon-pngs.tsx`:

- `GoldenRetrieverIcon`
- `CavalierIcon`
- `MixedBreedIcon`
- `ShihTzuIcon`
- `BeagleIcon`
- `DachshundIcon`
- `PomeranianIcon`
- `ChihuahuaIcon`
- `LabradorIcon`
- `YorkshireIcon`
- `PugIcon`
- `FrenchBulldogIcon`
- `GermanShepherdIcon`
- `BoxerIcon`
- `DalmatianIcon`
- `CockerSpanielIcon`
- `SaintBernardIcon`
- `HuskyIcon`
- `PoodleIcon`
- `ShibaInuIcon`
- `GreyhoundIcon`
- `BorderCollieIcon`
- `MalamuteIcon`
- `ChowChowIcon`

## 🎯 Exemplo de Uso em Página

```tsx
import { GoldenRetrieverIcon, BeagleIcon } from '@/components/breed-icon-pngs';

export default function PetsPage() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="flex flex-col items-center">
        <GoldenRetrieverIcon className="w-20 h-20" />
        <p>Golden Retriever</p>
      </div>
      <div className="flex flex-col items-center">
        <BeagleIcon className="w-20 h-20" />
        <p>Beagle</p>
      </div>
    </div>
  );
}
```

## 🔧 Customização

Os ícones PNG podem ser customizados com classes Tailwind:

```tsx
<GoldenRetrieverIcon 
  className="w-24 h-24 rounded-full border-2 border-blue-500 shadow-lg"
/>
```

## 📝 Notas

- Os ícones são extraídos diretamente da imagem de referência fornecida
- Cada ícone mantém o design original minimalista em preto e branco
- Os arquivos PNG têm fundo transparente (ou branco, dependendo da extração)
- Tamanho recomendado de exibição: 64x64 a 128x128 pixels

---

**Última atualização:** 2026-01-08
