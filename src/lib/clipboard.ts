import { toast } from "sonner";

/**
 * Fallback para copiar texto quando navigator.clipboard não está disponível
 * ou quando writeText() falha (ex: permissão negada, focus trap de dialogs).
 *
 * Insere o textarea DENTRO do elemento focado (se existir um dialog/sheet),
 * para evitar conflitos com focus traps do Radix UI.
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  // Invisível mas dentro do fluxo do DOM do dialog ativo
  textarea.style.position = "fixed";
  textarea.style.left = "0";
  textarea.style.top = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "none";
  textarea.style.outline = "none";
  textarea.style.boxShadow = "none";
  textarea.style.opacity = "0";
  textarea.style.zIndex = "-1";

  // Tentar inserir dentro do dialog ativo (evita focus trap do Radix)
  const activeDialog = document.querySelector('[role="dialog"][data-state="open"]');
  const container = activeDialog || document.body;
  container.appendChild(textarea);

  textarea.focus({ preventScroll: true });
  textarea.select();

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  container.removeChild(textarea);
  return success;
}

export async function copyToClipboard(text: string, successMessage = "Copiado!") {
  // Tentar fallback primeiro pois é mais confiável em contextos com dialogs/sheets
  // (navigator.clipboard.writeText pode falhar com "Write permission denied"
  // mesmo em secure contexts quando o foco está em um modal)
  let succeeded = false;

  // 1. Tentar execCommand (funciona em qualquer contexto com user gesture)
  try {
    succeeded = fallbackCopyToClipboard(text);
  } catch {
    // ignore
  }

  // 2. Se falhou, tentar API moderna
  if (!succeeded) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        succeeded = true;
      }
    } catch (err) {
      console.error("Clipboard API failed:", err);
    }
  }

  if (succeeded) {
    toast.success(successMessage);
  } else {
    toast.error("Falha ao copiar");
  }

  return succeeded;
}
