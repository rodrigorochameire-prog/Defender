// Mapeamento de tipos de ato para dias de prazo processual
// IMPORTANTE: HC e MS não têm prazo definido (são urgentes sem prazo específico)
export const PRAZOS_POR_ATO: Record<string, number> = {
  // Prazos definidos pelo usuário
  "Resposta à Acusação": 10,
  "Apelação": 5,
  "RESE": 5,
  "Recurso em Sentido Estrito": 5,
  "Razões de apelação": 8,
  "Razões de Apelação": 8,
  "Razões de RESE": 2,
  "Diligências": 5,
  "Diligências do réu": 5,
  "Diligências do 422": 5,
  
  // Alegações e Memoriais
  "Alegações finais": 5,
  "Alegações Finais": 5,
  "Memoriais": 5,
  
  // Contrarrazões
  "Contrarrazões de apelação": 8,
  "Contrarrazões de Apelação": 8,
  "Contrarrazões de RE": 5,
  "Contrarrazões de ED": 2,
  "Manifestação contrarrazões": 5,
  
  // Embargos
  "Embargos de Declaração": 2,
  
  // Recursos de Execução
  "Agravo em Execução": 5,
  
  // Contestação
  "Contestação": 10,
  
  // Pedidos de Liberdade (sem prazo - são urgentes)
  // "Habeas Corpus": SEM PRAZO
  // "Mandado de Segurança": SEM PRAZO
  "Liberdade Provisória": 2,
  "Relaxamento de Prisão": 2,
  "Relaxamento da prisão": 2,
  "Relaxamento": 2,
  "Revogação de Prisão Preventiva": 2,
  "Revogação da prisão": 2,
  "Revogação": 2,
  "Revogação de medidas": 2,
  "Revogação de monitoração": 2,
  "Revogação de MPU": 2,
  "Relaxamento e revogação": 2,
  
  // Outros Prazos Comuns
  "Incidente de insanidade": 5,
  "Quesitos": 3,
  "Testemunhas": 3,
  "Petição intermediária": 5,
  "Prosseguimento do feito": 5,
  "Atualização de endereço": 2,
  "Endereço do réu": 2,
  "Restituição de coisa": 5,
  "Desaforamento": 10,
  
  // Execução Penal
  "Audiência de justificação": 3,
  "Designação admonitória": 3,
  "Transferência de unidade": 5,
  "Requerimento de progressão": 10,
  "Requerimento audiência": 5,
  "Indulto": 10,
  "Cumprimento ANPP": 5,
  
  // Violência Doméstica
  "Modulação de MPU": 5,
};

function ehDiaUtil(data: Date): boolean {
  const diaSemana = data.getDay();
  // 0 = domingo, 6 = sábado
  return diaSemana !== 0 && diaSemana !== 6;
}

function proximoDiaUtil(data: Date): Date {
  const novaData = new Date(data);
  while (!ehDiaUtil(novaData)) {
    novaData.setDate(novaData.getDate() + 1);
  }
  return novaData;
}

/**
 * Calcula o prazo final considerando:
 * 1. 10 dias corridos de leitura (intimação)
 * 2. Ajusta para próximo dia útil se necessário
 * 3. Adiciona prazo processual EM DOBRO em dias ÚTEIS
 * 4. Garante que não termine em fim de semana
 */
export function calcularPrazoDefensoria(dataExpedicao: Date, diasPrazoProcessual: number): string {
  try {
    // ETAPA 1: Adicionar 10 dias CORRIDOS de leitura (intimação)
    const dataAposLeitura = new Date(dataExpedicao);
    dataAposLeitura.setDate(dataAposLeitura.getDate() + 10);
    
    // ETAPA 2: Ajustar para o próximo dia útil se cair em fim de semana
    const dataInicioContagem = proximoDiaUtil(dataAposLeitura);
    
    // ETAPA 3: Adicionar prazo EM DOBRO em dias ÚTEIS
    const diasPrazoEmDobro = diasPrazoProcessual * 2;
    let diasAdicionados = 0;
    let dataAtual = new Date(dataInicioContagem);
    
    while (diasAdicionados < diasPrazoEmDobro) {
      dataAtual.setDate(dataAtual.getDate() + 1);
      
      // Contar apenas dias úteis
      if (ehDiaUtil(dataAtual)) {
        diasAdicionados++;
      }
    }
    
    // ETAPA 4: Se terminar em dia não útil, avançar para o próximo dia útil
    const dataFinal = proximoDiaUtil(dataAtual);
    
    // Formatar como DD/MM/AA
    const diaFinal = String(dataFinal.getDate()).padStart(2, '0');
    const mesFinal = String(dataFinal.getMonth() + 1).padStart(2, '0');
    const anoFinal = String(dataFinal.getFullYear()).slice(-2);
    
    return `${diaFinal}/${mesFinal}/${anoFinal}`;
  } catch (error) {
    console.error('Erro ao calcular prazo:', error);
    return '';
  }
}

/**
 * Calcula automaticamente o prazo baseado no tipo de ato
 */
export function calcularPrazoPorAto(dataExpedicao: Date, tipoAto: string): string {
  const diasPrazo = PRAZOS_POR_ATO[tipoAto];
  
  if (!diasPrazo) {
    // Se não encontrar o prazo específico, retorna vazio
    return '';
  }
  
  return calcularPrazoDefensoria(dataExpedicao, diasPrazo);
}

/**
 * Obtém os dias de prazo processual para um tipo de ato
 */
export function obterDiasPrazoPorAto(tipoAto: string): number | null {
  return PRAZOS_POR_ATO[tipoAto] || null;
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AA)
 */
export function converterISOParaBR(dataISO: string): string {
  try {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const anoAbreviado = String(ano).slice(-2);
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anoAbreviado}`;
  } catch {
    return '';
  }
}

/**
 * Converte data brasileira (DD/MM/AA ou DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
export function converterBRParaISO(dataBR: string): string {
  try {
    const [dia, mes, ano] = dataBR.split('/').map(Number);
    const anoCompleto = ano > 2000 ? ano : 2000 + ano;
    return `${anoCompleto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Formata a explicação do cálculo do prazo
 */
export function formatarExplicacaoPrazo(tipoAto: string, prazoFinal: string): string {
  const diasPrazo = PRAZOS_POR_ATO[tipoAto];
  
  if (!diasPrazo || !prazoFinal) {
    return '';
  }
  
  return `📅 **Prazo calculado automaticamente**

**Tipo de Ato:** ${tipoAto}
**Prazo Processual:** ${diasPrazo} dias

**Cálculo:**
• 10 dias corridos de leitura (intimação)
• ${diasPrazo} dias do prazo × 2 (Defensoria) = ${diasPrazo * 2} dias úteis
• **Vence em:** ${prazoFinal}`;
}