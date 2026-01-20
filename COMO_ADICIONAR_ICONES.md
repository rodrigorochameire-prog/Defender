# 🐕 Como Adicionar Ícones de Raças de Cachorros

Guia passo a passo para adicionar novos ícones de raças na aplicação TeteCare.

---

## 📋 Método Automático (RECOMENDADO)

### Passo 1: Preparar os Arquivos SVG

1. Organize seus arquivos SVG com nomes descritivos:
   ```
   golden_retriever.svg
   cavalier_king_charles_spaniel.svg
   vira_lata_mixed_breed.svg
   shitzu.svg
   beagle.svg
   ...etc
   ```

2. Crie a pasta de ícones:
   ```bash
   mkdir -p public/breed-icons
   ```

3. Copie todos os seus arquivos SVG para lá:
   ```bash
   cp ~/Downloads/*.svg public/breed-icons/
   ```

### Passo 2: Executar o Script Conversor

```bash
node scripts/convert-breed-svgs.js
```

O script irá:
- ✅ Ler todos os SVGs da pasta `public/breed-icons/`
- ✅ Converter automaticamente para componentes React
- ✅ Gerar o arquivo `src/components/breed-icon-svgs.tsx`
- ✅ Mostrar os imports que você precisa adicionar

### Passo 3: Atualizar os Mapeamentos

Abra `src/components/breed-icons.tsx` e adicione os mapeamentos:

```tsx
import {
  GoldenRetrieverIcon,
  CavalierIcon,
  MixedBreedIcon,
  // ... adicione os novos aqui
} from "./breed-icon-svgs";

export const BREED_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "golden retriever": GoldenRetrieverIcon,
  "cavalier king charles spaniel": CavalierIcon,
  "cavalier": CavalierIcon,
  "vira-lata": MixedBreedIcon,
  "mixed breed": MixedBreedIcon,
  // ... adicione os novos mapeamentos aqui
};
```

### Passo 4: Testar

```bash
npm run dev
```

Acesse qualquer página com pets e verifique se os ícones aparecem corretamente!

---

## 🛠️ Método Manual (Se preferir fazer à mão)

### 1. Abrir o Arquivo SVG

Abra o arquivo SVG em um editor de texto e copie o conteúdo.

### 2. Criar o Componente

Em `src/components/breed-icon-svgs.tsx`, adicione:

```tsx
export const NovaRacaIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Cole aqui o conteúdo interno do SVG */}
    <path d="..." />
    <circle cx="..." cy="..." r="..." />
  </svg>
);
```

**Importante:**
- Use `viewBox="0 0 100 100"` (consistência)
- Use `stroke="currentColor"` (cor dinâmica)
- Remova `fill` fixos
- Remova círculos externos de contorno

### 3. Registrar no Mapeamento

Em `src/components/breed-icons.tsx`:

```tsx
export const BREED_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // ... existentes
  "nova raca": NovaRacaIcon,
  "new breed": NovaRacaIcon,
};
```

---

## 🎨 Dicas para SVGs de Qualidade

### Requisitos Técnicos
- ✅ ViewBox: `0 0 100 100`
- ✅ Stroke width: `2` a `3`
- ✅ Usar apenas `stroke`, não `fill`
- ✅ StrokeLinecap: `round`
- ✅ StrokeLinejoin: `round`

### Estilo Visual
- 🎨 Linhas limpas e simples
- 🎨 Desenho minimalista (outline)
- 🎨 Foco nas características distintivas da raça
- 🎨 Boa legibilidade em tamanhos pequenos

### Ferramentas Recomendadas
1. **Figma** - Design vetorial online
2. **Inkscape** - Editor SVG gratuito
3. **Adobe Illustrator** - Profissional

---

## 📦 Estrutura de Arquivos

```
TeteCareHub/
├── public/
│   └── breed-icons/          # ← Coloque seus SVGs aqui
│       ├── golden_retriever.svg
│       ├── beagle.svg
│       └── ...
├── src/
│   └── components/
│       ├── breed-icons.tsx        # Mapeamentos de raças
│       └── breed-icon-svgs.tsx    # Componentes React
└── scripts/
    └── convert-breed-svgs.js      # Script conversor
```

---

## 🚀 Lista de Raças Suportadas

Após executar o script, todas essas raças estarão disponíveis:

- ✅ Golden Retriever
- ✅ Cavalier King Charles Spaniel
- ✅ Vira-Lata / Mixed Breed
- ✅ Shih Tzu
- ✅ Beagle
- ✅ Dachshund (Salsicha)
- ✅ Pomeranian (Lulu da Pomerânia)
- ✅ Chihuahua
- ✅ Labrador Retriever
- ✅ Yorkshire Terrier
- ✅ Pug
- ✅ French Bulldog
- ✅ German Shepherd (Pastor Alemão)
- ✅ Boxer
- ✅ Dalmatian (Dálmata)
- ✅ Cocker Spaniel
- ✅ Saint Bernard (São Bernardo)
- ✅ Siberian Husky
- ✅ Poodle
- ✅ Shiba Inu
- ✅ Greyhound (Galgo)
- ✅ Border Collie
- ✅ Alaskan Malamute
- ✅ Chow Chow

---

## ❓ Troubleshooting

### "Nenhum arquivo SVG encontrado"
→ Certifique-se de que os arquivos estão em `public/breed-icons/`

### "Ícone não aparece"
→ Verifique se o mapeamento está correto em `breed-icons.tsx`

### "Ícone aparece preto"
→ Remova atributos `fill` fixos e use `stroke="currentColor"`

### "Ícone muito pequeno/grande"
→ Ajuste o `strokeWidth` (valores entre 2 e 3)

---

## 📞 Precisa de Ajuda?

Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Logs do terminal (`npm run dev`)
3. Arquivo gerado em `src/components/breed-icon-svgs.tsx`

---

**Última atualização:** 2026-01-08


