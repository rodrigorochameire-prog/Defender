-- Workspaces (universos de dados)
create table if not exists workspaces (
  id serial primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists workspaces_name_idx on workspaces(name);
create index if not exists workspaces_active_idx on workspaces(is_active);

-- Users
alter table users add column if not exists workspace_id integer references workspaces(id);
create index if not exists users_workspace_id_idx on users(workspace_id);

-- Assistidos
alter table assistidos add column if not exists workspace_id integer references workspaces(id);
create index if not exists assistidos_workspace_id_idx on assistidos(workspace_id);

-- Processos
alter table processos add column if not exists workspace_id integer references workspaces(id);
create index if not exists processos_workspace_id_idx on processos(workspace_id);

-- Demandas
alter table demandas add column if not exists workspace_id integer references workspaces(id);
create index if not exists demandas_workspace_id_idx on demandas(workspace_id);

-- Sessões do Júri
alter table sessoes_juri add column if not exists workspace_id integer references workspaces(id);
create index if not exists sessoes_juri_workspace_id_idx on sessoes_juri(workspace_id);

-- Audiências
alter table audiencias add column if not exists workspace_id integer references workspaces(id);
create index if not exists audiencias_workspace_id_idx on audiencias(workspace_id);

-- Documentos
alter table documentos add column if not exists workspace_id integer references workspaces(id);
create index if not exists documentos_workspace_id_idx on documentos(workspace_id);

-- Calendar events
alter table calendar_events add column if not exists workspace_id integer references workspaces(id);
create index if not exists calendar_events_workspace_id_idx on calendar_events(workspace_id);

-- Casos
alter table casos add column if not exists workspace_id integer references workspaces(id);
create index if not exists casos_workspace_id_idx on casos(workspace_id);
