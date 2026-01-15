/**
 * Script de Importação de CSV para DefensorHub
 * 
 * Este script importa dados das planilhas Excel/CSV para o banco de dados.
 * 
 * Uso:
 *   npx tsx scripts/import-csv.ts <arquivo.csv> [tipo]
 * 
 * Tipos suportados:
 *   - demandas: Importa demandas/prazos do Júri
 *   - assistidos: Importa assistidos
 *   - processos: Importa processos
 *   - juri: Importa sessões do júri (plenários)
 * 
 * Exemplo:
 *   npx tsx scripts/import-csv.ts "Demandas Júri e substituições - Júri.csv" demandas
 */

import { readFileSync, existsSync } from "fs";
import { db } from "../src/lib/db";
import { 
  assistidos, 
  processos, 
  demandas, 
  sessoesJuri,
  users,
  InsertAssistido,
  InsertProcesso,
  InsertDemanda,
  InsertSessaoJuri,
} from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Função para parsear CSV simples
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/"/g, '') || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Parser de linha CSV que lida com aspas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Mapear status da planilha para enum
function mapStatus(statusStr: string): "2_ATENDER" | "4_MONITORAR" | "5_FILA" | "7_PROTOCOLADO" | "7_CIENCIA" | "7_SEM_ATUACAO" | "URGENTE" | "CONCLUIDO" | "ARQUIVADO" {
  if (!statusStr) return "5_FILA";
  
  const cleaned = statusStr.toLowerCase().trim();
  
  if (cleaned.includes("2") || cleaned.includes("atender")) return "2_ATENDER";
  if (cleaned.includes("4") || cleaned.includes("monitorar")) return "4_MONITORAR";
  if (cleaned.includes("5") || cleaned.includes("fila")) return "5_FILA";
  if (cleaned.includes("7") && cleaned.includes("protocolado")) return "7_PROTOCOLADO";
  if (cleaned.includes("7") && cleaned.includes("ciência")) return "7_CIENCIA";
  if (cleaned.includes("7") && cleaned.includes("sem")) return "7_SEM_ATUACAO";
  if (cleaned.includes("urgente")) return "URGENTE";
  if (cleaned.includes("concluído") || cleaned.includes("concluido")) return "CONCLUIDO";
  if (cleaned.includes("arquivado")) return "ARQUIVADO";
  
  return "5_FILA";
}

// Mapear área da planilha para enum
function mapArea(areaStr: string): "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA" {
  if (!areaStr) return "JURI";
  
  const cleaned = areaStr.toLowerCase().trim();
  
  if (cleaned.includes("júri") || cleaned.includes("juri")) return "JURI";
  if (cleaned.includes("ep") || cleaned.includes("execução") || cleaned.includes("execucao")) return "EXECUCAO_PENAL";
  if (cleaned.includes("vd") || cleaned.includes("violência") || cleaned.includes("doméstica")) return "VIOLENCIA_DOMESTICA";
  if (cleaned.includes("sub") || cleaned.includes("substituição")) return "SUBSTITUICAO";
  if (cleaned.includes("cur") || cleaned.includes("curadoria")) return "CURADORIA";
  if (cleaned.includes("fam") || cleaned.includes("família")) return "FAMILIA";
  if (cleaned.includes("cível") || cleaned.includes("civel")) return "CIVEL";
  if (cleaned.includes("fazenda")) return "FAZENDA_PUBLICA";
  
  return "JURI";
}

// Parsear data no formato brasileiro
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Tentar formato DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Tentar formato YYYY-MM-DD
  if (dateStr.includes('-')) {
    return dateStr;
  }
  
  return null;
}

// Verificar se é réu preso
function isReuPreso(texto: string): boolean {
  if (!texto) return false;
  const cleaned = texto.toLowerCase();
  return cleaned.includes("réu preso") || 
         cleaned.includes("reu preso") || 
         cleaned.includes("preso") ||
         cleaned.includes("cadeia") ||
         cleaned.includes("penitenciária");
}

// Buscar ou criar assistido
async function getOrCreateAssistido(nome: string): Promise<number> {
  if (!nome) throw new Error("Nome do assistido é obrigatório");
  
  const nomeNormalizado = nome.trim();
  
  // Buscar existente
  const existing = await db.query.assistidos.findFirst({
    where: eq(assistidos.nome, nomeNormalizado),
  });
  
  if (existing) return existing.id;
  
  // Criar novo
  const [newAssistido] = await db.insert(assistidos).values({
    nome: nomeNormalizado,
    statusPrisional: "SOLTO",
  }).returning();
  
  console.log(`  ✓ Criado assistido: ${nomeNormalizado}`);
  return newAssistido.id;
}

// Buscar ou criar processo
async function getOrCreateProcesso(numeroAutos: string, assistidoId: number, area: string, comarca?: string): Promise<number> {
  if (!numeroAutos) throw new Error("Número dos autos é obrigatório");
  
  const numeroNormalizado = numeroAutos.trim().replace(/\s+/g, '');
  
  // Buscar existente
  const existing = await db.query.processos.findFirst({
    where: eq(processos.numeroAutos, numeroNormalizado),
  });
  
  if (existing) return existing.id;
  
  // Criar novo
  const [newProcesso] = await db.insert(processos).values({
    numeroAutos: numeroNormalizado,
    assistidoId,
    area: mapArea(area),
    comarca: comarca || null,
    situacao: "ativo",
    isJuri: area.toLowerCase().includes("júri") || area.toLowerCase().includes("juri"),
  }).returning();
  
  console.log(`  ✓ Criado processo: ${numeroNormalizado}`);
  return newProcesso.id;
}

// Importar demandas
async function importDemandas(rows: Record<string, string>[]) {
  console.log(`\nImportando ${rows.length} demandas...`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      // Identificar campos - ajuste conforme sua planilha
      const nome = row["Assistido"] || row["Nome"] || row["Réu"] || "";
      const numeroAutos = row["Autos"] || row["Número dos Autos"] || row["Processo"] || "";
      const ato = row["Ato"] || row["Demanda"] || row["Peça"] || "";
      const prazoStr = row["Prazo"] || row["Data Prazo"] || "";
      const statusStr = row["Status"] || "";
      const providencias = row["Providências"] || row["Providencias"] || row["Observações"] || "";
      const areaStr = row["Área"] || row["Area"] || "Júri";
      const comarca = row["Comarca"] || "";
      
      if (!nome || !numeroAutos || !ato) {
        console.log(`  ⚠ Linha ignorada (dados incompletos): ${nome || 'sem nome'}`);
        continue;
      }
      
      // Criar/buscar assistido
      const assistidoId = await getOrCreateAssistido(nome);
      
      // Criar/buscar processo
      const processoId = await getOrCreateProcesso(numeroAutos, assistidoId, areaStr, comarca);
      
      // Criar demanda
      await db.insert(demandas).values({
        processoId,
        assistidoId,
        ato: ato.trim(),
        prazo: parseDate(prazoStr),
        status: mapStatus(statusStr),
        providencias: providencias || null,
        reuPreso: isReuPreso(nome) || isReuPreso(providencias),
        prioridade: isReuPreso(nome) || isReuPreso(providencias) ? "REU_PRESO" : "NORMAL",
      });
      
      imported++;
      console.log(`  ✓ Demanda importada: ${ato} - ${nome}`);
      
    } catch (error) {
      errors++;
      console.error(`  ✗ Erro ao importar linha:`, error);
    }
  }
  
  console.log(`\n✓ Importação concluída: ${imported} demandas importadas, ${errors} erros`);
}

// Importar sessões do júri
async function importSessoesJuri(rows: Record<string, string>[]) {
  console.log(`\nImportando ${rows.length} sessões do júri...`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      const dataStr = row["Data"] || row["Data Sessão"] || row["Data da Sessão"] || "";
      const nome = row["Assistido"] || row["Nome"] || row["Réu"] || "";
      const numeroAutos = row["Autos"] || row["Processo"] || "";
      const defensor = row["Defensor"] || row["Defensor(a)"] || "";
      const sala = row["Sala"] || row["Plenário"] || "";
      const resultado = row["Resultado"] || "";
      
      if (!dataStr || !nome) {
        console.log(`  ⚠ Linha ignorada (dados incompletos)`);
        continue;
      }
      
      // Criar/buscar assistido
      const assistidoId = await getOrCreateAssistido(nome);
      
      // Criar/buscar processo
      const processoId = await getOrCreateProcesso(numeroAutos || `JURI-${Date.now()}`, assistidoId, "Júri");
      
      // Parsear data e horário
      const dataParsed = parseDate(dataStr);
      if (!dataParsed) {
        console.log(`  ⚠ Data inválida: ${dataStr}`);
        continue;
      }
      
      // Criar sessão
      await db.insert(sessoesJuri).values({
        processoId,
        dataSessao: new Date(dataParsed),
        assistidoNome: nome,
        defensorNome: defensor || null,
        sala: sala || null,
        status: resultado ? "realizada" : "agendada",
        resultado: resultado || null,
      });
      
      imported++;
      console.log(`  ✓ Sessão importada: ${dataStr} - ${nome}`);
      
    } catch (error) {
      errors++;
      console.error(`  ✗ Erro ao importar linha:`, error);
    }
  }
  
  console.log(`\n✓ Importação concluída: ${imported} sessões importadas, ${errors} erros`);
}

// Importar assistidos
async function importAssistidos(rows: Record<string, string>[]) {
  console.log(`\nImportando ${rows.length} assistidos...`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      const nome = row["Nome"] || row["Assistido"] || row["Réu"] || "";
      const cpf = row["CPF"] || "";
      const rg = row["RG"] || "";
      const nomeMae = row["Nome da Mãe"] || row["Mãe"] || "";
      const dataNascimento = row["Data de Nascimento"] || row["Nascimento"] || "";
      const telefone = row["Telefone"] || row["Celular"] || "";
      const endereco = row["Endereço"] || row["Endereco"] || "";
      const statusPrisional = row["Status"] || row["Situação"] || "";
      const localPrisao = row["Local"] || row["Unidade"] || "";
      
      if (!nome) {
        console.log(`  ⚠ Linha ignorada (sem nome)`);
        continue;
      }
      
      // Verificar se já existe
      const existing = await db.query.assistidos.findFirst({
        where: eq(assistidos.nome, nome.trim()),
      });
      
      if (existing) {
        console.log(`  ⚠ Assistido já existe: ${nome}`);
        continue;
      }
      
      // Mapear status prisional
      let status: "SOLTO" | "CADEIA_PUBLICA" | "PENITENCIARIA" | "COP" | "HOSPITAL_CUSTODIA" | "DOMICILIAR" | "MONITORADO" = "SOLTO";
      if (statusPrisional.toLowerCase().includes("preso") || statusPrisional.toLowerCase().includes("cadeia")) {
        status = "CADEIA_PUBLICA";
      } else if (statusPrisional.toLowerCase().includes("penitenciária") || statusPrisional.toLowerCase().includes("penitenciaria")) {
        status = "PENITENCIARIA";
      } else if (statusPrisional.toLowerCase().includes("monitorado")) {
        status = "MONITORADO";
      } else if (statusPrisional.toLowerCase().includes("domiciliar")) {
        status = "DOMICILIAR";
      }
      
      await db.insert(assistidos).values({
        nome: nome.trim(),
        cpf: cpf || null,
        rg: rg || null,
        nomeMae: nomeMae || null,
        dataNascimento: parseDate(dataNascimento),
        telefone: telefone || null,
        endereco: endereco || null,
        statusPrisional: status,
        localPrisao: localPrisao || null,
      });
      
      imported++;
      console.log(`  ✓ Assistido importado: ${nome}`);
      
    } catch (error) {
      errors++;
      console.error(`  ✗ Erro ao importar linha:`, error);
    }
  }
  
  console.log(`\n✓ Importação concluída: ${imported} assistidos importados, ${errors} erros`);
}

// Importar processos
async function importProcessos(rows: Record<string, string>[]) {
  console.log(`\nImportando ${rows.length} processos...`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      const nome = row["Assistido"] || row["Nome"] || row["Réu"] || "";
      const numeroAutos = row["Autos"] || row["Número"] || row["Processo"] || "";
      const areaStr = row["Área"] || row["Area"] || "Júri";
      const comarca = row["Comarca"] || "";
      const vara = row["Vara"] || "";
      const assunto = row["Assunto"] || row["Crime"] || "";
      
      if (!nome || !numeroAutos) {
        console.log(`  ⚠ Linha ignorada (dados incompletos)`);
        continue;
      }
      
      // Verificar se já existe
      const existing = await db.query.processos.findFirst({
        where: eq(processos.numeroAutos, numeroAutos.trim()),
      });
      
      if (existing) {
        console.log(`  ⚠ Processo já existe: ${numeroAutos}`);
        continue;
      }
      
      const assistidoId = await getOrCreateAssistido(nome);
      
      await db.insert(processos).values({
        numeroAutos: numeroAutos.trim(),
        assistidoId,
        area: mapArea(areaStr),
        comarca: comarca || null,
        vara: vara || null,
        assunto: assunto || null,
        isJuri: areaStr.toLowerCase().includes("júri") || areaStr.toLowerCase().includes("juri"),
        situacao: "ativo",
      });
      
      imported++;
      console.log(`  ✓ Processo importado: ${numeroAutos}`);
      
    } catch (error) {
      errors++;
      console.error(`  ✗ Erro ao importar linha:`, error);
    }
  }
  
  console.log(`\n✓ Importação concluída: ${imported} processos importados, ${errors} erros`);
}

// Função principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           DEFENSORHUB - IMPORTADOR DE PLANILHAS               ║
╚═══════════════════════════════════════════════════════════════╝

Uso: npx tsx scripts/import-csv.ts <arquivo.csv> [tipo]

Tipos suportados:
  - demandas    : Importa demandas/prazos
  - juri        : Importa sessões do júri
  - assistidos  : Importa assistidos
  - processos   : Importa processos

Exemplos:
  npx tsx scripts/import-csv.ts "Demandas Júri.csv" demandas
  npx tsx scripts/import-csv.ts "Plenários.csv" juri
  npx tsx scripts/import-csv.ts "Assistidos.csv" assistidos

Dicas:
  - O arquivo deve estar em formato CSV (separado por vírgulas)
  - A primeira linha deve conter os cabeçalhos
  - O sistema tenta identificar as colunas automaticamente
    `);
    process.exit(1);
  }
  
  const filePath = args[0];
  const type = args[1] || "demandas";
  
  if (!existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    INICIANDO IMPORTAÇÃO                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  console.log(`📂 Lendo arquivo: ${filePath}`);
  const content = readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);
  
  console.log(`📊 ${rows.length} linhas encontradas`);
  
  if (rows.length > 0) {
    console.log(`📋 Colunas detectadas:`);
    Object.keys(rows[0]).forEach(col => console.log(`   - ${col}`));
  }
  
  switch (type) {
    case "demandas":
      await importDemandas(rows);
      break;
    case "juri":
      await importSessoesJuri(rows);
      break;
    case "assistidos":
      await importAssistidos(rows);
      break;
    case "processos":
      await importProcessos(rows);
      break;
    default:
      console.error(`❌ Tipo não suportado: ${type}`);
      console.log(`   Tipos válidos: demandas, juri, assistidos, processos`);
      process.exit(1);
  }
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    IMPORTAÇÃO CONCLUÍDA                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  process.exit(0);
}

main().catch(console.error);
