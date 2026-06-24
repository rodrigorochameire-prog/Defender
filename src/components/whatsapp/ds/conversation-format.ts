/**
 * Pure formatting helpers for the WhatsApp conversation list.
 *
 * Extracted from ConversationList so they can be unit-tested in isolation and
 * reused by the row primitives. Keep these free of React / side effects.
 */

/**
 * Formats a message timestamp the way the conversation list shows recency:
 * time today, "Ontem" yesterday, short weekday within the week, else a
 * compact date. `now` is injectable so the behaviour is deterministic in tests.
 */
export function formatWhatsAppTime(date: Date, now: Date = new Date()): string {
  const msgDate = new Date(date);
  // Calendar-day difference (not raw 24h windows), so "Ontem" reflects the
  // actual previous day rather than "more than 24h ago".
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(msgDate)) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return msgDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  if (diffDays < 7) {
    return msgDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return msgDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/**
 * Normalized, accented label for a non-text last-message snippet
 * ("Foto", "Áudio", "Vídeo", ...). Falls back to "Mensagem".
 */
export function mediaSnippetLabel(type: string): string {
  switch (type) {
    case "image":
      return "Foto";
    case "document":
      return "Documento";
    case "audio":
      return "Áudio";
    case "video":
      return "Vídeo";
    case "sticker":
      return "Figurinha";
    case "location":
      return "Localização";
    default:
      return "Mensagem";
  }
}
