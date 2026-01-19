/**
 * Script para buscar dados do Google Sheets
 * Tenta múltiplos métodos de acesso
 */

const SPREADSHEET_ID = '1ZSsdrSLraRbCWMA7ldA4yHGpQHsZ4iIUCKQvmc1y_Bw';

// Método 1: Tentar acessar via URL de publicação na web (se publicada)
async function tryPublicCSV() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;
  
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'Accept': 'text/csv',
      }
    });
    
    if (response.ok) {
      const text = await response.text();
      if (!text.includes('<!DOCTYPE html>')) {
        return { success: true, data: text, method: 'public-csv' };
      }
    }
    return { success: false, error: 'Planilha não está pública' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Método 2: Tentar via Google Visualization API (funciona com planilhas compartilhadas)
async function tryVisualizationAPI() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    if (!text.includes('<!DOCTYPE html>') && text.includes('google.visualization')) {
      // Extrair JSON do callback
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        return { success: true, data, method: 'visualization-api' };
      }
    }
    return { success: false, error: 'Não foi possível acessar via Visualization API' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Método 3: Tentar HTML embed (último recurso)
async function tryHTMLEmbed() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlembed`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    if (response.ok && text.includes('<table')) {
      return { success: true, data: 'HTML embed disponível', method: 'html-embed', html: text };
    }
    return { success: false, error: 'HTML embed não disponível' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Tentando acessar a planilha do Google Sheets...');
  console.log('ID:', SPREADSHEET_ID);
  console.log('='.repeat(60));
  
  // Tentar método 1
  console.log('\n📋 Método 1: Export CSV público...');
  const csv = await tryPublicCSV();
  if (csv.success) {
    console.log('✅ Sucesso! Dados obtidos via CSV.');
    console.log('\nPrimeiras linhas:');
    console.log(csv.data.split('\n').slice(0, 10).join('\n'));
    return;
  }
  console.log('❌', csv.error);
  
  // Tentar método 2
  console.log('\n📊 Método 2: Visualization API...');
  const viz = await tryVisualizationAPI();
  if (viz.success) {
    console.log('✅ Sucesso! Dados obtidos via Visualization API.');
    console.log('\nEstrutura:', JSON.stringify(viz.data.table?.cols || [], null, 2));
    console.log('\nPrimeiras linhas:', JSON.stringify(viz.data.table?.rows?.slice(0, 5) || [], null, 2));
    return;
  }
  console.log('❌', viz.error);
  
  // Tentar método 3
  console.log('\n🌐 Método 3: HTML Embed...');
  const html = await tryHTMLEmbed();
  if (html.success) {
    console.log('✅ Sucesso parcial! HTML disponível.');
    return;
  }
  console.log('❌', html.error);
  
  console.log('\n' + '='.repeat(60));
  console.log('❌ Não foi possível acessar a planilha.');
  console.log('\nPara resolver, você precisa:');
  console.log('1. Abrir a planilha no Google Sheets');
  console.log('2. Clicar em "Compartilhar" (botão verde)');
  console.log('3. Em "Acesso geral", alterar para "Qualquer pessoa com o link"');
  console.log('4. Deixar como "Leitor" e salvar');
  console.log('='.repeat(60));
}

main().catch(console.error);
