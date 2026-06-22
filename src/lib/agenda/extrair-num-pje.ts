// Extrai o número do documento PJe ("Num. X" / "Id X") da primeira citação num
// texto (ex.: o depoimento_ip do depoente). Esse número é o carimbo que aparece
// no rodapé das páginas do PDF agregado — então buscá-lo no visualizador leva
// ao ponto do documento. Retorna a string do número ou null.
export function extrairNumPje(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const m = texto.match(/(?:Num\.?|\bId)\s*(?:n[º°.]?\s*)?(\d{2,})/i);
  return m ? m[1] : null;
}
