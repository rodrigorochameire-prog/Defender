/**
 * Schema barrel file.
 *
 * Re-exports every table, type, enum, and relation from domain files.
 * Consuming code continues to import from "@/lib/db/schema" unchanged.
 */

// Enums (must come first - no dependencies)
export * from "./enums";

// Core tables (users, assistidos, processos, demandas, etc.)
export * from "./core";

// Comarcas (multi-comarca expansion)
export * from "./comarcas";

// Domain modules
export * from "./casos";
export * from "./agenda";
export * from "./juri";
export * from "./vvd";
export * from "./documentos";
export * from "./drive";
export * from "./comunicacao";
export * from "./analytics";
export * from "./equipe";
export * from "./investigacao";
export * from "./jurisprudencia";
export * from "./prazos";
export * from "./palacio";
export * from "./simulador";
export * from "./distribuicao";
export * from "./cowork";
export * from "./radar";
export * from "./legislacao";
export * from "./noticias";
export * from "./biblioteca";
export * from "./institutos";

// Cross-domain relations (core + casos relations that reference other domains)
export * from "./relations";
