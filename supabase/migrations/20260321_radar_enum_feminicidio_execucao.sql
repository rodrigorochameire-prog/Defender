-- Adiciona novos tipos de crime ao enum tipo_crime_radar
-- feminicidio: homicídio com qualificadora de gênero (Tribunal do Júri)
-- execucao_penal: crimes cometidos em cumprimento de pena / fugas / incidentes prisionais

ALTER TYPE tipo_crime_radar ADD VALUE IF NOT EXISTS 'feminicidio';
ALTER TYPE tipo_crime_radar ADD VALUE IF NOT EXISTS 'execucao_penal';
