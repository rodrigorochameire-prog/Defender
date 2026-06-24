/**
 * Design System local da Agenda.
 *
 * Primitivas reutilizáveis construídas SOBRE o "Padrão Defender" (tokens em
 * `@/lib/config/design-tokens` e registry em `@/lib/config/tipologia`). As
 * cinco superfícies da Agenda consomem estas peças para garantir consistência
 * de status, prioridade e estados vazios.
 */

export { StatusChip } from "./status-chip";
export type { StatusChipProps } from "./status-chip";

export { PriorityBadge } from "./priority-badge";
export type { PriorityBadgeProps } from "./priority-badge";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
