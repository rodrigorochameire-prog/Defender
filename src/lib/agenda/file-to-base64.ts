export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo inválido"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Leitura retornou tipo inesperado"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}
