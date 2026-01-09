#!/usr/bin/env node

/**
 * Script para converter arquivos SVG de raças em componentes React
 * 
 * USO:
 * 1. Coloque todos os arquivos .svg na pasta: public/breed-icons/
 * 2. Execute: node scripts/convert-breed-svgs.js
 * 3. Os componentes serão gerados automaticamente em src/components/breed-icon-svgs.tsx
 */

const fs = require('fs');
const path = require('path');

// Configurações
const SVG_INPUT_DIR = path.join(__dirname, '../public/breed-icons');
const OUTPUT_FILE = path.join(__dirname, '../src/components/breed-icon-svgs.tsx');

// Mapeamento de nomes de arquivos para nomes de componentes
const nameMapping = {
  'golden_retriever': 'GoldenRetriever',
  'cavalier_king_charles_spaniel': 'Cavalier',
  'vira_lata_mixed_breed': 'MixedBreed',
  'shitzu': 'ShihTzu',
  'beagle': 'Beagle',
  'salsicha_dachshund': 'Dachshund',
  'lulu_da_pomerania_pomeranian': 'Pomeranian',
  'chihuahua': 'Chihuahua',
  'labrador_retriever': 'Labrador',
  'yorkshire_terrier': 'Yorkshire',
  'pug': 'Pug',
  'buldogue_frances_french_bulldog': 'FrenchBulldog',
  'pastor_alemao': 'GermanShepherd',
  'boxer': 'Boxer',
  'dalmata': 'Dalmatian',
  'cocker_spaniel': 'CockerSpaniel',
  'sao_bernardo': 'SaintBernard',
  'husky_siberiano': 'Husky',
  'poodle': 'Poodle',
  'shiba_inu': 'ShibaInu',
  'galgo': 'Greyhound',
  'border_collie': 'BorderCollie',
  'malamute_do_alasca': 'Malamute',
  'chow_chow': 'ChowChow',
};

function cleanSVGContent(svgContent) {
  // Remove declaração XML
  svgContent = svgContent.replace(/<\?xml[^?]*\?>/g, '');
  
  // Remove comentários
  svgContent = svgContent.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove círculo externo (se existir)
  svgContent = svgContent.replace(/<circle[^>]*cx="50"[^>]*r="50"[^>]*\/>/gi, '');
  
  // Extrai apenas o conteúdo interno do SVG
  const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) return '';
  
  let innerContent = match[1].trim();
  
  // Remove atributos de fill e stroke fixos (vamos usar currentColor)
  innerContent = innerContent.replace(/fill="#[0-9a-fA-F]{3,6}"/g, '');
  innerContent = innerContent.replace(/stroke="#[0-9a-fA-F]{3,6}"/g, '');
  
  // Limpa espaços extras
  innerContent = innerContent.replace(/\s+/g, ' ').trim();
  
  return innerContent;
}

function generateComponent(componentName, svgContent) {
  return `export const ${componentName}Icon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    ${svgContent}
  </svg>
);`;
}

function main() {
  console.log('🐕 Convertendo SVGs de raças para componentes React...\n');
  
  // Verifica se o diretório existe
  if (!fs.existsSync(SVG_INPUT_DIR)) {
    console.error(`❌ Diretório não encontrado: ${SVG_INPUT_DIR}`);
    console.log('\n📁 Por favor, crie a pasta e coloque os arquivos SVG:');
    console.log(`   mkdir -p ${SVG_INPUT_DIR}`);
    console.log(`   cp seus_arquivos/*.svg ${SVG_INPUT_DIR}/`);
    process.exit(1);
  }
  
  // Lê todos os arquivos SVG
  const files = fs.readdirSync(SVG_INPUT_DIR).filter(f => f.endsWith('.svg'));
  
  if (files.length === 0) {
    console.error(`❌ Nenhum arquivo SVG encontrado em ${SVG_INPUT_DIR}`);
    process.exit(1);
  }
  
  console.log(`📦 Encontrados ${files.length} arquivos SVG\n`);
  
  // Gera componentes
  const components = [];
  const exportNames = [];
  
  files.forEach(file => {
    const fileName = path.basename(file, '.svg');
    const componentName = nameMapping[fileName] || 
      fileName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    
    console.log(`   ✓ ${file} → ${componentName}Icon`);
    
    const svgContent = fs.readFileSync(path.join(SVG_INPUT_DIR, file), 'utf8');
    const cleanedContent = cleanSVGContent(svgContent);
    
    if (cleanedContent) {
      components.push(generateComponent(componentName, cleanedContent));
      exportNames.push(`${componentName}Icon`);
    } else {
      console.log(`   ⚠️  Aviso: Não foi possível processar ${file}`);
    }
  });
  
  // Gera arquivo final
  const fileContent = `// Componentes SVG customizados para cada raça de cachorro
// Gerado automaticamente por scripts/convert-breed-svgs.js

${components.join('\n\n')}
`;
  
  fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8');
  
  console.log(`\n✅ Arquivo gerado com sucesso: ${OUTPUT_FILE}`);
  console.log(`\n📝 Próximo passo: Adicione os mapeamentos em src/components/breed-icons.tsx`);
  console.log(`\nImports gerados:\n`);
  console.log(`import {\n  ${exportNames.join(',\n  ')},\n} from "./breed-icon-svgs";\n`);
}

try {
  main();
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}

