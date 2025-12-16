/**
 * Converte array de objetos para CSV
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return "";

  // Se headers não fornecidos, usar keys do primeiro objeto
  const keys = headers || Object.keys(data[0]);
  
  // Cabeçalho
  const csvHeaders = keys.join(",");
  
  // Linhas de dados
  const csvRows = data.map(row => {
    return keys.map(key => {
      let value = row[key];
      
      // Tratar valores especiais
      if (value === null || value === undefined) {
        return "";
      }
      
      // Converter datas para formato legível
      if (value instanceof Date) {
        value = value.toLocaleDateString("pt-BR");
      }
      
      // Escapar vírgulas e aspas
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(",");
  });
  
  return [csvHeaders, ...csvRows].join("\n");
}

/**
 * Faz download de um arquivo CSV
 */
export function downloadCSV(data: any[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }); // BOM para UTF-8
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Converte array de objetos para formato de tabela Excel (TSV)
 */
export function convertToExcel(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return "";

  const keys = headers || Object.keys(data[0]);
  
  // Cabeçalho
  const excelHeaders = keys.join("\t");
  
  // Linhas de dados
  const excelRows = data.map(row => {
    return keys.map(key => {
      let value = row[key];
      
      if (value === null || value === undefined) {
        return "";
      }
      
      if (value instanceof Date) {
        value = value.toLocaleDateString("pt-BR");
      }
      
      return String(value);
    }).join("\t");
  });
  
  return [excelHeaders, ...excelRows].join("\n");
}

/**
 * Faz download de um arquivo Excel (formato TSV)
 */
export function downloadExcel(data: any[], filename: string, headers?: string[]): void {
  const excel = convertToExcel(data, headers);
  const blob = new Blob(["\uFEFF" + excel], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Formata dados de pets para exportação
 */
export function formatPetsForExport(pets: any[]) {
  return pets.map(pet => ({
    Nome: pet.name,
    Raça: pet.breed || "-",
    Idade: pet.age || "-",
    Peso: pet.weight ? `${pet.weight} kg` : "-",
    Status: pet.status === "checked-in" ? "Na Creche" : "Fora da Creche",
    "Marca de Ração": pet.foodBrand || "-",
    "Quantidade Diária": pet.foodAmount ? `${pet.foodAmount}g` : "-",
  }));
}

/**
 * Formata dados de logs para exportação
 */
export function formatLogsForExport(logs: any[], pets: any[]) {
  return logs.map(log => {
    const pet = pets?.find(p => p.id === log.petId);
    return {
      Data: new Date(log.logDate).toLocaleDateString("pt-BR"),
      Pet: pet?.name || "-",
      Origem: log.source === "home" ? "Casa" : "Creche",
      Humor: log.mood || "-",
      Fezes: log.stool || "-",
      Apetite: log.appetite || "-",
      Atividades: log.activities || "-",
      Observações: log.notes || "-",
    };
  });
}

/**
 * Formata dados de tutores para exportação
 */
export function formatTutorsForExport(tutors: any[]) {
  return tutors.map(tutor => ({
    Nome: tutor.name,
    Email: tutor.email || "-",
    Telefone: tutor.phone || "-",
    Endereço: tutor.address || "-",
    "Data de Cadastro": new Date(tutor.createdAt).toLocaleDateString("pt-BR"),
  }));
}
