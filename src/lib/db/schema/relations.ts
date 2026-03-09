/**
 * Cross-domain relations for core and casos tables.
 *
 * These relations reference tables from multiple domain files and
 * cannot live in core.ts or casos.ts without creating circular imports.
 * Drizzle resolves relations at runtime from a flat export, so placing
 * them in a separate file works perfectly.
 */
import { relations } from "drizzle-orm";

// Core tables
import {
  users,
  assistidos,
  processos,
  demandas,
  delegacoesHistorico,
  afastamentos,
  assistidosProcessos,
  userSettings,
  userInvitations,
} from "./core";

// Casos tables
import {
  casos,
  casePersonas,
  caseFacts,
  factEvidence,
  tesesDefensivas,
  depoimentosAnalise,
  roteiroPlenario,
  casosConexos,
  juriScriptItems,
  quesitos,
  crossAnalyses,
} from "./casos";

// Agenda tables
import { audiencias, calendarEvents, atendimentos } from "./agenda";

// Juri tables
import { sessoesJuri, jurados } from "./juri";

// Documentos tables
import { documentos } from "./documentos";

// Investigacao tables
import { anotacoes, movimentacoes } from "./investigacao";

// Comunicacao tables
import { notifications } from "./comunicacao";

// ==========================================
// RELATIONS - Core tables
// ==========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  notifications: many(notifications),
  atendimentos: many(atendimentos),
  casos: many(casos),
  // Sistema de Equipe
  supervisor: one(users, { fields: [users.supervisorId], references: [users.id], relationName: "supervisor" }),
  supervisionados: many(users, { relationName: "supervisor" }),
  delegacoesRecebidas: many(delegacoesHistorico, { relationName: "delegadoPara" }),
  delegacoesEnviadas: many(delegacoesHistorico, { relationName: "delegadoDe" }),
  // Afastamentos
  afastamentosComoDefensor: many(afastamentos, { relationName: "defensorAfastado" }),
  afastamentosComoSubstituto: many(afastamentos, { relationName: "defensorSubstituto" }),
}));

export const afastamentosRelations = relations(afastamentos, ({ one }) => ({
  defensor: one(users, { fields: [afastamentos.defensorId], references: [users.id], relationName: "defensorAfastado" }),
  substituto: one(users, { fields: [afastamentos.substitutoId], references: [users.id], relationName: "defensorSubstituto" }),
}));

export const assistidosRelations = relations(assistidos, ({ one, many }) => ({
  defensor: one(users, { fields: [assistidos.defensorId], references: [users.id] }),
  processos: many(processos),
  demandas: many(demandas),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  atendimentos: many(atendimentos),
  calendarEvents: many(calendarEvents),
  personas: many(casePersonas),
}));

export const processosRelations = relations(processos, ({ one, many }) => ({
  assistido: one(assistidos, { fields: [processos.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [processos.defensorId], references: [users.id] }),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  movimentacoes: many(movimentacoes),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  calendarEvents: many(calendarEvents),
}));

export const demandasRelations = relations(demandas, ({ one, many }) => ({
  processo: one(processos, { fields: [demandas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [demandas.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [demandas.defensorId], references: [users.id] }),
  delegadoPara: one(users, { fields: [demandas.delegadoParaId], references: [users.id], relationName: "demandasDelegadas" }),
  delegacoesHistorico: many(delegacoesHistorico),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  calendarEvents: many(calendarEvents),
}));

export const delegacoesHistoricoRelations = relations(delegacoesHistorico, ({ one }) => ({
  demanda: one(demandas, { fields: [delegacoesHistorico.demandaId], references: [demandas.id] }),
  assistido: one(assistidos, { fields: [delegacoesHistorico.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [delegacoesHistorico.processoId], references: [processos.id] }),
  delegadoDe: one(users, { fields: [delegacoesHistorico.delegadoDeId], references: [users.id], relationName: "delegadoDe" }),
  delegadoPara: one(users, { fields: [delegacoesHistorico.delegadoParaId], references: [users.id], relationName: "delegadoPara" }),
}));

export const assistidosProcessosRelations = relations(assistidosProcessos, ({ one }) => ({
  assistido: one(assistidos, { fields: [assistidosProcessos.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [assistidosProcessos.processoId], references: [processos.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  invitedBy: one(users, { fields: [userInvitations.invitedById], references: [users.id] }),
  acceptedUser: one(users, { fields: [userInvitations.acceptedUserId], references: [users.id] }),
}));

// ==========================================
// RELATIONS - Casos tables
// ==========================================

export const casosRelations = relations(casos, ({ one, many }) => ({
  defensor: one(users, { fields: [casos.defensorId], references: [users.id] }),
  casoConexo: one(casos, { fields: [casos.casoConexoId], references: [casos.id] }),
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  audiencias: many(audiencias),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  personas: many(casePersonas),
  facts: many(caseFacts),
  scriptItems: many(juriScriptItems),
  tesesDefensivas: many(tesesDefensivas),
  depoimentosAnalise: many(depoimentosAnalise),
  roteiroPlenario: many(roteiroPlenario),
  conexoesOrigem: many(casosConexos),
}));

export const casosConexosRelations = relations(casosConexos, ({ one }) => ({
  casoOrigem: one(casos, { fields: [casosConexos.casoOrigemId], references: [casos.id] }),
  casoDestino: one(casos, { fields: [casosConexos.casoDestinoId], references: [casos.id] }),
}));

export const tesesDefensivasRelations = relations(tesesDefensivas, ({ one }) => ({
  caso: one(casos, { fields: [tesesDefensivas.casoId], references: [casos.id] }),
}));

export const casePersonasRelations = relations(casePersonas, ({ one, many }) => ({
  caso: one(casos, { fields: [casePersonas.casoId], references: [casos.id] }),
  assistido: one(assistidos, { fields: [casePersonas.assistidoId], references: [assistidos.id] }),
  jurado: one(jurados, { fields: [casePersonas.juradoId], references: [jurados.id] }),
  processo: one(processos, { fields: [casePersonas.processoId], references: [processos.id] }),
  scriptItems: many(juriScriptItems),
}));

export const caseFactsRelations = relations(caseFacts, ({ one, many }) => ({
  caso: one(casos, { fields: [caseFacts.casoId], references: [casos.id] }),
  processo: one(processos, { fields: [caseFacts.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [caseFacts.assistidoId], references: [assistidos.id] }),
  evidences: many(factEvidence),
  scriptItems: many(juriScriptItems),
}));

export const factEvidenceRelations = relations(factEvidence, ({ one }) => ({
  fact: one(caseFacts, { fields: [factEvidence.factId], references: [caseFacts.id] }),
  documento: one(documentos, { fields: [factEvidence.documentoId], references: [documentos.id] }),
}));

export const depoimentosAnaliseRelations = relations(depoimentosAnalise, ({ one }) => ({
  caso: one(casos, { fields: [depoimentosAnalise.casoId], references: [casos.id] }),
  persona: one(casePersonas, { fields: [depoimentosAnalise.personaId], references: [casePersonas.id] }),
}));

export const roteiroPlenarioRelations = relations(roteiroPlenario, ({ one }) => ({
  caso: one(casos, { fields: [roteiroPlenario.casoId], references: [casos.id] }),
}));

export const juriScriptItemsRelations = relations(juriScriptItems, ({ one }) => ({
  caso: one(casos, { fields: [juriScriptItems.casoId], references: [casos.id] }),
  sessaoJuri: one(sessoesJuri, { fields: [juriScriptItems.sessaoJuriId], references: [sessoesJuri.id] }),
  persona: one(casePersonas, { fields: [juriScriptItems.personaId], references: [casePersonas.id] }),
  fact: one(caseFacts, { fields: [juriScriptItems.factId], references: [caseFacts.id] }),
}));

export const crossAnalysesRelations = relations(crossAnalyses, ({ one }) => ({
  assistido: one(assistidos, { fields: [crossAnalyses.assistidoId], references: [assistidos.id] }),
}));
