import { cn } from "@/lib/utils";
import { tagVisual } from "./tag-visual";

/**
 * Discrete in-row tag indicator: a single coloured dot whose accessible name is
 * the tag label (surfaced on hover / to screen readers). Replaces the old loud
 * coloured pill that truncated labels to 6 chars and competed with the unread
 * badge in the row footer.
 */
export function ConversationTagDot({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  const { label, dotClass } = tagVisual(tag);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass, className)}
    />
  );
}
