import { toast } from "sonner";

export async function copyToClipboard(text: string, successMessage = "Copiado!") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    toast.error("Falha ao copiar");
    return false;
  }
}
