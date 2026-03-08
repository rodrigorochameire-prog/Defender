import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { simulacaoStatusEnum } from "./enums";
import { workspaces, users } from "./core";
import { casos, casePersonas } from "./casos";

// ==========================================
// SIMULADOR 3D - RECONSTITUICAO FORENSE
// ==========================================

// Tabela principal de simulacoes 3D
export const simulacoes3d = pgTable("simulacoes_3d", {
  id: serial("id").primaryKey(),

  // Vinculo com caso
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),

  // Identificacao
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),

  // Dados da cena (JSON estruturado)
  cenaData: jsonb("cena_data").$type<{
    cenario: {
      modeloUrl: string;
      nome: string;
      posicao: [number, number, number];
      rotacao: [number, number, number];
      escala: [number, number, number];
    };
    iluminacao: {
      ambiente: { cor: string; intensidade: number };
      direcional: { cor: string; intensidade: number; posicao: [number, number, number] };
      sombras: boolean;
    };
    cameras: Array<{
      id: string;
      nome: string;
      tipo: "perspective" | "orthographic";
      posicao: [number, number, number];
      alvo: [number, number, number];
      fov?: number;
    }>;
    configuracoes: {
      gridVisivel: boolean;
      eixosVisiveis: boolean;
      qualidade: "baixa" | "media" | "alta";
    };
  }>(),

  // Thumbnail preview (base64 ou URL)
  thumbnail: text("thumbnail"),

  // Status
  status: simulacaoStatusEnum("status").default("RASCUNHO"),

  // Configuracoes de exportacao
  configExport: jsonb("config_export").$type<{
    resolucao: "720p" | "1080p" | "4k";
    fps: 24 | 30 | 60;
    formato: "mp4" | "webm";
    qualidade: "baixa" | "media" | "alta";
  }>(),

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  atualizadoPorId: integer("atualizado_por_id").references(() => users.id),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Soft delete
  deletedAt: timestamp("deleted_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacoes_3d_caso_id_idx").on(table.casoId),
  index("simulacoes_3d_status_idx").on(table.status),
  index("simulacoes_3d_criado_por_idx").on(table.criadoPorId),
  index("simulacoes_3d_workspace_id_idx").on(table.workspaceId),
  index("simulacoes_3d_deleted_at_idx").on(table.deletedAt),
]);

export type Simulacao3d = typeof simulacoes3d.$inferSelect;
export type InsertSimulacao3d = typeof simulacoes3d.$inferInsert;

// Personagens da simulacao
export const simulacaoPersonagens = pgTable("simulacao_personagens", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  // Identificacao
  nome: text("nome").notNull(),
  papel: varchar("papel", { length: 30 }), // 'vitima' | 'reu' | 'testemunha' | 'agressor' | 'policial' | 'outro'

  // Vinculo com persona do caso (opcional)
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),

  // Modelo 3D
  avatarUrl: text("avatar_url"), // Ready Player Me ou custom GLB
  avatarTipo: varchar("avatar_tipo", { length: 30 }), // 'ready_player_me' | 'mixamo' | 'custom' | 'basico'

  // Visual
  cor: varchar("cor", { length: 20 }), // Cor identificadora no diagrama
  altura: real("altura").default(1.7), // Altura em metros

  // Posicao inicial
  posicaoInicial: jsonb("posicao_inicial").$type<[number, number, number]>(),
  rotacaoInicial: jsonb("rotacao_inicial").$type<[number, number, number]>(),

  // Animacao padrao
  animacaoPadrao: varchar("animacao_padrao", { length: 50 }).default("idle"),

  // Ordem de exibicao
  ordem: integer("ordem").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_personagens_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_personagens_persona_id_idx").on(table.personaId),
  index("simulacao_personagens_papel_idx").on(table.papel),
]);

export type SimulacaoPersonagem = typeof simulacaoPersonagens.$inferSelect;
export type InsertSimulacaoPersonagem = typeof simulacaoPersonagens.$inferInsert;

// Objetos da cena
export const simulacaoObjetos = pgTable("simulacao_objetos", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }), // 'arma' | 'movel' | 'veiculo' | 'evidencia' | 'marcador' | 'porta' | 'outro'

  // Modelo 3D
  modeloUrl: text("modelo_url"),
  modeloNome: varchar("modelo_nome", { length: 100 }),

  // Transformacao
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  escala: jsonb("escala").$type<[number, number, number]>(),

  // Visual
  cor: varchar("cor", { length: 20 }),
  visivel: boolean("visivel").default(true),
  destacado: boolean("destacado").default(false), // Para evidencias importantes

  // Metadados
  descricao: text("descricao"),
  ordem: integer("ordem").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_objetos_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_objetos_tipo_idx").on(table.tipo),
]);

export type SimulacaoObjeto = typeof simulacaoObjetos.$inferSelect;
export type InsertSimulacaoObjeto = typeof simulacaoObjetos.$inferInsert;

// Versoes da simulacao (acusacao, defesa, alternativas)
export const simulacaoVersoes = pgTable("simulacao_versoes", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  // Identificacao
  nome: text("nome").notNull(), // "Versao da Acusacao", "Versao da Defesa"
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'acusacao' | 'defesa' | 'alternativa' | 'comparativa'
  cor: varchar("cor", { length: 20 }), // Cor para identificar na timeline

  // Dados da animacao (Theatre.js state ou Remotion config)
  animacaoData: jsonb("animacao_data").$type<{
    theatreState?: Record<string, unknown>; // Estado do Theatre.js
    remotionConfig?: {
      fps: number;
      durationInFrames: number;
      width: number;
      height: number;
    };
  }>(),

  // Duracao em segundos
  duracao: real("duracao"),

  // Narrativa textual (para legenda/narracao)
  narrativa: text("narrativa"),

  // Camera principal para esta versao
  cameraId: text("camera_id"),

  // Ordem de exibicao
  ordem: integer("ordem").default(0),

  // Ativa/Inativa
  ativa: boolean("ativa").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_versoes_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_versoes_tipo_idx").on(table.tipo),
]);

export type SimulacaoVersao = typeof simulacaoVersoes.$inferSelect;
export type InsertSimulacaoVersao = typeof simulacaoVersoes.$inferInsert;

// Keyframes de movimento
export const simulacaoKeyframes = pgTable("simulacao_keyframes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),

  // Referencia ao elemento animado
  personagemId: integer("personagem_id").references(() => simulacaoPersonagens.id, { onDelete: "cascade" }),
  objetoId: integer("objeto_id").references(() => simulacaoObjetos.id, { onDelete: "cascade" }),
  cameraId: text("camera_id"), // ID da camera se for keyframe de camera

  // Tempo do keyframe (em segundos ou frames)
  tempo: real("tempo").notNull(),
  frame: integer("frame"), // Frame equivalente (fps * tempo)

  // Dados de transformacao
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  escala: jsonb("escala").$type<[number, number, number]>(),

  // Animacao do personagem
  animacao: varchar("animacao", { length: 50 }), // 'idle' | 'walking' | 'running' | 'falling' | 'fighting'
  animacaoVelocidade: real("animacao_velocidade").default(1),

  // Propriedades visuais
  opacidade: real("opacidade").default(1),
  visivel: boolean("visivel").default(true),

  // Easing para transicao
  easing: varchar("easing", { length: 30 }).default("linear"), // 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring'

  // Label/Nota para este momento
  label: text("label"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_keyframes_versao_id_idx").on(table.versaoId),
  index("simulacao_keyframes_personagem_id_idx").on(table.personagemId),
  index("simulacao_keyframes_objeto_id_idx").on(table.objetoId),
  index("simulacao_keyframes_tempo_idx").on(table.tempo),
]);

export type SimulacaoKeyframe = typeof simulacaoKeyframes.$inferSelect;
export type InsertSimulacaoKeyframe = typeof simulacaoKeyframes.$inferInsert;

// Videos exportados
export const simulacaoExportacoes = pgTable("simulacao_exportacoes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),

  // Arquivo
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  formato: varchar("formato", { length: 10 }), // 'mp4' | 'webm' | 'gif'
  resolucao: varchar("resolucao", { length: 20 }), // '1920x1080' | '1280x720' | '3840x2160'

  // Status de processamento
  status: varchar("status", { length: 20 }).default("pendente"), // 'pendente' | 'processando' | 'pronto' | 'erro'
  progresso: integer("progresso").default(0), // 0-100
  erro: text("erro"),

  // Metadados do video
  tamanhoBytes: integer("tamanho_bytes"),
  duracaoSegundos: real("duracao_segundos"),
  fps: integer("fps"),

  // Renderizacao
  renderEngine: varchar("render_engine", { length: 20 }), // 'remotion' | 'ffmpeg' | 'ccapture'
  tempoRenderizacao: integer("tempo_renderizacao"), // Em segundos

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_exportacoes_versao_id_idx").on(table.versaoId),
  index("simulacao_exportacoes_status_idx").on(table.status),
]);

export type SimulacaoExportacao = typeof simulacaoExportacoes.$inferSelect;
export type InsertSimulacaoExportacao = typeof simulacaoExportacoes.$inferInsert;

// Biblioteca de assets (cenarios, objetos, animacoes)
export const simulacaoAssets = pgTable("simulacao_assets", {
  id: serial("id").primaryKey(),

  // Identificacao
  nome: text("nome").notNull(),
  categoria: varchar("categoria", { length: 30 }).notNull(), // 'cenario' | 'personagem' | 'objeto' | 'animacao'
  subcategoria: varchar("subcategoria", { length: 50 }), // 'residencia' | 'externo' | 'comercial' | 'arma' | 'movel'

  // Arquivo
  arquivoUrl: text("arquivo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  formato: varchar("formato", { length: 20 }), // 'glb' | 'gltf' | 'fbx' | 'json'

  // Metadados
  descricao: text("descricao"),
  tags: jsonb("tags").$type<string[]>(),
  tamanhoBytes: integer("tamanho_bytes"),

  // Fonte
  fonte: varchar("fonte", { length: 50 }), // 'sketchfab' | 'poly_haven' | 'mixamo' | 'custom' | 'ready_player_me'
  licenca: varchar("licenca", { length: 50 }), // 'CC0' | 'CC-BY' | 'proprietario'
  atribuicao: text("atribuicao"),

  // Configuracoes padrao
  configuracaoPadrao: jsonb("configuracao_padrao").$type<{
    escala?: [number, number, number];
    rotacao?: [number, number, number];
    posicaoOffset?: [number, number, number];
  }>(),

  // Disponibilidade
  publico: boolean("publico").default(false), // Disponivel para todos os workspaces
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_assets_categoria_idx").on(table.categoria),
  index("simulacao_assets_subcategoria_idx").on(table.subcategoria),
  index("simulacao_assets_publico_idx").on(table.publico),
  index("simulacao_assets_workspace_id_idx").on(table.workspaceId),
]);

export type SimulacaoAsset = typeof simulacaoAssets.$inferSelect;
export type InsertSimulacaoAsset = typeof simulacaoAssets.$inferInsert;

// ==========================================
// RELACOES - Simulador 3D
// ==========================================

export const simulacoes3dRelations = relations(simulacoes3d, ({ one, many }) => ({
  caso: one(casos, { fields: [simulacoes3d.casoId], references: [casos.id] }),
  criadoPor: one(users, { fields: [simulacoes3d.criadoPorId], references: [users.id] }),
  atualizadoPor: one(users, { fields: [simulacoes3d.atualizadoPorId], references: [users.id] }),
  workspace: one(workspaces, { fields: [simulacoes3d.workspaceId], references: [workspaces.id] }),
  personagens: many(simulacaoPersonagens),
  objetos: many(simulacaoObjetos),
  versoes: many(simulacaoVersoes),
}));

export const simulacaoPersonagensRelations = relations(simulacaoPersonagens, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoPersonagens.simulacaoId], references: [simulacoes3d.id] }),
  persona: one(casePersonas, { fields: [simulacaoPersonagens.personaId], references: [casePersonas.id] }),
  keyframes: many(simulacaoKeyframes),
}));

export const simulacaoObjetosRelations = relations(simulacaoObjetos, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoObjetos.simulacaoId], references: [simulacoes3d.id] }),
  keyframes: many(simulacaoKeyframes),
}));

export const simulacaoVersoesRelations = relations(simulacaoVersoes, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoVersoes.simulacaoId], references: [simulacoes3d.id] }),
  keyframes: many(simulacaoKeyframes),
  exportacoes: many(simulacaoExportacoes),
}));

export const simulacaoKeyframesRelations = relations(simulacaoKeyframes, ({ one }) => ({
  versao: one(simulacaoVersoes, { fields: [simulacaoKeyframes.versaoId], references: [simulacaoVersoes.id] }),
  personagem: one(simulacaoPersonagens, { fields: [simulacaoKeyframes.personagemId], references: [simulacaoPersonagens.id] }),
  objeto: one(simulacaoObjetos, { fields: [simulacaoKeyframes.objetoId], references: [simulacaoObjetos.id] }),
}));

export const simulacaoExportacoesRelations = relations(simulacaoExportacoes, ({ one }) => ({
  versao: one(simulacaoVersoes, { fields: [simulacaoExportacoes.versaoId], references: [simulacaoVersoes.id] }),
  criadoPor: one(users, { fields: [simulacaoExportacoes.criadoPorId], references: [users.id] }),
}));

export const simulacaoAssetsRelations = relations(simulacaoAssets, ({ one }) => ({
  workspace: one(workspaces, { fields: [simulacaoAssets.workspaceId], references: [workspaces.id] }),
  criadoPor: one(users, { fields: [simulacaoAssets.criadoPorId], references: [users.id] }),
}));
