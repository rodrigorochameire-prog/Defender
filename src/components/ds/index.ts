/**
 * Design System de PRODUTO compartilhado (doutrina §10.13).
 *
 * Primitivas reutilizáveis construídas SOBRE o "Padrão Defender" (tokens em
 * `@/lib/config/design-tokens` e registry em `@/lib/config/tipologia`). Nascidas
 * na Agenda e promovidas a `@/components/ds` para que QUALQUER módulo (Agenda,
 * Demandas, WhatsApp, Assistidos...) consuma as mesmas peças de status,
 * prioridade e estados vazios. `@/components/agenda/ds` re-exporta daqui (compat).
 */

export { StatusChip } from "./status-chip";
export type { StatusChipProps } from "./status-chip";

export { PriorityBadge } from "./priority-badge";
export type { PriorityBadgeProps } from "./priority-badge";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { StickyActionFooter } from "./sticky-action-footer";
export type { StickyActionFooterProps } from "./sticky-action-footer";
